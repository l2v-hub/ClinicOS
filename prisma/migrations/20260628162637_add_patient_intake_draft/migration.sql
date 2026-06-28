-- CreateTable
CREATE TABLE "PatientIntakeDraft" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "data" JSONB NOT NULL DEFAULT '{}',
    "importJobId" TEXT,
    "createdById" TEXT,
    "confirmedPatientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "PatientIntakeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientIntakeDraft_status_idx" ON "PatientIntakeDraft"("status");

-- CreateIndex
CREATE INDEX "PatientIntakeDraft_createdById_idx" ON "PatientIntakeDraft"("createdById");
