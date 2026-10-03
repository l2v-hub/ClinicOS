-- Paper-identical scales (owner decisions 2026-10-03): Tinetti v2, GDS-15 v2, MNA-SF v2 (new answer
-- shape: A–F with F1 BMI or F2 calf), Barthel v1 and UCLA-NPI sleep v1 (new types).
-- Existing versions and their validators are unchanged; finalized rows keep their old wording.

CREATE FUNCTION paper_choice_valid(v jsonb, allowed jsonb, must_answer boolean)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL THEN RETURN false; END IF;
  IF v = 'null'::jsonb THEN RETURN NOT must_answer; END IF;
  RETURN jsonb_typeof(v) = 'number' AND allowed @> jsonb_build_array(v);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION paper_points(a jsonb, k text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(a->k) = 'number' THEN (a->>k)::integer ELSE 0 END
$$;

-- Shared final-snapshot check: layout, pinned source, result total/maximum/band/label, notes.
CREATE FUNCTION paper_result_valid(s jsonb, a jsonb, sha text, total integer, maximum integer,
  band text, label text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN (jsonb_typeof(s) = 'object' AND s->>'layout' = 'paper'
    AND s->'form'->>'sourceSha256' = sha
    AND jsonb_typeof(s->'items') = 'array'
    AND jsonb_typeof(s->'result') = 'object'
    AND s->'result'->'total' = to_jsonb(total) AND s->'result'->'maximum' = to_jsonb(maximum)
    AND s->'result'->>'band' = band AND s->'result'->>'label' = label
    AND jsonb_typeof(s->'notes') = 'string'
    AND (NOT (a ? 'notes') OR s->'notes' = a->'notes')) IS TRUE;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- Barthel: 10 items, points per the paper (max 100).
CREATE FUNCTION barthel_answers_valid(a jsonb, complete boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text;
  domains jsonb := '{"alimentazione":[0,5,10],"igiene":[0,5],"curaPersona":[0,5],
    "abbigliamento":[0,5,10],"intestino":[0,5,10],"vescica":[0,5,10],"gabinetto":[0,5,10],
    "trasferimenti":[0,5,10,15],"deambulazione":[0,5,10,15],"scale":[0,5,10]}';
  keys text[] := ARRAY['alimentazione','igiene','curaPersona','abbigliamento','intestino',
    'vescica','gabinetto','trasferimenti','deambulazione','scale'];
BEGIN
  IF a IS NULL OR jsonb_typeof(a) <> 'object' OR NOT (a ?& keys) OR (a - keys) <> '{}'::jsonb
    THEN RETURN false; END IF;
  FOREACH k IN ARRAY keys LOOP
    IF NOT paper_choice_valid(a->k, domains->k, complete) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION barthel_snapshot_valid(s jsonb, a jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE total integer := 0; k text;
BEGIN
  IF NOT barthel_answers_valid(a, true) THEN RETURN false; END IF;
  FOR k IN SELECT jsonb_object_keys(a) LOOP total := total + paper_points(a, k); END LOOP;
  RETURN jsonb_array_length(s->'items') = 10 AND paper_result_valid(s, a,
    '8640724ebeb9778fc673df6716102acd03569044d7aa2ee757992e97dde106a7', total, 100,
    CASE WHEN total <= 20 THEN 'total' WHEN total <= 60 THEN 'severe' WHEN total <= 90 THEN 'moderate'
      WHEN total <= 99 THEN 'mild' ELSE 'independent' END,
    CASE WHEN total <= 20 THEN 'Dipendenza totale' WHEN total <= 60 THEN 'Dipendenza grave'
      WHEN total <= 90 THEN 'Dipendenza moderata' WHEN total <= 99 THEN 'Dipendenza lieve'
      ELSE 'Completamente autonomo' END);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- UCLA NPI sleep item: frequency 0–4; severity 1–3 and caregiver distress 0–5 only when frequency > 0.
CREATE FUNCTION ucla_npi_sleep_answers_valid(a jsonb, complete boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE present boolean;
  keys text[] := ARRAY['frequency','severity','distress'];
BEGIN
  IF a IS NULL OR jsonb_typeof(a) <> 'object' OR NOT (a ?& keys) OR (a - keys) <> '{}'::jsonb
    OR NOT paper_choice_valid(a->'frequency', '[0,1,2,3,4]', complete) THEN RETURN false; END IF;
  present := jsonb_typeof(a->'frequency') = 'number' AND (a->>'frequency')::integer > 0;
  IF a->'frequency' = '0'::jsonb THEN
    RETURN a->'severity' = 'null'::jsonb AND a->'distress' = 'null'::jsonb;
  END IF;
  RETURN paper_choice_valid(a->'severity', '[1,2,3]', complete AND present)
    AND paper_choice_valid(a->'distress', '[0,1,2,3,4,5]', complete AND present);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION ucla_npi_sleep_snapshot_valid(s jsonb, a jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE total integer;
BEGIN
  IF NOT ucla_npi_sleep_answers_valid(a, true) THEN RETURN false; END IF;
  total := paper_points(a, 'frequency') * CASE WHEN paper_points(a, 'frequency') = 0 THEN 0
    ELSE paper_points(a, 'severity') END;
  RETURN paper_result_valid(s, a,
    'cce5879fc77b7027ee5d078ded1287096de92be6674280aeb4bcb122656d9bef', total, 12,
    CASE WHEN total = 0 THEN 'absent' ELSE 'present' END,
    CASE WHEN total = 0 THEN 'Disturbo del sonno assente' ELSE 'Disturbo del sonno presente' END);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- MNA-SF: A–E plus exactly one of F1 (BMI) / F2 (calf), weight kg, height m, calf cm.
CREATE FUNCTION mna_sf_answers_valid(a jsonb, complete boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text; n double precision; bmi double precision; expected integer;
  keys text[] := ARRAY['a','b','c','d','e','f1','f2','weightKg','heightM','calfCm'];
  domains jsonb := '{"a":[0,1,2],"b":[0,1,2,3],"c":[0,1,2],"d":[0,2],"e":[0,1,2],"f1":[0,1,2,3],"f2":[0,3]}';
  limits jsonb := '{"weightKg":[1,500],"heightM":[0.5,2.5],"calfCm":[1,100]}';
BEGIN
  IF a IS NULL OR jsonb_typeof(a) <> 'object' OR NOT (a ?& keys) OR (a - keys) <> '{}'::jsonb
    THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['a','b','c','d','e'] LOOP
    IF NOT paper_choice_valid(a->k, domains->k, complete) THEN RETURN false; END IF;
  END LOOP;
  IF NOT paper_choice_valid(a->'f1', domains->'f1', false)
    OR NOT paper_choice_valid(a->'f2', domains->'f2', false)
    OR (a->'f1' <> 'null'::jsonb AND a->'f2' <> 'null'::jsonb)
    OR (complete AND a->'f1' = 'null'::jsonb AND a->'f2' = 'null'::jsonb) THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['weightKg','heightM','calfCm'] LOOP
    IF a->k <> 'null'::jsonb THEN
      IF jsonb_typeof(a->k) <> 'number' THEN RETURN false; END IF;
      n := (a->>k)::double precision;
      IF n < (limits->k->>0)::double precision OR n > (limits->k->>1)::double precision
        THEN RETURN false; END IF;
    END IF;
  END LOOP;
  IF a->'weightKg' <> 'null'::jsonb AND a->'heightM' <> 'null'::jsonb THEN
    bmi := (a->>'weightKg')::double precision / ((a->>'heightM')::double precision * (a->>'heightM')::double precision);
    expected := CASE WHEN bmi < 19 THEN 0 WHEN bmi < 21 THEN 1 WHEN bmi < 23 THEN 2 ELSE 3 END;
    IF a->'f2' <> 'null'::jsonb OR (a->'f1' <> 'null'::jsonb AND (a->>'f1')::integer <> expected)
      THEN RETURN false; END IF;
  END IF;
  IF a->'calfCm' <> 'null'::jsonb AND a->'f2' <> 'null'::jsonb
    AND (a->>'f2')::integer <> (CASE WHEN (a->>'calfCm')::double precision < 31 THEN 0 ELSE 3 END)
    THEN RETURN false; END IF;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION mna_sf_snapshot_valid(s jsonb, a jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE total integer;
BEGIN
  IF NOT mna_sf_answers_valid(a, true) THEN RETURN false; END IF;
  total := paper_points(a,'a') + paper_points(a,'b') + paper_points(a,'c') + paper_points(a,'d')
    + paper_points(a,'e') + paper_points(a,'f1') + paper_points(a,'f2');
  RETURN jsonb_array_length(s->'items') = 6 AND jsonb_typeof(s->'measurements') = 'object'
    AND paper_result_valid(s, a,
    '03f7a6e758cb3ac82efb7a61994f17403f291b8e95189bd50d33ecf0b2847d52', total, 14,
    CASE WHEN total >= 12 THEN 'normal' WHEN total >= 8 THEN 'at_risk' ELSE 'malnourished' END,
    CASE WHEN total >= 12 THEN 'Stato nutrizionale normale' WHEN total >= 8 THEN 'Rischio di malnutrizione'
      ELSE 'Malnutrito' END);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- Tinetti v2 keeps the v1 answer shape (20 answers, 28 points); only wording/numbering change.
CREATE FUNCTION tinetti_v2_snapshot_valid(s jsonb, a jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE total integer := 0; k text;
BEGIN
  IF NOT tinetti_answers_valid(a, true) THEN RETURN false; END IF;
  FOR k IN SELECT jsonb_object_keys(a) LOOP
    IF k <> 'notes' THEN total := total + paper_points(a, k); END IF;
  END LOOP;
  RETURN jsonb_array_length(s->'items') = 20 AND paper_result_valid(s, a,
    'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6', total, 28,
    CASE WHEN total <= 18 THEN 'high' WHEN total <= 23 THEN 'moderate' ELSE 'low' END,
    CASE WHEN total <= 18 THEN 'Rischio caduta elevato' WHEN total <= 23 THEN 'Rischio caduta moderato'
      ELSE 'Rischio caduta basso / normale' END);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- GDS-15 v2 keeps the v1 answer shape; new wording, band labels and pinned source.
CREATE FUNCTION gds15_v2_snapshot_valid(s jsonb, a jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE i integer; total integer := 0; answer jsonb;
BEGIN
  IF NOT gds15_answers_valid(a, true) THEN RETURN false; END IF;
  FOR i IN 1..15 LOOP
    answer := a->('q' || i);
    IF (i IN (1,5,7,11,13) AND answer = 'false'::jsonb)
      OR (i NOT IN (1,5,7,11,13) AND answer = 'true'::jsonb) THEN total := total + 1; END IF;
  END LOOP;
  RETURN jsonb_array_length(s->'items') = 15 AND paper_result_valid(s, a,
    '6e615b3bbcffc152f9362247abfdf8c5cd30df1fa7b0d1bf8f312aeb3be5b5e9', total, 15,
    CASE WHEN total <= 5 THEN 'none' WHEN total <= 9 THEN 'mild_moderate' ELSE 'severe' END,
    CASE WHEN total <= 5 THEN 'Normalità' WHEN total <= 9 THEN 'Depressione lieve-moderata'
      ELSE 'Depressione grave' END);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER TABLE "PatientAssessment" DROP CONSTRAINT "PatientAssessment_type_check",
  DROP CONSTRAINT "PatientAssessment_answers_check", DROP CONSTRAINT "PatientAssessment_state_check";
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_type_check" CHECK (
  (type='painad' AND "formVersion"='painad-it-2026-09-22-v1') OR
  (type='postural_transfers' AND "formVersion"='transfers-it-2026-09-22-v1') OR
  (type='tinetti' AND "formVersion"='tinetti-it-2026-09-22-v1') OR
  (type='tinetti' AND "formVersion"='tinetti-it-2026-10-03-v2') OR
  (type='mna' AND "formVersion"='mna-it-2026-09-22-q-corrected-v1') OR
  (type='mna' AND "formVersion"='mna-sf-it-2026-10-03-v2') OR
  (type='gds15' AND "formVersion"='gds15-it-2026-09-22-v1') OR
  (type='gds15' AND "formVersion"='gds15-it-2026-10-03-v2') OR
  (type='barthel' AND "formVersion"='barthel-it-2026-10-03-v1') OR
  (type='ucla_npi_sleep' AND "formVersion"='ucla-npi-sleep-it-2026-10-03-v1'));
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_answers_check" CHECK ((
  (type='painad' AND painad_answers_valid(answers)) OR
  (type='postural_transfers' AND transfers_answers_valid(answers)) OR
  (type='tinetti' AND tinetti_answers_valid(answers)) OR
  (type='mna' AND "formVersion"='mna-it-2026-09-22-q-corrected-v1' AND mna_answers_valid(answers)) OR
  (type='mna' AND "formVersion"='mna-sf-it-2026-10-03-v2' AND mna_sf_answers_valid(answers)) OR
  (type='gds15' AND gds15_answers_valid(answers)) OR
  (type='barthel' AND barthel_answers_valid(answers)) OR
  (type='ucla_npi_sleep' AND ucla_npi_sleep_answers_valid(answers))) IS TRUE);
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
      OR (type='tinetti' AND "formVersion"='tinetti-it-2026-09-22-v1' AND tinetti_answers_valid(answers,true))
      OR (type='tinetti' AND "formVersion"='tinetti-it-2026-10-03-v2' AND tinetti_v2_snapshot_valid("finalSnapshot",answers))
      OR (type='gds15' AND "formVersion"='gds15-it-2026-09-22-v1' AND gds15_answers_valid(answers,true) AND gds15_snapshot_valid("finalSnapshot",answers))
      OR (type='gds15' AND "formVersion"='gds15-it-2026-10-03-v2' AND gds15_v2_snapshot_valid("finalSnapshot",answers))
      OR (type='mna' AND "formVersion"='mna-it-2026-09-22-q-corrected-v1' AND mna_answers_valid(answers,true)
        AND "finalSnapshot"->'answers'=answers AND "finalSnapshot"->>'extent'=answers->>'extent'
        AND jsonb_array_length("finalSnapshot"->'items')=18
        AND jsonb_array_length("finalSnapshot"->'items'->10->'subitems')=3
        AND ((answers->>'extent'='screening' AND "finalSnapshot"->'result'->'total'='null'::jsonb)
          OR (answers->>'extent'='full' AND jsonb_typeof("finalSnapshot"->'result'->'total')='object')))
      OR (type='mna' AND "formVersion"='mna-sf-it-2026-10-03-v2' AND mna_sf_snapshot_valid("finalSnapshot",answers))
      OR (type='barthel' AND barthel_snapshot_valid("finalSnapshot",answers))
      OR (type='ucla_npi_sleep' AND ucla_npi_sleep_snapshot_valid("finalSnapshot",answers))))) IS TRUE);
