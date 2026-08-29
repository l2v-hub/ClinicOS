-- Keyset feed: patient scope first, then the stable descending page position.
CREATE INDEX "PatientTherapy_patientId_createdAt_id_idx"
ON "PatientTherapy"("patientId", "createdAt", "id");

-- Stable nested ordering avoids sorting every schedule set in memory.
DROP INDEX "TherapySchedule_therapyId_idx";
CREATE INDEX "TherapySchedule_therapyId_time_id_idx"
ON "TherapySchedule"("therapyId", "time", "id");
