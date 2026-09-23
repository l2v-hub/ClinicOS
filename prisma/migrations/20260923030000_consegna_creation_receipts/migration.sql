CREATE TABLE "ConsegnaCreationReceipt" (
  "actorId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL CHECK ("requestId" ~ '^[A-Za-z0-9_-]{1,128}$'),
  "payloadHash" TEXT NOT NULL CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
  "patientId" TEXT NOT NULL,
  "consegnaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("actorId", "requestId")
);
CREATE UNIQUE INDEX "ConsegnaCreationReceipt_consegnaId_key" ON "ConsegnaCreationReceipt" ("consegnaId");
CREATE INDEX "ConsegnaCreationReceipt_patientId_idx" ON "ConsegnaCreationReceipt" ("patientId");

-- No FK cascade: deleting a handover must not make its request key reusable.
CREATE FUNCTION clinicos_consegna_receipt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Consegna creation receipts are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ConsegnaCreationReceipt_immutable" BEFORE UPDATE ON "ConsegnaCreationReceipt"
  FOR EACH ROW EXECUTE FUNCTION clinicos_consegna_receipt_immutable();
