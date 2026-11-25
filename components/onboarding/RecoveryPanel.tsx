import type { ConnectionBlocker } from '../../lib/connection-readiness';
import { connectionRecovery, sanitizeConnectionDiagnostic } from '../../lib/connection-recovery';

export function RecoveryPanel({ blocker, error }: { blocker: ConnectionBlocker | null; error: string }) {
  const recovery = connectionRecovery(blocker, error);
  if (!recovery) return null;
  return <aside className="recovery-panel" aria-label="Recovery guidance">
    <strong>{recovery.title}</strong><p>{recovery.description}</p>
    <details><summary>Advanced details</summary><code>{recovery.code}</code><p>{sanitizeConnectionDiagnostic(error)}</p></details>
  </aside>;
}
