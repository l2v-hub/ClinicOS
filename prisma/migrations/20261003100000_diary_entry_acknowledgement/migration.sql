-- UX direct-access cycle (owner decision 2026-10-03): per-reader «Presa visione» on URGENT diary
-- entries. Additive: a new table, no change to existing rows.
-- One row per (entry, operator), written once. Append-only at the DATABASE level: UPDATE and
-- TRUNCATE are refused; DELETE is refused unless it is the FK cascade of the diary entry itself
-- being deleted (pg_trigger_depth() > 1 inside the RI cascade), so the entry's history stays
-- consistent with the entry.

-- CreateTable
CREATE TABLE "DiaryEntryAcknowledgement" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "operatorRole" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryEntryAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryEntryAcknowledgement_operatorId_acknowledgedAt_idx" ON "DiaryEntryAcknowledgement"("operatorId", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "DiaryEntryAcknowledgement_patientId_idx" ON "DiaryEntryAcknowledgement"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntryAcknowledgement_entryId_operatorId_key" ON "DiaryEntryAcknowledgement"("entryId", "operatorId");

-- AddForeignKey
ALTER TABLE "DiaryEntryAcknowledgement" ADD CONSTRAINT "DiaryEntryAcknowledgement_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PatientDiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Append-only guard
CREATE FUNCTION clinicos_diary_ack_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD; -- cascade from the deletion of the diary entry
  END IF;
  RAISE EXCEPTION 'DiaryEntryAcknowledgement is append-only (% refused)', TG_OP USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "DiaryEntryAcknowledgement_no_update" BEFORE UPDATE ON "DiaryEntryAcknowledgement"
  FOR EACH ROW EXECUTE FUNCTION clinicos_diary_ack_append_only();
CREATE TRIGGER "DiaryEntryAcknowledgement_no_delete" BEFORE DELETE ON "DiaryEntryAcknowledgement"
  FOR EACH ROW EXECUTE FUNCTION clinicos_diary_ack_append_only();
CREATE TRIGGER "DiaryEntryAcknowledgement_no_truncate" BEFORE TRUNCATE ON "DiaryEntryAcknowledgement"
  FOR EACH STATEMENT EXECUTE FUNCTION clinicos_diary_ack_append_only();
