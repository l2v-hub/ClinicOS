-- CreateTable
CREATE TABLE "PatientNarrativeSection" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "detectedHeading" TEXT,
    "originalText" TEXT NOT NULL DEFAULT '',
    "reviewedText" TEXT,
    "annotations" JSONB,
    "sourceReferences" JSONB,
    "importJobId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientNarrativeSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientNarrativeSection_patientId_idx" ON "PatientNarrativeSection"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientNarrativeSection_patientId_sectionKey_key" ON "PatientNarrativeSection"("patientId", "sectionKey");

-- AddForeignKey
ALTER TABLE "PatientNarrativeSection" ADD CONSTRAINT "PatientNarrativeSection_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
