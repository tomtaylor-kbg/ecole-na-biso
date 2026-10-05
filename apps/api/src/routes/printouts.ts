import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { footer, institutionHeader, labelValue, money, startPdf } from '../lib/pdf.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const reportQuery = z.object({
  period: z.enum(['day', 'month']).default('month'),
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).optional(),
  schoolYearId: z.string().optional(),
  classId: z.string().optional(),
});

function bounds(period: 'day' | 'month', value: string) {
  const start = new Date(`${value}${period === 'day' ? 'T00:00:00.000Z' : '-01T00:00:00.000Z'}`);
  const end = new Date(start);
  if (period === 'day') end.setUTCDate(end.getUTCDate() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  if (Number.isNaN(start.getTime())) throw new ApiError(400, 'Période invalide.');
  return { start, end };
}

router.get('/financial-report.pdf', requirePermission('balances:read'), asyncHandler(async (req, res) => {
  const query = reportQuery.parse(req.query);
  const now = new Date();
  const date = query.date ?? (query.period === 'day' ? now.toISOString().slice(0, 10) : now.toISOString().slice(0, 7));
  const { start, end } = bounds(query.period, date);
  const [settings, payments] = await Promise.all([
    prisma.institutionSettings.findUnique({ where: { id: 'default' } }),
    prisma.payment.findMany({
      where: {
        status: 'confirmed', paymentDate: { gte: start, lt: end },
        ...((query.schoolYearId || query.classId) ? { student: { ...(query.schoolYearId ? { schoolYearId: query.schoolYearId } : {}), ...(query.classId ? { classId: query.classId } : {}) } } : {}),
      },
      include: { fee: { select: { currency: true } }, student: { select: { firstName: true, lastName: true, class: { select: { name: true, code: true } } } } },
      orderBy: { paymentDate: 'asc' },
    }),
  ]);
  const institution = settings ?? { name: 'Établissement scolaire' };
  const grouped = new Map<string, number>();
  for (const payment of payments) {
    const currency = payment.fee.currency ?? 'USD';
    grouped.set(currency, (grouped.get(currency) ?? 0) + Number(payment.amount));
  }
  const document = startPdf(res, `rapport-financier-${date}.pdf`);
  institutionHeader(document, institution, `Rapport financier ${query.period === 'day' ? 'journalier' : 'mensuel'}`, `Période : ${date}`);
  labelValue(document, 'Nombre d’encaissements', String(payments.length));
  document.moveDown(0.4).font('Helvetica-Bold').text('Totaux par devise');
  for (const [currency, total] of grouped) document.font('Helvetica').text(`• ${money(total, currency)}`);
  document.moveDown(0.8).font('Helvetica-Bold').text('Détail des encaissements');
  for (const payment of payments) {
    const student = `${payment.student.lastName} ${payment.student.firstName}`;
    const schoolClass = `${payment.student.class.code} · ${payment.student.class.name}`;
    document.font('Helvetica').fontSize(9).text(`${payment.paymentDate.toLocaleDateString('fr-FR')}  |  ${student}  |  ${schoolClass}  |  ${payment.paymentMode}  |  ${money(Number(payment.amount), payment.fee.currency ?? 'USD')}`);
  }
  footer(document);
  document.end();
}));

router.get('/payments/:id/receipt.pdf', requirePermission('receipts:read'), asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { fee: true, student: { include: { class: true, schoolYear: true } }, user: { select: { firstName: true, lastName: true } } } });
  if (!payment) throw new ApiError(404, 'Paiement introuvable.');
  const settings = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
  const totalPaid = await prisma.payment.aggregate({ where: { studentId: payment.studentId, feeId: payment.feeId, status: 'confirmed' }, _sum: { amount: true } });
  const currency = payment.fee.currency ?? 'USD';
  const document = startPdf(res, `recu-${payment.receiptNumber ?? payment.id}.pdf`, { size: [226.77, 520], margin: 22 });
  institutionHeader(document, settings ?? { name: 'Établissement scolaire' }, 'REÇU DE PAIEMENT', payment.receiptNumber ?? '');
  labelValue(document, 'Date', payment.paymentDate.toLocaleString('fr-FR'));
  labelValue(document, 'Élève', `${payment.student.lastName} ${payment.student.firstName}`);
  labelValue(document, 'Classe', `${payment.student.class.code} · ${payment.student.class.name}`);
  labelValue(document, 'Matricule', payment.student.matricule);
  labelValue(document, 'Désignation', payment.fee.name);
  labelValue(document, 'Mode', payment.paymentMode);
  document.moveDown(0.8).fontSize(16).font('Helvetica-Bold').text(money(Number(payment.amount), currency), { align: 'center' });
  document.fontSize(9).font('Helvetica').text(`Total payé pour ce frais : ${money(Number(totalPaid._sum.amount ?? 0), currency)}`, { align: 'center' });
  document.moveDown(1).fontSize(8).text('Merci pour votre paiement.', { align: 'center' });
  footer(document);
  document.end();
}));

router.get('/students/:id/profile.pdf', requirePermission('students:read'), asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.id }, include: { class: true, schoolYear: true, fees: true, payments: { where: { status: 'confirmed' }, orderBy: { paymentDate: 'desc' } } } });
  if (!student) throw new ApiError(404, 'Élève introuvable.');
  const settings = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
  const document = startPdf(res, `fiche-eleve-${student.matricule}.pdf`);
  institutionHeader(document, settings ?? { name: 'Établissement scolaire' }, 'FICHE ÉLÈVE', student.schoolYear.name);
  labelValue(document, 'Matricule', student.matricule);
  labelValue(document, 'Nom complet', `${student.lastName} ${student.firstName}`);
  labelValue(document, 'Genre', student.gender);
  labelValue(document, 'Date de naissance', student.birthDate.toLocaleDateString('fr-FR'));
  labelValue(document, 'Classe', `${student.class.code} · ${student.class.name}`);
  document.moveDown(0.8).font('Helvetica-Bold').text('Situation financière');
  const paid = student.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const due = student.fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  labelValue(document, 'Total dû', money(due, student.fees[0]?.currency ?? settings?.currency ?? 'USD'));
  labelValue(document, 'Total payé', money(paid, student.fees[0]?.currency ?? settings?.currency ?? 'USD'));
  labelValue(document, 'Solde', money(Math.max(due - paid, 0), student.fees[0]?.currency ?? settings?.currency ?? 'USD'));
  document.moveDown(0.8).font('Helvetica-Bold').text('Derniers paiements');
  for (const payment of student.payments.slice(0, 12)) document.font('Helvetica').fontSize(9).text(`${payment.paymentDate.toLocaleDateString('fr-FR')} · ${money(Number(payment.amount), student.fees[0]?.currency ?? settings?.currency ?? 'USD')} · ${payment.paymentMode}`);
  footer(document);
  document.end();
}));

export default router;
