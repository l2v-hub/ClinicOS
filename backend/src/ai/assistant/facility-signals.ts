// Calcolo puro dei segnali "eccezione" della struttura usati dai tool di lettura di Agnos
// (facility snapshot + coda operatore): terapie in ritardo/in scadenza, consegne scadute,
// priorita' morbida per nome operatore. Niente prisma, niente env, niente orologio implicito —
// l'istante di riferimento e' sempre un parametro, cosi' la logica e' testabile e non puo'
// divergere da quella dell'UI.
//
// La regola del "in ritardo" rispecchia intenzionalmente quella gia' usata client-side in
// frontend/src/components/operator/cartella/useRiepilogoSomministrazioni.ts: dose ancora `pending`
// il cui orario programmato e' STRETTAMENTE precedente all'ora corrente (minuti da mezzanotte,
// ora locale). Se le due implementazioni divergono, il badge "in ritardo" dell'UI e la risposta
// dell'assistente si contraddicono davanti allo stesso operatore.

export interface SlotAdministrationView {
  therapyId: string;
  drugName: string;
  dosage?: string;
  scheduledTime: string;
  status: 'pending' | 'administered' | 'not_administered';
}

export interface SlotPatientView {
  patientId: string;
  firstName: string;
  lastName: string;
  room: string;
  bed: string;
  administrations: SlotAdministrationView[];
}

export interface TherapySlotView {
  fascia: string;
  patients: SlotPatientView[];
}

export interface TherapyDueItem {
  patientId: string;
  patientName: string;
  room: string;
  bed: string;
  fascia: string;
  therapyId: string;
  drugName: string;
  dosage?: string;
  scheduledTime: string;
  /** Minuti di ritardo (> 0) per le dosi scadute; 0 per quelle ancora da venire. */
  minutesLate: number;
  /** Minuti mancanti (>= 0) per le dosi in arrivo; 0 per quelle gia' scadute. */
  minutesUntil: number;
}

export interface ConsegnaRow {
  id: string;
  pazienteId: string;
  pazienteNome: string;
  priorita: string;
  stato: string;
  tipo: string;
  note: string;
  scadenza: string;
  oraScadenza: string | null;
  operatoreAssegnato: string;
}

/** Minuti da mezzanotte; NaN se il formato non e' riconoscibile — un orario illeggibile non deve
 *  mai contare come "in ritardo" (falso negativo piu' sicuro di un falso allarme). */
export function minutesFromMidnight(orario: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((orario || '').trim());
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minuti da mezzanotte dell'istante dato, ora locale (come `minutiCorrenti()` lato UI). */
export function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Giorno di riferimento in formato YYYY-MM-DD, stessa derivazione usata dall'UI e dalla rotta
 *  /therapy-slots (`toISOString().slice(0,10)`). */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Ripartisce le dosi ancora da somministrare in "in ritardo" e "in scadenza entro la finestra".
 *  Le dosi gia' erogate o marcate non erogate non compaiono in nessuna delle due liste. */
export function collectTherapiesDue(
  slots: TherapySlotView[],
  now: Date,
  windowMinutes: number,
): { overdue: TherapyDueItem[]; dueSoon: TherapyDueItem[] } {
  const soglia = nowMinutes(now);
  const overdue: TherapyDueItem[] = [];
  const dueSoon: TherapyDueItem[] = [];

  for (const slot of slots ?? []) {
    for (const paziente of slot.patients ?? []) {
      for (const a of paziente.administrations ?? []) {
        if (a.status !== 'pending') continue;
        const minuti = minutesFromMidnight(a.scheduledTime);
        if (Number.isNaN(minuti)) continue;
        const item: TherapyDueItem = {
          patientId: paziente.patientId,
          patientName: `${paziente.lastName} ${paziente.firstName}`.trim(),
          room: paziente.room,
          bed: paziente.bed,
          fascia: slot.fascia,
          therapyId: a.therapyId,
          drugName: a.drugName,
          dosage: a.dosage,
          scheduledTime: a.scheduledTime,
          minutesLate: Math.max(0, soglia - minuti),
          minutesUntil: Math.max(0, minuti - soglia),
        };
        if (minuti < soglia) overdue.push(item);
        else if (minuti - soglia <= windowMinutes) dueSoon.push(item);
      }
    }
  }

  overdue.sort((a, b) => b.minutesLate - a.minutesLate);
  dueSoon.sort((a, b) => a.minutesUntil - b.minutesUntil);
  return { overdue, dueSoon };
}

/** Una consegna e' aperta finche' non e' completata (`aperta` e `in_corso` restano da fare). */
export function isConsegnaOpen(c: Pick<ConsegnaRow, 'stato'>): boolean {
  return c.stato !== 'completata';
}

/** Scaduta = aperta E oltre il termine. Senza `oraScadenza` il termine e' l'intera giornata: una
 *  consegna di oggi senza orario NON e' in ritardo, lo diventa dal giorno successivo. Con orario,
 *  il confronto e' stretto (esattamente all'ora prevista non e' ancora in ritardo), come per le
 *  somministrazioni. */
export function isConsegnaOverdue(
  c: Pick<ConsegnaRow, 'stato' | 'scadenza' | 'oraScadenza'>,
  now: Date,
): boolean {
  if (!isConsegnaOpen(c)) return false;
  const scadenza = (c.scadenza || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scadenza)) return false;
  const oggi = dayKey(now);
  if (scadenza < oggi) return true;
  if (scadenza > oggi) return false;
  const ora = minutesFromMidnight(c.oraScadenza ?? '');
  return !Number.isNaN(ora) && ora < nowMinutes(now);
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Token significativi di un nome (>= 3 caratteri): scarta iniziali, titoli brevi e punteggiatura. */
function nameTokens(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** Corrispondenza MORBIDA tra il nome di chi chiede e il testo libero `operatoreAssegnato`.
 *  `operatoreAssegnato` non e' una chiave esterna: la corrispondenza puo' sbagliare, quindi serve
 *  solo a ordinare, mai a filtrare. */
export function matchesOperator(operatoreAssegnato: string, operatorName: string): boolean {
  const assegnato = new Set(nameTokens(operatoreAssegnato));
  if (assegnato.size === 0) return false;
  const mine = nameTokens(operatorName);
  if (mine.length === 0) return false;
  return mine.some((t) => assegnato.has(t));
}

/** Ordina le consegne aperte mettendo davanti quelle probabilmente dell'operatore chiamante.
 *  Nessuna consegna viene scartata: il gruppo `others` resta visibile per intero. */
export function partitionByOperator<T extends Pick<ConsegnaRow, 'operatoreAssegnato'>>(
  rows: T[],
  operatorName: string | undefined,
): { mine: T[]; others: T[] } {
  if (!operatorName || !operatorName.trim()) return { mine: [], others: rows };
  const mine: T[] = [];
  const others: T[] = [];
  for (const r of rows) {
    if (matchesOperator(r.operatoreAssegnato, operatorName)) mine.push(r);
    else others.push(r);
  }
  return { mine, others };
}

const PRIORITA_RANK: Record<string, number> = { urgente: 0, alta: 1, normale: 2 };

/** Ordine di lavorazione: priorita' decrescente, poi termine piu' vicino. */
export function sortConsegne<T extends Pick<ConsegnaRow, 'priorita' | 'scadenza' | 'oraScadenza'>>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const pa = PRIORITA_RANK[a.priorita] ?? 3;
    const pb = PRIORITA_RANK[b.priorita] ?? 3;
    if (pa !== pb) return pa - pb;
    const ka = `${a.scadenza}T${a.oraScadenza ?? '23:59'}`;
    const kb = `${b.scadenza}T${b.oraScadenza ?? '23:59'}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}
