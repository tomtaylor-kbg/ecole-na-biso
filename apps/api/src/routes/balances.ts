import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

router.get(
  '/',
  requirePermission('balances:read'),
  asyncHandler(async (req, res) => {
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const schoolYearId = typeof req.query.schoolYearId === 'string' ? req.query.schoolYearId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const students = await prisma.student.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(schoolYearId ? { schoolYearId } : {}),
      },
      include: {
        class: true,
        schoolYear: true,
        payments: {
          where: { status: 'confirmed' },
          select: { amount: true, feeId: true },
        },
      },
      orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }],
    });

    const fees = await prisma.fee.findMany({
      where: {
        status: 'active',
        ...(schoolYearId ? { schoolYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        amount: true,
        currency: true,
        classId: true,
        studentId: true,
        schoolYearId: true,
      } as any,
    });

    const feeRows = fees as unknown as Array<{ id: string; name: string; amount: unknown; currency?: string | null; schoolYearId: string; classId: string | null; studentId: string | null }>;
    const rows = students.map((student) => {
      const applicableFees = feeRows.filter((fee) => {
        if (fee.schoolYearId !== student.schoolYearId) return false;
        return fee.studentId === student.id || (fee.classId === student.classId && !fee.studentId) || (!fee.classId && !fee.studentId);
      });
      const totalDue = applicableFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
      const feeIds = new Set(applicableFees.map((fee) => fee.id));
      const currency = feeCurrency(applicableFees[0]);
      const totalPaid = student.payments
        .filter((payment) => feeIds.has(payment.feeId))
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      const balance = Math.max(totalDue - totalPaid, 0);
      const rowStatus = balance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

      return {
        student: {
          id: student.id,
          matricule: student.matricule,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        class: {
          id: student.class.id,
          name: student.class.name,
        },
        schoolYear: {
          id: student.schoolYear.id,
          name: student.schoolYear.name,
        },
        totalDue,
        totalPaid,
        balance,
        currency,
        status: rowStatus,
      };
    });

    const filteredRows = status && status !== 'all' ? rows.filter((row) => row.status === status) : rows;
    const summary = filteredRows.reduce(
      (acc, row) => ({
        totalDue: acc.totalDue + row.totalDue,
        totalPaid: acc.totalPaid + row.totalPaid,
        balance: acc.balance + row.balance,
      }),
      { totalDue: 0, totalPaid: 0, balance: 0 }
    );

    res.json({
      currency: filteredRows[0]?.currency ?? 'USD',
      summary,
      rows: filteredRows,
    });
  })
);

export default router;
