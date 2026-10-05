import { Router } from 'express';
import { classLabel } from '../lib/classLabel.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

const toMoneyNumber = (value: unknown) => Number(value ?? 0);
const feeCurrency = (fee: unknown, fallback = 'USD') => (fee as { currency?: string | null }).currency ?? fallback;

router.get(
  '/',
  requirePermission('dashboard:read'),
  asyncHandler(async (_req, res) => {
    const [settings, students, fees, recentPayments, paymentModeRows] = await Promise.all([
      prisma.institutionSettings.findUnique({ where: { id: 'default' } }),
      prisma.student.findMany({
        include: {
          class: true,
          payments: {
            where: { status: 'confirmed' },
            select: { feeId: true, amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fee.findMany({
        where: { status: 'active' },
        select: { id: true, amount: true, currency: true, schoolYearId: true, classId: true, studentId: true } as any,
      }),
      prisma.payment.findMany({
        where: { status: 'confirmed' },
        include: { student: true, fee: true, user: { select: { firstName: true, lastName: true, username: true } } },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),
      prisma.payment.groupBy({
        by: ['paymentMode'],
        where: { status: 'confirmed' },
        _sum: { amount: true },
      }),
    ]);

    const feeRows = fees as unknown as Array<{ id: string; amount: unknown; currency?: string | null; schoolYearId: string; classId: string | null; studentId: string | null }>;
    const feesBySchoolYear = new Map<string, { global: typeof feeRows; byClass: Map<string, typeof feeRows>; byStudent: Map<string, typeof feeRows> }>();
    for (const fee of feeRows) {
      let index = feesBySchoolYear.get(fee.schoolYearId);
      if (!index) {
        index = { global: [], byClass: new Map(), byStudent: new Map() };
        feesBySchoolYear.set(fee.schoolYearId, index);
      }
      if (fee.studentId) {
        const rows = index.byStudent.get(fee.studentId) ?? [];
        rows.push(fee);
        index.byStudent.set(fee.studentId, rows);
      } else if (fee.classId) {
        const rows = index.byClass.get(fee.classId) ?? [];
        rows.push(fee);
        index.byClass.set(fee.classId, rows);
      } else {
        index.global.push(fee);
      }
    }
    const balanceRows = students.map((student) => {
      const index = feesBySchoolYear.get(student.schoolYearId);
      const applicableFees = index
        ? [...(index.byStudent.get(student.id) ?? []), ...(index.byClass.get(student.classId) ?? []), ...index.global]
        : [];
      const totalDue = applicableFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
      const feeIds = new Set(applicableFees.map((fee) => fee.id));
      const currency = feeCurrency(applicableFees[0], settings?.currency ?? 'USD');
      const totalPaid = student.payments
        .filter((payment) => feeIds.has(payment.feeId))
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return {
        student: {
          id: student.id,
          matricule: student.matricule,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        class: {
          id: student.class.id,
          name: classLabel(student.class),
        },
        totalDue,
        totalPaid,
        balance: Math.max(totalDue - totalPaid, 0),
        currency,
      };
    });

    const totalDue = balanceRows.reduce((sum, row) => sum + row.totalDue, 0);
    const totalPaid = balanceRows.reduce((sum, row) => sum + row.totalPaid, 0);
    const balance = balanceRows.reduce((sum, row) => sum + row.balance, 0);

    res.json({
      currency: settings?.currency ?? 'USD',
      summary: {
        studentCount: students.length,
        totalDue,
        totalPaid,
        balance,
        studentsWithBalance: balanceRows.filter((row) => row.balance > 0).length,
      },
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        student: `${payment.student.lastName} ${payment.student.firstName}`,
        fee: payment.fee.name,
        amount: Number(payment.amount),
        currency: feeCurrency(payment.fee, settings?.currency ?? 'USD'),
        paymentMode: payment.paymentMode,
        paymentDate: payment.paymentDate,
        cashier: payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : null,
      })),
      balances: balanceRows
        .filter((row) => row.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8),
      paymentsByMode: paymentModeRows.map((row) => ({
        mode: row.paymentMode,
        amount: toMoneyNumber(row._sum.amount),
      })),
    });
  })
);

export default router;
