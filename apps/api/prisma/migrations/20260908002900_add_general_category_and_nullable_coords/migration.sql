-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "subcategory" TEXT,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;
