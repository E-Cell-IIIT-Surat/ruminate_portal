ALTER TABLE "Workshop" ADD COLUMN "bannerUrl" TEXT;

CREATE TABLE "UdbhavReviewerAssignment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UdbhavReviewerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UdbhavReviewerAssignment_submissionId_reviewerId_key"
  ON "UdbhavReviewerAssignment"("submissionId", "reviewerId");
CREATE INDEX "UdbhavReviewerAssignment_reviewerId_status_idx"
  ON "UdbhavReviewerAssignment"("reviewerId", "status");

ALTER TABLE "UdbhavReviewerAssignment"
  ADD CONSTRAINT "UdbhavReviewerAssignment_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "UdbhavSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UdbhavReviewerAssignment"
  ADD CONSTRAINT "UdbhavReviewerAssignment_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UdbhavReviewerAssignment"
  ADD CONSTRAINT "UdbhavReviewerAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
