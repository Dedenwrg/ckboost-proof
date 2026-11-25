import type { ConnectionBlocker } from './connection-readiness.ts';

export type RecoveryGuidance = {
  code: string;
  title: string;
  description: string;
};

export function connectionRecovery(blocker: ConnectionBlocker | null, error = ''): RecoveryGuidance | null {
  const normalized = error.toLowerCase();
  if (normalized.includes('another') && normalized.includes('tab')) {
    return { code: 'ACCOUNT_IN_USE', title: 'Close the other UNSEAL tab', description: 'A saved account can run in only one tab. Close the other tab, wait a moment, then reconnect here.' };
  }
  if (normalized.includes('handshake') || normalized.includes('timed out') || normalized.includes('timeout')) {
    return { code: 'NETWORK_TIMEOUT', title: 'The network is taking longer', description: 'Keep your saved account unchanged. Check your connection, then retry the connection step.' };
  }
  switch (blocker) {
    case 'unsupported-browser': return { code: 'BROWSER_UNSUPPORTED', title: 'Use a supported secure browser', description: 'Open UNSEAL in a current Chromium browser on localhost or HTTPS, then reload.' };
    case 'account-error': return { code: 'ACCOUNT_START_FAILED', title: 'Your saved account is still safe', description: 'Do not clear browser storage. Close other UNSEAL tabs and try reconnecting.' };
    case 'peer-disconnected': return { code: 'NETWORK_DISCONNECTED', title: 'Reconnect safely', description: 'Reading and drafts remain available. Payment actions stay paused until the connection returns.' };
    case 'channel-pending': return { code: 'PAYMENT_SETUP_PENDING', title: 'Wait for confirmation', description: 'Do not prepare another channel. Check status until the current setup becomes ready.' };
    case 'channel-error': return { code: 'PAYMENT_SETUP_ERROR', title: 'Check the existing setup', description: 'Do not open a replacement yet. Check status first so an existing or delayed channel is not duplicated.' };
    case 'reader-liquidity': return { code: 'READER_CAPACITY_LOW', title: 'Reading capacity is too low', description: 'Purchases stay paused because the current channel cannot cover the article price and maximum fee.' };
    case 'seller-liquidity': return { code: 'PUBLISHER_CAPACITY_LOW', title: 'Receiving capacity is too low', description: 'Confirm the single 5 CKB setup transfer to make room for an incoming article payment.' };
    case 'operation-pending': return { code: 'TRANSFER_PENDING', title: 'The transfer is still processing', description: 'Check its status. UNSEAL will not submit another transfer while this one is pending.' };
    case 'operation-uncertain': return { code: 'TRANSFER_OUTCOME_UNKNOWN', title: 'Do not send another transfer', description: 'The previous request may have reached the network, but no safe identifier was returned. Keep this state locked and review it before retrying.' };
    default: return error ? { code: 'CONNECTION_STEP_FAILED', title: 'This step needs attention', description: 'Your saved identities remain unchanged. Retry the safe connection check or review the diagnostic below.' } : null;
  }
}

export function sanitizeConnectionDiagnostic(message: string) {
  if (!message) return 'No technical message was provided.';
  return message
    .replace(/ckt1[a-z0-9]+/gi, '[address hidden]')
    .replace(/0x[0-9a-f]{32,}/gi, '[identifier hidden]')
    .replace(/(fiberKey|ckbKey|payment_preimage|preimage|private[_ -]?key)\s*[:=]\s*[^\s,}]+/gi, '$1=[hidden]')
    .slice(0, 500);
}
