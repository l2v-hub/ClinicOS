-- Missing birth dates remain unknown; existing identities and references are unchanged.
ALTER TABLE "Patient" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
CREATE INDEX "PatientIntakeDraft_confirmedPatientId_idx" ON "PatientIntakeDraft"("confirmedPatientId");
