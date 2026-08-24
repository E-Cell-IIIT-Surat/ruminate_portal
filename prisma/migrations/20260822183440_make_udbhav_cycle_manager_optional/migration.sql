-- DropForeignKey
ALTER TABLE "UdbhavCycle" DROP CONSTRAINT "UdbhavCycle_managedById_fkey";

-- AlterTable
ALTER TABLE "UdbhavCycle" ALTER COLUMN "managedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UdbhavCycle" ADD CONSTRAINT "UdbhavCycle_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
