// Skill executors: the ONLY place where a skill touches the application, always through the Tool
// Layer (`invoke` = ToolRegistry.invoke with the caller's identity, origin 'ai'). Each call is
// re-authorized by the Phase 2 policy and audited as `tool:<name>`. No business rule lives here:
// executors map workflow slots to tool inputs and tool results to a short Italian answer.

import { facilityToday } from '../patients/parameter-reading-input.js';
import type { ToolResult, ToolErrorShape } from '../tools/types.js';
import type { SkillPreview, WorkflowState } from './types.js';

export type SkillInvoke = (
  tool: string,
  input: Record<string, unknown>,
  options?: { confirmed?: boolean },
) => Promise<ToolResult>;

export type ExecOutcome =
  | { ok: true; result: unknown; reply: string; toolsUsed: string[] }
  | { ok: false; error: ToolErrorShape; tool: string; toolsUsed: string[] };

export const VALUE_LABELS: Record<string, string> = {
  pa: 'Pressione',
  spo2: 'SpO₂',
  fc: 'Frequenza cardiaca',
  temperatura: 'Temperatura',
  fr: 'Frequenza respiratoria',
  o2: 'Ossigeno',
  coscienza: 'Coscienza (ACVPU)',
  dtx: 'Glicemia (DTX)',
  evacuazione: 'Evacuazione',
};

const TIME = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function when(iso: unknown): string {
  const date = typeof iso === 'string' ? new Date(iso) : null;
  return date && Number.isFinite(date.getTime()) ? TIME.format(date) : '';
}

function valuesLine(values: unknown): string {
  if (!values || typeof values !== 'object') return '';
  return Object.entries(values as Record<string, unknown>)
    .filter(([key, value]) => key !== 'note' && typeof value === 'string' && value)
    .map(([key, value]) => `${VALUE_LABELS[key] ?? key} ${value}`)
    .join(', ');
}

/** First array found in a tool result (items, readings, entries, …). */
function firstList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

const LABEL_FIELDS = [
  'farmacoNome',
  'nomeCommerciale',
  'denominazione',
  'nome',
  'name',
  'label',
  'title',
  'tipologia',
  'tipo',
  'fascia',
  'ora',
  'stato',
  'note',
  'content',
  'contextId',
];

function itemLine(item: unknown): string {
  if (!item || typeof item !== 'object') return String(item);
  const o = item as Record<string, unknown>;
  const parts: string[] = [];
  for (const field of LABEL_FIELDS) {
    const value = o[field];
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) {
      parts.push(String(value).trim().slice(0, 80));
    }
    if (parts.length >= 3) break;
  }
  return parts.join(' · ') || 'voce';
}

function listReply(title: string, data: unknown, empty: string): string {
  const items = firstList(data);
  if (items.length === 0) return empty;
  const lines = items.slice(0, 5).map((item) => `• ${itemLine(item)}`);
  const more = items.length > 5 ? `\n…e altre ${items.length - 5}.` : '';
  return `${title} (${items.length}):\n${lines.join('\n')}${more}`;
}

function failure(result: ToolResult, tool: string, toolsUsed: string[]): ExecOutcome {
  return { ok: false, error: (result as { error: ToolErrorShape }).error, tool, toolsUsed };
}

function facilityMinute(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Structured preview of a write (Prompt 3 §9). Built from slots only: nothing is written yet. */
export function buildPreview(state: WorkflowState, now: Date): SkillPreview {
  const patient = state.slots.patient ?? null;
  const common = { skillId: state.skillId, patient, origin: 'ai' as const, notes: [] as string[] };
  if (state.skillId === 'vitals.record') {
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(state.slots.values ?? {})) {
      values[VALUE_LABELS[key] ?? key] = value;
    }
    values['Orario rilevazione'] = when(state.slots.at ?? now.toISOString());
    return {
      ...common,
      action: 'Registrazione parametri vitali',
      values,
      tool: 'parameters.create_reading',
      confirmationClass: 'SENSITIVE_WRITE',
      notes: ['Autore: operatore corrente (risolto dal server).'],
    };
  }
  if (state.skillId === 'diary.add_observation') {
    return {
      ...common,
      action: 'Nuova osservazione nel diario',
      values: { Testo: state.slots.text ?? '', Data: when(now.toISOString()) },
      tool: 'diary.create',
      confirmationClass: 'SENSITIVE_WRITE',
      notes: ['Il testo viene salvato così com’è, senza riscritture.'],
    };
  }
  return {
    ...common,
    action: 'Nuova consegna',
    values: { Nota: state.slots.text ?? '', Priorità: 'normale', Tipo: 'Monitoraggio' },
    tool: 'consegne.create',
    confirmationClass: 'LOW_RISK_WRITE',
  };
}

export async function executeSkill(
  state: WorkflowState,
  invoke: SkillInvoke,
  allowedOptional: ReadonlySet<string>,
  now: Date,
): Promise<ExecOutcome> {
  const patientId = state.slots.patient?.id ?? '';
  const label = state.slots.patient?.label ?? '';
  const used: string[] = [];
  const call = async (tool: string, input: Record<string, unknown>, confirmed = false) => {
    used.push(tool);
    return invoke(tool, input, confirmed ? { confirmed: true } : undefined);
  };

  switch (state.skillId) {
    case 'vitals.record': {
      const tool = 'parameters.create_reading';
      const measuredAt = state.slots.at ?? now.toISOString();
      const result = await call(
        tool,
        {
          patientId,
          body: { requestId: state.writeRequestId, measuredAt, values: state.slots.values ?? {} },
        },
        true,
      );
      if (!result.ok) return failure(result, tool, used);
      const data = result.data as { reading?: { id?: string }; replayed?: boolean };
      const readingId = data.reading?.id;
      // Verify: read back the day's readings when the identity may read them.
      let verified: boolean | null = null;
      if (allowedOptional.has('parameters.list_readings') && readingId) {
        const check = await call('parameters.list_readings', {
          patientId,
          query: { date: facilityToday(new Date(measuredAt)), limit: '100' },
        });
        verified =
          check.ok &&
          firstList(check.data).some((row) => (row as { id?: string }).id === readingId);
      }
      return {
        ok: true,
        toolsUsed: used,
        result: { readingId, replayed: data.replayed === true, verified },
        reply:
          `Parametri registrati per ${label}: ${valuesLine(state.slots.values)}.` +
          (verified ? ' Verificato: la rilevazione è presente nel registro.' : ''),
      };
    }
    case 'diary.add_observation': {
      const tool = 'diary.create';
      const result = await call(
        tool,
        {
          patientId,
          body: { content: state.slots.text ?? '', entryDateTime: facilityMinute(now) },
        },
        true,
      );
      if (!result.ok) return failure(result, tool, used);
      const entry = (result.data as { entry?: { id?: string; authorName?: string } }).entry;
      return {
        ok: true,
        toolsUsed: used,
        result: { entryId: entry?.id, authorName: entry?.authorName },
        reply: `Osservazione aggiunta al diario di ${label}${entry?.authorName ? ` (autore: ${entry.authorName})` : ''}.`,
      };
    }
    case 'handover.create': {
      const tool = 'consegne.create';
      const result = await call(
        tool,
        {
          body: {
            pazienteId: patientId,
            priorita: 'normale',
            tipo: 'Monitoraggio',
            note: state.slots.text ?? '',
            requestId: state.writeRequestId,
          },
        },
        true,
      );
      if (!result.ok) return failure(result, tool, used);
      const id = (result.data as { id?: string }).id;
      return {
        ok: true,
        toolsUsed: used,
        result: { consegnaId: id },
        reply: `Consegna creata per ${label}.`,
      };
    }
    case 'vitals.recent': {
      const tool = 'parameters.list_readings';
      const result = await call(tool, { patientId, query: { limit: '5' } });
      if (!result.ok) return failure(result, tool, used);
      const readings = firstList(result.data) as { measuredAt?: string; values?: unknown }[];
      const reply = readings.length
        ? `Ultime rilevazioni di ${label}:\n${readings
            .map((r) => `• ${when(r.measuredAt)} — ${valuesLine(r.values) || 'solo note'}`)
            .join('\n')}`
        : `Nessuna rilevazione registrata per ${label}.`;
      return { ok: true, toolsUsed: used, result: { readings }, reply };
    }
    case 'diary.recent': {
      const tool = 'diary.list';
      const result = await call(tool, { patientId, query: { limit: '5' } });
      if (!result.ok) return failure(result, tool, used);
      const entries = firstList(result.data) as {
        entryDateTime?: string;
        authorName?: string;
        content?: string;
      }[];
      const reply = entries.length
        ? `Ultime voci del diario di ${label}:\n${entries
            .slice(0, 5)
            .map(
              (e) =>
                `• ${String(e.entryDateTime ?? '')
                  .replace('T', ' ')
                  .slice(0, 16)} ${e.authorName ?? ''}: ${String(e.content ?? '').slice(0, 120)}`,
            )
            .join('\n')}`
        : `Il diario di ${label} è vuoto.`;
      return { ok: true, toolsUsed: used, result: { entries: entries.slice(0, 5) }, reply };
    }
    case 'patient.overview': {
      const tool = 'patients.clinical_summary';
      const result = await call(tool, { query: { patientIds: patientId } });
      if (!result.ok) return failure(result, tool, used);
      const summary = firstList(result.data)[0] as Record<string, unknown> | undefined;
      if (!summary) {
        return {
          ok: false,
          tool,
          toolsUsed: used,
          error: { code: 'not_found', status: 404, message: 'Ospite non trovato' },
        };
      }
      const lines = [
        `Ospite: ${label}`,
        `Stato ricovero: ${summary.statoRicovero ?? 'non indicato'}`,
        `Allergie registrate: ${summary.allergieCount ?? 0}${summary.hasSevereAllergy ? ' (almeno una grave)' : ''}`,
        `Terapie: ${summary.terapieTotali ?? 0} (completate ${summary.terapieCompletate ?? 0})`,
        `Consegne aperte: ${summary.consegneAperte ?? 0}`,
      ];
      if (summary.hasCriticalVitals) lines.push('Attenzione: parametri critici registrati.');
      let latest: unknown = null;
      if (allowedOptional.has('parameters.list_readings')) {
        const readings = await call('parameters.list_readings', {
          patientId,
          query: { limit: '1' },
        });
        if (readings.ok) {
          latest = firstList(readings.data)[0] ?? null;
          const r = latest as { measuredAt?: string; values?: unknown } | null;
          lines.push(
            r
              ? `Ultima rilevazione (${when(r.measuredAt)}): ${valuesLine(r.values) || 'solo note'}`
              : 'Nessuna rilevazione registrata.',
          );
        }
      } else {
        lines.push('Parametri non disponibili per il tuo ruolo.');
      }
      return {
        ok: true,
        toolsUsed: used,
        result: { summary, latestReading: latest },
        reply: lines.join('\n'),
      };
    }
    case 'clinical.question': {
      const tool = 'assistant.query';
      const result = await call(tool, {
        body: {
          question: state.slots.query ?? '',
          ...(patientId ? { currentPatientId: patientId } : {}),
        },
      });
      if (!result.ok) return failure(result, tool, used);
      const data = result.data as {
        answerText?: string;
        answer?: string;
        text?: string;
        results?: unknown[];
        notFound?: boolean;
      };
      const results = Array.isArray(data.results) ? data.results : [];
      const reply =
        data.answerText ||
        data.answer ||
        data.text ||
        (results.length
          ? listReply('Dati trovati in cartella', results, 'Nessun dato trovato.')
          : data.notFound
            ? 'Non ho trovato dati in cartella per questa domanda.'
            : 'Nessuna risposta disponibile per la domanda.');
      return { ok: true, toolsUsed: used, result: data, reply };
    }
    case 'therapy.due_administrations': {
      const tool = 'administration.list_slots';
      const date = state.slots.date ?? facilityToday(now);
      const result = await call(tool, { query: { date } });
      if (!result.ok) return failure(result, tool, used);
      return {
        ok: true,
        toolsUsed: used,
        result: result.data,
        reply: listReply(
          `Somministrazioni del ${date}`,
          result.data,
          `Nessuna somministrazione prevista il ${date}.`,
        ),
      };
    }
    case 'handover.overview': {
      const tool = 'consegne.overview';
      const result = await call(tool, {});
      if (!result.ok) return failure(result, tool, used);
      const data = result.data as Record<string, unknown>;
      const summary =
        data.summary && typeof data.summary === 'object'
          ? (data.summary as Record<string, unknown>)
          : data;
      const LABELS: Record<string, string> = {
        total: 'totali',
        open: 'aperte',
        inProgress: 'in corso',
        completed: 'completate',
        urgentOpen: 'urgenti aperte',
      };
      const counts = Object.entries(summary)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => `${LABELS[key] ?? key}: ${value}`)
        .join(', ');
      return {
        ok: true,
        toolsUsed: used,
        result: data,
        reply: counts
          ? `Situazione consegne — ${counts}.`
          : listReply('Consegne', data, 'Nessuna consegna aperta.'),
      };
    }
    case 'appointments.day': {
      const tool = 'appointments.list';
      const date = state.slots.date ?? facilityToday(now);
      const result = await call(tool, { query: { from: date, to: date } });
      if (!result.ok) return failure(result, tool, used);
      return {
        ok: true,
        toolsUsed: used,
        result: result.data,
        reply: listReply(
          `Appuntamenti del ${date}`,
          result.data,
          `Nessun appuntamento il ${date}.`,
        ),
      };
    }
    case 'facility.occupancy': {
      const tool = 'rooms.occupancy';
      const result = await call(tool, {});
      if (!result.ok) return failure(result, tool, used);
      const o = result.data as Record<string, number>;
      return {
        ok: true,
        toolsUsed: used,
        result: o,
        reply: `Posti letto: ${o.occupiedBeds ?? '?'} occupati su ${o.totalBeds ?? '?'} (${o.occupancyPct ?? '?'}%), ${o.freeBeds ?? '?'} liberi, ${o.maintenanceBeds ?? 0} in manutenzione.`,
      };
    }
    case 'drug.lookup': {
      const tool = 'drugs.search';
      const result = await call(tool, { query: { q: state.slots.query ?? '' } });
      if (!result.ok) return failure(result, tool, used);
      return {
        ok: true,
        toolsUsed: used,
        result: result.data,
        reply: listReply(
          `Farmaci trovati per «${state.slots.query}»`,
          result.data,
          `Nessun farmaco trovato per «${state.slots.query}».`,
        ),
      };
    }
    case 'patient.find': {
      const tool = 'patients.search';
      const result = await call(tool, { body: { q: state.slots.query ?? '' } });
      if (!result.ok) return failure(result, tool, used);
      const items = firstList(result.data) as { firstName?: string; lastName?: string }[];
      return {
        ok: true,
        toolsUsed: used,
        result: { count: items.length },
        reply: items.length
          ? `Ospiti trovati (${items.length}):\n${items
              .slice(0, 5)
              .map((p) => `• ${p.lastName ?? ''} ${p.firstName ?? ''}`.trim())
              .join('\n')}`
          : `Nessun ospite trovato per «${state.slots.query}».`,
      };
    }
    case 'admin.roster_contexts': {
      const tool = 'roster.list_contexts';
      const result = await call(tool, {});
      if (!result.ok) return failure(result, tool, used);
      return {
        ok: true,
        toolsUsed: used,
        result: result.data,
        reply: listReply('Contesti di ordinamento', result.data, 'Nessun contesto configurato.'),
      };
    }
    default:
      return {
        ok: false,
        tool: 'none',
        toolsUsed: used,
        error: { code: 'unavailable', status: 501, message: 'Skill non eseguibile' },
      };
  }
}
