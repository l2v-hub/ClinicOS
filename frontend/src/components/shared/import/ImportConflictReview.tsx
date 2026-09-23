import { useState } from 'react';
import type { ConflictDecision, ImportResult } from './importSessionTypes';
import { completeConflictDecisions } from './importReviewModel';
export function ImportConflictReview({
  result,
  busy,
  onSave,
  onOpenPage,
  onDirty,
}: {
  result: ImportResult;
  busy: boolean;
  onSave(decisions: ConflictDecision[]): Promise<void>;
  onOpenPage(id: string): void;
  onDirty(): void;
}) {
  const [decisions, setDecisions] = useState<ConflictDecision[]>(result._review.decisions);
  const [error, setError] = useState('');
  function decide(next: ConflictDecision) {
    onDirty();
    setDecisions((old) => [
      ...old.filter((decision) => decision.conflictId !== next.conflictId),
      next,
    ]);
  }
  if (!result._conflicts.length) return null;
  return (
    <section className="import-conflicts" aria-label="Conflitti tra lettere">
      <h3>Informazioni discordanti · {result._conflicts.length}</h3>
      <p>
        Confronta le fonti per ogni voce. Scegli un valore oppure lascia la voce da verificare nella
        bozza.
      </p>
      {result._conflicts.map((conflict) => {
        const decision = decisions.find((value) => value.conflictId === conflict.id);
        return (
          <fieldset key={conflict.id} disabled={busy}>
            <legend>{conflict.label}</legend>
            {conflict.candidates.map((candidate) => (
              <div key={candidate.id} className="import-conflict-candidate">
                <label>
                  <input
                    type="radio"
                    name={`conflict-${conflict.id}`}
                    checked={decision?.action === 'select' && decision.candidateId === candidate.id}
                    onChange={() =>
                      decide({
                        conflictId: conflict.id,
                        action: 'select',
                        candidateId: candidate.id,
                      })
                    }
                  />{' '}
                  {candidate.displayValue}
                </label>
                {candidate.sources.map((source) => (
                  <details key={source.groupId}>
                    <summary>Fonte: {source.label}</summary>
                    {source.snippet && <blockquote>{source.snippet}</blockquote>}
                    <p>Pagine della lettera:</p>
                    {source.pages.map((page) => (
                      <button
                        key={page.pageId}
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => onOpenPage(page.pageId)}
                      >
                        Originale p. {page.sourcePageNumber}
                      </button>
                    ))}
                  </details>
                ))}
              </div>
            ))}
            <label>
              <input
                type="radio"
                name={`conflict-${conflict.id}`}
                checked={decision?.action === 'defer'}
                onChange={() => decide({ conflictId: conflict.id, action: 'defer' })}
              />{' '}
              Lascia da verificare
            </label>
          </fieldset>
        );
      })}
      {error && <p role="alert">{error}</p>}
      <button
        className="btn-primary"
        disabled={busy || !completeConflictDecisions(result, decisions)}
        onClick={() => {
          setError('');
          void onSave(decisions).catch((e) =>
            setError(e instanceof Error ? e.message : 'Salvataggio decisioni non riuscito.'),
          );
        }}
      >
        Salva decisioni sui conflitti
      </button>
    </section>
  );
}
