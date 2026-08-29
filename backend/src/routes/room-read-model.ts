// Exact read models for facility occupancy. These projections intentionally expose only the
// operational identity needed to place a patient in a bed; full Patient rows contain unrelated
// clinical/contact identifiers and must never be joined into facility-wide responses.

export const MAX_ACTIVE_ASSIGNMENTS_PER_BED = 8;

export const ROOM_PATIENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export const ROOM_ASSIGNMENT_OCCUPANT_SELECT = {
  id: true,
  patientId: true,
  startDate: true,
  endDate: true,
  patient: { select: ROOM_PATIENT_SELECT },
} as const;

export const ROOM_LOCATION_SELECT = {
  id: true,
  numero: true,
  tipo: true,
  piano: true,
  reparto: true,
  stato: true,
} as const;

export const PATIENT_ROOM_ASSIGNMENT_READ_SELECT = {
  id: true,
  patientId: true,
  roomId: true,
  bedId: true,
  startDate: true,
  endDate: true,
  bed: {
    select: {
      id: true,
      label: true,
      room: { select: ROOM_LOCATION_SELECT },
    },
  },
} as const;

export function authoritativeAssignmentActor(operator: { id: string }): string {
  return operator.id;
}
