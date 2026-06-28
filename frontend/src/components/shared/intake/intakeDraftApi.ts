// Intake draft API client.
//
// The base URL is resolved from config.ts (which reads VITE_API_URL) in Vite
// builds. In Node test environments (import.meta.env is undefined), we fall back
// to localhost — tests mock fetch anyway so the host value doesn't matter for
// assertions, only the path shape.

function resolveApiUrl(): string {
  try {
    // import.meta.env is injected by Vite at build time but is undefined in plain Node.
    const raw = (import.meta as unknown as { env?: { VITE_API_URL?: string; PROD?: boolean } }).env;
    if (!raw) throw new Error('no env');
    const url = raw.VITE_API_URL?.trim();
    const fallback = raw.PROD ? 'https://clinicos-backend-production-df88.up.railway.app' : 'http://localhost:3001';
    return (url ? url : fallback).replace(/\/$/, '');
  } catch {
    return 'http://localhost:3001';
  }
}

const API_URL = resolveApiUrl();

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `confirmDraft failed: ${res.status}`);
  }
  return res.json() as Promise<ConfirmResponse>;
}
