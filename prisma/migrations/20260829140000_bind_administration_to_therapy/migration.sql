-- Bind a medication administration to the exact prescription. The previous natural key merged
-- two distinct prescriptions when patient, drug display name and fascia happened to match.
ALTER TABLE "MedicationAdministration" ADD COLUMN "therapyId" TEXT;

DROP INDEX "MedicationAdministration_patientId_farmacoNome_date_fascia_key";

CREATE UNIQUE INDEX "MedicationAdministration_therapyId_date_fascia_key"
ON "MedicationAdministration"("therapyId", "date", "fascia");

CREATE INDEX "MedicationAdministration_therapyId_date_idx"
ON "MedicationAdministration"("therapyId", "date");

ALTER TABLE "MedicationAdministration"
ADD CONSTRAINT "MedicationAdministration_therapyId_fkey"
FOREIGN KEY ("therapyId") REFERENCES "PatientTherapy"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
