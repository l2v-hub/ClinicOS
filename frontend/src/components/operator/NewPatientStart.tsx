import { useEffect, useRef } from 'react';
import { PageHeader } from '../shared/PageHeader';
import { useAiImportStatus } from '../shared/useAiImportStatus';
import { IcoAI, IcoCamera, IcoEdit, IcoUpload } from '../../icons';
import type { NewPatientPath } from './NewPatientChooser';
import './NewPatientStart.css';

interface Props {
  onChoose: (path: NewPatientPath) => void;
  onBack: () => void;
}

/** Pagina "Nuovo ingresso" (HMI 1): come arriva il paziente. Porta ai flussi di sempre: import dei
 *  documenti (lettera o file del trasferimento) oppure inserimento guidato a mano. */
export function NewPatientStart({ onChoose, onBack }: Props) {
  const { loading, available, reason } = useAiImportStatus();
  // All'apertura il fuoco va sulla pagina: il Tab parte da qui, non dal fondo del documento.
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => pageRef.current?.focus(), []);
  const docsEnabled = available && !loading;
  const docsStatus = loading ? 'Verifica del servizio AI in corso…' : !available ? reason : null;

  const DOCS = [
    {
      key: 'lettera',
      icon: <IcoCamera />,
      title: 'Da lettera di dimissione',
      text: 'Scansiona le pagine con la fotocamera o carica PDF e foto: l’AI propone i dati, tu li verifichi.',
    },
    {
      key: 'trasferimento',
      icon: <IcoUpload />,
      title: 'Da file del trasferimento',
      text: 'Carica i PDF ricevuti dalla struttura, anche più file insieme. Puoi riordinare, rimuovere o sostituire le pagine.',
    },
  ];

  return (
    <div className="nps" ref={pageRef} tabIndex={-1} role="region" aria-label="Nuovo ingresso">
      <PageHeader title="Nuovo ingresso" subtitle="Scegli come arriva il paziente" />
      <div className="nps__top">
        <button type="button" className="ds-link" onClick={onBack}>
          ← Torna ai pazienti
        </button>
      </div>
      <div className="nps__options">
        {DOCS.map((d) => (
          <button
            type="button"
            key={d.key}
            className="nps-option"
            disabled={!docsEnabled}
            aria-busy={loading}
            onClick={() => onChoose('documenti')}
          >
            <span className="nps-option__icon" aria-hidden="true">
              {d.icon}
            </span>
            <span className="nps-option__title">{d.title}</span>
            <span className="nps-option__text">{d.text}</span>
            {docsStatus ? (
              <span className="nps-option__status nps-option__status--off">{docsStatus}</span>
            ) : (
              <span className="nps-option__status">
                <IcoAI /> Compilazione assistita dall’AI
              </span>
            )}
          </button>
        ))}
        <button type="button" className="nps-option" onClick={() => onChoose('manuale')}>
          <span className="nps-option__icon" aria-hidden="true">
            <IcoEdit />
          </span>
          <span className="nps-option__title">A mano</span>
          <span className="nps-option__text">
            Inserisci anagrafica, ingresso e dati clinici passo per passo.
          </span>
        </button>
      </div>
      <section className="ds-card nps__how" aria-labelledby="nps-how-title">
        <h2 id="nps-how-title" className="ds-eyebrow">
          Come funziona
        </h2>
        <div className="nps__how-grid">
          <div>
            <h3 className="nps__how-title">L’AI propone, tu confermi</h3>
            <p className="nps__how-text">
              Dai documenti l’AI compila i campi, poi li verifichi prima di confermare.
            </p>
          </div>
          <div>
            <h3 className="nps__how-title">Pagine sotto controllo</h3>
            <p className="nps__how-text">
              Puoi riordinare, rimuovere o sostituire una pagina prima di procedere.
            </p>
          </div>
          <div>
            <h3 className="nps__how-title">Bozza quando serve</h3>
            <p className="nps__how-text">
              Nell’inserimento a mano puoi salvare la bozza e chiudere, per riprenderla in questa
              sessione.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
