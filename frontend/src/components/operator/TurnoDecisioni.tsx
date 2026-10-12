import { useId } from 'react';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import { landingOf } from '../../lib/patientTargetResolver';
import type { UnreadDiaryEntry } from '../../lib/diaryUnreadQueue';
import { unreadLanding, unreadName } from '../../lib/turnoUnread';
import { urgencyTime } from '../../lib/urgency';
import { UnreadAction, type UnreadQueue } from './TurnoDaLeggere';

export interface DecisioneFarmaci {
  patientId: string;
  nome: string;
  farmaci: string[];
  totale: number;
  therapyId?: string;
}

/** Turno del medico (#446): una sola lista «Serve una tua decisione», nell'ordine in cui va
 *  affrontata — urgenze da prendere in carico, terapie da verificare, poi le dosi non registrate
 *  come sola informazione. Nessuna azione di somministrazione. */
export function TurnoDecisioni({
  urgenti,
  urgentiState,
  urgentiAtLeast,
  queue,
  farmaci,
  farmaciState,
  dosiNonRegistrate,
  onSelectPaziente,
  onOpenLateTherapy,
}: {
  urgenti: UnreadDiaryEntry[];
  urgentiState: 'loading' | 'ready' | 'error';
  urgentiAtLeast: boolean;
  queue: UnreadQueue;
  farmaci: DecisioneFarmaci[];
  farmaciState: 'loading' | 'ready' | 'error';
  dosiNonRegistrate: { dosi: number; pazienti: number } | null;
  onSelectPaziente?: (nome: string, id?: string, landing?: PatientLanding) => void;
  onOpenLateTherapy: () => void;
}) {
  const titleId = useId();
  const count = urgenti.length + farmaci.length;
  return (
    <section className="turno-card turno-decisioni" aria-labelledby={titleId}>
      <div className="turno-card__head">
        <div className="turno-card__title">
          <h2 className="turno-h2" id={titleId}>
            Serve una tua decisione{count > 0 ? ` · ${count}` : ''}
          </h2>
        </div>
      </div>
      <ol className="turno-decisioni__list">
        {urgenti.map((row) => (
          <li key={row.id} className="turno-decisione is-urgent" data-unread-id={row.id}>
            <div>
              <p className="turno-decisione__kind">
                Urgente · segnalato {urgencyTime(row.entryDateTime)} · {row.authorName}
              </p>
              <p className="turno-decisione__what">
                <strong>{unreadName(row)}</strong>
                {row.title ? ` — ${row.title}` : ''}
              </p>
              <p className="turno-decisione__text">{row.content}</p>
            </div>
            <div className="turno-decisione__actions">
              <UnreadAction row={row} queue={queue} />
              {onSelectPaziente && (
                <button
                  type="button"
                  className="ds-link"
                  onClick={() =>
                    onSelectPaziente(unreadName(row), row.patientId, unreadLanding(row))
                  }
                >
                  {row.sourceType === 'consegna' ? 'Apri consegna' : 'Apri diario'}
                </button>
              )}
            </div>
          </li>
        ))}
        {farmaci.map((p) => (
          <li key={`farmaci:${p.patientId}`} className="turno-decisione is-warn">
            <div>
              <p className="turno-decisione__kind">Terapia da verificare</p>
              <p className="turno-decisione__what">
                <strong>{p.nome}</strong> — {p.totale}{' '}
                {p.totale === 1 ? 'farmaco non trovato' : 'farmaci non trovati'} in anagrafica AIFA
              </p>
              {p.farmaci.length > 0 && (
                <p className="turno-decisione__text">
                  {p.farmaci.join(', ')}: scegli la confezione corretta
                </p>
              )}
            </div>
            <div className="turno-decisione__actions">
              {onSelectPaziente && (
                <button
                  type="button"
                  className="ds-btn ds-btn--primary"
                  onClick={() =>
                    onSelectPaziente(
                      p.nome,
                      p.patientId,
                      landingOf({
                        kind: 'drug-anomaly',
                        patientId: p.patientId,
                        therapyId: p.therapyId,
                      }),
                    )
                  }
                >
                  {p.totale > 1 ? `Verifica ${p.totale}` : 'Verifica'}
                </button>
              )}
            </div>
          </li>
        ))}
        {urgentiState === 'error' && (
          <li className="turno-decisione is-warn" role="alert">
            <p className="turno-decisione__what">
              Urgenze non disponibili: quelle da prendere in carico potrebbero mancare.
            </p>
          </li>
        )}
        {urgentiAtLeast && (
          <li className="turno-decisione is-warn">
            <p className="turno-decisione__what">
              Ci possono essere altre urgenze oltre le note lette qui: apri Consegne.
            </p>
          </li>
        )}
        {farmaciState === 'error' && (
          <li className="turno-decisione is-warn" role="alert">
            <p className="turno-decisione__what">
              Verifica farmaci non riuscita: le terapie da verificare potrebbero mancare.
            </p>
          </li>
        )}
        {dosiNonRegistrate && dosiNonRegistrate.dosi > 0 && (
          <li className="turno-decisione is-info">
            <div>
              <p className="turno-decisione__kind">Dosi non registrate</p>
              <p className="turno-decisione__what">
                {dosiNonRegistrate.dosi} {dosiNonRegistrate.dosi === 1 ? 'dose' : 'dosi'} di oggi
                senza registrazione su {dosiNonRegistrate.pazienti}{' '}
                {dosiNonRegistrate.pazienti === 1 ? 'paziente' : 'pazienti'}
              </p>
              <p className="turno-decisione__text">
                Le registra l'infermiere · utile se vuoi rivalutare la terapia
              </p>
            </div>
            <div className="turno-decisione__actions">
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                onClick={onOpenLateTherapy}
              >
                Vedi
              </button>
            </div>
          </li>
        )}
      </ol>
      {count === 0 && farmaciState === 'ready' && urgentiState === 'ready' && !urgentiAtLeast && (
        <p className="turno-empty" role="status">
          Nessuna decisione in sospeso.
        </p>
      )}
    </section>
  );
}
