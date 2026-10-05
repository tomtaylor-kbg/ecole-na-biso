import { useState } from 'react';
import { loginResponseSchema, loginSchema, type LoginResponse } from '@school-fees/contracts';

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const credentials = loginSchema.parse({ username, password });
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const responseText = await response.text();
      let data: { message?: string } & Partial<LoginResponse> = {};
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText) as typeof data;
        } catch {
          throw new Error(`Réponse invalide du serveur (${response.status}).`);
        }
      }

      if (!response.ok) {
        throw new Error(data.message ?? 'Identifiants invalides.');
      }

      const parsedData = loginResponseSchema.safeParse(data);
      if (!parsedData.success) throw new Error('Réponse de connexion invalide. Vérifiez la version de l’API.');

      localStorage.setItem('school-fees-token', parsedData.data.token);
      localStorage.setItem('school-fees-user', JSON.stringify(parsedData.data.user));
      onLogin();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark"><img src="/favicon.svg" alt="" /></div>
          <div>
            <strong>Kalasa - Ketu </strong>
            <span>Administration scolaire</span>
          </div>
        </div>
        <div className="login-heading">
          <p className="eyebrow">Espace sécurisé</p>
          <h1>Bienvenu(e)</h1>
          <p>Connectez-vous pour accéder à votre espace de travail.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Nom d’utilisateur
            <input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="" />
          </label>
          <label>
            Mot de passe
            <input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="" />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'En cours de connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}
