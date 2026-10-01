// AI Assistant (Phase 4) — HTTP client of the backend Skill layer (`/skills/*`).
// The same identity (operatorHeaders: Role Simulator bearer or Entra), role and policy as the
// classic GUI: no parallel permission system. The backend decides every action.

import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';

export interface AssistantResident {
  id: string;
  label: string;
}

export interface AssistantSkillView {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: 'read' | 'write' | 'action';
  confirmationClass: 'READ' | 'LOW_RISK_WRITE' | 'SENSITIVE_WRITE' | 'HIGH_RISK';
  available: boolean;
  partial: boolean;
  missingRequired: string[];
  classicScreen: ClassicScreen | null;
}

export interface ClassicScreen {
  screen: string;
  label: string;
  needsResident?: boolean;
  patientId?: string;
}

export interface AssistantSession {
  identity: { id: string; name: string };
  role: { id: string; label: string };
  residentScope: string;
  confirmationPolicyVersion: number;
  resident: AssistantResident | null;
  residentDenied: boolean;
  skills: AssistantSkillView[];
  starters: { skillId: string; label: string }[];
}

export interface AssistantPreview {
  previewId: string;
  skillId: string;
  action: string;
  patient: AssistantResident | null;
  values: Record<string, string>;
  notes: string[];
  warnings: string[];
  origin: 'ai';
  tool: string;
  confirmationClass: AssistantSkillView['confirmationClass'];
  actor: { name: string; role: string };
  confirmable: boolean;
  blockedReason?: string;
  editable: Array<'values' | 'text' | 'priority'>;
  /** Prescription: the values shown are the exact therapy payload that will be written. */
  therapyBound?: boolean;
  therapyDraft?: { preview: Record<string, unknown>; entryDateTime: string };
}

export type WorkflowStatus =
  | 'START'
  | 'CONTEXT_REQUIRED'
  | 'READY'
  | 'NEEDS_CLARIFICATION'
  | 'NEEDS_CONFIRMATION'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'DENIED'
  | 'FAILED'
  | 'CANCELLED';

export interface ConverseResponse {
  workflowId: string | null;
  status: WorkflowStatus;
  skillId: string | null;
  reply: string;
  pending?: string | null;
  candidates?: AssistantResident[];
  preview?: AssistantPreview | null;
  result?: Record<string, unknown> | null;
  error?: { code: string; message: string } | null;
  interpreter?: 'agno' | 'deterministic';
  resident?: AssistantResident | null;
  classicScreen?: ClassicScreen;
  editable?: { values?: Record<string, string>; text?: string; priority?: string } | null;
  suggestions?: { id: string; name: string }[];
}

export interface ConverseRequest {
  message?: string;
  workflowId?: string;
  action?: 'confirm' | 'cancel' | 'retry' | 'modify' | 'edit';
  previewId?: string;
  edit?: { values?: Record<string, string>; text?: string; priority?: string };
  payload?: { therapy?: Record<string, unknown> };
  context: { currentPatientId: string | null };
  /** Phase 5: the message is a reviewed voice transcript (audit traceability only). */
  inputChannel?: 'text' | 'voice';
}

export class AssistantHttpError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders(), ...init.headers },
    });
  } catch {
    throw new AssistantHttpError(0, 'Servizio non raggiungibile: controlla la connessione.');
  }
  const body = (await response.json().catch(() => null)) as
    (T & { error?: string; code?: string }) | null;
  if (!response.ok) {
    throw new AssistantHttpError(
      response.status,
      (body && typeof body.error === 'string' && body.error) ||
        (response.status === 401
          ? 'Sessione scaduta: accedi di nuovo.'
          : `Errore del servizio (${response.status}).`),
      body?.code,
    );
  }
  return body as T;
}

export function loadAssistantSession(residentId: string | null): Promise<AssistantSession> {
  const query = residentId ? `?residentId=${encodeURIComponent(residentId)}` : '';
  return request<AssistantSession>(`/skills/session${query}`);
}

export function selectResident(residentId: string): Promise<{ resident: AssistantResident }> {
  return request(`/skills/context`, { method: 'POST', body: JSON.stringify({ residentId }) });
}

export function searchResidents(q: string): Promise<{ residents: AssistantResident[] }> {
  return request(`/skills/residents?q=${encodeURIComponent(q)}`);
}

export function converse(body: ConverseRequest): Promise<ConverseResponse> {
  return request<ConverseResponse>(`/skills/converse`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Phase 6 (result integrity): after a confirmation without an answer, ask the server what really
 * happened to the workflow. Returns a converse-like answer, or null when the state is unknown.
 */
export async function reconcileWorkflow(workflowId: string): Promise<ConverseResponse | null> {
  try {
    const { workflow } = await request<{
      workflow: {
        id: string;
        status: WorkflowStatus;
        skillId: string;
        preview: AssistantPreview | null;
        result: Record<string, unknown> | null;
        error: { code: string; message: string } | null;
      };
    }>(`/skills/workflows/${encodeURIComponent(workflowId)}`);
    const base = { workflowId: workflow.id, skillId: workflow.skillId, status: workflow.status };
    switch (workflow.status) {
      case 'COMPLETED':
        return {
          ...base,
          result: workflow.result,
          reply: 'Esito verificato dopo un problema di rete: operazione completata dal sistema.',
        };
      case 'FAILED':
      case 'DENIED':
        return {
          ...base,
          error: workflow.error,
          reply: `Esito verificato: operazione NON eseguita (${workflow.error?.message ?? 'errore'}).`,
        };
      case 'NEEDS_CONFIRMATION':
        return {
          ...base,
          preview: workflow.preview,
          reply:
            'La conferma non è arrivata al sistema: nessuna registrazione eseguita. Puoi confermare di nuovo.',
        };
      default:
        // EXECUTING or anything else: not verifiable yet → caller shows «esito non verificato».
        return null;
    }
  } catch {
    return null;
  }
}

// ── Phase 7: proactive intelligence (Attention Inbox, ack/seen, shift briefing) ───────────────

export type SignalAction =
  | { kind: 'skill'; skillId: string; label: string; starter: string; residentId: string | null }
  | { kind: 'resume_workflow'; workflowId: string; label: string; residentId: string | null }
  | { kind: 'classic'; screen: string; label: string };

export interface ProactiveSignal {
  signalId: string;
  rev: string;
  type: string;
  eventType: string;
  priority: 'normale' | 'alta' | 'urgente';
  priorityRule: string;
  title: string;
  detail: string | null;
  residentId: string | null;
  residentLabel: string | null;
  occurredAt: string;
  origin: string;
  reason: string;
  count: number;
  sourceEventIds: string[];
  status: 'nuovo' | 'visto' | 'preso_visione';
  changedSinceLastView: boolean;
  action: SignalAction | null;
}

export interface ProactiveInbox {
  generatedAt: string;
  since: string;
  watermark: string | null;
  signals: ProactiveSignal[];
  counts: { total: number; toSee: number; new: number; changed: number };
  /** Event sources that failed this time: the list may be incomplete. */
  degraded?: string[];
}

export interface ShiftBriefing {
  period: { from: string; to: string; shift: string; previousShift: string };
  facts: ProactiveSignal[];
  byResident: { residentId: string | null; residentLabel: string; signalIds: string[] }[];
  summary: { text: string; composed: boolean; citedSignalIds: string[] };
  fallback: string;
  metrics?: { aiSkipped?: 'same_facts' | 'cooldown' | null };
}

/** `poll` = automatic refresh of an already-open panel (no new «shown» audit row). */
export function loadProactiveInbox(poll = false): Promise<ProactiveInbox> {
  return request<ProactiveInbox>(`/skills/proactive/inbox${poll ? '?view=poll' : ''}`);
}

export function loadProactiveCount(): Promise<{ counts: ProactiveInbox['counts'] }> {
  return request('/skills/proactive/inbox?view=count');
}

export function acknowledgeSignals(
  acks: { signalId: string; rev: string }[],
): Promise<{ acknowledged: string[]; ignored: string[] }> {
  return request('/skills/proactive/ack', { method: 'POST', body: JSON.stringify({ acks }) });
}

export function markSignalsSeen(): Promise<{ watermark: string }> {
  return request('/skills/proactive/seen', { method: 'POST', body: '{}' });
}

/** Records the opening and returns the SERVER-side action of the signal (never trusted from UI). */
export function openSignal(signalId: string): Promise<{ action: SignalAction }> {
  return request('/skills/proactive/open', { method: 'POST', body: JSON.stringify({ signalId }) });
}

export function loadShiftBriefing(): Promise<ShiftBriefing> {
  return request<ShiftBriefing>('/skills/proactive/briefing');
}

/** Reopens one of MY workflows awaiting confirmation: the preview is shown again, nothing runs. */
export async function resumeWorkflow(workflowId: string): Promise<ConverseResponse | null> {
  const { workflow } = await request<{
    workflow: {
      id: string;
      status: WorkflowStatus;
      skillId: string;
      preview: AssistantPreview | null;
      slots?: { patient?: { id: string; label: string } | null };
    };
  }>(`/skills/workflows/${encodeURIComponent(workflowId)}`);
  if (workflow.status !== 'NEEDS_CONFIRMATION' || !workflow.preview) return null;
  const patient = workflow.slots?.patient ?? null;
  return {
    workflowId: workflow.id,
    skillId: workflow.skillId,
    status: workflow.status,
    preview: workflow.preview,
    resident: patient ? { id: patient.id, label: patient.label } : null,
    reply: 'Anteprima riaperta: controlla i dati e premi «Conferma» solo se sono corretti.',
  };
}
