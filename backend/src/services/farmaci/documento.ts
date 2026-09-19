// Only public AIFA product identifiers reach the upstream; never a caller-supplied URL.
export interface RiferimentoDocumentoAifa {
  organizzazione: string;
  farmaco: string;
  tipo: 'RCP' | 'FI';
}

export class ErroreDocumentoAifa extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function riferimentoDocumentoAifa(input: Record<string, unknown>): RiferimentoDocumentoAifa {
  const { organizzazione, farmaco, tipo } = input;
  if (
    Object.keys(input).some((key) => !['organizzazione', 'farmaco', 'tipo'].includes(key)) ||
    typeof organizzazione !== 'string' || !/^[1-9]\d{0,8}$/.test(organizzazione) ||
    typeof farmaco !== 'string' || !/^[1-9]\d{0,8}$/.test(farmaco) ||
    (tipo !== 'RCP' && tipo !== 'FI')
  ) {
    throw new ErroreDocumentoAifa(400, 'Riferimento al documento AIFA non valido.');
  }
  return { organizzazione, farmaco, tipo };
}

interface OpzioniLettore {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  maxConcurrent?: number;
}

export function creaLettoreDocumentoAifa({
  fetchImpl = fetch,
  timeoutMs = 20_000,
  maxBytes = 20 * 1024 * 1024,
  maxConcurrent = 4,
}: OpzioniLettore = {}) {
  let attivi = 0;
  return async (input: RiferimentoDocumentoAifa, signal?: AbortSignal): Promise<Buffer> => {
    const ref = riferimentoDocumentoAifa({ ...input });
    if (attivi >= maxConcurrent) {
      throw new ErroreDocumentoAifa(503, 'Documenti in caricamento. Riprova tra poco.');
    }
    attivi++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const url = `https://api.aifa.gov.it/aifa-bdf-eif-be/1.0.0/organizzazione/${ref.organizzazione}/farmaci/${ref.farmaco}/stampati?ts=${ref.tipo}`;
      const response = await fetchImpl(url, {
        signal: combined,
        redirect: 'error',
        credentials: 'omit',
        headers: { Accept: 'application/pdf, application/octet-stream' },
      });
      if (!response.ok || !response.body) {
        throw new ErroreDocumentoAifa(
          response.status === 404 ? 404 : 502,
          response.status === 404 ? 'Documento non disponibile su AIFA.' : 'AIFA non ha restituito il documento. Riprova tra poco.',
        );
      }
      if (Number(response.headers.get('content-length')) > maxBytes) {
        throw new ErroreDocumentoAifa(502, 'Il documento supera la dimensione consentita.');
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          throw new ErroreDocumentoAifa(502, 'Il documento supera la dimensione consentita.');
        }
        chunks.push(value);
      }
      const data = Buffer.concat(chunks, size);
      if (data.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new ErroreDocumentoAifa(502, 'AIFA non ha restituito un PDF valido. Riprova tra poco.');
      }
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ErroreDocumentoAifa) throw error;
      throw new ErroreDocumentoAifa(
        controller.signal.aborted ? 504 : 502,
        controller.signal.aborted
          ? 'Il caricamento da AIFA ha superato il tempo disponibile. Riprova.'
          : 'Non è stato possibile recuperare il documento da AIFA. Riprova.',
      );
    } finally {
      clearTimeout(timeout);
      controller.abort();
      attivi--;
    }
  };
}
