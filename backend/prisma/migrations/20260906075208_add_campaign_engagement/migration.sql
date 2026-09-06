-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CAMPAIGN_POST';
ALTER TYPE "NotificationType" ADD VALUE 'CAMPAIGN_EVENT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "relatedCampaignEventId" TEXT,
ADD COLUMN     "relatedCampaignPostId" TEXT;

-- CreateTable
CREATE TABLE "CampaignPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEventInterest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFeedback" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPostLike_postId_citizenId_key" ON "CampaignPostLike"("postId", "citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEventInterest_eventId_citizenId_key" ON "CampaignEventInterest"("eventId", "citizenId");

-- CreateIndex
CREATE INDEX "CampaignFeedback_isRead_createdAt_idx" ON "CampaignFeedback"("isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "CampaignPostLike" ADD CONSTRAINT "CampaignPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CampaignPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPostLike" ADD CONSTRAINT "CampaignPostLike_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEventInterest" ADD CONSTRAINT "CampaignEventInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CampaignEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEventInterest" ADD CONSTRAINT "CampaignEventInterest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFeedback" ADD CONSTRAINT "CampaignFeedback_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
