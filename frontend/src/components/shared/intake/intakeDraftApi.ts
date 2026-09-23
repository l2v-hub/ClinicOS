// Intake draft API client.

import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import type { ImportSource } from '../import/importSessionTypes';

export function editableDraftPatch(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key]) =>
        ![
          '_narrative',
          '_sections',
          '_terapiaText',
          '_confirmation',
          '_importedFields',
          '_importSource',
          '_importProposals',
          '_importReview',
        ].includes(key),
    ),
  );
}

export interface DraftResponse {
  id: string;
  data: Record<string, unknown>;
  status?: string;
  confirmedPatientId?: string | null;
  version?: number;
}

export interface ConfirmResponse {
  status: string;
  patient?: { id: string };
  duplicate?: unknown;
  code?: string;
  error?: string;
}

interface OperatorHeaders {
  operatorId?: string;
  operatorRole?: string;
}

export class DraftApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function buildHeaders(op?: OperatorHeaders): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...operatorHeaders(),
  };
  if (op?.operatorId && !headers['X-Operator-Id']) headers['X-Operator-Id'] = op.operatorId;
  if (op?.operatorRole && !headers['X-Operator-Role']) headers['X-Operator-Role'] = op.operatorRole;
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
  expectedDraftVersion?: number,
): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(op),
    body: JSON.stringify({
      ...patch,
      ...(expectedDraftVersion === undefined ? {} : { expectedDraftVersion }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new DraftApiError(
      (err as { error?: string }).error ?? `patchDraft failed: ${res.status}`,
      res.status,
      (err as { code?: string }).code,
    );
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
  source?: ImportSource,
): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/from-import`, {
    method: 'POST',
    headers: buildHeaders(op),
    body: JSON.stringify({ importJobId, ...source }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error ?? `import draft failed: ${res.status}`);
  }
  return res.json() as Promise<DraftResponse>;
}

async function draftMutation(
  id: string,
  path: string,
  body: object,
  op?: OperatorHeaders,
): Promise<DraftResponse> {
  const res = await fetch(`${API_URL}/intake/drafts/${encodeURIComponent(id)}/${path}`, {
    method: 'POST',
    headers: buildHeaders(op),
    body: JSON.stringify(body),
  });
  const value = await res.json();
  if (!res.ok)
    throw new DraftApiError(
      value.error ?? 'La bozza è cambiata. Le modifiche sono conservate; riapri e riprova.',
      res.status,
      value.code,
    );
  return value as DraftResponse;
}
export function refreshImportDraft(
  id: string,
  body: ImportSource & { requestId: string; expectedDraftVersion?: number },
  op?: OperatorHeaders,
) {
  return draftMutation(id, 'refresh-import', body, op);
}
export function decideImportProposal(
  id: string,
  proposalId: string,
  body: {
    requestId: string;
    expectedDraftVersion?: number;
    action: 'add' | 'defer';
  },
  op?: OperatorHeaders,
) {
  return draftMutation(id, `import-proposals/${encodeURIComponent(proposalId)}/decide`, body, op);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
/** Recover a lost CAS response only when the exact next version contains every intended field. */
export async function patchDraftWithRecovery(
  id: string,
  patch: Record<string, unknown>,
  op?: OperatorHeaders,
  expectedVersion?: number,
) {
  // Compare the actual JSON payload: optional undefined fields are omitted on the wire.
  const intended = JSON.parse(JSON.stringify(patch)) as Record<string, unknown>;
  try {
    const saved = await patchDraft(id, intended, op, expectedVersion);
    if (
      expectedVersion !== undefined &&
      (saved.version !== expectedVersion + 1 ||
        !Object.entries(intended).every(
          ([key, value]) => canonical(saved.data[key]) === canonical(value),
        ))
    )
      throw new DraftApiError(
        'La bozza è cambiata in un’altra sessione. Le modifiche sono conservate; ricarica prima di salvarne altre.',
        409,
        'draft_version_conflict',
      );
    return saved;
  } catch (error) {
    if (expectedVersion === undefined) throw error;
    const saved = await getDraft(id, op).catch(() => null);
    if (
      saved?.version === expectedVersion + 1 &&
      Object.entries(intended).every(
        ([key, value]) => canonical(saved.data[key]) === canonical(value),
      )
    )
      return saved;
    throw error;
  }
}

/** Reconcile a lost earlier write before a newer snapshot can advance its CAS version. */
export class VersionedDraftSaveQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pending: { patch: Record<string, unknown>; version?: number } | null = null;
  private id: string;
  private op?: OperatorHeaders;
  public version: number | undefined;

  constructor(id: string, version: number | undefined, op?: OperatorHeaders) {
    this.id = id;
    this.version = version;
    this.op = op;
  }

  private async sendPending() {
    const pending = this.pending!;
    try {
      const saved = await patchDraftWithRecovery(this.id, pending.patch, this.op, pending.version);
      this.version = saved.version;
      this.pending = null;
      return saved;
    } catch (error) {
      // A definitive validation/authorization rejection has no uncertain write to replay.
      if (error instanceof DraftApiError && error.status < 500 && error.status !== 409)
        this.pending = null;
      throw error;
    }
  }

  save(data: Record<string, unknown>): Promise<DraftResponse> {
    const patch = structuredClone(editableDraftPatch(data));
    const saving = this.tail
      .catch(() => undefined)
      .then(async () => {
        if (this.pending) {
          const same = canonical(this.pending.patch) === canonical(patch);
          const recovered = await this.sendPending();
          if (same) return recovered;
        }
        this.pending = { patch, version: this.version };
        return this.sendPending();
      });
    this.tail = saving;
    return saving;
  }
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

/** A lost response may follow a committed confirmation, so a retry's autosave can
 * correctly be refused. Recover by reading the original draft, never by creating one. */
export async function confirmPersistedDraft(
  id: string,
  payload: object,
  persist: () => Promise<unknown>,
  op?: OperatorHeaders,
): Promise<ConfirmResponse> {
  try {
    await persist();
    return await confirmDraft(id, payload, op);
  } catch (error) {
    const saved = await getDraft(id, op).catch(() => null);
    if (saved?.status === 'confirmed' && saved.confirmedPatientId)
      return { status: 'idempotent', patient: { id: saved.confirmedPatientId } };
    throw error;
  }
}
