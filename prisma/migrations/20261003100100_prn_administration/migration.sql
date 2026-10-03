-- PRN («al bisogno») administrations — UX cycle 2026-10-03, owner-approved.
-- Additive only: a new append-only table. The scheduled one-dose-per-band invariant
-- (MedicationAdministration @@unique therapyId/date/fascia) is untouched.
-- Idempotency: (operatoreId, requestId) is unique, so a retried tap never records a second dose.

-- CreateTable
CREATE TABLE "PrnAdministration" (
    "id" TEXT NOT NULL,
    "therapyId" TEXT,
    "patientId" TEXT NOT NULL,
    "farmacoNome" TEXT NOT NULL,
    "farmacoDose" TEXT NOT NULL,
    "farmacoVia" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indicazione" TEXT NOT NULL,
    "note" TEXT,
    "operatoreId" TEXT NOT NULL,
    "operatoreNome" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrnAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrnAdministration_operatoreId_requestId_key" ON "PrnAdministration"("operatoreId", "requestId");

-- CreateIndex
CREATE INDEX "PrnAdministration_patientId_date_idx" ON "PrnAdministration"("patientId", "date");

-- CreateIndex
CREATE INDEX "PrnAdministration_therapyId_date_idx" ON "PrnAdministration"("therapyId", "date");

-- AddForeignKey
ALTER TABLE "PrnAdministration" ADD CONSTRAINT "PrnAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrnAdministration" ADD CONSTRAINT "PrnAdministration_therapyId_fkey" FOREIGN KEY ("therapyId") REFERENCES "PatientTherapy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Append-only at DB level: a recorded PRN dose is never edited or truncated. The only UPDATE
-- allowed is the FK cascade that detaches a deleted prescription (therapyId → NULL, nothing else).
CREATE FUNCTION clinicos_prn_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW."therapyId" IS NULL
     AND (to_jsonb(NEW) - 'therapyId') = (to_jsonb(OLD) - 'therapyId') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'PrnAdministration is append-only (%)', TG_OP;
END;
$$;
CREATE TRIGGER "PrnAdministration_no_update" BEFORE UPDATE ON "PrnAdministration"
  FOR EACH ROW EXECUTE FUNCTION clinicos_prn_append_only();
CREATE TRIGGER "PrnAdministration_no_truncate" BEFORE TRUNCATE ON "PrnAdministration"
  FOR EACH STATEMENT EXECUTE FUNCTION clinicos_prn_append_only();
