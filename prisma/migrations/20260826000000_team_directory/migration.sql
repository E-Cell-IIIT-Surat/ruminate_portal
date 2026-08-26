CREATE TYPE "public"."TeamStatus" AS ENUM ('PENDING_APPROVAL', 'PUBLIC', 'CLOSED', 'REJECTED', 'ARCHIVED');

CREATE TYPE "public"."TeamJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

ALTER TABLE "public"."Team"
  ALTER COLUMN "applicationId" DROP NOT NULL,
  ALTER COLUMN "programId" DROP NOT NULL,
  ADD COLUMN "motto" TEXT,
  ADD COLUMN "projectSummary" TEXT,
  ADD COLUMN "lookingFor" TEXT,
  ADD COLUMN "requiredMembers" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "status" "public"."TeamStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

UPDATE "public"."Team"
SET "status" = 'PUBLIC',
    "isPublic" = true,
    "approvedAt" = COALESCE("updatedAt", "createdAt")
WHERE "applicationId" IS NOT NULL;

CREATE TABLE "public"."TeamJoinRequest" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "message" TEXT,
  "status" "public"."TeamJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamJoinRequest_teamId_requesterId_key" ON "public"."TeamJoinRequest"("teamId", "requesterId");
CREATE INDEX "TeamJoinRequest_requesterId_status_idx" ON "public"."TeamJoinRequest"("requesterId", "status");
CREATE INDEX "TeamJoinRequest_teamId_status_createdAt_idx" ON "public"."TeamJoinRequest"("teamId", "status", "createdAt");
CREATE INDEX "Team_status_isPublic_updatedAt_idx" ON "public"."Team"("status", "isPublic", "updatedAt");

ALTER TABLE "public"."Team"
  ADD CONSTRAINT "Team_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."TeamJoinRequest"
  ADD CONSTRAINT "TeamJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TeamJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TeamJoinRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
