import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: {
      email: true,
      name: true,
      journeyStage: true,
      ladvUploaded: true,
      paymentMethods: {
        select: {
          last4: true
        }
      }
    }
  });
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
