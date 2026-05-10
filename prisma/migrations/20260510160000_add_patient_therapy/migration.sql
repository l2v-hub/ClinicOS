CREATE TABLE "PatientTherapy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "farmacoNome" TEXT NOT NULL,
    "dosaggio" TEXT NOT NULL,
    "viaSomministrazione" TEXT NOT NULL DEFAULT 'orale',
    "tipo" TEXT NOT NULL DEFAULT 'periodica',
    "stato" TEXT NOT NULL DEFAULT 'attiva',
    "dataInizio" TEXT NOT NULL,
    "dataFine" TEXT,
    "fasceMattina" BOOLEAN NOT NULL DEFAULT false,
    "fascePranzo" BOOLEAN NOT NULL DEFAULT false,
    "fascePomeriggio" BOOLEAN NOT NULL DEFAULT false,
    "fasceSera" BOOLEAN NOT NULL DEFAULT false,
    "fasceNotte" BOOLEAN NOT NULL DEFAULT false,
    "orarioSpecifico" TEXT,
    "prescrittore" TEXT,
    "operatoreInseritore" TEXT,
    "note" TEXT,
    "dataSomministrazione" TEXT,
    "orarioSomministrazione" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientTherapy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientTherapy_patientId_idx" ON "PatientTherapy"("patientId");
CREATE INDEX "PatientTherapy_tipo_stato_idx" ON "PatientTherapy"("tipo", "stato");
ALTER TABLE "PatientTherapy" ADD CONSTRAINT "PatientTherapy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
