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
