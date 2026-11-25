'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useFiber } from '../../providers/FiberProvider';
import { useUI } from '../../providers/UIProvider';
import { ConnectionGate } from '../onboarding/ConnectionGate';
import { friendlyConnectionError } from '../../lib/friendly-error';

const links = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/library', label: 'My Library' },
  { href: '/seller', label: 'Seller Studio' },
  { href: '/setup', label: 'Payments' },
];

const PaymentSetupContext = createContext<(() => void) | null>(null);

export function usePaymentSetup() {
  const open = useContext(PaymentSetupContext);
  if (!open) throw new Error('Payment setup requires AppShell.');
  return open;
}

export function PaymentSetupButton({ className, demo = false }: { className?: string; demo?: boolean }) {
  const open = usePaymentSetup();
  const { routeReady, hasSavedProfiles } = useFiber();
  if (routeReady) return <Link className={`button-link ${className ?? ''}`} href={demo ? '/explore' : '/setup'}>
    {demo ? 'Explore articles' : 'Payments ready'}
  </Link>;
  return <button type="button" className={className} aria-haspopup="dialog" onClick={open}>
    {demo ? 'Get started with the demo' : hasSavedProfiles ? 'Resume payment setup' : 'Set up payments'}
  </button>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fiber = useFiber();
  const { routeReady, status, error } = fiber;
  const { toast } = useUI();
  const [setupPath, setSetupPath] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openPaymentSetup = useCallback(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSetupPath(pathname);
  }, [pathname]);
  const closePaymentSetup = useCallback(() => {
    setSetupPath(null);
    requestAnimationFrame(() => {
      const previous = returnFocus.current;
      if (previous?.isConnected) previous.focus();
      else document.getElementById('app-shell')?.focus();
    });
  }, []);
  const shownStatus = useRef('');
  useEffect(() => {
    if (status && status !== shownStatus.current) { shownStatus.current = status; toast(status); }
  }, [status, toast]);
  useEffect(() => {
    if (setupPath && routeReady) closePaymentSetup();
    else if (setupPath && setupPath !== pathname) setSetupPath(null);
  }, [routeReady, pathname, setupPath, closePaymentSetup]);
  return <PaymentSetupContext.Provider value={openPaymentSetup}><main id="app-shell" tabIndex={-1}>
    <header className="app-header">
      <Link className="brand" href="/">UNSEAL.</Link>
      <PaymentSetupButton className="header-setup" />
    </header>
    <nav aria-label="Primary navigation">
      {links.map(({ href, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ||
          (href === '/explore' && pathname.startsWith('/article/'));
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>{label}</Link>;
      })}
    </nav>
    {error && <p className="error" role="alert">{friendlyConnectionError(error)}</p>}
    {children}
    {setupPath === pathname && !routeReady && <ConnectionGate onDismiss={closePaymentSetup} />}
    <footer>UNSEAL. / FIBER NETWORK / LOCAL TESTNET DEMO</footer>
  </main></PaymentSetupContext.Provider>;
}
