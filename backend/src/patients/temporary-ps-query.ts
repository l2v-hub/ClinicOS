import { Prisma } from '@prisma/client';

/** SQL counterpart of the strict exit reader for bounded attention counts.
 * Missing/null pointers allow doses. Only a verified continue pointer permits an active exit;
 * pause and unverifiable pointers both stay out of the actionable queue.
 */
export function temporaryPsAdministrationAllowedSql(data: Prisma.Sql): Prisma.Sql {
  const active = Prisma.sql`(${data} #> '{liberatoria,temporaryPsExit}')`;
  return Prisma.sql`(
    ${active} IS NULL OR ${active} = 'null'::jsonb OR (
      jsonb_typeof(${active}) = 'object'
      AND jsonb_typeof(${active}->'exitId') = 'string'
      AND ${active}->>'decision' = 'continue'
      AND jsonb_typeof(${active}->'departedAt') = 'string'
      AND ${active}->>'departedAt' ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T(([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,3})?|24:00:00([.]0{1,3})?)(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE
          WHEN jsonb_typeof(${data} #> '{liberatoria,usciteLog}') = 'array'
          THEN ${data} #> '{liberatoria,usciteLog}' ELSE '[]'::jsonb END) WITH ORDINALITY AS history(entry, position)
        WHERE entry->'id' = ${active}->'exitId'
          AND jsonb_typeof(entry->'psExit') = 'object'
          AND entry #>> '{psExit,decision}' = ${active}->>'decision'
          AND entry #>> '{psExit,departedAt}' = ${active}->>'departedAt'
          AND (entry #> '{psExit,returnedAt}' IS NULL
            OR entry #> '{psExit,returnedAt}' IN ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb))
          -- The strict reader uses the FIRST matching id; later duplicates cannot grant permission.
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(${data} #> '{liberatoria,usciteLog}') WITH ORDINALITY AS earlier(prior, n)
            WHERE prior->'id' = ${active}->'exitId' AND n < history.position
          )
      )
    )
  )`;
}
