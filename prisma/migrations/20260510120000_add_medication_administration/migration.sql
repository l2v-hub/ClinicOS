-- CreateTable
CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "farmacoNome" TEXT NOT NULL,
    "farmacoDose" TEXT NOT NULL,
    "farmacoVia" TEXT NOT NULL DEFAULT 'orale',
    "date" TEXT NOT NULL,
    "fascia" TEXT NOT NULL,
    "ora" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'da_erogare',
    "operatoreId" TEXT,
    "operatoreNome" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "motivo" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicationAdministration_patientId_farmacoNome_date_fascia_key" ON "MedicationAdministration"("patientId", "farmacoNome", "date", "fascia");

-- CreateIndex
CREATE INDEX "MedicationAdministration_date_fascia_idx" ON "MedicationAdministration"("date", "fascia");

-- CreateIndex
CREATE INDEX "MedicationAdministration_patientId_idx" ON "MedicationAdministration"("patientId");

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
