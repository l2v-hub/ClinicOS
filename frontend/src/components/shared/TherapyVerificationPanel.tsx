import type { TherapyReadGroup, TherapyVerificationGroup } from '../../types';
import { administeredTime, motivoLabel } from '../../lib/therapyGiro';

const REASONS = {
  missing_time: 'Orario non specificato.',
  invalid_time: 'Orario non valido.',
  conflicting_schedule: 'Orario e pianificazione da verificare.',
};

/** These prescriptions have no administration key. Display only; never a dose control. */
export function TherapyVerificationPanel({
  groups,
  patientId,
  therapyId,
}: {
  groups: TherapyReadGroup[];
  patientId?: string;
  therapyId?: string;
}) {
  const verification = groups.filter(
    (group): group is TherapyVerificationGroup => group.kind === 'verification',
  );
  return (
    <>
      {verification.map((group) => {
        const rows = group.patients
          .filter((patient) => !patientId || patient.patientId === patientId)
          .flatMap((patient) =>
            patient.items
              .filter((item) => !therapyId || item.therapyId === therapyId)
              .map((item) => ({ patient, item })),
          );
        const total = patientId || therapyId ? rows.length : group.summary.total;
        if (!total) return null;
        return (
          <section
            className="empty-state-card"
            aria-label={`Terapie da verificare ${group.date}`}
            key={`${group.id}-${group.date}`}
          >
            <p role="status">
              <strong>Da verificare · {total}</strong> · {group.date}
            </p>
            <p>
              Programmazione da verificare con il medico prescrittore. Nessuna nuova
              somministrazione disponibile.
            </p>
            <ul>
              {rows.map(({ patient, item }) => (
                <li key={`${patient.patientId}-${item.therapyId}`}>
                  <strong>{item.drugName}</strong> · {patient.lastName} {patient.firstName} ·{' '}
                  {REASONS[item.reason]}
                  {item.recordedOutcome ? (
                    <span>
                      {' '}
                      ·{' '}
                      <strong>
                        {item.recordedOutcome.status === 'administered'
                          ? 'Già somministrata'
                          : 'Già registrata come non somministrata'}
                      </strong>
                      {item.recordedOutcome.recordedBy && (
                        <> · Operatore: {item.recordedOutcome.recordedBy}</>
                      )}
                      {item.recordedOutcome.recordedAt && (
                        <>
                          {' '}
                          · Registrata il{' '}
                          {new Date(item.recordedOutcome.recordedAt).toLocaleDateString('it-IT', {
                            timeZone: 'Europe/Rome',
                          })}{' '}
                          alle {administeredTime(item.recordedOutcome.recordedAt)}
                        </>
                      )}
                      {item.recordedOutcome.notAdministeredReason && (
                        <> · {motivoLabel(item.recordedOutcome.notAdministeredReason)}</>
                      )}
                      {' · Esito registrato in sola lettura.'}
                    </span>
                  ) : (
                    <span> · Esito registrato non disponibile.</span>
                  )}
                </li>
              ))}
            </ul>
            {rows.length < total && (
              <p>
                Mostrate {rows.length} di {total} terapie. Carica altri dettagli per leggere tutte
                le prescrizioni.
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
