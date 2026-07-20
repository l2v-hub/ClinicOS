-- #285: persist the admin "Orari operatori" weekly schedules (were client-side only)
CREATE TABLE "OperatorSchedule" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperatorSchedule_operatorId_key" ON "OperatorSchedule"("operatorId");

ALTER TABLE "OperatorSchedule" ADD CONSTRAINT "OperatorSchedule_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
