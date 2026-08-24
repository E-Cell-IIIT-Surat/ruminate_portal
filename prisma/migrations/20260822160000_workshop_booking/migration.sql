-- CreateEnum
CREATE TYPE "public"."WorkshopBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."WorkshopBooking" (
    "id" TEXT NOT NULL,
    "workshop" TEXT NOT NULL DEFAULT 'financial-literacy',
    "name" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "studentId" TEXT,
    "department" TEXT,
    "status" "public"."WorkshopBookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkshopBooking_workshop_createdAt_idx" ON "public"."WorkshopBooking"("workshop", "createdAt");

-- CreateIndex
CREATE INDEX "WorkshopBooking_email_idx" ON "public"."WorkshopBooking"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopBooking_workshop_email_key" ON "public"."WorkshopBooking"("workshop", "email");
