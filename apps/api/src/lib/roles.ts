import { Role } from '@prisma/client';

export type Permission =
  | 'settings:manage'
  | 'users:manage'
  | 'dashboard:read'
  | 'balances:read'
  | 'students:read'
  | 'students:manage'
  | 'classes:read'
  | 'classes:manage'
  | 'fees:read'
  | 'fees:manage'
  | 'school-years:read'
  | 'school-years:manage'
  | 'payments:read'
  | 'payments:create'
  | 'payments:update'
  | 'payments:cancel'
  | 'receipts:read'
  | 'audit:read';

export const roleDefinitions = [
  {
    value: Role.ADMIN,
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
    value: Role.CAISSIER,
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
] as const satisfies ReadonlyArray<{
  value: Role;
  label: string;
  description: string;
  permissions: readonly string[];
  permissionKeys: readonly Permission[];
}>;

export const roleValues = roleDefinitions.map((role) => role.value) as [Role, ...Role[]];

export function hasPermission(role: string | undefined, permission: Permission) {
  const definition = roleDefinitions.find((item) => item.value === role);
  return Boolean((definition?.permissionKeys as readonly Permission[] | undefined)?.includes(permission));
}
