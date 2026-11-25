import './globals.css';
import { AppShell } from '../components/layout/AppShell';
import { AppProviders } from '../providers/AppProviders';

export const metadata = { title: 'UNSEAL. — Premium articles', description: 'Read independently. Pay directly with Fiber Testnet.' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppProviders><AppShell>{children}</AppShell></AppProviders></body></html>;
}
