import { useState } from 'react';
import { userRoleOptions } from './roles';
import { classLabel } from './classLabels';
import type { ApiClass, ApiFee, ApiSchoolYear, ApiStudent, CrudResource, DetailRecord } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const currencyOptions = ['USD', 'CDF', 'EUR'];
type EditValue = Record<string, any>;

type EditOverlayProps = {
  resource: CrudResource;
  record: DetailRecord;
  classes: ApiClass[];
  students: ApiStudent[];
  fees: ApiFee[];
  schoolYears: ApiSchoolYear[];
  onClose: () => void;
  onSaved: () => void;
};

const labels: Record<CrudResource, string> = {
  students: 'Modifier l’élève', classes: 'Modifier la classe', fees: 'Modifier le frais',
  payments: 'Modifier le paiement', 'school-years': 'Modifier l’année scolaire', users: 'Modifier l’utilisateur',
};

export function EditOverlay({ resource, record, classes, students, fees, schoolYears, onClose, onSaved }: EditOverlayProps) {
  const value = (record.row.source ?? {}) as EditValue;
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<EditValue>(() => ({
    code: value.code ?? '', name: value.name ?? '', level: value.level ?? '', 
    section: value.section ?? 'UNIQUE', orientation: value.orientation ?? '',
    capacity: value.capacity ?? '',
    matricule: value.matricule ?? '', firstName: value.firstName ?? '', lastName: value.lastName ?? '',
    gender: value.gender ?? 'M', birthDate: value.birthDate ? String(value.birthDate).slice(0, 10) : '', classId: value.classId ?? '', schoolYearId: value.schoolYearId ?? '',
    amount: value.amount ? Number(value.amount) : '', currency: value.currency ?? 'USD', dueDate: value.dueDate ? String(value.dueDate).slice(0, 10) : '', status: value.status ?? (resource === 'classes' ? 'ACTIVE' : 'active'),
    studentId: value.studentId ?? '', feeId: value.feeId ?? '', paymentDate: value.paymentDate ? String(value.paymentDate).slice(0, 10) : '', paymentMode: value.paymentMode ?? 'Espèces', reference: value.reference ?? '',
    username: value.username ?? '', email: value.email ?? '', phone: value.phone ?? '', role: value.role ?? 'CAISSIER', isActive: Boolean(value.isActive),
    startDate: value.startDate ? String(value.startDate).slice(0, 10) : '', endDate: value.endDate ? String(value.endDate).slice(0, 10) : '',
  }));

  const update = (field: string, nextValue: string | boolean) => setForm((current) => ({ ...current, [field]: nextValue }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    const bodyByResource: Record<CrudResource, EditValue> = {
      students: { matricule: form.matricule, firstName: form.firstName, lastName: form.lastName, gender: form.gender, birthDate: form.birthDate, classId: form.classId, schoolYearId: form.schoolYearId },
      classes: { 
        code: form.code, name: form.name, level: form.level, 
        section: form.section, 
        orientation: form.level === 'Secondaire' ? form.orientation || null : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        status: form.status,
        schoolYearId: form.schoolYearId 
      },
      fees: { name: form.name, amount: Number(form.amount), currency: form.currency, dueDate: form.dueDate || null, status: form.status, schoolYearId: form.schoolYearId, classId: form.classId || null, studentId: form.studentId || null },
      payments: { studentId: form.studentId, feeId: form.feeId, amount: Number(form.amount), paymentDate: form.paymentDate || undefined, paymentMode: form.paymentMode, reference: form.reference || null },
      'school-years': { name: form.name, startDate: form.startDate, endDate: form.endDate, isActive: Boolean(form.isActive) },
      users: { username: form.username, email: form.email, phone: form.phone, firstName: form.firstName, lastName: form.lastName, ...(form.password ? { password: form.password } : {}), role: form.role },
    };
    const body = bodyByResource[resource];
    try {
      const response = await fetch(`${apiUrl}/api/${resource}/${record.row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` }, body: JSON.stringify(body) });
      const responseBody = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseBody?.message ?? 'La modification a échoué.');
      onSaved(); onClose();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'La modification a échoué.'); }
    finally { setIsSubmitting(false); }
  };
  const field = (name: string, label: string, type = 'text', required = true) => <label>{label}<input required={required} type={type} value={form[name] ?? ''} onChange={(event) => update(name, event.target.value)} /></label>;
  const select = (name: string, label: string, options: Array<{ value: string; label: string }>, required = true) => <label>{label}<select required={required} value={form[name] ?? ''} onChange={(event) => update(name, event.target.value)}><option value="">Sélectionner</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;

  return <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}><section className="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="edit-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="overlay-header"><div><p className="eyebrow">Fiche métier</p><h2 id="edit-title">{labels[resource]}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div>
    <form className="overlay-form" onSubmit={submit}>{error && <p className="form-error" role="alert">{error}</p>}
      {resource === 'students' && <><div className="form-grid two-columns">{field('lastName', 'Nom et Postnom')}{field('firstName', 'Prénom')}</div><div className="form-grid two-columns">{field('matricule', 'Matricule')}{select('classId', 'Classe', classes.map((item) => ({ value: item.id, label: classLabel(item) })))}</div><div className="form-grid two-columns">{field('birthDate', 'Date de naissance', 'date')}{select('gender', 'Genre', [{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }])}</div></>}
      {resource === 'classes' && <><div className="form-grid two-columns">{field('code', 'Code')}{field('name', 'Nom de la classe')}</div><div className="form-grid two-columns"><label>Niveau<select required value={form.level} onChange={(event) => { update('level', event.target.value); if (event.target.value !== 'Secondaire') update('orientation', ''); }}><option value="">Sélectionner</option>{['Maternelle', 'Primaire', 'Secondaire'].map((level) => <option key={level}>{level}</option>)}</select></label><label>Section<select required value={form.section} onChange={(event) => update('section', event.target.value)}><option value="UNIQUE">Sans section</option><option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option><option value="D">Section D</option></select></label></div><div className="form-grid two-columns">{form.level === 'Secondaire' && <label>Orientation<select required value={form.orientation} onChange={(event) => update('orientation', event.target.value)}><option value="">Sélectionner</option><option value="SCIENTIFIQUE">Scientifique</option><option value="MECANIQUE">Mécanique</option><option value="LITTERAIRE">Littéraire</option><option value="COMMERCIALE">Commerciale</option><option value="TECHNIQUE">Technique</option><option value="GENERALE">Générale</option><option value="CYCLE_DE_BASE">Cycle de base</option></select></label>}<label>Capacité<input type="number" value={form.capacity ?? ''} onChange={(event) => update('capacity', event.target.value)} placeholder="Ex. 30" min="1" /></label></div><div className="form-grid two-columns"><label>Statut<select required value={form.status} onChange={(event) => update('status', event.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archivée</option></select></label>{select('schoolYearId', 'Année scolaire', schoolYears.map((item) => ({ value: item.id, label: item.name })))}</div></>}
      {resource === 'fees' && <><div className="form-grid two-columns">{field('name', 'Nom')}{field('amount', 'Montant', 'number')}</div><div className="form-grid two-columns">{select('currency', 'Devise', currencyOptions.map((currency) => ({ value: currency, label: currency })))}{select('schoolYearId', 'Année scolaire', schoolYears.map((item) => ({ value: item.id, label: item.name })))}</div><div className="form-grid two-columns">{select('classId', 'Classe', classes.map((item) => ({ value: item.id, label: classLabel(item) })), false)}{select('studentId', 'Élève', students.map((item) => ({ value: item.id, label: `${item.matricule} · ${item.lastName} ${item.firstName}` })), false)}</div>{field('dueDate', 'Date d’échéance', 'date', false)}</>}
      {resource === 'payments' && <><div className="form-grid two-columns">{select('studentId', 'Élève', students.map((item) => ({ value: item.id, label: `${item.matricule} · ${item.lastName} ${item.firstName}` })))}{select('feeId', 'Frais', fees.map((item) => ({ value: item.id, label: `${item.name}${item.dueDate ? ` · échéance ${new Date(item.dueDate).toLocaleDateString('fr-FR')}` : ''}` })))}</div><div className="form-grid two-columns">{field('amount', 'Montant', 'number')}{select('paymentMode', 'Mode de paiement', ['Espèces', 'Mobile Money', 'Virement', 'Banque', 'Autre'].map((item) => ({ value: item, label: item })))}</div>{field('paymentDate', 'Date', 'date', false)}{field('reference', 'Référence', 'text', false)}</>}
      {resource === 'school-years' && <><div className="form-grid two-columns">{field('name', 'Nom')}{field('startDate', 'Date de début', 'date')}</div>{field('endDate', 'Date de fin', 'date')}<label className="checkbox-field"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => update('isActive', event.target.checked)} /> Année active</label></>}
      {resource === 'users' && <><div className="form-grid two-columns">{field('username', 'Username')}{field('email', 'Email (facultatif)', 'email', false)}</div><div className="form-grid two-columns">{field('phone', 'Téléphone (facultatif)', 'tel', false)}{field('firstName', 'Prénom')}</div><div className="form-grid two-columns">{field('lastName', 'Nom')}{field('password', 'Nouveau mot de passe', 'password', false)}</div>{select('role', 'Rôle', userRoleOptions.map((role) => ({ value: role.value, label: role.label })))}</>}
      <div className="overlay-actions"><button type="button" className="ghost-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}</button></div>
    </form>
  </section></div>;
}
