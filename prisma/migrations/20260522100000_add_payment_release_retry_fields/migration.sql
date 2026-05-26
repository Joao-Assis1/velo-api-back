-- AlterTable: add retry tracking fields to Payment
ALTER TABLE "Payment" ADD COLUMN "releaseAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "lastReleaseAttemptAt" TIMESTAMP(3);
