export const PARTIAL_RESULTS_MESSAGE = 'Risultati parziali: restringi la ricerca.';

interface SpokenAssistantAnswer {
  refusal?: string;
  notFound: boolean;
  truncated?: boolean;
  results: unknown[];
  sources: Array<{ label?: string }>;
}

/** Sintesi vocale bounded: comunica sempre quando la risposta non rappresenta l'intero insieme. */
export function spokenAssistantSummary(read: SpokenAssistantAnswer): string {
  if (read.refusal) return read.refusal;
  if (read.notFound || !read.results.length) return 'Informazione non trovata.';
  const labels = read.sources
    .slice(0, 3)
    .map((source) => source.label)
    .filter(Boolean);
  const count = read.results.length === 1 ? '1 risultato' : `${read.results.length} risultati`;
  const summary = labels.length ? `Trovato ${count}: ${labels.join('; ')}.` : `Trovato ${count}.`;
  return read.truncated ? `${summary} ${PARTIAL_RESULTS_MESSAGE}` : summary;
}
