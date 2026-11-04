# Complete unchanged frontend authentication modules

Whole unchanged source dependencies at 6872ad02b78a9cfd147a4a9cb78f335e8d9f177f; source hashes are verified, no excerpt is represented as a full module. Changed modules are supplied in full before/after by the native reviewer.

## frontend/src/components/Login.tsx

SHA256 9e74ff73276aa7b4ad4c5b55101c6ec9711512209c0d5a86776731be352c1783

```text
import { useEffect, useState } from 'react';
import type { SimulatorIdentity, UtenteApp } from '../types';
import { UTENTE_ADMIN, UTENTE_OPERATORE } from '../mockData';
import { IcoAdmin, IcoUser } from '../icons';
import { API_URL } from '../config';
import type { AuthAvailability, AuthStatus } from '../lib/authAvailability';
import './Login.css';

interface LoginProps {
  availability: AuthAvailability;
  authMode: AuthStatus['mode'] | null;
  onRetryAuth: () => void;
  onLogin: (utente: UtenteApp) => void;
  demoMode?: boolean;
  loading?: boolean;
  error?: string | null;
  /** Simulatore ruoli attivo (GET /auth/status → simulator): mostra i profili del server. */
  simulator?: boolean;
  onSimulatorLogin?: (identity: SimulatorIdentity) => void;
}

type SimulatorList =
  | { state: 'loading' }
  | { state: 'ready'; identities: SimulatorIdentity[] }
  | { state: 'error'; message: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
}

function SimulatorPicker({
  loading,
  onPick,
}: {
  loading: boolean;
  onPick: (identity: SimulatorIdentity) => void;
}) {
  const [list, setList] = useState<SimulatorList>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/auth/simulator/identities`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('simulator_unavailable');
        return (await response.json()) as { identities?: SimulatorIdentity[] };
      })
      .then((payload) => setList({ state: 'ready', identities: payload.identities ?? [] }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setList({ state: 'error', message: 'Profili del simulatore non disponibili' });
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="login-sim" aria-labelledby="login-sim-title">
      <div className="login-sim__banner" role="note">
        <strong id="login-sim-title">Simulatore ruoli — solo sviluppo</strong>
        <span>
          Profili simulati definiti dal server. Il ruolo e i permessi li decide il server.
        </span>
      </div>

      {list.state === 'loading' && <p className="login-note">Caricamento profili…</p>}
      {list.state === 'error' && (
        <p className="login-error" role="alert">
          {list.message}{' '}
          <button
            type="button"
            className="login-sim__retry"
            onClick={() => {
              setList({ state: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            Riprova
          </button>
        </p>
      )}
      {list.state === 'ready' && (
        <ul className="login-sim__list">
          {list.identities.map((identity) => (
            <li key={identity.id}>
              <button
                type="button"
                className="login-sim__item"
                onClick={() => onPick(identity)}
                disabled={loading}
              >
                <span className="login-sim__avatar" aria-hidden="true">
                  {initials(identity.name)}
                </span>
                <span className="login-sim__text">
                  <span className="login-sim__name">{identity.name}</span>
                  <span className="login-sim__role">{identity.roleLabel}</span>
                  {identity.roleDescription && (
                    <span className="login-sim__desc">{identity.roleDescription}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Login({
  availability,
  authMode,
  onRetryAuth,
  onLogin,
  demoMode = false,
  loading = false,
  error,
  simulator = false,
  onSimulatorLogin,
}: LoginProps) {
  const accessReady = availability === 'ready';
  const showSimulator = accessReady && simulator && onSimulatorLogin != null;
  const availabilityMessage = {
    checking: { title: 'Verifica accesso…', detail: 'Controllo della disponibilità dei profili.' },
    expired: {
      title: 'Accesso demo scaduto',
      detail:
        'La finestra di accesso dimostrativo è terminata. L’amministratore deve rinnovarla sul servizio demo.',
    },
    disabled: {
      title: 'Accesso non disponibile',
      detail:
        'Il servizio di autenticazione non è abilitato. Contatta l’amministratore della struttura.',
    },
    unavailable: {
      title: 'Verifica accesso non riuscita',
      detail: 'Non è stato possibile verificare il servizio di autenticazione. Riprova tra poco.',
    },
  };
  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">
          <div className="login-brand-icon">✚</div>
          <h1 className="login-brand-name">ClinicOS</h1>
          <p className="login-brand-sub">Sistema di Gestione Clinica</p>
        </div>

        {accessReady && demoMode && (
          <div className="login-demo-warning" role="status">
            <strong>Modalità demo temporanea</strong>
            <span>
              Usa esclusivamente dati sintetici. Le azioni vengono salvate nel database demo.
            </span>
          </div>
        )}

        {!accessReady ? (
          <section
            className="login-availability"
            aria-live="polite"
            aria-busy={availability === 'checking'}
          >
            <h2>{availabilityMessage[availability].title}</h2>
            <p>{availabilityMessage[availability].detail}</p>
            {availability !== 'checking' && (
              <button
                className="btn-secondary"
                type="button"
                onClick={onRetryAuth}
                disabled={loading}
              >
                Ricontrolla accesso
              </button>
            )}
          </section>
        ) : showSimulator ? (
          <>
            <p className="login-prompt">Scegli il profilo con cui accedere</p>
            <SimulatorPicker loading={loading} onPick={onSimulatorLogin} />
          </>
        ) : (
          <>
            <p className="login-prompt">Seleziona il tuo profilo per accedere</p>

            <div className="login-role-grid">
              <button
                className="login-role-card login-role-card--admin"
                onClick={() => onLogin(UTENTE_ADMIN)}
                disabled={loading}
              >
                <span className="login-role-icon">
                  <IcoAdmin />
                </span>
                <span className="login-role-title">Amministratore</span>
                <span className="login-role-desc">
                  Gestione operatori, agenda globale e supervisione
                </span>
              </button>

              <button
                className="login-role-card login-role-card--operatore"
                onClick={() => onLogin(UTENTE_OPERATORE)}
                disabled={loading}
              >
                <span className="login-role-icon">
                  <IcoUser />
                </span>
                <span className="login-role-title">Operatore</span>
                <span className="login-role-desc">
                  Pazienti, consegne, agenda e cartelle cliniche
                </span>
              </button>
            </div>
          </>
        )}

        {accessReady && error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <p className="login-note">
          {!accessReady
            ? 'Nessun accesso effettuato'
            : loading
              ? 'Verifica accesso…'
              : showSimulator
                ? 'Simulatore ruoli — nessuna credenziale reale'
                : authMode === 'entra'
                  ? 'Accesso con account della struttura'
                  : 'Accesso dimostrativo — nessuna credenziale richiesta'}
        </p>
      </div>
    </div>
  );
}

```

## frontend/src/lib/authAvailability.ts

SHA256 176da8946bc947cffbc1b92361747365e4fc43c840fcb16d6bd7293b996cc6f6

```text
export interface AuthStatus {
  mode: 'entra' | 'demo' | 'disabled';
  temporaryDemo: boolean;
  simulator: boolean;
  syntheticOnly: boolean;
  expiresAt: string | null;
}

export type AuthCheckState = 'checking' | 'available' | 'unavailable';
export type AuthAvailability = 'checking' | 'unavailable' | 'expired' | 'disabled' | 'ready';

/** Status is public configuration, never an identity or an authorization grant. */
export function parseAuthStatus(payload: unknown): AuthStatus {
  const invalid = () => {
    throw new Error('auth_status_invalid');
  };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return invalid();
  const value = payload as Record<string, unknown>;
  if (value.mode !== 'entra' && value.mode !== 'demo' && value.mode !== 'disabled')
    return invalid();
  if (typeof value.temporaryDemo !== 'boolean') return invalid();
  if (value.simulator !== undefined && typeof value.simulator !== 'boolean') return invalid();
  if (value.syntheticOnly !== undefined && typeof value.syntheticOnly !== 'boolean')
    return invalid();
  // Expiry is optional explanatory metadata, not an authentication gate.
  // A stale demo variable must not override an enabled Entra/demo server mode.
  // Unusable metadata cannot prove expiration of an already-disabled service.
  const expiresAt =
    typeof value.expiresAt === 'string' &&
    value.expiresAt.length <= 50 &&
    Number.isFinite(Date.parse(value.expiresAt))
      ? value.expiresAt
      : null;
  if (value.mode !== 'demo' && (value.simulator === true || value.temporaryDemo)) return invalid();
  return {
    mode: value.mode,
    temporaryDemo: value.temporaryDemo,
    simulator: value.simulator === true,
    syntheticOnly: value.syntheticOnly === true,
    expiresAt,
  };
}

export function canStartLogin(check: AuthCheckState, status: AuthStatus | null): boolean {
  return check === 'available' && (status?.mode === 'demo' || status?.mode === 'entra');
}

export function authAvailability(
  check: AuthCheckState,
  status: AuthStatus | null,
  now = Date.now(),
): AuthAvailability {
  if (check !== 'available') return check;
  if (!status) return 'unavailable';
  if (status.mode !== 'disabled') return 'ready';
  // The server mode alone denies access. Browser time only chooses explanatory copy;
  // it must never enable/disable a server-authorized demo or replace /auth/me.
  return status.syntheticOnly && status.expiresAt !== null && Date.parse(status.expiresAt) <= now
    ? 'expired'
    : 'disabled';
}

```

## frontend/src/lib/operatorSession.ts

SHA256 5c246d1eea6d26d6fbfc26b469112e8fc77366ed9ca41a76834909a1ea7a3d36

```text
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
let operatorSessionEpoch = 0;

/** Changes on every login/logout/operator switch, even for the same identity. */
export function getOperatorSessionEpoch(): number {
  return operatorSessionEpoch;
}

export function setCurrentOperator(op: CurrentOperator | null): void {
  operatorSessionEpoch += 1;
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

```

## frontend/src/config.ts

SHA256 cda0d2bdfc5f75e70038741bc3b23a9ee8fe0f725e60ac7813213fe563f6d8f0

```text
// Backend API base URL.
//
// Resolution order:
//   1. VITE_API_URL (set in Vercel project env) — used when non-empty.
//   2. Fallback: in a production build, the real Railway backend; in dev, localhost.
//
// The fallback exists because `??` only catches null/undefined, not an empty
// string. If VITE_API_URL is ever blank in a prod build, API_URL must NOT become
// '' — that would turn every request into a relative URL that hits the SPA host
// and silently returns no data. So prod always falls back to the real backend.
//
// `import.meta.env` doesn't exist under node:test (this module's own test runner,
// see frontend/package.json `test`) — read defensively so importing this file (the
// single source of truth for the backend URL) never crashes there, and so nothing
// needs its own copy-pasted, easy-to-get-wrong version of this resolution logic.
const PROD_BACKEND_URL = 'https://clinicos-backend-production-df88.up.railway.app';

const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
const raw = (env?.VITE_API_URL as string | undefined)?.trim();
const fallback = env?.PROD ? PROD_BACKEND_URL : 'http://localhost:3001';

export const API_URL = (raw ? raw : fallback).replace(/\/$/, '');

```
