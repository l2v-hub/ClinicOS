// Sessione operatore corrente (singleton a livello di modulo).
//
// Il gate `requireOperator` sul backend (backend/src/ai/auth.ts) legge gli
// header `X-Operator-Id`/`X-Operator-Role`. Questo modulo tiene traccia
// dell'operatore loggato cosi' ogni helper di fetch puo' allegare quegli
// header senza props drilling. Va aggiornato da App.tsx al login/logout.

export interface CurrentOperator {
  id: string;
  role: string;
  accessToken?: string;
}

let currentOperator: CurrentOperator | null = null;

export function setCurrentOperator(op: CurrentOperator | null): void {
  currentOperator = op;
}

export function getCurrentOperator(): CurrentOperator | null {
  return currentOperator;
}

// Token del Simulatore ruoli (solo sviluppo): prefisso fisso emesso dal backend.
const SIMULATOR_TOKEN_PREFIX = 'sim.';

/** Sessione del Simulatore ruoli: il token è l'unica credenziale, nessun header X-Operator-*. */
export function isSimulatorSession(): boolean {
  return currentOperator?.accessToken?.startsWith(SIMULATOR_TOKEN_PREFIX) === true;
}

// Ogni fetch verso una route dietro `requireOperator` deve allegare questi header,
// altrimenti riceve 401 (vedi il precedente in farmaci.ts). Senza operatore loggato
// non aggiungiamo nulla: meglio un 401 esplicito che una richiesta incompleta.
// Con il Simulatore ruoli si invia SOLO il Bearer: il ruolo lo decide il server.
export function operatorHeaders(): Record<string, string> {
  const op = currentOperator;
  if (!op) return {};
  if (op.accessToken && isSimulatorSession()) {
    return { Authorization: `Bearer ${op.accessToken}` };
  }
  const headers: Record<string, string> = {
    'X-Operator-Id': op.id,
    'X-Operator-Role': op.role,
  };
  if (op.accessToken) headers.Authorization = `Bearer ${op.accessToken}`;
  return headers;
}

/** Phase 9: sostituisce il token della sessione corrente (rinnovo silenzioso Entra). */
export function updateAccessToken(token: string): void {
  if (currentOperator) currentOperator = { ...currentOperator, accessToken: token };
}
