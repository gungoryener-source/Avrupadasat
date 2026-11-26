-- CreateEnum
CREATE TYPE "ImporterModel" AS ENUM ('OWN_DE_COMPANY', 'TR_WITH_REPRESENTATIVE');

-- CreateTable
CREATE TABLE "EuResponsibleParty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "importerModel" "ImporterModel" NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "responsibleAddress" TEXT NOT NULL,
    "responsibleEmail" TEXT NOT NULL,
    "lucidNumber" TEXT,
    "packagingRepresentative" TEXT,
    "sellsElectrical" BOOLEAN NOT NULL DEFAULT false,
    "weeeNumber" TEXT,
    "weeeRepresentative" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EuResponsibleParty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EuResponsibleParty_tenantId_key" ON "EuResponsibleParty"("tenantId");

-- AddForeignKey
ALTER TABLE "EuResponsibleParty" ADD CONSTRAINT "EuResponsibleParty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

