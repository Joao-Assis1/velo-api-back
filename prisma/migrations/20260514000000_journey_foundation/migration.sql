-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN     "credentialStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "credentialValidUntil" TIMESTAMP(3),
ADD COLUMN     "detranCredentialNumber" TEXT,
ADD COLUMN     "detranCredentialUf" TEXT,
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeAccountStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "journeyStage" TEXT NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "ladvIssuedAt" TIMESTAMP(3),
ADD COLUMN     "ladvNumber" TEXT,
ADD COLUMN     "ladvOcrConfidence" DOUBLE PRECISION,
ADD COLUMN     "ladvOcrStatus" TEXT,
ADD COLUMN     "ladvValidUntil" TIMESTAMP(3),
ADD COLUMN     "readyForPracticalExamAt" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "theoryCourseStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RenachProcess" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "renachNumber" TEXT,
    "ufDetran" TEXT NOT NULL,
    "biometryDoneAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenachProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalExam" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clinicId" TEXT,
    "protocolCode" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "result" TEXT,
    "restrictions" TEXT,
    "validUntil" TIMESTAMP(3),
    "laudoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychologicalExam" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clinicId" TEXT,
    "protocolCode" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "result" TEXT,
    "restrictions" TEXT,
    "validUntil" TIMESTAMP(3),
    "laudoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychologicalExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialTheoryExam" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER,
    "passed" BOOLEAN NOT NULL,
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficialTheoryExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RenachProcess_studentId_key" ON "RenachProcess"("studentId");

-- CreateIndex
CREATE INDEX "RenachProcess_status_idx" ON "RenachProcess"("status");

-- CreateIndex
CREATE INDEX "Clinic_uf_city_type_idx" ON "Clinic"("uf", "city", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalExam_studentId_key" ON "MedicalExam"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalExam_protocolCode_key" ON "MedicalExam"("protocolCode");

-- CreateIndex
CREATE INDEX "MedicalExam_status_idx" ON "MedicalExam"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PsychologicalExam_studentId_key" ON "PsychologicalExam"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PsychologicalExam_protocolCode_key" ON "PsychologicalExam"("protocolCode");

-- CreateIndex
CREATE INDEX "PsychologicalExam_status_idx" ON "PsychologicalExam"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialTheoryExam_studentId_key" ON "OfficialTheoryExam"("studentId");

-- CreateIndex
CREATE INDEX "OfficialTheoryExam_passed_idx" ON "OfficialTheoryExam"("passed");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_stripeAccountId_key" ON "Instructor"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_stripeCustomerId_key" ON "Student"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "RenachProcess" ADD CONSTRAINT "RenachProcess_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalExam" ADD CONSTRAINT "MedicalExam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalExam" ADD CONSTRAINT "MedicalExam_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologicalExam" ADD CONSTRAINT "PsychologicalExam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologicalExam" ADD CONSTRAINT "PsychologicalExam_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialTheoryExam" ADD CONSTRAINT "OfficialTheoryExam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
