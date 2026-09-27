import { StatusBadge } from './StatusBadge';
import { StatCard } from './StatCard';
import type { DashboardData, Stat } from './types';

type DashboardPageProps = {
  stats: Stat[];
  dashboard: DashboardData | null;
  formatMoney: (value: number, currency?: string) => string;
  formatDate: (value: string) => string;
};

export function DashboardPage({ stats, dashboard, formatMoney, formatDate }: DashboardPageProps) {
  return (
    <>
      <section className="stats-grid">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>
      <section className="content-grid">
        <div className="panel">
          <div className="panel-header"><h2>Paiements récents</h2><button type="button" className="ghost-button">Voir tout</button></div>
          <div className="table-wrap">
            <table><thead><tr><th>Élève</th><th>Montant</th><th>Mode</th><th>Date</th></tr></thead>
              <tbody>{(dashboard?.recentPayments ?? []).map((row) => <tr key={row.id}><td>{row.student}</td><td>{formatMoney(row.amount, row.currency ?? dashboard?.currency)}</td><td><StatusBadge tone="success">{row.paymentMode}</StatusBadge></td><td>{formatDate(row.paymentDate)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><h2>Élèves avec solde</h2><button type="button" className="ghost-button">Exporter</button></div>
          <div className="stack-list">{(dashboard?.balances ?? []).map((row) => <div key={row.student.id} className="mini-row"><div><strong>{row.student.lastName} {row.student.firstName}</strong><small>{row.class.name}</small></div><div className="amount-stack"><span>{formatMoney(row.balance, row.currency ?? dashboard?.currency)}</span><StatusBadge tone="warning">À payer</StatusBadge></div></div>)}</div>
        </div>
      </section>
    </>
  );
}
