-- Additive indexes matching the bounded therapy-slot query introduced in quality loop 2.
-- No existing rows are changed. Deployment must still monitor lock duration on a large database.

CREATE INDEX "MedicationAdministration_date_patientId_idx"
ON "MedicationAdministration"("date", "patientId");

CREATE INDEX "PatientTherapy_stato_tipo_dataSomministrazione_idx"
ON "PatientTherapy"("stato", "tipo", "dataSomministrazione");

CREATE INDEX "PatientTherapy_stato_dataInizio_dataFine_idx"
ON "PatientTherapy"("stato", "dataInizio", "dataFine");

CREATE INDEX "PatientRoomAssignment_patientId_startDate_endDate_idx"
ON "PatientRoomAssignment"("patientId", "startDate", "endDate");
