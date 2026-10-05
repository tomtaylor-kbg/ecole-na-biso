import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Eye, Printer, Users } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { classLabel } from './classLabels';
import type { ApiClass, ApiSchoolYear, FinancialReport, MonthlyMinervalReport } from './types';
import { openPdf } from '../utils/pdf';

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const money = (value: number, currency: string) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const currentDate = () => new Date().toISOString().slice(0, 10);
const statusLabels = {
  paid: 'En ordre',
  half: 'Partiel ≥ 50 %',
  debt: 'En dette',
  'missing-fee': 'Minerval non configuré',
} as const;
const statusTones = {
  paid: 'success',
  half: 'warning',
  debt: 'danger',
  'missing-fee': 'neutral',
} as const;

export function BalancesPage({
  classes,
  schoolYears,
  onViewStudent,
  view = 'balances',
}: {
  classes: ApiClass[];
  schoolYears: ApiSchoolYear[];
  onViewStudent: (studentId: string) => void;
  view?: 'balances' | 'reports';
}) {
  const [report, setReport] = useState<MonthlyMinervalReport | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const [schoolYearId, setSchoolYearId] = useState(() => schoolYears.find((year) => year.isActive)?.id ?? '');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'month'>('month');
  const [reportDate, setReportDate] = useState(currentMonth);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isFinancialReportLoading, setIsFinancialReportLoading] = useState(true);

  useEffect(() => {
    if (!schoolYearId && schoolYears.length > 0) {
      setSchoolYearId(schoolYears.find((year) => year.isActive)?.id ?? schoolYears[0].id);
    }
  }, [schoolYearId, schoolYears]);

  useEffect(() => {
    const controller = new AbortController();
    const loadReport = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ month });
        if (schoolYearId) params.set('schoolYearId', schoolYearId);
        if (classId) params.set('classId', classId);
        const response = await fetch(`${apiUrl}/api/balances/minerval?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Impossible de charger la situation du minerval.');
        setReport(body);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger la situation du minerval.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadReport();
    return () => controller.abort();
  }, [month, schoolYearId, classId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadFinancialReport = async () => {
      setIsFinancialReportLoading(true);
      try {
        const params = new URLSearchParams({ period: reportPeriod, date: reportDate });
        if (schoolYearId) params.set('schoolYearId', schoolYearId);
        if (classId) params.set('classId', classId);
        const response = await fetch(`${apiUrl}/api/balances/financial-report?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Impossible de charger le rapport financier.');
        setFinancialReport(body);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) setFinancialReport(null);
      } finally {
        if (!controller.signal.aborted) setIsFinancialReportLoading(false);
      }
    };
    void loadFinancialReport();
    return () => controller.abort();
  }, [reportDate, reportPeriod, schoolYearId, classId]);

  const filteredRows = useMemo(
    () => report?.rows.filter((row) => status === 'all' || row.status === status) ?? [],
    [report, status]
  );
  const visibleClasses = classes.filter((item) => !schoolYearId || item.schoolYearId === schoolYearId);
  const summary = report?.summary ?? {
    studentCount: 0,
    studentsPaid: 0,
    studentsAtLeastHalf: 0,
    studentsInDebt: 0,
    studentsMissingFee: 0,
    totalsByCurrency: [],
  };
  const countCards = [
    { label: 'Élèves concernés', value: summary.studentCount, icon: Users },
    { label: 'En ordre', value: summary.studentsPaid, icon: CheckCircle2 },
    { label: 'Partiel ≥ 50 %', value: summary.studentsAtLeastHalf, icon: CircleDollarSign },
    { label: 'En dette', value: summary.studentsInDebt, icon: AlertTriangle },
  ];

  return (
    <div className="balances-page">
      <section className="page-header">
        <div><p className="eyebrow">{view === 'reports' ? 'Synthèse pour la direction' : 'Recouvrement mensuel'}</p><h2>{view === 'reports' ? 'Rapports direction' : 'Suivi financier'}</h2></div>
      </section>
      <p className="page-subtitle">{view === 'reports' ? 'Production des situations financières journalières et mensuelles.' : 'Situation du minerval par élève et reste à payer par classe.'}</p>

      <section className="panel minerval-filter-panel">
        <div className="panel-header minerval-filter-header">
          <h3>{view === 'reports' ? 'Filtres du rapport' : 'Filtres du suivi'}</h3>
          <div className="minerval-filters">
            {view === 'balances' && <label>Mois <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>}
            <label>Année scolaire
              <select value={schoolYearId} onChange={(event) => { setSchoolYearId(event.target.value); setClassId(''); }}>
                {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isActive ? ' · active' : ''}</option>)}
              </select>
            </label>
            <label>Classe
              <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                <option value="">Toutes les classes</option>
                {visibleClasses.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
              </select>
            </label>
            {view === 'balances' && <label>Situation
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Toutes</option>
                <option value="paid">En ordre</option>
                <option value="half">Partiel ≥ 50 %</option>
                <option value="debt">En dette (&lt; 50 %)</option>
                <option value="missing-fee">Minerval non configuré</option>
              </select>
            </label>}
          </div>
        </div>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      {isLoading && <p className="form-help">Chargement de la situation financière...</p>}

      {!isLoading && report && <>
        {view === 'reports' && <section className="panel financial-report-panel">
          <div className="panel-header financial-report-header">
            <div><p className="eyebrow">Rapport direction</p><h3>Situation financière {reportPeriod === 'day' ? 'journalière' : 'mensuelle'}</h3></div>
            <div className="topbar-actions report-print-button"><button type="button" className="ghost-button" onClick={() => window.print()}><Printer size={16} /> Imprimer</button><button type="button" className="ghost-button" onClick={() => void openPdf(`/api/printouts/financial-report.pdf?period=${reportPeriod}&date=${reportDate}${schoolYearId ? `&schoolYearId=${schoolYearId}` : ''}${classId ? `&classId=${classId}` : ''}`, `rapport-financier-${reportDate}.pdf`)}><Printer size={16} /> PDF direction</button></div>
          </div>
          <div className="financial-report-filters">
            <label>Vue<select value={reportPeriod} onChange={(event) => { const nextPeriod = event.target.value as 'day' | 'month'; setReportPeriod(nextPeriod); setReportDate(nextPeriod === 'day' ? currentDate() : currentMonth()); }}><option value="month">Mensuelle</option><option value="day">Journalière</option></select></label>
            <label>{reportPeriod === 'day' ? 'Jour' : 'Mois'}<input type={reportPeriod === 'day' ? 'date' : 'month'} value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></label>
          </div>
          {isFinancialReportLoading ? <p className="form-help">Génération du rapport...</p> : financialReport && <>
            <div className="financial-report-summary">
              <article><span>Encaissements</span><strong>{financialReport.summary.paymentCount.toLocaleString('fr-FR')}</strong></article>
              <article><span>Montant encaissé</span><strong>{financialReport.byCurrency.map((item) => money(item.amount, item.currency)).join(' · ') || '0'}</strong></article>
              <article><span>Modes utilisés</span><strong>{financialReport.byMode.length.toLocaleString('fr-FR')}</strong></article>
            </div>
            <div className="financial-report-columns">
              <div><h4>Répartition par mode de paiement</h4><div className="report-list">{financialReport.byMode.length === 0 ? <p className="form-help">Aucun encaissement sur la période.</p> : financialReport.byMode.map((item) => <div className="report-list-row" key={item.mode}><span>{item.mode} <small>{item.paymentCount} opération(s)</small></span><strong>{money(item.amount, financialReport.byCurrency[0]?.currency ?? 'USD')}</strong></div>)}</div></div>
              {reportPeriod === 'month' && <div><h4>Évolution journalière</h4><div className="report-list">{financialReport.timeline.length === 0 ? <p className="form-help">Aucune opération.</p> : financialReport.timeline.map((item) => <div className="report-list-row" key={item.date}><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString('fr-FR')} <small>{item.paymentCount} opération(s)</small></span><strong>{item.amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</strong></div>)}</div></div>}
            </div>
          </>}
        </section>}

        {view === 'balances' && <>
        <section className="minerval-count-cards">
          {countCards.map(({ label, value, icon: Icon }) => (
            <article key={label} className="stat-card">
              <div className="stat-card-topline"><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
              <strong>{value.toLocaleString('fr-FR')}</strong>
              <small>{report.month}</small>
            </article>
          ))}
        </section>

        {report.summary.totalsByCurrency.map((total) => (
          <section className="overview-cards minerval-amount-cards" key={total.currency}>
            <article className="mini-card"><div><span className="mini-label">Minerval attendu</span><strong>{money(total.totalDue, total.currency)}</strong></div><small><CircleDollarSign size={15} /> {total.currency}</small></article>
            <article className="mini-card"><div><span className="mini-label">Encaissé</span><strong>{money(total.totalPaid, total.currency)}</strong></div><small><CheckCircle2 size={15} /> {total.currency}</small></article>
            <article className="mini-card"><div><span className="mini-label">Reste à payer</span><strong>{money(total.balance, total.currency)}</strong></div><small><AlertTriangle size={15} /> {total.currency}</small></article>
          </section>
        ))}

        <section className="panel">
          <div className="panel-header table-panel-header"><h3>Restes à payer par classe</h3><span className="minerval-report-context">{report.schoolYear.name} · {report.month}</span></div>
          <div className="table-wrap">
            <table className="minerval-report-table">
              <thead><tr><th>Classe</th><th>Devise</th><th>Élèves</th><th>Minerval configuré</th><th>En ordre</th><th>Partiel ≥ 50 %</th><th>En dette</th><th>Minerval manquant</th><th>Attendu</th><th>Payé</th><th>Reste</th></tr></thead>
              <tbody>{report.classes.map((row, index) => (
                <tr key={`${row.class.id}-${row.currency}-${index}`}>
                  <td>{classLabel(row.class)}</td><td>{row.currency}</td><td>{row.studentCount}</td>
                  <td>{row.configuredStudentCount} / {row.studentCount}</td><td>{row.studentsPaid}</td><td>{row.studentsAtLeastHalf}</td><td>{row.studentsInDebt}</td><td>{row.studentsMissingFee}</td>
                  <td>{money(row.totalDue, row.currency)}</td><td>{money(row.totalPaid, row.currency)}</td><td>{money(row.balance, row.currency)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        {summary.studentsMissingFee > 0 && <p className="form-help minerval-notice" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{summary.studentsMissingFee} élève(s) n’ont pas de frais « Minerval » actif configuré pour ce mois. Ils ne sont pas comptés comme débiteurs.</span>
        </p>}

        <section className="panel">
          <div className="panel-header table-panel-header"><h3>Situation des élèves</h3><span className="minerval-report-context">{filteredRows.length} élève(s)</span></div>
          {filteredRows.length === 0
            ? <p className="form-help">Aucun élève ne correspond à cette situation.</p>
            : <div className="table-wrap">
              <table className="minerval-report-table">
                <thead><tr><th>Matricule</th><th>Élève</th><th>Classe</th><th>Attendu</th><th>Payé</th><th>Progression</th><th>Reste</th><th>Situation</th><th>Action</th></tr></thead>
                <tbody>{filteredRows.map((row) => (
                  <tr key={row.student.id}>
                    <td>{row.student.matricule}</td><td>{row.student.lastName} {row.student.firstName}</td><td>{classLabel(row.class)}</td>
                    <td>{row.status === 'missing-fee' ? '—' : money(row.totalDue, row.currency)}</td>
                    <td>{row.status === 'missing-fee' ? '—' : money(row.totalPaid, row.currency)}</td>
                    <td>{row.status === 'missing-fee' ? '—' : `${row.percentagePaid.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}</td>
                    <td>{row.status === 'missing-fee' ? '—' : money(row.balance, row.currency)}</td>
                    <td><StatusBadge tone={statusTones[row.status]}>{statusLabels[row.status]}</StatusBadge></td>
                    <td><button type="button" className="icon-table-action" title="Voir la fiche élève" aria-label="Voir la fiche élève" onClick={() => onViewStudent(row.student.id)}><Eye size={15} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
        </section>
        </>}
      </>}
    </div>
  );
}
