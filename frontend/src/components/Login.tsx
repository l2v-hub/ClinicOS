import { useEffect, useState } from 'react';
import type { SimulatorIdentity, UtenteApp } from '../types';
import { UTENTE_ADMIN, UTENTE_OPERATORE } from '../mockData';
import { IcoAdmin, IcoUser } from '../icons';
import { API_URL } from '../config';
import './Login.css';

interface LoginProps {
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
  onLogin,
  demoMode = false,
  loading = false,
  error,
  simulator = false,
  onSimulatorLogin,
}: LoginProps) {
  const showSimulator = simulator && onSimulatorLogin != null;
  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">
          <div className="login-brand-icon">✚</div>
          <h1 className="login-brand-name">ClinicOS</h1>
          <p className="login-brand-sub">Sistema di Gestione Clinica</p>
        </div>

        {demoMode && (
          <div className="login-demo-warning" role="status">
            <strong>Modalità demo temporanea</strong>
            <span>
              Usa esclusivamente dati sintetici. Le azioni vengono salvate nel database demo.
            </span>
          </div>
        )}

        {showSimulator ? (
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

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <p className="login-note">
          {loading
            ? 'Verifica accesso…'
            : showSimulator
              ? 'Simulatore ruoli — nessuna credenziale reale'
              : 'Accesso dimostrativo — nessuna credenziale richiesta'}
        </p>
      </div>
    </div>
  );
}
