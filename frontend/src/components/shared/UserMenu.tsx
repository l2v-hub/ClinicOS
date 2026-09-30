import { useEffect, useId, useRef, useState } from 'react';
import type { UtenteApp } from '../../types';
import { IcoLogout } from '../../icons';

/** Avatar dell'intestazione (HMI 1): apre il menu con nome, ruolo ed "Esci". */
export function UserMenu({
  utente,
  onLogout,
  roleLabel,
  simulator = false,
}: {
  utente: UtenteApp;
  onLogout: () => void;
  /** Etichetta del ruolo risolta dal server (GET /auth/me), es. "Medico". */
  roleLabel?: string;
  /** Sessione del Simulatore ruoli (solo sviluppo). */
  simulator?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const initials = utente.iniziali || (utente.nome ? utente.nome.slice(0, 2).toUpperCase() : 'CL');
  const ruolo = roleLabel || (utente.ruolo === 'admin' ? 'Amministratore' : 'Operatore');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="topbar-user-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="topbar-avatar"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${utente.nome}, ${ruolo}: menu utente`}
        title={`${utente.nome} · ${ruolo}`}
        onClick={() => setOpen((v) => !v)}
      >
        {initials}
      </button>
      {open && (
        <div className="topbar-user-menu__panel" id={menuId}>
          <div className="topbar-user-menu__who">
            <span className="topbar-user-menu__name">{utente.nome}</span>
            <span className="topbar-user-menu__role">
              {ruolo}
              {utente.reparto ? ` · ${utente.reparto}` : ''}
            </span>
            {simulator && (
              <span className="topbar-user-menu__role">Simulatore ruoli — solo sviluppo</span>
            )}
          </div>
          <button type="button" className="topbar-user-menu__logout" onClick={onLogout}>
            <IcoLogout /> {simulator ? 'Cambia profilo' : 'Esci'}
          </button>
        </div>
      )}
    </div>
  );
}
