-- AlterTable
ALTER TABLE "MarketplaceConnection" ADD COLUMN     "externalAccount" TEXT;

-- CreateIndex
CREATE INDEX "MarketplaceConnection_channel_externalAccount_idx" ON "MarketplaceConnection"("channel", "externalAccount");
