-- AlterTable
ALTER TABLE "Note" ADD COLUMN "color" TEXT DEFAULT '#ffffff';

-- AlterTable
ALTER TABLE "Wall" ADD COLUMN "backgroundColor" TEXT DEFAULT '#f0f0f0';
ALTER TABLE "Wall" ADD COLUMN "backgroundImage" TEXT;
