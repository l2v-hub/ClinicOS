-- AlterTable
ALTER TABLE "ImportDocument" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentFileName" TEXT,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);
