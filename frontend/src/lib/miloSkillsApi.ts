// Client dell'API «Competenze di Milo» (backend/src/routes/milo-skills.ts), solo amministratore:
//   GET  /authz/milo/skills                       competenze rilasciate, versione in uso, proposte
//   GET  /authz/milo/feedback                     giudizi delle persone sulle risposte
//   POST /authz/milo/feedback/:id/dismiss         archivia un giudizio
//   POST /authz/milo/skills/:id/proposals         proposta dal modello ({feedbackIds?}) o a mano
//   POST /authz/milo/versions/:id/approve|reject  decisione
//   POST /authz/milo/skills/:id/restore           torna alle istruzioni rilasciate

import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { AuthzApiError } from './authzPolicyApi';

export interface MiloSkillVersion {
  id: string;
  skillId: string;
  version: number;
  baseVersion: string;
  label: string;
  status: 'proposed' | 'approved' | 'rejected' | 'superseded';
  source: 'model' | 'manual';
  instructions: string[];
  rationale: string | null;
  feedbackIds: string[];
  createdByName: string | null;
  createdAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
}
export interface MiloSkill {
  id: string;
  name: string;
  role: string | null;
  releasedVersion: string | null;
  tools: string[];
  instructions: string[];
  locked: string[];
  approved: MiloSkillVersion | null;
  proposals: MiloSkillVersion[];
  history: MiloSkillVersion[];
}
export interface MiloSkillsResponse {
  runtimeAvailable: boolean;
  skills: MiloSkill[];
}
export interface MiloFeedbackItem {
  id: string;
  rating: 'up' | 'down';
  question: string;
  correction: string | null;
  mode: string | null;
  intent: string | null;
  members: string[];
  tools: string[];
  skillVersions: Record<string, string> | null;
  operatorName: string | null;
  operatorRole: string;
  status: 'open' | 'used' | 'dismissed';
  createdAt: string;
}
export interface MiloFeedbackResponse {
  feedback: MiloFeedbackItem[];
  counts: Array<{ status: string; rating: string; count: number }>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...operatorHeaders() };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new AuthzApiError('Server non raggiungibile', 0, 'network_error');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (payload && typeof payload === 'object' ? payload : {}) as {
      error?: unknown;
      code?: unknown;
      rationale?: unknown;
    };
    const message = typeof body.error === 'string' ? body.error : `Errore ${response.status}`;
    throw new AuthzApiError(
      typeof body.rationale === 'string' && body.rationale
        ? `${message} ${body.rationale}`
        : message,
      response.status,
      typeof body.code === 'string' ? body.code : `http_${response.status}`,
    );
  }
  return payload as T;
}
const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const loadMiloSkills = () => request<MiloSkillsResponse>('/authz/milo/skills');
export const loadMiloFeedback = () =>
  request<MiloFeedbackResponse>('/authz/milo/feedback?status=open');
export const dismissMiloFeedback = (id: string) =>
  post<{ id: string }>(`/authz/milo/feedback/${encodeURIComponent(id)}/dismiss`);
export const proposeFromFeedback = (skillId: string, feedbackIds: string[]) =>
  post<{ proposal: MiloSkillVersion }>(
    `/authz/milo/skills/${encodeURIComponent(skillId)}/proposals`,
    feedbackIds.length ? { feedbackIds } : {},
  );
export const proposeManually = (skillId: string, instructions: string[], rationale: string) =>
  post<{ proposal: MiloSkillVersion }>(
    `/authz/milo/skills/${encodeURIComponent(skillId)}/proposals`,
    { instructions, ...(rationale.trim() ? { rationale: rationale.trim() } : {}) },
  );
export const decideMiloVersion = (id: string, decision: 'approve' | 'reject') =>
  post<{ version: MiloSkillVersion }>(`/authz/milo/versions/${encodeURIComponent(id)}/${decision}`);
export const restoreMiloSkill = (skillId: string) =>
  post<{ restored: boolean }>(`/authz/milo/skills/${encodeURIComponent(skillId)}/restore`);
