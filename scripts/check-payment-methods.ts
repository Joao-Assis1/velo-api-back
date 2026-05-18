import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const student = await prisma.student.findUnique({
    where: { email: "aluno.fase1.novo@velo-test.com" },
    include: { paymentMethods: true },
  });
  console.log("Payment methods:", JSON.stringify(student?.paymentMethods, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
