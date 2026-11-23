import { useCallback, useEffect, useState } from 'react';
import { AuthzApiError } from '../../../lib/authzPolicyApi';
import {
  decideMiloVersion,
  dismissMiloFeedback,
  loadMiloFeedback,
  loadMiloSkills,
  proposeFromFeedback,
  proposeManually,
  restoreMiloSkill,
  type MiloFeedbackItem,
  type MiloSkill,
  type MiloSkillVersion,
} from '../../../lib/miloSkillsApi';
import {
  diffInstructions,
  feedbackForSkill,
  instructionsInUse,
  instructionsProblem,
  parseInstructionLines,
  versionInUse,
} from './miloSkillsModel';

// «Competenze di Milo»: i giudizi delle persone sulle risposte e le istruzioni degli specialisti.
// Una proposta (dal modello o scritta a mano) vale solo dopo l'approvazione; strumenti e regole
// fisse non si cambiano da qui. Solo chi può gestire la policy (amministratore).

const ROLE_LABEL: Record<string, string> = {
  nurse: 'Infermiere',
  doctor: 'Medico',
  oss: 'OSS',
  supervisor: 'Supervisore',
  administrator: 'Amministratore',
};
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—';

interface Notice {
  tone: 'success' | 'warning' | 'error';
  text: string;
}

export function MiloSkillsView({ onCounts }: { onCounts?: (pending: number) => void }) {
  const [skills, setSkills] = useState<MiloSkill[] | null>(null);
  const [runtimeAvailable, setRuntimeAvailable] = useState(true);
  const [feedback, setFeedback] = useState<MiloFeedbackItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [rationale, setRationale] = useState('');

  const reload = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([loadMiloSkills(), loadMiloFeedback()]);
      setSkills(s.skills);
      setRuntimeAvailable(s.runtimeAvailable);
      setFeedback(f.feedback);
      setLoadError(null);
      onCounts?.(
        f.feedback.filter((x) => x.rating === 'down').length +
          s.skills.reduce((n, skill) => n + skill.proposals.length, 0),
      );
    } catch (error) {
      setLoadError(
        error instanceof AuthzApiError && error.status === 403
          ? 'Le competenze di Milo le gestisce solo chi può modificare ruoli e permessi.'
          : error instanceof Error
            ? error.message
            : 'Competenze non disponibili.',
      );
    }
  }, [onCounts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(key: string, action: () => Promise<Notice>) {
    setBusy(key);
    setNotice(null);
    try {
      const done = await action();
      await reload();
      setNotice(done);
    } catch (error) {
      setNotice({
        tone: error instanceof AuthzApiError && error.status === 422 ? 'warning' : 'error',
        text: error instanceof Error ? error.message : 'Operazione non riuscita.',
      });
    } finally {
      setBusy(null);
    }
  }

  if (loadError)
    return (
      <div className="page-load-error" role="alert">
        <strong>Competenze di Milo non disponibili</strong>
        <span>{loadError}</span>
        <button type="button" className="btn-secondary" onClick={() => void reload()}>
          Riprova
        </button>
      </div>
    );
  if (!skills) return <p className="cr-empty">Caricamento delle competenze…</p>;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="milo-skills">
      {notice && (
        <p className={`rp-banner rp-banner--${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}
      {!runtimeAvailable && (
        <p className="rp-banner rp-banner--warning" role="status">
          Il servizio AI non risponde: le istruzioni rilasciate non sono leggibili e le proposte dai
          giudizi non sono disponibili. Le versioni approvate restano consultabili.
        </p>
      )}

      <section className="milo-skills__section" aria-labelledby="milo-feedback-title">
        <h2 id="milo-feedback-title">Giudizi da esaminare</h2>
        <p className="rp-muted">
          Quello che le persone hanno segnalato sulle risposte di Milo. Seleziona i giudizi da cui
          far partire una proposta, oppure archivia quelli che non richiedono modifiche.
        </p>
        {feedback.length === 0 ? (
          <p className="cr-empty">
            Nessun giudizio aperto. I giudizi arrivano dal pannello di Milo, sotto ogni risposta.
          </p>
        ) : (
          <ul className="milo-skills__feedback">
            {feedback.map((f) => (
              <li key={f.id} className="milo-skills__feedback-item">
                <label className="milo-skills__check">
                  <input
                    type="checkbox"
                    checked={selected.has(f.id)}
                    onChange={() => toggle(f.id)}
                    aria-label={`Seleziona il giudizio su «${f.question}»`}
                  />
                </label>
                <div className="milo-skills__feedback-body">
                  <div className="milo-skills__feedback-head">
                    <span
                      className={`ds-badge ${f.rating === 'down' ? 'ds-badge--warning' : 'ds-badge--ok'}`}
                    >
                      {f.rating === 'down' ? 'Da correggere' : 'Utile'}
                    </span>
                    <span className="rp-muted">
                      {ROLE_LABEL[f.operatorRole] ?? f.operatorRole} · {when(f.createdAt)}
                      {f.members.length ? ` · ${f.members.join(', ')}` : ' · percorso classico'}
                    </span>
                  </div>
                  <p className="milo-skills__question">{f.question}</p>
                  {f.correction && <p className="milo-skills__correction">{f.correction}</p>}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy !== null}
                  onClick={() =>
                    void run(`dismiss:${f.id}`, async () => {
                      await dismissMiloFeedback(f.id);
                      setSelected((prev) => {
                        const next = new Set(prev);
                        next.delete(f.id);
                        return next;
                      });
                      return { tone: 'success', text: 'Giudizio archiviato.' };
                    })
                  }
                >
                  Archivia
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="milo-skills__section" aria-labelledby="milo-skills-title">
        <h2 id="milo-skills-title">Specialisti</h2>
        <ul className="rp-history">
          {skills.map((skill) => {
            const inUse = instructionsInUse(skill);
            const expanded = open === skill.id;
            const own = feedbackForSkill(feedback, skill.id);
            const chosen = [...selected].filter((id) => feedback.some((f) => f.id === id));
            const panelId = `milo-skill-${skill.id}`;
            const lines = parseInstructionLines(draft);
            const problem = instructionsProblem(lines);
            return (
              <li key={skill.id} className={`rp-history__item${expanded ? ' is-open' : ''}`}>
                <div className="rp-history__head">
                  <button
                    type="button"
                    className="rp-group-toggle rp-history__toggle"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => {
                      setOpen(expanded ? null : skill.id);
                      setEditing(null);
                    }}
                  >
                    <span
                      className={`rp-chevron${expanded ? ' rp-chevron--open' : ''}`}
                      aria-hidden="true"
                    />
                    <span className="rp-history__version">{skill.name}</span>
                    <span className={`ds-badge ${skill.approved ? 'ds-badge--ok' : ''}`}>
                      {versionInUse(skill)}
                    </span>
                    {skill.proposals.length > 0 && (
                      <span className="ds-badge ds-badge--warning">
                        {skill.proposals.length === 1
                          ? '1 proposta da decidere'
                          : `${skill.proposals.length} proposte da decidere`}
                      </span>
                    )}
                    <span className="rp-history__counts">
                      {own.length === 1 ? '1 giudizio aperto' : `${own.length} giudizi aperti`}
                    </span>
                  </button>
                </div>
                {skill.role && <p className="rp-history__note">{skill.role}</p>}
                {expanded && (
                  <div id={panelId} className="rp-history__body">
                    {skill.proposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        current={inUse}
                        busy={busy !== null}
                        onDecide={(decision) =>
                          void run(`${decision}:${proposal.id}`, async () => {
                            await decideMiloVersion(proposal.id, decision);
                            return decision === 'approve'
                              ? {
                                  tone: 'success',
                                  text: `Versione ${proposal.label} approvata: ${skill.name} la usa dalle prossime risposte.`,
                                }
                              : { tone: 'success', text: `Proposta ${proposal.label} rifiutata.` };
                          })
                        }
                      />
                    ))}

                    <div className="milo-skills__columns">
                      <div>
                        <h3>Istruzioni in uso</h3>
                        {inUse.length ? (
                          <ol className="milo-skills__list">
                            {inUse.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ol>
                        ) : (
                          <p className="rp-muted">Non leggibili: il servizio AI non risponde.</p>
                        )}
                        {skill.approved && (
                          <p className="rp-muted">
                            Approvata da {skill.approved.decidedByName ?? '—'} il{' '}
                            {when(skill.approved.decidedAt)}
                            {skill.approved.source === 'model'
                              ? ' · proposta dal modello'
                              : ' · scritta a mano'}
                          </p>
                        )}
                      </div>
                      <div>
                        <h3>Regole fisse</h3>
                        <ul className="milo-skills__list milo-skills__list--locked">
                          {skill.locked.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        <p className="rp-muted">
                          Sempre attive, non modificabili da qui.
                          {skill.tools.length ? ` Letture: ${skill.tools.join(', ')}.` : ''}
                        </p>
                      </div>
                    </div>

                    {editing === skill.id ? (
                      <form
                        className="milo-skills__editor"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (problem) return;
                          void run(`manual:${skill.id}`, async () => {
                            const { proposal } = await proposeManually(skill.id, lines, rationale);
                            setEditing(null);
                            return {
                              tone: 'success',
                              text: `Proposta ${proposal.label} salvata: resta da approvare.`,
                            };
                          });
                        }}
                      >
                        <label htmlFor={`milo-draft-${skill.id}`}>
                          Nuove istruzioni, una per riga
                        </label>
                        <textarea
                          id={`milo-draft-${skill.id}`}
                          rows={Math.min(16, Math.max(6, lines.length + 2))}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                        <label htmlFor={`milo-why-${skill.id}`}>
                          Perché questa modifica (facoltativo)
                        </label>
                        <input
                          id={`milo-why-${skill.id}`}
                          type="text"
                          maxLength={600}
                          value={rationale}
                          onChange={(e) => setRationale(e.target.value)}
                        />
                        <p
                          className={problem ? 'milo-skills__problem' : 'rp-muted'}
                          role={problem ? 'alert' : undefined}
                        >
                          {problem ??
                            `${lines.length} istruzioni. Non inserire nomi o dati di pazienti.`}
                        </p>
                        <div className="milo-skills__actions">
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={busy !== null || !!problem}
                          >
                            Salva come proposta
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setEditing(null)}
                          >
                            Annulla
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="milo-skills__actions">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={
                            busy !== null ||
                            !runtimeAvailable ||
                            (chosen.length === 0 && own.length === 0)
                          }
                          title={
                            chosen.length === 0 && own.length === 0
                              ? 'Nessun giudizio aperto per questo specialista'
                              : undefined
                          }
                          onClick={() =>
                            void run(`propose:${skill.id}`, async () => {
                              const { proposal } = await proposeFromFeedback(skill.id, chosen);
                              setSelected(new Set());
                              return {
                                tone: 'success',
                                text: `Proposta ${proposal.label} pronta: leggila e decidi se approvarla.`,
                              };
                            })
                          }
                        >
                          {busy === `propose:${skill.id}`
                            ? 'Milo sta scrivendo la proposta…'
                            : chosen.length
                              ? chosen.length === 1
                                ? 'Proponi dal giudizio selezionato'
                                : `Proponi dai ${chosen.length} giudizi selezionati`
                              : 'Proponi dai giudizi aperti'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy !== null}
                          onClick={() => {
                            setDraft(inUse.join('\n'));
                            setRationale('');
                            setEditing(skill.id);
                          }}
                        >
                          Scrivi a mano
                        </button>
                        {skill.approved && (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(`restore:${skill.id}`, async () => {
                                await restoreMiloSkill(skill.id);
                                return {
                                  tone: 'success',
                                  text: `${skill.name} è tornato alle istruzioni rilasciate.`,
                                };
                              })
                            }
                          >
                            Torna alla versione rilasciata
                          </button>
                        )}
                      </div>
                    )}

                    {skill.history.length > 0 && (
                      <details className="milo-skills__history">
                        <summary>Versioni precedenti ({skill.history.length})</summary>
                        <ul>
                          {skill.history.map((v) => (
                            <li key={v.id}>
                              {v.label} · {v.status === 'rejected' ? 'rifiutata' : 'sostituita'} ·{' '}
                              {when(v.decidedAt ?? v.createdAt)}
                              {v.rationale ? ` · ${v.rationale}` : ''}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ProposalCard({
  proposal,
  current,
  busy,
  onDecide,
}: {
  proposal: MiloSkillVersion;
  current: string[];
  busy: boolean;
  onDecide: (decision: 'approve' | 'reject') => void;
}) {
  const rows = diffInstructions(current, proposal.instructions);
  return (
    <div className="milo-skills__proposal" role="group" aria-label={`Proposta ${proposal.label}`}>
      <div className="milo-skills__feedback-head">
        <strong>Proposta {proposal.label}</strong>
        <span className="rp-muted">
          {proposal.source === 'model' ? 'scritta da Milo dai giudizi' : 'scritta a mano'} ·{' '}
          {proposal.createdByName ?? '—'} · {when(proposal.createdAt)}
        </span>
      </div>
      {proposal.rationale && <p className="milo-skills__correction">{proposal.rationale}</p>}
      <ul className="milo-skills__diff">
        {rows.map((row) => (
          <li
            key={`${row.change}:${row.line}`}
            className={`milo-skills__diff-row is-${row.change}`}
          >
            <span className="milo-skills__diff-tag">
              {row.change === 'added' ? 'Nuova' : row.change === 'removed' ? 'Tolta' : 'Invariata'}
            </span>
            <span>{row.line}</span>
          </li>
        ))}
      </ul>
      <div className="milo-skills__actions">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => onDecide('approve')}
        >
          Approva e metti in uso
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => onDecide('reject')}
        >
          Rifiuta
        </button>
      </div>
    </div>
  );
}
