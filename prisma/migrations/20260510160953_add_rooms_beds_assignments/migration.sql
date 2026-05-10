-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('singola', 'doppia', 'altra');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('attiva', 'inattiva', 'manutenzione');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "RoomType" NOT NULL DEFAULT 'singola',
    "piano" TEXT NOT NULL DEFAULT '',
    "reparto" TEXT NOT NULL DEFAULT '',
    "stato" "RoomStatus" NOT NULL DEFAULT 'attiva',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'libero',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRoomAssignment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientRoomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_numero_key" ON "Room"("numero");

-- CreateIndex
CREATE INDEX "Bed_roomId_idx" ON "Bed"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_roomId_label_key" ON "Bed"("roomId", "label");

-- CreateIndex
CREATE INDEX "PatientRoomAssignment_patientId_idx" ON "PatientRoomAssignment"("patientId");

-- CreateIndex
CREATE INDEX "PatientRoomAssignment_bedId_idx" ON "PatientRoomAssignment"("bedId");

-- CreateIndex
CREATE INDEX "PatientRoomAssignment_startDate_endDate_idx" ON "PatientRoomAssignment"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRoomAssignment" ADD CONSTRAINT "PatientRoomAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRoomAssignment" ADD CONSTRAINT "PatientRoomAssignment_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
