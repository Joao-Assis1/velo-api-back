import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import Stripe from 'stripe';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PASSWORD = 'demo123456';
const HASH = bcrypt.hashSync(PASSWORD, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureStripeCustomer(studentId: string, email: string, name: string): Promise<string> {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { stripeCustomerId: true } });
  if (student?.stripeCustomerId) return student.stripeCustomerId;

  const customer = await stripe.customers.create({ email, name, metadata: { studentId } });
  await prisma.student.update({ where: { id: studentId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

async function ensureStripePaymentMethod(
  studentId: string,
  customerId: string,
  token: string, // tok_visa, tok_mastercard, etc.
  brand: string,
  last4: string,
  name: string,
): Promise<void> {
  const existing = await prisma.paymentMethod.findFirst({ where: { studentId, isDeleted: false } });
  if (existing) return;

  const pm = await stripe.paymentMethods.create({
    type: 'card',
    card: { token },
  });
  await stripe.paymentMethods.attach(pm.id, { customer: customerId });

  await prisma.paymentMethod.create({
    data: {
      studentId,
      stripePaymentMethodId: pm.id,
      brand: pm.card?.brand ?? brand,
      last4: pm.card?.last4 ?? last4,
      cardholderName: name,
      expiryMonth: String(pm.card?.exp_month ?? '12').padStart(2, '0'),
      expiryYear: String(pm.card?.exp_year ?? '2028'),
      isDefault: true,
    },
  });
}

async function ensureStripeAccount(instructorId: string, email: string): Promise<string> {
  const inst = await prisma.instructor.findUnique({ where: { id: instructorId }, select: { stripeAccountId: true } });
  if (inst?.stripeAccountId) return inst.stripeAccountId;

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'BR',
    email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  });

  await prisma.instructor.update({
    where: { id: instructorId },
    data: { stripeAccountId: account.id, stripeAccountStatus: 'ACTIVE', stripePayoutsEnabled: false },
  });
  return account.id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Questões do Simulado ────────────────────────────────────────────────────
  const qCount = await prisma.question.count();
  if (qCount === 0) {
    const categories = ['Legislacao', 'Direcao Defensiva', 'Primeiros Socorros', 'Meio Ambiente', 'Mecanica'];
    await prisma.question.createMany({
      data: Array.from({ length: 40 }, (_, i) => ({
        text: `Questão ${i + 1} — ${categories[i % 5]}: qual alternativa está correta?`,
        category: categories[i % 5],
        options: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
        correct: i % 4,
      })),
    });
    console.log('  ✔ 40 questões criadas');
  } else {
    console.log(`  ✔ ${qCount} questões já existem`);
  }

  // ── Instrutor Principal ─────────────────────────────────────────────────────
  const instructor = await prisma.instructor.upsert({
    where: { email: 'instrutor@demo.com' },
    create: {
      email: 'instrutor@demo.com',
      password: HASH,
      name: 'Roberto Souza',
      phone: '67999990001',
      cpf: '12345678901',
      bio: 'Instrutor credenciado pelo DETRAN-MS com 10 anos de experiência em Campo Grande.',
      instructorType: 'B',
      location: 'Campo Grande, MS',
      pricePerClass: 120.0,
      cnhNumber: '01234567890',
      cnhCategory: 'B',
      cnhExpiry: '2030-12-31',
      credentialStatus: 'APPROVED',
      detranCredentialNumber: 'MS-CRED-100001',
      detranCredentialUf: 'MS',
      credentialValidUntil: new Date('2027-12-31'),
      stripeAccountStatus: 'PENDING',
    },
    update: {},
  });
  const robertoStripeId = await ensureStripeAccount(instructor.id, instructor.email);
  console.log(`  ✔ Instrutor: ${instructor.email} (Stripe: ${robertoStripeId})`);

  // Veículo
  const vehicle = await prisma.vehicle.upsert({
    where: { plate: 'DEMO-0001' },
    create: { plate: 'DEMO-0001', model: 'Hyundai HB20', year: '2023', transmission: 'manual', instructorId: instructor.id },
    update: {},
  });
  console.log(`  ✔ Veículo: ${vehicle.model} (${vehicle.plate})`);

  // Disponibilidade
  const existingAv = await prisma.availability.count({ where: { instructorId: instructor.id } });
  if (existingAv === 0) {
    await prisma.availability.createMany({
      data: [1, 2, 3, 4, 5].map((day) => ({
        instructorId: instructor.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '18:00',
        isEnabled: true,
      })),
    });
    console.log('  ✔ Disponibilidade criada (seg–sex 08h–18h)');
  }

  // ── Instrutores Adicionais ──────────────────────────────────────────────────

  const extraInstructors = [
    {
      email: 'fernanda.costa@demo.com',
      name: 'Fernanda Costa',
      cpf: '98765432100',
      phone: '67991110001',
      bio: 'Instrutora especializada em direção defensiva e primeiros socorros. Paciência e didática são meu diferencial.',
      instructorType: 'B',
      location: 'Campo Grande, MS',
      pricePerClass: 100.0,
      rating: 4.8,
      reviewsCount: 87,
      cnhNumber: '12345678901',
      cnhCategory: 'B',
      cnhExpiry: '2029-06-30',
      credentialStatus: 'APPROVED',
      detranCredentialNumber: 'MS-CRED-100002',
      detranCredentialUf: 'MS',
      credentialValidUntil: new Date('2028-06-30'),
      plate: 'DEMO-0002',
      vehicleModel: 'Honda Fit',
      vehicleYear: '2022',
      transmission: 'automatico',
      availability: [1, 3, 5],
      startTime: '07:00',
      endTime: '17:00',
    },
    {
      email: 'marcos.andrade@demo.com',
      name: 'Marcos Andrade',
      cpf: '55544433300',
      phone: '67992220002',
      bio: 'Instrutor credenciado há 8 anos pelo DETRAN-MS. Especialista em categorias B e E, com foco em veículos de carga.',
      instructorType: 'BE',
      location: 'Campo Grande, MS',
      pricePerClass: 150.0,
      rating: 4.5,
      reviewsCount: 134,
      cnhNumber: '23456789012',
      cnhCategory: 'BE',
      cnhExpiry: '2031-03-15',
      credentialStatus: 'APPROVED',
      detranCredentialNumber: 'MS-CRED-100003',
      detranCredentialUf: 'MS',
      credentialValidUntil: new Date('2027-03-15'),
      plate: 'DEMO-0003',
      vehicleModel: 'Chevrolet Onix',
      vehicleYear: '2021',
      transmission: 'manual',
      availability: [2, 4, 6],
      startTime: '08:00',
      endTime: '16:00',
    },
    {
      email: 'patricia.duarte@demo.com',
      name: 'Patrícia Duarte',
      cpf: '33322211100',
      phone: '67993330003',
      bio: 'Instrutora com formação em psicologia do trânsito. Atendo alunos com ansiedade ao volante com atenção especial.',
      instructorType: 'B',
      location: 'Campo Grande, MS',
      pricePerClass: 110.0,
      rating: 4.9,
      reviewsCount: 212,
      cnhNumber: '34567890123',
      cnhCategory: 'B',
      cnhExpiry: '2032-09-01',
      credentialStatus: 'APPROVED',
      detranCredentialNumber: 'MS-CRED-100004',
      detranCredentialUf: 'MS',
      credentialValidUntil: new Date('2029-09-01'),
      plate: 'DEMO-0004',
      vehicleModel: 'Volkswagen Polo',
      vehicleYear: '2023',
      transmission: 'automatico',
      availability: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '18:00',
    },
    {
      email: 'lucas.menezes@demo.com',
      name: 'Lucas Menezes',
      cpf: '11100099900',
      phone: '67994440004',
      bio: 'Instrutor jovem e dinâmico, formado pela UFMS em Engenharia de Transportes. Categoria AB — moto e carro.',
      instructorType: 'AB',
      location: 'Campo Grande, MS',
      pricePerClass: 90.0,
      rating: 4.2,
      reviewsCount: 58,
      cnhNumber: '45678901234',
      cnhCategory: 'AB',
      cnhExpiry: '2033-01-20',
      credentialStatus: 'APPROVED',
      detranCredentialNumber: 'MS-CRED-100005',
      detranCredentialUf: 'MS',
      credentialValidUntil: new Date('2028-01-20'),
      plate: 'DEMO-0005',
      vehicleModel: 'Renault Kwid',
      vehicleYear: '2022',
      transmission: 'manual',
      availability: [1, 2, 3, 4, 5, 6],
      startTime: '07:00',
      endTime: '13:00',
    },
  ];

  for (const data of extraInstructors) {
    const inst = await prisma.instructor.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        password: HASH,
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        bio: data.bio,
        instructorType: data.instructorType,
        location: data.location,
        pricePerClass: data.pricePerClass,
        rating: data.rating,
        reviewsCount: data.reviewsCount,
        cnhNumber: data.cnhNumber,
        cnhCategory: data.cnhCategory,
        cnhExpiry: data.cnhExpiry,
        credentialStatus: data.credentialStatus,
        detranCredentialNumber: data.detranCredentialNumber,
        detranCredentialUf: data.detranCredentialUf,
        credentialValidUntil: data.credentialValidUntil,
        stripeAccountStatus: 'PENDING',
      },
      update: {},
    });

    const stripeId = await ensureStripeAccount(inst.id, inst.email);

    await prisma.vehicle.upsert({
      where: { plate: data.plate },
      create: { plate: data.plate, model: data.vehicleModel, year: data.vehicleYear, transmission: data.transmission, instructorId: inst.id },
      update: {},
    });

    const avCount = await prisma.availability.count({ where: { instructorId: inst.id } });
    if (avCount === 0) {
      await prisma.availability.createMany({
        data: data.availability.map((day) => ({
          instructorId: inst.id,
          dayOfWeek: day,
          startTime: data.startTime,
          endTime: data.endTime,
          isEnabled: true,
        })),
      });
    }

    console.log(`  ✔ Instrutor: ${inst.email} (${data.vehicleModel}, R$${data.pricePerClass}/aula, Stripe: ${stripeId})`);
  }

  // ── Aluno 1: Iniciante (REGISTERED) ────────────────────────────────────────
  const aluno1 = await prisma.student.upsert({
    where: { email: 'aluno.inicio@demo.com' },
    create: {
      email: 'aluno.inicio@demo.com',
      password: HASH,
      name: 'Ana Souza',
      cpf: '11122233300',
      phone: '67988880001',
      birthDate: '2000-03-15',
      motherName: 'Carla Souza',
      ufDomicile: 'MS',
      intendedCategory: 'B',
      journeyStage: 'REGISTERED',
    },
    update: {},
  });
  console.log(`  ✔ Aluno iniciante: ${aluno1.email} (REGISTERED)`);

  // ── Aluno 2: RENACH Pendente ────────────────────────────────────────────────
  const aluno2 = await prisma.student.upsert({
    where: { email: 'aluno.renach@demo.com' },
    create: {
      email: 'aluno.renach@demo.com',
      password: HASH,
      name: 'Carlos Mendes',
      cpf: '22233344400',
      phone: '67988880002',
      birthDate: '1998-07-20',
      motherName: 'Fernanda Mendes',
      ufDomicile: 'MS',
      intendedCategory: 'B',
      journeyStage: 'RENACH_PENDING',
      theoryCourseStartedAt: new Date('2026-04-01'),
    },
    update: {},
  });
  await prisma.renachProcess.upsert({
    where: { studentId: aluno2.id },
    create: { studentId: aluno2.id, ufDetran: 'MS', status: 'PENDING' },
    update: {},
  });
  console.log(`  ✔ Aluno RENACH: ${aluno2.email} (RENACH_PENDING)`);

  // ── Aluno 3: Aguardando LADV ────────────────────────────────────────────────
  const aluno3 = await prisma.student.upsert({
    where: { email: 'aluno.ladv@demo.com' },
    create: {
      email: 'aluno.ladv@demo.com',
      password: HASH,
      name: 'Juliana Ferreira',
      cpf: '33344455500',
      phone: '67988880003',
      birthDate: '2001-11-05',
      motherName: 'Rosa Ferreira',
      ufDomicile: 'MS',
      intendedCategory: 'B',
      journeyStage: 'AWAITING_LADV_UPLOAD',
      theoryCourseStartedAt: new Date('2026-03-01'),
    },
    update: {},
  });
  await prisma.renachProcess.upsert({
    where: { studentId: aluno3.id },
    create: {
      studentId: aluno3.id,
      ufDetran: 'MS',
      renachNumber: 'MS202600310',
      status: 'DONE',
      biometryDoneAt: new Date('2026-03-10'),
    },
    update: {},
  });
  console.log(`  ✔ Aluno LADV: ${aluno3.email} (AWAITING_LADV_UPLOAD)`);

  // ── Aluno 4: Prático em Andamento (PRACTICAL_IN_PROGRESS) ──────────────────
  const aluno4 = await prisma.student.upsert({
    where: { email: 'aluno.pratico@demo.com' },
    create: {
      email: 'aluno.pratico@demo.com',
      password: HASH,
      name: 'Gabriel Lima',
      cpf: '44455566600',
      phone: '67988880004',
      birthDate: '1999-05-10',
      motherName: 'Sônia Lima',
      ufDomicile: 'MS',
      intendedCategory: 'B',
      journeyStage: 'PRACTICAL_IN_PROGRESS',
      theoryCourseStartedAt: new Date('2026-02-01'),
      ladvNumber: '1490200',
      ladvIssuedAt: new Date('2026-01-15'),
      ladvValidUntil: new Date('2027-01-15'),
      ladvOcrStatus: 'PASS',
      ladvOcrConfidence: 0.92,
      ladvUploaded: true,
    },
    update: {},
  });
  await prisma.renachProcess.upsert({
    where: { studentId: aluno4.id },
    create: {
      studentId: aluno4.id,
      ufDetran: 'MS',
      renachNumber: 'MS202600201',
      status: 'DONE',
      biometryDoneAt: new Date('2026-02-01'),
    },
    update: {},
  });

  // Stripe: customer + cartão Visa de teste para aluno4
  const cus4 = await ensureStripeCustomer(aluno4.id, aluno4.email, aluno4.name);
  await ensureStripePaymentMethod(aluno4.id, cus4, 'tok_visa', 'visa', '4242', aluno4.name);

  // Aulas para aluno4
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 3);
  upcomingDate.setHours(0, 0, 0, 0);

  await prisma.lesson.upsert({
    where: { unique_booking_slot: { instructorId: instructor.id, date: upcomingDate, startTime: '10:00' } },
    create: {
      studentId: aluno4.id,
      instructorId: instructor.id,
      vehicleId: vehicle.id,
      date: upcomingDate,
      startTime: '10:00',
      endTime: '11:00',
      status: 'pending_acceptance',
      price: 120.0,
    },
    update: {},
  });

  const acceptedDate = new Date();
  acceptedDate.setDate(acceptedDate.getDate() + 5);
  acceptedDate.setHours(0, 0, 0, 0);

  await prisma.lesson.upsert({
    where: { unique_booking_slot: { instructorId: instructor.id, date: acceptedDate, startTime: '14:00' } },
    create: {
      studentId: aluno4.id,
      instructorId: instructor.id,
      vehicleId: vehicle.id,
      date: acceptedDate,
      startTime: '14:00',
      endTime: '15:00',
      status: 'accepted',
      price: 120.0,
    },
    update: {},
  });

  const completedDate1 = new Date('2026-05-01');
  const completedLesson4 = await prisma.lesson.upsert({
    where: { unique_booking_slot: { instructorId: instructor.id, date: completedDate1, startTime: '09:00' } },
    create: {
      studentId: aluno4.id,
      instructorId: instructor.id,
      vehicleId: vehicle.id,
      date: completedDate1,
      startTime: '09:00',
      endTime: '10:00',
      status: 'completed',
      durationMinutes: 60,
      checkInTime: new Date('2026-05-01T09:00:00Z'),
      checkOutTime: new Date('2026-05-01T10:00:00Z'),
      biometryStartStatus: 'SUCCESS',
      biometryStartAt: new Date('2026-05-01T09:00:00Z'),
      biometryMidStatus: 'SUCCESS',
      biometryMidAt: new Date('2026-05-01T09:30:00Z'),
      biometryEndStatus: 'SUCCESS',
      biometryEndAt: new Date('2026-05-01T10:00:00Z'),
      price: 120.0,
      instructorFeedback: 'Bom desempenho, mantenha a atenção nos espelhos.',
      studentFeedbackRating: 5,
      studentFeedbackText: 'Instrutor excelente, muito paciente.',
      integrityHash: 'a'.repeat(64),
      paymentReleased: false,
    },
    update: {},
  });

  const pm4 = await prisma.paymentMethod.findFirst({ where: { studentId: aluno4.id } });
  await prisma.payment.upsert({
    where: { lessonId: completedLesson4.id },
    create: {
      studentId: aluno4.id,
      lessonId: completedLesson4.id,
      paymentMethodId: pm4?.id,
      amount: 120.0,
      status: 'HELD',
      platformFeeAmount: 12.0,
      instructorAmount: 108.0,
    },
    update: {},
  });
  console.log(`  ✔ Aluno prático: ${aluno4.email} (PRACTICAL_IN_PROGRESS, Stripe customer: ${cus4})`);

  // ── Aluno 5: Completo (READY_FOR_PRACTICAL_EXAM) ────────────────────────────
  const aluno5 = await prisma.student.upsert({
    where: { email: 'aluno.completo@demo.com' },
    create: {
      email: 'aluno.completo@demo.com',
      password: HASH,
      name: 'Maria Oliveira',
      cpf: '55566677700',
      phone: '67988880005',
      birthDate: '1997-08-22',
      motherName: 'Helena Oliveira',
      ufDomicile: 'MS',
      intendedCategory: 'B',
      journeyStage: 'READY_FOR_PRACTICAL_EXAM',
      theoryCourseStartedAt: new Date('2026-01-10'),
      ladvNumber: '1490315',
      ladvIssuedAt: new Date('2025-12-01'),
      ladvValidUntil: new Date('2026-12-01'),
      ladvOcrStatus: 'PASS',
      ladvOcrConfidence: 0.95,
      ladvUploaded: true,
      readyForPracticalExamAt: new Date('2026-05-20'),
    },
    update: {},
  });
  await prisma.renachProcess.upsert({
    where: { studentId: aluno5.id },
    create: {
      studentId: aluno5.id,
      ufDetran: 'MS',
      renachNumber: 'MS202600115',
      status: 'DONE',
      biometryDoneAt: new Date('2026-01-15'),
    },
    update: {},
  });

  const existingSimulado = await prisma.studentSimuladoHistory.findFirst({ where: { studentId: aluno5.id, passed: true } });
  if (!existingSimulado) {
    await prisma.studentSimuladoHistory.create({
      data: {
        studentId: aluno5.id,
        score: 25,
        passed: true,
        startedAt: new Date('2026-02-01T10:00:00Z'),
        submittedAt: new Date('2026-02-01T10:12:00Z'),
      },
    });
  }

  // Stripe: customer + cartão Mastercard de teste para aluno5
  const cus5 = await ensureStripeCustomer(aluno5.id, aluno5.email, aluno5.name);
  await ensureStripePaymentMethod(aluno5.id, cus5, 'tok_mastercard', 'mastercard', '4444', aluno5.name);

  const lessonDates5 = [new Date('2026-03-05'), new Date('2026-03-12'), new Date('2026-03-19')];

  for (let i = 0; i < lessonDates5.length; i++) {
    const d = lessonDates5[i];
    const lesson = await prisma.lesson.upsert({
      where: { unique_booking_slot: { instructorId: instructor.id, date: d, startTime: '09:00' } },
      create: {
        studentId: aluno5.id,
        instructorId: instructor.id,
        vehicleId: vehicle.id,
        date: d,
        startTime: '09:00',
        endTime: '10:00',
        status: 'completed',
        durationMinutes: 60,
        checkInTime: new Date(d.getTime()),
        checkOutTime: new Date(d.getTime() + 60 * 60 * 1000),
        biometryStartStatus: 'SUCCESS',
        biometryStartAt: new Date(d.getTime()),
        biometryMidStatus: 'SUCCESS',
        biometryMidAt: new Date(d.getTime() + 30 * 60 * 1000),
        biometryEndStatus: 'SUCCESS',
        biometryEndAt: new Date(d.getTime() + 60 * 60 * 1000),
        price: 120.0,
        instructorFeedback: 'Ótima evolução na aula.',
        studentFeedbackRating: 5,
        studentFeedbackText: 'Adorei a aula.',
        integrityHash: `${'b'.repeat(62)}${String(i).padStart(2, '0')}`,
        paymentReleased: true,
      },
      update: {},
    });

    const pm5 = await prisma.paymentMethod.findFirst({ where: { studentId: aluno5.id } });
    await prisma.payment.upsert({
      where: { lessonId: lesson.id },
      create: {
        studentId: aluno5.id,
        lessonId: lesson.id,
        paymentMethodId: pm5?.id,
        amount: 120.0,
        status: 'RELEASED',
        platformFeeAmount: 12.0,
        instructorAmount: 108.0,
      },
      update: {},
    });
  }

  await prisma.studentChecklist.upsert({
    where: { studentId: aluno5.id },
    create: { studentId: aluno5.id, teorico: true, pratico: true },
    update: { teorico: true, pratico: true },
  });
  console.log(`  ✔ Aluno completo: ${aluno5.email} (READY_FOR_PRACTICAL_EXAM, Stripe customer: ${cus5})`);

  console.log('\n🎉 Seed concluído!\n');
  console.log('=== Contas Demo ===');
  console.log('Senha de todas as contas: demo123456\n');
  console.log('INSTRUTORES (contas Stripe Express criadas em test mode)');
  console.log('  instrutor@demo.com        →  Roberto Souza · Hyundai HB20 · R$120/aula · seg–sex 08h–18h');
  console.log('  fernanda.costa@demo.com   →  Fernanda Costa · Honda Fit · R$100/aula · seg/qua/sex 07h–17h');
  console.log('  marcos.andrade@demo.com   →  Marcos Andrade · Chevrolet Onix · R$150/aula · ter/qui/sab 08h–16h');
  console.log('  patricia.duarte@demo.com  →  Patrícia Duarte · VW Polo · R$110/aula · seg–sex 09h–18h');
  console.log('  lucas.menezes@demo.com    →  Lucas Menezes · Renault Kwid · R$90/aula · seg–sab 07h–13h\n');
  console.log('ALUNOS');
  console.log('  aluno.inicio@demo.com   →  REGISTERED (sem Stripe)');
  console.log('  aluno.renach@demo.com   →  RENACH_PENDING (sem Stripe)');
  console.log('  aluno.ladv@demo.com     →  AWAITING_LADV_UPLOAD (sem Stripe)');
  console.log('  aluno.pratico@demo.com  →  PRACTICAL_IN_PROGRESS (Stripe customer + Visa 4242)');
  console.log('  aluno.completo@demo.com →  READY_FOR_PRACTICAL_EXAM (Stripe customer + Mastercard 5555)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
