import { Router } from 'express';
import { z } from 'zod';
import type { Fee } from '@prisma/client';
import { recordAudit } from '../lib/audit.js';
import { classLabel } from '../lib/classLabel.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

const paymentSchema = z.object({
  studentId: z.string().min(1),
  feeId: z.string().min(1),
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date().optional(),
  paymentMode: z.enum(['Espèces', 'Mobile Money', 'Virement', 'Banque', 'Autre']),
  reference: z.string().optional().nullable(),
});
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

async function nextReceiptNumber() {
  const settings = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
  const prefix = settings?.receiptPrefix ?? 'REC';
  const lastPayment = await prisma.payment.findFirst({
    where: { receiptNumber: { startsWith: `${prefix}-` } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });
  const lastNumber = lastPayment?.receiptNumber?.match(/(\d+)$/)?.[1];
  const nextNumber = (lastNumber ? Number(lastNumber) : 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
}

async function ensureReceiptNumber(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(404, 'Paiement introuvable.');
  if (payment.receiptNumber) return payment.receiptNumber;

  const receiptNumber = await nextReceiptNumber();
  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { receiptNumber },
    select: { receiptNumber: true },
  });
  return updated.receiptNumber ?? receiptNumber;
}

async function ensureFeeAppliesToStudent(studentId: string, fee: Fee) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new ApiError(404, 'Élève introuvable.');

  if (fee.schoolYearId !== student.schoolYearId) {
    throw new ApiError(400, 'Ce frais ne correspond pas à l’année scolaire de cet élève.');
  }

  if (fee.studentId && fee.studentId !== student.id) {
    throw new ApiError(400, 'Ce frais est assigné à un autre élève.');
  }

  if (fee.classId && fee.classId !== student.classId) {
    throw new ApiError(400, 'Ce frais ne correspond pas à la classe de cet élève.');
  }
}

router.use(requireAuth);

router.get(
  '/',
  requirePermission('payments:read'),
  asyncHandler(async (_req, res) => {
    const payments = await prisma.payment.findMany({
      include: { student: true, fee: true, user: { select: { id: true, firstName: true, lastName: true, username: true } } },
      orderBy: { paymentDate: 'desc' },
    });
    res.json(payments);
  })
);

router.get(
  '/:id/receipt',
  requirePermission('receipts:read'),
  asyncHandler(async (req, res) => {
    const receiptNumber = await ensureReceiptNumber(req.params.id);
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { class: true, schoolYear: true } },
        fee: true,
        user: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
    });
    if (!payment) throw new ApiError(404, 'Paiement introuvable.');

    const settings = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
    const paidAggregate = await prisma.payment.aggregate({
      where: { studentId: payment.studentId, feeId: payment.feeId, status: 'confirmed' },
      _sum: { amount: true },
    });
    const totalPaid = Number(paidAggregate._sum.amount ?? 0);
    const feeAmount = Number(payment.fee.amount);

    res.json({
      institution: settings,
      receipt: {
        number: receiptNumber,
        status: payment.status,
        date: payment.paymentDate,
      },
      student: {
        id: payment.student.id,
        matricule: payment.student.matricule,
        firstName: payment.student.firstName,
        lastName: payment.student.lastName,
        className: classLabel(payment.student.class),
        schoolYear: payment.student.schoolYear.name,
      },
      fee: {
        id: payment.fee.id,
        name: payment.fee.name,
        amount: feeAmount,
        currency: feeCurrency(payment.fee),
      },
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        mode: payment.paymentMode,
        reference: payment.reference,
        cashier: payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : null,
      },
      totals: {
        paidForFee: totalPaid,
        remainingForFee: Math.max(feeAmount - totalPaid, 0),
      },
      currency: feeCurrency(payment.fee),
    });
  })
);

router.get(
  '/:id',
  requirePermission('payments:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { student: true, fee: true, user: { select: { id: true, firstName: true, lastName: true, username: true } } },
    });
    if (!payment) throw new ApiError(404, 'Paiement introuvable.');
    res.json(payment);
  })
);

router.post(
  '/',
  requirePermission('payments:create'),
  asyncHandler(async (req, res) => {
    const data = paymentSchema.parse(req.body);

    const fee = await prisma.fee.findUnique({ where: { id: data.feeId } });
    if (!fee) {
      return res.status(404).json({ message: 'Frais introuvable.' });
    }
    await ensureFeeAppliesToStudent(data.studentId, fee);

    const existingPayments = await prisma.payment.aggregate({
      where: { feeId: data.feeId, studentId: data.studentId, status: 'confirmed' },
      _sum: { amount: true },
    });

    const totalPaid = existingPayments._sum.amount ? Number(existingPayments._sum.amount) : 0;
    const remaining = Number(fee.amount) - totalPaid;

    if (Number(data.amount) > remaining) {
      return res.status(400).json({
        message: `Le montant du paiement dépasse le solde restant (${remaining.toFixed(2)}).`,
      });
    }

    const payment = await prisma.payment.create({
      data: {
        studentId: data.studentId,
        feeId: data.feeId,
        amount: data.amount,
        paymentDate: data.paymentDate ?? new Date(),
        paymentMode: data.paymentMode,
        reference: data.reference ?? null,
        receiptNumber: await nextReceiptNumber(),
        userId: req.user?.id ?? null,
      },
      include: { student: true, fee: true },
    });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Paiements',
      entityType: 'Payment',
      entityId: payment.id,
      description: `Paiement de ${Number(payment.amount).toFixed(2)} enregistré pour ${payment.student.lastName} ${payment.student.firstName}.`,
      metadata: { amount: Number(payment.amount), currency: feeCurrency(payment.fee), fee: payment.fee.name, receiptNumber: payment.receiptNumber },
    });

    res.status(201).json(payment);
  })
);

router.put(
  '/:id',
  requirePermission('payments:update'),
  asyncHandler(async (req, res) => {
    const current = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Paiement introuvable.' });
    if (current.status === 'cancelled') throw new ApiError(400, 'Un paiement annulé ne peut pas être modifié.');

    const data = paymentSchema.partial().parse(req.body);
    const studentId = data.studentId ?? current.studentId;
    const feeId = data.feeId ?? current.feeId;
    const fee = await prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) return res.status(404).json({ message: 'Frais introuvable.' });
    await ensureFeeAppliesToStudent(studentId, fee);

    const existingPayments = await prisma.payment.aggregate({
      where: { feeId, studentId, id: { not: current.id }, status: 'confirmed' },
      _sum: { amount: true },
    });
    const totalPaid = existingPayments._sum.amount ? Number(existingPayments._sum.amount) : 0;
    const amount = data.amount ?? Number(current.amount);
    if (amount > Number(fee.amount) - totalPaid) {
      return res.status(400).json({ message: 'Le montant dépasse le solde restant.' });
    }

    const payment = await prisma.payment.update({
      where: { id: current.id },
      data: { ...data, amount, studentId, feeId, paymentDate: data.paymentDate ?? undefined },
      include: { student: true, fee: true, user: { select: { id: true, firstName: true, lastName: true, username: true } } },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Paiements',
      entityType: 'Payment',
      entityId: payment.id,
      description: `Paiement modifié pour ${payment.student.lastName} ${payment.student.firstName}.`,
      metadata: { amount: Number(payment.amount), currency: feeCurrency(payment.fee), fee: payment.fee.name, receiptNumber: payment.receiptNumber },
    });
    res.json(payment);
  })
);

router.delete(
  '/:id',
  requirePermission('payments:cancel'),
  asyncHandler(async (req, res) => {
    const current = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!current) throw new ApiError(404, 'Paiement introuvable.');
    if (current.status === 'cancelled') throw new ApiError(400, 'Ce paiement est déjà annulé.');

    const payment = await prisma.payment.update({
      where: { id: current.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Annulé depuis l’interface.',
      },
      include: { student: true, fee: true, user: { select: { id: true, firstName: true, lastName: true, username: true } } },
    });
    await recordAudit(req, {
      action: 'CANCEL',
      module: 'Paiements',
      entityType: 'Payment',
      entityId: payment.id,
      description: `Paiement annulé pour ${payment.student.lastName} ${payment.student.firstName}.`,
      metadata: { amount: Number(payment.amount), currency: feeCurrency(payment.fee), fee: payment.fee.name, receiptNumber: payment.receiptNumber },
    });
    res.json(payment);
  })
);

export default router;
