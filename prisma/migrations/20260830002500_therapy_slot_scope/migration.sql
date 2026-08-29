-- Support the bounded fallback lookup for administration rows created before therapyId was stored.
CREATE INDEX IF NOT EXISTS "MedicationAdministration_legacy_slot_idx"
ON "MedicationAdministration" ("patientId", "date", "farmacoNome", "fascia");
