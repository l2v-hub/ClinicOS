CREATE TABLE "TherapyAdministrationReceipt" (
    "actorId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TherapyAdministrationReceipt_pkey" PRIMARY KEY ("actorId", "requestId")
);
CREATE INDEX "TherapyAdministrationReceipt_patientId_idx" ON "TherapyAdministrationReceipt"("patientId");
ALTER TABLE "TherapyAdministrationReceipt" ADD CONSTRAINT "TherapyAdministrationReceipt_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
