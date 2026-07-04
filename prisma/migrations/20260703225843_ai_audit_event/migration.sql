-- CreateTable
CREATE TABLE "AiAuditEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatorRole" TEXT NOT NULL,
    "patientId" TEXT,
    "actionType" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "fields" TEXT[],
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAuditEvent_operatorId_createdAt_idx" ON "AiAuditEvent"("operatorId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAuditEvent_patientId_createdAt_idx" ON "AiAuditEvent"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAuditEvent_outcome_idx" ON "AiAuditEvent"("outcome");
