-- Indici additivi per le liste cliniche piu' interrogate (pazienti, consegne, note) e per le
-- query che filtrano per paziente + data (somministrazioni farmaci, diario paziente).
-- Solo CREATE INDEX: nessuna riga esistente viene modificata.

CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

CREATE INDEX "Consegna_createdAt_idx" ON "Consegna"("createdAt");

CREATE INDEX "Nota_createdAt_idx" ON "Nota"("createdAt");

CREATE INDEX "MedicationAdministration_patientId_date_idx" ON "MedicationAdministration"("patientId", "date");

CREATE INDEX "PatientDiaryEntry_patientId_entryDateTime_idx" ON "PatientDiaryEntry"("patientId", "entryDateTime");
