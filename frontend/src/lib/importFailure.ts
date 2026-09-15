const MESSAGES = {
  AI_AUTH:
    'Il servizio di lettura ed estrazione ha rifiutato le credenziali. L’amministratore deve verificare la chiave e la risorsa del servizio. Riprova dopo la verifica.',
  AI_MODEL:
    'Il modello o l’endpoint di lettura non è disponibile. L’amministratore deve verificare il deployment configurato. Riprova dopo la verifica.',
  AI_CONFIG:
    'La configurazione del servizio di lettura richiede una verifica da parte dell’amministratore. Riprova dopo la verifica.',
  AI_INPUT:
    'Il servizio non accetta questo documento o la richiesta di lettura. Verifica formato e dimensioni del file; se il problema persiste, contatta l’amministratore.',
  AI_EMPTY:
    'La lettura non ha restituito testo o dati utilizzabili. Controlla che le foto siano complete e leggibili prima di riprovare.',
  AI_FILES_MISSING: 'I documenti non sono più disponibili sul server. Ricaricali per proseguire.',
  AI_RATE_LIMIT:
    'Il servizio ha raggiunto un limite di richieste o quota. Attendi prima di riprovare; se il problema persiste, contatta l’amministratore.',
  AI_TIMEOUT:
    'La lettura ha superato il tempo disponibile. Puoi riprovare senza ricaricare i documenti.',
  AI_PROVIDER:
    'Il servizio di lettura non è disponibile. Puoi riprovare; se il problema persiste, comunica il riferimento all’amministratore.',
} as const;

/** Supports safe server codes and old deployments without displaying raw provider errors. */
export function importFailureMessage(error: unknown, jobId?: string): string {
  const record =
    error && typeof error === 'object' ? (error as { kind?: unknown; message?: unknown }) : null;
  const text = (
    typeof error === 'string' ? error : typeof record?.message === 'string' ? record.message : ''
  ).slice(0, 16000);
  let code = text.match(/\[(AI_[A-Z_]+)\]/)?.[1] ?? 'AI_PROVIDER';
  if (!Object.hasOwn(MESSAGES, code)) code = 'AI_PROVIDER';
  if (code === 'AI_PROVIDER') {
    const http = text.match(/(?:HTTP|status|auth|code|failed)\s*["':=]*\s*(\d{3})\b/i)?.[1];
    if (
      record?.kind === 'credentials' ||
      /\[credentials\]/.test(text) ||
      http === '401' ||
      http === '403'
    )
      code = 'AI_AUTH';
    else if (http === '404') code = 'AI_MODEL';
    else if (http === '429' || record?.kind === 'rate_limit' || /\[rate_limit\]/.test(text))
      code = 'AI_RATE_LIMIT';
    else if (http === '408' || http === '504' || /timeout/i.test(text)) code = 'AI_TIMEOUT';
    else if (/Documenti non pi[uù].*disponibili/i.test(text)) code = 'AI_FILES_MISSING';
    else if (/\[config\]|not configured|non configurat/i.test(text)) code = 'AI_CONFIG';
  }
  const retained = code === 'AI_FILES_MISSING' ? '' : ' I documenti caricati sono conservati.';
  const reference = jobId && /^[\w-]{1,80}$/.test(jobId) ? ` · Riferimento: ${jobId}` : '';
  return `${MESSAGES[code as keyof typeof MESSAGES]}${retained} Codice: ${code}${reference}`;
}
