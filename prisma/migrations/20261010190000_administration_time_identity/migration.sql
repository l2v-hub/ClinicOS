-- Preserve every existing record and distinguish prescribed hours within a single band.
-- The broader unique key permits a second dose without changing any stored clinical content.
CREATE UNIQUE INDEX "MedicationAdministration_therapyId_date_fascia_ora_key"
ON "MedicationAdministration" ("therapyId", "date", "fascia", "ora");
DROP INDEX "MedicationAdministration_therapyId_date_fascia_key";
