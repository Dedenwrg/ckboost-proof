'use client';

import { useEffect, useRef } from 'react';
import { shortenAddress } from '../../lib/address';
import { friendlyChannelProgress } from '../../lib/channel-progress';
import type { ConnectionBlocker, ConnectionRole } from '../../lib/connection-readiness';
import { CHANNEL_FUNDING_SHANNONS, SHANNONS_PER_CKB } from '../../lib/payment-config';
import { useFiber } from '../../providers/FiberProvider';
import { useUI } from '../../providers/UIProvider';
import { CopyButton } from '../ui/CopyButton';
import { RecoveryPanel } from './RecoveryPanel';

const steps = ['Browser', 'Account', 'Connection', 'Payments', 'Ready'];
const roles: ConnectionRole[] = ['buyer', 'seller'];

const blockerStep: Record<ConnectionBlocker, number> = {
  'capability-check': 0, 'unsupported-browser': 0,
  'account-required': 1, 'account-starting': 1, 'account-error': 1,
  'peer-disconnected': 2,
  'balance-check': 3, 'funding-required': 3, 'channel-required': 3, 'channel-pending': 3,
  'channel-error': 3, 'reader-liquidity': 3, 'seller-liquidity': 3,
  'operation-pending': 3, 'operation-uncertain': 3,
};

function copyFor(blocker: ConnectionBlocker | null, role: ConnectionRole | null) {
  const account = role === 'seller' ? 'publishing account' : 'reading account';
  switch (blocker) {
    case 'capability-check': return ['Checking your browser', 'Making sure secure payments can run here.'];
    case 'unsupported-browser': return ['This browser needs a quick fix', 'Use a current Chromium browser on localhost or HTTPS, then reload.'];
    case 'account-required': return ['Welcome to UNSEAL', 'Prepare two private Testnet accounts in this browser. No registration required.'];
    case 'account-starting': return ['Preparing your account', `Restoring your ${account}.`];
    case 'account-error': return ['We could not prepare your account', 'Close any other UNSEAL tab, then try again. Your saved identity will not be replaced.'];
    case 'peer-disconnected': return ['Connecting securely', `Reconnecting your ${account} to the payment network.`];
    case 'balance-check': return ['Checking your balances', 'We’ll check whether your payment accounts need Testnet CKB.'];
    case 'funding-required': return ['Add Testnet funds', 'Claim free Testnet CKB for the accounts below. Balances update automatically.'];
    case 'channel-required': return [`Prepare ${role === 'seller' ? 'publishing' : 'reading'} payments`, `Your ${account} has enough Testnet funds and is ready for one confirmed setup action.`];
    case 'channel-pending': return [`Preparing ${role === 'seller' ? 'publishing' : 'reading'} payments`, 'Setup continues automatically. You can see the current step below.'];
    case 'reader-liquidity': return ['More payment capacity needed', 'Your reading account is below the minimum capacity needed to enable checkout.'];
    case 'seller-liquidity': return ['Make room to receive payments', 'A small Testnet transfer will create room for incoming article payments.'];
    case 'operation-pending': return ['Finishing your request', 'The previous action is still being confirmed.'];
    case 'operation-uncertain': return ['Check the previous request', 'Its outcome is not known yet, so UNSEAL will not send it again.'];
    default: return ['Connection ready', 'Opening the marketplace.'];
  }
}

export function ConnectionGate({ onDismiss }: { onDismiss: () => void }) {
  const fiber = useFiber();
  const ui = useUI();
  const gateRef = useRef<HTMLElement>(null);
  const { run, checkBalance } = fiber;
  const blocker = fiber.decision.blocker;
  const fundingStep = !fiber.routeReady && (blocker === 'balance-check' || blocker === 'funding-required');
  const readingAddress = !fiber.channels.buyer ? fiber.addresses.buyer : undefined;
  const publishingAddress = !fiber.channels.seller ? fiber.addresses.seller : undefined;

  useEffect(() => {
    if (!fundingStep || (!readingAddress && !publishingAddress)) return;
    const refreshBalances = () => {
      if (document.visibilityState !== 'visible') return;
      void run(async () => {
        await Promise.allSettled([
          ...(readingAddress ? [checkBalance('buyer', { quiet: true })] : []),
          ...(publishingAddress ? [checkBalance('seller', { quiet: true })] : []),
        ]);
      });
    };
    refreshBalances();
    const timer = window.setInterval(refreshBalances, 10_000);
    document.addEventListener('visibilitychange', refreshBalances);
    window.addEventListener('focus', refreshBalances);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshBalances);
      window.removeEventListener('focus', refreshBalances);
    };
  }, [fundingStep, readingAddress, publishingAddress, run, checkBalance]);
  useEffect(() => {
    if (fiber.routeReady) return;
    const gate = gateRef.current;
    const main = gate?.closest('main');
    const background = main ? Array.from(main.children).filter((element) => !element.contains(gate)) as HTMLElement[] : [];
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    background.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    const getFocusable = () => gate?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
    const initial = getFocusable();
    (initial?.[0] ?? gate)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (document.querySelector('[role="alertdialog"]')) return;
        gate?.querySelector<HTMLButtonElement>('[data-dismiss-gate]')?.click();
        return;
      }
      const focusable = getFocusable();
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => { element.inert = false; element.removeAttribute('aria-hidden'); });
    };
  }, [fiber.routeReady, fiber.decision.blocker]);
  if (fiber.routeReady) return null;

  const role = fiber.decision.role;
  const activeStep = blocker ? blockerStep[blocker] : 4;
  const [baseTitle, baseDescription] = copyFor(blocker, role);
  const fundingRoles = roles.filter((item) => !fiber.channels[item] && fiber.addresses[item]);
  const channelsToOpen = roles.filter((item) => !fiber.channels[item] && fiber.balances[item] !== undefined && fiber.balances[item]! > CHANNEL_FUNDING_SHANNONS);
  const pendingRoles = roles.filter((item) => fiber.openingChannels[item]);
  if (blocker === 'channel-pending' && role && !pendingRoles.length) pendingRoles.push(role);
  const preparingBoth = pendingRoles.length > 1;
  const title = preparingBoth ? 'Preparing both payment accounts' : channelsToOpen.length > 1 && blocker === 'channel-required' ? 'Prepare both payment accounts' : baseTitle;
  const description = preparingBoth
    ? 'Reading and publishing payments are being prepared together. Their progress is shown separately below.'
    : channelsToOpen.length > 1 && blocker === 'channel-required'
      ? 'Both accounts are funded. One confirmation can prepare their Testnet payment connections at the same time.'
      : baseDescription;

  const checkFundingBalances = async () => {
    const results = await Promise.allSettled(fundingRoles.map((item) => checkBalance(item, { quiet: true })));
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('Could not check every funding balance. Please try again.');
    }
  };

  const openChannels = async () => {
    const selected = channelsToOpen.length ? channelsToOpen : role ? [role] : [];
    if (!selected.length) return;
    const both = selected.length > 1;
    const accepted = await ui.confirm({
      title: both ? 'Prepare both payment accounts?' : 'Prepare payments?',
      description: both
        ? 'This opens two Testnet payment channels at the same time. Each account puts 500 CKB into its own channel and pays a small network fee.'
        : 'This Testnet action puts 500 CKB into a payment channel and requires a small network fee.',
      confirmLabel: both ? 'Confirm both channels' : 'Confirm & continue',
    });
    if (accepted) await fiber.run(() => Promise.all(selected.map((item) => fiber.open(item))).then(() => undefined));
  };

  const prepareLiquidity = async () => {
    const accepted = await ui.confirm({
      title: 'Make room to receive payments?',
      description: 'Send 5 Testnet CKB through the existing channel so this account can receive article payments.',
      confirmLabel: 'Confirm transfer',
    });
    if (accepted) await fiber.run(fiber.moveLiquidity);
  };

  return <div className="connection-gate-backdrop">
    <section ref={gateRef} tabIndex={-1} className="connection-gate" role="dialog" aria-modal="true" aria-labelledby="connection-gate-title" aria-describedby="connection-gate-description">
      <div className="gate-progress" aria-label={`Step ${activeStep + 1} of ${steps.length}`}>
        <span className="brand">UNSEAL.</span>
        <ol>{steps.map((step, index) => <li key={step} aria-current={index === activeStep ? 'step' : undefined} data-state={index < activeStep ? 'complete' : index === activeStep ? 'active' : 'idle'}>
          <span>{index + 1}</span><strong>{step}</strong>
        </li>)}</ol>
      </div>
      <div className="gate-content">
        <p className="eyebrow">SECURE CONNECTION</p><h1 id="connection-gate-title">{title}</h1><p id="connection-gate-description">{description}</p>
        {(blocker === 'funding-required' || blocker === 'balance-check') && fundingRoles.length > 0 && <div className="funding-accounts">
          {fundingRoles.map((item) => {
            const address = fiber.addresses[item]!;
            const balance = fiber.balances[item];
            const sufficient = balance !== undefined && balance > CHANNEL_FUNDING_SHANNONS;
            return <div className="funding-address" key={item}>
              <span><small>{item === 'buyer' ? 'Reading address' : 'Publishing address'}</small><strong>{shortenAddress(address)}</strong>
                <em data-ready={sufficient}>{balance === undefined ? 'Waiting for balance' : sufficient ? 'Ready to prepare' : `${Number(balance / SHANNONS_PER_CKB)} CKB — needs funding`}</em>
              </span>
              <CopyButton value={address} label={`Copy ${item === 'buyer' ? 'reader' : 'seller'} funding address`} />
            </div>;
          })}
        </div>}
        {(blocker === 'funding-required' || blocker === 'balance-check') && fundingRoles.length > 0 && <div className="faucet-guide">
          <strong>How to get free Testnet CKB</strong>
          <ol>
            <li>Copy an address that needs funding and open the Nervos Testnet Faucet.</li>
            <li>Claim Testnet CKB and repeat for any other account that needs funding.</li>
            <li>Return here. We’ll check for the funds automatically.</li>
          </ol>
          <a href="https://faucet.nervos.org/" target="_blank" rel="noreferrer">Open Nervos Testnet Faucet ↗</a>
        </div>}
        {blocker === 'channel-pending' && <div className="channel-progress-list" role="status" aria-live="polite">
          {pendingRoles.map((item) => {
            const progress = friendlyChannelProgress(fiber.channels[item]?.state.state_name ?? '');
            return <div className="channel-progress-card" key={item}>
              <div className="channel-progress-heading"><span className="tag">STEP {progress.step} OF {progress.total}</span><strong>{item === 'seller' ? 'Publishing account' : 'Reading account'}</strong></div>
              <div className="channel-progress-track" aria-hidden="true">{Array.from({ length: progress.total }, (_, index) => <span data-active={index < progress.step} key={index} />)}</div>
              <h2>{progress.title}</h2><p>{progress.description}</p><small>No action is needed while this step is moving forward.</small>
            </div>;
          })}
        </div>}
        <div className="gate-actions">
          {(blocker === 'account-required' || blocker === 'account-error' || blocker === 'peer-disconnected') && <button disabled={fiber.busy} onClick={() => void fiber.run(fiber.connectAll)}>{fiber.busy ? 'Connecting…' : fiber.hasSavedProfiles ? 'Reconnect' : 'Connect & get started'}</button>}
          {blocker === 'unsupported-browser' && <button onClick={() => location.reload()}>Check again</button>}
          {fundingStep && fundingRoles.length > 0 && <button className="button-secondary" disabled={fiber.busy} onClick={() => void run(checkFundingBalances)}>Check now</button>}
          {blocker === 'channel-required' && <button disabled={fiber.busy} onClick={() => void openChannels()}>{channelsToOpen.length > 1 ? 'Prepare both accounts' : 'Prepare payments'}</button>}
          {blocker === 'channel-pending' && pendingRoles.length > 0 && <button className="button-secondary" disabled={fiber.busy} onClick={() => void fiber.run(() => Promise.all(pendingRoles.map((item) => fiber.refresh(item))).then(() => undefined))}>Check status</button>}
          {blocker === 'operation-pending' && <button className="button-secondary" disabled={fiber.busy} onClick={() => void fiber.run(fiber.moveLiquidity)}>Check status</button>}
          {blocker === 'operation-uncertain' && <button className="button-secondary" disabled>Retry locked for safety</button>}
          {blocker === 'seller-liquidity' && <button disabled={fiber.busy} onClick={() => void prepareLiquidity()}>Prepare to receive</button>}
          {blocker === 'reader-liquidity' && <button disabled={fiber.busy} onClick={() => void fiber.run(() => fiber.refresh('buyer'))}>Check again</button>}
          {blocker === 'channel-error' && role && <button className="button-secondary" disabled={fiber.busy} onClick={() => void fiber.run(() => fiber.refresh(role))}>Check existing setup</button>}
          <button type="button" className="button-secondary" data-dismiss-gate disabled={fiber.busy} onClick={onDismiss}>Back to browsing</button>
        </div>
        {(Boolean(fiber.error) || blocker === 'unsupported-browser' || blocker === 'account-error' || blocker === 'channel-error' || blocker === 'reader-liquidity' || blocker === 'operation-uncertain')
          && <RecoveryPanel blocker={blocker} error={fiber.error} />}
        {fiber.busy && <p className="gate-wait" role="status"><span aria-hidden="true" />Please keep this tab open.</p>}
      </div>
    </section>
  </div>;
}
