-- BUG-049: durable in-DB copy of the import file bytes (survives ephemeral filesystem).
-- AlterTable
ALTER TABLE "ImportDocument" ADD COLUMN "dataBase64" TEXT;
