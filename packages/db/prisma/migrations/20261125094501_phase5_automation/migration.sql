-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'DRAFTED', 'SENT', 'CLOSED');

-- CreateTable
CREATE TABLE "CustomerMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "externalId" TEXT NOT NULL,
    "orderRef" TEXT,
    "buyerName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyDe" TEXT NOT NULL,
    "bodyTr" TEXT,
    "draftDe" TEXT,
    "draftTr" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "aiModel" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentById" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductContent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "titleTr" TEXT NOT NULL,
    "featuresTr" TEXT NOT NULL,
    "titleDe" TEXT,
    "bulletsDe" TEXT,
    "descriptionDe" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "aiModel" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerMessage_tenantId_status_receivedAt_idx" ON "CustomerMessage"("tenantId", "status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMessage_tenantId_channel_externalId_key" ON "CustomerMessage"("tenantId", "channel", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductContent_tenantId_sku_key" ON "ProductContent"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");
