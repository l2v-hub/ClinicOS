-- UX2 W8 (owner decision 2026-10-03): urgent diary entries and handovers stay "urgente attiva"
-- until the first «Ho capito» by an operator other than the author. Additive only: one nullable
-- column (new diary entries record their author's operator id) and one append-only table for the
-- handover acknowledgements. Existing rows (including Consegna.stato values) are NOT modified.

-- AlterTable
ALTER TABLE "PatientDiaryEntry" ADD COLUMN "authorId" TEXT;

-- CreateTable
CREATE TABLE "ConsegnaAcknowledgement" (
    "id" TEXT NOT NULL,
    "consegnaId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "operatorRole" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsegnaAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsegnaAcknowledgement_operatorId_acknowledgedAt_idx" ON "ConsegnaAcknowledgement"("operatorId", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "ConsegnaAcknowledgement_patientId_idx" ON "ConsegnaAcknowledgement"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsegnaAcknowledgement_consegnaId_operatorId_key" ON "ConsegnaAcknowledgement"("consegnaId", "operatorId");

-- AddForeignKey
ALTER TABLE "ConsegnaAcknowledgement" ADD CONSTRAINT "ConsegnaAcknowledgement_consegnaId_fkey" FOREIGN KEY ("consegnaId") REFERENCES "Consegna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Append-only guard (same rule as DiaryEntryAcknowledgement): UPDATE/TRUNCATE refused; DELETE only
-- as the FK cascade of the handover itself being deleted.
CREATE FUNCTION clinicos_consegna_ack_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD; -- cascade from the deletion of the handover
  END IF;
  RAISE EXCEPTION 'ConsegnaAcknowledgement is append-only (% refused)', TG_OP USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "ConsegnaAcknowledgement_no_update" BEFORE UPDATE ON "ConsegnaAcknowledgement"
  FOR EACH ROW EXECUTE FUNCTION clinicos_consegna_ack_append_only();
CREATE TRIGGER "ConsegnaAcknowledgement_no_delete" BEFORE DELETE ON "ConsegnaAcknowledgement"
  FOR EACH ROW EXECUTE FUNCTION clinicos_consegna_ack_append_only();
CREATE TRIGGER "ConsegnaAcknowledgement_no_truncate" BEFORE TRUNCATE ON "ConsegnaAcknowledgement"
  FOR EACH STATEMENT EXECUTE FUNCTION clinicos_consegna_ack_append_only();
