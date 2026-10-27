import {
  opaqueKey,
  type ConflictDecision,
  type ImportJob,
  type ImportOutcome,
  type ImportResult,
  type ImportSource,
  type ManifestEdit,
} from './importSessionTypes';

export type ImportFetch = (path: string, init?: RequestInit) => Promise<Response>;
export class ImportApiError extends Error {
  status: number;
  code?: string;
  job?: ImportJob;
  constructor(message: string, status: number, code?: string, job?: ImportJob) {
    super(message);
    this.status = status;
    this.code = code;
    this.job = job;
  }
}
export function canStartNewImport(error: unknown) {
  return (
    error instanceof ImportApiError && (error.status === 404 || error.code === 'session_terminal')
  );
}
function supportsSessionJob(value: ImportJob): boolean {
  return (
    typeof value?.id === 'string' &&
    value.id.trim().length > 0 &&
    value.capabilities?.sessionVersion === 1 &&
    value.manifest?.version === 1 &&
    Number.isSafeInteger(value.manifest.revision) &&
    value.manifest.revision >= 0 &&
    Array.isArray(value.manifest.pages) &&
    Array.isArray(value.manifest.groups) &&
    Array.isArray(value.documents) &&
    !!value.limits &&
    typeof value.limits === 'object' &&
    !Array.isArray(value.limits)
  );
}
export function assertSessionJob(value: ImportJob): ImportJob {
  if (!supportsSessionJob(value))
    throw new Error(
      'Il servizio di importazione non supporta ancora questa sessione. Riprova più tardi.',
    );
  if (['expired', 'cancelled', 'confirmed'].includes(value.status))
    throw new ImportApiError(
      value.status === 'expired'
        ? 'La sessione è scaduta. Per una nuova importazione, ricarica i documenti.'
        : value.status === 'cancelled'
          ? 'La sessione è stata eliminata. Per una nuova importazione, ricarica i documenti.'
          : 'Questa importazione è già conclusa. Per importare altri documenti, inizia una nuova sessione.',
      410,
      'session_terminal',
      value.status === 'expired' ? value : undefined,
    );
  return value;
}
export class ImportSessionApi {
  readonly request: ImportFetch;
  readonly base: string;
  constructor(request: ImportFetch, base: string) {
    this.request = request;
    this.base = base;
  }
  async json<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const response = await this.request(`${this.base}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ImportApiError(
        data.error || `Operazione non riuscita (${response.status}).`,
        response.status,
        data.code,
        data.job,
      );
    return data as T;
  }
  async get(id: string) {
    try {
      const value = await this.json<ImportJob>(`/${encodeURIComponent(id)}`);
      return assertSessionJob(value);
    } catch (error) {
      // Missing and inaccessible jobs share a masked 404; it does not prove deletion.
      if (error instanceof ImportApiError && error.status === 404)
        throw new ImportApiError(
          'La sessione non è disponibile. Per una nuova importazione, ricarica i documenti.',
          404,
          'session_unavailable',
        );
      throw error;
    }
  }
  async create(key: string) {
    const data = await this.json<{ job: ImportJob }>(
      '',
      'POST',
      { sessionVersion: 1 },
      { 'Idempotency-Key': key },
    );
    return assertSessionJob(data.job);
  }
  async edit(job: ImportJob, requestId: string, edit: ManifestEdit) {
    return assertSessionJob(
      await this.json<ImportJob>(`/${job.id}/manifest`, 'PUT', {
        requestId,
        expectedRevision: job.manifest.revision,
        ...edit,
      }),
    );
  }
  manifestMutation(job: ImportJob, edit: ManifestEdit) {
    const requestId = opaqueKey();
    return () => this.edit(job, requestId, edit);
  }
  removalMutation(job: ImportJob, pageId: string) {
    const requestId = opaqueKey();
    return () => this.remove(job, pageId, requestId);
  }
  async upload(
    job: ImportJob,
    file: File,
    requestId: string,
    clientFileId: string,
    groupId: string,
    pageId?: string,
  ) {
    const body = new FormData();
    body.append('files', file);
    body.append(
      'metadata',
      JSON.stringify(
        pageId
          ? { requestId, expectedRevision: job.manifest.revision, clientFileId }
          : {
              requestId,
              expectedRevision: job.manifest.revision,
              groupId,
              items: [{ clientFileId }],
            },
      ),
    );
    const data = await this.json<{ job: ImportJob; outcomes: ImportOutcome[] }>(
      `/${job.id}/${pageId ? `pages/${encodeURIComponent(pageId)}/replace` : 'files'}`,
      'POST',
      body,
    );
    assertSessionJob(data.job);
    return data;
  }
  async remove(job: ImportJob, pageId: string, requestId: string) {
    return assertSessionJob(
      await this.json<ImportJob>(`/${job.id}/pages/${encodeURIComponent(pageId)}`, 'DELETE', {
        requestId,
        expectedRevision: job.manifest.revision,
      }),
    );
  }
  async resumeDraft(
    job: ImportJob,
    draft: { id: string; expectedVersion: number },
    requestId: string,
  ) {
    if (
      !supportsSessionJob(job) ||
      job.status !== 'expired' ||
      !draft.id.trim() ||
      job.review?.draftId !== draft.id ||
      !Number.isSafeInteger(draft.expectedVersion) ||
      draft.expectedVersion < 0 ||
      !requestId.trim()
    )
      throw new Error(
        'Impossibile riprendere questa pratica. Ricarica lo stato prima di riprovare.',
      );
    // The caller retains this intent and request ID if a response is lost.
    // Only the server authenticates the operator and authorizes the association.
    const resumed = assertSessionJob(
      await this.json<ImportJob>(`/${encodeURIComponent(job.id)}/reopen`, 'POST', {
        expectedRevision: job.manifest.revision,
        requestId,
        resumeDraft: { id: draft.id, expectedVersion: draft.expectedVersion },
      }),
    );
    if (resumed.id !== job.id || resumed.review?.draftId !== draft.id)
      throw new Error(
        'La risposta non corrisponde alla pratica richiesta. Ricarica prima di riprovare.',
      );
    return resumed;
  }
  async action(job: ImportJob, action: 'process' | 'retry' | 'reopen') {
    return assertSessionJob(
      await this.json<ImportJob>(`/${job.id}/${action}`, 'POST', {
        expectedRevision: job.manifest.revision,
      }),
    );
  }
  async result(id: string) {
    const data = await this.json<{ resultData: ImportResult }>(`/${id}/result`);
    if (!data.resultData?._source || !Array.isArray(data.resultData._conflicts))
      throw new Error('Risultato incompleto: impossibile aprire la revisione.');
    return data.resultData;
  }
  review(id: string, source: ImportSource, decisions: ConflictDecision[]) {
    return this.json<{ job: ImportJob }>(`/${id}/review`, 'PUT', { ...source, decisions });
  }
  async discard(id: string) {
    await this.json(`/${id}/cancel`, 'POST');
  }
}
