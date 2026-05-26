-- AddColumn Student asaasCustomerId
ALTER TABLE "Student" ADD COLUMN "asaasCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_asaasCustomerId_key" ON "Student"("asaasCustomerId");

-- AddColumn Instructor
ALTER TABLE "Instructor" ADD COLUMN "pixKey" TEXT;
ALTER TABLE "Instructor" ADD COLUMN "bankCode" TEXT;
ALTER TABLE "Instructor" ADD COLUMN "bankAgency" TEXT;
ALTER TABLE "Instructor" ADD COLUMN "bankAccount" TEXT;

-- AddColumn Payment
ALTER TABLE "Payment" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Payment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
