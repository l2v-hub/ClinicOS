import { useId, useState } from 'react';
import { MAX_CORRECTION_CHARS, type MiloRating } from '../../../lib/miloFeedback';

// Milo: «questa risposta era utile?». Un giudizio per risposta; con 👎 si può scrivere che cosa
// mancava o era sbagliato. Il giudizio serve a migliorare le competenze di Milo: una modifica vale
// solo dopo l'approvazione dell'amministratore.

interface Props {
  onSend: (rating: MiloRating, correction: string) => Promise<boolean>;
}

const Thumb = ({ down = false }: { down?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={down ? { transform: 'rotate(180deg)' } : undefined}
  >
    <path d="M7 10v11" />
    <path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.5l-2.3 7a2 2 0 0 1-1.9 1.5H7V10l4.2-7.4a1.9 1.9 0 0 1 3.8.9z" />
  </svg>
);

export function MiloFeedback({ onSend }: Props) {
  const [sent, setSent] = useState<MiloRating | null>(null);
  const [writing, setWriting] = useState(false);
  const [correction, setCorrection] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fieldId = useId();

  async function send(rating: MiloRating, text = '') {
    setBusy(true);
    setError(false);
    const ok = await onSend(rating, text).catch(() => false);
    setBusy(false);
    if (!ok) {
      setError(true);
      return;
    }
    setSent(rating);
    setWriting(false);
  }

  if (sent)
    return (
      <p className="milo-feedback milo-feedback--sent" role="status">
        {sent === 'up'
          ? 'Giudizio registrato: risposta utile.'
          : 'Giudizio registrato. Servirà a migliorare le risposte di Milo.'}
      </p>
    );

  return (
    <div className="milo-feedback" role="group" aria-label="Giudizio sulla risposta">
      {!writing ? (
        <div className="milo-feedback__row">
          <span className="milo-feedback__ask">Questa risposta era utile?</span>
          <button
            type="button"
            className="btn-secondary btn-sm milo-feedback__btn"
            disabled={busy}
            onClick={() => void send('up')}
          >
            <Thumb /> Sì
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm milo-feedback__btn"
            disabled={busy}
            onClick={() => setWriting(true)}
          >
            <Thumb down /> No
          </button>
        </div>
      ) : (
        <form
          className="milo-feedback__form"
          onSubmit={(e) => {
            e.preventDefault();
            void send('down', correction);
          }}
        >
          <label htmlFor={fieldId} className="milo-feedback__label">
            Che cosa mancava o era sbagliato?
          </label>
          <textarea
            id={fieldId}
            className="milo-feedback__text"
            rows={3}
            maxLength={MAX_CORRECTION_CHARS}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="Es. mancava la saturazione; il turno indicato non era quello giusto"
            autoFocus
          />
          <p className="milo-feedback__hint">
            Descrivi il problema senza nomi né dati del paziente: lo legge l’amministratore.
          </p>
          <div className="milo-feedback__row">
            <button type="submit" className="btn-primary btn-sm" disabled={busy}>
              {busy ? 'Invio…' : 'Invia giudizio'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={busy}
              onClick={() => setWriting(false)}
            >
              Annulla
            </button>
          </div>
        </form>
      )}
      {error ? (
        <p className="milo-feedback__error" role="alert">
          Giudizio non registrato. Riprova.
        </p>
      ) : null}
    </div>
  );
}
