import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  const lessons = await prisma.lesson.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, date: true, createdAt: true, status: true, startTime: true }
  });
  console.log(JSON.stringify(lessons, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
