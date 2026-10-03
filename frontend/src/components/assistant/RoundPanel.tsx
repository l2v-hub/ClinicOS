// Phase 8 — «Giro ospiti» composite workflow: a guided sequence of EXISTING skills, one resident at
// a time. The resident list comes from the Tool Layer (policy + scope); selecting a resident goes
// through the normal resident check; every step is a normal Assistant turn (writes still need the
// preview and «Conferma»); moving on closes the resident context (a pending sensitive workflow is
// cancelled by the existing rule).

import { useEffect, useState } from 'react';
import { loadRoundResidents, type AssistantResident, type CopilotShortcut } from './assistantApi';

interface Props {
  shortcut: CopilotShortcut;
  busy: boolean;
  activeResidentId: string | null;
  residentWord: string;
  onSelect: (resident: AssistantResident) => Promise<void>;
  onStep: (label: string) => void;
  onClose: () => void;
}

export function RoundPanel({
  shortcut,
  busy,
  activeResidentId,
  residentWord,
  onSelect,
  onStep,
  onClose,
}: Props) {
  const [hasMore, setHasMore] = useState(false);
  const [residents, setResidents] = useState<
    (AssistantResident & { room: string | null; bed: string | null })[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    loadRoundResidents()
      .then((r) => {
        if (!alive) return;
        setResidents(r.residents);
        setHasMore(r.hasMore);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Elenco non disponibile'));
    return () => {
      alive = false;
    };
  }, []);

  const index = residents?.findIndex((r) => r.id === activeResidentId) ?? -1;
  const current = index >= 0 ? residents![index] : null;
  const next = residents
    ? (residents.find((r, i) => i > index && !done.includes(r.id)) ?? null)
    : null;

  async function go(r: AssistantResident) {
    if (current) setDone((d) => (d.includes(current.id) ? d : [...d, current.id]));
    try {
      setError(null);
      await onSelect(r); // backend scope check: a resident who left the scope is refused
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ospite non selezionabile');
    }
  }

  return (
    <section className="am-card am-round" aria-label={shortcut.label} data-testid="am-round">
      <div className="am-home__head">
        <p className="am-card__title">{shortcut.label}</p>
        <button
          type="button"
          className="ds-link am-link"
          onClick={onClose}
          disabled={busy}
          data-testid="am-round-close"
        >
          Chiudi il giro
        </button>
      </div>
      {error && (
        <p className="am-muted" role="status">
          {error}
        </p>
      )}
      {shortcut.intro && !current && (
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          disabled={busy}
          onClick={() => onStep(shortcut.intro!.label)}
          data-testid="am-round-intro"
        >
          {shortcut.intro.label}
        </button>
      )}
      {residents && residents.length === 0 && (
        <p className="am-muted">Nessun {residentWord} nel tuo ambito.</p>
      )}
      {current ? (
        <>
          <p data-testid="am-round-current">
            <strong>{current.label}</strong>
            {current.room ? (
              <span className="am-muted">
                {' '}
                · stanza {current.room}
                {current.bed ? ` letto ${current.bed}` : ''}
              </span>
            ) : null}{' '}
            <span className="am-muted">
              ({index + 1} di {residents!.length})
            </span>
          </p>
          <div className="am-home__shortcuts" data-testid="am-round-steps">
            {(shortcut.steps ?? []).map((s) => (
              <button
                key={s.skillId}
                type="button"
                className="ds-btn ds-btn--secondary am-shortcut"
                disabled={busy}
                onClick={() => onStep(s.label)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="am-actions">
            {next ? (
              <button
                type="button"
                className="ds-btn ds-btn--primary"
                disabled={busy}
                onClick={() => void go(next)}
                data-testid="am-round-next"
              >
                {residentWord[0].toUpperCase() + residentWord.slice(1)} successivo: {next.label}
              </button>
            ) : (
              <p className="am-muted">Giro completato.</p>
            )}
          </div>
        </>
      ) : (
        residents &&
        residents.length > 0 && (
          <ul className="am-signals" data-testid="am-round-list">
            {residents.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary ds-btn--block am-starter"
                  disabled={busy}
                  onClick={() => void go(r)}
                >
                  {r.label}
                  {r.room ? ` · stanza ${r.room}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      {hasMore && !current && (
        <p className="am-muted">Elenco limitato ai primi 50: per gli altri usa «Cambia ospite».</p>
      )}
    </section>
  );
}
