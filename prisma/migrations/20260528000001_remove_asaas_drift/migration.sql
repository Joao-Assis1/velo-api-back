-- Coluna removida manualmente do banco em algum momento. IF EXISTS garante idempotência.
ALTER TABLE "Student" DROP COLUMN IF EXISTS "asaasCustomerId";
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" DROP DEFAULT;
