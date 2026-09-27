import { useState } from 'react';
import { AlertTriangle, Save, X } from 'lucide-react';
import type { ApiSettings } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? '';

type SettingsFormValue = {
  name: string;
  legalName: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  currency: string;
  receiptPrefix: string;
  primaryColor: string;
};

const defaults: SettingsFormValue = {
  name: '',
  legalName: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  currency: 'CDF',
  receiptPrefix: 'RECU',
  primaryColor: '#3b82f6',
};

const fromSettings = (settings?: ApiSettings | null): SettingsFormValue => ({
  name: settings?.name ?? defaults.name,
  legalName: settings?.legalName ?? defaults.legalName,
  address: settings?.address ?? defaults.address,
  city: settings?.city ?? defaults.city,
  country: settings?.country ?? defaults.country,
  phone: settings?.phone ?? defaults.phone,
  email: settings?.email ?? defaults.email,
  website: settings?.website ?? defaults.website,
  logoUrl: settings?.logoUrl ?? defaults.logoUrl,
  currency: settings?.currency ?? defaults.currency,
  receiptPrefix: settings?.receiptPrefix ?? defaults.receiptPrefix,
  primaryColor: settings?.primaryColor ?? defaults.primaryColor,
});

function SettingsForm({ settings, mode, onSaved }: { settings?: ApiSettings | null; mode: 'setup' | 'settings'; onSaved: (settings: ApiSettings) => void }) {
  const [form, setForm] = useState<SettingsFormValue>(() => fromSettings(settings));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof SettingsFormValue, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/api/settings${mode === 'setup' ? '/setup' : ''}`, {
        method: mode === 'setup' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(mode === 'settings' ? { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? 'La configuration n’a pas pu être enregistrée.');
      onSaved(body);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La configuration n’a pas pu être enregistrée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="settings-form" onSubmit={submit}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="panel settings-section">
        <div className="panel-header"><h3>Identité</h3></div>
        <div className="form-grid two-columns">
          <label>Nom de l’établissement<input required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label>Nom légal<input value={form.legalName} onChange={(event) => update('legalName', event.target.value)} /></label>
        </div>
        <div className="form-grid two-columns">
          <label>Ville<input value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
          <label>Pays<input value={form.country} onChange={(event) => update('country', event.target.value)} /></label>
        </div>
        <label>Adresse<textarea rows={3} value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
      </section>

      <section className="panel settings-section">
        <div className="panel-header"><h3>Contact</h3></div>
        <div className="form-grid two-columns">
          <label>Téléphone<input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
        </div>
        <div className="form-grid two-columns">
          <label>Site web<input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://..." /></label>
          <label>Logo URL<input type="url" value={form.logoUrl} onChange={(event) => update('logoUrl', event.target.value)} placeholder="https://..." /></label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-header"><h3>Préférences</h3></div>
        <div className="form-grid three-columns">
          <label>Devise<input required value={form.currency} maxLength={8} onChange={(event) => update('currency', event.target.value.toUpperCase())} /></label>
          <label>Préfixe reçu<input required value={form.receiptPrefix} maxLength={12} onChange={(event) => update('receiptPrefix', event.target.value.toUpperCase())} /></label>
          <label>Couleur principale<input required type="color" value={form.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} /></label>
        </div>
      </section>

      <div className="settings-actions">
        <button type="submit" className="primary-button" disabled={isSubmitting}><Save size={17} />{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}

export function SettingsPage({ settings, onSaved, onReset }: { settings: ApiSettings | null; onSaved: (settings: ApiSettings) => void; onReset?: () => void }) {
  const [password, setPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isResetOverlayOpen, setIsResetOverlayOpen] = useState(false);

  const resetData = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError('');
    setResetMessage('');
    setIsResetting(true);
    try {
      const response = await fetch(`${apiUrl}/api/settings/reset-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? 'La réinitialisation a échoué.');
      setPassword('');
      setResetMessage(body.message);
      setIsResetOverlayOpen(false);
      onReset?.();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'La réinitialisation a échoué.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <section className="page-header"><div><p className="eyebrow">Administration</p><h2>Paramètres</h2></div></section>
      <p className="page-subtitle">Configuration de l’établissement, des reçus et des informations affichées dans l’application.</p>
      <SettingsForm settings={settings} mode="settings" onSaved={onSaved} />
      <section className="panel settings-section danger-section">
        <div className="panel-header"><h3><AlertTriangle size={18} /> Réinitialiser les données</h3></div>
        <p>Efface les données scolaires et relance l’assistant de configuration de l’établissement. Les comptes utilisateurs et le journal d’audit sont conservés.</p>
        <div className="settings-actions"><button type="button" className="danger-button" onClick={() => { setResetError(''); setIsResetOverlayOpen(true); }}>Réinitialiser les données</button></div>
        {resetMessage && <p className="form-success" role="status">{resetMessage}</p>}
      </section>
      {isResetOverlayOpen && <div className="overlay-backdrop" role="presentation" onMouseDown={() => !isResetting && setIsResetOverlayOpen(false)}>
        <section className="overlay-panel reset-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="overlay-header"><div><p className="eyebrow">Action irréversible</p><h2 id="reset-title">Confirmer la réinitialisation</h2></div><button type="button" className="icon-button" onClick={() => setIsResetOverlayOpen(false)} aria-label="Fermer"><X size={17} /></button></div>
          <div className="reset-warning"><AlertTriangle size={20} /><p>Les paiements, frais, élèves, classes et années scolaires seront définitivement supprimés. La configuration de l’établissement sera également effacée et l’assistant de configuration sera relancé.</p></div>
          <form className="overlay-form" onSubmit={resetData}>
            <label>Mot de passe administrateur<input required autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {resetError && <p className="form-error" role="alert">{resetError}</p>}
            <div className="overlay-actions"><button type="button" className="ghost-button" onClick={() => setIsResetOverlayOpen(false)} disabled={isResetting}>Annuler</button><button type="submit" className="danger-button" disabled={isResetting}>{isResetting ? 'Réinitialisation...' : 'Confirmer la suppression'}</button></div>
          </form>
        </section>
      </div>}
    </>
  );
}

export function SetupPage({ onConfigured }: { onConfigured: (settings: ApiSettings) => void }) {
  return (
    <main className="setup-page">
      <section className="setup-shell">
        <div className="setup-heading">
          <div className="brand-mark"><img src="/favicon.svg" alt="" /></div>
          <div><p className="eyebrow">Configuration initiale</p><h1>Établissement</h1></div>
        </div>
        <SettingsForm mode="setup" onSaved={onConfigured} />
      </section>
    </main>
  );
}
