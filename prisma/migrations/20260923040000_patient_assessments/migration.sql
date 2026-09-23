CREATE FUNCTION "painad_answers_valid"(answers jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(answers) IS DISTINCT FROM 'object' THEN false ELSE
    (SELECT count(*) FROM jsonb_object_keys(answers)) = 5
    AND answers ?& ARRAY['respiration','negativeVocalization','facialExpression','bodyLanguage','consolability']
    AND NOT EXISTS (SELECT 1 FROM jsonb_each(answers) WHERE value NOT IN ('null'::jsonb,'0'::jsonb,'1'::jsonb,'2'::jsonb)) END
$$;

CREATE TABLE "PatientAssessment" (
  "id" TEXT PRIMARY KEY, "patientId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "formVersion" TEXT NOT NULL, "authorOperatorId" TEXT NOT NULL, "authorName" TEXT NOT NULL,
  "assessedAt" TIMESTAMPTZ(3) NOT NULL, "answers" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft', "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finalizedAt" TIMESTAMPTZ(3),
  "requestId" TEXT NOT NULL, "creationPayloadHash" TEXT NOT NULL,
  "finalizeRequestId" TEXT, "finalizePayloadHash" TEXT,
  "predecessorId" TEXT, "correctionReason" TEXT, "finalSnapshot" JSONB, "snapshotSha256" TEXT,
  "pdfStatus" TEXT, "pdfAttemptToken" TEXT, "pdfLeaseUntil" TIMESTAMPTZ(3),
  "pdfAttemptCount" INTEGER NOT NULL DEFAULT 0, "pdfErrorCode" TEXT, "pdfUpdatedAt" TIMESTAMPTZ(3),
  CONSTRAINT "PatientAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientAssessment_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "PatientAssessment"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "PatientAssessment_type_check" CHECK ("type" = 'painad' AND "formVersion" = 'painad-it-2026-09-22-v1'),
  CONSTRAINT "PatientAssessment_answers_check" CHECK ("painad_answers_valid"("answers")),
  CONSTRAINT "PatientAssessment_version_check" CHECK ("version" >= 1 AND "pdfAttemptCount" >= 0),
  CONSTRAINT "PatientAssessment_request_check" CHECK ("requestId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' AND "creationPayloadHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "PatientAssessment_correction_check" CHECK (("predecessorId" IS NULL AND "correctionReason" IS NULL) OR ("predecessorId" IS NOT NULL AND "correctionReason" IS NOT NULL AND length(btrim("correctionReason")) BETWEEN 1 AND 1000)),
  CONSTRAINT "PatientAssessment_state_check" CHECK ((
    ("status" = 'draft' AND "finalizedAt" IS NULL AND "finalSnapshot" IS NULL AND "snapshotSha256" IS NULL
      AND "finalizeRequestId" IS NULL AND "finalizePayloadHash" IS NULL AND "pdfStatus" IS NULL
      AND "pdfAttemptToken" IS NULL AND "pdfLeaseUntil" IS NULL AND "pdfAttemptCount" = 0 AND "pdfErrorCode" IS NULL AND "pdfUpdatedAt" IS NULL)
    OR ("status" = 'final' AND "finalizedAt" IS NOT NULL AND "finalSnapshot" IS NOT NULL
      AND "snapshotSha256" ~ '^[0-9a-f]{64}$' AND "finalizePayloadHash" ~ '^[0-9a-f]{64}$'
      AND "finalizeRequestId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND "pdfStatus" IN ('pending','ready','failed') AND "pdfUpdatedAt" IS NOT NULL
      AND "finalSnapshot"->'patient'->>'id' = "patientId"
      AND "finalSnapshot"->'form'->>'version' = "formVersion"
      AND NOT ("answers" @> '{"respiration":null}' OR "answers" @> '{"negativeVocalization":null}' OR "answers" @> '{"facialExpression":null}' OR "answers" @> '{"bodyLanguage":null}' OR "answers" @> '{"consolability":null}'))) IS TRUE)
);
CREATE UNIQUE INDEX "PatientAssessment_id_patientId_key" ON "PatientAssessment"("id","patientId");
CREATE UNIQUE INDEX "PatientAssessment_authorOperatorId_requestId_key" ON "PatientAssessment"("authorOperatorId","requestId");
CREATE UNIQUE INDEX "PatientAssessment_authorOperatorId_finalizeRequestId_key" ON "PatientAssessment"("authorOperatorId","finalizeRequestId");
CREATE UNIQUE INDEX "PatientAssessment_final_predecessor_key" ON "PatientAssessment"("predecessorId") WHERE "status" = 'final' AND "predecessorId" IS NOT NULL;
CREATE INDEX "PatientAssessment_patientId_type_createdAt_id_idx" ON "PatientAssessment"("patientId","type","createdAt","id");

ALTER TABLE "PatientDocument" ADD COLUMN "assessmentId" TEXT;
CREATE UNIQUE INDEX "PatientDocument_assessmentId_key" ON "PatientDocument"("assessmentId");
CREATE UNIQUE INDEX "PatientDocument_assessmentId_patientId_key" ON "PatientDocument"("assessmentId","patientId");
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_assessmentId_patientId_fkey"
  FOREIGN KEY ("assessmentId","patientId") REFERENCES "PatientAssessment"("id","patientId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_assessment_type_check"
  CHECK (("assessmentId" IS NOT NULL) = ("documentType" = 'patient_assessment'));

CREATE FUNCTION "guard_patient_assessment"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'assessment_delete_forbidden'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'draft' OR NEW."version" <> 1 THEN RAISE EXCEPTION 'assessment_insert_draft_required'; END IF;
  ELSE
    IF OLD."status" = 'final' THEN
      IF (to_jsonb(OLD) - ARRAY['pdfStatus','pdfAttemptToken','pdfLeaseUntil','pdfAttemptCount','pdfErrorCode','pdfUpdatedAt'])
        IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['pdfStatus','pdfAttemptToken','pdfLeaseUntil','pdfAttemptCount','pdfErrorCode','pdfUpdatedAt'])
        THEN RAISE EXCEPTION 'assessment_final_immutable'; END IF;
    ELSE
      IF ROW(NEW."id",NEW."patientId",NEW."type",NEW."formVersion",NEW."authorOperatorId",NEW."authorName",NEW."createdAt",NEW."requestId",NEW."creationPayloadHash",NEW."predecessorId")
        IS DISTINCT FROM ROW(OLD."id",OLD."patientId",OLD."type",OLD."formVersion",OLD."authorOperatorId",OLD."authorName",OLD."createdAt",OLD."requestId",OLD."creationPayloadHash",OLD."predecessorId")
        THEN RAISE EXCEPTION 'assessment_identity_immutable'; END IF;
      IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'assessment_version_required'; END IF;
    END IF;
  END IF;
  IF NEW."predecessorId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "PatientAssessment" previous WHERE previous.id = NEW."predecessorId"
      AND previous."patientId" = NEW."patientId" AND previous."type" = NEW."type" AND previous."status" = 'final'
  ) THEN RAISE EXCEPTION 'assessment_invalid_predecessor'; END IF;
  IF NEW."pdfStatus" = 'ready' AND NOT EXISTS (
    SELECT 1 FROM "PatientDocument" d WHERE d."assessmentId" = NEW.id AND d."patientId" = NEW."patientId"
  ) THEN RAISE EXCEPTION 'assessment_pdf_document_required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PatientAssessment_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PatientAssessment"
  FOR EACH ROW EXECUTE FUNCTION "guard_patient_assessment"();

CREATE FUNCTION "guard_assessment_document"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD."assessmentId" IS NOT NULL THEN
    RAISE EXCEPTION 'assessment_document_immutable';
  END IF;
  IF TG_OP <> 'DELETE' AND NEW."assessmentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "PatientAssessment" a WHERE a.id = NEW."assessmentId" AND a."patientId" = NEW."patientId" AND a.status = 'final'
  ) THEN RAISE EXCEPTION 'assessment_document_final_required'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PatientDocument_assessment_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PatientDocument"
  FOR EACH ROW EXECUTE FUNCTION "guard_assessment_document"();
