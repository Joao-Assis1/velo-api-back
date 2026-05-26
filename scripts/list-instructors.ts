import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const instructors = await prisma.instructor.findMany({
    select: { id: true, email: true, name: true, credentialStatus: true },
  });
  instructors.forEach(i => console.log(`${i.name} | ${i.email} | ${i.credentialStatus}`));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
