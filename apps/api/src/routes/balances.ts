import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

// Types pour les enums Prisma (générés automatiquement par Prisma)
type ClassSection = 'A' | 'B' | 'C' | 'D' | 'UNIQUE';
type ClassOrientation = 
  | 'SCIENTIFIQUE' | 'MECANIQUE' | 'CYCLE_DE_BASE'
  | 'LITTERAIRE' | 'COMMERCIALE' | 'TECHNIQUE' | 'GENERALE';
type ClassStatus = 'ACTIVE' | 'ARCHIVED' | 'INACTIVE';


const minervalReportQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  schoolYearId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
});

const financialReportQuery = z.object({
  period: z.enum(['day', 'month']).default('month'),
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).optional(),
  schoolYearId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
});

const periodBounds = (period: 'day' | 'month', value: string) => {
  const start = period === 'day' ? new Date(`${value}T00:00:00.000Z`) : new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new ApiError(400, 'Date de rapport invalide.');
  const end = new Date(start);
  if (period === 'day') end.setUTCDate(end.getUTCDate() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

router.get(
  '/financial-report',
  requirePermission('balances:read'),
  asyncHandler(async (req, res) => {
    const query = financialReportQuery.parse(req.query);
    const now = new Date();
    const defaultDate = query.period === 'day'
      ? now.toISOString().slice(0, 10)
      : now.toISOString().slice(0, 7);
    const date = query.date ?? defaultDate;
    const expectedLength = query.period === 'day' ? 10 : 7;
    if (date.length !== expectedLength) throw new ApiError(400, `La date doit être au format ${query.period === 'day' ? 'AAAA-MM-JJ' : 'AAAA-MM'}.`);
    const { start, end } = periodBounds(query.period, date);
    const payments = await prisma.payment.findMany({
      where: {
        status: 'confirmed',
        paymentDate: { gte: start, lt: end },
        ...((query.schoolYearId || query.classId) ? {
          student: {
            ...(query.schoolYearId ? { schoolYearId: query.schoolYearId } : {}),
            ...(query.classId ? { classId: query.classId } : {}),
          },
        } : {}),
      },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMode: true,
        receiptNumber: true,
        fee: { select: { currency: true, name: true } },
        student: { select: { firstName: true, lastName: true, class: { select: { name: true, code: true } } } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const byCurrency = new Map<string, { currency: string; paymentCount: number; amount: number }>();
    const byMode = new Map<string, { mode: string; paymentCount: number; amount: number }>();
    const byDay = new Map<string, { date: string; paymentCount: number; amount: number }>();
    for (const payment of payments) {
      const amount = Number(payment.amount);
      const currency = payment.fee.currency ?? 'USD';
      const currencyTotal = byCurrency.get(currency) ?? { currency, paymentCount: 0, amount: 0 };
      currencyTotal.paymentCount += 1;
      currencyTotal.amount += amount;
      byCurrency.set(currency, currencyTotal);
      const modeTotal = byMode.get(payment.paymentMode) ?? { mode: payment.paymentMode, paymentCount: 0, amount: 0 };
      modeTotal.paymentCount += 1;
      modeTotal.amount += amount;
      byMode.set(payment.paymentMode, modeTotal);
      const day = payment.paymentDate.toISOString().slice(0, 10);
      const dayTotal = byDay.get(day) ?? { date: day, paymentCount: 0, amount: 0 };
      dayTotal.paymentCount += 1;
      dayTotal.amount += amount;
      byDay.set(day, dayTotal);
    }

    res.json({
      period: query.period,
      date,
      from: start.toISOString(),
      to: end.toISOString(),
      summary: {
        paymentCount: payments.length,
        totalAmount: payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      },
      byCurrency: [...byCurrency.values()].sort((left, right) => left.currency.localeCompare(right.currency)),
      byMode: [...byMode.values()].sort((left, right) => right.amount - left.amount),
      timeline: [...byDay.values()].sort((left, right) => left.date.localeCompare(right.date)),
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.fee.currency ?? 'USD',
        paymentDate: payment.paymentDate,
        paymentMode: payment.paymentMode,
        receiptNumber: payment.receiptNumber,
        feeName: payment.fee.name,
        student: `${payment.student.lastName} ${payment.student.firstName}`,
        className: payment.student.class.code ? `${payment.student.class.code} · ${payment.student.class.name}` : payment.student.class.name,
      })),
    });
  })
);

router.get(
  '/minerval',
  requirePermission('balances:read'),
  asyncHandler(async (req, res) => {
    const query = minervalReportQuery.parse(req.query);
    const now = new Date();
    const month = query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, monthNumber] = month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1));
    const schoolYear = query.schoolYearId
      ? await prisma.schoolYear.findUnique({ where: { id: query.schoolYearId } })
      : await prisma.schoolYear.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });

    if (!schoolYear) {
      throw new ApiError(query.schoolYearId ? 404 : 400, query.schoolYearId ? 'Année scolaire introuvable.' : 'Aucune année scolaire active n’est configurée.');
    }

    const [students, fees, classes, settings] = await Promise.all([
      prisma.student.findMany({
        where: {
          schoolYearId: schoolYear.id,
          status: 'active',
          ...(query.classId ? { classId: query.classId } : {}),
        },
        include: { class: true },
        orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.fee.findMany({
        where: {
          schoolYearId: schoolYear.id,
          status: 'active',
          name: { equals: 'Minerval', mode: 'insensitive' },
          dueDate: { gte: monthStart, lt: nextMonthStart },
        },
        select: { id: true, amount: true, currency: true, classId: true, studentId: true },
      }),
      prisma.class.findMany({
        where: { schoolYearId: schoolYear.id, ...(query.classId ? { id: query.classId } : {}) },
        select: { id: true, code: true, name: true, section: true, orientation: true, capacity: true, status: true },
        orderBy: { name: 'asc' },
      }),
      prisma.institutionSettings.findUnique({ where: { id: 'default' }, select: { currency: true } }),
    ]);

    const studentIds = students.map((student) => student.id);
    const feeIds = fees.map((fee) => fee.id);
    const payments = studentIds.length > 0 && feeIds.length > 0
      ? await prisma.payment.groupBy({
          by: ['studentId', 'feeId'],
          where: { studentId: { in: studentIds }, feeId: { in: feeIds }, status: 'confirmed' },
          _sum: { amount: true },
        })
      : [];
    const paidByFeeAndStudent = new Map(payments.map((payment) => [
      `${payment.studentId}:${payment.feeId}`,
      Number(payment._sum.amount ?? 0),
    ]));

    const rows = students.map((student) => {
      const studentFees = fees.filter((fee) => fee.studentId === student.id);
      const classFees = fees.filter((fee) => fee.studentId === null && fee.classId === student.classId);
      const globalFees = fees.filter((fee) => fee.studentId === null && fee.classId === null);
      const applicableFees = studentFees.length > 0 ? studentFees : classFees.length > 0 ? classFees : globalFees;
      const currency = applicableFees[0] ? feeCurrency(applicableFees[0]) : settings?.currency ?? 'USD';
      const totalDue = applicableFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
      const totalPaid = applicableFees.reduce(
        (sum, fee) => sum + (paidByFeeAndStudent.get(`${student.id}:${fee.id}`) ?? 0),
        0
      );
      const balance = Math.max(totalDue - totalPaid, 0);
      const status = applicableFees.length === 0
        ? 'missing-fee'
        : balance === 0
          ? 'paid'
          : totalPaid >= totalDue / 2
            ? 'half'
            : 'debt';

      return {
        student: {
          id: student.id,
          matricule: student.matricule,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        class: {
          id: student.class.id,
          code: student.class.code,
          name: student.class.name,
          section: student.class.section,
          orientation: student.class.orientation,
          capacity: student.class.capacity,
          status: student.class.status,
        },
        totalDue,
        totalPaid,
        balance,
        percentagePaid: totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0,
        currency,
        status,
      };
    });

    const totals = new Map<string, { currency: string; studentCount: number; totalDue: number; totalPaid: number; balance: number }>();
    const classTotals = new Map<string, {
      class: {
        id: string;
        code: string;
        name: string;
        section: ClassSection;
        orientation: ClassOrientation | null;
        capacity: number | null;
        status: ClassStatus;
      };
      currency: string;
      studentCount: number;
      configuredStudentCount: number;
      studentsMissingFee: number;
      studentsPaid: number;
      studentsAtLeastHalf: number;
      studentsInDebt: number;
      totalDue: number;
      totalPaid: number;
      balance: number;
    }>();

    const getClassTotal = (schoolClass: (typeof rows)[number]['class'], currency: string) => {
      const classKey = `${schoolClass.id}:${currency}`;
      let classTotal = classTotals.get(classKey);
      if (!classTotal) {
        classTotal = {
          class: schoolClass,
          currency,
          studentCount: 0,
          configuredStudentCount: 0,
          studentsMissingFee: 0,
          studentsPaid: 0,
          studentsAtLeastHalf: 0,
          studentsInDebt: 0,
          totalDue: 0,
          totalPaid: 0,
          balance: 0,
        };
        classTotals.set(classKey, classTotal);
      }
      return classTotal;
    };

    for (const row of rows) {
      const classTotal = getClassTotal(row.class, row.currency);
      classTotal.studentCount += 1;
      if (row.status === 'missing-fee') {
        classTotal.studentsMissingFee += 1;
        continue;
      }
      const total = totals.get(row.currency) ?? {
        currency: row.currency, studentCount: 0, totalDue: 0, totalPaid: 0, balance: 0,
      };
      total.studentCount += 1;
      total.totalDue += row.totalDue;
      total.totalPaid += row.totalPaid;
      total.balance += row.balance;
      totals.set(row.currency, total);

      classTotal.configuredStudentCount += 1;
      classTotal.totalDue += row.totalDue;
      classTotal.totalPaid += row.totalPaid;
      classTotal.balance += row.balance;
      if (row.status === 'paid') classTotal.studentsPaid += 1;
      else if (row.status === 'half') classTotal.studentsAtLeastHalf += 1;
      else classTotal.studentsInDebt += 1;
    }

    for (const schoolClass of classes) {
      if (students.some((student) => student.classId === schoolClass.id)) continue;
      const classCurrencies = new Set(
        fees
          .filter((fee) => fee.classId === schoolClass.id || (fee.classId === null && fee.studentId === null))
          .map((fee) => feeCurrency(fee))
      );
      if (classCurrencies.size === 0) classCurrencies.add(settings?.currency ?? 'USD');
      for (const currency of classCurrencies) getClassTotal(schoolClass, currency);
    }

    res.json({
      month,
      schoolYear: { id: schoolYear.id, name: schoolYear.name },
      summary: {
        studentCount: rows.length,
        studentsPaid: rows.filter((row) => row.status === 'paid').length,
        studentsAtLeastHalf: rows.filter((row) => row.status === 'half').length,
        studentsInDebt: rows.filter((row) => row.status === 'debt').length,
        studentsMissingFee: rows.filter((row) => row.status === 'missing-fee').length,
        totalsByCurrency: [...totals.values()],
      },
      classes: [...classTotals.values()].sort((left, right) => left.class.name.localeCompare(right.class.name)),
      rows,
    });
  })
);

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
    const rows = students.map((student) => {
      const index = feesBySchoolYear.get(student.schoolYearId);
      const applicableFees = index
        ? [...(index.byStudent.get(student.id) ?? []), ...(index.byClass.get(student.classId) ?? []), ...index.global]
        : [];
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
          code: student.class.code,
          name: student.class.name,
          section: student.class.section,
          orientation: student.class.orientation,
          capacity: student.class.capacity,
          status: student.class.status,
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
