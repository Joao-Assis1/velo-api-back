/*
  Warnings:

  - A unique constraint covering the columns `[instructorId,date,startTime]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN     "certidaoNegativa" TEXT,
ADD COLUMN     "cnhCategory" TEXT,
ADD COLUMN     "cnhEar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cnhExpiry" TEXT,
ADD COLUMN     "cnhNumber" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "integrityHash" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentMethodId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "ladv_document_url" TEXT,
ADD COLUMN     "ladv_validation_date" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BusySlot" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTelemetry" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LessonTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "cardholderName" TEXT NOT NULL,
    "expiryMonth" TEXT NOT NULL,
    "expiryYear" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusySlot_instructorId_idx" ON "BusySlot"("instructorId");

-- CreateIndex
CREATE INDEX "BusySlot_instructorId_date_idx" ON "BusySlot"("instructorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BusySlot_instructorId_date_startTime_key" ON "BusySlot"("instructorId", "date", "startTime");

-- CreateIndex
CREATE INDEX "LessonTelemetry_lessonId_idx" ON "LessonTelemetry"("lessonId");

-- CreateIndex
CREATE INDEX "LessonTelemetry_timestamp_idx" ON "LessonTelemetry"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_studentId_token_key" ON "PaymentMethod"("studentId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_instructorId_date_startTime_key" ON "Lesson"("instructorId", "date", "startTime");

-- AddForeignKey
ALTER TABLE "BusySlot" ADD CONSTRAINT "BusySlot_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTelemetry" ADD CONSTRAINT "LessonTelemetry_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
