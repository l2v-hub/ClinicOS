-- GDS-15 uses boolean answers and the existing immutable assessment lifecycle.
CREATE FUNCTION gds15_answers_valid(a jsonb, complete boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text;
  keys text[] := ARRAY['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12','q13','q14','q15'];
BEGIN
  IF a IS NULL OR jsonb_typeof(a) <> 'object' OR NOT (a ?& (keys || ARRAY['notes']))
    OR (a - (keys || ARRAY['notes'])) <> '{}'::jsonb
    OR jsonb_typeof(a->'notes') <> 'string' OR char_length(a->>'notes') > 4000
    OR (a->>'notes') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' THEN RETURN false; END IF;
  FOREACH k IN ARRAY keys LOOP
    IF a->k = 'null'::jsonb THEN
      IF complete THEN RETURN false; END IF;
    ELSIF jsonb_typeof(a->k) <> 'boolean' THEN RETURN false;
    END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION gds15_snapshot_valid(s jsonb, a jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE i integer; point integer; total integer := 0; item jsonb; answer jsonb; k text; band text; label text;
BEGIN
  IF NOT gds15_answers_valid(a,true) OR jsonb_typeof(s) <> 'object'
    OR jsonb_typeof(s->'items') <> 'array' OR jsonb_array_length(s->'items') <> 15
    OR s->'notes' <> a->'notes' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['instruction','screeningNote','provenance','reference'] LOOP
    IF jsonb_typeof(s->k) <> 'string' OR length(s->>k)=0 THEN RETURN false; END IF;
  END LOOP;
  FOR i IN 1..15 LOOP
    k := 'q' || i; item := s->'items'->(i-1); answer := a->k;
    point := CASE WHEN (i IN (1,5,7,11,13) AND answer='false'::jsonb)
      OR (i NOT IN (1,5,7,11,13) AND answer='true'::jsonb) THEN 1 ELSE 0 END;
    IF NOT ((jsonb_typeof(item)='object' AND item ?& ARRAY['id','label','answer','score','description']
      AND (item - ARRAY['id','label','answer','score','description'])='{}'::jsonb
      AND item->>'id'=k AND jsonb_typeof(item->'label')='string' AND length(item->>'label')>0
      AND item->'answer'=answer AND item->'score'=to_jsonb(point)
      AND item->>'description'=(CASE WHEN answer='true'::jsonb THEN 'Sì' ELSE 'No' END)) IS TRUE)
      THEN RETURN false; END IF;
    total := total + point;
  END LOOP;
  band := CASE WHEN total<=5 THEN 'none' WHEN total<=9 THEN 'mild_moderate' ELSE 'severe' END;
  label := CASE WHEN total<=5 THEN 'Assente / Nella norma' WHEN total<=9 THEN 'Depressione lieve–moderata' ELSE 'Depressione grave' END;
  RETURN (s ?& ARRAY['instruction','screeningNote','provenance','reference','notes','items','result']
    AND s->'notes'=a->'notes'
    AND s->'form'->>'sourceSha256'='f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709'
    AND jsonb_typeof(s->'result')='object'
    AND ((s->'result') - ARRAY['total','maximum','band','label'])='{}'::jsonb
    AND s->'result'->'total'=to_jsonb(total) AND s->'result'->'maximum'='15'::jsonb
    AND s->'result'->>'band'=band AND s->'result'->>'label'=label) IS TRUE;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER TABLE "PatientAssessment" DROP CONSTRAINT "PatientAssessment_type_check",
  DROP CONSTRAINT "PatientAssessment_answers_check", DROP CONSTRAINT "PatientAssessment_state_check";
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_type_check" CHECK (
  (type='painad' AND "formVersion"='painad-it-2026-09-22-v1') OR
  (type='postural_transfers' AND "formVersion"='transfers-it-2026-09-22-v1') OR
  (type='tinetti' AND "formVersion"='tinetti-it-2026-09-22-v1') OR
  (type='mna' AND "formVersion"='mna-it-2026-09-22-q-corrected-v1') OR
  (type='gds15' AND "formVersion"='gds15-it-2026-09-22-v1'));
ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_answers_check" CHECK ((
  (type='painad' AND painad_answers_valid(answers)) OR
  (type='postural_transfers' AND transfers_answers_valid(answers)) OR
  (type='tinetti' AND tinetti_answers_valid(answers)) OR
  (type='mna' AND mna_answers_valid(answers)) OR
  (type='gds15' AND gds15_answers_valid(answers))) IS TRUE);
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
      OR (type='gds15' AND gds15_answers_valid(answers,true) AND gds15_snapshot_valid("finalSnapshot",answers))
      OR (type='mna' AND mna_answers_valid(answers,true)
        AND "finalSnapshot"->'answers'=answers AND "finalSnapshot"->>'extent'=answers->>'extent'
        AND jsonb_array_length("finalSnapshot"->'items')=18
        AND jsonb_array_length("finalSnapshot"->'items'->10->'subitems')=3
        AND ((answers->>'extent'='screening' AND "finalSnapshot"->'result'->'total'='null'::jsonb)
          OR (answers->>'extent'='full' AND jsonb_typeof("finalSnapshot"->'result'->'total')='object')))))) IS TRUE);

