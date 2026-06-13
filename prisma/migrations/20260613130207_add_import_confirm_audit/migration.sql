-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "createdPatientId" TEXT;

-- CreateTable
CREATE TABLE "ImportAudit" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "patientId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportAudit_jobId_idx" ON "ImportAudit"("jobId");

-- CreateIndex
CREATE INDEX "ImportAudit_patientId_idx" ON "ImportAudit"("patientId");

-- CreateIndex
CREATE INDEX "ImportJob_createdPatientId_idx" ON "ImportJob"("createdPatientId");

-- AddForeignKey
ALTER TABLE "ImportAudit" ADD CONSTRAINT "ImportAudit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
