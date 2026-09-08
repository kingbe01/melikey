-- DropForeignKey
ALTER TABLE "Likey" DROP CONSTRAINT "Likey_businessId_fkey";

-- AlterTable
ALTER TABLE "Likey" ADD COLUMN     "mediaItemId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "creator" TEXT,
    "year" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Likey_mediaItemId_idx" ON "Likey"("mediaItemId");

-- AddForeignKey
ALTER TABLE "Likey" ADD CONSTRAINT "Likey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likey" ADD CONSTRAINT "Likey_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
