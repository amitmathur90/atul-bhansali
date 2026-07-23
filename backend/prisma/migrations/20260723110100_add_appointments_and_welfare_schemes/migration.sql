-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "relatedAppointmentId" TEXT;

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelfareScheme" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelfareScheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_citizenId_idx" ON "Appointment"("citizenId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "WelfareScheme_isActive_idx" ON "WelfareScheme"("isActive");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
