import { Router } from 'express';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

const studentSchema = z.object({
  matricule: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().min(2).optional().nullable()),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  middleName: z.string().optional().nullable(),
  gender: z.string().min(1),
  birthDate: z.coerce.date(),
  status: z.string().default('active'),
  classId: z.string().min(1),
  schoolYearId: z.string().min(1),
});

async function generateStudentMatricule(schoolYearId: string) {
  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { name: true, startDate: true },
  });

  if (!schoolYear) throw new ApiError(404, 'Année scolaire introuvable.');

  const yearToken = schoolYear.name.match(/\d{4}/)?.[0] ?? String(schoolYear.startDate.getFullYear());
  const prefix = `ELV-${yearToken}-`;
  const lastStudent = await prisma.student.findFirst({
    where: { matricule: { startsWith: prefix } },
    orderBy: { matricule: 'desc' },
    select: { matricule: true },
  });
  const lastNumber = lastStudent?.matricule.match(/(\d+)$/)?.[1];
  const nextNumber = (lastNumber ? Number(lastNumber) : 0) + 1;

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

async function getStudentFinancialSituation(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { class: true, schoolYear: true },
  });

  if (!student) throw new ApiError(404, 'Élève introuvable.');

  const fees = await prisma.fee.findMany({
    where: {
      schoolYearId: student.schoolYearId,
      status: 'active',
      OR: [
        { studentId: student.id },
        { classId: student.classId, studentId: null },
        { classId: null, studentId: null },
      ],
    },
    include: {
      payments: {
        where: { studentId: student.id, status: 'confirmed' },
        orderBy: { paymentDate: 'desc' },
      },
      class: true,
      student: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const payments = await prisma.payment.findMany({
    where: { studentId: student.id },
    include: { fee: true, user: { select: { id: true, firstName: true, lastName: true, username: true } } },
    orderBy: { paymentDate: 'desc' },
  });

  const feeRows = fees.map((fee) => {
    const amountDue = Number(fee.amount);
    const amountPaid = fee.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: fee.id,
      name: fee.name,
      scope: fee.studentId ? 'Élève' : fee.classId ? 'Classe' : 'Global',
      dueDate: fee.dueDate,
      amountDue,
      amountPaid,
      balance: Math.max(amountDue - amountPaid, 0),
      currency: feeCurrency(fee),
      status: amountPaid >= amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
    };
  });

  const totalDue = feeRows.reduce((sum, fee) => sum + fee.amountDue, 0);
  const totalPaid = payments
    .filter((payment) => payment.status === 'confirmed' && fees.some((fee) => fee.id === payment.feeId))
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return {
    student: {
      id: student.id,
      matricule: student.matricule,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.class.name,
      schoolYear: student.schoolYear.name,
    },
    currency: feeRows[0]?.currency ?? 'USD',
    summary: {
      totalDue,
      totalPaid,
      balance: Math.max(totalDue - totalPaid, 0),
    },
    fees: feeRows,
    payments: payments.map((payment) => ({
      id: payment.id,
      feeId: payment.feeId,
      feeName: payment.fee.name,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMode: payment.paymentMode,
      reference: payment.reference,
      status: payment.status,
      cancelledAt: payment.cancelledAt,
      cancellationReason: payment.cancellationReason,
      userId: payment.userId,
      cashier: payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : null,
    })),
  };
}

router.get(
  '/',
  requirePermission('students:read'),
  asyncHandler(async (_req, res) => {
    const students = await prisma.student.findMany({
      include: {
        class: true,
        schoolYear: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(students);
  })
);

router.get(
  '/:id/financial-situation',
  requirePermission('balances:read'),
  asyncHandler(async (req, res) => {
    const situation = await getStudentFinancialSituation(req.params.id);
    res.json(situation);
  })
);

router.get(
  '/:id',
  requirePermission('students:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true, schoolYear: true },
    });
    if (!student) throw new ApiError(404, 'Élève introuvable.');
    res.json(student);
  })
);

router.use(requirePermission('students:manage'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = studentSchema.parse(req.body);
    const matricule = data.matricule?.trim() || (await generateStudentMatricule(data.schoolYearId));
    const student = await prisma.student.create({
      data: { ...data, matricule },
      include: { class: true, schoolYear: true },
    });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Élèves',
      entityType: 'Student',
      entityId: student.id,
      description: `Élève ${student.lastName} ${student.firstName} créé avec le matricule ${student.matricule}.`,
      metadata: { matricule: student.matricule, class: student.class.name, schoolYear: student.schoolYear.name },
    });
    res.status(201).json(student);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = studentSchema.partial().parse(req.body);
    const student = await prisma.student.update({
      where: { id },
      data: { ...data, matricule: data.matricule?.trim() || undefined },
      include: { class: true, schoolYear: true },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Élèves',
      entityType: 'Student',
      entityId: student.id,
      description: `Élève ${student.lastName} ${student.firstName} modifié.`,
      metadata: { matricule: student.matricule, class: student.class.name, schoolYear: student.schoolYear.name },
    });
    res.json(student);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const student = await prisma.student.delete({ where: { id } });
    await recordAudit(req, {
      action: 'DELETE',
      module: 'Élèves',
      entityType: 'Student',
      entityId: student.id,
      description: `Élève ${student.lastName} ${student.firstName} supprimé.`,
      metadata: { matricule: student.matricule },
    });
    res.status(204).send();
  })
);

export default router;
