-- Separate new plain-reading facts from existing urgency acknowledgements.
-- Existing receipts, clinical content and status/history are NOT rewritten or backfilled.
CREATE TABLE "DiaryEntryReadReceipt" (
  "id" TEXT PRIMARY KEY, "entryId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL, "operatorName" TEXT NOT NULL, "operatorRole" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiaryEntryReadReceipt_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PatientDiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DiaryEntryReadReceipt_entryId_operatorId_key" ON "DiaryEntryReadReceipt"("entryId", "operatorId");
CREATE INDEX "DiaryEntryReadReceipt_patientId_idx" ON "DiaryEntryReadReceipt"("patientId");
CREATE INDEX "DiaryEntryReadReceipt_operatorId_acknowledgedAt_idx" ON "DiaryEntryReadReceipt"("operatorId", "acknowledgedAt");
CREATE TABLE "ConsegnaReadReceipt" (
  "id" TEXT PRIMARY KEY, "consegnaId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL, "operatorName" TEXT NOT NULL, "operatorRole" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsegnaReadReceipt_consegnaId_fkey" FOREIGN KEY ("consegnaId") REFERENCES "Consegna"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConsegnaReadReceipt_consegnaId_operatorId_key" ON "ConsegnaReadReceipt"("consegnaId", "operatorId");
CREATE INDEX "ConsegnaReadReceipt_patientId_idx" ON "ConsegnaReadReceipt"("patientId");
CREATE INDEX "ConsegnaReadReceipt_operatorId_acknowledgedAt_idx" ON "ConsegnaReadReceipt"("operatorId", "acknowledgedAt");
CREATE FUNCTION clinicos_explicit_read_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Read receipts are append-only (% refused)', TG_OP USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "DiaryEntryReadReceipt_no_update" BEFORE UPDATE ON "DiaryEntryReadReceipt" FOR EACH ROW EXECUTE FUNCTION clinicos_explicit_read_append_only();
CREATE TRIGGER "DiaryEntryReadReceipt_no_delete" BEFORE DELETE ON "DiaryEntryReadReceipt" FOR EACH ROW EXECUTE FUNCTION clinicos_explicit_read_append_only();
CREATE TRIGGER "DiaryEntryReadReceipt_no_truncate" BEFORE TRUNCATE ON "DiaryEntryReadReceipt" FOR EACH STATEMENT EXECUTE FUNCTION clinicos_explicit_read_append_only();
CREATE TRIGGER "ConsegnaReadReceipt_no_update" BEFORE UPDATE ON "ConsegnaReadReceipt" FOR EACH ROW EXECUTE FUNCTION clinicos_explicit_read_append_only();
CREATE TRIGGER "ConsegnaReadReceipt_no_delete" BEFORE DELETE ON "ConsegnaReadReceipt" FOR EACH ROW EXECUTE FUNCTION clinicos_explicit_read_append_only();
CREATE TRIGGER "ConsegnaReadReceipt_no_truncate" BEFORE TRUNCATE ON "ConsegnaReadReceipt" FOR EACH STATEMENT EXECUTE FUNCTION clinicos_explicit_read_append_only();
