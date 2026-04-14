import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando populamento de dados...');

  // 1. Limpar banco (Opcional, mas seguro para seed)
  await prisma.payment.deleteMany();
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
      profilePicture: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
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
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
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
