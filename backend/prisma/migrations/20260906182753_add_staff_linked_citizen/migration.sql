-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN     "linkedCitizenId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_linkedCitizenId_key" ON "StaffMember"("linkedCitizenId");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_linkedCitizenId_fkey" FOREIGN KEY ("linkedCitizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
