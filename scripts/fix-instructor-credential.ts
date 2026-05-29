import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Fix instructor credentials + CNH
  const result = await prisma.instructor.updateMany({
    data: {
      credentialValidUntil: new Date("2028-01-01"),
      credentialStatus: "APPROVED",
      detranCredentialNumber: "100001",
      detranCredentialUf: "MS",
      isActive: true,
      stripeAccountStatus: "ACTIVE",
      cnhNumber: "12345678900",
      cnhCategory: "B",
      cnhExpiry: "2028-01-01",
    },
  });
  console.log(`Updated ${result.count} instructors — credentials + CNH fixed`);

  // Show instructors and their vehicles
  const instructors = await prisma.instructor.findMany({
    select: { id: true, name: true, vehicles: { select: { id: true, model: true } } },
  });
  for (const i of instructors) {
    console.log(`Instructor ${i.name} (${i.id.slice(0,8)}): ${i.vehicles.length} vehicle(s)`);
    i.vehicles.forEach(v => console.log(`  vehicle: ${v.id} — ${v.model}`));
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
