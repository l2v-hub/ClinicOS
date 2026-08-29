import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  type FacilityOccupancy,
  type FacilityOccupancyRow,
  toFacilityOccupancy,
} from './occupancy-model.js';

export async function getFacilityOccupancy(
  today = new Date().toISOString().slice(0, 10),
): Promise<FacilityOccupancy> {
  const rows = await prisma.$queryRaw<FacilityOccupancyRow[]>(Prisma.sql`
    WITH bed_state AS (
      SELECT bed."id", bed."stato",
             EXISTS (
               SELECT 1
               FROM "PatientRoomAssignment" assignment
               WHERE assignment."bedId" = bed."id"
                 AND (assignment."endDate" IS NULL OR assignment."endDate" >= ${today})
             ) AS occupied
      FROM "Bed" bed
    )
    SELECT
      (SELECT COUNT(*) FROM "Room") AS "totalRooms",
      COUNT(*) AS "totalBeds",
      COUNT(*) FILTER (WHERE occupied) AS "occupiedBeds",
      COUNT(*) FILTER (WHERE NOT occupied AND "stato" IS DISTINCT FROM 'manutenzione') AS "freeBeds",
      COUNT(*) FILTER (WHERE "stato" = 'manutenzione') AS "maintenanceBeds"
    FROM bed_state
  `);
  const row = rows[0];
  if (!row) throw new Error('Conteggio occupazione non disponibile');
  return toFacilityOccupancy(row);
}
