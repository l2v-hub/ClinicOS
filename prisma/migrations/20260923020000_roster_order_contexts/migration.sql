CREATE TYPE "RosterCriterion" AS ENUM ('name', 'location');
CREATE TYPE "RosterDirection" AS ENUM ('asc', 'desc');

CREATE TABLE "RosterContext" (
  "id" TEXT PRIMARY KEY,
  "departmentKey" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "defaultCriterion" "RosterCriterion",
  "defaultDirection" "RosterDirection",
  "version" BIGINT NOT NULL DEFAULT 0 CHECK ("version" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RosterContext_default_pair" CHECK (
    ("defaultCriterion" IS NULL) = ("defaultDirection" IS NULL)
  )
);
ALTER TABLE "Operator" ADD COLUMN "rosterContextId" TEXT;
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_rosterContextId_fkey"
  FOREIGN KEY ("rosterContextId") REFERENCES "RosterContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OperatorRosterPreference" (
  "operatorId" TEXT NOT NULL REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "contextId" TEXT NOT NULL REFERENCES "RosterContext"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "criterion" "RosterCriterion",
  "direction" "RosterDirection",
  "revision" BIGINT NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("operatorId", "contextId"),
  CONSTRAINT "OperatorRosterPreference_override_pair" CHECK (
    ("criterion" IS NULL) = ("direction" IS NULL)
  )
);

CREATE TABLE "RosterEpoch" (
  "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "roster" BIGINT NOT NULL DEFAULT 0 CHECK ("roster" >= 0),
  "therapy" BIGINT NOT NULL DEFAULT 0 CHECK ("therapy" >= 0)
);
INSERT INTO "RosterEpoch" ("id") VALUES (1);

-- Contexts configure order only; this trigger never touches patient ownership.
-- Tagged exact keys preserve case, accents and whitespace in existing departments.
CREATE FUNCTION clinicos_roster_context() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context_key TEXT; context_label TEXT;
BEGIN
  context_key := CASE WHEN NEW."department" IS NULL OR NEW."department" = ''
    THEN 'none:' ELSE 'department:' || NEW."department" END;
  context_label := COALESCE(NULLIF(NEW."department", ''), 'Senza reparto');
  INSERT INTO "RosterContext" ("id", "departmentKey", "label", "updatedAt")
    VALUES (gen_random_uuid()::text, context_key, context_label, CURRENT_TIMESTAMP)
    ON CONFLICT ("departmentKey") DO NOTHING;
  SELECT "id" INTO NEW."rosterContextId" FROM "RosterContext" WHERE "departmentKey" = context_key;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Operator_roster_context" BEFORE INSERT OR UPDATE OF "department", "rosterContextId"
  ON "Operator" FOR EACH ROW EXECUTE FUNCTION clinicos_roster_context();
INSERT INTO "RosterContext" ("id", "departmentKey", "label", "updatedAt")
  VALUES (gen_random_uuid()::text, 'none:', 'Senza reparto', CURRENT_TIMESTAMP);
UPDATE "Operator" SET "department" = "department";

-- One lock target for both counters avoids counter-order lock inversion. Readers
-- use an MVCC snapshot without locking this row. Rollbacks roll back the epoch.
CREATE FUNCTION clinicos_roster_epoch() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE field_name TEXT; changed BOOLEAN := TG_OP <> 'UPDATE';
BEGIN
  IF NOT changed THEN
    FOREACH field_name IN ARRAY string_to_array(TG_ARGV[1], ',') LOOP
      IF (to_jsonb(OLD)->field_name) IS DISTINCT FROM (to_jsonb(NEW)->field_name) THEN
        changed := TRUE; EXIT;
      END IF;
    END LOOP;
  END IF;
  IF changed THEN
    IF TG_ARGV[0] = 'therapy' THEN
      UPDATE "RosterEpoch" SET "therapy" = "therapy" + 1 WHERE "id" = 1;
    ELSE
      UPDATE "RosterEpoch" SET "roster" = "roster" + 1 WHERE "id" = 1;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER "Patient_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "Patient"
  FOR EACH ROW EXECUTE FUNCTION clinicos_roster_epoch('roster',
    'id,registeredById,firstName,lastName,codiceFiscale,dateOfBirth,medicalRecordNumber,sex,email,phone');
CREATE TRIGGER "Assignment_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "PatientRoomAssignment"
  FOR EACH ROW EXECUTE FUNCTION clinicos_roster_epoch('roster', 'patientId,roomId,bedId,startDate,endDate');
CREATE TRIGGER "Room_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "Room"
  FOR EACH ROW EXECUTE FUNCTION clinicos_roster_epoch('roster', 'id,numero');
CREATE TRIGGER "Bed_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "Bed"
  FOR EACH ROW EXECUTE FUNCTION clinicos_roster_epoch('roster', 'id,roomId,label');

-- Do not serialize or compare the whole clinical JSON to detect a location change.
CREATE FUNCTION clinicos_cartella_roster_epoch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD."patientId" IS DISTINCT FROM NEW."patientId"
    OR OLD.data->'cameraNumero' IS DISTINCT FROM NEW.data->'cameraNumero'
    OR OLD.data->'lettoNumero' IS DISTINCT FROM NEW.data->'lettoNumero' THEN
    UPDATE "RosterEpoch" SET "roster" = "roster" + 1 WHERE "id" = 1;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER "Cartella_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "Cartella"
  FOR EACH ROW EXECUTE FUNCTION clinicos_cartella_roster_epoch();

CREATE TRIGGER "Therapy_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "PatientTherapy"
  FOR EACH ROW EXECUTE FUNCTION clinicos_roster_epoch('therapy',
    'id,patientId,farmacoNome,dosaggio,viaSomministrazione,tipo,stato,dataInizio,dataFine,fasceMattina,fascePranzo,fascePomeriggio,fasceSera,fasceNotte,orarioSpecifico,dataSomministrazione,orarioSomministrazione,giorniSettimana,commercialStrengthValue,commercialStrengthUnit');
CREATE TRIGGER "TherapySchedule_roster_epoch" AFTER INSERT OR UPDATE OR DELETE ON "TherapySchedule"
  FOR EACH ROW EXECUTE FUNCTION clinicos_roster_epoch('therapy',
    'id,therapyId,time,fascia,quantityNumerator,quantityDenominator,administrationUnit');
-- MedicationAdministration intentionally has no roster epoch trigger.
