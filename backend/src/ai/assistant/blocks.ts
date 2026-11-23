// Milo fase 3: interfaccia generativa. I «blocchi» (indicatori, tabelle, andamenti) che il pannello
// disegna sotto la risposta. Sono costruiti QUI, in modo deterministico, dai dati che le letture del
// backend hanno restituito: il modello non scrive mai un numero di un blocco. Ogni blocco nasce da
// uno strumento noto; uno strumento senza regola di visualizzazione non produce blocchi.

import type { News2Overview, ParameterOverview } from '../gateway/clinical-reads.js';
import type { CareContacts, PlannedRelease, TypeAvailability } from '../gateway/care-reads.js';

export type BlockTone = 'ok' | 'info' | 'warning' | 'alarm' | 'neutral';
export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  tone?: BlockTone;
  note?: string;
}
export type MiloBlock =
  | { type: 'kpi'; title: string; items: KpiItem[]; source?: string }
  | {
      type: 'parameter_trend';
      title: string;
      patientId: string;
      period: { start: string; end: string };
      params: string[];
      readings: Array<{
        id: string;
        measuredAt: string;
        values: Record<string, string>;
        source: string;
        author?: string;
      }>;
    }
  | {
      type: 'table';
      title: string;
      columns: Array<{ key: string; label: string }>;
      rows: Array<Record<string, string>>;
      truncated?: boolean;
    }
  // Passaggio a un altro flusso dell'app con il testo già pronto (es. «Prepara prescrizione»):
  // un pulsante, mai un'azione eseguita da Milo.
  | { type: 'handoff'; title: string; label: string; target: 'prescription'; message: string };

const MAX_TABLE_ROWS = 50;
const TREND_KEYS = ['pa', 'spo2', 'fc', 'fr', 'temperatura', 'dtx'];
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const num = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined
    ? '—'
    : n.toLocaleString('it-IT', { maximumFractionDigits: digits });
const LOCAL_STAMP = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;
const dayTime = (iso: unknown) => {
  const text = str(iso);
  // Data e ora «di parete» senza fuso (es. diario): si mostrano come sono, senza conversioni.
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const m = LOCAL_STAMP.exec(text);
    if (m) return m[4] ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = new Date(text);
  if (!text || !Number.isFinite(d.getTime())) return text;
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};
const civilDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

function table(
  title: string,
  columns: Array<[string, string]>,
  rows: Array<Record<string, unknown>>,
): MiloBlock | null {
  if (!rows.length) return null;
  return {
    type: 'table',
    title,
    columns: columns.map(([key, label]) => ({ key, label })),
    rows: rows
      .slice(0, MAX_TABLE_ROWS)
      .map((row) => Object.fromEntries(columns.map(([key]) => [key, str(row[key])]))),
    ...(rows.length > MAX_TABLE_ROWS ? { truncated: true } : {}),
  };
}

const RISK_TONE: Record<string, BlockTone> = {
  nessuno: 'ok',
  basso: 'info',
  'basso-singolo': 'warning',
  medio: 'warning',
  alto: 'alarm',
};
const RISK_LABEL: Record<string, string> = {
  nessuno: 'nessun rischio',
  basso: 'rischio basso',
  'basso-singolo': 'un parametro a 3',
  medio: 'rischio medio',
  alto: 'rischio alto',
};

function parameterBlocks(o: ParameterOverview, withAttention = false): MiloBlock[] {
  if (!o.readings.length) return [];
  const present = TREND_KEYS.filter((k) => o.readings.some((r) => r.values[k] !== undefined));
  const items: KpiItem[] = o.series.map((s) => ({
    label: s.label,
    value: s.last ? num(s.last.value) : '—',
    unit: s.unit,
    note: `${s.count} misure · min ${num(s.min)} · max ${num(s.max)}${
      s.change === null ? '' : ` · variazione ${s.change > 0 ? '+' : ''}${num(s.change)}`
    }`,
  }));
  const blocks: MiloBlock[] = [];
  if (present.length)
    blocks.push({
      type: 'parameter_trend',
      title: 'Andamento dei parametri',
      patientId: o.patientId,
      period: { start: civilDay(o.from), end: civilDay(o.to) },
      params: present,
      readings: o.readings.map((r) => ({
        id: r.id,
        measuredAt: r.measuredAt,
        values: r.values,
        source: r.source,
        ...(r.author ? { author: r.author } : {}),
      })),
    });
  if (items.length) blocks.unshift({ type: 'kpi', title: 'Ultimi valori nel periodo', items });
  // Punti da controllare: calcolati dal sistema sul protocollo, mai dal modello.
  const points = withAttention ? (o.attention?.points ?? []) : [];
  if (points.length)
    blocks.unshift({
      type: 'kpi',
      title: 'Da controllare (promemoria da protocollo)',
      items: points.slice(0, 10).map((p) => ({
        label: p.label,
        value: p.value,
        tone: p.tone,
        note: p.detail,
      })),
      source: o.attention.source,
    });
  return blocks;
}

const WEEK_ORDER = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const DAY_LABEL: Record<string, string> = {
  lunedi: 'lun',
  martedi: 'mar',
  mercoledi: 'mer',
  giovedi: 'gio',
  venerdi: 'ven',
  sabato: 'sab',
  domenica: 'dom',
};
const civilDate = (day: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : day;
};

function careContactBlocks(c: CareContacts): MiloBlock[] {
  const blocks: MiloBlock[] = [];
  const rows: Array<Record<string, unknown>> = [];
  if (c.lastReading)
    rows.push({
      cosa: 'Ultima rilevazione dei parametri',
      quando: dayTime(c.lastReading.measuredAt),
      chi: c.lastReading.author,
      ruolo: c.lastReading.ruolo ?? '',
    });
  if (c.lastVisit)
    rows.push({
      cosa: 'Ultima visita',
      quando: dayTime(c.lastVisit.scheduledAt),
      chi: c.lastVisit.operator,
      ruolo: c.lastVisit.ruolo ?? '',
    });
  if (c.lastDoctorNote)
    rows.push({
      cosa: 'Ultima nota del medico',
      quando: dayTime(c.lastDoctorNote.entryDateTime),
      chi: c.lastDoctorNote.author,
      ruolo: 'medico',
    });
  const who = table(
    'Chi ha seguito il paziente',
    [
      ['cosa', 'Cosa'],
      ['quando', 'Quando'],
      ['chi', 'Chi'],
      ['ruolo', 'Ruolo'],
    ],
    rows,
  );
  if (who) blocks.push(who);
  // Turni in forma compatta: una riga per persona, giorni con lo stesso orario raggruppati.
  const shiftRows = c.people
    .filter((p) => p.turni && p.turni.length)
    .map((p) => {
      const byHours = new Map<string, string[]>();
      for (const t of [...p.turni!].sort(
        (a, b) => WEEK_ORDER.indexOf(a.giorno) - WEEK_ORDER.indexOf(b.giorno),
      )) {
        const hours = `${t.oraInizio}–${t.oraFine}`;
        byHours.set(hours, [...(byHours.get(hours) ?? []), DAY_LABEL[t.giorno] ?? t.giorno]);
      }
      return {
        persona: p.name,
        ruolo: p.ruolo ?? '',
        turni: [...byHours.entries()].map(([h, days]) => `${days.join(', ')} ${h}`).join(' · '),
      };
    });
  const shifts = table(
    'Turni settimanali',
    [
      ['persona', 'Persona'],
      ['ruolo', 'Ruolo'],
      ['turni', 'Turni'],
    ],
    shiftRows,
  );
  if (shifts) blocks.push(shifts);
  return blocks;
}

function occupancyBlocks(o: Record<string, unknown>): MiloBlock[] {
  const blocks: MiloBlock[] = [];
  const perTipo = (Array.isArray(o.perTipo) ? o.perTipo : []) as TypeAvailability[];
  const releases = (
    Array.isArray(o.liberazioniPreviste) ? o.liberazioniPreviste : []
  ) as PlannedRelease[];
  if (perTipo.length)
    blocks.push({
      type: 'kpi',
      title: 'Camere per tipo',
      items: perTipo.map((t) => ({
        label: `Camere ${t.tipo === 'singola' ? 'singole' : t.tipo === 'doppia' ? 'doppie' : t.tipo}`,
        value: `${t.camereOccupate} su ${t.camere} occupate`,
        tone: t.lettiLiberi > 0 ? 'ok' : 'neutral',
        note:
          `${t.lettiLiberi} ${t.lettiLiberi === 1 ? 'letto libero' : 'letti liberi'} su ${t.letti}` +
          (t.prossimoLettoLibero
            ? ` · prossima dimissione prevista: camera ${t.prossimoLettoLibero.camera} il ${civilDate(t.prossimoLettoLibero.data)}`
            : t.lettiLiberi === 0
              ? ' · nessuna dimissione prevista'
              : ''),
      })),
    });
  const planned = table(
    'Dimissioni previste',
    [
      ['data', 'Data'],
      ['camera', 'Camera'],
      ['tipo', 'Tipo'],
      ['effetto', 'Cosa si libera'],
    ],
    releases.map((r) => ({
      data: civilDate(r.data),
      camera: r.camera,
      tipo: r.tipo,
      effetto: r.cameraLibera
        ? 'tutta la camera'
        : `${r.lettiLiberati} ${r.lettiLiberati === 1 ? 'letto' : 'letti'}`,
    })),
  );
  if (planned) blocks.push(planned);
  return blocks;
}

function news2Blocks(o: News2Overview): MiloBlock[] {
  const blocks: MiloBlock[] = [];
  const latest = o.latest;
  const items: KpiItem[] = latest
    ? [
        {
          label: 'NEWS2',
          value: String(latest.result.total),
          tone: RISK_TONE[latest.result.risk ?? ''] ?? 'neutral',
          note: `${RISK_LABEL[latest.result.risk ?? ''] ?? ''} · ${dayTime(latest.measuredAt)}`,
        },
        {
          label: 'Risposta prevista dal protocollo',
          value: latest.result.response ?? '—',
          note: 'Promemoria informativo: la valutazione resta del professionista',
        },
      ]
    : [{ label: 'NEWS2', value: '—', note: 'Nessuna rilevazione completa nel periodo' }];
  if (o.latestIncomplete)
    items.push({
      label: 'Ultima rilevazione incompleta',
      value: dayTime(o.latestIncomplete.measuredAt),
      tone: 'neutral',
      note: `Mancano: ${o.latestIncomplete.missing.join(', ')}`,
    });
  blocks.push({
    type: 'kpi',
    title: 'Punteggio di allerta',
    items,
    source: `${o.source.name} — ${o.source.version}`,
  });
  const history = table(
    'Storico NEWS2',
    [
      ['quando', 'Quando'],
      ['punteggio', 'Punteggio'],
      ['rischio', 'Rischio'],
    ],
    [...o.history].reverse().map((p) => ({
      quando: dayTime(p.measuredAt),
      punteggio: p.result.total,
      rischio: RISK_LABEL[p.result.risk ?? ''] ?? '',
    })),
  );
  if (history && o.history.length > 1) blocks.push(history);
  return blocks;
}

/** Blocchi da visualizzare per i risultati delle letture, nell'ordine in cui sono stati letti. */
export function blocksFromResults(
  results: Array<{ tool: string; data: unknown[] }>,
  /** attention: mostra «Da controllare» (solo quando la domanda chiede il quadro del paziente). */
  options: { attention?: boolean } = {},
): MiloBlock[] {
  const blocks: MiloBlock[] = [];
  for (const { tool, data } of results) {
    const rows = (Array.isArray(data) ? data : []).map(obj);
    switch (tool) {
      case 'get_patient_parameters':
        if (rows[0])
          blocks.push(
            ...parameterBlocks(rows[0] as unknown as ParameterOverview, options.attention === true),
          );
        break;
      case 'get_patient_news2':
        if (rows[0]) blocks.push(...news2Blocks(rows[0] as unknown as News2Overview));
        break;
      case 'get_patient_care_contacts':
        if (rows[0]) blocks.push(...careContactBlocks(rows[0] as unknown as CareContacts));
        break;
      case 'query_rooms_occupancy':
        if (rows[0]) blocks.push(...occupancyBlocks(rows[0]));
        break;
      case 'get_patient_vital_signs': {
        const b = table(
          'Parametri',
          [
            ['rilevato', 'Quando'],
            ['etichetta', 'Parametro'],
            ['valore', 'Valore'],
            ['unita', 'Unità'],
          ],
          rows.map((r) => ({ ...r, rilevato: dayTime(r.rilevato) })),
        );
        if (b) blocks.push(b);
        break;
      }
      case 'get_patient_administrations': {
        const b = table(
          'Somministrazioni',
          [
            ['quando', 'Quando'],
            ['drug', 'Farmaco'],
            ['dose', 'Dose'],
            ['status', 'Stato'],
            ['operator', 'Operatore'],
          ],
          rows.map((r) => ({ ...r, quando: dayTime(`${str(r.date)}T${str(r.time) || '00:00'}`) })),
        );
        if (b) blocks.push(b);
        break;
      }
      case 'get_patient_assessments': {
        const b = table(
          'Scale e valutazioni',
          [
            ['quando', 'Quando'],
            ['label', 'Scala'],
            ['total', 'Punteggio'],
            ['result', 'Esito'],
          ],
          rows.map((r) => ({ ...r, quando: dayTime(r.assessedAt) })),
        );
        if (b) blocks.push(b);
        break;
      }
      case 'get_patient_diary': {
        const b = table(
          'Diario',
          [
            ['quando', 'Quando'],
            ['authorType', 'Autore'],
            ['testo', 'Annotazione'],
          ],
          rows.map((r) => ({
            ...r,
            quando: dayTime(r.entryDateTime),
            testo: str(r.title || r.content).slice(0, 160),
          })),
        );
        if (b) blocks.push(b);
        break;
      }
      case 'query_staff_shifts': {
        const b = table(
          'Turni del personale',
          [
            ['operator', 'Operatore'],
            ['ruolo', 'Ruolo'],
            ['giorno', 'Giorno'],
            ['orario', 'Orario'],
          ],
          rows.map((r) => ({ ...r, orario: `${str(r.oraInizio)}–${str(r.oraFine)}` })),
        );
        if (b) blocks.push(b);
        break;
      }
      case 'query_agenda': {
        const b = table(
          'Agenda',
          [
            ['quando', 'Quando'],
            ['patient', 'Paziente'],
            ['operator', 'Operatore'],
            ['ruolo', 'Ruolo'],
            ['status', 'Stato'],
          ],
          rows.map((r) => ({ ...r, quando: dayTime(r.scheduledAt) })),
        );
        if (b) blocks.push(b);
        break;
      }
      default:
        break;
    }
  }
  return blocks.slice(0, 8);
}
