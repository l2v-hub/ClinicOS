// AI Assistant (Phase 4) — structured client state (Prompt 4 §6). Pure: unit-tested without a DOM.
//
// The server is the source of truth for identity, role, capabilities, skills, resident scope and
// workflow state; this reducer only mirrors the last server answer and adds UI-only facts
// (request in flight, transcript for display). Chat history is NEVER used to decide anything.

import type { DiaryTherapyPreview } from '../operator/cartella/diaryTherapy';
import {
  diaryTherapyInput,
  diaryTherapyIssues,
  previewToTherapyForm,
} from '../operator/cartella/diaryTherapy';
import type {
  AssistantPreview,
  AssistantResident,
  AssistantSession,
  ConverseResponse,
  WorkflowStatus,
} from './assistantApi';

export const TERMINAL: ReadonlySet<WorkflowStatus> = new Set([
  'COMPLETED',
  'DENIED',
  'FAILED',
  'CANCELLED',
]);

export interface TranscriptItem {
  id: number;
  who: 'user' | 'assistant' | 'system';
  text: string;
  status?: WorkflowStatus;
  /** How the user's text arrived (keyboard, starter; voice in Prompt 5). */
  source?: string;
}

export interface AssistantState {
  session: AssistantSession | null;
  sessionError: string | null;
  /** Active resident: always visible; set only from server-verified data. */
  resident: AssistantResident | null;
  /** Last server answer of the current workflow (id, status, pending, preview …). */
  workflow: ConverseResponse | null;
  /** A request is in flight: every action button is disabled (no double submit). */
  busy: boolean;
  /** The preview id the user pressed «Conferma» on (bound confirmation), while in flight. */
  confirming: string | null;
  /** Last result the backend CONFIRMED (never a proposal). */
  lastVerified: { skillId: string | null; reply: string; result: unknown } | null;
  transcript: TranscriptItem[];
  /** Transient UI notice (errors of the transport, resident changes). */
  notice: { tone: 'info' | 'error'; text: string } | null;
}

export const initialAssistantState: AssistantState = {
  session: null,
  sessionError: null,
  resident: null,
  workflow: null,
  busy: false,
  confirming: null,
  lastVerified: null,
  transcript: [],
  notice: null,
};

export type AssistantAction =
  | { type: 'session_loaded'; session: AssistantSession }
  | { type: 'session_failed'; message: string }
  | { type: 'resident_set'; resident: AssistantResident | null; notice?: string }
  | { type: 'request_started'; userText?: string; source?: string; confirming?: string | null }
  | { type: 'response'; response: ConverseResponse }
  | { type: 'request_failed'; message: string }
  | { type: 'dismiss_notice' }
  | { type: 'reset_workflow' };

let seq = 0;
const item = (
  who: TranscriptItem['who'],
  text: string,
  status?: WorkflowStatus,
): TranscriptItem => ({
  id: ++seq,
  who,
  text,
  ...(status ? { status } : {}),
});

export function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case 'session_loaded':
      return {
        ...state,
        session: action.session,
        sessionError: null,
        resident: action.session.resident,
        notice: action.session.residentDenied
          ? {
              tone: 'error',
              text: 'L’ospite aperto non rientra tra quelli a cui hai accesso: nessun ospite attivo.',
            }
          : state.notice,
      };
    case 'session_failed':
      return { ...state, sessionError: action.message };
    case 'resident_set': {
      const changed = (state.resident?.id ?? null) !== (action.resident?.id ?? null);
      return {
        ...state,
        resident: action.resident,
        notice: action.notice
          ? { tone: 'info', text: action.notice }
          : changed && isActive(state.workflow)
            ? {
                tone: 'info',
                text: 'Ospite cambiato: l’operazione in corso verrà annullata al prossimo passo.',
              }
            : state.notice,
      };
    }
    case 'request_started':
      return {
        ...state,
        busy: true,
        confirming: action.confirming ?? null,
        notice: null,
        transcript: action.userText
          ? [
              ...state.transcript,
              { ...item('user', action.userText), ...(action.source ? { source: action.source } : {}) },
            ]
          : state.transcript,
      };
    case 'response': {
      const r = action.response;
      const verified =
        r.status === 'COMPLETED' ? { skillId: r.skillId, reply: r.reply, result: r.result } : null;
      return {
        ...state,
        busy: false,
        confirming: null,
        workflow: r.workflowId && !TERMINAL.has(r.status) ? r : r.workflowId ? r : null,
        lastVerified: verified ?? state.lastVerified,
        // `resident` stays the CONTEXT (page / picker): the workflow target is shown in the
        // preview. Mixing the two made named-resident workflows look like a resident change.
        // The structured preview card carries the details; the chat keeps a short pointer.
        transcript: [
          ...state.transcript,
          item(
            'assistant',
            // A NEW preview gets a short pointer; the SAME preview (e.g. after a typed/spoken
            // «conferma») keeps the server reply, which says to press «Conferma».
            r.status === 'NEEDS_CONFIRMATION' &&
              r.preview &&
              r.preview.previewId !== state.workflow?.preview?.previewId
              ? `Anteprima pronta: ${r.preview.action}. Controllala qui sotto.`
              : r.reply,
            r.status,
          ),
        ],
      };
    }
    case 'request_failed':
      return {
        ...state,
        busy: false,
        confirming: null,
        notice: { tone: 'error', text: action.message },
        transcript: [...state.transcript, item('system', action.message)],
      };
    case 'dismiss_notice':
      return { ...state, notice: null };
    case 'reset_workflow':
      return { ...state, workflow: null };
  }
}

export function isActive(workflow: ConverseResponse | null): boolean {
  return Boolean(workflow?.workflowId) && !TERMINAL.has(workflow!.status);
}

/** «Conferma» is shown only for a confirmable preview the backend is waiting for. */
export function canConfirm(state: AssistantState): boolean {
  const w = state.workflow;
  return Boolean(
    !state.busy &&
      w &&
      w.status === 'NEEDS_CONFIRMATION' &&
      w.preview &&
      w.preview.confirmable &&
      // A prescription is confirmable only once the preview shows the exact payload.
      (w.preview.skillId !== 'therapy.prescribe' || w.preview.therapyBound === true),
  );
}

/**
 * Prescription draft → therapy payload to ATTACH (built with the classic Terapia mapper), so the
 * next preview shows exactly what will be written. null when not applicable or not mappable.
 */
export function therapyAttachment(response: ConverseResponse): Record<string, unknown> | null {
  const preview = response.preview;
  if (
    response.status !== 'NEEDS_CONFIRMATION' ||
    !preview ||
    preview.skillId !== 'therapy.prescribe' ||
    preview.therapyBound ||
    !preview.confirmable
  )
    return null;
  return prescriptionPayload(preview).therapy;
}

export function canRetry(workflow: ConverseResponse | null): boolean {
  return workflow?.status === 'FAILED' && /«Riprova»/.test(workflow.reply);
}

export interface PrescriptionPayload {
  therapy: Record<string, unknown> | null;
  issues: string[];
}

/**
 * HIGH_RISK prescription: the therapy the doctor confirms is built with the SAME mapper as the
 * classic Diario → Terapia panel (no duplicated clinical rules). Issues → no «Conferma» here.
 */
export function prescriptionPayload(
  preview: AssistantPreview | null | undefined,
): PrescriptionPayload {
  const draft = preview?.therapyDraft;
  if (!draft) return { therapy: null, issues: ['Bozza di prescrizione non disponibile.'] };
  const diaryPreview = draft.preview as unknown as DiaryTherapyPreview;
  if (!diaryPreview?.row)
    return { therapy: null, issues: ['Bozza di prescrizione non leggibile.'] };
  const form = previewToTherapyForm(diaryPreview, draft.entryDateTime);
  const issues = diaryTherapyIssues(form).map((issue) => issue.message);
  return { therapy: issues.length ? null : diaryTherapyInput(form), issues };
}

/** Status chip text (Italian) — what the user sees about the workflow state. */
export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  START: 'Avvio',
  CONTEXT_REQUIRED: 'Serve il contesto',
  READY: 'Pronto',
  NEEDS_CLARIFICATION: 'Serve un chiarimento',
  NEEDS_CONFIRMATION: 'In attesa di conferma',
  EXECUTING: 'In esecuzione',
  COMPLETED: 'Completato',
  DENIED: 'Non consentito',
  FAILED: 'Non riuscito',
  CANCELLED: 'Annullato',
};
