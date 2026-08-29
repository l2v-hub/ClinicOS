-- Substring medication search (`ILIKE '%q%'`) needs trigram lookup rather than a full scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "PatientTherapy_farmacoNome_trgm_idx"
ON "PatientTherapy" USING GIN ("farmacoNome" gin_trgm_ops);
