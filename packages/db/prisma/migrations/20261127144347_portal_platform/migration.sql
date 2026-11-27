-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ATTENTION');

-- CreateEnum
CREATE TYPE "DocReview" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'WAITING_CUSTOMER', 'WAITING_TEAM', 'RESOLVED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentKind" ADD VALUE 'VERGI';
ALTER TYPE "DocumentKind" ADD VALUE 'MUHASEBE';
ALTER TYPE "DocumentKind" ADD VALUE 'SOZLESME';

-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'SUPPORT';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "review" "DocReview" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN     "lowStockAt" INTEGER;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "companyForm" "CompanyForm",
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "registerCourt" TEXT,
ADD COLUMN     "registerNumber" TEXT,
ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "representatives" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "vatId" TEXT;

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENEL',
    "assigneeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "customerAction" BOOLEAN NOT NULL DEFAULT false,
    "customerUpdate" TEXT,
    "internalNote" TEXT,
    "documentId" TEXT,
    "remindedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxFiling" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "documentId" TEXT,
    "remindedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxFiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_tenantId_status_lastActivity_idx" ON "Ticket"("tenantId", "status", "lastActivity");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_status_idx" ON "Ticket"("assigneeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_number_key" ON "Ticket"("number");

-- CreateIndex
CREATE INDEX "TicketMessage_tenantId_ticketId_createdAt_idx" ON "TicketMessage"("tenantId", "ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_dueAt_idx" ON "Task"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "TaxFiling_tenantId_dueAt_idx" ON "TaxFiling"("tenantId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxFiling_tenantId_kind_period_key" ON "TaxFiling"("tenantId", "kind", "period");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxFiling" ADD CONSTRAINT "TaxFiling_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Mevcut belgeler önceden kabul edilmiş sayılır
UPDATE "Document" SET "review" = 'APPROVED';
