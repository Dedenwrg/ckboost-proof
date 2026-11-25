'use client';

import { useState } from 'react';
import { useUI } from '../../providers/UIProvider';
import { copyFullAddress } from '../../lib/address';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useUI();
  const [fallback, setFallback] = useState(false);
  return <div className="copy-control"><button className="copy-button button-secondary" aria-label={label} title={label} onClick={() => void copyFullAddress(navigator.clipboard, value)
    .then(() => toast('Address copied.'))
    .catch(() => { setFallback(true); toast('Copy unavailable. Select the full address below.'); })}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  </button>{fallback && <label className="copy-fallback">Full address<input readOnly value={value} onFocus={(event) => event.currentTarget.select()} /></label>}</div>;
}
