ALTER TABLE "PatientDocument" ADD COLUMN "sourceManifest" JSONB;
ALTER TABLE "PatientIntakeDraft" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ImportJob" ADD COLUMN "manifest" JSONB, ADD COLUMN "manifestRevision" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "maxPages" INTEGER, ADD COLUMN "runToken" TEXT, ADD COLUMN "runRevision" INTEGER,
 ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);
ALTER TABLE "ImportDocument" ADD COLUMN "pageCount" INTEGER;
ALTER TABLE "ImportJob" ADD COLUMN "resultSummary" JSONB;
CREATE INDEX "ImportJob_status_leaseExpiresAt_idx" ON "ImportJob"("status", "leaseExpiresAt");
CREATE TABLE "ImportProcessingUnit" (
 "id" TEXT NOT NULL PRIMARY KEY, "jobId" TEXT NOT NULL, "kind" TEXT NOT NULL, "unitKey" TEXT NOT NULL,
 "inputHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "runtimeJobId" TEXT,
 "runtimeAttempt" INTEGER NOT NULL DEFAULT 0, "outputHash" TEXT, "result" JSONB, "errorCode" TEXT, "errorMessage" TEXT,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ImportProcessingUnit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ImportProcessingUnit_jobId_kind_unitKey_inputHash_key" ON "ImportProcessingUnit"("jobId","kind","unitKey","inputHash");
CREATE INDEX "ImportProcessingUnit_jobId_status_idx" ON "ImportProcessingUnit"("jobId","status");
CREATE TABLE "ImportMutation" (
 "id" TEXT NOT NULL PRIMARY KEY, "jobId" TEXT NOT NULL, "requestId" TEXT NOT NULL, "action" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL, "resultingRevision" INTEGER NOT NULL, "outcomes" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ImportMutation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ImportMutation_jobId_requestId_key" ON "ImportMutation"("jobId","requestId");
