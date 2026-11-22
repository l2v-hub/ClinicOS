// Milo fase 3: «cruscotti» fissati. Nel browser si salva SOLO la domanda (e l'id opaco del paziente
// a cui si riferisce): mai dati clinici. Riaprendo un cruscotto Milo rilegge i dati aggiornati.

export interface MiloPin {
  id: string;
  question: string;
  /** Paziente aperto quando la domanda è stata fissata; assente = domanda di struttura. */
  patientId?: string;
  createdAt: string;
}

const MAX_PINS = 12;
const keyFor = (operatorId: string) => `clinicos.milo.pins.${operatorId || 'anonimo'}`;

function read(operatorId: string): MiloPin[] {
  try {
    const raw = globalThis.localStorage?.getItem(keyFor(operatorId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (p): p is MiloPin =>
        !!p &&
        typeof p === 'object' &&
        typeof (p as MiloPin).id === 'string' &&
        typeof (p as MiloPin).question === 'string',
    );
  } catch {
    return [];
  }
}

function write(operatorId: string, pins: MiloPin[]) {
  try {
    globalThis.localStorage?.setItem(keyFor(operatorId), JSON.stringify(pins.slice(0, MAX_PINS)));
  } catch {
    // archiviazione del browser non disponibile: i cruscotti restano solo per questa sessione
  }
}

/** Cruscotti visibili nel contesto: quelli di struttura sempre, quelli di un paziente solo con lui aperto. */
export function loadMiloPins(operatorId: string, currentPatientId?: string): MiloPin[] {
  return read(operatorId).filter((p) => !p.patientId || p.patientId === currentPatientId);
}

export function isMiloPinned(operatorId: string, question: string, patientId?: string): boolean {
  const q = question.trim().toLowerCase();
  return read(operatorId).some(
    (p) => p.question.trim().toLowerCase() === q && (p.patientId ?? '') === (patientId ?? ''),
  );
}

export function addMiloPin(operatorId: string, question: string, patientId?: string): MiloPin[] {
  const text = question.trim().slice(0, 300);
  if (!text || isMiloPinned(operatorId, text, patientId)) return read(operatorId);
  const pin: MiloPin = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    question: text,
    ...(patientId ? { patientId } : {}),
    createdAt: new Date().toISOString(),
  };
  const next = [pin, ...read(operatorId)];
  write(operatorId, next);
  return next.slice(0, MAX_PINS);
}

export function removeMiloPin(operatorId: string, id: string): MiloPin[] {
  const next = read(operatorId).filter((p) => p.id !== id);
  write(operatorId, next);
  return next;
}
