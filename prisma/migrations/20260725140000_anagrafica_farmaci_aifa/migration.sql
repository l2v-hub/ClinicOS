-- Anagrafica farmaci AIFA: copia locale della Banca Dati Farmaci.
-- Tabelle di sola consultazione, popolate dall'import periodico. Nessun dato di paziente.

CREATE TABLE "Farmaco" (
    "aic" TEXT NOT NULL,
    "denominazione" TEXT NOT NULL,
    "descrizione" TEXT,
    "ragioneSociale" TEXT,
    "statoAmministrativo" TEXT NOT NULL,
    "forma" TEXT,
    "atc" TEXT,
    "paAssociati" TEXT,
    "fornitura" TEXT,
    "linkFi" TEXT,
    "linkRcp" TEXT,
    "denominazioneNorm" TEXT NOT NULL,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmaco_pkey" PRIMARY KEY ("aic")
);

CREATE TABLE "FarmacoPrincipioAttivo" (
    "id" TEXT NOT NULL,
    "aic" TEXT NOT NULL,
    "principioAttivo" TEXT NOT NULL,
    "principioAttivoNorm" TEXT NOT NULL,
    "quantita" DOUBLE PRECISION,
    "unitaMisura" TEXT,

    CONSTRAINT "FarmacoPrincipioAttivo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FarmacoImport" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "righeLette" INTEGER NOT NULL,
    "righeScritte" INTEGER NOT NULL,
    "esito" TEXT NOT NULL,
    "messaggio" TEXT,
    "durataMs" INTEGER,
    "eseguitoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmacoImport_pkey" PRIMARY KEY ("id")
);

-- La ricerca esatta e per prefisso passa da qui: senza questo indice ogni battuta
-- dell'operatore scansionerebbe ~160.000 righe.
CREATE INDEX "Farmaco_denominazioneNorm_idx" ON "Farmaco"("denominazioneNorm");
CREATE INDEX "Farmaco_atc_idx" ON "Farmaco"("atc");
CREATE INDEX "Farmaco_statoAmministrativo_idx" ON "Farmaco"("statoAmministrativo");

CREATE INDEX "FarmacoPrincipioAttivo_aic_idx" ON "FarmacoPrincipioAttivo"("aic");
CREATE INDEX "FarmacoPrincipioAttivo_principioAttivoNorm_idx" ON "FarmacoPrincipioAttivo"("principioAttivoNorm");

CREATE INDEX "FarmacoImport_eseguitoIl_idx" ON "FarmacoImport"("eseguitoIl");

-- CASCADE: ricaricando l'anagrafica si svuota Farmaco e i principi attivi seguono.
ALTER TABLE "FarmacoPrincipioAttivo"
    ADD CONSTRAINT "FarmacoPrincipioAttivo_aic_fkey"
    FOREIGN KEY ("aic") REFERENCES "Farmaco"("aic") ON DELETE CASCADE ON UPDATE CASCADE;
