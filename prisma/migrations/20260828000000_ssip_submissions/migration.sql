ALTER TABLE "User" ADD COLUMN "welcomeEmailSentAt" TIMESTAMP(3);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPLICATION';

CREATE TABLE "SSIPSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    CONSTRAINT "SSIPSettings_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "SSIPSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'SHORTLISTED', 'ON_HOLD', 'ACCEPTED', 'REJECTED');

CREATE TABLE "SSIPSubmission" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "institution" TEXT,
    "degree" TEXT,
    "studyYear" TEXT,
    "teamName" TEXT,
    "title" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "estimatedBudget" DECIMAL(12,2),
    "impact" TEXT NOT NULL,
    "status" "SSIPSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SSIPSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SSIPSubmission_referenceId_key" ON "SSIPSubmission"("referenceId");
CREATE INDEX "SSIPSubmission_status_createdAt_idx" ON "SSIPSubmission"("status", "createdAt");
CREATE INDEX "SSIPSubmission_userId_createdAt_idx" ON "SSIPSubmission"("userId", "createdAt");

ALTER TABLE "SSIPSettings" ADD CONSTRAINT "SSIPSettings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SSIPSubmission" ADD CONSTRAINT "SSIPSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
