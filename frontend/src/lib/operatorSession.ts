// Sessione operatore corrente (singleton a livello di modulo).
//
// Il gate `requireOperator` sul backend (backend/src/ai/auth.ts) legge gli
// header `X-Operator-Id`/`X-Operator-Role`. Questo modulo tiene traccia
// dell'operatore loggato cosi' ogni helper di fetch puo' allegare quegli
// header senza props drilling. Va aggiornato da App.tsx al login/logout.

export interface CurrentOperator {
  id: string;
  role: string;
}

let currentOperator: CurrentOperator | null = null;

export function setCurrentOperator(op: CurrentOperator | null): void {
  currentOperator = op;
}

export function getCurrentOperator(): CurrentOperator | null {
  return currentOperator;
}

// Ogni fetch verso una route dietro `requireOperator` deve allegare questi header,
// altrimenti riceve 401 (vedi il precedente in farmaci.ts). Senza operatore loggato
// non aggiungiamo nulla: meglio un 401 esplicito che una richiesta incompleta.
export function operatorHeaders(): Record<string, string> {
  const op = currentOperator;
  return op ? { 'X-Operator-Id': op.id, 'X-Operator-Role': op.role } : {};
}
