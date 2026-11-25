-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "pushToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_pushToken_key" ON "ApiToken"("pushToken");

