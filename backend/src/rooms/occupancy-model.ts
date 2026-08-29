export interface FacilityOccupancy {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  maintenanceBeds: number;
  occupancyPct: number;
}

export interface FacilityOccupancyRow {
  totalRooms: bigint | number | string;
  totalBeds: bigint | number | string;
  occupiedBeds: bigint | number | string;
  freeBeds: bigint | number | string;
  maintenanceBeds: bigint | number | string;
}

function safeCount(value: bigint | number | string, field: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Conteggio occupazione non valido: ${field}`);
  }
  return count;
}

export function toFacilityOccupancy(row: FacilityOccupancyRow): FacilityOccupancy {
  const totalRooms = safeCount(row.totalRooms, 'totalRooms');
  const totalBeds = safeCount(row.totalBeds, 'totalBeds');
  const occupiedBeds = safeCount(row.occupiedBeds, 'occupiedBeds');
  const freeBeds = safeCount(row.freeBeds, 'freeBeds');
  const maintenanceBeds = safeCount(row.maintenanceBeds, 'maintenanceBeds');
  return {
    totalRooms,
    totalBeds,
    occupiedBeds,
    freeBeds,
    maintenanceBeds,
    occupancyPct: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
}
