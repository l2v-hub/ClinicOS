import type { Camera, CartellaPaziente, Letto } from '../types';

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

/** Display values only: never store fallback labels as a room or bed assignment. */
export function patientPlacementValues(
  placement: ReturnType<typeof currentPatientPlacement>,
  cartella: Pick<CartellaPaziente, 'cameraNumero' | 'lettoNumero'>,
): { room?: string; bed?: string } {
  const clean = (value: unknown) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return placement
    ? { room: clean(placement.room.numero), bed: clean(bedDisplayLabel(placement.bed)) }
    : { room: clean(cartella.cameraNumero), bed: clean(cartella.lettoNumero) };
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

// ── Stato del ricovero (dimissione compresa) ──────────────────────────────────────────────────
// Un solo percorso di salvataggio per la finestra «Camera e Assegnazione» e per «Dimetti paziente»:
// prima l'assegnazione reale del letto, poi la cartella. Queste funzioni dicono che cosa inviare.

export type StatoRicovero = CartellaPaziente['statoRicovero'];

export const STATO_RICOVERO_LABEL: Record<StatoRicovero, string> = {
  ricoverato: 'Ricoverato',
  ambulatoriale: 'Ambulatoriale',
  day_hospital: 'Day Hospital',
  dimesso: 'Dimesso',
};

/** Etichetta leggibile; un valore assente o non previsto non è mai mostrato come uno stato noto. */
export function statoRicoveroLabel(stato: unknown): string {
  return typeof stato === 'string' && Object.hasOwn(STATO_RICOVERO_LABEL, stato)
    ? STATO_RICOVERO_LABEL[stato as StatoRicovero]
    : 'Non indicato';
}

/** La dimissione va confermata quando lo stato passa a «Dimesso», non a ogni altro salvataggio. */
export function needsDischargeConfirmation(current: unknown, next: unknown): boolean {
  return next === 'dimesso' && current !== 'dimesso';
}

/**
 * Che cosa fare del posto letto quando si salva lo stato del ricovero. `null` = non toccarlo: il
 * ruolo non gestisce i posti letto (di norma lo fa il coordinatore), quindi lo stato cambia e il
 * letto resta com'è. Un paziente dimesso da chi può gestirli non tiene il letto: si chiude.
 */
export function stayBedTarget(
  form: Pick<Partial<CartellaPaziente>, 'statoRicovero' | 'cameraNumero'>,
  bedId?: string,
  canManageBeds = true,
): { room?: string; bedId?: string } | null {
  if (!canManageBeds) return null;
  const room = form.statoRicovero === 'dimesso' ? undefined : form.cameraNumero || undefined;
  return { room, bedId: room ? bedId || undefined : undefined };
}

/** Campi della cartella da salvare, dopo che l'eventuale assegnazione del letto è riuscita. */
export function stayCartellaUpdate(
  form: Partial<CartellaPaziente>,
  assignedBedLabel?: string,
  canManageBeds = true,
): Partial<CartellaPaziente> {
  const target = stayBedTarget(form, undefined, canManageBeds);
  if (!target) return form.statoRicovero ? { statoRicovero: form.statoRicovero } : {};
  return {
    ...form,
    cameraNumero: target.room,
    lettoNumero: target.room ? (assignedBedLabel ?? form.lettoNumero) : undefined,
  };
}

/** «Salva» senza camera e letto è ammesso solo se il letto non viene assegnato da questo
 *  salvataggio: stato «Dimesso», oppure ruolo che cambia soltanto lo stato. */
export function canSaveStay(
  rooms: Camera[],
  patientId: string,
  form: Pick<Partial<CartellaPaziente>, 'statoRicovero' | 'cameraNumero'>,
  bedId?: string,
  canManageBeds = true,
): boolean {
  if (!canManageBeds) return Boolean(form.statoRicovero);
  if (form.statoRicovero === 'dimesso') return true;
  return (
    Boolean(form.cameraNumero && bedId) &&
    isValidBedSelection(rooms, patientId, form.cameraNumero, bedId)
  );
}

/** Che cosa succede al posto letto con la dimissione, detto nella conferma. Stringa vuota quando
 *  non c'è nulla da dire (nessun letto assegnato). */
export function dischargeBedNotice(input: {
  canManageBeds: boolean;
  /** false finché la disponibilità delle camere non è stata letta: il letto attuale non è noto. */
  placementKnown: boolean;
  room?: string;
  bed?: string;
}): string {
  const where =
    input.room || input.bed ? ` (camera ${input.room ?? '—'}, letto ${input.bed ?? '—'})` : '';
  if (!input.canManageBeds) {
    if (where)
      return `Il posto letto${where} resta assegnato: il tuo ruolo non gestisce i posti letto, lo libera chi li coordina.`;
    return input.placementKnown
      ? ''
      : 'Un eventuale posto letto resta assegnato: il tuo ruolo non gestisce i posti letto, lo libera chi li coordina.';
  }
  if (where) return `L’assegnazione del posto letto${where} viene chiusa con la data di oggi.`;
  return input.placementKnown
    ? ''
    : 'L’eventuale assegnazione del posto letto viene chiusa con la data di oggi.';
}

/**
 * Nota sotto «Stato ricovero» nella finestra «Camera e Assegnazione». Nella policy predefinita
 * chi modifica la cartella (infermiere, medico) non gestisce i posti letto e chi li gestisce
 * (coordinatore, amministratore) non modifica la cartella: ognuno vede che cosa salva davvero.
 */
export function stayDialogHint(input: {
  canManageBeds: boolean;
  canSaveChart: boolean;
  discharging: boolean;
  /** Il paziente ha un posto letto assegnato adesso. */
  hasBed?: boolean;
}): string {
  if (!input.canSaveChart) {
    if (!input.discharging)
      return 'Il tuo ruolo non modifica lo stato del ricovero: qui gestisci il posto letto.';
    return input.hasBed === false
      ? 'Paziente dimesso senza posto letto assegnato: non c’è nulla da chiudere. Lo stato del ricovero si cambia dalla cartella.'
      : 'Paziente dimesso: salvando, l’assegnazione del posto letto viene chiusa. Lo stato del ricovero si cambia dalla cartella.';
  }
  if (!input.canManageBeds)
    return 'Il tuo ruolo non gestisce i posti letto: qui cambi solo lo stato del ricovero.';
  return input.discharging
    ? 'Con la dimissione l’assegnazione del posto letto viene chiusa: camera e letto non si scelgono.'
    : '';
}

/**
 * L'unico salvataggio di stato del ricovero, camera e letto (finestra «Camera e Assegnazione» e
 * «Dimetti paziente»). Prima l'assegnazione reale del letto, poi la cartella: se il letto non si
 * chiude o non si assegna, lo stato non cambia. Ogni ruolo scrive solo ciò che può scrivere.
 */
export async function saveStay(
  deps: {
    canManageBeds: boolean;
    canSaveChart: boolean;
    assignBed: (room?: string, bedId?: string) => Promise<{ ok: boolean; lettoLabel?: string }>;
    saveChart: (updates: Partial<CartellaPaziente>) => Promise<boolean>;
  },
  form: Partial<CartellaPaziente>,
  bedId?: string,
): Promise<boolean> {
  const target = stayBedTarget(form, bedId, deps.canManageBeds);
  let assignedBedLabel: string | undefined;
  if (target) {
    const result = await deps.assignBed(target.room, target.bedId);
    if (!result.ok) return false;
    assignedBedLabel = result.lettoLabel;
  }
  if (!deps.canSaveChart) return Boolean(target);
  return deps.saveChart(stayCartellaUpdate(form, assignedBedLabel, deps.canManageBeds));
}
