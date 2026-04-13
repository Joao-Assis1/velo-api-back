/*
  Warnings:

  - Added the required column `dayOfWeek` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "dayOfWeek" INTEGER NOT NULL,
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "checkOutTime" TIMESTAMP(3),
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "instructorFeedback" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "studentFeedbackRating" INTEGER,
ADD COLUMN     "studentFeedbackText" TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'upcoming';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "instructorType" TEXT,
ADD COLUMN     "ladvUploaded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pricePerClass" DOUBLE PRECISION,
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "transmission" TEXT,
ADD COLUMN     "vehiclePhoto" TEXT,
ADD COLUMN     "year" TEXT;
