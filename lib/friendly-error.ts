export function friendlyConnectionError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('another') && normalized.includes('tab')) {
    return 'UNSEAL is already open in another tab. Close that tab, then try again here.';
  }
  if (normalized.includes('cross-origin') || normalized.includes('sharedarraybuffer')) {
    return 'Secure browser features are unavailable. Restart UNSEAL on localhost or HTTPS, then reload.';
  }
  if (normalized.includes('web locks')) {
    return 'This browser cannot safely protect your saved account across tabs. Use a current Chromium browser.';
  }
  if (normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('handshake')) {
    return 'The payment network is taking longer than expected. Check your connection and try again.';
  }
  if (normalized.includes('more than 500') || normalized.includes('fund')) {
    return 'More Testnet CKB is needed before payments can be prepared. Use the funding address below, then check again.';
  }
  if (normalized.includes('outcome unknown') || normalized.includes('uncertain')) {
    return 'The previous request may still be processing. Check its status before doing anything again.';
  }
  return 'UNSEAL could not finish that step. Your saved account is unchanged; try again or open recovery options.';
}
