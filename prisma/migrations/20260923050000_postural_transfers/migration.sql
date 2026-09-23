CREATE FUNCTION assessment_object_keys(value jsonb, keys text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(value) IS DISTINCT FROM 'object' THEN false ELSE
    (SELECT count(*) FROM jsonb_object_keys(value)) = cardinality(keys) AND value ?& keys END
$$;
CREATE FUNCTION assessment_choice(value jsonb, choices jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$ SELECT COALESCE(value = 'null'::jsonb OR choices @> jsonb_build_array(value), false) $$;

CREATE FUNCTION transfers_answers_valid(a jsonb, complete boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d jsonb; diagnosis jsonb; load jsonb; aid jsonb; k text; owned boolean;
  owned_keys text[] := ARRAY['wheelchair','pressureReliefCushion','oneForearmCrutch','walkingStick','quadCane','twoForearmCrutches','rollator','axillaryWalker','tableWalker'];
  aid_keys text[] := ARRAY['wheelchair','pressureReliefCushion','wheelchairRestraint','oneForearmCrutch','walkingStick','quadCane','twoForearmCrutches','rollator','axillaryWalker','tableWalker','spinalBrace','kneeBrace'];
  modes jsonb := '["independent","one_operator","two_operators","one_operator_desk","one_operator_axillary","one_operator_rollator","hoist_one_operator","hoist_two_operators"]';
BEGIN
  IF assessment_object_keys(a,ARRAY['context','operatedLegLoad','walking','transfers','hygiene','painOnMovement','cognitiveDeterioration','aids','notes']) IS NOT TRUE
    OR assessment_object_keys(a->'context',ARRAY['admissionDate','diagnosis']) IS NOT TRUE THEN RETURN false; END IF;
  d := a->'context'->'admissionDate'; diagnosis := a->'context'->'diagnosis'; load := a->'operatedLegLoad';
  IF assessment_object_keys(d,ARRAY['status','value']) IS NOT TRUE
    OR assessment_choice(d->'status','["known","unavailable"]') IS NOT TRUE THEN RETURN false; END IF;
  IF d->'value' <> 'null'::jsonb THEN
    IF jsonb_typeof(d->'value') IS DISTINCT FROM 'string' OR d->>'value' !~ '^\d{4}-\d{2}-\d{2}$'
      OR to_char((d->>'value')::date,'YYYY-MM-DD') <> d->>'value' OR d->>'status' IS DISTINCT FROM 'known' THEN RETURN false; END IF;
  END IF;
  IF assessment_object_keys(diagnosis,ARRAY['status','text','unavailableReason']) IS NOT TRUE
    OR assessment_choice(diagnosis->'status','["provided","unavailable"]') IS NOT TRUE
    OR jsonb_typeof(diagnosis->'text') IS DISTINCT FROM 'string' OR length(diagnosis->>'text') > 1000
    OR jsonb_typeof(diagnosis->'unavailableReason') IS DISTINCT FROM 'string' OR length(diagnosis->>'unavailableReason') > 1000
    OR (diagnosis->>'status' IS DISTINCT FROM 'provided' AND diagnosis->>'text' <> '')
    OR (diagnosis->>'status' IS DISTINCT FROM 'unavailable' AND diagnosis->>'unavailableReason' <> '') THEN RETURN false; END IF;
  IF assessment_object_keys(load,ARRAY['applicable','side','level']) IS NOT TRUE
    OR assessment_choice(load->'applicable','[true,false]') IS NOT TRUE
    OR assessment_choice(load->'side','["right","left"]') IS NOT TRUE
    OR assessment_choice(load->'level','["not_allowed","touch_down","full"]') IS NOT TRUE
    OR (load->'applicable' <> 'true'::jsonb AND (load->'side' <> 'null'::jsonb OR load->'level' <> 'null'::jsonb)) THEN RETURN false; END IF;
  IF assessment_choice(a->'walking','["independent","assisted","not_possible"]') IS NOT TRUE
    OR assessment_choice(a->'hygiene','["bed_bath","shower"]') IS NOT TRUE
    OR assessment_choice(a->'painOnMovement','[true,false]') IS NOT TRUE
    OR assessment_choice(a->'cognitiveDeterioration','["none","mild","severe"]') IS NOT TRUE
    OR assessment_object_keys(a->'transfers',ARRAY['bedToWheelchair','wheelchairToBed','toilet']) IS NOT TRUE
    OR assessment_choice(a->'transfers'->'bedToWheelchair',modes) IS NOT TRUE
    OR assessment_choice(a->'transfers'->'wheelchairToBed',modes) IS NOT TRUE
    OR assessment_choice(a->'transfers'->'toilet',modes - 7 - 6) IS NOT TRUE
    OR assessment_object_keys(a->'aids',aid_keys) IS NOT TRUE
    OR jsonb_typeof(a->'notes') IS DISTINCT FROM 'string' OR length(a->>'notes') > 4000 THEN RETURN false; END IF;
  FOREACH k IN ARRAY aid_keys LOOP
    aid := a->'aids'->k; owned := k = ANY(owned_keys);
    IF assessment_object_keys(aid,CASE WHEN owned THEN ARRAY['selected','ownership'] ELSE ARRAY['selected'] END) IS NOT TRUE
      OR assessment_choice(aid->'selected','[true,false]') IS NOT TRUE THEN RETURN false; END IF;
    IF owned AND (assessment_choice(aid->'ownership','["personal","facility"]') IS NOT TRUE
      OR (aid->'selected' <> 'true'::jsonb AND aid->'ownership' <> 'null'::jsonb)) THEN RETURN false; END IF;
    IF complete AND (aid->'selected' = 'null'::jsonb OR (owned AND aid->'selected' = 'true'::jsonb AND aid->'ownership' = 'null'::jsonb)) THEN RETURN false; END IF;
  END LOOP;
  IF complete THEN
    IF d->'status' = 'null'::jsonb OR (d->>'status' = 'known' AND d->'value' = 'null'::jsonb)
      OR diagnosis->'status' = 'null'::jsonb
      OR (diagnosis->>'status' = 'provided' AND diagnosis->>'text' !~ '\S')
      OR (diagnosis->>'status' = 'unavailable' AND diagnosis->>'unavailableReason' !~ '\S')
      OR load->'applicable' = 'null'::jsonb OR (load->'applicable' = 'true'::jsonb AND (load->'side' = 'null'::jsonb OR load->'level' = 'null'::jsonb)) THEN RETURN false; END IF;
    FOREACH k IN ARRAY ARRAY['walking','hygiene','painOnMovement','cognitiveDeterioration'] LOOP
      IF a->k = 'null'::jsonb THEN RETURN false; END IF;
    END LOOP;
    FOREACH k IN ARRAY ARRAY['bedToWheelchair','wheelchairToBed','toilet'] LOOP
      IF a->'transfers'->k = 'null'::jsonb THEN RETURN false; END IF;
    END LOOP;
  END IF;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER TABLE "PatientAssessment" DROP CONSTRAINT "PatientAssessment_type_check",
  DROP CONSTRAINT "PatientAssessment_answers_check", DROP CONSTRAINT "PatientAssessment_state_check";
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_type_check" CHECK (
  (type='painad' AND "formVersion"='painad-it-2026-09-22-v1') OR (type='postural_transfers' AND "formVersion"='transfers-it-2026-09-22-v1'));
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_answers_check" CHECK ((
  (type='painad' AND painad_answers_valid(answers)) OR (type='postural_transfers' AND transfers_answers_valid(answers))) IS TRUE);
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_state_check" CHECK ((
  (status='draft' AND "finalizedAt" IS NULL AND "finalSnapshot" IS NULL AND "snapshotSha256" IS NULL
    AND "finalizeRequestId" IS NULL AND "finalizePayloadHash" IS NULL AND "pdfStatus" IS NULL
    AND "pdfAttemptToken" IS NULL AND "pdfLeaseUntil" IS NULL AND "pdfAttemptCount"=0 AND "pdfErrorCode" IS NULL AND "pdfUpdatedAt" IS NULL)
  OR (status='final' AND "finalizedAt" IS NOT NULL AND "finalSnapshot" IS NOT NULL
    AND "snapshotSha256" ~ '^[0-9a-f]{64}$' AND "finalizePayloadHash" ~ '^[0-9a-f]{64}$'
    AND "finalizeRequestId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND "pdfStatus" IN ('pending','ready','failed') AND "pdfUpdatedAt" IS NOT NULL
    AND "finalSnapshot"->'patient'->>'id'="patientId" AND "finalSnapshot"->'form'->>'version'="formVersion"
    AND "finalSnapshot"->'form'->>'type'=type
    AND ((type='painad' AND NOT (answers @> '{"respiration":null}' OR answers @> '{"negativeVocalization":null}' OR answers @> '{"facialExpression":null}' OR answers @> '{"bodyLanguage":null}' OR answers @> '{"consolability":null}'))
      OR (type='postural_transfers' AND transfers_answers_valid(answers,true) AND "finalSnapshot"->'result'='null'::jsonb)))) IS TRUE);
CREATE UNIQUE INDEX "PatientAssessment_id_snapshotSha256_key" ON "PatientAssessment"(id,"snapshotSha256");
CREATE INDEX "PatientAssessment_current_idx" ON "PatientAssessment"("patientId",type,status,"assessedAt","createdAt",id);

CREATE TABLE "PatientAssessmentAttestation" (
  id TEXT PRIMARY KEY, "assessmentId" TEXT NOT NULL, "snapshotSha256" TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('physiotherapist_confirmation','operator_acknowledgement')),
  "actorOperatorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "registeredQualification" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientAssessmentAttestation_assessmentId_snapshotSha256_fkey" FOREIGN KEY ("assessmentId","snapshotSha256") REFERENCES "PatientAssessment"(id,"snapshotSha256") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "PatientAssessmentAttestation_actor_kind_key" ON "PatientAssessmentAttestation"("assessmentId",kind,"actorOperatorId");
CREATE INDEX "PatientAssessmentAttestation_assessmentId_createdAt_id_idx" ON "PatientAssessmentAttestation"("assessmentId","createdAt",id);
-- Same whitespace set as JavaScript String.trim; qualifications are otherwise exact.
CREATE FUNCTION assessment_qualification(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(btrim(value, E' \t\n\r\f' || chr(11) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)))
$$;
CREATE FUNCTION guard_assessment_attestation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_name text; qualification text;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'assessment_attestation_immutable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM "PatientAssessment" a WHERE a.id=NEW."assessmentId" AND a.status='final'
    AND a.type='postural_transfers' AND a."snapshotSha256"=NEW."snapshotSha256") THEN RAISE EXCEPTION 'assessment_attestation_final_required'; END IF;
  SELECT u."fullName",o.qualifica INTO actor_name,qualification FROM "Operator" o JOIN "User" u ON u.id=o."userId"
    WHERE o.id=NEW."actorOperatorId" FOR SHARE OF o,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'assessment_attestation_actor_required'; END IF;
  IF NEW.kind='physiotherapist_confirmation' AND assessment_qualification(qualification) IS DISTINCT FROM 'fisioterapista'
    THEN RAISE EXCEPTION 'assessment_attestation_qualification_required'; END IF;
  NEW."actorName" := actor_name; NEW."registeredQualification" := qualification; NEW."createdAt" := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER "PatientAssessmentAttestation_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PatientAssessmentAttestation"
  FOR EACH ROW EXECUTE FUNCTION guard_assessment_attestation();
