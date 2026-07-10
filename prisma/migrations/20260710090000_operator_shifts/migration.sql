-- prisma/migrations/20260710090000_operator_shifts/migration.sql
CREATE TABLE "OperatorShift" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "operatoreId" TEXT NOT NULL,
  "operatoreNome" TEXT NOT NULL,
  "giorno" TEXT NOT NULL,
  "oraInizio" TEXT NOT NULL DEFAULT '08:00',
  "oraFine" TEXT NOT NULL DEFAULT '20:00',
  "disponibile" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "OperatorShift_operatoreId_giorno_key" ON "OperatorShift"("operatoreId", "giorno");
CREATE INDEX "OperatorShift_giorno_idx" ON "OperatorShift"("giorno");
