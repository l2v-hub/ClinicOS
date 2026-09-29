// Diario terapia (PR 2): logica pura del pannello "Valida terapia" del Diario Paziente.
//
// - La riga dell'anteprima (POST /patients/:id/diary/therapy-preview) diventa un TherapyFormValue
//   senza inventare valori: cio' che l'interprete non ha letto resta vuoto e l'operatore lo compila.
//   Dosaggio composto ("875/125 mg", "5 mg/5 ml") e forme non in elenco non diventano mai numeri o
//   scelte: restano nelle note come scritti (stesso criterio di dischargeRowToTherapyForm).
// - Avvisi, ambiguita', deduzioni, intenti ed errori del server diventano testi italiani.
// - requestId per versione dell'anteprima: ogni modifica (voce o terapia) ne genera uno nuovo, un
//   nuovo tentativo o un doppio clic sulla stessa versione riusa lo stesso.
//
// PRIVACY: nessun log. Il testo clinico viaggia solo nel corpo delle richieste POST.

import type { TherapyFormValue } from './TherapyFormFields';
import { FRACTION_PRESETS, normalizeFraction } from './therapyDose';
import type { TherapyFieldIssue } from './therapyFieldFeedback';
import {
  CODE_TO_FORM_VIA,
  dayToIso,
  mapForma,
  parseDosaggio,
} from '../../shared/intake/dischargeTherapy';
import { therapyFormToInput } from '../../shared/intake/therapyFormPayload';
import { therapyInputDiagnostics } from '../../shared/intake/intakeTherapies';

// ── Forma della risposta (backend/src/therapies/diary-therapy-parse.ts) ────────────────────────

export type DiaryTherapyIntent =
  'prescrizione' | 'sospensione' | 'al_bisogno' | 'somministrazione' | 'modifica';

export interface DiaryTherapyPreviewRow {
  farmacoNome: string;
  forma: string;
  dosaggio: string;
  viaSomministrazione: string;
  quantita: string;
  orari: string[];
  giorni: string[];
  dataInizio: string;
  classe: string;
  note: string;
  originalText: string;
  stato: 'ok' | 'da_verificare';
  dataFine: string;
  quantitaValore: string;
  quantityNumerator: number | null;
  quantityDenominator: number | null;
  unitaSomministrazione: string;
}

export interface DiaryTherapyPreview {
  row: DiaryTherapyPreviewRow;
  intent: DiaryTherapyIntent;
  inferred: string[];
  ambiguous: string[];
  fasciaConflicts: string[];
  warnings: string[];
  prescriptionRange: { start: number; end: number } | null;
  source?: string;
}

export type { DiaryEntryTherapyRef } from './diaryTherapyLink';

/** Campi della voce inviati insieme alla terapia (stessi del salvataggio normale). */
export interface DiaryTherapyEntryDraft {
  title: string | null;
  content: string;
  priority: string;
  status: string;
  entryDateTime: string;
}

// ── Intento ──────────────────────────────────────────────────────────────────────────────────

const BLOCKING_INTENTS: ReadonlySet<DiaryTherapyIntent> = new Set([
  'sospensione',
  'somministrazione',
  'modifica',
]);

/** Sospensione, somministrazione gia' fatta o modifica: nessuna terapia nuova. */
export function isBlockingIntent(intent: string): boolean {
  return BLOCKING_INTENTS.has(intent as DiaryTherapyIntent);
}

const INTENT_MESSAGES: Record<string, string> = {
  sospensione:
    'Il testo sembra una sospensione: non si crea una terapia nuova. Sospendi la terapia dalla sezione Terapia.',
  somministrazione:
    'Il testo sembra una somministrazione già fatta: non si crea una terapia nuova. Registrala dal giro terapia.',
  modifica:
    'Il testo sembra la modifica di una terapia esistente: non si crea una terapia nuova. Modificala dalla sezione Terapia.',
};

/** Messaggio per un intento che blocca la conferma, altrimenti null. */
export function intentMessage(intent: string): string | null {
  return isBlockingIntent(intent) ? (INTENT_MESSAGES[intent] ?? null) : null;
}

// ── Mapping riga → form Terapia ──────────────────────────────────────────────────────────────

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Giorno della voce (YYYY-MM-DD) o '' se la data e ora non e' leggibile. */
export function entryDay(entryDateTime: string): string {
  const day = (entryDateTime || '').slice(0, 10);
  return ISO_DAY.test(day) ? day : '';
}

function fractionKey(num: number, den: number): string | null {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || num <= 0 || den <= 1) return null;
  const part = normalizeFraction(num % den, den);
  if (part.num === 0) return null;
  const key = `${part.num}/${part.den}`;
  return FRACTION_PRESETS.some((p) => p.key === key) ? key : null;
}

/**
 * Riga dell'anteprima → campi del form Terapia. Mai un valore inventato:
 * - nome, via, orari, giorni, date, quantita' e unita' solo se l'interprete li ha letti;
 * - dosaggio semplice ("5 mg") nel dosaggio commerciale; composto o non riconosciuto nelle note;
 * - forma farmaceutica solo se e' una delle forme del form, altrimenti nelle note;
 * - data di inizio: quella scritta, altrimenti il giorno della voce (mostrato come avviso);
 * - tipo "al bisogno" solo se l'interprete ha riconosciuto l'intento al bisogno.
 */
export function previewToTherapyForm(
  preview: Pick<DiaryTherapyPreview, 'row' | 'intent'>,
  entryDateTime: string,
): TherapyFormValue {
  const r = preview.row;
  const formaText = (r.forma || '').trim();
  const forma = formaText ? mapForma(formaText) : null;
  const dosaggioText = (r.dosaggio || '').trim();
  const dose = dosaggioText ? parseDosaggio(dosaggioText) : null;
  const num = r.quantityNumerator ?? 0;
  const den = r.quantityDenominator ?? 1;
  const hasQuantity = r.quantityNumerator !== null && r.quantityDenominator !== null;
  const unit = (r.unitaSomministrazione || '').trim();
  const orari = Array.isArray(r.orari) ? r.orari.filter((t) => typeof t === 'string') : [];
  const times = orari.length ? orari : [''];
  const tipo: TherapyFormValue['tipo'] =
    preview.intent === 'al_bisogno' ? 'al_bisogno' : 'periodica';
  const fraction = hasQuantity ? fractionKey(num, den) : null;
  const via = (r.viaSomministrazione || '').trim().toUpperCase();
  const quantitaText = (r.quantita || '').trim();

  const note = [
    (r.note || '').trim(),
    formaText && !forma ? `Forma: ${formaText}` : '',
    dosaggioText && !dose ? `Dosaggio: ${dosaggioText}` : '',
    // Al bisogno non ha orari: la quantita' letta resta leggibile nelle note.
    tipo === 'al_bisogno' && quantitaText ? `Quantità: ${quantitaText}` : '',
  ]
    .filter(Boolean)
    .join(' — ');

  return {
    farmacoNome: (r.farmacoNome || '').trim(),
    drugPackageRef: null,
    pharmaceuticalForm: forma ?? '',
    commercialStrengthValue: dose?.value ?? '',
    commercialStrengthUnit: dose?.unit ?? '',
    allowedFractions: fraction ? ['1', fraction] : ['1'],
    viaSomministrazione: via ? (CODE_TO_FORM_VIA[via] ?? '') : '',
    tipo,
    stato: 'attiva',
    dataInizio: ISO_DAY.test(r.dataInizio || '') ? r.dataInizio : entryDay(entryDateTime),
    dataFine: ISO_DAY.test(r.dataFine || '') ? r.dataFine : '',
    schedules: times.map((time) => ({
      time: /^\d:\d{2}$/.test(time) ? `0${time}` : time,
      quantityNumerator: hasQuantity ? num : 0,
      quantityDenominator: hasQuantity ? den : 1,
      administrationUnit: unit,
    })),
    giorniSettimana: Array.isArray(r.giorni) ? r.giorni.map(dayToIso).sort((a, b) => a - b) : [],
    prescrittore: '',
    note,
    dataSomministrazione: '',
    orarioSomministrazione: '',
  };
}

// ── Fasce (stessa regola del server: una sola somministrazione per fascia) ──────────────────

const FASCE: Array<{ fascia: string; start: number; end: number }> = [
  { fascia: 'mattina', start: 5 * 60, end: 11 * 60 - 1 },
  { fascia: 'pranzo', start: 11 * 60, end: 14 * 60 - 1 },
  { fascia: 'pomeriggio', start: 14 * 60, end: 18 * 60 - 1 },
  { fascia: 'sera', start: 18 * 60, end: 22 * 60 - 1 },
];

function fasciaOf(time: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return FASCE.find((f) => mins >= f.start && mins <= f.end)?.fascia ?? 'notte';
}

/** "mattina: 08:00, 10:00" per ogni fascia con piu' somministrazioni (orari validi). */
export function scheduleFasciaConflicts(times: readonly string[]): string[] {
  const byFascia = new Map<string, string[]>();
  for (const raw of times) {
    const fascia = fasciaOf(raw);
    if (!fascia) continue;
    const time = raw.trim().padStart(5, '0');
    byFascia.set(fascia, [...(byFascia.get(fascia) ?? []), time]);
  }
  return [...byFascia.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([fascia, list]) => `${fascia}: ${[...list].sort().join(', ')}`);
}

export function formFasciaConflicts(form: TherapyFormValue): string[] {
  return form.tipo === 'periodica'
    ? scheduleFasciaConflicts(form.schedules.map((s) => s.time))
    : [];
}

export function fasciaConflictMessage(conflicts: readonly string[]): string {
  return `Più somministrazioni nella stessa fascia (${conflicts.join('; ')}): crea due terapie separate, una per ciascun orario`;
}

// ── Riepilogo dell'anteprima ─────────────────────────────────────────────────────────────────

export type DiaryTherapyNoticeTone = 'warning' | 'info';

export interface DiaryTherapyNotice {
  key: string;
  tone: DiaryTherapyNoticeTone;
  text: string;
}

const WARNING_TEXTS: Record<string, string> = {
  testo_non_classificato: 'Testo non riconosciuto: controlla le note',
  menzione_sospensione: 'Il testo menziona una sospensione: verifica prima di confermare',
  menzione_somministrazione: 'Il testo menziona una somministrazione: verifica prima di confermare',
  menzione_modifica: 'Il testo menziona una modifica: verifica prima di confermare',
};

const AMBIGUOUS_TEXTS: Record<string, string> = {
  orari: 'Orari ambigui: controlla e completa gli orari',
  piu_farmaci: 'Il testo contiene più farmaci: crea una terapia per ciascun farmaco',
};

const INFERRED_TEXTS: Record<string, string> = {
  dataInizio: 'Data di inizio dedotta (anno non scritto): verifica',
  dataFine: 'Data di fine dedotta (anno non scritto): verifica',
};

function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Tutto cio' che l'operatore deve vedere prima di confermare, sempre in chiaro. */
export function previewNotices(
  preview: DiaryTherapyPreview,
  entryDateTime: string,
): DiaryTherapyNotice[] {
  const out: DiaryTherapyNotice[] = [];
  for (const w of preview.warnings ?? [])
    out.push({
      key: `w-${w}`,
      tone: 'warning',
      text: WARNING_TEXTS[w] ?? 'Avviso dell’interprete: verifica il testo',
    });
  for (const a of preview.ambiguous ?? [])
    out.push({
      key: `a-${a}`,
      tone: 'warning',
      text: AMBIGUOUS_TEXTS[a] ?? 'Valore ambiguo: verifica',
    });
  for (const i of preview.inferred ?? [])
    out.push({
      key: `i-${i}`,
      tone: 'info',
      text: INFERRED_TEXTS[i] ?? 'Valore dedotto: verifica',
    });
  if ((preview.fasciaConflicts ?? []).length)
    out.push({
      key: 'fascia',
      tone: 'warning',
      text: fasciaConflictMessage(preview.fasciaConflicts),
    });
  if (preview.row.stato === 'da_verificare')
    out.push({
      key: 'stato',
      tone: 'warning',
      text: 'Da verificare: controlla tutti i campi prima di confermare',
    });
  if (preview.intent === 'al_bisogno')
    out.push({
      key: 'al-bisogno',
      tone: 'info',
      text: 'Terapia al bisogno: le indicazioni restano nelle note',
    });
  const day = entryDay(entryDateTime);
  if (!isBlockingIntent(preview.intent) && !preview.row.dataInizio && day)
    out.push({
      key: 'inizio-voce',
      tone: 'info',
      text: `Data di inizio non scritta: proposta la data della voce (${dateLabel(day)})`,
    });
  return out;
}

// ── Conferma ─────────────────────────────────────────────────────────────────────────────────

/** Input della terapia per with-therapy: stesso mapper della sezione Terapia. L'operatore
 *  inseritore lo decide il server. */
export function diaryTherapyInput(form: TherapyFormValue): Record<string, unknown> {
  return therapyFormToInput(form);
}

/** Problemi sui campi (stessa validazione del form Terapia) + conflitti di fascia. */
export function diaryTherapyIssues(form: TherapyFormValue): TherapyFieldIssue[] {
  const issues = therapyInputDiagnostics(diaryTherapyInput(form));
  const conflicts = formFasciaConflicts(form);
  if (conflicts.length)
    issues.push({ field: 'schedules', message: fasciaConflictMessage(conflicts) });
  return issues;
}

export function diaryTherapyBody(
  entry: DiaryTherapyEntryDraft,
  form: TherapyFormValue,
  requestId: string,
) {
  return { requestId, entry, therapy: diaryTherapyInput(form) };
}

/** Identita' di una versione dell'anteprima: voce + terapia come verrebbero inviate. */
export function diaryTherapyFingerprint(
  entry: DiaryTherapyEntryDraft,
  form: TherapyFormValue,
): string {
  return JSON.stringify([entry, diaryTherapyInput(form)]);
}

export interface RequestVersion {
  fingerprint: string;
  requestId: string;
}

/** Stessa versione → stesso requestId (doppio clic, nuovo tentativo); versione diversa → nuovo. */
export function requestIdForVersion(
  previous: RequestVersion | null,
  fingerprint: string,
  makeId: () => string = newRequestId,
): RequestVersion {
  if (previous && previous.fingerprint === fingerprint) return previous;
  return { fingerprint, requestId: makeId() };
}

/** UUID v4; anche fuori da un contesto sicuro, dove crypto.randomUUID non c'e'. */
export function newRequestId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Errori del server ────────────────────────────────────────────────────────────────────────

interface ServerErrorBody {
  error?: unknown;
  code?: unknown;
  intent?: unknown;
  fasciaConflicts?: unknown;
}

/** Errore di with-therapy → messaggio italiano. status 0 = rete non raggiungibile. */
export function diaryTherapyErrorMessage(status: number, body: unknown): string {
  const b = (body && typeof body === 'object' ? body : {}) as ServerErrorBody;
  const code = typeof b.code === 'string' ? b.code : '';
  const serverText = typeof b.error === 'string' ? b.error.trim() : '';
  if (code === 'fascia_conflict') {
    const conflicts = Array.isArray(b.fasciaConflicts)
      ? b.fasciaConflicts.filter((c): c is string => typeof c === 'string')
      : [];
    return conflicts.length
      ? fasciaConflictMessage(conflicts)
      : 'Più somministrazioni nella stessa fascia: crea due terapie separate, una per ciascun orario';
  }
  if (code === 'schedule_required')
    return 'Indica almeno un orario di somministrazione (per la una tantum: data e ora).';
  if (code === 'unit_required') return 'Indica l’unità di somministrazione per ogni orario.';
  if (code === 'intent_not_prescription')
    return (
      intentMessage(typeof b.intent === 'string' ? b.intent : '') ??
      'Il testo non è una prescrizione: non si crea una terapia nuova. Puoi salvare la voce come voce normale.'
    );
  if (code === 'request_id_reused')
    return 'Questa conferma risulta già inviata con dati diversi. Controlla il diario prima di riprovare: modificando un campo la conferma diventa una richiesta nuova.';
  if (code === 'request_id_invalid' || code === 'therapy_invalid')
    return 'Richiesta non valida: riprova.';
  if (status === 400)
    return serverText
      ? `La terapia non è stata accettata: ${serverText}`
      : 'La terapia non è stata accettata: controlla i campi.';
  if (status === 401) return 'Sessione scaduta: accedi di nuovo e riprova.';
  if (status === 403) return 'Non hai i permessi per aggiungere una terapia a questo paziente.';
  if (status === 404) return 'Paziente non trovato.';
  if (status === 409)
    return 'Conflitto con una richiesta già inviata: controlla il diario prima di riprovare.';
  return 'Errore durante la creazione della terapia. Riprova: la stessa conferma non verrà duplicata.';
}

/** Errore di therapy-preview → messaggio italiano. */
export function diaryPreviewErrorMessage(status: number, body: unknown): string {
  const b = (body && typeof body === 'object' ? body : {}) as ServerErrorBody;
  const serverText = typeof b.error === 'string' ? b.error.trim() : '';
  if (status === 400)
    return serverText
      ? `Impossibile leggere il testo: ${serverText}`
      : 'Impossibile leggere il testo della voce.';
  if (status === 401) return 'Sessione scaduta: accedi di nuovo e riprova.';
  if (status === 403) return 'Non hai i permessi per questo paziente.';
  return 'Anteprima non disponibile. Riprova.';
}
