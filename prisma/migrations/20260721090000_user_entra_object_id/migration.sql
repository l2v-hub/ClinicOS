-- #260: server-side identity mapping for Azure Entra ID. The verified JWT claim `oid` links to
-- a ClinicOS User; nullable (legacy/demo users), auto-linked on first verified login by e-mail.
ALTER TABLE "User" ADD COLUMN "entraObjectId" TEXT;
CREATE UNIQUE INDEX "User_entraObjectId_key" ON "User"("entraObjectId");
