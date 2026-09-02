import type { Camera, Letto } from '../types';

export function bedDisplayLabel(bed: Letto): string {
  return bed.label?.trim() || 'ABCDEFGH'[bed.numero - 1] || String(bed.numero);
}

export function isBedAssignableToPatient(bed: Letto, patientId: string): boolean {
  return bed.stato === 'libero' || bed.pazienteId === patientId;
}

export function assignableBeds(room: Camera | undefined, patientId: string): Letto[] {
  if (!room || room.stato !== 'attiva') return [];
  return room.letti
    .filter((bed) => isBedAssignableToPatient(bed, patientId))
    .sort((left, right) => bedDisplayLabel(left).localeCompare(bedDisplayLabel(right), 'it'));
}

export function assignableRooms(rooms: Camera[], patientId: string, reparto?: string): Camera[] {
  return rooms
    .filter(
      (room) =>
        room.stato === 'attiva' &&
        (!reparto || room.reparto === reparto) &&
        assignableBeds(room, patientId).length > 0,
    )
    .sort((left, right) => left.numero.localeCompare(right.numero, 'it', { numeric: true }));
}

export function assignableWards(rooms: Camera[], patientId: string): string[] {
  return [
    ...new Set(
      assignableRooms(rooms, patientId)
        .map((room) => room.reparto.trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, 'it'));
}

export function currentPatientPlacement(
  rooms: Camera[],
  patientId: string,
): { room: Camera; bed: Letto } | undefined {
  for (const room of rooms) {
    const bed = room.letti.find((candidate) => candidate.pazienteId === patientId);
    if (bed) return { room, bed };
  }
  return undefined;
}

export function isValidBedSelection(
  rooms: Camera[],
  patientId: string,
  cameraNumero?: string,
  bedId?: string,
): boolean {
  if (!cameraNumero) return !bedId;
  const room = rooms.find((candidate) => candidate.numero === cameraNumero);
  return assignableBeds(room, patientId).some((bed) => bed.id === bedId);
}
