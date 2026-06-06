import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { DETRAN_QUESTIONS } from './questions';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PASSWORD = 'demo123456';
const HASH = bcrypt.hashSync(PASSWORD, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensurePaymentMethod(
  studentId: string,
  asaasCustomerId: string,
  brand: string,
  last4: string,
  name: string,
  tokenSuffix: string,
): Promise<void> {
  const existing = await prisma.paymentMethod.findFirst({ where: { studentId, isDeleted: false } });
  if (existing) return;

  await prisma.student.update({ where: { id: studentId }, data: { asaasCustomerId } });

  await prisma.paymentMethod.create({
    data: {
      studentId,
      asaasCreditCardToken: `seed_token_${tokenSuffix}`,
      brand,
      last4,
      cardholderName: name,
      expiryMonth: '12',
      expiryYear: '2028',
      isDefault: true,
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Questões do Simulado ────────────────────────────────────────────────────
  await prisma.question.deleteMany({});
  await prisma.question.createMany({ data: DETRAN_QUESTIONS });
  console.log(`  ✔ ${DETRAN_QUESTIONS.length} questões DETRAN inseridas`);

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
      cnhNumber: '12345678900',
      cnhCategory: 'B',
      cnhExpiry: '2030-12-31',
      credentialStatus: 'APPROVED',
      detranCredentialNumber: '100001',
      detranCredentialUf: 'MS',
      renachNumber: 'MS202600401',
      credentialValidUntil: new Date('2027-12-31'),
      birthDate: '1978-05-20',
      educationLevel: 'Superior Completo',
    },
    update: {},
  });
  console.log(`  ✔ Instrutor: ${instructor.email}`);

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
      detranCredentialNumber: '100002',
      detranCredentialUf: 'MS',
      renachNumber: 'MS202600402',
      credentialValidUntil: new Date('2028-06-30'),
      birthDate: '1985-03-12',
      educationLevel: 'Superior Completo',
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
      detranCredentialNumber: '100003',
      detranCredentialUf: 'MS',
      renachNumber: 'MS202600403',
      credentialValidUntil: new Date('2027-03-15'),
      birthDate: '1980-11-07',
      educationLevel: 'Ensino Médio Completo',
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
      detranCredentialNumber: '100004',
      detranCredentialUf: 'MS',
      renachNumber: 'MS202600404',
      credentialValidUntil: new Date('2029-09-01'),
      birthDate: '1983-06-14',
      educationLevel: 'Superior Completo',
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
      detranCredentialNumber: '100005',
      detranCredentialUf: 'MS',
      renachNumber: 'MS202600405',
      credentialValidUntil: new Date('2028-01-20'),
      birthDate: '1994-09-30',
      educationLevel: 'Superior Completo',
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
        renachNumber: data.renachNumber,
        credentialValidUntil: data.credentialValidUntil,
        birthDate: data.birthDate,
        educationLevel: data.educationLevel,
      },
      update: {},
    });

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

    console.log(`  ✔ Instrutor: ${inst.email} (${data.vehicleModel}, R$${data.pricePerClass}/aula)`);
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
    update: {
      journeyStage: 'RENACH_PENDING',
      theoryCourseStartedAt: new Date('2026-04-01'),
    },
  });
  await prisma.renachProcess.upsert({
    where: { studentId: aluno2.id },
    create: { studentId: aluno2.id, ufDetran: 'MS', status: 'PENDING' },
    update: { status: 'PENDING' },
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
    update: {
      journeyStage: 'AWAITING_LADV_UPLOAD',
      theoryCourseStartedAt: new Date('2026-03-01'),
      ladvNumber: null,
      ladvIssuedAt: null,
      ladvValidUntil: null,
      ladvOcrStatus: null,
      ladvOcrConfidence: null,
      ladvUploaded: false,
      ladv_document_url: null,
      ladv_validation_date: null,
    },
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
    update: {
      renachNumber: 'MS202600310',
      status: 'DONE',
    },
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

  await ensurePaymentMethod(aluno4.id, 'seed_cus_aluno4', 'visa', '4111', aluno4.name, 'aluno4_visa');

  // Aulas para aluno4
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 3);
  upcomingDate.setHours(0, 0, 0, 0);

  let lessonPending = await prisma.lesson.findFirst({
    where: { instructorId: instructor.id, date: upcomingDate, startTime: '10:00' }
  });
  if (!lessonPending) {
    lessonPending = await prisma.lesson.create({
      data: {
        studentId: aluno4.id,
        instructorId: instructor.id,
        vehicleId: vehicle.id,
        date: upcomingDate,
        startTime: '10:00',
        endTime: '11:00',
        status: 'pending_acceptance',
        price: 120.0,
      }
    });
  }

  const acceptedDate = new Date();
  acceptedDate.setDate(acceptedDate.getDate() + 5);
  acceptedDate.setHours(0, 0, 0, 0);

  let lessonAccepted = await prisma.lesson.findFirst({
    where: { instructorId: instructor.id, date: acceptedDate, startTime: '14:00' }
  });
  if (!lessonAccepted) {
    lessonAccepted = await prisma.lesson.create({
      data: {
        studentId: aluno4.id,
        instructorId: instructor.id,
        vehicleId: vehicle.id,
        date: acceptedDate,
        startTime: '14:00',
        endTime: '15:00',
        status: 'accepted',
        price: 120.0,
      }
    });
  }

  const completedDate1 = new Date('2026-05-01');
  let completedLesson4 = await prisma.lesson.findFirst({
    where: { instructorId: instructor.id, date: completedDate1, startTime: '09:00' }
  });
  if (!completedLesson4) {
    completedLesson4 = await prisma.lesson.create({
      data: {
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
      }
    });
  }

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
  console.log(`  ✔ Aluno prático: ${aluno4.email} (PRACTICAL_IN_PROGRESS)`);

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

  await ensurePaymentMethod(aluno5.id, 'seed_cus_aluno5', 'mastercard', '5555', aluno5.name, 'aluno5_mc');

  const lessonDates5 = [new Date('2026-03-05'), new Date('2026-03-12'), new Date('2026-03-19')];

  for (let i = 0; i < lessonDates5.length; i++) {
    const d = lessonDates5[i];
    let lesson = await prisma.lesson.findFirst({
      where: { instructorId: instructor.id, date: d, startTime: '09:00' }
    });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
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
        }
      });
    }

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
  console.log(`  ✔ Aluno completo: ${aluno5.email} (READY_FOR_PRACTICAL_EXAM)`);

  console.log('\n🎉 Seed concluído!\n');
  console.log('=== Contas Demo ===');
  console.log('Senha de todas as contas: demo123456\n');
  console.log('INSTRUTORES');
  console.log('  instrutor@demo.com        →  Roberto Souza · Hyundai HB20 · R$120/aula · seg–sex 08h–18h');
  console.log('  fernanda.costa@demo.com   →  Fernanda Costa · Honda Fit · R$100/aula · seg/qua/sex 07h–17h');
  console.log('  marcos.andrade@demo.com   →  Marcos Andrade · Chevrolet Onix · R$150/aula · ter/qui/sab 08h–16h');
  console.log('  patricia.duarte@demo.com  →  Patrícia Duarte · VW Polo · R$110/aula · seg–sex 09h–18h');
  console.log('  lucas.menezes@demo.com    →  Lucas Menezes · Renault Kwid · R$90/aula · seg–sab 07h–13h\n');
  console.log('ALUNOS');
  console.log('  aluno.inicio@demo.com   →  REGISTERED (sem cartão)');
  console.log('  aluno.renach@demo.com   →  RENACH_PENDING (sem cartão)');
  console.log('  aluno.ladv@demo.com     →  AWAITING_LADV_UPLOAD (sem cartão)');
  console.log('  aluno.pratico@demo.com  →  PRACTICAL_IN_PROGRESS (Visa seed 4111)');
  console.log('  aluno.completo@demo.com →  READY_FOR_PRACTICAL_EXAM (Mastercard seed 5555)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
