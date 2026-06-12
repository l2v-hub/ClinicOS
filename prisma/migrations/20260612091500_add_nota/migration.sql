-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "autoreNome" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "destinatarioNome" TEXT NOT NULL,
    "pazienteId" TEXT,
    "pazienteNome" TEXT,
    "priorita" TEXT NOT NULL DEFAULT 'normale',
    "messaggio" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'non_letta',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nota_stato_idx" ON "Nota"("stato");

-- CreateIndex
CREATE INDEX "Nota_destinatarioId_idx" ON "Nota"("destinatarioId");
