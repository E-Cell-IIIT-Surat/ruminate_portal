ALTER TYPE "EmailStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TABLE "EmailDelivery" ADD COLUMN "claimedAt" TIMESTAMP(3), ADD COLUMN "claimedBy" TEXT, ADD COLUMN "nextAttemptAt" TIMESTAMP(3);
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");
