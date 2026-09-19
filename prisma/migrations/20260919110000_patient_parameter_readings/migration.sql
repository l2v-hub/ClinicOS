-- Append-only grouped observations, separate from replaceable legacy Cartella JSON.
CREATE TABLE "PatientParameterReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "measuredAt" TIMESTAMPTZ(3) NOT NULL,
    "values" JSONB NOT NULL,
    "authorOperatorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientParameterReading_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientParameterReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PatientParameterReading_patientId_requestId_key" ON "PatientParameterReading"("patientId", "requestId");
CREATE INDEX "PatientParameterReading_patientId_measuredAt_id_idx" ON "PatientParameterReading"("patientId", "measuredAt", "id");
