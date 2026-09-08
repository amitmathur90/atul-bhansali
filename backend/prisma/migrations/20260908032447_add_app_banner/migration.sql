-- CreateTable
CREATE TABLE "AppBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppBanner_isActive_idx" ON "AppBanner"("isActive");

-- AddForeignKey
ALTER TABLE "AppBanner" ADD CONSTRAINT "AppBanner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

