ALTER TABLE "TeamMember"
ADD COLUMN "role" TEXT,
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "teamId" ORDER BY "createdAt", "id") AS position
  FROM "TeamMember"
)
UPDATE "TeamMember" AS member
SET "order" = ordered.position
FROM ordered
WHERE member."id" = ordered."id";

CREATE INDEX "TeamMember_teamId_order_idx" ON "TeamMember"("teamId", "order");
