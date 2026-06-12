-- CreateTable
CREATE TABLE "Consegna" (
    "id" TEXT NOT NULL,
    "pazienteId" TEXT NOT NULL DEFAULT '',
    "pazienteNome" TEXT NOT NULL,
    "priorita" TEXT NOT NULL DEFAULT 'normale',
    "stato" TEXT NOT NULL DEFAULT 'aperta',
    "tipo" TEXT NOT NULL DEFAULT 'Monitoraggio',
    "note" TEXT NOT NULL,
    "scadenza" TEXT NOT NULL,
    "oraScadenza" TEXT,
    "operatoreAssegnato" TEXT NOT NULL,
    "creatoDA" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consegna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consegna_stato_idx" ON "Consegna"("stato");

-- CreateIndex
CREATE INDEX "Consegna_priorita_idx" ON "Consegna"("priorita");
