import {Eye} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ApiClass, BalanceReport } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const money = (value: number, currency: string) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
const statusLabel = { paid: 'Soldé', partial: 'Partiel', unpaid: 'Impayé' };
const statusTone = { paid: 'success', partial: 'warning', unpaid: 'danger' } as const;

export function BalancesPage({ classes, onViewStudent }: { classes: ApiClass[]; onViewStudent: (studentId: string) => void }) {
  const [report, setReport] = useState<BalanceReport | null>(null);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('unpaid');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBalances = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (classId) params.set('classId', classId);
        if (status) params.set('status', status);
        const response = await fetch(`${apiUrl}/api/balances?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Impossible de charger les soldes.');
        setReport(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les soldes.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadBalances();
  }, [classId, status]);

  const cards = useMemo(() => {
    const summary = report?.summary ?? { totalDue: 0, totalPaid: 0, balance: 0 };
    return [
      { label: 'Total dû', value: money(summary.totalDue, report?.currency ?? 'USD'), icon: CircleDollarSign },
      { label: 'Payé', value: money(summary.totalPaid, report?.currency ?? 'USD'), icon: CheckCircle2 },
      { label: 'Reste', value: money(summary.balance, report?.currency ?? 'USD'), icon: AlertTriangle },
    ];
  }, [report]);

  return (
    <>
      <section className="page-header"><div><p className="eyebrow">Recouvrement</p><h2>Soldes</h2></div></section>
      <p className="page-subtitle">Suivi des montants dus, payés et restant à payer par élève.</p>
      <section className="overview-cards">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="mini-card"><div><span className="mini-label">{label}</span><strong>{value}</strong></div><small><Icon size={15} /> Situation filtrée</small></article>)}</section>
      <section className="panel">
        <div className="panel-header"><h3>Élèves</h3><div className="filters-row"><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Toutes les classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="unpaid">Impayés</option><option value="partial">Partiels</option><option value="paid">Soldés</option><option value="all">Tous</option></select></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {isLoading && <p className="form-help">Chargement des soldes...</p>}
        {!isLoading && report && <div className="table-wrap"><table><thead><tr><th>Matricule</th><th>Élève</th><th>Classe</th><th>Dû</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.student.id}><td>{row.student.matricule}</td><td>{row.student.lastName} {row.student.firstName}</td><td>{row.class.name}</td><td>{money(row.totalDue, row.currency ?? report.currency)}</td><td>{money(row.totalPaid, row.currency ?? report.currency)}</td><td>{money(row.balance, row.currency ?? report.currency)}</td><td><StatusBadge tone={statusTone[row.status]}>{statusLabel[row.status]}</StatusBadge></td><td><button type="button" className="icon-table-action" title='Voir la fiche' arial-label="Voir les détails" onClick={() => onViewStudent(row.student.id)}><Eye size={15}/></button></td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}
