import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.instructor.updateMany({
    data: {
      credentialStatus: "APPROVED",
      stripeAccountStatus: "ACTIVE",
      isActive: true,
    },
  });
  console.log(`Updated ${result.count} instructors to APPROVED/ACTIVE.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
