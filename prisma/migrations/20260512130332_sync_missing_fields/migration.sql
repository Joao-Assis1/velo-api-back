-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "renachNumber" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "biometryEndAt" TIMESTAMP(3),
ADD COLUMN     "biometryEndStatus" TEXT,
ADD COLUMN     "biometryMidAt" TIMESTAMP(3),
ADD COLUMN     "biometryMidStatus" TEXT,
ADD COLUMN     "biometryStartAt" TIMESTAMP(3),
ADD COLUMN     "biometryStartStatus" TEXT,
ADD COLUMN     "disputeOpened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "paymentReleased" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "asaasId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "intendedCategory" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "ufDomicile" TEXT,
ALTER COLUMN "cpf" SET NOT NULL;

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "options" TEXT[],
    "correct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSimuladoHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentSimuladoHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentChecklist" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "medico" BOOLEAN NOT NULL DEFAULT false,
    "psicotecnico" BOOLEAN NOT NULL DEFAULT false,
    "teorico" BOOLEAN NOT NULL DEFAULT false,
    "pratico" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonEvent" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentChecklist_studentId_key" ON "StudentChecklist"("studentId");

-- CreateIndex
CREATE INDEX "LessonEvent_lessonId_idx" ON "LessonEvent"("lessonId");

-- CreateIndex
CREATE INDEX "LessonEvent_type_idx" ON "LessonEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_asaasId_key" ON "Payment"("asaasId");

-- AddForeignKey
ALTER TABLE "StudentSimuladoHistory" ADD CONSTRAINT "StudentSimuladoHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentChecklist" ADD CONSTRAINT "StudentChecklist_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonEvent" ADD CONSTRAINT "LessonEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
