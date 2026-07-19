import type { UtenteApp } from '../types';
import { UTENTE_ADMIN, UTENTE_OPERATORE } from '../mockData';
import { IcoAdmin, IcoUser } from '../icons';

interface LoginProps {
  onLogin: (utente: UtenteApp) => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">
          <div className="login-brand-icon">✚</div>
          <h1 className="login-brand-name">ClinicOS</h1>
          <p className="login-brand-sub">Sistema di Gestione Clinica</p>
        </div>

        <p className="login-prompt">Seleziona il tuo profilo per accedere</p>

        <div className="login-role-grid">
          <button
            className="login-role-card login-role-card--admin"
            onClick={() => onLogin(UTENTE_ADMIN)}
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
          >
            <span className="login-role-icon">
              <IcoUser />
            </span>
            <span className="login-role-title">Operatore</span>
            <span className="login-role-desc">Pazienti, consegne, agenda e cartelle cliniche</span>
          </button>
        </div>

        <p className="login-note">Accesso dimostrativo — nessuna credenziale richiesta</p>
      </div>
    </div>
  );
}
