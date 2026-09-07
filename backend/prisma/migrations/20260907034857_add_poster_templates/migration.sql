-- CreateTable
CREATE TABLE "PosterTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "selfieX" DOUBLE PRECISION NOT NULL,
    "selfieY" DOUBLE PRECISION NOT NULL,
    "selfieSize" DOUBLE PRECISION NOT NULL,
    "nameX" DOUBLE PRECISION NOT NULL,
    "nameY" DOUBLE PRECISION NOT NULL,
    "nameFontSize" INTEGER NOT NULL DEFAULT 32,
    "nameColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "nameAlign" TEXT NOT NULL DEFAULT 'center',
    "nameMaxWidth" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosterGeneration" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resultUrl" TEXT NOT NULL,
    "publishedPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosterGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosterTemplate_isActive_idx" ON "PosterTemplate"("isActive");

-- CreateIndex
CREATE INDEX "PosterGeneration_templateId_idx" ON "PosterGeneration"("templateId");

-- CreateIndex
CREATE INDEX "PosterGeneration_citizenId_idx" ON "PosterGeneration"("citizenId");

-- AddForeignKey
ALTER TABLE "PosterTemplate" ADD CONSTRAINT "PosterTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterGeneration" ADD CONSTRAINT "PosterGeneration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PosterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterGeneration" ADD CONSTRAINT "PosterGeneration_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
