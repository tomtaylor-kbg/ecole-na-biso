import type { ApiUserRole } from './types';

export const userRoleOptions: ApiUserRole[] = [
  {
    value: 'ADMIN',
    label: 'Administrateur',
    description: 'Accès complet à la configuration, aux utilisateurs et aux données scolaires.',
    permissions: ['Configuration', 'Utilisateurs', 'Élèves', 'Classes', 'Frais', 'Paiements', 'Rapports', 'Soldes', 'Annulations', 'Journal'],
    permissionKeys: [
      'settings:manage',
      'users:manage',
      'dashboard:read',
      'balances:read',
      'students:read',
      'students:manage',
      'classes:read',
      'classes:manage',
      'fees:read',
      'fees:manage',
      'school-years:read',
      'school-years:manage',
      'payments:read',
      'payments:create',
      'payments:update',
      'payments:cancel',
      'receipts:read',
      'audit:read',
    ],
  },
  {
    value: 'CAISSIER',
    label: 'Caissier',
    description: 'Encaissement des paiements et consultation des soldes utiles au guichet.',
    permissions: ['Consultation élèves', 'Encaissement', 'Reçus', 'Soldes'],
    permissionKeys: [
      'dashboard:read',
      'balances:read',
      'students:read',
      'classes:read',
      'fees:read',
      'school-years:read',
      'payments:read',
      'payments:create',
      'receipts:read',
    ],
  },
];

export const roleLabel = (value?: string | null) => userRoleOptions.find((role) => role.value === value)?.label ?? value ?? '';

export const hasUiPermission = (role: string | undefined | null, permission: string) =>
  Boolean(userRoleOptions.find((option) => option.value === role)?.permissionKeys.includes(permission));
