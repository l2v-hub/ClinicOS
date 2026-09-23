-- Preserve the existing 20-item / 28-point model; legacy Cartella JSON is untouched.
CREATE FUNCTION tinetti_answers_valid(a jsonb, complete boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text; score numeric;
  keys text[] := ARRAY['equilibrioSeduto','alzarsi','tentativiAlzarsi','equilibrioImmediato',
    'equilibrioProlungato','rombergSpinta','occhiChiusi','girarsi360Passi','girarsi360Stabilita',
    'sedersi','iniziazione','lunghezzaPassoDx','altezzaPassoDx','lunghezzaPassoSx',
    'altezzaPassoSx','simmetria','continuita','traiettoria','tronco','cammino'];
  two_point_keys text[] := ARRAY['alzarsi','tentativiAlzarsi','equilibrioImmediato',
    'equilibrioProlungato','rombergSpinta','sedersi','traiettoria','tronco'];
BEGIN
  IF a IS NULL OR jsonb_typeof(a) <> 'object' OR NOT (a ?& (keys || ARRAY['notes']))
    OR (a - (keys || ARRAY['notes'])) <> '{}'::jsonb OR jsonb_typeof(a->'notes') <> 'string'
    OR char_length(a->>'notes') > 4000 OR (a->>'notes') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'
    THEN RETURN false; END IF;
  FOREACH k IN ARRAY keys LOOP
    IF a->k = 'null'::jsonb THEN
      IF complete THEN RETURN false; END IF;
    ELSE
      IF jsonb_typeof(a->k) <> 'number' THEN RETURN false; END IF;
      score := (a->>k)::numeric;
      IF score <> trunc(score) OR score < 0 OR score > (CASE WHEN k = ANY(two_point_keys) THEN 2 ELSE 1 END)
        THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER TABLE "PatientAssessment" DROP CONSTRAINT "PatientAssessment_type_check",
  DROP CONSTRAINT "PatientAssessment_answers_check", DROP CONSTRAINT "PatientAssessment_state_check";
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_type_check" CHECK (
  (type='painad' AND "formVersion"='painad-it-2026-09-22-v1') OR
  (type='postural_transfers' AND "formVersion"='transfers-it-2026-09-22-v1') OR
  (type='tinetti' AND "formVersion"='tinetti-it-2026-09-22-v1'));
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_answers_check" CHECK ((
  (type='painad' AND painad_answers_valid(answers)) OR
  (type='postural_transfers' AND transfers_answers_valid(answers)) OR
  (type='tinetti' AND tinetti_answers_valid(answers))) IS TRUE);
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
      OR (type='postural_transfers' AND transfers_answers_valid(answers,true) AND "finalSnapshot"->'result'='null'::jsonb)
      OR (type='tinetti' AND tinetti_answers_valid(answers,true))))) IS TRUE);
