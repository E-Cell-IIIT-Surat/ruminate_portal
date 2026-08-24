-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UdbhavCycleStatus" AS ENUM ('SCHEDULED', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "UdbhavSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'ON_HOLD', 'ACTION_NEEDED', 'PITCH_SCHEDULED', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "WorkshopBooking" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "workshopId" TEXT;

-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "batch" TEXT,
    "year" TEXT,
    "venue" TEXT,
    "capacity" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "registrationOpenAt" TIMESTAMP(3),
    "registrationCloseAt" TIMESTAMP(3),
    "status" "WorkshopStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UdbhavCycle" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" "UdbhavCycleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "managedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UdbhavCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UdbhavSubmission" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamMembers" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "estimatedBudget" DECIMAL(12,2),
    "distributionPlan" TEXT NOT NULL,
    "milestones" TEXT,
    "supportingFileKey" TEXT,
    "status" "UdbhavSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" TEXT NOT NULL DEFAULT 'Submission',
    "totalScore" DECIMAL(6,2),
    "secretMessage" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UdbhavSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UdbhavReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "creativity" DECIMAL(5,2) NOT NULL,
    "problemUnderstanding" DECIMAL(5,2) NOT NULL,
    "innovation" DECIMAL(5,2) NOT NULL,
    "execution" DECIMAL(5,2) NOT NULL,
    "feasibility" DECIMAL(5,2) NOT NULL,
    "scalability" DECIMAL(5,2) NOT NULL,
    "impact" DECIMAL(5,2) NOT NULL,
    "sustainability" DECIMAL(5,2) NOT NULL,
    "presentation" DECIMAL(5,2) NOT NULL,
    "completeness" DECIMAL(5,2) NOT NULL,
    "totalScore" DECIMAL(6,2) NOT NULL,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UdbhavReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UdbhavStatusHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fromStatus" "UdbhavSubmissionStatus",
    "toStatus" "UdbhavSubmissionStatus" NOT NULL,
    "stage" TEXT,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UdbhavStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_slug_key" ON "Workshop"("slug");

-- CreateIndex
CREATE INDEX "Workshop_status_startsAt_idx" ON "Workshop"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Workshop_year_batch_idx" ON "Workshop"("year", "batch");

-- CreateIndex
CREATE INDEX "UdbhavCycle_status_opensAt_closesAt_idx" ON "UdbhavCycle"("status", "opensAt", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "UdbhavCycle_year_month_key" ON "UdbhavCycle"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "UdbhavSubmission_referenceId_key" ON "UdbhavSubmission"("referenceId");

-- CreateIndex
CREATE INDEX "UdbhavSubmission_cycleId_status_idx" ON "UdbhavSubmission"("cycleId", "status");

-- CreateIndex
CREATE INDEX "UdbhavSubmission_leaderId_createdAt_idx" ON "UdbhavSubmission"("leaderId", "createdAt");

-- CreateIndex
CREATE INDEX "UdbhavReview_reviewerId_submittedAt_idx" ON "UdbhavReview"("reviewerId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UdbhavReview_submissionId_reviewerId_key" ON "UdbhavReview"("submissionId", "reviewerId");

-- CreateIndex
CREATE INDEX "UdbhavStatusHistory_submissionId_createdAt_idx" ON "UdbhavStatusHistory"("submissionId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkshopBooking" ADD CONSTRAINT "WorkshopBooking_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavCycle" ADD CONSTRAINT "UdbhavCycle_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavSubmission" ADD CONSTRAINT "UdbhavSubmission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "UdbhavCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavSubmission" ADD CONSTRAINT "UdbhavSubmission_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavReview" ADD CONSTRAINT "UdbhavReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "UdbhavSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavReview" ADD CONSTRAINT "UdbhavReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavStatusHistory" ADD CONSTRAINT "UdbhavStatusHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "UdbhavSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdbhavStatusHistory" ADD CONSTRAINT "UdbhavStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
