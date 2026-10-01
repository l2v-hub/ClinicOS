// Phase 8 — Role Home of the shared Assistant. Everything comes from the server (role profile
// filtered by the active policy and the resident scope): this component only renders and calls
// back. Shortcuts and starters run through the normal Assistant path (preview → «Conferma»).

import type { CopilotHome as Home, CopilotShortcut } from './assistantApi';

interface Props {
  home: Home;
  busy: boolean;
  onShortcut: (s: CopilotShortcut) => void;
  onStarter: (label: string) => void;
  onResume: (workflowId: string) => void;
}

function since(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function CopilotHome({ home, busy, onShortcut, onStarter, onResume }: Props) {
  const show = (s: Home['profile']['sections'][number]) => home.profile.sections.includes(s);
  return (
    <section
      className={`am-card am-home am-home--${home.profile.density}`}
      aria-label="Il tuo copilota"
      data-testid="am-home"
      data-role={home.role.id}
    >
      <div className="am-home__head">
        <p className="am-card__title" data-testid="am-home-title">
          {home.role.copilot}
        </p>
        {home.profile.terminology.focus && (
          <span className="am-muted">{home.profile.terminology.focus}</span>
        )}
      </div>

      {show('shortcuts') && home.shortcuts.length > 0 && (
        <div className="am-home__shortcuts" data-testid="am-shortcuts">
          {home.shortcuts.map((s) => (
            <button
              key={s.id}
              type="button"
              className="ds-btn ds-btn--primary am-shortcut"
              disabled={busy}
              data-testid={`am-shortcut-${s.id}`}
              onClick={() => onShortcut(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {show('continue') && home.continueWork.length > 0 && (
        <div className="am-home__continue" data-testid="am-continue">
          <p className="am-card__subtitle">Continua da dove avevi lasciato</p>
          {home.continueWork.map((w) => (
            <button
              key={w.workflowId}
              type="button"
              className="ds-btn ds-btn--secondary"
              disabled={busy}
              onClick={() => onResume(w.workflowId)}
            >
              {w.action ?? w.skillName}
              {w.residentLabel ? ` · ${w.residentLabel}` : ''}{' '}
              <span className="am-muted">(preparata alle {since(w.updatedAt)}, da confermare)</span>
            </button>
          ))}
        </div>
      )}

      {show('starters') && (
        <div className="am-starters" aria-label="Suggerimenti" data-testid="am-starters">
          {home.starters.map((s) => (
            <button
              key={s.skillId}
              type="button"
              className="am-starter"
              disabled={busy}
              title={s.reasons.length ? `Suggerito per: ${s.reasons.join(', ')}` : undefined}
              onClick={() => onStarter(s.label)}
            >
              {s.label}
            </button>
          ))}
          {home.starters.length === 0 && (
            <p className="am-muted">Nessuna azione dell’assistente disponibile per il tuo ruolo.</p>
          )}
        </div>
      )}

      {show('recent') && home.recent.length > 0 && (
        <div className="am-home__recent" data-testid="am-recent">
          <p className="am-card__subtitle">Attività recenti</p>
          <ul className="am-home__recent-list">
            {home.recent.map((r) => (
              <li key={`${r.skillId}-${r.at}`}>
                {r.skillName}
                {r.residentLabel ? ` · ${r.residentLabel}` : ''}{' '}
                <span className="am-muted">alle {since(r.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
