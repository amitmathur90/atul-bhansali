-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_email_key" ON "StaffMember"("email");
