-- AlterTable
ALTER TABLE "ArchitectureElement" ADD COLUMN     "networkId" UUID;

-- CreateTable
CREATE TABLE "ArchitectureNetwork" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vlanId" INTEGER NOT NULL,
    "cidr" TEXT NOT NULL,
    "gateway" TEXT,
    "dhcpRangeStart" TEXT,
    "dhcpRangeEnd" TEXT,

    CONSTRAINT "ArchitectureNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureNetwork_architectureId_idx" ON "ArchitectureNetwork"("architectureId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureNetwork_architectureId_key_key" ON "ArchitectureNetwork"("architectureId", "key");

-- CreateIndex
CREATE INDEX "ArchitectureElement_networkId_idx" ON "ArchitectureElement"("networkId");

-- AddForeignKey
ALTER TABLE "ArchitectureElement" ADD CONSTRAINT "ArchitectureElement_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "ArchitectureNetwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureNetwork" ADD CONSTRAINT "ArchitectureNetwork_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
