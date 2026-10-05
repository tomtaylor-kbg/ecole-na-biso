import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ClassFeeConfiguration, DetailRecord, PaymentReceipt, StudentFinancialSituation } from './types';
import { openPdf } from '../utils/pdf';

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const money = (value: number, currency: string) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

export function DetailOverlay({ record, onClose }: { record: DetailRecord; onClose: () => void }) {
  const [situation, setSituation] = useState<StudentFinancialSituation | null>(null);
  const [classFees, setClassFees] = useState<ClassFeeConfiguration | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState('');
  const isStudent = record.title === 'Élèves';
  const isClass = record.title === 'Classes';
  const isPayment = record.title === 'Paiements';

  useEffect(() => {
    if (!isStudent && !isClass && !isPayment) return;
    const loadDetails = async () => {
      setError('');
      try {
        const endpoint = isStudent ? `students/${record.row.id}/financial-situation` : isClass ? `classes/${record.row.id}/fee-configuration` : `payments/${record.row.id}/receipt`;
        const response = await fetch(`${apiUrl}/api/${endpoint}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Impossible de charger les détails financiers.');
        if (isStudent) setSituation(body);
        else if (isClass) setClassFees(body);
        else setReceipt(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les détails financiers.');
      }
    };
    void loadDetails();
  }, [isClass, isPayment, isStudent, record.row.id]);

  return (
    <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="overlay-panel detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="overlay-header">
          <div><p className="eyebrow">Fiche métier</p><h2 id="detail-title">{record.title}</h2></div>
          <button type="button" className="icon-button" title="Fermer" aria-label="Fermer" onClick={onClose}><X size={17} /></button>
        </div>
        <dl className="detail-list">
          {record.headings.map((heading, index) => <div className="detail-row" key={`${record.row.id}-${heading}`}><dt>{heading}</dt><dd>{record.row.cells[index] ?? 'Non renseigné'}</dd></div>)}
          {record.row.status && <div className="detail-row"><dt>Statut</dt><dd><StatusBadge tone={record.row.status.tone}>{record.row.status.label}</StatusBadge></dd></div>}
        </dl>
        {isStudent && <section className="financial-block">
          <div className="panel-header"><h3>Situation financière</h3><button type="button" className="ghost-button no-print" onClick={() => void openPdf(`/api/printouts/students/${record.row.id}/profile.pdf`, `fiche-eleve-${record.row.id}.pdf`)}><Printer size={16} /> PDF</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {!error && !situation && <p className="form-help">Chargement de la situation financière...</p>}
          {situation && <>
            <div className="financial-summary">
              <div><span>Total dû</span><strong>{money(situation.summary.totalDue, situation.currency)}</strong></div>
              <div><span>Total payé</span><strong>{money(situation.summary.totalPaid, situation.currency)}</strong></div>
              <div><span>Reste</span><strong>{money(situation.summary.balance, situation.currency)}</strong></div>
            </div>
            <div className="financial-section">
              <h4>Frais</h4>
              <div className="financial-list">{situation.fees.length === 0 ? <p className="form-help">Aucun frais applicable.</p> : situation.fees.map((fee) => <div className="financial-row" key={fee.id}>
                <div><strong>{fee.name}</strong><small>{fee.scope}{fee.dueDate ? ` · ${date(fee.dueDate)}` : ''}</small></div>
                <div className="amount-stack"><span>{money(fee.amountPaid, fee.currency ?? situation.currency)} / {money(fee.amountDue, fee.currency ?? situation.currency)}</span><small>Reste {money(fee.balance, fee.currency ?? situation.currency)}</small></div>
              </div>)}</div>
            </div>
            <div className="financial-section">
              <h4>Historique des paiements</h4>
              <div className="financial-list">{situation.payments.length === 0 ? <p className="form-help">Aucun paiement enregistré.</p> : situation.payments.map((payment) => <div className="financial-row" key={payment.id}>
                <div><strong>{payment.feeName}</strong><small>{payment.paymentMode}{payment.reference ? ` · ${payment.reference}` : ''}{payment.cashier ? ` · ${payment.cashier}` : ''}</small></div>
                <div className="amount-stack"><span>{money(payment.amount, situation.currency)}</span><small>{payment.status === 'cancelled' ? 'Annulé' : date(payment.paymentDate)}</small></div>
              </div>)}</div>
            </div>
          </>}
        </section>}
        {isClass && <section className="financial-block">
          <div className="panel-header"><h3>Frais de la classe</h3></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {!error && !classFees && <p className="form-help">Chargement des frais de la classe...</p>}
          {classFees && <>
            <div className="financial-summary four-columns">
              <div><span>Élèves</span><strong>{classFees.studentCount.toLocaleString('fr-FR')}</strong></div>
              <div><span>Total par élève</span><strong>{money(classFees.summary.perStudentTotal, classFees.currency)}</strong></div>
              <div><span>Attendu</span><strong>{money(classFees.summary.expectedTotal, classFees.currency)}</strong></div>
              <div><span>Reste</span><strong>{money(classFees.summary.balanceTotal, classFees.currency)}</strong></div>
            </div>
            <div className="financial-section">
              <h4>Configuration applicable</h4>
              <div className="financial-list">{classFees.fees.length === 0 ? <p className="form-help">Aucun frais configuré pour cette classe.</p> : classFees.fees.map((fee) => <div className="financial-row" key={fee.id}>
                <div><strong>{fee.name}</strong><small>{fee.scope}{fee.dueDate ? ` · ${date(fee.dueDate)}` : ''}</small></div>
                <div className="amount-stack"><span>{money(fee.amount, fee.currency ?? classFees.currency)} par élève</span><small>Attendu {money(fee.expectedTotal, fee.currency ?? classFees.currency)}</small></div>
              </div>)}</div>
            </div>
          </>}
        </section>}
        {isPayment && <section className="financial-block receipt-block">
          <div className="panel-header"><h3>Reçu de paiement</h3><div className="topbar-actions no-print"><button type="button" className="ghost-button" onClick={() => window.print()}><Printer size={16} />Imprimer</button><button type="button" className="ghost-button" onClick={() => void openPdf(`/api/printouts/payments/${record.row.id}/receipt.pdf`, `recu-${record.row.id}.pdf`)}><Printer size={16} />PDF thermique</button></div></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {!error && !receipt && <p className="form-help">Chargement du reçu...</p>}
          {receipt && <article className="receipt-card">
            <header className="receipt-header">
              <div>
                <strong>{receipt.institution?.name ?? 'Établissement'}</strong>
                <span>{receipt.institution?.address ?? receipt.institution?.city ?? 'Administration scolaire'}</span>
              </div>
              <div className="receipt-number"><span>Reçu</span><strong>{receipt.receipt.number}</strong></div>
            </header>
            <div className="receipt-grid">
              <div><span>Élève</span><strong>{receipt.student.lastName} {receipt.student.firstName}</strong></div>
              <div><span>Matricule</span><strong>{receipt.student.matricule}</strong></div>
              <div><span>Classe</span><strong>{receipt.student.className}</strong></div>
              <div><span>Année</span><strong>{receipt.student.schoolYear}</strong></div>
              <div><span>Motif</span><strong>{receipt.fee.name}</strong></div>
              <div><span>Date</span><strong>{date(receipt.receipt.date)}</strong></div>
              <div><span>Mode</span><strong>{receipt.payment.mode}</strong></div>
              <div><span>Référence</span><strong>{receipt.payment.reference ?? 'Non renseignée'}</strong></div>
              <div><span>Caissier</span><strong>{receipt.payment.cashier ?? 'Non renseigné'}</strong></div>
              <div><span>Statut</span><strong>{receipt.receipt.status === 'cancelled' ? 'Annulé' : 'Confirmé'}</strong></div>
            </div>
            <div className="receipt-total">
              <div><span>Montant payé</span><strong>{money(receipt.payment.amount, receipt.currency)}</strong></div>
              <div><span>Reste à payer</span><strong>{money(receipt.totals.remainingForFee, receipt.currency)}</strong></div>
            </div>
          </article>}
        </section>}
      </section>
    </div>
  );
}
