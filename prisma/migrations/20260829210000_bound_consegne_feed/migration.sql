-- Cycle 9: verified ownership plus bounded handover read models.
-- Legacy rows intentionally keep NULL actor ids: display names must never grant access.
ALTER TABLE "Consegna"
  ADD COLUMN "operatoreAssegnatoId" TEXT,
  ADD COLUMN "creatoDaId" TEXT;

CREATE INDEX "Consegna_createdAt_id_idx"
  ON "Consegna"("createdAt" DESC, "id" DESC);
CREATE INDEX "Consegna_creatoDaId_createdAt_id_idx"
  ON "Consegna"("creatoDaId", "createdAt" DESC, "id" DESC);
CREATE INDEX "Consegna_operatoreAssegnatoId_createdAt_id_idx"
  ON "Consegna"("operatoreAssegnatoId", "createdAt" DESC, "id" DESC);
CREATE INDEX "Consegna_stato_priorita_createdAt_id_idx"
  ON "Consegna"("stato", "priorita", "createdAt" DESC, "id" DESC);
CREATE INDEX "Consegna_pazienteId_stato_createdAt_id_idx"
  ON "Consegna"("pazienteId", "stato", "createdAt" DESC, "id" DESC);

CREATE INDEX "Consegna_search_tsv_idx" ON "Consegna" USING GIN (
  to_tsvector(
    'simple'::regconfig,
    coalesce("pazienteNome", '') || ' ' || coalesce("note", '') || ' ' ||
    coalesce("tipo", '') || ' ' || coalesce("operatoreAssegnato", '')
  )
);
