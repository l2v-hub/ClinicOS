import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssessmentClient } from '../../../lib/assessments/assessmentClient';
import { AssessmentApiError } from '../../../lib/assessments/assessmentClient';
import {
  ATTESTATION_KINDS,
  type AssessmentAttestationPage,
  type AttestationKind,
  type AttestationRequest,
} from '../../../lib/assessments/assessmentAttestations';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
const labels = {
  physiotherapist_confirmation: 'Conferma contenuto fisioterapista',
  operator_acknowledgement: 'Presa visione operatore',
};
export function AssessmentAttestations({
  patientId,
  assessmentId,
  snapshotSha256,
  operatorId,
  client,
}: {
  patientId: string;
  assessmentId: string;
  snapshotSha256: string;
  operatorId?: string;
  client: AssessmentClient;
}) {
  const [page, setPage] = useState<AssessmentAttestationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const [pending, setPending] = useState<Readonly<AttestationRequest> | null>(null);
  const generation = useRef(0);
  const reads = useRef(0);
  const lock = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const load = useCallback(
    async (cursor?: string) => {
      const epoch = generation.current;
      const sequence = ++reads.current;
      const controller = new AbortController();
      controllers.current.add(controller);
      setLoading(true);
      try {
        const incoming = await client.attestations(
          patientId,
          assessmentId,
          snapshotSha256,
          cursor,
          controller.signal,
        );
        if (controller.signal.aborted || epoch !== generation.current || sequence !== reads.current)
          return;
        if (cursor && incoming.pageInfo.nextCursor === cursor)
          throw new Error('Elenco non avanzato. Aggiorna le conferme.');
        setPage((previous) => ({
          ...incoming,
          items: cursor
            ? [
                ...new Map(
                  [...(previous?.items ?? []), ...incoming.items].map((item) => [item.id, item]),
                ).values(),
              ]
            : incoming.items,
        }));
      } catch (cause) {
        if (
          !controller.signal.aborted &&
          epoch === generation.current &&
          sequence === reads.current
        )
          setError(cause instanceof Error ? cause.message : 'Conferme non disponibili.');
      } finally {
        controllers.current.delete(controller);
        if (epoch === generation.current && sequence === reads.current) setLoading(false);
      }
    },
    [client, patientId, assessmentId, snapshotSha256],
  );
  useEffect(() => {
    const epoch = ++generation.current;
    const active = controllers.current;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      generation.current = epoch + 1;
      window.clearTimeout(timer);
      active.forEach((item) => item.abort());
      active.clear();
    };
  }, [load]);
  async function attest(kind: AttestationKind) {
    if (lock.current || (pending && pending.kind !== kind)) return;
    const body = pending ?? Object.freeze({ kind, snapshotSha256 });
    if (!pending && (!page?.me.allowedKinds.includes(kind) || page.me.attestedKinds.includes(kind)))
      return;
    const epoch = generation.current;
    lock.current = true;
    setSaving(true);
    setError('');
    setPending(body);
    try {
      await client.attest(patientId, assessmentId, body, operatorId);
      if (epoch !== generation.current) return;
      setPending(null);
      setReceipt(`${labels[kind]} registrata per questa versione.`);
      await load();
    } catch (cause) {
      if (epoch !== generation.current) return;
      const definite = cause instanceof AssessmentApiError && !cause.failure.uncertain;
      if (definite) setPending(null);
      setError(
        definite
          ? cause.message
          : 'Esito della conferma non verificato. Puoi reinviare la stessa conferma senza duplicarla.',
      );
    } finally {
      lock.current = false;
      if (epoch === generation.current) setSaving(false);
    }
  }
  return (
    <section className="assessment-attestations" aria-label="Conferme personali">
      <h3>Conferme personali</h3>
      <p>
        Le conferme riguardano questa versione. Il PDF originale resta invariato; non sono firme
        digitali.
      </p>
      {page?.correctedById && (
        <p className="assessment-hint">
          Questa scheda è stata rettificata. Le conferme riportate si riferiscono alla versione
          precedente.
        </p>
      )}
      {page && (
        <>
          <p>Qualifica registrata: {page.me.registeredQualification?.trim() || 'Non indicata'}.</p>
          <dl className="assessment-metadata">
            {ATTESTATION_KINDS.map((kind) => (
              <div key={kind}>
                <dt>{labels[kind]}</dt>
                <dd>{page.counts[kind]}</dd>
              </div>
            ))}
          </dl>
          <div className="assessment-actions">
            {ATTESTATION_KINDS.map((kind) =>
              page.me.attestedKinds.includes(kind) ? (
                <span key={kind}>{labels[kind]} già registrata da te.</span>
              ) : (
                page.me.allowedKinds.includes(kind) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={saving || !!pending}
                    key={kind}
                    onClick={() => void attest(kind)}
                  >
                    {kind === 'physiotherapist_confirmation'
                      ? 'Confermo il contenuto come fisioterapista'
                      : 'Confermo la presa visione'}
                  </button>
                )
              ),
            )}
          </div>
          <ul className="assessment-history__list">
            {page.items.map((item) => (
              <li key={item.id}>
                <strong>{labels[item.kind]}</strong>
                <p>
                  {item.actor.name} · Qualifica registrata:{' '}
                  {item.actor.registeredQualification?.trim() || 'Non indicata'}
                </p>
                <p>{formatFacilityLocalMinute(item.createdAt)}</p>
              </li>
            ))}
          </ul>
          {page.pageInfo.hasMore && (
            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => void load(page.pageInfo.nextCursor!)}
            >
              Carica altre conferme
            </button>
          )}
        </>
      )}
      {loading && <p role="status">Lettura delle conferme…</p>}
      {receipt && <p role="status">{receipt}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="assessment-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={loading || saving}
          onClick={() => {
            setError('');
            void load();
          }}
        >
          Aggiorna conferme
        </button>
        {pending && (
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={() => void attest(pending.kind)}
          >
            Riprova la stessa conferma
          </button>
        )}
      </div>
    </section>
  );
}
