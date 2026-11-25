import {
  CHANNEL_FUNDING_SHANNONS,
  READER_MIN_OUTBOUND_SHANNONS,
  SELLER_MIN_INBOUND_SHANNONS,
} from './payment-config.ts';

export type ConnectionRole = 'buyer' | 'seller';
export type AccountState = 'missing' | 'starting' | 'running' | 'error';
export type ChannelState = 'missing' | 'opening' | 'ready' | 'failed' | 'unknown';
export type FinancialOperationState = 'idle' | 'pending' | 'uncertain' | 'failed';

export type RoleReadiness = {
  account: AccountState;
  peerConnected: boolean;
  channel: ChannelState;
  onChainBalance: bigint | null;
  localBalance: bigint | null;
  remoteBalance: bigint | null;
};

export type ConnectionSnapshot = {
  capabilities: 'checking' | 'supported' | 'unsupported';
  roles: Record<ConnectionRole, RoleReadiness>;
  operation: FinancialOperationState;
};

export type ConnectionBlocker =
  | 'capability-check' | 'unsupported-browser' | 'account-required' | 'account-starting' | 'account-error'
  | 'operation-pending' | 'operation-uncertain' | 'peer-disconnected' | 'balance-check'
  | 'funding-required' | 'channel-required' | 'channel-pending' | 'channel-error'
  | 'reader-liquidity' | 'seller-liquidity';

export type ConnectionAction =
  | 'wait' | 'start' | 'retry' | 'check-status' | 'connect' | 'check-balance'
  | 'fund' | 'confirm-channel' | 'confirm-liquidity' | 'continue';

export type ConnectionDecision = {
  ready: boolean;
  blocker: ConnectionBlocker | null;
  role: ConnectionRole | null;
  action: ConnectionAction;
};

const roles: ConnectionRole[] = ['buyer', 'seller'];

export function evaluateConnectionReadiness(snapshot: ConnectionSnapshot): ConnectionDecision {
  if (snapshot.capabilities === 'checking') return blocked('capability-check', null, 'wait');
  if (snapshot.capabilities === 'unsupported') return blocked('unsupported-browser', null, 'retry');

  for (const role of roles) {
    const account = snapshot.roles[role].account;
    if (account === 'missing') return blocked('account-required', role, 'start');
    if (account === 'starting') return blocked('account-starting', role, 'wait');
    if (account === 'error') return blocked('account-error', role, 'retry');
  }

  if (snapshot.operation === 'pending') return blocked('operation-pending', 'seller', 'check-status');
  if (snapshot.operation === 'uncertain') return blocked('operation-uncertain', 'seller', 'check-status');
  if (snapshot.operation === 'failed') return blocked('channel-error', null, 'retry');

  for (const role of roles) {
    if (!snapshot.roles[role].peerConnected) return blocked('peer-disconnected', role, 'connect');
  }

  for (const role of roles) {
    const state = snapshot.roles[role];
    if (state.channel === 'opening' || state.channel === 'unknown') return blocked('channel-pending', role, 'check-status');
    if (state.channel === 'failed') return blocked('channel-error', role, 'retry');
  }
  for (const role of roles) {
    const state = snapshot.roles[role];
    if (state.channel === 'missing' && state.onChainBalance === null) return blocked('balance-check', role, 'check-balance');
  }
  for (const role of roles) {
    const state = snapshot.roles[role];
    if (state.channel === 'missing' && state.onChainBalance !== null && state.onChainBalance <= CHANNEL_FUNDING_SHANNONS) {
      return blocked('funding-required', role, 'fund');
    }
  }
  for (const role of roles) {
    if (snapshot.roles[role].channel === 'missing') return blocked('channel-required', role, 'confirm-channel');
  }

  const buyerOutbound = snapshot.roles.buyer.localBalance;
  if (buyerOutbound === null || buyerOutbound < READER_MIN_OUTBOUND_SHANNONS) {
    return blocked('reader-liquidity', 'buyer', 'fund');
  }
  const sellerInbound = snapshot.roles.seller.remoteBalance;
  if (sellerInbound === null || sellerInbound < SELLER_MIN_INBOUND_SHANNONS) {
    return blocked('seller-liquidity', 'seller', 'confirm-liquidity');
  }
  return { ready: true, blocker: null, role: null, action: 'continue' };
}

function blocked(blocker: ConnectionBlocker, role: ConnectionRole | null, action: ConnectionAction): ConnectionDecision {
  return { ready: false, blocker, role, action };
}
