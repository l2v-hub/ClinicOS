-- Phase 2 (autorizzazioni): versioni immutabili del documento ruoli/matrice/assegnazioni.
-- Additiva: nuova tabella, nessuna modifica alle tabelle esistenti, nessun backfill. Senza righe
-- il backend usa la baseline versionata nel codice (versione 0).

-- CreateTable
CREATE TABLE "AuthzPolicyVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "basedOnVersion" INTEGER,
    "changeSummary" JSONB NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "appliedById" TEXT,

    CONSTRAINT "AuthzPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthzPolicyVersion_version_key" ON "AuthzPolicyVersion"("version");

-- CreateIndex
CREATE INDEX "AuthzPolicyVersion_status_version_idx" ON "AuthzPolicyVersion"("status", "version");
