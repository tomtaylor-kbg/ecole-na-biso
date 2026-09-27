import { useEffect, useState } from 'react';
import { userRoleOptions } from './roles';
import type { ApiUserRole } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const gettingStarted = [
  ['1. Configuration', <>Renseignez le nom de l’établissement, sa devise, le préfixe des reçus et la couleur dans <strong>Paramètres</strong>.</>],
  ['2. Année scolaire', <>Créez l’année en cours dans <strong>Années scolaires</strong> et définissez-la comme active.</>],
  ['3. Classes', <>Ajoutez vos classes et rattachez-les à l’année scolaire active dans <strong>Classes</strong>.</>],
  ['4. Frais scolaires', <>Définissez les frais et associez-les aux classes dans <strong>Frais scolaires</strong>.</>],
  ['5. Élèves', <>Inscrivez les élèves avec leur matricule et affectez-les à leur classe dans <strong>Élèves</strong>.</>],
  ['6. Paiements', <>Enregistrez les versements et délivrez les reçus dans <strong>Paiements</strong>.</>],
] as const;

export function HelpPage() {
  const [roles, setRoles] = useState<ApiUserRole[]>(userRoleOptions);

  useEffect(() => {
    fetch(`${apiUrl}/api/users/roles`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ApiUserRole[] | null) => { if (data) setRoles(data); })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <section className="page-header"><div><p className="eyebrow">Documentation</p><h2>Aide &amp; Guide d’utilisation</h2></div></section>
      <p className="page-subtitle">Les principales fonctions de l’application et les étapes pour gérer votre établissement.</p>

      <section className="panel help-content">
        <h3>Rôles utilisateurs</h3>
        <p>Les droits disponibles dépendent du rôle attribué à chaque utilisateur.</p>
        <ul>{roles.map((role) => <li key={role.value}><strong>{role.label}</strong> — {role.description}<small>{role.permissions.join(' · ')}</small></li>)}</ul>

        <h3>Pour commencer</h3>
        <ol>{gettingStarted.map(([title, description]) => <li key={title}><strong>{title}</strong> — {description}</li>)}</ol>

        <h3>Scolarité</h3>
        <ul>
          <li><strong>Années scolaires.</strong> Définissez les dates de la période académique. Une seule année peut être active à la fois.</li>
          <li><strong>Classes.</strong> Regroupez les élèves par niveau et appliquez les frais collectifs à une promotion.</li>
          <li><strong>Élèves.</strong> Chaque fiche utilise un matricule unique et affiche le total dû, le montant payé et le reste à payer.</li>
        </ul>

        <h3>Frais et paiements</h3>
        <ul>
          <li><strong>Frais scolaires.</strong> Créez les rubriques, leur montant, leur devise et leur portée (classe ou élève).</li>
          <li><strong>Paiements.</strong> Enregistrez les versements en espèces, Mobile Money, banque, virement ou autre, avec une référence si nécessaire.</li>
          <li><strong>Acomptes.</strong> Un frais peut être réglé en plusieurs fois ; le solde est recalculé après chaque versement.</li>
          <li><strong>Reçus.</strong> Un reçu numéroté est généré automatiquement et peut être imprimé immédiatement.</li>
          <li><strong>Annulation.</strong> Un administrateur peut annuler un paiement avec un motif obligatoire. L’opération est conservée dans le journal d’audit.</li>
        </ul>

        <h3>Configuration et questions fréquentes</h3>
        <ul>
          <li><strong>Paramètres.</strong> Personnalisez les coordonnées de l’école, la devise, le préfixe des reçus et la couleur principale.</li>
          <li><strong>Journal d’audit.</strong> Consultez les actions sensibles avec leur date, leur auteur et leur détail.</li>
          <li><strong>Mobile Money.</strong> Choisissez le mode correspondant et saisissez le code de transaction dans le champ Référence.</li>
          <li><strong>Impayés.</strong> La rubrique <strong>Soldes</strong> affiche la situation de chaque élève.</li>
          <li><strong>Paiement erroné.</strong> Un administrateur doit annuler le paiement avec un motif, puis enregistrer le montant correct.</li>
          <li><strong>Élève inactif.</strong> Un élève ayant des paiements ne peut pas être supprimé ; passez son statut à Inactif.</li>
        </ul>
      </section>
    </>
  );
}
