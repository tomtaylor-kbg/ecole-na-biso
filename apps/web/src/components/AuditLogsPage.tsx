import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import type { ApiAuditLog } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const actionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  CANCEL: 'Annulation',
};

const actionTone = (action: string) => {
  if (action === 'DELETE' || action === 'CANCEL') return 'danger';
  if (action === 'UPDATE') return 'warning';
  return 'success';
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export function AuditLogsPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ take: '150' });
        if (moduleFilter !== 'all') params.set('module', moduleFilter);
        if (actionFilter !== 'all') params.set('action', actionFilter);
        const response = await fetch(`${apiUrl}/api/audit-logs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Impossible de charger le journal.');
        setLogs(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le journal.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadLogs();
  }, [moduleFilter, actionFilter]);

  const modules = useMemo(() => Array.from(new Set(logs.map((log) => log.module))).sort((a, b) => a.localeCompare(b)), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))).sort((a, b) => a.localeCompare(b)), [logs]);

  return (
    <>
      <section className="page-header">
        <div><p className="eyebrow">Contrôle</p><h2>Journal des actions</h2></div>
      </section>
      <p className="page-subtitle">Suivi des opérations sensibles effectuées par les utilisateurs.</p>
      <section className="panel">
        <div className="panel-header audit-toolbar">
          <h3>Actions récentes</h3>
          <div className="audit-filters">
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              <option value="all">Tous les modules</option>
              {modules.map((module) => <option key={module} value={module}>{module}</option>)}
            </select>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="all">Toutes les actions</option>
              {actions.map((action) => <option key={action} value={action}>{actionLabels[action] ?? action}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {isLoading ? <div className="loading-state">Chargement du journal...</div> : <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Module</th><th>Action</th><th>Détail</th></tr></thead>
          <tbody>
            {logs.map((log) => <tr key={log.id}>
              <td>{formatDateTime(log.createdAt)}</td>
              <td>{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système'}</td>
              <td>{log.module}</td>
              <td><StatusBadge tone={actionTone(log.action)}>{actionLabels[log.action] ?? log.action}</StatusBadge></td>
              <td>{log.description}</td>
            </tr>)}
            {!logs.length && <tr><td colSpan={5}>Aucune action trouvée.</td></tr>}
          </tbody>
        </table></div>}
      </section>
    </>
  );
}
