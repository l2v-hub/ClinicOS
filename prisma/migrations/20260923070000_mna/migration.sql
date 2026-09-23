-- MNA full and screening use the existing immutable assessment lifecycle.
CREATE FUNCTION mna_calendar_date_valid(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE text_value text;
BEGIN
  IF value = 'null'::jsonb THEN RETURN true; END IF;
  IF jsonb_typeof(value) <> 'string' THEN RETURN false; END IF;
  text_value := value #>> '{}';
  RETURN text_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    AND substring(text_value,1,4)::integer BETWEEN 1 AND 9999
    AND to_char(text_value::date,'YYYY-MM-DD') = text_value;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION mna_answers_valid(a jsonb, complete boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text; subkey text; must_answer boolean; has_measures boolean;
  mode text; v jsonb; n double precision; meters double precision; denominator double precision; bmi double precision;
  keys text[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R'];
  measure_keys text[] := ARRAY['weightKg','heightCm','armCircumferenceCm','calfCircumferenceCm'];
  k_keys text[] := ARRAY['dairyDaily','eggsOrLegumesWeekly','meatFishOrPoultryDaily'];
  domains jsonb := '{
    "A":["severe_reduction","moderate_reduction","no_reduction"],
    "B":["loss_over_3kg","unknown","loss_1_to_3kg","no_loss"],
    "C":["bed_or_chair","independent_at_home","goes_out"],
    "D":[true,false],
    "E":["severe_dementia_or_depression","moderate_dementia","no_psychological_problems"],
    "F":["lt19","gte19_lt21","gte21_lt23","gte23"],
    "G":[true,false],"H":[true,false],"I":[true,false],
    "J":["one_meal","two_meals","three_meals"],"L":[false,true],
    "M":["lt3_glasses","3_to_5_glasses","gt5_glasses"],
    "N":["needs_assistance","independent_with_difficulty","independent_without_difficulty"],
    "O":["severe_malnutrition","moderate_or_unknown","no_nutritional_problems"],
    "P":["worse","unknown","same","better"],"Q":["lt21","21_to_22","gt22"],"R":["lt31","gte31"]}';
BEGIN
  IF a IS NULL OR jsonb_typeof(a) <> 'object'
    OR NOT (a ?& (keys || ARRAY['extent','measurements','measurementDates','notes']))
    OR (a - (keys || ARRAY['extent','measurements','measurementDates','notes'])) <> '{}'::jsonb
    OR jsonb_typeof(a->'extent') <> 'string' OR a->>'extent' NOT IN ('screening','full')
    OR jsonb_typeof(a->'notes') <> 'string' OR char_length(a->>'notes') > 4000
    OR (a->>'notes') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'
    OR jsonb_typeof(a->'measurements') <> 'object' OR NOT (a->'measurements' ?& measure_keys)
    OR ((a->'measurements') - measure_keys) <> '{}'::jsonb
    OR jsonb_typeof(a->'measurementDates') <> 'object' OR NOT (a->'measurementDates' ?& measure_keys)
    OR ((a->'measurementDates') - measure_keys) <> '{}'::jsonb
    THEN RETURN false; END IF;
  FOREACH k IN ARRAY measure_keys LOOP
    v := a->'measurements'->k;
    IF v <> 'null'::jsonb THEN
      IF jsonb_typeof(v) <> 'number' THEN RETURN false; END IF;
      n := (v #>> '{}')::double precision;
      IF NOT (n > 0 AND n < 'Infinity'::double precision) THEN RETURN false; END IF;
    END IF;
    IF NOT mna_calendar_date_valid(a->'measurementDates'->k) THEN RETURN false; END IF;
  END LOOP;
  IF a->'measurements'->'weightKg' <> 'null'::jsonb AND a->'measurements'->'heightCm' <> 'null'::jsonb THEN
    meters := (a->'measurements'->>'heightCm')::double precision / 100;
    denominator := meters * meters;
    bmi := (a->'measurements'->>'weightKg')::double precision / denominator;
    IF NOT (meters > 0 AND meters < 'Infinity'::double precision AND denominator > 0
      AND denominator < 'Infinity'::double precision AND bmi > 0 AND bmi < 'Infinity'::double precision)
      THEN RETURN false; END IF;
  END IF;
  FOREACH k IN ARRAY keys LOOP
    v := a->k;
    must_answer := complete AND (a->>'extent' = 'full' OR k = ANY(ARRAY['A','B','C','D','E','F']));
    IF k = 'K' THEN
      IF jsonb_typeof(v) <> 'object' OR NOT (v ?& k_keys) OR (v - k_keys) <> '{}'::jsonb THEN RETURN false; END IF;
      FOREACH subkey IN ARRAY k_keys LOOP
        IF v->subkey = 'null'::jsonb THEN
          IF must_answer THEN RETURN false; END IF;
        ELSIF jsonb_typeof(v->subkey) <> 'boolean' THEN RETURN false;
        END IF;
      END LOOP;
    ELSIF k = ANY(ARRAY['F','Q','R']) THEN
      IF jsonb_typeof(v) <> 'object' OR NOT (v ? 'method') OR jsonb_typeof(v->'method') <> 'string'
        THEN RETURN false; END IF;
      mode := v->>'method';
      IF k = 'F' THEN
        has_measures := a->'measurements'->'weightKg' <> 'null'::jsonb AND a->'measurements'->'heightCm' <> 'null'::jsonb;
      ELSE
        has_measures := a->'measurements'->(CASE WHEN k='Q' THEN 'armCircumferenceCm' ELSE 'calfCircumferenceCm' END) <> 'null'::jsonb;
      END IF;
      IF mode = 'category' THEN
        IF NOT (v ? 'category') OR (v - ARRAY['method','category']) <> '{}'::jsonb OR has_measures THEN RETURN false; END IF;
        IF v->'category' = 'null'::jsonb THEN
          IF must_answer THEN RETURN false; END IF;
        ELSIF NOT ((domains->k) @> jsonb_build_array(v->'category')) THEN RETURN false;
        END IF;
      ELSIF mode = 'measured' THEN
        IF (v - 'method') <> '{}'::jsonb OR (must_answer AND NOT has_measures) THEN RETURN false; END IF;
      ELSE RETURN false;
      END IF;
    ELSIF v = 'null'::jsonb THEN
      IF must_answer THEN RETURN false; END IF;
    ELSIF NOT ((domains->k) @> jsonb_build_array(v)) THEN RETURN false;
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
  (type='tinetti' AND "formVersion"='tinetti-it-2026-09-22-v1') OR
  (type='mna' AND "formVersion"='mna-it-2026-09-22-q-corrected-v1'));
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_answers_check" CHECK ((
  (type='painad' AND painad_answers_valid(answers)) OR
  (type='postural_transfers' AND transfers_answers_valid(answers)) OR
  (type='tinetti' AND tinetti_answers_valid(answers)) OR
  (type='mna' AND mna_answers_valid(answers))) IS TRUE);
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
      OR (type='tinetti' AND tinetti_answers_valid(answers,true))
      OR (type='mna' AND mna_answers_valid(answers,true)
        AND "finalSnapshot"->'answers'=answers AND "finalSnapshot"->>'extent'=answers->>'extent'
        AND jsonb_array_length("finalSnapshot"->'items')=18
        AND jsonb_array_length("finalSnapshot"->'items'->10->'subitems')=3
        AND ((answers->>'extent'='screening' AND "finalSnapshot"->'result'->'total'='null'::jsonb)
          OR (answers->>'extent'='full' AND jsonb_typeof("finalSnapshot"->'result'->'total')='object')))))) IS TRUE);

ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_mna_assessed_date_check" CHECK ((
  type <> 'mna' OR ("assessedAt" >= '0001-01-01T00:00:00+00'::timestamptz
    AND ("assessedAt" AT TIME ZONE 'Europe/Rome')::date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31')) IS TRUE);
