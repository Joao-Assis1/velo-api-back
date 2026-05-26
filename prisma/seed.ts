import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando populamento de dados...');

  // 1. Limpar banco (ordem respeita FK constraints)
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.student.deleteMany();

  // 2. Criar Alunos
  const bcrypt = require('bcrypt');
  const defaultPassword = await bcrypt.hash('123456', 10);

  const student1 = await prisma.student.create({
    data: {
      name: 'Gabriel Silva',
      email: 'gabriel@email.com',
      phone: '(11) 98888-7777',
      cpf: '123.456.789-00',
      password: defaultPassword,
      ladvUploaded: true,
      profilePicture: 'https://ui-avatars.com/api/?name=Gabriel+Silva&background=3b82f6&color=fff&size=150',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      name: 'Maria Oliveira',
      email: 'maria@email.com',
      phone: '(11) 97777-6666',
      cpf: '987.654.321-11',
      password: defaultPassword,
      ladvUploaded: false,
    },
  });

  // 3. Criar Instrutor
  const instructor1 = await prisma.instructor.create({
    data: {
      name: 'Roberto Souza',
      email: 'roberto@email.com',
      phone: '(11) 91111-2222',
      password: defaultPassword,
      bio: 'Especialista em alunos com medo de dirigir. 15 anos de experiência.',
      instructorType: 'Autônomo',
      location: 'Centro, São Paulo',
      pricePerClass: 85.00,
      rating: 4.9,
      reviewsCount: 42,
      profilePicture: 'https://ui-avatars.com/api/?name=Roberto+Souza&background=10b981&color=fff&size=150',
      cpf: '12345678901',
      cnhNumber: '01234567890',
      cnhExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
      credentialStatus: 'APPROVED',
      credentialValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      stripeAccountId: '',
      stripeAccountStatus: 'ACTIVE',
      stripePayoutsEnabled: true,
      vehicles: {
        create: {
          model: 'Hyundai HB20',
          year: '2023',
          plate: 'ABC-1234',
          transmission: 'Manual',
          vehiclePhoto: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400',
        },
      },
      availabilities: {
        createMany: {
          data: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 4, startTime: '08:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', isEnabled: true },
          ],
        },
      },
    },
  });

  const vehicle1 = await prisma.vehicle.findFirst({ where: { instructorId: instructor1.id } });

  // 4. Criar Aulas
  await prisma.lesson.create({
    data: {
      studentId: student1.id,
      instructorId: instructor1.id,
      vehicleId: vehicle1?.id,
      date: new Date('2026-04-15'),
      startTime: '14:00',
      endTime: '15:00',
      price: 85.00,
      status: 'upcoming',
    },
  });

  await prisma.lesson.create({
    data: {
      studentId: student1.id,
      instructorId: instructor1.id,
      vehicleId: vehicle1?.id,
      date: new Date('2026-04-10'),
      startTime: '09:00',
      endTime: '10:00',
      price: 85.00,
      status: 'completed',
      checkInTime: new Date('2026-04-10T09:00:00Z'),
      checkOutTime: new Date('2026-04-10T10:00:00Z'),
      durationMinutes: 60,
      instructorFeedback: 'Excelente controle de embreagem hoje!',
      studentFeedbackRating: 5,
      studentFeedbackText: 'O instrutor Roberto é muito calmo.',
    },
  });

  // 5. PaymentMethod seed para Gabriel (aluno demo)
  await prisma.student.update({
    where: { id: student1.id },
    data: { stripeCustomerId: '' },
  });
  await prisma.paymentMethod.create({
    data: {
      studentId: student1.id,
      stripePaymentMethodId: '',
      brand: 'visa',
      last4: '4242',
      cardholderName: 'GABRIEL SILVA',
      expiryMonth: '12',
      expiryYear: '2030',
      isDefault: true,
    },
  });

  // ============================================================================
  // Journey Foundation seed — 1 aluno em cada stage
  // ============================================================================

  const journeyPassword = await bcrypt.hash('123456', 10);
  const futureDate = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pastDate = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // STAGE 1: REGISTERED
  await prisma.student.upsert({
    where: { email: 'student-registered@email.com' },
    update: {},
    create: {
      email: 'student-registered@email.com',
      name: 'Aluno Recém-Cadastrado',
      cpf: '11111111111',
      password: journeyPassword,
      journeyStage: 'REGISTERED',
    },
  });

  // STAGE 2: RENACH_PENDING (curso teórico iniciado, processo aberto mas não concluído)
  const renachStudent = await prisma.student.upsert({
    where: { email: 'student-renach@email.com' },
    update: {},
    create: {
      email: 'student-renach@email.com',
      name: 'Aluno Aguardando RENACH',
      cpf: '22222222222',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(3),
      journeyStage: 'RENACH_PENDING',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: renachStudent.id },
    update: {},
    create: {
      studentId: renachStudent.id,
      ufDetran: 'SP',
      status: 'PENDING',
    },
  });

  // STAGE 3: MEDICAL_PENDING (RENACH concluído)
  const medical = await prisma.student.upsert({
    where: { email: 'student-medical@email.com' },
    update: {},
    create: {
      email: 'student-medical@email.com',
      name: 'Aluno Aguardando Médico',
      cpf: '33333333333',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(5),
      journeyStage: 'MEDICAL_PENDING',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: medical.id },
    update: {},
    create: {
      studentId: medical.id,
      renachNumber: 'SP000000001',
      ufDetran: 'SP',
      biometryDoneAt: pastDate(2),
      status: 'DONE',
    },
  });

  // STAGE 3b: PSYCH_PENDING (RENACH DONE + MEDICAL APTO)
  const psych = await prisma.student.upsert({
    where: { email: 'student-psych@email.com' },
    update: {},
    create: {
      email: 'student-psych@email.com',
      name: 'Aluno Aguardando Psico',
      cpf: '66666666666',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(10),
      journeyStage: 'PSYCH_PENDING',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: psych.id },
    update: {},
    create: {
      studentId: psych.id,
      renachNumber: 'MS000000006',
      ufDetran: 'MS',
      biometryDoneAt: pastDate(7),
      status: 'DONE',
    },
  });
  await prisma.medicalExam.upsert({
    where: { studentId: psych.id },
    update: {},
    create: {
      studentId: psych.id,
      protocolCode: 'MED-2026-PSY1',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(5),
      validUntil: futureDate(360),
    },
  });

  // STAGE 3c: THEORY_EXAM_PENDING (RENACH DONE + MEDICAL APTO + PSYCH APTO)
  const theory = await prisma.student.upsert({
    where: { email: 'student-theory@email.com' },
    update: {},
    create: {
      email: 'student-theory@email.com',
      name: 'Aluno Aguardando Teórico Oficial',
      cpf: '77777777777',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(20),
      journeyStage: 'THEORY_EXAM_PENDING',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: theory.id },
    update: {},
    create: {
      studentId: theory.id,
      renachNumber: 'MS000000007',
      ufDetran: 'MS',
      biometryDoneAt: pastDate(15),
      status: 'DONE',
    },
  });
  await prisma.medicalExam.upsert({
    where: { studentId: theory.id },
    update: {},
    create: {
      studentId: theory.id,
      protocolCode: 'MED-2026-THE1',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(10),
      validUntil: futureDate(355),
    },
  });
  await prisma.psychologicalExam.upsert({
    where: { studentId: theory.id },
    update: {},
    create: {
      studentId: theory.id,
      protocolCode: 'PSY-2026-THE1',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(8),
      validUntil: futureDate(357),
    },
  });

  // STAGE 3d: AWAITING_LADV_UPLOAD (todos os anteriores + theory exam passed)
  const awaitLadv = await prisma.student.upsert({
    where: { email: 'student-awaiting-ladv@email.com' },
    update: {},
    create: {
      email: 'student-awaiting-ladv@email.com',
      name: 'Aluno Aguardando Upload LADV',
      cpf: '88888888888',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(30),
      journeyStage: 'AWAITING_LADV_UPLOAD',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: awaitLadv.id },
    update: {},
    create: {
      studentId: awaitLadv.id,
      renachNumber: 'MS000000008',
      ufDetran: 'MS',
      biometryDoneAt: pastDate(25),
      status: 'DONE',
    },
  });
  await prisma.medicalExam.upsert({
    where: { studentId: awaitLadv.id },
    update: {},
    create: {
      studentId: awaitLadv.id,
      protocolCode: 'MED-2026-AWL1',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(18),
      validUntil: futureDate(350),
    },
  });
  await prisma.psychologicalExam.upsert({
    where: { studentId: awaitLadv.id },
    update: {},
    create: {
      studentId: awaitLadv.id,
      protocolCode: 'PSY-2026-AWL1',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(16),
      validUntil: futureDate(352),
    },
  });
  await prisma.officialTheoryExam.upsert({
    where: { studentId: awaitLadv.id },
    update: {},
    create: {
      studentId: awaitLadv.id,
      takenAt: pastDate(5),
      passed: true,
      score: 27,
    },
  });

  // STAGE 4: LADV_UPLOADED_VALID (todas as etapas anteriores OK)
  const ladv = await prisma.student.upsert({
    where: { email: 'student-ladv@email.com' },
    update: { ladvUploaded: true },
    create: {
      email: 'student-ladv@email.com',
      name: 'Aluno Com LADV Válida',
      cpf: '44444444444',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(40),
      ladvNumber: 'LADV-SP-12345',
      ladvIssuedAt: pastDate(5),
      ladvValidUntil: futureDate(360),
      ladvOcrStatus: 'PASS',
      ladvOcrConfidence: 0.92,
      ladvUploaded: true,
      journeyStage: 'LADV_UPLOADED_VALID',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: ladv.id },
    update: {},
    create: {
      studentId: ladv.id,
      renachNumber: 'SP000000002',
      ufDetran: 'SP',
      biometryDoneAt: pastDate(30),
      status: 'DONE',
    },
  });
  await prisma.medicalExam.upsert({
    where: { studentId: ladv.id },
    update: {},
    create: {
      studentId: ladv.id,
      protocolCode: 'MED-2026-001',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(20),
      validUntil: futureDate(345),
    },
  });
  await prisma.psychologicalExam.upsert({
    where: { studentId: ladv.id },
    update: {},
    create: {
      studentId: ladv.id,
      protocolCode: 'PSY-2026-001',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(18),
      validUntil: futureDate(347),
    },
  });
  await prisma.officialTheoryExam.upsert({
    where: { studentId: ladv.id },
    update: {},
    create: {
      studentId: ladv.id,
      takenAt: pastDate(10),
      passed: true,
      score: 26,
    },
  });

  // STAGE 5: PRACTICAL_IN_PROGRESS (LADV válida + dados de exames)
  const practical = await prisma.student.upsert({
    where: { email: 'student-practical@email.com' },
    update: { ladvUploaded: true },
    create: {
      email: 'student-practical@email.com',
      name: 'Aluno Em Aulas Práticas',
      cpf: '55555555555',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(60),
      ladvNumber: 'LADV-SP-67890',
      ladvIssuedAt: pastDate(25),
      ladvValidUntil: futureDate(340),
      ladvOcrStatus: 'PASS',
      ladvOcrConfidence: 0.95,
      ladvUploaded: true,
      journeyStage: 'PRACTICAL_IN_PROGRESS',
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: practical.id },
    update: {},
    create: {
      studentId: practical.id,
      renachNumber: 'SP000000003',
      ufDetran: 'SP',
      biometryDoneAt: pastDate(50),
      status: 'DONE',
    },
  });
  await prisma.medicalExam.upsert({
    where: { studentId: practical.id },
    update: {},
    create: {
      studentId: practical.id,
      protocolCode: 'MED-2026-002',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(40),
      validUntil: futureDate(325),
    },
  });
  await prisma.psychologicalExam.upsert({
    where: { studentId: practical.id },
    update: {},
    create: {
      studentId: practical.id,
      protocolCode: 'PSY-2026-002',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(38),
      validUntil: futureDate(327),
    },
  });
  await prisma.officialTheoryExam.upsert({
    where: { studentId: practical.id },
    update: {},
    create: {
      studentId: practical.id,
      takenAt: pastDate(30),
      passed: true,
      score: 28,
    },
  });

  // ============================================================================
  // STAGE 5: READY_FOR_PRACTICAL_EXAM — todos os anteriores + 2 lessons válidas
  // ============================================================================

  const ready = await prisma.student.upsert({
    where: { email: 'student-ready@email.com' },
    update: { ladvUploaded: true },
    create: {
      email: 'student-ready@email.com',
      name: 'Aluno Pronto para Exame Prático',
      cpf: '99999999999',
      password: journeyPassword,
      theoryCourseStartedAt: pastDate(60),
      ladvNumber: 'LADV-MS-READY1',
      ladvIssuedAt: pastDate(40),
      ladvValidUntil: futureDate(300),
      ladvOcrStatus: 'PASS',
      ladvOcrConfidence: 0.94,
      ladvUploaded: true,
      readyForPracticalExamAt: pastDate(1),
      journeyStage: 'READY_FOR_PRACTICAL_EXAM',
    },
  });

  await prisma.renachProcess.upsert({
    where: { studentId: ready.id },
    update: {},
    create: {
      studentId: ready.id,
      renachNumber: 'MS000000009',
      ufDetran: 'MS',
      biometryDoneAt: pastDate(55),
      status: 'DONE',
    },
  });
  await prisma.medicalExam.upsert({
    where: { studentId: ready.id },
    update: {},
    create: {
      studentId: ready.id,
      protocolCode: 'MED-2026-READY',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(45),
      validUntil: futureDate(320),
    },
  });
  await prisma.psychologicalExam.upsert({
    where: { studentId: ready.id },
    update: {},
    create: {
      studentId: ready.id,
      protocolCode: 'PSY-2026-READY',
      result: 'APTO',
      status: 'RESULT_UPLOADED',
      performedAt: pastDate(43),
      validUntil: futureDate(322),
    },
  });
  await prisma.officialTheoryExam.upsert({
    where: { studentId: ready.id },
    update: {},
    create: {
      studentId: ready.id,
      takenAt: pastDate(30),
      passed: true,
      score: 29,
    },
  });

  // 2 valid lessons (≥50 min, biometry SUCCESS x3, integrityHash, disputeOpened=false)
  const lessonsPayload = [
    { date: pastDate(15), durationMinutes: 60, seq: 1 },
    { date: pastDate(7), durationMinutes: 65, seq: 2 },
  ];
  for (const l of lessonsPayload) {
    const existing = await prisma.lesson.findFirst({
      where: { studentId: ready.id, instructorId: instructor1.id, date: l.date },
    });
    if (!existing) {
      await prisma.lesson.create({
        data: {
          studentId: ready.id,
          instructorId: instructor1.id,
          date: l.date,
          startTime: '10:00',
          endTime: '11:05',
          durationMinutes: l.durationMinutes,
          status: 'completed',
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: `ready-seed-hash-${l.seq}`,
          disputeOpened: false,
        },
      });
    }
  }

  // Instrutor com credencial EXPIRED (para e2e do gate)
  await prisma.instructor.upsert({
    where: { email: 'expired-instructor@email.com' },
    update: {},
    create: {
      email: 'expired-instructor@email.com',
      name: 'Carlos Credencial Vencida',
      cpf: '55555555500',
      password: await bcrypt.hash('123456', 10),
      cnhNumber: '11122233344',
      cnhExpiry: futureDate(365).toISOString(),
      credentialStatus: 'EXPIRED',
      credentialValidUntil: pastDate(10),
    },
  });

  // ============================================================================
  // Clinics seed — 6 clínicas (3 MEDICAL + 3 PSYCHOLOGICAL) em Campo Grande/MS
  // ============================================================================

  const clinicsData: Array<{
    name: string;
    type: 'MEDICAL' | 'PSYCHOLOGICAL';
    city: string;
    uf: string;
    address: string;
    phone: string | null;
    price: number;
  }> = [
      {
        name: 'Clínica Centro Médico Campo Grande',
        type: 'MEDICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Rua Maracaju, 1500 - Centro',
        phone: '(67) 3321-1000',
        price: 220,
      },
      {
        name: 'Clínica Vila Sobrinho',
        type: 'MEDICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Av. Mato Grosso, 2000 - Vila Sobrinho',
        phone: '(67) 3321-2000',
        price: 200,
      },
      {
        name: 'Clínica Jardim dos Estados',
        type: 'MEDICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Rua Antônio Maria Coelho, 800 - Jardim dos Estados',
        phone: '(67) 3321-3000',
        price: 240,
      },
      {
        name: 'Psico Centro Campo Grande',
        type: 'PSYCHOLOGICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Rua 14 de Julho, 1200 - Centro',
        phone: '(67) 3321-1500',
        price: 170,
      },
      {
        name: 'Psico Tiradentes Avaliações',
        type: 'PSYCHOLOGICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Av. Bandeirantes, 350 - Tiradentes',
        phone: '(67) 3321-1800',
        price: 160,
      },
      {
        name: 'Psico Bairro Amambai',
        type: 'PSYCHOLOGICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Rua Pernambuco, 450 - Amambai',
        phone: '(67) 3321-1900',
        price: 165,
      },
    ];

  for (const c of clinicsData) {
    const existing = await prisma.clinic.findFirst({
      where: { name: c.name, city: c.city, uf: c.uf },
    });
    if (existing) {
      await prisma.clinic.update({
        where: { id: existing.id },
        data: { ...c, isActive: true },
      });
    } else {
      await prisma.clinic.create({ data: { ...c, isActive: true } });
    }
  }

  // ============================================================================
  // Payment scenarios seed — student-practical + novos instrutores
  // ============================================================================

  // Stripe para student-practical
  await prisma.student.update({
    where: { id: practical.id },
    data: { stripeCustomerId: '' },
  });
  const pmPractical = await prisma.paymentMethod.upsert({
    where: { stripePaymentMethodId: '' },
    update: {},
    create: {
      studentId: practical.id,
      stripePaymentMethodId: '',
      brand: 'mastercard',
      last4: '5555',
      cardholderName: 'ALUNO PRATICO',
      expiryMonth: '08',
      expiryYear: '2029',
      isDefault: true,
    },
  });

  // Instrutor sem Stripe (APPROVED, CNH válida, veículo, disponibilidade)
  const instructorNoStripe = await prisma.instructor.upsert({
    where: { email: 'instructor-no-stripe@email.com' },
    update: {},
    create: {
      email: 'instructor-no-stripe@email.com',
      name: 'Ana Lima Sem Stripe',
      cpf: '98765432100',
      phone: '(11) 92222-3333',
      password: defaultPassword,
      bio: 'Instrutora experiente, ainda não conectada ao Stripe.',
      instructorType: 'Autônomo',
      location: 'Vila Mariana, São Paulo',
      pricePerClass: 90.00,
      rating: 4.7,
      reviewsCount: 18,
      profilePicture: 'https://ui-avatars.com/api/?name=Ana+Lima&background=f59e0b&color=fff&size=150',
      cnhNumber: '98765432109',
      cnhExpiry: futureDate(400).toISOString(),
      credentialStatus: 'APPROVED',
      credentialValidUntil: futureDate(400),
      vehicles: {
        create: {
          model: 'Volkswagen Polo',
          year: '2022',
          plate: 'DEF-5678',
          transmission: 'Manual',
        },
      },
      availabilities: {
        createMany: {
          data: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', isEnabled: true },
            { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', isEnabled: true },
            { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', isEnabled: true },
            { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', isEnabled: true },
            { dayOfWeek: 5, startTime: '08:00', endTime: '17:00', isEnabled: true },
          ],
        },
      },
    },
  });

  // Instrutor com Stripe PENDING (APPROVED, CNH válida, veículo, disponibilidade)
  const instructorStripePending = await prisma.instructor.upsert({
    where: { email: 'instructor-stripe-pending@email.com' },
    update: {},
    create: {
      email: 'instructor-stripe-pending@email.com',
      name: 'Bruno Costa Stripe Pendente',
      cpf: '12345678910',
      phone: '(11) 93333-4444',
      password: defaultPassword,
      bio: 'Instrutor com onboarding Stripe em andamento.',
      instructorType: 'Credenciado',
      location: 'Pinheiros, São Paulo',
      pricePerClass: 95.00,
      rating: 4.8,
      reviewsCount: 25,
      profilePicture: 'https://ui-avatars.com/api/?name=Bruno+Costa&background=8b5cf6&color=fff&size=150',
      cnhNumber: '12345678900',
      cnhExpiry: futureDate(400).toISOString(),
      credentialStatus: 'APPROVED',
      credentialValidUntil: futureDate(400),
      stripeAccountId: '',
      stripeAccountStatus: 'PENDING',
      stripePayoutsEnabled: false,
      vehicles: {
        create: {
          model: 'Chevrolet Onix',
          year: '2023',
          plate: 'GHI-9012',
          transmission: 'Automático',
        },
      },
      availabilities: {
        createMany: {
          data: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isEnabled: true },
            { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isEnabled: true },
          ],
        },
      },
    },
  });

  void instructorNoStripe;
  void instructorStripePending;

  // 3 aulas de student-practical com Roberto para os cenários de pagamento
  const lessonHeld = await prisma.lesson.upsert({
    where: { id: 'seed-lesson-held-001' },
    update: {},
    create: {
      id: 'seed-lesson-held-001',
      studentId: practical.id,
      instructorId: instructor1.id,
      vehicleId: vehicle1?.id,
      date: futureDate(5),
      startTime: '14:00',
      endTime: '15:00',
      price: 85.00,
      status: 'upcoming',
    },
  });

  const lessonReleased = await prisma.lesson.upsert({
    where: { id: 'seed-lesson-released-001' },
    update: {},
    create: {
      id: 'seed-lesson-released-001',
      studentId: practical.id,
      instructorId: instructor1.id,
      vehicleId: vehicle1?.id,
      date: pastDate(10),
      startTime: '10:00',
      endTime: '11:05',
      price: 85.00,
      status: 'completed',
      durationMinutes: 65,
      checkInTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      checkOutTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 65 * 60 * 1000),
      biometryStartStatus: 'SUCCESS',
      biometryMidStatus: 'SUCCESS',
      biometryEndStatus: 'SUCCESS',
      integrityHash: 'seed-integrity-hash-released-001',
      disputeOpened: false,
    },
  });

  const lessonRefunded = await prisma.lesson.upsert({
    where: { id: 'seed-lesson-refunded-001' },
    update: {},
    create: {
      id: 'seed-lesson-refunded-001',
      studentId: practical.id,
      instructorId: instructor1.id,
      vehicleId: vehicle1?.id,
      date: pastDate(20),
      startTime: '08:00',
      endTime: '09:00',
      price: 85.00,
      status: 'completed',
      durationMinutes: 60,
      checkInTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      checkOutTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      biometryStartStatus: 'SUCCESS',
      biometryMidStatus: 'SUCCESS',
      biometryEndStatus: 'SUCCESS',
      integrityHash: 'seed-integrity-hash-refunded-001',
      disputeOpened: false,
    },
  });

  // Pagamentos
  await prisma.payment.upsert({
    where: { stripePaymentIntentId: '' },
    update: {},
    create: {
      studentId: practical.id,
      lessonId: lessonHeld.id,
      paymentMethodId: pmPractical.id,
      amount: 85.00,
      status: 'HELD',
      stripePaymentIntentId: '',
    },
  });

  await prisma.payment.upsert({
    where: { stripePaymentIntentId: '' },
    update: {},
    create: {
      studentId: practical.id,
      lessonId: lessonReleased.id,
      paymentMethodId: pmPractical.id,
      amount: 85.00,
      status: 'RELEASED',
      stripePaymentIntentId: '',
      stripeTransferId: '',
      platformFeeAmount: 17.00,
      instructorAmount: 68.00,
    },
  });

  await prisma.payment.upsert({
    where: { stripePaymentIntentId: '' },
    update: {},
    create: {
      studentId: practical.id,
      lessonId: lessonRefunded.id,
      paymentMethodId: pmPractical.id,
      amount: 85.00,
      status: 'REFUNDED',
      stripePaymentIntentId: '',
      stripeRefundId: '',
    },
  });

  console.log('✅ Populamento concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
