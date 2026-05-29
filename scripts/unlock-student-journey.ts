import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "aluno.fase1.novo@velo-test.com";

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) throw new Error(`Student not found: ${email}`);
  const sid = student.id;
  console.log(`Student: ${sid}`);

  // 1. teoryCourseStartedAt + LADV fields
  await prisma.student.update({
    where: { id: sid },
    data: {
      theoryCourseStartedAt: new Date("2026-01-01"),
      ladvUploaded: true,
      ladvNumber: "LADV-MS-TEST-001",
      ladvIssuedAt: new Date("2026-03-01"),
      ladvValidUntil: new Date("2027-03-01"),
      ladvOcrStatus: "PASS",
    },
  });
  console.log("1. Student theory + LADV ✓");

  // 2. RENACH — upsert
  await prisma.renachProcess.upsert({
    where: { studentId: sid },
    update: { status: "DONE", renachNumber: "12345678900001MS" },
    create: {
      studentId: sid,
      ufDetran: "MS",
      status: "DONE",
      renachNumber: "12345678900001MS",
    },
  });
  console.log("2. RENACH DONE ✓");

  console.log("\nStudent journey unlocked → LADV_UPLOADED_VALID 🎉");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
