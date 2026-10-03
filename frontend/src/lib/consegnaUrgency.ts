// UX2 W8: urgenza di una consegna (nota normale / urgente). Il backend manda `urgency`; senza
// (dati locali / legacy) vale la stessa regola: urgente e non chiusa col modello precedente.
import type { Consegna } from '../types';

export function isConsegnaUrgencyActive(c: Pick<Consegna, 'priorita' | 'stato' | 'urgency'>) {
  if (c.urgency) return c.urgency.state === 'active';
  return c.priorita === 'urgente' && c.stato !== 'completata';
}

/** Etichetta della priorità: mai «aperta / in corso / completata». */
export function consegnaPriorityLabel(c: Pick<Consegna, 'priorita' | 'stato' | 'urgency'>) {
  if (c.priorita === 'urgente') return isConsegnaUrgencyActive(c) ? 'Urgente' : 'Presa in carico';
  if (c.priorita === 'alta') return 'Alta (valore precedente)';
  return 'Normale';
}
