-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('PARTY', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "CampaignPostType" AS ENUM ('POSTER', 'VIDEO', 'ANNOUNCEMENT', 'WORK_UPDATE', 'PUBLIC_MESSAGE');

-- CreateEnum
CREATE TYPE "CampaignEventType" AS ENUM ('PUBLIC_MEETING', 'RALLY', 'PROGRAM');

-- CreateTable
CREATE TABLE "CandidateAnnouncement" (
    "id" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "position" TEXT NOT NULL,
    "constituency" TEXT NOT NULL,
    "partyStatus" "PartyStatus" NOT NULL DEFAULT 'PARTY',
    "partyName" TEXT,
    "message" TEXT NOT NULL,
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPost" (
    "id" TEXT NOT NULL,
    "type" "CampaignPostType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrl" TEXT,
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CampaignEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "details" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateAnnouncement_isPublished_publishAt_idx" ON "CandidateAnnouncement"("isPublished", "publishAt");

-- CreateIndex
CREATE INDEX "CampaignPost_isPublished_publishAt_idx" ON "CampaignPost"("isPublished", "publishAt");

-- CreateIndex
CREATE INDEX "CampaignEvent_isActive_eventDate_idx" ON "CampaignEvent"("isActive", "eventDate");

-- AddForeignKey
ALTER TABLE "CandidateAnnouncement" ADD CONSTRAINT "CandidateAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
