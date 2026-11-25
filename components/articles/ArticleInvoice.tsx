'use client';

import { useRef, useState } from 'react';

export function ArticleInvoice({ invoice, expiresAt, price, fee, total }: {
  invoice: string;
  expiresAt?: string;
  price: string;
  fee: string;
  total: string;
}) {
  const [notice, setNotice] = useState('');
  const invoiceField = useRef<HTMLInputElement>(null);

  async function copyInvoice() {
    try {
      await navigator.clipboard.writeText(invoice);
      setNotice('Invoice copied.');
    } catch {
      invoiceField.current?.focus();
      invoiceField.current?.select();
      setNotice('Copy the selected invoice.');
    }
  }

  return <>
    <dl className="payment-details">
      <dt>Network</dt><dd>Fiber Testnet</dd>
      <dt>Article price</dt><dd>{price} CKB</dd>
      <dt>Maximum routing fee</dt><dd>{fee} CKB</dd>
      <dt>Maximum total</dt><dd>{total} CKB</dd>
      {expiresAt && <><dt>Expires</dt><dd>{expiresAt}</dd></>}
    </dl>
    <details className="invoice-details">
      <summary>View invoice details</summary>
      <p><code>{invoice.slice(0, 12)}…{invoice.slice(-8)}</code></p>
      <input ref={invoiceField} aria-label="Public Fiber invoice" value={invoice} readOnly />
      <button type="button" className="button-secondary" onClick={() => void copyInvoice()}>Copy invoice</button>
      <span role="status">{notice}</span>
    </details>
  </>;
}
