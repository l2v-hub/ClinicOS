-- Bounded mailbox queries filter by recipient/status or author and then seek by creation time/id.
CREATE INDEX "Nota_destinatarioId_stato_createdAt_id_idx"
  ON "Nota"("destinatarioId", "stato", "createdAt", "id");

CREATE INDEX "Nota_destinatarioId_createdAt_id_idx"
  ON "Nota"("destinatarioId", "createdAt", "id");

CREATE INDEX "Nota_autoreId_createdAt_id_idx"
  ON "Nota"("autoreId", "createdAt", "id");

-- Prefix/full-text mailbox search uses this exact immutable expression instead of four ILIKE scans.
CREATE INDEX "Nota_search_fts_idx" ON "Nota" USING GIN (
  to_tsvector(
    'simple'::regconfig,
    coalesce("messaggio", '') || ' ' || coalesce("autoreNome", '') || ' ' ||
    coalesce("destinatarioNome", '') || ' ' || coalesce("pazienteNome", '')
  )
);

CREATE TABLE "NotaRecipientState" (
  "id" TEXT NOT NULL,
  "notaId" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "stato" TEXT NOT NULL DEFAULT 'non_letta',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotaRecipientState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotaRecipientState_notaId_fkey" FOREIGN KEY ("notaId")
    REFERENCES "Nota"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NotaRecipientState_notaId_operatorId_key"
  ON "NotaRecipientState"("notaId", "operatorId");

CREATE INDEX "NotaRecipientState_operatorId_stato_notaId_idx"
  ON "NotaRecipientState"("operatorId", "stato", "notaId");
