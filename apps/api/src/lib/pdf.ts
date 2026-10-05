import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export type PdfInstitution = {
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string | null;
  receiptPrefix?: string | null;
};

export const money = (value: number, currency = 'USD') => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;

export function startPdf(res: Response, filename: string, options: PDFKit.PDFDocumentOptions = {}) {
  const document = new PDFDocument({ margin: 42, info: { Title: filename }, ...options });
  res.status(200).setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  document.pipe(res);
  return document;
}

export function institutionHeader(document: PDFKit.PDFDocument, institution: PdfInstitution, title: string, subtitle?: string) {
  document.fontSize(16).font('Helvetica-Bold').text(institution.name, { align: 'center' });
  if (institution.legalName) document.fontSize(9).font('Helvetica').text(institution.legalName, { align: 'center' });
  const contact = [institution.address, institution.city, institution.country, institution.phone, institution.email].filter(Boolean).join(' · ');
  if (contact) document.fontSize(8).text(contact, { align: 'center' });
  document.moveDown(0.7).fontSize(13).font('Helvetica-Bold').text(title, { align: 'center' });
  if (subtitle) document.fontSize(9).font('Helvetica').text(subtitle, { align: 'center' });
  document.moveDown(1);
}

export function footer(document: PDFKit.PDFDocument) {
  document.fontSize(8).font('Helvetica').fillColor('#666').text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, 42, document.page.height - 34, { align: 'center', width: document.page.width - 84 });
  document.fillColor('#000');
}

export function labelValue(document: PDFKit.PDFDocument, label: string, value: string) {
  document.font('Helvetica-Bold').fontSize(9).text(`${label} : `, { continued: true }).font('Helvetica').text(value);
}
