CREATE INDEX "MedicationAdministration_patient_history_idx"
ON "MedicationAdministration"("patientId", "date", "createdAt", "id");
