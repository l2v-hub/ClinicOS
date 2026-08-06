// Intake draft API client.

import { API_URL } from '../../../config';

export interface DraftResponse {
  id: string;
  data: Record<string, unknown>;
}

export interface ConfirmResponse {
  status: string;
  patient?: { id: string };
  duplicate?: unknown;
}

interface OperatorHeaders {
  operatorId?: string;
  operatorRole?: string;
}

function buildHeaders(op?: OperatorHeaders): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (op?.operatorId) headers['X-Operator-Id'] = op.operatorId;
  if (op?.operatorRole) headers['X-Operator-Role'] = op.operatorRole;
  return headers;
}

export async function createDraft(
  source: 'manual' | 'import' = 'manual',
  op?: OperatorHeaders,
): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts`, {
    method: 'POST',
    headers: buildHeaders(op),
    body: JSON.stringify({ source }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `createDraft failed: ${res.status}`);
  }
  return res.json() as Promise<DraftResponse>;
}

export async function patchDraft(
  id: string,
  patch: Record<string, unknown>,
  op?: OperatorHeaders,
): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(op),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `patchDraft failed: ${res.status}`);
  }
  return res.json() as Promise<DraftResponse>;
}

export async function getDraft(id: string, op?: OperatorHeaders): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/${id}`, {
    method: 'GET',
    headers: buildHeaders(op),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `getDraft failed: ${res.status}`);
  }
  return res.json() as Promise<DraftResponse>;
}

export async function createDraftFromImport(
  importJobId: string,
  op?: OperatorHeaders,
): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/from-import`, {
    method: 'POST',
    headers: buildHeaders(op),
    body: JSON.stringify({ importJobId }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error ?? `import draft failed: ${res.status}`);
  }
  return res.json() as Promise<DraftResponse>;
}

export async function confirmDraft(
  id: string,
  payload: object,
  op?: OperatorHeaders,
): Promise<ConfirmResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/${id}/confirm`, {
    method: 'POST',
    headers: buildHeaders(op),
    body: JSON.stringify(payload),
  });
  // 409 = duplicate patient: return the body so the caller handles the duplicate flow
  // explicitly (status === 'duplicate') instead of relying on string-matching a thrown error.
  if (res.status === 409) {
    return res.json() as Promise<ConfirmResponse>;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `confirmDraft failed: ${res.status}`);
  }
  return res.json() as Promise<ConfirmResponse>;
}
