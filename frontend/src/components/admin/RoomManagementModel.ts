import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';

export interface AssignmentAPI {
  id: string;
  patientId: string;
  startDate: string;
  endDate: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    registeredBy: { id: string; ruolo: string | null; user: { fullName: string } } | null;
  };
}
export interface BedAPI {
  id: string;
  roomId: string;
  label: string;
  stato: string;
  note: string;
  assignments: AssignmentAPI[];
}
export type StatoLetto = 'libero' | 'occupato' | 'manutenzione';
export type TipoCamera = 'singola' | 'doppia' | 'altra';
export type StatoCamera = 'attiva' | 'inattiva' | 'manutenzione';
export interface RoomAPI {
  id: string;
  numero: string;
  tipo: TipoCamera;
  piano: string;
  reparto: string;
  stato: StatoCamera;
  note: string;
  beds: BedAPI[];
}
export interface OccupancyAPI {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  maintenanceBeds: number;
  occupancyPct: number;
}
export type RoomFormValues = Omit<RoomAPI, 'id' | 'beds'>;
export interface BedEditTarget { bedId: string; label: string; roomNumber: string }
export interface BedFormValues { stato: string; note: string }
export const MAX_FACILITY_NOTE_LENGTH = 2_000;
export const FORM_CAMERA_VUOTO: RoomFormValues = {
  numero: '', tipo: 'singola', piano: '1°', reparto: '', stato: 'attiva', note: '',
};
export const STATO_LETTO_CLASS: Record<StatoLetto, string> = {
  libero: 'letto--libero', occupato: 'letto--occupato', manutenzione: 'letto--manutenzione',
};
export const STATO_LETTO_LABEL: Record<StatoLetto, string> = {
  libero: 'Libero', occupato: 'Occupato', manutenzione: 'Manutenzione',
};
export function bedIsOccupied(bed: BedAPI): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return bed.assignments.some(a => a.startDate <= today && (a.endDate === null || a.endDate >= today));
}
export function bedStatoDisplay(bed: BedAPI): StatoLetto {
  if (bed.stato === 'manutenzione') return 'manutenzione';
  if (bedIsOccupied(bed)) return 'occupato';
  return 'libero';
}
export function activeBedAssignment(bed: BedAPI): AssignmentAPI | null {
  const today = new Date().toISOString().slice(0, 10);
  return bed.assignments.find(a => a.startDate <= today && (a.endDate === null || a.endDate >= today)) ?? null;
}
export async function fetchFacilityData(signal?: AbortSignal) {
  const [roomsRes, occRes] = await Promise.all([
    fetch(`${API_URL}/admin/rooms`, { headers: operatorHeaders(), signal }),
    fetch(`${API_URL}/admin/rooms/occupancy`, { headers: operatorHeaders(), signal }),
  ]);
  if (!roomsRes.ok || !occRes.ok) throw new Error('facility_data_unavailable');
  const [rooms, occupancy] = await Promise.all([
    roomsRes.json() as Promise<RoomAPI[]>, occRes.json() as Promise<OccupancyAPI>,
  ]);
  return { rooms, occupancy };
}
export function roomActionNames(numero: string) {
  return { edit: `Modifica camera ${numero}`, remove: `Elimina camera ${numero}`, deleteTitle: `Eliminare la camera ${numero}?` };
}
/** Quoted/escaped components avoid ambiguous custom labels containing "della camera". */
export function bedEditName(label: string, roomNumber: string): string {
  return `Modifica letto ${JSON.stringify(label)} della camera ${JSON.stringify(roomNumber)}`;
}
