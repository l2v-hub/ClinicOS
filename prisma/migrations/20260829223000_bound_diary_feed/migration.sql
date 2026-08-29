DROP INDEX IF EXISTS "PatientDiaryEntry_patientId_entryDateTime_idx";

CREATE INDEX "PatientDiaryEntry_patientId_entryDateTime_id_idx"
ON "PatientDiaryEntry"("patientId", "entryDateTime", "id");

CREATE INDEX "PatientDiaryEntry_patientId_authorType_entryDateTime_id_idx"
ON "PatientDiaryEntry"("patientId", "authorType", "entryDateTime", "id");
