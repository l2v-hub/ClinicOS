// Milo, caso «aggiungi un diuretico ogni 8 ore per 5 giorni e avvisami quando ha completato».
// Milo NON prescrive: traduce la richiesta nella forma che il flusso «Prepara prescrizione» sa
// leggere (farmaco, dose, orari, date), dice che cosa manca e passa la mano a quel flusso, dove
// solo il medico conferma. Parser deterministico: un farmaco non nominato non viene mai scelto.

import { parseDiaryTherapyText } from '../../therapies/diary-therapy-parse.js';
import { addDays } from '../../proactive/time.js';

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PRESCRIBE = /\b(prescriv\w*|prescrizion\w*)\b/;
const ADD_VERB =
  /\b(aggiung\w*|aggiunt\w*|inserisc\w*|inserit\w*|inizi\w*|avvi\w*|impost\w*|introdu\w*|somministr\w*)\b/;
// Classi di farmaci: nominano un gruppo, non un farmaco. Servono a riconoscere la richiesta e a
// chiedere al medico quale farmaco intende.
const DRUG_CLASS =
  /\b(?:un |una |il |la |l |dell |del |di )?(diuretic\w*|antibiotic\w*|antidolorific\w*|analgesic\w*|antipertensiv\w*|anticoagulant\w*|lassativ\w*|antipiretic\w*|cortison\w*|antinfiammator\w*|sedativ\w*|antiemetic\w*|gastroprotettor\w*|insulin\w*)\b/;
const DOSE = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|microgrammi|g|gr|ml|ui|unita|mmol)\b/;
const QUANTITY =
  /(\d+(?:[.,]\d+)?|\d\/\d|mezza|una|un)\s*(cpr|cp|compress\w*|capsul\w*|cps|fial\w*|bustin\w*|gocce|gtt|puff)\b/;
const EVERY = /\bogni\s+(\d{1,2})\s*ore\b/;
const DURATION = /\bper\s+(\d{1,2})\s*(?:giorni|gg|giorno)\b/;
const ROUTE = /\b(per os|orale|per via orale|endovena|ev|intramuscolo|im|sottocute|sc)\b/;
const EXPLICIT_TIMES =
  /\b(?:alle|ore)\s+\d{1,2}(?:[:.]\d{2})?(?:\s*(?:,|e)\s*(?:alle\s+)?\d{1,2}(?:[:.]\d{2})?)*/;
const ALERT = /\b(avvis\w*|notific\w*|ricorda\w*|promemoria)\b/;
const NOT_A_DRUG = new Set(
  'di da un una il la lo con per e ed poi aggiungi aggiungere aggiunto prescrivi prescrivo prescrivere inserisci terapia farmaco dose ogni ore giorni paziente ospite del della al alla'.split(
    ' ',
  ),
);

const PERSON_LEAD = new Set(
  'a ad al alla allo per di del della paziente ospite signor signora'.split(' '),
);

/** Orari proposti per «ogni N ore» (configurabili: MILO_EVERY_8H=06:00,14:00,22:00 …). */
const DEFAULT_TIMES: Record<number, string[]> = {
  24: ['08:00'],
  12: ['08:00', '20:00'],
  8: ['06:00', '14:00', '22:00'],
  6: ['06:00', '12:00', '18:00', '00:00'],
  4: ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00'],
};
function timesEvery(hours: number, env: NodeJS.ProcessEnv): string[] | null {
  const configured = (env[`MILO_EVERY_${hours}H`] ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
  if (configured.length === 24 / hours) return configured;
  return DEFAULT_TIMES[hours] ?? null;
}
const hoursText = (times: string[]) => {
  const short = times.map((t) =>
    t.endsWith(':00') ? String(Number(t.slice(0, 2))) : t.replace(/^0/, ''),
  );
  return short.length > 1
    ? `${short.slice(0, -1).join(', ')} e ${short[short.length - 1]}`
    : short[0];
};
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export interface PrescriptionRequest {
  /** Testo nella forma del flusso «Prepara prescrizione», o null se mancano dati essenziali. */
  canonical: string | null;
  drug: string | null;
  drugClass: string | null;
  dose: string | null;
  quantity: string | null;
  times: string[];
  /** true quando gli orari sono una proposta per «ogni N ore» (il medico li può cambiare). */
  timesProposed: boolean;
  everyHours: number | null;
  days: number | null;
  from: string | null;
  to: string | null;
  missing: string[];
  wantsCompletionAlert: boolean;
}

/** Riconosce la richiesta di una NUOVA prescrizione; null per tutto il resto (letture, modifiche). */
export function matchPrescriptionRequest(
  text: string,
  today: string,
  env: NodeJS.ProcessEnv = process.env,
): PrescriptionRequest | null {
  const original = (text || '').trim();
  const q = norm(original).replace(/['’]/g, ' ');
  if (/\?\s*$/.test(original)) return null; // una domanda è una lettura
  if (/\b(sospend\w*|sospes\w*|interromp\w*)\b/.test(q)) return null; // resta alla scheda Terapia
  const klass = DRUG_CLASS.exec(q);
  const dose = DOSE.exec(q);
  const every = EVERY.exec(q);
  const content = !!klass || !!dose || !!every;
  if (!(PRESCRIBE.test(q) || (ADD_VERB.test(q) && content))) return null;
  if (!content && !/\bprescriv\w*\b/.test(q)) return null;

  // Farmaco = la parola (o due) subito prima della dose: «furosemide 25 mg», «Lasix 25 mg».
  let drug: string | null = null;
  if (dose) {
    const before = q.slice(0, dose.index).trim().split(/\s+/);
    const words: string[] = [];
    for (let i = before.length - 1; i >= 0 && words.length < 2; i -= 1) {
      const w = before[i];
      if (!/^[a-z][a-z-]{2,}$/.test(w) || NOT_A_DRUG.has(w) || DRUG_CLASS.test(w)) break;
      // «prescrivi a Ferrioli furosemide…»: la parola dopo una preposizione è il paziente.
      if (PERSON_LEAD.has(before[i - 1] ?? '')) break;
      words.unshift(w);
    }
    if (words.length) drug = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  const doseText = dose ? `${dose[1].replace('.', ',')} ${dose[2]}` : null;
  const qty = QUANTITY.exec(q);
  const quantity = qty
    ? `${/^(una|un)$/.test(qty[1]) ? '1' : qty[1] === 'mezza' ? '1/2' : qty[1]} ${
        /^(cp|cpr|compress)/.test(qty[2]) ? 'cpr' : qty[2]
      }`
    : null;
  const route = ROUTE.exec(q);

  const everyHours = every ? Number(every[1]) : null;
  const explicit = EXPLICIT_TIMES.exec(q);
  let times: string[] = [];
  let timesProposed = false;
  let timesClause = '';
  if (explicit) {
    timesClause = explicit[0].replace(/^alle\b/, 'ore');
    times = [...explicit[0].matchAll(/(\d{1,2})(?:[:.](\d{2}))?/g)].map(
      (m) => `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`,
    );
  } else if (everyHours) {
    const proposed = timesEvery(everyHours, env);
    if (proposed) {
      times = proposed;
      timesProposed = true;
      timesClause = `ore ${hoursText(proposed)}`;
    }
  }
  const duration = DURATION.exec(q);
  const days = duration ? Number(duration[1]) : null;
  const from = days ? today : null;
  const to = days ? addDays(today, days - 1) : null;

  const missing: string[] = [];
  if (!drug)
    missing.push(
      klass
        ? `il farmaco e la dose: «${klass[1]}» è una classe, non un farmaco`
        : 'il farmaco e la dose',
    );
  if (!times.length)
    missing.push(
      everyHours ? `gli orari (per «ogni ${everyHours} ore» non ho orari standard)` : 'gli orari',
    );

  let canonical: string | null = null;
  if (drug && doseText && times.length) {
    canonical = [
      drug,
      doseText,
      quantity,
      route ? (/(os|orale)/.test(route[1]) ? 'per os' : route[1]) : null,
      timesClause,
      from && to ? `dal ${dayMonth(from)} al ${dayMonth(to)}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    // Vale solo se il flusso di prescrizione la legge davvero (stesso interprete, nessuna scrittura).
    const parsed = parseDiaryTherapyText(canonical, today);
    if (!parsed.row.farmacoNome || parsed.row.orari.length !== times.length) canonical = null;
  }
  if (drug && !canonical && !missing.length)
    missing.push(
      'una forma completa: farmaco, dose, orari (es. «Furosemide 25 mg 1 cpr ore 8 e 20»)',
    );

  return {
    canonical,
    drug,
    drugClass: klass?.[1] ?? null,
    dose: doseText,
    quantity,
    times,
    timesProposed,
    everyHours,
    days,
    from,
    to,
    missing,
    wantsCompletionAlert: ALERT.test(q),
  };
}

export interface PrescriptionHandoff {
  /** Testo della risposta di Milo (nessuna valutazione clinica). */
  text: string;
  /** Righe «campo → valore» della prescrizione preparata, per la tabella della risposta. */
  rows: Array<[string, string]>;
  /** Messaggio già pronto per il flusso «Prepara prescrizione»; null se mancano dati. */
  message: string | null;
}

const COMPLETION_NOTE =
  'Quando la terapia arriva alla data di fine ricevi il segnale «Terapia completata» tra le novità di Milo (priorità alta per chi l’ha prescritta).';

/** Risposta di Milo alla richiesta: che cosa ha capito, che cosa manca, come si prosegue. */
export function prescriptionHandoff(
  request: PrescriptionRequest,
  patientName: string | null,
): PrescriptionHandoff {
  const rows: Array<[string, string]> = [];
  if (patientName) rows.push(['Paziente', patientName]);
  rows.push([
    'Farmaco',
    request.drug ?? (request.drugClass ? `da scegliere (${request.drugClass})` : 'da indicare'),
  ]);
  if (request.dose) rows.push(['Dose', request.dose]);
  if (request.quantity) rows.push(['Quantità', request.quantity]);
  if (request.times.length)
    rows.push([
      'Orari',
      `${request.times.join(', ')}${request.timesProposed ? ` (proposti per «ogni ${request.everyHours} ore»: modificabili)` : ''}`,
    ]);
  if (request.from && request.to)
    rows.push([
      'Periodo',
      `dal ${dayMonth(request.from)} al ${dayMonth(request.to)} (${request.days} giorni)`,
    ]);
  if (request.wantsCompletionAlert || request.to)
    rows.push([
      'Avviso a fine terapia',
      request.to ? 'sì, automatico' : 'serve la durata (es. «per 5 giorni»)',
    ]);

  if (!request.canonical || !patientName) {
    const missing = [...request.missing, ...(patientName ? [] : ['il paziente'])];
    return {
      rows,
      message: null,
      text:
        `Per preparare la prescrizione mi serve ancora: ${missing.join('; ')}. ` +
        'Scrivila per intero, ad esempio «prescrivi a Ferrioli furosemide 25 mg 1 cpr ogni 8 ore per 5 giorni». ' +
        'Non scelgo io il farmaco: la prescrizione la decide e la conferma il medico.',
    };
  }
  return {
    rows,
    message: `Prepara una prescrizione per ${patientName}: «${request.canonical}»`,
    text:
      'Ho preparato il testo della prescrizione. Aprila con «Prepara la prescrizione»: vedi l’anteprima ' +
      'strutturata e la confermi tu, solo allora viene scritta in terapia. ' +
      (request.to ? COMPLETION_NOTE : 'Senza una durata non c’è una data di fine da segnalare.'),
  };
}
