-- Canonicalize legacy weekday lists to the same whitespace-free representation used by writes.
UPDATE "PatientTherapy"
SET "giorniSettimana" = NULLIF(
  regexp_replace("giorniSettimana", '[[:space:]]+', '', 'g'),
  ''
)
WHERE "giorniSettimana" IS NOT NULL
  AND "giorniSettimana" IS DISTINCT FROM NULLIF(
    regexp_replace("giorniSettimana", '[[:space:]]+', '', 'g'),
    ''
  );
