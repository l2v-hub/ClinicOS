// Milo fase 1: letture che l'assistente non aveva. Stesse regole del resto del gateway: sola
// lettura, perimetro del paziente verificato dal backend, finestre limitate, fonte verificabile su
// ogni valore, audit di ogni chiamata. Nessun campo libero che il modello non debba vedere: dai turni
// e dagli appuntamenti di struttura escono solo dati organizzativi.

import { prisma } from '../../lib/prisma.js';
import { news2, NEWS2_SOURCE, type News2Result } from '../../clinical/scores/news2.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';
import { gatewayAudit } from './audit.js';
import { assertPatientAllowed, assertTenant, canFacilityRead } from './context.js';
import {
  administrationSource,
  appointmentSource,
  assessmentSource,
  clinicalScoreSource,
  shiftSource,
  vitalSource,
} from './sources.js';
import { GatewayError, type SourceReference, type UserContext } from './types.js';
import {
  addDays,
  facilityDay,
  labelForKey,
  legacyVitalsToReadings,
  numericValue,
  parameterSeries,
  SERIES_KEYS,
  SERIES_LABELS,
  weekdayOf,
  type ParameterSeries,
  type SeriesKey,
  type UnifiedReading,
} from './clinical-series.js';
import { getPatientDiary, getPatientVitalSigns } from './services.js';

type Sourced<T> = { data: T[]; sourceRefs: SourceReference[]; truncated: boolean };

const MAX_DAYS = 90;
const MAX_READINGS = 300;
const MAX_ROWS = 100;
const nowIso = () => new Date().toISOString();
const clampDays = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.min(MAX_DAYS, Math.floor(n)) : fallback;
};
const isDay = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^20\d{2}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

function windowOf(args: { days?: unknown; from?: unknown; to?: unknown }, fallbackDays: number) {
  const to = isDay(args.to) ? new Date(`${args.to}T23:59:59.999Z`) : new Date();
  const from = isDay(args.from)
    ? new Date(`${args.from}T00:00:00.000Z`)
    : new Date(to.getTime() - clampDays(args.days, fallbackDays) * 86400000);
  if (from > to) throw new GatewayError('bad_request', 'Periodo non valido');
  if (to.getTime() - from.getTime() > (MAX_DAYS + 1) * 86400000)
    throw new GatewayError('bad_request', `Periodo massimo ${MAX_DAYS} giorni`);
  return { from, to };
}

// ── Parametri: tabella della pagina Parametri + JSON storico della cartella ─────────────────

/** Rilevazioni di un paziente da entrambi gli archivi, ordinate dalla più recente. */
export async function loadUnifiedReadings(
  patientId: string,
  ctx: UserContext,
  window: { from: Date; to: Date },
): Promise<{ readings: UnifiedReading[]; truncated: boolean }> {
  const rows = await prisma.patientParameterReading.findMany({
    where: { patientId, measuredAt: { gte: window.from, lte: window.to } },
    orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
    take: MAX_READINGS + 1,
    select: { id: true, measuredAt: true, values: true, authorName: true },
  });
  const table: UnifiedReading[] = rows.slice(0, MAX_READINGS).map((row) => ({
    id: row.id,
    measuredAt: row.measuredAt.toISOString(),
    source: 'parametri',
    values: Object.fromEntries(
      Object.entries((row.values ?? {}) as Record<string, unknown>).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[1].trim() !== '',
      ),
    ),
    author: row.authorName,
  }));
  // Il JSON storico passa dalla lettura esistente (stessi limiti e controlli).
  const legacy = await getPatientVitalSigns(
    { patientId, from: window.from.toISOString(), to: window.to.toISOString() } as never,
    ctx,
  );
  const merged = [...table, ...legacyVitalsToReadings(legacy.data as never)].sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  );
  return { readings: merged, truncated: rows.length > MAX_READINGS || legacy.truncated };
}

function readingSource(patientId: string, r: UnifiedReading): SourceReference {
  const text = Object.entries(r.values)
    .filter(([k]) => k !== 'note')
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  return vitalSource(
    patientId,
    r.id,
    r.source === 'parametri' ? 'Rilevazione parametri' : 'Parametro in cartella',
    text.slice(0, 200),
    r.measuredAt,
  );
}

export interface ParameterOverview {
  patientId: string;
  from: string;
  to: string;
  readings: UnifiedReading[];
  series: ParameterSeries[];
}

/** Parametri di un periodo: rilevazioni unificate + serie per parametro con aggregati per giorno. */
export async function getPatientParameters(
  args: { patientId: string; days?: unknown; from?: unknown; to?: unknown; params?: unknown },
  ctx: UserContext,
): Promise<Sourced<ParameterOverview>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, args.patientId);
  const window = windowOf(args, 7);
  const keys = (Array.isArray(args.params) ? args.params : []).filter((k): k is SeriesKey =>
    (SERIES_KEYS as readonly string[]).includes(String(k)),
  );
  const { readings, truncated } = await loadUnifiedReadings(args.patientId, ctx, window);
  const relevant = keys.length
    ? readings.filter((r) => keys.some((k) => r.values[k] !== undefined))
    : readings;
  const overview: ParameterOverview = {
    patientId: args.patientId,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    readings: relevant,
    series: parameterSeries(relevant, keys.length ? keys : SERIES_KEYS),
  };
  gatewayAudit(
    ctx,
    'get_patient_parameters',
    [args.patientId],
    relevant.length,
    relevant.length ? 'ok' : 'empty',
    nowIso(),
  );
  return {
    data: [overview],
    sourceRefs: relevant.slice(0, 50).map((r) => readingSource(args.patientId, r)),
    truncated,
  };
}

// ── NEWS2 calcolato nel backend ──────────────────────────────────────────────────────────────

export interface News2Point {
  readingId: string;
  measuredAt: string;
  result: News2Result;
}
export interface News2Overview {
  patientId: string;
  source: typeof NEWS2_SOURCE;
  /** Ultima rilevazione con i sette parametri: l'unica che dà un NEWS2 valido. */
  latest: News2Point | null;
  /** Ultima rilevazione in assoluto, se incompleta: quali parametri mancano. */
  latestIncomplete: { readingId: string; measuredAt: string; missing: string[] } | null;
  /** Punteggi completi del periodo, dal più vecchio al più recente. */
  history: News2Point[];
}

/**
 * NEWS2 dalle rilevazioni della pagina Parametri (le sole che registrano FR, O₂ e coscienza
 * insieme agli altri valori). Calcolo deterministico, mai del modello; la fonte è citata.
 */
export async function getPatientNews2(
  args: { patientId: string; days?: unknown },
  ctx: UserContext,
): Promise<Sourced<News2Overview>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, args.patientId);
  const window = windowOf(args, 7);
  const rows = await prisma.patientParameterReading.findMany({
    where: { patientId: args.patientId, measuredAt: { gte: window.from, lte: window.to } },
    orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
    take: MAX_READINGS,
    select: { id: true, measuredAt: true, values: true },
  });
  const points = rows.map((row) => ({
    readingId: row.id,
    measuredAt: row.measuredAt.toISOString(),
    result: news2((row.values ?? {}) as Record<string, string>),
  }));
  const complete = points.filter((p) => p.result.complete);
  const newest = points[0];
  const overview: News2Overview = {
    patientId: args.patientId,
    source: NEWS2_SOURCE,
    latest: complete[0] ?? null,
    latestIncomplete:
      newest && !newest.result.complete
        ? {
            readingId: newest.readingId,
            measuredAt: newest.measuredAt,
            missing: newest.result.missing,
          }
        : null,
    history: [...complete].reverse(),
  };
  gatewayAudit(
    ctx,
    'get_patient_news2',
    [args.patientId],
    complete.length,
    complete.length ? 'ok' : 'empty',
    nowIso(),
  );
  return {
    data: [overview],
    sourceRefs: complete
      .slice(0, 30)
      .map((p) =>
        clinicalScoreSource(
          args.patientId,
          p.readingId,
          'NEWS2',
          `NEWS2 ${p.result.total} (${p.result.risk}) — ${NEWS2_SOURCE.version}`,
          p.measuredAt,
        ),
      ),
    truncated: rows.length >= MAX_READINGS,
  };
}

// ── Diario ───────────────────────────────────────────────────────────────────────────────────

export async function getPatientDiaryEntries(
  args: { patientId: string; days?: unknown; authorType?: unknown },
  ctx: UserContext,
) {
  const days = clampDays(args.days, 7);
  const from = addDays(facilityToday(), -days);
  return getPatientDiary(args.patientId, ctx, {
    from,
    ...(typeof args.authorType === 'string' ? { authorType: args.authorType } : {}),
  });
}

// ── Scale e valutazioni finalizzate ──────────────────────────────────────────────────────────

const ASSESSMENT_LABELS: Record<string, string> = {
  painad: 'PAINAD (dolore nella demenza)',
  tinetti: 'Tinetti (equilibrio e andatura)',
  mna: 'MNA (stato nutrizionale)',
  gds15: 'GDS-15 (depressione geriatrica)',
  transfers: 'Trasferimenti',
  paper: 'Scala su carta',
};

export interface AssessmentSummary {
  id: string;
  type: string;
  label: string;
  assessedAt: string;
  author: string;
  total: number | null;
  band: string | null;
  result: string | null;
  interpretation: string | null;
}

/** Ultime valutazioni FINALIZZATE (le bozze non sono un dato clinico) con punteggio e lettura. */
export async function getPatientAssessments(
  args: { patientId: string; type?: unknown; days?: unknown },
  ctx: UserContext,
): Promise<Sourced<AssessmentSummary>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, args.patientId);
  const days = args.days === undefined ? MAX_DAYS * 4 : clampDays(args.days, MAX_DAYS);
  const rows = await prisma.patientAssessment.findMany({
    where: {
      patientId: args.patientId,
      status: 'final',
      assessedAt: { gte: new Date(Date.now() - days * 86400000) },
      ...(typeof args.type === 'string' && args.type ? { type: args.type } : {}),
    },
    orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
    take: MAX_ROWS + 1,
    select: {
      id: true,
      type: true,
      assessedAt: true,
      authorName: true,
      finalSnapshot: true,
    },
  });
  const data: AssessmentSummary[] = rows.slice(0, MAX_ROWS).map((row) => {
    const snapshot = (row.finalSnapshot ?? {}) as Record<string, unknown>;
    const result = (snapshot.result ?? {}) as Record<string, unknown>;
    const total = typeof result.total === 'number' ? result.total : null;
    return {
      id: row.id,
      type: row.type,
      label: ASSESSMENT_LABELS[row.type] ?? row.type,
      assessedAt: row.assessedAt.toISOString(),
      author: row.authorName,
      total,
      band: typeof result.band === 'string' ? result.band : null,
      result: typeof result.label === 'string' ? result.label : null,
      interpretation:
        typeof snapshot.interpretation === 'string' ? snapshot.interpretation.slice(0, 400) : null,
    };
  });
  gatewayAudit(
    ctx,
    'get_patient_assessments',
    [args.patientId],
    data.length,
    data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return {
    data,
    sourceRefs: data.map((a) =>
      assessmentSource(
        args.patientId,
        a.id,
        a.label,
        [a.total === null ? null : `punteggio ${a.total}`, a.result].filter(Boolean).join(' — '),
        a.assessedAt,
      ),
    ),
    truncated: rows.length > MAX_ROWS,
  };
}

// ── Somministrazioni ─────────────────────────────────────────────────────────────────────────

export interface AdministrationRow {
  id: string;
  kind: 'programmata' | 'al_bisogno';
  date: string;
  time: string;
  drug: string;
  dose: string;
  route: string;
  status: string;
  operator: string | null;
  reason?: string | null;
}

/** Somministrazioni programmate e al bisogno di un periodo (giorni di calendario di struttura). */
export async function getPatientAdministrations(
  args: { patientId: string; days?: unknown },
  ctx: UserContext,
): Promise<Sourced<AdministrationRow>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, args.patientId);
  const fromDay = addDays(facilityToday(), -clampDays(args.days, 3));
  const [scheduled, prn] = await Promise.all([
    prisma.medicationAdministration.findMany({
      where: { patientId: args.patientId, date: { gte: fromDay } },
      orderBy: [{ date: 'desc' }, { ora: 'desc' }, { id: 'desc' }],
      take: MAX_ROWS + 1,
      select: {
        id: true,
        date: true,
        ora: true,
        farmacoNome: true,
        farmacoDose: true,
        farmacoVia: true,
        stato: true,
        operatoreNome: true,
        motivo: true,
      },
    }),
    prisma.prnAdministration.findMany({
      where: { patientId: args.patientId, date: { gte: fromDay } },
      orderBy: [{ administeredAt: 'desc' }, { id: 'desc' }],
      take: MAX_ROWS + 1,
      select: {
        id: true,
        date: true,
        administeredAt: true,
        farmacoNome: true,
        farmacoDose: true,
        farmacoVia: true,
        operatoreNome: true,
        indicazione: true,
      },
    }),
  ]);
  const data: AdministrationRow[] = [
    ...scheduled.slice(0, MAX_ROWS).map((r) => ({
      id: r.id,
      kind: 'programmata' as const,
      date: r.date,
      time: r.ora,
      drug: r.farmacoNome,
      dose: r.farmacoDose,
      route: r.farmacoVia,
      status: r.stato,
      operator: r.operatoreNome,
      reason: r.motivo,
    })),
    ...prn.slice(0, MAX_ROWS).map((r) => ({
      id: r.id,
      kind: 'al_bisogno' as const,
      date: r.date,
      time: r.administeredAt.toISOString().slice(11, 16),
      drug: r.farmacoNome,
      dose: r.farmacoDose,
      route: r.farmacoVia,
      status: 'erogata',
      operator: r.operatoreNome,
      reason: r.indicazione,
    })),
  ].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  gatewayAudit(
    ctx,
    'get_patient_administrations',
    [args.patientId],
    data.length,
    data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return {
    data,
    sourceRefs: data.map((r) =>
      administrationSource(
        args.patientId,
        r.id,
        r.kind === 'al_bisogno' ? 'Somministrazione al bisogno' : 'Somministrazione',
        `${r.drug} ${r.dose} — ${r.status}`,
        `${r.date}T${r.time || '00:00'}`,
      ),
    ),
    truncated: scheduled.length > MAX_ROWS || prn.length > MAX_ROWS,
  };
}

// ── Turni del personale (dato organizzativo) ─────────────────────────────────────────────────

export interface ShiftRow {
  operator: string;
  ruolo: string | null;
  qualifica: string | null;
  reparto: string | null;
  giorno: string;
  data: string | null;
  oraInizio: string;
  oraFine: string;
}

const isShift = (
  v: unknown,
): v is { giorno: string; oraInizio: string; oraFine: string; disponibile: boolean } =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Record<string, unknown>).giorno === 'string' &&
  typeof (v as Record<string, unknown>).oraInizio === 'string' &&
  typeof (v as Record<string, unknown>).oraFine === 'string';

/**
 * Chi lavora in un giorno (o in tutta la settimana): turni settimanali degli operatori attivi.
 * Solo nome, ruolo, qualifica, reparto e orari; nessun dato di pazienti. Lettura di struttura.
 */
export async function queryStaffShifts(
  args: { date?: unknown; ruolo?: unknown },
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Sourced<ShiftRow>> {
  assertTenant(ctx);
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const date = isDay(args.date) ? args.date : null;
  const weekday = date ? weekdayOf(date) : null;
  const ruolo = typeof args.ruolo === 'string' ? args.ruolo.trim().toLowerCase() : '';
  const rows = await prisma.operatorSchedule.findMany({
    where: { operator: { user: { isActive: true } } },
    take: 500,
    select: {
      id: true,
      data: true,
      operator: {
        select: {
          ruolo: true,
          qualifica: true,
          department: true,
          user: { select: { fullName: true } },
        },
      },
    },
  });
  const data: ShiftRow[] = [];
  for (const row of rows) {
    const op = row.operator;
    if (ruolo && !`${op.ruolo ?? ''} ${op.qualifica ?? ''}`.toLowerCase().includes(ruolo)) continue;
    const turni = (row.data as { turni?: unknown })?.turni;
    for (const shift of Array.isArray(turni) ? turni.filter(isShift) : []) {
      if (!shift.disponibile) continue;
      if (weekday && shift.giorno !== weekday) continue;
      data.push({
        operator: op.user.fullName,
        ruolo: op.ruolo,
        qualifica: op.qualifica,
        reparto: op.department,
        giorno: shift.giorno,
        data: date,
        oraInizio: shift.oraInizio,
        oraFine: shift.oraFine,
      });
    }
  }
  data.sort((a, b) =>
    `${a.giorno} ${a.oraInizio} ${a.operator}`.localeCompare(
      `${b.giorno} ${b.oraInizio} ${b.operator}`,
    ),
  );
  gatewayAudit(ctx, 'query_staff_shifts', [], data.length, data.length ? 'ok' : 'empty', nowIso());
  return {
    data: data.slice(0, 300),
    sourceRefs: rows
      .slice(0, 50)
      .map((r) => shiftSource(r.id, `Turni di ${r.operator.user.fullName}`)),
    truncated: data.length > 300,
  };
}

// ── Agenda di un periodo (visite e appuntamenti della struttura) ─────────────────────────────

export interface AgendaRow {
  id: string;
  patientId: string;
  patient: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  operator: string;
  ruolo: string | null;
}

/**
 * Appuntamenti di un periodo (al massimo 31 giorni) nei pazienti del perimetro, con l'operatore
 * che li tiene (es. le visite del medico). Motivo e note NON escono: restano nella scheda.
 */
export async function queryAgenda(
  args: { from?: unknown; to?: unknown; ruolo?: unknown },
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Sourced<AgendaRow>> {
  assertTenant(ctx);
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const today = facilityToday();
  const fromDay = isDay(args.from) ? args.from : today;
  const toDay = isDay(args.to) ? args.to : fromDay;
  if (toDay < fromDay || addDays(fromDay, 31) < toDay)
    throw new GatewayError('bad_request', 'Periodo dell’agenda non valido (massimo 31 giorni)');
  if (ctx.permittedPatientIds?.length === 0) return { data: [], sourceRefs: [], truncated: false };
  const ruolo = typeof args.ruolo === 'string' ? args.ruolo.trim().toLowerCase() : '';
  const rows = await prisma.appointment.findMany({
    where: {
      // Giorni di struttura: margine di un giorno per il fuso, poi filtro esatto sul giorno locale.
      scheduledAt: {
        gte: new Date(`${addDays(fromDay, -1)}T00:00:00.000Z`),
        lte: new Date(`${addDays(toDay, 1)}T23:59:59.999Z`),
      },
      ...(ctx.permittedPatientIds === null ? {} : { patientId: { in: ctx.permittedPatientIds } }),
    },
    orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    take: 501,
    select: {
      id: true,
      patientId: true,
      scheduledAt: true,
      durationMinutes: true,
      status: true,
      patient: { select: { firstName: true, lastName: true } },
      operator: { select: { ruolo: true, qualifica: true, user: { select: { fullName: true } } } },
    },
  });
  const data: AgendaRow[] = rows
    .filter((r) => {
      const day = facilityDay(r.scheduledAt.toISOString());
      return day >= fromDay && day <= toDay;
    })
    .filter(
      (r) =>
        !ruolo ||
        `${r.operator.ruolo ?? ''} ${r.operator.qualifica ?? ''}`.toLowerCase().includes(ruolo),
    )
    .slice(0, MAX_ROWS)
    .map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patient: `${r.patient.lastName} ${r.patient.firstName}`.trim(),
      scheduledAt: r.scheduledAt.toISOString(),
      durationMinutes: r.durationMinutes,
      status: r.status,
      operator: r.operator.user.fullName,
      ruolo: r.operator.ruolo ?? r.operator.qualifica,
    }));
  gatewayAudit(
    ctx,
    'query_agenda',
    [...new Set(data.map((d) => d.patientId))],
    data.length,
    data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return {
    data,
    sourceRefs: data.map((a) =>
      appointmentSource(a.patientId, a.id, `Appuntamento con ${a.operator}`, a.scheduledAt),
    ),
    truncated: rows.length > 500 || data.length >= MAX_ROWS,
  };
}

// ── Righe della tabella Parametri nella forma delle letture storiche ─────────────────────────

/**
 * Valori di `PatientParameterReading` come righe `VitalItem` (una per parametro), con gli stessi
 * filtri di `getPatientVitalSigns`: così le domande già esistenti («ultimi parametri», «andamento
 * della pressione», «pressione sopra 150») vedono anche ciò che è registrato nella pagina Parametri.
 */
export async function getTableVitalItems(
  input: {
    patientId: string;
    label?: string;
    systolicMin?: number;
    systolicMax?: number;
    days?: number;
    from?: string;
    to?: string;
  },
  ctx: UserContext,
): Promise<{
  data: Array<Record<string, string>>;
  sourceRefs: SourceReference[];
  truncated: boolean;
}> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, input.patientId);
  const to = input.to ? new Date(input.to) : null;
  const from = input.from
    ? new Date(input.from)
    : input.days != null
      ? new Date(Date.now() - input.days * 86400000)
      : null;
  const rows = await prisma.patientParameterReading.findMany({
    where: {
      patientId: input.patientId,
      ...(from || to
        ? {
            measuredAt: {
              ...(from && Number.isFinite(from.getTime()) ? { gte: from } : {}),
              ...(to && Number.isFinite(to.getTime()) ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
    take: MAX_ROWS + 1,
    select: { id: true, measuredAt: true, values: true },
  });
  const wanted = input.label ? input.label.toUpperCase() : null;
  const data: Array<Record<string, string>> = [];
  const sourceRefs: SourceReference[] = [];
  for (const row of rows.slice(0, MAX_ROWS)) {
    const values = (row.values ?? {}) as Record<string, unknown>;
    for (const key of SERIES_KEYS) {
      const raw = values[key];
      if (typeof raw !== 'string' || !raw.trim()) continue;
      const label = labelForKey(key);
      if (wanted && label.toUpperCase() !== wanted) continue;
      if (input.systolicMin != null || input.systolicMax != null) {
        const sys = key === 'pa' ? numericValue('pa', raw) : null;
        if (sys === null) continue;
        if (input.systolicMin != null && sys < input.systolicMin) continue;
        if (input.systolicMax != null && sys > input.systolicMax) continue;
      }
      const rilevato = row.measuredAt.toISOString();
      data.push({
        id: `${row.id}:${key}`,
        etichetta: label,
        valore: raw.trim(),
        unita: SERIES_LABELS[key].unit,
        rilevato,
      });
      sourceRefs.push(
        vitalSource(input.patientId, row.id, label, `${label} ${raw.trim()}`, rilevato),
      );
    }
  }
  return { data, sourceRefs, truncated: rows.length > MAX_ROWS };
}
