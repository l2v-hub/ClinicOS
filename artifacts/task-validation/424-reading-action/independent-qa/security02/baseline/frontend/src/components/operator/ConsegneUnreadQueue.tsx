import { useEffect, useRef } from 'react';
import type { PatientIdentityData } from '../../lib/patientIdentity';
import { patientIdentityName } from '../../lib/patientIdentity';
import { formatFacilityLocalMinute } from '../../lib/facilityTime';
import { useCan } from '../../lib/capabilities';
import { PatientIdentity } from '../shared/PatientIdentity';
import { UrgencyNotice } from '../shared/UrgencyNotice';
import { DiaryThreadReceipt } from './cartella/DiaryThreadReceipt';
import { useUnreadDiaryQueue } from './useUnreadDiaryQueue';

export function ConsegneUnreadQueue({
  onPatient,
}: {
  onPatient: (patient: PatientIdentityData) => void;
}) {
  const diary = useCan('diary.list'),
    handovers = useCan('consegne.list');
  const queue = useUnreadDiaryQueue(diary);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (queue.notice) heading.current?.focus();
  }, [queue.notice]);
  const patients = [
    ...new Map(
      (queue.page?.entries ?? [])
        .filter((row) => row.identity)
        .map((row) => [row.patientId, row.identity!]),
    ).values(),
  ];
  if (!diary)
    return (
      <p>
        La coda Non confermate non è disponibile per questo ruolo. Apri Per paziente o le consegne
        filtrate consentite.
      </p>
    );
  return (
    <section aria-label="Note non confermate" aria-busy={queue.loading}>
      <h2 ref={heading} tabIndex={-1}>
        Non confermate
      </h2>
      <p>
        Note di diario e consegne nel tuo perimetro, senza conferma esplicita di un altro operatore.
        Tutte le date e priorità. Aprire una nota non conferma la lettura.
      </p>
      <p role="status">
        {queue.page
          ? `${queue.page.entries.length} note caricate di ${queue.page.totalUnread} non confermate`
          : 'Conteggio non disponibile durante il caricamento.'}
      </p>
      {queue.notice && (
        <p role="status" aria-live="polite">
          {queue.notice}
        </p>
      )}
      <div className="handover-rounds__layout">
        <aside className="handover-rounds__list" aria-label="Conteggi per paziente">
          <h3>Pazienti nelle pagine caricate</h3>
          {patients.map((patient) => (
            <div key={patient.id} className="handover-rounds__patient">
              <button
                type="button"
                className="handover-rounds__select"
                onClick={() => onPatient(patient)}
              >
                <span>
                  <PatientIdentity patient={patient} />
                  <span className="handover-rounds__badges">
                    {queue.page!.patientCounts.find((item) => item.patientId === patient.id)
                      ?.total ?? 'Conteggio non disponibile'}{' '}
                    non confermate
                  </span>
                </span>
              </button>
            </div>
          ))}
          {!patients.length && (
            <p>
              {queue.loading ? 'Caricamento conteggi…' : 'Nessun paziente nelle note caricate.'}
            </p>
          )}
        </aside>
        <div className="handover-rounds__detail">
          {queue.error && (
            <div role="alert">
              <p>{queue.error}</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={queue.retry}
                disabled={queue.loading}
              >
                Riprova
              </button>
            </div>
          )}
          {queue.loading && <p role="status">Caricamento note non confermate…</p>}
          {!queue.loading && !queue.error && queue.page?.totalUnread === 0 && (
            <p>Nessuna nota senza conferma di lettura.</p>
          )}
          {queue.page?.entries.map((row) => (
            <article key={row.id} className="consegna-card" data-unread-id={row.id}>
              <div className="consegna-card__top">
                <strong>
                  {row.priority === 'urgente'
                    ? 'Urgente'
                    : row.priority === 'importante'
                      ? 'Importante'
                      : 'Normale'}
                </strong>
                <span>Non confermata</span>
                <span>{row.sourceType === 'consegna' ? 'Consegna' : 'Diario'}</span>
              </div>
              <PatientIdentity patient={row.identity} fallbackName="Identità non disponibile" />
              {row.identity && (
                <button type="button" className="link-btn" onClick={() => onPatient(row.identity!)}>
                  Diario di {patientIdentityName(row.identity)}
                </button>
              )}
              <p>
                <time dateTime={row.entryDateTime}>
                  {formatFacilityLocalMinute(row.entryDateTime)}
                </time>{' '}
                · {row.authorName}
              </p>
              {row.title && <h3>{row.title}</h3>}
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.content}</p>
              <DiaryThreadReceipt
                readReceipt={row.readReceipt}
                priority={row.priority}
                subject={`nota del ${formatFacilityLocalMinute(row.entryDateTime)}`}
                onAcknowledge={() => void queue.acknowledge(row, 'read')}
                busy={queue.busy === row.id}
                disabled={
                  queue.busy !== null || !diary || (row.sourceType === 'consegna' && !handovers)
                }
              />
              <UrgencyNotice
                urgency={row.urgency}
                subject="della nota"
                onAcknowledge={() => void queue.acknowledge(row, 'urgency')}
                busy={queue.busy === row.id}
                disabled={
                  queue.busy !== null || !diary || (row.sourceType === 'consegna' && !handovers)
                }
              />
            </article>
          ))}
          {queue.page?.hasMore && (
            <button
              type="button"
              className="btn-secondary"
              onClick={queue.loadMore}
              disabled={queue.loading || queue.busy !== null}
            >
              Carica altre note non confermate
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
