// Issue #130: shared consegne write service — the SINGLE creation path for the REST route
// (POST /consegne, used by the traditional UI) and the Agnos VoiceWriter (FR-007: the AI
// reuses the same application service as the UI, no duplicated business logic).

import { prisma } from '../lib/prisma.js';

export const CONSEGNA_PRIORITA = ['normale', 'alta', 'urgente'];
export const CONSEGNA_STATO = ['aperta', 'in_corso', 'completata'];

export interface CreateConsegnaInput {
  pazienteId?: string;
  pazienteNome: string;
  priorita?: string;
  stato?: string;
  tipo?: string;
  note: string;
  scadenza?: string; // YYYY-MM-DD (default: oggi)
  oraScadenza?: string | null;
  operatoreAssegnato?: string;
  creatoDA?: string;
}

/** Crea una consegna applicando gli stessi default/validazioni della route UI. */
export async function createConsegna(input: CreateConsegnaInput) {
  if (!input.pazienteNome || !input.note) {
    throw new Error('Campi obbligatori: pazienteNome, note');
  }
  return prisma.consegna.create({
    data: {
      pazienteId: String(input.pazienteId ?? ''),
      pazienteNome: String(input.pazienteNome),
      priorita: CONSEGNA_PRIORITA.includes(String(input.priorita))
        ? String(input.priorita)
        : 'normale',
      stato: CONSEGNA_STATO.includes(String(input.stato)) ? String(input.stato) : 'aperta',
      tipo: String(input.tipo ?? 'Monitoraggio'),
      note: String(input.note),
      scadenza: String(input.scadenza ?? new Date().toISOString().slice(0, 10)),
      oraScadenza: input.oraScadenza ? String(input.oraScadenza) : null,
      operatoreAssegnato: String(input.operatoreAssegnato ?? ''),
      creatoDA: String(input.creatoDA ?? ''),
    },
  });
}
