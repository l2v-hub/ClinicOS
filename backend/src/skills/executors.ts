// Skill executors: the ONLY place where a skill touches the application, always through the Tool
// Layer (`invoke` = ToolRegistry.invoke with the caller's identity, origin 'ai'). Each call is
// re-authorized by the Phase 2 policy and audited as `tool:<name>`. No business rule lives here:
// executors map workflow slots to tool inputs and tool results to a short Italian answer.

import { facilityToday } from '../patients/parameter-reading-input.js';
import { scheduleFasciaConflicts } from '../therapies/diary-therapy-parse.js';
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

/** Handover default type: marks the origin (Prompt 4 §1.2, "AI_ASSISTED" equivalent). */
export const AI_HANDOVER_TYPE = 'Assistente AI';

// Deterministic hint only: urgency is SUGGESTED, never applied (Prompt 4 §1.2).
const URGENT_HINT =
  /\b(urgent\w*|subito|immediat\w*|cadut[oa]|dolore toracico|dispnea|non risponde|sanguin\w*|emorragi\w*|convulsion\w*|desatur\w*|febbre alta|svenut[oa]|incoscient\w*)\b/i;

export function looksUrgent(text: string | undefined): boolean {
  return typeof text === 'string' && URGENT_HINT.test(text);
}

const PREVIEW_WARNINGS: Record<string, string> = {
  proposta_ai: 'Alcuni campi sono proposti dall’AI: verificali.',
  ai_non_disponibile: 'Proposta AI non disponibile: controlla i campi mancanti.',
  testo_non_classificato: 'Parte del testo non è stata classificata: controlla le note.',
  menzione_sospensione: 'Il testo menziona una sospensione.',
  menzione_somministrazione: 'Il testo menziona una somministrazione.',
  menzione_modifica: 'Il testo menziona una modifica.',
};

function draftRow(state: WorkflowState): Record<string, unknown> {
  const preview = (state.slots.therapyDraft?.preview ?? {}) as { row?: Record<string, unknown> };
  return preview.row ?? {};
}

/** What is still missing before a prescription draft can be confirmed (empty = confirmable). */
export function prescriptionGaps(state: WorkflowState): string[] {
  const preview = (state.slots.therapyDraft?.preview ?? {}) as {
    intent?: string;
    fasciaConflicts?: unknown[];
  };
  const row = draftRow(state);
  const gaps: string[] = [];
  if (!String(row.farmacoNome ?? '').trim()) gaps.push('farmaco');
  const orari = Array.isArray(row.orari) ? row.orari : [];
  if (preview.intent !== 'al_bisogno' && orari.length === 0) gaps.push('orari');
  if (Array.isArray(preview.fasciaConflicts) && preview.fasciaConflicts.length)
    gaps.push('orari nella stessa fascia');
  return gaps;
}

/**
 * Structured preview of a write (Prompt 3 §9, Prompt 4 §7). Built from slots only: nothing is
 * written yet. `previewId` binds the confirmation to exactly this content.
 */
export function buildPreview(
  state: WorkflowState,
  now: Date,
  previewId: string,
  actor: { name: string; role: string },
): SkillPreview {
  const patient = state.slots.patient ?? null;
  const common = {
    previewId,
    skillId: state.skillId,
    patient,
    origin: 'ai' as const,
    actor,
    notes: [] as string[],
    warnings: [] as string[],
    confirmable: true,
  };
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
      editable: ['values'],
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
      editable: ['text'],
    };
  }
  if (state.skillId === 'therapy.prescribe') {
    const row = draftRow(state);
    const draft = (state.slots.therapyDraft?.preview ?? {}) as {
      intent?: string;
      warnings?: string[];
      aiNotes?: string[];
      fasciaConflicts?: string[];
    };
    const orari = Array.isArray(row.orari) ? (row.orari as string[]) : [];
    const gaps = prescriptionGaps(state);
    const warnings = [
      ...(draft.warnings ?? []).map((w) => PREVIEW_WARNINGS[w] ?? `Avviso: ${w}`),
      ...(draft.aiNotes ?? []).map((n) => `AI: ${n}`),
      ...(draft.fasciaConflicts?.length
        ? [`Più orari nella stessa fascia: ${draft.fasciaConflicts.join(', ')}.`]
        : []),
      'Prescrizione preparata dall’assistente: la conferma è del medico.',
    ];
    const bound = state.slots.therapyInput;
    if (bound) {
      // The confirmation binds THIS payload: every clinically relevant field is shown as written.
      const schedules = Array.isArray(bound.schedules)
        ? (bound.schedules as {
            time?: string;
            quantityNumerator?: number;
            quantityDenominator?: number;
            administrationUnit?: string;
          }[])
        : [];
      const strength = [bound.commercialStrengthValue, bound.commercialStrengthUnit]
        .filter((v) => v !== undefined && v !== null && String(v).trim())
        .join(' ');
      const boundConflicts = scheduleFasciaConflicts(
        schedules.map((s) => String(s.time ?? '')).filter(Boolean),
      );
      const giorni = Array.isArray(bound.giorniSettimana)
        ? (bound.giorniSettimana as unknown[]).join(',')
        : String(bound.giorniSettimana ?? '');
      return {
        ...common,
        action: 'Nuova prescrizione (conferma del medico)',
        values: {
          Farmaco: String(bound.farmacoNome ?? ''),
          Dosaggio: strength || String(bound.dosaggio ?? '') || '—',
          Forma: String(bound.pharmaceuticalForm ?? '') || '—',
          'Frazioni consentite': String(bound.allowedFractions ?? '') || '—',
          Via: String(bound.viaSomministrazione ?? '') || '—',
          Tipo: String(bound.tipo ?? '') || '—',
          Orari:
            schedules
              .map(
                (s) =>
                  `${s.time ?? ''}${s.quantityNumerator ? ` (${s.quantityNumerator}${s.quantityDenominator && s.quantityDenominator !== 1 ? `/${s.quantityDenominator}` : ''} ${s.administrationUnit ?? ''})` : ''}`,
              )
              .join(', ') || (bound.tipo === 'al_bisogno' ? 'al bisogno' : '—'),
          ...(giorni ? { Giorni: giorni } : {}),
          Inizio: String(bound.dataInizio ?? ''),
          Fine: String(bound.dataFine ?? '') || '—',
          ...(String(bound.note ?? '').trim() ? { Note: String(bound.note) } : {}),
          Testo: state.slots.text ?? '',
        },
        tool: 'diary.create_with_therapy',
        confirmationClass: 'HIGH_RISK',
        notes: ['Verrà creata la voce di diario «terapia» collegata alla terapia.'],
        warnings: boundConflicts.length
          ? [...warnings, `Più orari nella stessa fascia: ${boundConflicts.join(', ')}.`]
          : warnings,
        confirmable: boundConflicts.length === 0,
        ...(boundConflicts.length
          ? { blockedReason: 'Da completare nella scheda Terapia: orari nella stessa fascia.' }
          : {}),
        therapyBound: true,
        editable: ['text'],
        therapyDraft: state.slots.therapyDraft,
      };
    }
    return {
      ...common,
      action: 'Nuova prescrizione (conferma del medico)',
      therapyBound: false,
      values: {
        Farmaco: String(row.farmacoNome ?? '') || '—',
        Dosaggio: String(row.dosaggio ?? '') || '—',
        Via: String(row.viaSomministrazione ?? '') || '—',
        Orari: draft.intent === 'al_bisogno' ? 'al bisogno' : orari.length ? orari.join(', ') : '—',
        Inizio: String(row.dataInizio ?? '') || 'data della voce',
        ...(row.dataFine ? { Fine: String(row.dataFine) } : {}),
        Testo: state.slots.text ?? '',
      },
      tool: 'diary.create_with_therapy',
      confirmationClass: 'HIGH_RISK',
      notes: ['Verrà creata la voce di diario «terapia» collegata alla terapia.'],
      warnings,
      confirmable: gaps.length === 0,
      ...(gaps.length
        ? { blockedReason: `Da completare nella scheda Terapia: ${gaps.join(', ')}.` }
        : {}),
      editable: ['text'],
      therapyDraft: state.slots.therapyDraft,
    };
  }
  if (state.skillId === 'administration.record') {
    const a = state.slots.administration!;
    return {
      ...common,
      action: 'Registrazione somministrazione (conferma dell’operatore)',
      values: {
        Farmaco: a.drugName,
        Dose: a.dosage || '—',
        Via: a.route || '—',
        Fascia: `${a.fascia}${a.scheduledTime ? ` (${a.scheduledTime})` : ''}`,
        Data: a.date,
      },
      tool: 'administration.confirm',
      confirmationClass: 'HIGH_RISK',
      notes: ['Esecutore: operatore autenticato.'],
      warnings: ['Conferma solo dopo aver somministrato davvero il farmaco all’ospite.'],
      editable: [],
    };
  }
  const priority = state.slots.priority ?? 'normale';
  const urgent = looksUrgent(state.slots.text);
  return {
    ...common,
    action: 'Nuova consegna',
    values: { Nota: state.slots.text ?? '', Priorità: priority, Tipo: AI_HANDOVER_TYPE },
    tool: 'consegne.create',
    confirmationClass: 'LOW_RISK_WRITE',
    warnings:
      urgent && priority === 'normale'
        ? [
            'Il testo sembra urgente: la priorità resta «normale». Se serve, usa Modifica per alzarla.',
          ]
        : priority !== 'normale'
          ? [`Priorità «${priority}» impostata esplicitamente.`]
          : [],
    editable: ['text', 'priority'],
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
            priorita: state.slots.priority ?? 'normale',
            tipo: AI_HANDOVER_TYPE,
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
        reply: `Consegna creata per ${label} (priorità ${state.slots.priority ?? 'normale'}).`,
      };
    }
    case 'therapy.prescribe': {
      const tool = 'diary.create_with_therapy';
      const result = await call(
        tool,
        {
          patientId,
          body: {
            requestId: state.writeRequestId,
            entry: {
              content: state.slots.text ?? '',
              entryDateTime: state.slots.therapyDraft?.entryDateTime ?? facilityMinute(now),
            },
            therapy: state.slots.therapyInput ?? {},
          },
        },
        true,
      );
      if (!result.ok) return failure(result, tool, used);
      const data = result.data as {
        entry?: { id?: string };
        therapy?: { id?: string; farmacoNome?: string };
        replay?: boolean;
      };
      return {
        ok: true,
        toolsUsed: used,
        result: {
          entryId: data.entry?.id,
          therapyId: data.therapy?.id,
          replayed: data.replay === true,
        },
        reply: `Prescrizione registrata per ${label}: ${data.therapy?.farmacoNome ?? ''} (terapia e voce di diario collegate).`,
      };
    }
    case 'administration.record': {
      const tool = 'administration.confirm';
      const a = state.slots.administration!;
      // Phase 6 (G2): the service re-resolves drug/dose from the CURRENT prescription at write time.
      // Recheck before commit that the slot is still pending with exactly the drug/dose/route the
      // operator confirmed in the preview; any change → no write, new preview needed.
      const check = await call('administration.list_slots', { query: { date: a.date } });
      if (!check.ok) return failure(check, 'administration.list_slots', used);
      type Pending = {
        therapyId: string;
        drugName: string;
        dosage: string;
        route: string;
        status: string;
      };
      const slots = (Array.isArray(check.data) ? check.data : []) as {
        fascia: string;
        patients: { patientId: string; administrations: Pending[] }[];
      }[];
      const current = slots
        .filter((s) => s.fascia === a.fascia)
        .flatMap((s) => s.patients ?? [])
        .filter((p) => p.patientId === patientId)
        .flatMap((p) => p.administrations ?? [])
        .find((x) => x.therapyId === a.therapyId);
      const unchanged =
        current &&
        current.status === 'pending' &&
        current.drugName === a.drugName &&
        (current.dosage ?? '') === (a.dosage ?? '') &&
        (current.route ?? '') === (a.route ?? '');
      if (!unchanged)
        return {
          ok: false,
          tool,
          toolsUsed: used,
          error: {
            code: 'conflict',
            status: 409,
            domainCode: 'preview_stale',
            message: current
              ? current.status === 'pending'
                ? 'La prescrizione è cambiata dopo l’anteprima: nessuna somministrazione registrata. Rivedi la nuova anteprima.'
                : 'Questa somministrazione risulta già registrata o chiusa: nessuna nuova registrazione eseguita. Verifica il registro somministrazioni.'
              : 'Somministrazione non più disponibile: nessuna registrazione eseguita.',
          },
        };
      const result = await call(
        tool,
        { body: { patientId, therapyId: a.therapyId, date: a.date, fascia: a.fascia } },
        true,
      );
      if (!result.ok) return failure(result, tool, used);
      const data = result.data as { id?: string; administrationId?: string };
      return {
        ok: true,
        toolsUsed: used,
        result: {
          administrationId: data.id ?? data.administrationId ?? null,
          therapyId: a.therapyId,
          fascia: a.fascia,
          date: a.date,
        },
        reply: `Somministrazione registrata per ${label}: ${a.drugName}, ${a.fascia} del ${a.date}.`,
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
