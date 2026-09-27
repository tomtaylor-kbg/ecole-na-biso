import { useEffect, useState } from 'react';
import { userRoleOptions } from './roles';
import type { ApiFee, ApiSettings, ApiStudent, LookupClass, LookupSchoolYear, OverlayType } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const currencyOptions = ['USD', 'CDF', 'EUR'];

export function CreationOverlay({ type, onClose, onCreated }: { type: OverlayType; onClose: () => void; onCreated?: () => void }) {
  const [classes, setClasses] = useState<LookupClass[]>([]);
  const [schoolYears, setSchoolYears] = useState<LookupSchoolYear[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [fees, setFees] = useState<ApiFee[]>([]);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [paymentClassId, setPaymentClassId] = useState('');
  const [paymentFeeId, setPaymentFeeId] = useState('');
  const [paymentStudentId, setPaymentStudentId] = useState('');
  const [error, setError] = useState('');
  const needsLookups = ['student', 'class', 'payment', 'fee'].includes(type);
  const [isLoading, setIsLoading] = useState(needsLookups);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const content = { student: { eyebrow: 'Nouvelle inscription', title: 'Ajouter un élève', submit: 'Enregistrer l’élève' }, class: { eyebrow: 'Organisation scolaire', title: 'Ajouter une classe', submit: 'Enregistrer la classe' }, payment: { eyebrow: 'Encaissement', title: 'Enregistrer un paiement', submit: 'Enregistrer le paiement' }, fee: { eyebrow: 'Configuration', title: 'Ajouter un frais', submit: 'Enregistrer le frais' }, 'school-year': { eyebrow: 'Configuration', title: 'Ajouter une année scolaire', submit: 'Enregistrer l’année' }, user: { eyebrow: 'Administration', title: 'Ajouter un utilisateur', submit: 'Enregistrer l’utilisateur' } }[type];

  useEffect(() => {
    if (!needsLookups) return;
    const loadLookups = async () => {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` };
        const endpoints = type === 'payment' ? ['students', 'fees', 'classes', 'settings'] : type === 'student' ? ['classes', 'school-years'] : type === 'class' ? ['school-years'] : type === 'fee' ? ['school-years', 'classes', 'students', 'settings'] : ['school-years', 'classes', 'students'];
        const responses = await Promise.all(endpoints.map((endpoint) => fetch(`${apiUrl}/api/${endpoint}`, { headers })));
        if (responses.some((response) => !response.ok)) throw new Error('Impossible de charger les données scolaires.');
        if (type === 'payment') {
          setStudents(await responses[0].json());
          setFees(await responses[1].json());
          setClasses(await responses[2].json());
          setSettings(await responses[3].json());
        } else if (type === 'student') {
          setClasses(await responses[0].json());
          setSchoolYears(await responses[1].json());
        } else if (type === 'class') {
          setSchoolYears(await responses[0].json());
        } else {
          setSchoolYears(await responses[0].json());
          setClasses(await responses[1].json());
          setStudents(await responses[2].json());
          if (type === 'fee') setSettings(await responses[3].json());
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les données.');
      } finally { setIsLoading(false); }
    };
    void loadLookups();
  }, [needsLookups, type]);

  const activePaymentFee = fees.find((fee) => fee.id === paymentFeeId);
  const feeClassId = activePaymentFee?.classId ?? '';
  const feeStudentId = activePaymentFee?.studentId ?? '';
  const effectivePaymentClassId = paymentClassId || feeClassId;
  const filteredPaymentStudents = students.filter((student) => {
    if (feeStudentId) return student.id === feeStudentId;
    if (effectivePaymentClassId) return student.class?.id === effectivePaymentClassId;
    return true;
  });
  const filteredPaymentFees = fees.filter((fee) => {
    if (paymentStudentId && fee.studentId && fee.studentId !== paymentStudentId) return false;
    if (paymentClassId && fee.classId && fee.classId !== paymentClassId) return false;
    if (paymentStudentId) {
      const student = students.find((item) => item.id === paymentStudentId);
      if (student && fee.classId && fee.classId !== student.class?.id) return false;
    }
    return fee.status === 'active';
  });
  const money = (value: number | string, currency = settings?.currency ?? 'USD') => `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const activeYear = schoolYears.find((year) => year.isActive) ?? schoolYears[0];
    const body = type === 'user'
      ? { username: String(formData.get('username') ?? ''), email: String(formData.get('email') ?? ''), password: String(formData.get('password') ?? ''), firstName: String(formData.get('firstName') ?? ''), lastName: String(formData.get('lastName') ?? ''), role: String(formData.get('role') ?? 'CAISSIER') }
      : type === 'school-year'
      ? { name: String(formData.get('name') ?? ''), startDate: String(formData.get('startDate') ?? ''), endDate: String(formData.get('endDate') ?? ''), isActive: formData.get('isActive') === 'on' }
      : type === 'fee'
      ? { name: String(formData.get('name') ?? ''), amount: Number(formData.get('amount') ?? 0), currency: String(formData.get('currency') ?? settings?.currency ?? 'USD'), dueDate: String(formData.get('dueDate') ?? '') || null, status: 'active', schoolYearId: String(formData.get('schoolYearId') ?? ''), classId: String(formData.get('classId') ?? '') || null, studentId: String(formData.get('studentId') ?? '') || null }
      : type === 'payment'
      ? { studentId: paymentStudentId || String(formData.get('studentId') ?? ''), feeId: paymentFeeId || String(formData.get('feeId') ?? ''), amount: Number(formData.get('amount') ?? 0), paymentMode: String(formData.get('paymentMode') ?? ''), reference: String(formData.get('reference') ?? '') }
      : type === 'class'
      ? { name: String(formData.get('name') ?? ''), level: String(formData.get('level') ?? ''), schoolYearId: String(formData.get('schoolYearId') ?? activeYear?.id ?? '') }
      : { matricule: String(formData.get('matricule') ?? '').trim() || undefined, firstName: String(formData.get('firstName') ?? ''), lastName: String(formData.get('lastName') ?? ''), gender: String(formData.get('gender') ?? ''), birthDate: String(formData.get('birthDate') ?? ''), classId: String(formData.get('classId') ?? ''), schoolYearId: String(formData.get('schoolYearId') ?? activeYear?.id ?? '') };
    setIsSubmitting(true);
    try {
      const endpoint = { payment: 'payments', class: 'classes', student: 'students', fee: 'fees', 'school-year': 'school-years', user: 'users' }[type];
      const response = await fetch(`${apiUrl}/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` }, body: JSON.stringify(body) });
      const responseBody = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseBody?.message ?? 'La création a échoué.');
      onCreated?.();
      onClose();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'La création a échoué.'); }
    finally { setIsSubmitting(false); }
  };

  return <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}><section className="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="overlay-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="overlay-header"><div><p className="eyebrow">{content.eyebrow}</p><h2 id="overlay-title">{content.title}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div>
    <form className="overlay-form" onSubmit={handleSubmit}>
      {error && <p className="form-error" role="alert">{error}</p>}{isLoading && <p className="form-help">Chargement des données scolaires...</p>}
      {type === 'student' && <><div className="form-grid two-columns"><label>Nom et Postnom<input required name="lastName" placeholder="Nom et postnom" /></label><label>Prénom<input required name="firstName" placeholder="Prénom" /></label></div><div className="form-grid two-columns"><label>Matricule<input name="matricule" placeholder="ELV-2026-001" /></label><label>Classe<select required name="classId" disabled={isLoading}><option value="">Sélectionner</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label></div><div className="form-grid two-columns"><label>Date de naissance<input required type="date" name="birthDate" /></label><label>Genre<select required name="gender"><option value="">Sélectionner</option><option value="M">Masculin</option><option value="F">Féminin</option></select></label></div><input type="hidden" name="schoolYearId" value={(schoolYears.find((year) => year.isActive) ?? schoolYears[0])?.id ?? ''} /></>}
      {type === 'class' && <div className="form-grid two-columns"><label>Nom de la classe<input required name="name" placeholder="6e Primaire" /></label><label>Niveau<select required name="level"><option value="">Sélectionner</option><option>Primaire</option><option>Secondaire</option></select></label><label>Année scolaire<select required name="schoolYearId" disabled={isLoading}><option value="">Sélectionner</option>{schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isActive ? ' · active' : ''}</option>)}</select></label></div>}
      {type === 'payment' && <><div className="form-grid two-columns"><label>Classe<select name="classFilter" value={paymentClassId} disabled={isLoading || Boolean(feeClassId || feeStudentId)} onChange={(event) => { setPaymentClassId(event.target.value); setPaymentStudentId(''); }}><option value="">Toutes les classes</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label><label>Frais<select required name="feeId" value={paymentFeeId} disabled={isLoading} onChange={(event) => { setPaymentFeeId(event.target.value); const fee = fees.find((item) => item.id === event.target.value); if (fee?.studentId) setPaymentStudentId(fee.studentId); if (fee?.classId) setPaymentClassId(fee.classId); }}><option value="">Sélectionner</option>{filteredPaymentFees.map((fee) => <option key={fee.id} value={fee.id}>{fee.name} · {money(fee.amount, fee.currency)}</option>)}</select></label></div><div className="form-grid two-columns"><label>Élève<select required name="studentId" value={paymentStudentId} disabled={isLoading || Boolean(feeStudentId)} onChange={(event) => setPaymentStudentId(event.target.value)}><option value="">Sélectionner</option>{filteredPaymentStudents.map((student) => <option key={student.id} value={student.id}>{student.matricule} · {student.lastName} {student.firstName}</option>)}</select></label><label>Montant<input required min="1" step="0.01" type="number" name="amount" placeholder={`Montant en ${activePaymentFee?.currency ?? settings?.currency ?? 'USD'}`} /></label></div><div className="form-grid two-columns"><label>Mode de paiement<select required name="paymentMode"><option value="">Sélectionner</option><option>Espèces</option><option>Mobile Money</option><option>Virement</option><option>Banque</option><option>Autre</option></select></label><label>Référence<input name="reference" placeholder="PAY-003" /></label></div></>}
      {type === 'fee' && <><div className="form-grid two-columns"><label>Nom<input required name="name" placeholder="Désignation" /></label><label>Montant<input required min="1" step="0.01" type="number" name="amount" placeholder="Montant" /></label></div><div className="form-grid two-columns"><label>Devise<select required name="currency" defaultValue={settings?.currency ?? 'USD'}>{Array.from(new Set([settings?.currency ?? 'USD', ...currencyOptions])).map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label><label>Année scolaire<select required name="schoolYearId" disabled={isLoading}><option value="">Sélectionner</option>{schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label></div><div className="form-grid two-columns"><label>Classe<select name="classId" disabled={isLoading}><option value="">Toutes les classes</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label><label>Élève<select name="studentId" disabled={isLoading}><option value="">Tous les élèves</option>{students.map((student) => <option key={student.id} value={student.id}>{student.matricule} · {student.lastName} {student.firstName}</option>)}</select></label></div><label>Date d’échéance<input type="date" name="dueDate" /></label></>}
      {type === 'school-year' && <><div className="form-grid two-columns"><label>Nom<input required name="name" placeholder="2026-2027" /></label><label className="checkbox-field"><input type="checkbox" name="isActive" /> Année active</label></div><div className="form-grid two-columns"><label>Date de début<input required type="date" name="startDate" /></label><label>Date de fin<input required type="date" name="endDate" /></label></div></>}
      {type === 'user' && <><div className="form-grid two-columns"><label>Username<input required minLength={3} name="username" placeholder="caissier" /></label><label>Email<input required type="email" name="email" placeholder="nom@monexemple.com" /></label></div><div className="form-grid two-columns"><label>Prénom<input required name="firstName" /></label><label>Nom<input required name="lastName" /></label></div><div className="form-grid two-columns"><label>Mot de passe<input required minLength={6} type="password" name="password" placeholder="6 caractères minimum" /></label><label>Rôle<select name="role" defaultValue="CAISSIER">{userRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label></div></>}
      <div className="overlay-actions"><button type="button" className="ghost-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button" disabled={isSubmitting || isLoading}>{isSubmitting ? 'Enregistrement...' : content.submit}</button></div>
    </form>
  </section></div>;
}
