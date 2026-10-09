/** Classification only: never convert a stored route into a regimen or invent a route. */
export function isTherapyRegimenRoute(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['albisogno', 'prn', 'periodica', 'periodico', 'unatantum'].includes(
      value
        .trim()
        .toLowerCase()
        .replace(/[\s_.-]/g, ''),
    )
  );
}

export const THERAPY_ROUTE_REVIEW_MESSAGE =
  'Via registrata da verificare: contiene un regime terapeutico. Scegli la via di somministrazione e verifica il tipo di terapia; nessun dato viene convertito automaticamente.';
