-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN     "imageKey" TEXT,
ADD COLUMN     "imageType" TEXT,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE INDEX "Document_taskId_idx" ON "Document"("taskId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Eski tek ek alanını yeni ilişkiye taşı
UPDATE "Document" d SET "taskId" = t."id" FROM "Task" t WHERE t."documentId" = d."id";
