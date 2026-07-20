-- Fase 1b: operator role (medico/infermiere/coordinatore) and professional qualification
-- (nullable, backward-compatible; NULL = not yet set from the admin form)
ALTER TABLE "Operator" ADD COLUMN "ruolo" TEXT;
ALTER TABLE "Operator" ADD COLUMN "qualifica" TEXT;
