import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="empty-state">
    <div className="empty-art" aria-hidden="true"><span /><span /><span /></div>
    <div><p className="eyebrow">NOTHING HERE YET</p><h2>{title}</h2><p>{description}</p>{action}</div>
  </section>;
}
