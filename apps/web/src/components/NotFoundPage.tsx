import { ArrowLeft, Home, Map } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-code">404</div>
      <p className="eyebrow">Page introuvable</p>
      <h2 id="not-found-title">Cette page n’existe pas</h2>
      <p className="not-found-copy">L’adresse demandée est incorrecte ou la page a été déplacée.</p>
      <div className="not-found-actions">
        <Link to="/" className="primary-button"><Home size={17} />Tableau de bord</Link>
        <Link to="/help" className="ghost-button"><Map size={17} />Ouvrir l’aide</Link>
        <button type="button" className="ghost-button" onClick={() => window.history.back()}><ArrowLeft size={17} />Page précédente</button>
      </div>
    </section>
  );
}
