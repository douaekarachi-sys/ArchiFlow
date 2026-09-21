-- CreateTable
CREATE TABLE "ArchitectureBuilding" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ArchitectureBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureFloor" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "buildingId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ArchitectureFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureRoom" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "floorId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ArchitectureRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureRack" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL DEFAULT 42,

    CONSTRAINT "ArchitectureRack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureBuilding_architectureId_idx" ON "ArchitectureBuilding"("architectureId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureBuilding_architectureId_key_key" ON "ArchitectureBuilding"("architectureId", "key");

-- CreateIndex
CREATE INDEX "ArchitectureFloor_architectureId_idx" ON "ArchitectureFloor"("architectureId");

-- CreateIndex
CREATE INDEX "ArchitectureFloor_buildingId_idx" ON "ArchitectureFloor"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureFloor_architectureId_key_key" ON "ArchitectureFloor"("architectureId", "key");

-- CreateIndex
CREATE INDEX "ArchitectureRoom_architectureId_idx" ON "ArchitectureRoom"("architectureId");

-- CreateIndex
CREATE INDEX "ArchitectureRoom_floorId_idx" ON "ArchitectureRoom"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureRoom_architectureId_key_key" ON "ArchitectureRoom"("architectureId", "key");

-- CreateIndex
CREATE INDEX "ArchitectureRack_architectureId_idx" ON "ArchitectureRack"("architectureId");

-- CreateIndex
CREATE INDEX "ArchitectureRack_roomId_idx" ON "ArchitectureRack"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureRack_architectureId_key_key" ON "ArchitectureRack"("architectureId", "key");

-- AddForeignKey
ALTER TABLE "ArchitectureBuilding" ADD CONSTRAINT "ArchitectureBuilding_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureFloor" ADD CONSTRAINT "ArchitectureFloor_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureFloor" ADD CONSTRAINT "ArchitectureFloor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "ArchitectureBuilding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureRoom" ADD CONSTRAINT "ArchitectureRoom_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureRoom" ADD CONSTRAINT "ArchitectureRoom_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "ArchitectureFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureRack" ADD CONSTRAINT "ArchitectureRack_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureRack" ADD CONSTRAINT "ArchitectureRack_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ArchitectureRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
