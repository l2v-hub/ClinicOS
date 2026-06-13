-- CreateTable
CREATE TABLE "PatientDiaryEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normale',
    "status" TEXT NOT NULL DEFAULT 'aperta',
    "entryDateTime" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "idempotencyKey" TEXT,
    "maxFiles" INTEGER NOT NULL,
    "maxTotalBytes" INTEGER NOT NULL,
    "totalBytes" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "resultData" JSONB,
    "model" TEXT,
    "schemaVersion" TEXT,
    "promptVersion" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportDocument" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "logicalDoc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientDiaryEntry_patientId_idx" ON "PatientDiaryEntry"("patientId");

-- CreateIndex
CREATE INDEX "PatientDiaryEntry_authorType_idx" ON "PatientDiaryEntry"("authorType");

-- CreateIndex
CREATE INDEX "PatientDiaryEntry_entryDateTime_idx" ON "PatientDiaryEntry"("entryDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_idempotencyKey_key" ON "ImportJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_expiresAt_idx" ON "ImportJob"("expiresAt");

-- CreateIndex
CREATE INDEX "ImportDocument_jobId_idx" ON "ImportDocument"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportDocument_jobId_sha256_key" ON "ImportDocument"("jobId", "sha256");

-- AddForeignKey
ALTER TABLE "PatientDiaryEntry" ADD CONSTRAINT "PatientDiaryEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportDocument" ADD CONSTRAINT "ImportDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
