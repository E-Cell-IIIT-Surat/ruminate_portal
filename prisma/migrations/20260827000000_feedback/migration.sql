CREATE TYPE "public"."FeedbackType" AS ENUM ('BUG', 'SUGGESTION', 'OTHER');

CREATE TABLE "public"."Feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "type" "public"."FeedbackType" NOT NULL,
  "message" TEXT NOT NULL,
  "pagePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_createdAt_idx" ON "public"."Feedback"("createdAt");
CREATE INDEX "Feedback_type_createdAt_idx" ON "public"."Feedback"("type", "createdAt");

ALTER TABLE "public"."Feedback"
  ADD CONSTRAINT "Feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
