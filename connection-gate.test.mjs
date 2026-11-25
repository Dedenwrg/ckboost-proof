import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateConnectionReadiness } from './lib/connection-readiness.ts';
import {
  CHANNEL_FUNDING_SHANNONS,
  READER_MIN_OUTBOUND_SHANNONS,
  SELLER_MIN_INBOUND_SHANNONS,
} from './lib/payment-config.ts';
import { copyFullAddress, shortenAddress } from './lib/address.ts';
import { friendlyConnectionError } from './lib/friendly-error.ts';
import { friendlyChannelProgress } from './lib/channel-progress.ts';
import { connectionRecovery, sanitizeConnectionDiagnostic } from './lib/connection-recovery.ts';
import { CHANNEL_POLL_DELAYS_MS, createBoundedPoller } from './lib/connection-polling.ts';
import { createBrowserNodeSession, DuplicateNodeSessionError } from './lib/node-session.ts';

const role = (change = {}) => ({
  account: 'running', peerConnected: true, channel: 'ready', onChainBalance: null,
  localBalance: READER_MIN_OUTBOUND_SHANNONS,
  remoteBalance: SELLER_MIN_INBOUND_SHANNONS,
  ...change,
});

const snapshot = (change = {}) => ({
  capabilities: 'supported',
  roles: { buyer: role(), seller: role() },
  operation: 'idle',
  ...change,
});

test('readiness requires supported browser capabilities and both running accounts', () => {
  assert.equal(evaluateConnectionReadiness(snapshot({ capabilities: 'checking' })).blocker, 'capability-check');
  assert.equal(evaluateConnectionReadiness(snapshot({ capabilities: 'unsupported' })).blocker, 'unsupported-browser');
  assert.deepEqual(evaluateConnectionReadiness(snapshot({ roles: { buyer: role({ account: 'missing' }), seller: role() } })),
    { ready: false, blocker: 'account-required', role: 'buyer', action: 'start' });
  assert.equal(evaluateConnectionReadiness(snapshot({ roles: { buyer: role(), seller: role({ account: 'starting' }) } })).blocker, 'account-starting');
});

test('pending and uncertain financial operations can only be checked, never resubmitted', () => {
  for (const operation of ['pending', 'uncertain']) {
    const decision = evaluateConnectionReadiness(snapshot({ operation }));
    assert.equal(decision.action, 'check-status');
    assert.equal(decision.ready, false);
  }
});

test('both peers must be connected before channel decisions', () => {
  const decision = evaluateConnectionReadiness(snapshot({ roles: { buyer: role(), seller: role({ peerConnected: false }) } }));
  assert.deepEqual(decision, { ready: false, blocker: 'peer-disconnected', role: 'seller', action: 'connect' });
});

test('a missing channel checks balance before offering funding or confirmation', () => {
  const base = { buyer: role(), seller: role({ channel: 'missing' }) };
  assert.equal(evaluateConnectionReadiness(snapshot({ roles: base })).blocker, 'balance-check');
  assert.equal(evaluateConnectionReadiness(snapshot({ roles: { ...base, seller: role({ channel: 'missing', onChainBalance: CHANNEL_FUNDING_SHANNONS }) } })).blocker, 'funding-required');
  const sufficient = evaluateConnectionReadiness(snapshot({ roles: { ...base, seller: role({ channel: 'missing', onChainBalance: CHANNEL_FUNDING_SHANNONS + 1n }) } }));
  assert.deepEqual(sufficient, { ready: false, blocker: 'channel-required', role: 'seller', action: 'confirm-channel' });
});

test('both missing accounts are checked and funded before either channel is opened', () => {
  const buyerReady = role({ channel: 'missing', onChainBalance: CHANNEL_FUNDING_SHANNONS + 1n });
  const sellerUnchecked = role({ channel: 'missing', onChainBalance: null });
  assert.deepEqual(evaluateConnectionReadiness(snapshot({ roles: { buyer: buyerReady, seller: sellerUnchecked } })),
    { ready: false, blocker: 'balance-check', role: 'seller', action: 'check-balance' });
  const sellerLow = role({ channel: 'missing', onChainBalance: CHANNEL_FUNDING_SHANNONS });
  assert.deepEqual(evaluateConnectionReadiness(snapshot({ roles: { buyer: buyerReady, seller: sellerLow } })),
    { ready: false, blocker: 'funding-required', role: 'seller', action: 'fund' });
});

test('opening and unknown channels remain pending and are never treated as missing', () => {
  for (const channel of ['opening', 'unknown']) {
    const decision = evaluateConnectionReadiness(snapshot({ roles: { buyer: role({ channel }), seller: role() } }));
    assert.equal(decision.blocker, 'channel-pending');
    assert.equal(decision.action, 'check-status');
  }
});

test('reader outbound covers article price plus maximum fee at the exact boundary', () => {
  const low = evaluateConnectionReadiness(snapshot({ roles: { buyer: role({ localBalance: READER_MIN_OUTBOUND_SHANNONS - 1n }), seller: role() } }));
  assert.equal(low.blocker, 'reader-liquidity');
  assert.equal(evaluateConnectionReadiness(snapshot()).ready, true);
});

test('seller inbound covers article price at the exact boundary', () => {
  const low = evaluateConnectionReadiness(snapshot({ roles: { buyer: role(), seller: role({ remoteBalance: SELLER_MIN_INBOUND_SHANNONS - 1n }) } }));
  assert.deepEqual(low, { ready: false, blocker: 'seller-liquidity', role: 'seller', action: 'confirm-liquidity' });
  assert.equal(evaluateConnectionReadiness(snapshot()).ready, true);
});

test('address labels are shortened without changing the copied source value', () => {
  const address = 'ckt1qzda0cr9exampleaddress7m2k';
  assert.equal(shortenAddress(address), 'ckt1qzda0cr…7m2k');
  assert.equal(address, 'ckt1qzda0cr9exampleaddress7m2k');
  assert.equal(shortenAddress('short'), 'short');
});

test('copy writes the complete address rather than its shortened label', async () => {
  const address = 'ckt1qzda0cr9exampleaddress7m2k';
  const written = [];
  await copyFullAddress({ writeText: async (value) => { written.push(value); } }, address);
  assert.deepEqual(written, [address]);
  assert.notEqual(written[0], shortenAddress(address));
});

test('channel polling is bounded and cleanup cancels the scheduled retry', async () => {
  assert.equal(CHANNEL_POLL_DELAYS_MS.length, 8);
  assert.equal(Math.max(...CHANNEL_POLL_DELAYS_MS), 20_000);
  let tasks = 0;
  let scheduled;
  let cleared = false;
  const poller = createBoundedPoller(async () => { tasks += 1; }, [10, 20], {
    set(callback) { scheduled = callback; return 1; },
    clear(handle) { assert.equal(handle, 1); cleared = true; },
  });
  poller.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(tasks, 1);
  assert.equal(typeof scheduled, 'function');
  poller.stop();
  assert.equal(cleared, true);
  scheduled();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(tasks, 1);
});

test('a saved node starts once and a second session cannot own the same profile', async () => {
  let held = false;
  const manager = {
    request(_name, options, callback) {
      if (held && options.ifAvailable) return Promise.resolve(callback(null));
      held = true;
      return Promise.resolve(callback({ name: _name, mode: 'exclusive' })).finally(() => { held = false; });
    },
  };
  const first = createBrowserNodeSession(manager);
  const second = createBrowserNodeSession(manager);
  let starts = 0;
  const node = { isRunning: true, async stop() { this.isRunning = false; } };
  const start = async (track) => { starts += 1; track(node); };
  await Promise.all([first.start('saved-profile', start), first.start('saved-profile', start)]);
  assert.equal(starts, 1);
  await assert.rejects(second.start('saved-profile', start), DuplicateNodeSessionError);
  await first.stop();
});

test('technical connection failures are converted to friendly primary messages', () => {
  assert.match(friendlyConnectionError('Node already in use in another tutorial tab'), /another tab/i);
  assert.doesNotMatch(friendlyConnectionError('WASM RPC error: ServerError(-32000)'), /RPC|32000|WASM/);
  assert.match(friendlyConnectionError('Peer handshake timed out'), /taking longer/i);
});

test('technical channel states become friendly six-step progress', () => {
  assert.deepEqual(friendlyChannelProgress('NEGOTIATING_FUNDING'), {
    step: 1, total: 6, title: 'Agreeing on payment setup',
    description: 'Your account and the payment network are agreeing on the setup details.',
  });
  assert.equal(friendlyChannelProgress('awaiting-channel-ready').step, 5);
  assert.equal(friendlyChannelProgress('CHANNEL_READY').step, 6);
  assert.doesNotMatch(friendlyChannelProgress('UNKNOWN_INTERNAL_STATE').title, /UNKNOWN|INTERNAL/);
});

test('recovery guidance is specific and diagnostics redact sensitive identifiers', () => {
  assert.equal(connectionRecovery('operation-uncertain')?.code, 'TRANSFER_OUTCOME_UNKNOWN');
  assert.match(connectionRecovery('account-error', 'Node is open in another tab')?.title ?? '', /other UNSEAL tab/i);
  const diagnostic = sanitizeConnectionDiagnostic(`address ckt1${'a'.repeat(40)} hash 0x${'b'.repeat(64)} payment_preimage=secret`);
  assert.match(diagnostic, /\[address hidden\]/);
  assert.match(diagnostic, /\[identifier hidden\]/);
  assert.doesNotMatch(diagnostic, /secret|b{32}/);
});
