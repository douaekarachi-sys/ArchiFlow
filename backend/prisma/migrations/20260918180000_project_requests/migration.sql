-- CreateTable
CREATE TABLE "ProjectRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "location" TEXT,
    "projectType" TEXT,
    "siteCount" INTEGER,
    "totalEmployees" INTEGER,
    "workstationCount" INTEGER,
    "concurrentUsers" INTEGER,
    "serverCount" INTEGER,
    "serverPhysical" BOOLEAN,
    "serverVirtual" BOOLEAN,
    "storageNeed" TEXT,
    "backupNeed" TEXT,
    "virtualization" TEXT,
    "highAvailability" BOOLEAN,
    "serverNotes" TEXT,
    "wifi" BOOLEAN,
    "wifiApCount" INTEGER,
    "voip" BOOLEAN,
    "cctv" BOOLEAN,
    "printers" BOOLEAN,
    "iot" BOOLEAN,
    "internetAccess" BOOLEAN,
    "vpn" BOOLEAN,
    "remoteSites" BOOLEAN,
    "dmz" BOOLEAN,
    "lan" BOOLEAN,
    "wan" BOOLEAN,
    "networkNotes" TEXT,
    "firewall" BOOLEAN,
    "idsIps" BOOLEAN,
    "segmentation" BOOLEAN,
    "vlan" BOOLEAN,
    "accessControl" BOOLEAN,
    "haSecurity" BOOLEAN,
    "securityNotes" TEXT,
    "vendors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vendorNotes" TEXT,
    "freeTextNeed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestBuilding" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "areaM2" DOUBLE PRECISION,
    "floors" INTEGER,
    "description" TEXT,

    CONSTRAINT "RequestBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDepartment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "employees" INTEGER,
    "workstations" INTEGER,
    "location" TEXT,
    "notes" TEXT,

    CONSTRAINT "RequestDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectComment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRequest_projectId_key" ON "ProjectRequest"("projectId");

-- CreateIndex
CREATE INDEX "ProjectRequest_organizationId_idx" ON "ProjectRequest"("organizationId");

-- CreateIndex
CREATE INDEX "RequestBuilding_requestId_idx" ON "RequestBuilding"("requestId");

-- CreateIndex
CREATE INDEX "RequestBuilding_organizationId_idx" ON "RequestBuilding"("organizationId");

-- CreateIndex
CREATE INDEX "RequestDepartment_requestId_idx" ON "RequestDepartment"("requestId");

-- CreateIndex
CREATE INDEX "RequestDepartment_organizationId_idx" ON "RequestDepartment"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectComment_projectId_createdAt_idx" ON "ProjectComment"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectComment_organizationId_idx" ON "ProjectComment"("organizationId");

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestBuilding" ADD CONSTRAINT "RequestBuilding_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ProjectRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDepartment" ADD CONSTRAINT "RequestDepartment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ProjectRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
