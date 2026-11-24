// Dimissione del paziente dalla scheda «Dimissione»: regole e testi, senza rete né componenti.
// La dimissione è una sola operazione del server (stato «dimesso» e posto letto liberato insieme):
// qui non c'è nessun ordine di passi da rispettare, e nulla può restare a metà. Anche l'annullo è
// un comando del server: un salvataggio qualunque della cartella non cambia lo stato «dimesso».

import type { CartellaPaziente } from '../types';

export interface FreedBed {
  room: string;
  bed: string;
}

export type DischargeOutcome = { ok: true; freedBeds: FreedBed[] } | { ok: false; message: string };

export const isDischarged = (cartella: Pick<CartellaPaziente, 'statoRicovero'>): boolean =>
  cartella.statoRicovero === 'dimesso';

/**
 * Legge la risposta del server ai comandi di dimissione e di annullo: riuscita solo se riguarda il
 * paziente e porta lo stato atteso («dimesso» dopo la dimissione, un altro dopo l'annullo).
 */
export function parseDischargeResponse(
  patientId: string,
  payload: unknown,
  action: 'discharge' | 'undo' = 'discharge',
): { data: Record<string, unknown>; freedBeds: FreedBed[] } | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { patientId?: unknown; data?: unknown; discharge?: unknown };
  if (body.patientId !== patientId) return null;
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return null;
  const data = body.data as Record<string, unknown>;
  if ((data.statoRicovero === 'dimesso') !== (action === 'discharge')) return null;
  const discharge = (body.discharge ?? {}) as { freedBeds?: unknown };
  const freedBeds = Array.isArray(discharge.freedBeds)
    ? discharge.freedBeds.filter(
        (bed): bed is FreedBed =>
          !!bed &&
          typeof bed === 'object' &&
          typeof (bed as FreedBed).room === 'string' &&
          typeof (bed as FreedBed).bed === 'string',
      )
    : [];
  return { data, freedBeds };
}

export const bedLabelOf = (bed: FreedBed): string => `Camera ${bed.room} · Letto ${bed.bed}`;

/** Testo della conferma: dice che cosa succede, con il posto letto quando è assegnato. */
export function dischargeConfirmMessage(input: {
  patientName: string;
  bedLabel: string | null;
  dischargeFormCompiled: boolean;
}): string {
  return [
    `${input.patientName} esce dalle liste dei presenti e dal giro.`,
    input.bedLabel
      ? `Il posto letto (${input.bedLabel}) viene liberato da oggi.`
      : 'Non risulta un posto letto assegnato.',
    'La cartella resta consultabile tra i dimessi.',
    input.dischargeFormCompiled ? '' : 'La scheda di dimissione non è ancora compilata.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function readmitConfirmMessage(patientName: string): string {
  return `${patientName} torna tra i presenti, nel regime che aveva prima della dimissione. Il posto letto non viene riassegnato: va scelto di nuovo.`;
}

/** Esito mostrato dopo la dimissione: nomina il letto liberato quando c'era. */
export function dischargeDoneMessage(freedBeds: FreedBed[]): string {
  if (!freedBeds.length) return 'Paziente dimesso: non compare più tra i presenti.';
  return `Paziente dimesso: non compare più tra i presenti. Posto letto liberato: ${freedBeds.map(bedLabelOf).join(', ')}.`;
}

/** «Dimesso il 24/11/2026 da Infermiere 1», dalla traccia che il server scrive in cartella. */
export function dischargeRecordLabel(
  cartella: Pick<CartellaPaziente, 'dimissioneRegistrata'>,
): string | null {
  const record = cartella.dimissioneRegistrata;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(record?.data ?? '');
  if (!record || !match) return null;
  const day = `${match[3]}/${match[2]}/${match[1]}`;
  return record.operatore ? `Dimesso il ${day} da ${record.operatore}` : `Dimesso il ${day}`;
}
