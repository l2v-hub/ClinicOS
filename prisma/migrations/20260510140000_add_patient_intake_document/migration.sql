-- CreateTable
CREATE TABLE "PatientIntakeDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileData" TEXT NOT NULL,
    "ocrText" TEXT,
    "extractedData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "patientId" TEXT,
    "operatoreNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientIntakeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientIntakeDocument_patientId_idx" ON "PatientIntakeDocument"("patientId");

-- CreateIndex
CREATE INDEX "PatientIntakeDocument_status_idx" ON "PatientIntakeDocument"("status");

-- AddForeignKey
ALTER TABLE "PatientIntakeDocument" ADD CONSTRAINT "PatientIntakeDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
