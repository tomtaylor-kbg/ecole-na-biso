import { useEffect, useState } from 'react';
import { userRoleOptions } from './roles';
import type { ApiUserRole } from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export function HelpPage() {
  const [roles, setRoles] = useState<ApiUserRole[]>(userRoleOptions);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/users/roles`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
        });
        if (response.ok) setRoles(await response.json());
      } catch {
        // Keep the built-in role descriptions available if the request fails.
      }
    };
    void loadRoles();
  }, []);

  return (
    <>
      <section className="page-header"><div><p className="eyebrow">Documentation</p><h2>Aide</h2></div></section>
      <p className="page-subtitle">Consultez les rôles utilisateurs et les accès associés.</p>
      <section className="panel settings-section">
        <div className="panel-header"><h3>Rôles utilisateurs</h3></div>
        <div className="roles-grid">
          {roles.map((role) => <article className="role-card" key={role.value}>
            <div>
              <p className="role-name">{role.label}</p>
              <p className="role-description">{role.description}</p>
            </div>
            <div className="permission-list">
              {role.permissions.map((permission) => <span key={permission}>{permission}</span>)}
            </div>
          </article>)}
        </div>
      </section>
    </>
  );
}
