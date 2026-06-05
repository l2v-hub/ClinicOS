import { useState, useEffect } from 'react';
import { IcoAI, IcoX } from '../../icons';

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function AIAssistantButton({ forceOpen, onClose }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        onClick={() => setOpen(true)}
        aria-label="Assistente AI"
        title="Assistente AI"
      >
        <IcoAI />
      </button>

      {open && (
        <>
          <div className="ai-drawer__scrim" onClick={handleClose} />
          <aside className="ai-drawer" role="dialog" aria-label="Assistente AI">
            <header className="ai-drawer__header">
              <div className="ai-drawer__title">
                <span className="ai-drawer__icon"><IcoAI /></span>
                <span>Assistente AI</span>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={handleClose}
                aria-label="Chiudi"
              >
                <IcoX />
              </button>
            </header>
            <div className="ai-drawer__body">
              <p className="ai-drawer__lede">
                Assistente AI ClinicOS in arrivo.
              </p>
              <p className="ai-drawer__hint">
                Da qui potrai chiedere: dati paziente, allergie, terapie,
                lettere di dimissione, camere libere, agenda, occupazione,
                stato operatori e altri dati gestionali.
              </p>
              <div className="ai-drawer__placeholder">
                <span>Input vocale e testuale disponibili a breve.</span>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
