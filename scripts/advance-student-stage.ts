import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "aluno.fase1.novo@velo-test.com";
  const result = await prisma.student.updateMany({
    where: { email },
    data: {
      journeyStage: "LADV_UPLOADED_VALID",
      ladvUploaded: true,
      ladvOcrStatus: "PASS",
      ladvNumber: "1234567",
      ladvIssuedAt: new Date("2026-01-01"),
      ladvValidUntil: new Date("2027-01-01"),
    },
  });
  console.log(`Updated ${result.count} student(s) → stage LADV_UPLOADED_VALID.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
