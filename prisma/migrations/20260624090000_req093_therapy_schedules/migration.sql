-- REQ-093 (BUG-055): structured drug/package + per-time exact-fraction dosing.
-- Additive only: new nullable columns on PatientTherapy + new TherapySchedule table.

-- AlterTable: structured commercial strength / form / divisibility config
ALTER TABLE "PatientTherapy" ADD COLUMN "commercialStrengthValue" DOUBLE PRECISION;
ALTER TABLE "PatientTherapy" ADD COLUMN "commercialStrengthUnit" TEXT;
ALTER TABLE "PatientTherapy" ADD COLUMN "pharmaceuticalForm" TEXT;
ALTER TABLE "PatientTherapy" ADD COLUMN "allowedFractions" TEXT;
ALTER TABLE "PatientTherapy" ADD COLUMN "drugPackageRef" TEXT;

-- CreateTable: per-administration-time prescribed quantity as an exact fraction
CREATE TABLE "TherapySchedule" (
    "id" TEXT NOT NULL,
    "therapyId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "fascia" TEXT NOT NULL,
    "quantityNumerator" INTEGER NOT NULL DEFAULT 1,
    "quantityDenominator" INTEGER NOT NULL DEFAULT 1,
    "administrationUnit" TEXT NOT NULL DEFAULT 'compressa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TherapySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapySchedule_therapyId_idx" ON "TherapySchedule"("therapyId");

-- AddForeignKey
ALTER TABLE "TherapySchedule" ADD CONSTRAINT "TherapySchedule_therapyId_fkey" FOREIGN KEY ("therapyId") REFERENCES "PatientTherapy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
