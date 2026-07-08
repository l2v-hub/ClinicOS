-- #241: intermittent weekday posology (nullable, backward-compatible; NULL = every day)
ALTER TABLE "PatientTherapy" ADD COLUMN "giorniSettimana" TEXT;
