import type {
  AssessmentDto,
  AssessmentFailure,
  AssessmentOperation,
  AssessmentWriteResult,
} from './assessmentTypes';
import { assertAssessment, assessmentPage, validAssessmentId } from './assessmentValidation';
export class AssessmentApiError extends Error {
  failure: AssessmentFailure;
  constructor(failure: AssessmentFailure) {
    super(failure.message);
    this.failure = failure;
  }
}
const messages: Record<string, string> = {
  assessment_invalid_input: 'Verifica le risposte e la data della valutazione.',
  assessment_invalid_cursor: 'Lo storico è cambiato. Ricaricalo.',
  assessment_not_found: 'Valutazione non disponibile nel tuo perimetro.',
  assessment_request_conflict: 'Richiesta già usata per dati diversi. I tuoi dati sono conservati.',
  assessment_version_conflict:
    'La bozza è stata aggiornata altrove. Verifica la versione salvata prima di proseguire.',
  assessment_finalized:
    'La valutazione è già finale. Verifica la versione salvata; per correggerla crea una rettifica.',
  assessment_already_corrected:
    'Questa valutazione ha già una rettifica finale. Verifica lo storico.',
  assessment_incomplete: 'Completa tutte le cinque risposte prima di finalizzare.',
  scope_unavailable: 'Il perimetro di accesso non è verificabile. I dati restano conservati.',
};
const uncertain = (): AssessmentFailure => ({
  code: 'unverified',
  uncertain: true,
  message: 'Esito non verificato. I dati sono conservati: verifica o riprova la stessa richiesta.',
});
export function createAssessmentClient(
  apiUrl: string,
  headers: HeadersInit,
  fetcher: typeof fetch = fetch,
) {
  const authHeaders = new Headers(headers);
  function base(patientId: string) {
    if (!validAssessmentId(patientId)) throw new Error('Paziente non valido.');
    return `${apiUrl}/patients/${encodeURIComponent(patientId)}/assessments`;
  }
  async function request(url: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
    const requestHeaders = new Headers(authHeaders);
    if (body) requestHeaders.set('Content-Type', 'application/json');
    const deadline = AbortSignal.timeout(30_000);
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
      const response = await fetcher(url, {
        method,
        headers: requestHeaders,
        cache: 'no-store',
        signal: requestSignal,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const value = await response.json();
      if (!response.ok) {
        const code = typeof value?.code === 'string' ? value.code : 'unverified';
        throw new AssessmentApiError({
          code,
          uncertain: response.status >= 500 || !messages[code],
          message: messages[code] ?? uncertain().message,
        });
      }
      return value;
    } catch (error) {
      if (error instanceof AssessmentApiError) throw error;
      throw new AssessmentApiError(uncertain());
    }
  }
  const client = {
    async get(patientId: string, id: string, signal?: AbortSignal): Promise<AssessmentDto> {
      if (!validAssessmentId(id)) throw new Error('Valutazione non valida.');
      const value = await request(
        `${base(patientId)}/${encodeURIComponent(id)}`,
        'GET',
        undefined,
        signal,
      );
      assertAssessment(value?.assessment, patientId, id);
      return value.assessment;
    },
    async page(
      patientId: string,
      filters: {
        status?: 'all' | 'draft' | 'final';
        from?: string;
        to?: string;
        cursor?: string;
      } = {},
      signal?: AbortSignal,
    ) {
      const query = new URLSearchParams({
        type: 'painad',
        limit: '25',
        status: filters.status ?? 'all',
      });
      if (filters.from) query.set('from', filters.from);
      if (filters.to) query.set('to', filters.to);
      if (filters.cursor) query.set('cursor', filters.cursor);
      return assessmentPage(
        await request(`${base(patientId)}?${query}`, 'GET', undefined, signal),
        patientId,
      );
    },
    async write(patientId: string, operation: AssessmentOperation): Promise<AssessmentWriteResult> {
      try {
        const suffix =
          operation.kind === 'create'
            ? ''
            : `/${encodeURIComponent(operation.id)}${operation.kind === 'finalize' ? '/finalize' : ''}`;
        const value = await request(
          `${base(patientId)}${suffix}`,
          operation.kind === 'patch' ? 'PATCH' : 'POST',
          operation.body,
        );
        assertAssessment(
          value?.assessment,
          patientId,
          operation.kind === 'create' ? undefined : operation.id,
        );
        if (
          operation.kind !== 'patch' &&
          (value.requestId !== operation.body.requestId || typeof value.replayed !== 'boolean')
        )
          throw new Error('Ricevuta non verificata.');
        if (operation.kind === 'finalize' && value.assessment.status !== 'final')
          throw new Error('Finalizzazione non verificata.');
        return { kind: 'saved', assessment: value.assessment };
      } catch (error) {
        return {
          kind: 'failed',
          failure: error instanceof AssessmentApiError ? error.failure : uncertain(),
        };
      }
    },
    async retryPdf(patientId: string, id: string): Promise<AssessmentDto> {
      if (!validAssessmentId(id)) throw new Error('Valutazione non valida.');
      const value = await request(
        `${base(patientId)}/${encodeURIComponent(id)}/pdf/retry`,
        'POST',
        {},
      );
      assertAssessment(value?.assessment, patientId, id);
      if (value.assessment.status !== 'final') throw new Error('Finale non verificato.');
      return value.assessment;
    },
  };
  return client;
}
export type AssessmentClient = ReturnType<typeof createAssessmentClient>;
