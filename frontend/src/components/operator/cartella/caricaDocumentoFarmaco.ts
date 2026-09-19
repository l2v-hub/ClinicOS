import type { DocumentoFarmaco } from './farmacoDocumento';

export class ErroreCaricamentoDocumento extends Error {}

/** Convert a catalog URL to public product identifiers; no patient context is transmitted. */
export function endpointDocumentoFarmaco(documento: DocumentoFarmaco, apiBase: string): string {
  let source: URL;
  try { source = new URL(documento.href); } catch {
    throw new ErroreCaricamentoDocumento('Il riferimento al documento AIFA non è valido.');
  }
  const path = source.pathname.match(/^\/aifa-bdf-eif-be\/1\.0\.0\/organizzazione\/([1-9]\d{0,8})\/farmaci\/([1-9]\d{0,8})\/stampati$/);
  const tipo = documento.tipo.toUpperCase();
  if (
    source.origin !== 'https://api.aifa.gov.it' || source.username || source.password || source.hash ||
    !path || source.searchParams.size !== 1 || source.searchParams.get('ts') !== tipo
  ) {
    throw new ErroreCaricamentoDocumento('Il riferimento al documento AIFA non è valido.');
  }
  const query = new URLSearchParams({ organizzazione: path[1], farmaco: path[2], tipo });
  return `${apiBase}/farmaci/documento?${query}`;
}

export async function caricaDocumentoFarmaco(
  documento: DocumentoFarmaco,
  apiBase: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const url = endpointDocumentoFarmaco(documento, apiBase);
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: 'omit' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ErroreCaricamentoDocumento('Non è stato possibile caricare il documento. Controlla la connessione e riprova.');
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Il riferimento al documento AIFA non è valido.',
      404: 'Documento non disponibile su AIFA.',
      429: 'Sono stati aperti molti documenti. Attendi un momento e riprova.',
      503: 'Documenti in caricamento. Riprova tra poco.',
      504: 'Il caricamento da AIFA ha superato il tempo disponibile. Riprova.',
    };
    throw new ErroreCaricamentoDocumento(messages[response.status] ?? 'Non è stato possibile recuperare il PDF da AIFA. Riprova tra poco.');
  }
  return new Uint8Array(await response.arrayBuffer());
}
