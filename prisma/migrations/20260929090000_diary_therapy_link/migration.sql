-- Diario terapia (PR 1): collega una voce di diario alla terapia che ha prescritto.
-- Additiva: due colonne facoltative, nessun backfill. Le righe esistenti restano con NULL; in
-- Postgres i NULL sono distinti, quindi l'indice unico si crea senza conflitti su dati esistenti.

-- AlterTable
ALTER TABLE "PatientDiaryEntry" ADD COLUMN     "therapyId" TEXT,
ADD COLUMN     "therapyRequestId" TEXT;

-- CreateIndex
CREATE INDEX "PatientDiaryEntry_therapyId_idx" ON "PatientDiaryEntry"("therapyId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientDiaryEntry_patientId_therapyRequestId_key" ON "PatientDiaryEntry"("patientId", "therapyRequestId");

-- AddForeignKey
ALTER TABLE "PatientDiaryEntry" ADD CONSTRAINT "PatientDiaryEntry_therapyId_fkey" FOREIGN KEY ("therapyId") REFERENCES "PatientTherapy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
