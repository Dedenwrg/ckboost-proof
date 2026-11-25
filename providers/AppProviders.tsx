'use client';

import { ArticleProvider } from './ArticleProvider';
import { FiberProvider } from './FiberProvider';
import { UIProvider } from './UIProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <UIProvider><FiberProvider><ArticleProvider>{children}</ArticleProvider></FiberProvider></UIProvider>;
}
