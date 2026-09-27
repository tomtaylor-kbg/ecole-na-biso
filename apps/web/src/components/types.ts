import type { LucideIcon } from 'lucide-react';

export type OverlayType = 'student' | 'class' | 'payment' | 'fee' | 'school-year' | 'user';
export type BadgeTone = 'success' | 'warning' | 'neutral' | 'danger';

export type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export type PaymentRow = {
  student: string;
  amount: string;
  method: string;
  date: string;
};

export type BalanceRow = {
  pupil: string;
  className: string;
  total: string;
  paid: string;
  balance: string;
};

export type ListRow = {
  id: string;
  cells: string[];
  status?: { label: string; tone: BadgeTone };
  source?: unknown;
};

export type DetailRecord = {
  title: string;
  headings: string[];
  row: ListRow;
};

export type StudentFinancialSituation = {
  student: {
    id: string;
    matricule: string;
    lastName: string;
    firstName: string;
    className: string;
    schoolYear: string;
  };
  currency: string;
  summary: {
    totalDue: number;
    totalPaid: number;
    balance: number;
  };
  fees: Array<{
    id: string;
    name: string;
    scope: string;
    dueDate?: string | null;
    amountDue: number;
    amountPaid: number;
    balance: number;
    currency?: string;
    status: 'paid' | 'partial' | 'unpaid';
  }>;
  payments: Array<{
    id: string;
    feeId: string;
    feeName: string;
    amount: number;
    paymentDate: string;
    paymentMode: string;
    reference?: string | null;
    status: string;
    cancelledAt?: string | null;
    cancellationReason?: string | null;
    userId?: string | null;
    cashier?: string | null;
  }>;
};

export type ClassFeeConfiguration = {
  class: {
    id: string;
    name: string;
    level: string;
    schoolYear: string;
  };
  currency: string;
  studentCount: number;
  summary: {
    perStudentTotal: number;
    expectedTotal: number;
    paidTotal: number;
    balanceTotal: number;
  };
  fees: Array<{
    id: string;
    name: string;
    scope: string;
    amount: number;
    currency?: string;
    dueDate?: string | null;
    expectedTotal: number;
    paidTotal: number;
    balanceTotal: number;
  }>;
};

export type PaymentReceipt = {
  institution: ApiSettings | null;
  receipt: {
    number: string;
    status: string;
    date: string;
  };
  student: {
    id: string;
    matricule: string;
    lastName: string;
    firstName: string;
    className: string;
    schoolYear: string;
  };
  fee: {
    id: string;
    name: string;
    amount: number;
    currency: string;
  };
  payment: {
    id: string;
    amount: number;
    mode: string;
    reference?: string | null;
    cashier?: string | null;
  };
  totals: {
    paidForFee: number;
    remainingForFee: number;
  };
  currency: string;
};

export type BalanceReport = {
  currency: string;
  summary: {
    totalDue: number;
    totalPaid: number;
    balance: number;
  };
  rows: Array<{
    student: {
      id: string;
      matricule: string;
      firstName: string;
      lastName: string;
    };
    class: {
      id: string;
      name: string;
    };
    schoolYear: {
      id: string;
      name: string;
    };
    totalDue: number;
    totalPaid: number;
    balance: number;
    currency?: string;
    status: 'paid' | 'partial' | 'unpaid';
  }>;
};

export type DashboardData = {
  currency: string;
  summary: {
    studentCount: number;
    totalDue: number;
    totalPaid: number;
    balance: number;
    studentsWithBalance: number;
  };
  recentPayments: Array<{
    id: string;
    student: string;
    fee: string;
    amount: number;
    currency?: string;
    paymentMode: string;
    paymentDate: string;
    cashier?: string | null;
  }>;
  balances: Array<{
    student: {
      id: string;
      matricule: string;
      lastName: string;
      firstName: string;
    };
    class: {
      id: string;
      name: string;
    };
    totalDue: number;
    totalPaid: number;
    balance: number;
    currency?: string;
  }>;
  paymentsByMode: Array<{
    mode: string;
    amount: number;
  }>;
};

export type CrudResource = 'students' | 'classes' | 'fees' | 'payments' | 'school-years' | 'users';

export type ApiStudent = {
  id: string;
  matricule: string;
  lastName: string;
  firstName: string;
  class?: { id: string; name: string } | null;
};

export type ApiClass = {
  id: string;
  name: string;
  level: string;
  schoolYearId?: string;
  schoolYear?: { name: string } | null;
};

export type ApiFee = {
  id: string;
  name: string;
  amount: string | number;
  currency: string;
  status: string;
  schoolYearId?: string;
  classId?: string | null;
  studentId?: string | null;
  class?: { name: string } | null;
  student?: { id?: string; lastName: string; firstName: string } | null;
};

export type ApiPayment = {
  id: string;
  studentId: string;
  feeId: string;
  amount: string | number;
  paymentDate: string;
  paymentMode: string;
  receiptNumber?: string | null;
  status?: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  student: { lastName: string; firstName: string };
  fee: { name: string; currency?: string };
  user?: { firstName: string; lastName: string; username: string } | null;
};

export type ApiSchoolYear = {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type ApiUserRole = {
  value: string;
  label: string;
  description: string;
  permissions: string[];
  permissionKeys: string[];
};

export type ApiAuditLog = {
  id: string;
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; username: string; role: string } | null;
};

export type ApiSettings = {
  id: string;
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  currency: string;
  receiptPrefix: string;
  primaryColor: string;
};

export type PageCard = {
  title: string;
  description: string;
  count: string;
};

export type LookupClass = {
  id: string;
  name: string;
  level: string;
};

export type LookupSchoolYear = {
  id: string;
  name: string;
  isActive: boolean;
};
