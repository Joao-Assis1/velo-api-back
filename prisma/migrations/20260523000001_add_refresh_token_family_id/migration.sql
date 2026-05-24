-- AlterTable: add familyId to group refresh token rotation chains
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
