import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('caissier123', 10);

  const defaultYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
  });

  const schoolYear =
    defaultYear ??
    (await prisma.schoolYear.create({
      data: {
        name: '2025-2026',
        startDate: new Date('2025-09-01T00:00:00.000Z'),
        endDate: new Date('2026-07-31T00:00:00.000Z'),
        isActive: true,
      },
    }));

  const schoolClass = await prisma.class.findFirst({
    where: {
      schoolYearId: schoolYear.id,
      name: '6e Primaire',
    },
  });

  const existingClass =
    schoolClass ??
    (await prisma.class.create({
      data: {
        name: '6e Primaire',
        level: 'Primaire',
        schoolYearId: schoolYear.id,
      },
    }));

  const adminUser = await prisma.user.upsert({
    where: { email: 'monemail@exemple.com' },
    update: { password: adminPassword, username: 'admin' },
    create: {
      username: 'admin',
      email: 'monemail@exemple.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: Role.ADMIN,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'caissier@exemple.com' },
    update: { password: cashierPassword, username: 'caissier' },
    create: {
      username: 'caissier',
      email: 'caissier@exemple.com',
      password: cashierPassword,
      firstName: 'Caissier',
      lastName: '',
      role: Role.CAISSIER,
    },
  });

  await prisma.institutionSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Ecole na biso',
      legalName: 'EP na biso',
      city: 'Ville',
      country: 'RDC',
      currency: 'CDF',
      receiptPrefix: 'RECU - ',
      primaryColor: '#3b82f6',
    },
  });

  const student = await prisma.student.upsert({
    where: { matricule: 'ELV-001' },
    update: {},
    create: {
      matricule: 'ELV-001',
      firstName: 'Jean',
      lastName: 'Kakule',
      middleName: 'Mwanza',
      gender: 'M',
      birthDate: new Date('2014-05-14T00:00:00.000Z'),
      status: 'active',
      classId: existingClass.id,
      schoolYearId: schoolYear.id,
    },
  });

  const fee = await prisma.fee.upsert({
    where: {
      id: 'seed-minerval-fee',
    },
    update: {},
    create: {
      id: 'seed-minerval-fee',
      name: 'Minerval',
      amount: 500,
      dueDate: new Date('2025-10-15T00:00:00.000Z'),
      status: 'active',
      schoolYearId: schoolYear.id,
      classId: existingClass.id,
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        studentId: student.id,
        feeId: fee.id,
        amount: 200,
        paymentDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        paymentMode: 'Espèces',
        reference: 'PAY-001',
        userId: adminUser.id,
      },
      {
        studentId: student.id,
        feeId: fee.id,
        amount: 150,
        paymentDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        paymentMode: 'Mobile Money',
        reference: 'PAY-002',
        userId: cashierUser.id,
      },
    ],
  });

  console.log('Seeded school year, class, student, fee, and sample payments.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
