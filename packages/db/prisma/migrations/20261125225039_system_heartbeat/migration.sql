-- CreateTable
CREATE TABLE "SystemHeartbeat" (
    "name" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemHeartbeat_pkey" PRIMARY KEY ("name")
);

