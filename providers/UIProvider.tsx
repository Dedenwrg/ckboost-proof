'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ConfirmOptions = {
  heading?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  details?: ReactNode;
};

type Confirmation = ConfirmOptions & { resolve: (accepted: boolean) => void };
type Toast = { id: number; message: string };
type UIContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const confirmationRef = useRef<Confirmation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const closeConfirmation = useCallback((accepted: boolean) => {
    const current = confirmationRef.current;
    confirmationRef.current = null;
    setConfirmation(null);
    current?.resolve(accepted);
    queueMicrotask(() => returnFocus.current?.focus());
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    if (confirmationRef.current) { resolve(false); return; }
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const next = { ...options, resolve };
    confirmationRef.current = next;
    setConfirmation(next);
  }), []);

  useEffect(() => () => confirmationRef.current?.resolve(false), []);

  const toast = useCallback((message: string) => {
    const id = ++nextToastId.current;
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4_500);
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    const dialog = dialogRef.current;
    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    dialog?.querySelector<HTMLElement>('.dialog-actions button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeConfirmation(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmation, closeConfirmation]);

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);
  return <UIContext.Provider value={value}>
    {children}
    {confirmation && <div className="dialog-backdrop" aria-hidden="false">
      <div ref={dialogRef} className={confirmation.details ? 'dialog-card invoice-dialog' : 'dialog-card'} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
        <span className="dialog-mark" aria-hidden="true" />
        <p className="eyebrow">{confirmation.heading ?? 'CONFIRM PURCHASE'}</p>
        <h2 id="dialog-title">{confirmation.title}</h2>
        <p id="dialog-description">{confirmation.description}</p>
        {confirmation.details}
        <div className="dialog-actions">
          <button className="button-secondary" onClick={() => closeConfirmation(false)}>{confirmation.cancelLabel ?? 'Cancel'}</button>
          <button onClick={() => closeConfirmation(true)}>{confirmation.confirmLabel ?? 'Confirm'}</button>
        </div>
      </div>
    </div>}
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((item) => <div className="toast" key={item.id}><span aria-hidden="true" />{item.message}</div>)}
    </div>
  </UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used inside UIProvider.');
  return context;
}
