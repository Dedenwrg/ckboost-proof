export type BrowserCapabilities = {
  supported: boolean;
  issues: string[];
};

export function checkBrowserCapabilities(): BrowserCapabilities {
  const issues: string[] = [];
  if (!window.isSecureContext) issues.push('Open UNSEAL over HTTPS or localhost.');
  if (!window.crossOriginIsolated) issues.push('Cross-origin isolation headers are missing. Restart the app server and reload.');
  if (typeof SharedArrayBuffer === 'undefined') issues.push('SharedArrayBuffer is unavailable in this browser.');
  if (!navigator.locks) issues.push('Web Locks are unavailable, so saved nodes cannot be protected across tabs.');
  if (!globalThis.crypto?.subtle) issues.push('Web Crypto is unavailable.');
  if (typeof WebAssembly === 'undefined') issues.push('WebAssembly is unavailable.');
  return { supported: issues.length === 0, issues };
}
