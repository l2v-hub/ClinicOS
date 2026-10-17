import { useEffect, useRef } from 'react';
import { PageHeader } from '../shared/PageHeader';
import { useAiImportStatus } from '../shared/useAiImportStatus';
import { IcoAI, IcoCamera, IcoEdit } from '../../icons';
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

  // #450: lettera e trasferimento fanno la stessa cosa (documenti letti dall'AI): una sola strada.
  const DOCS = [
    {
      key: 'documenti',
      icon: <IcoCamera />,
      title: 'Lettera o trasferimento',
      text: 'Fotografa le pagine o carica PDF e foto, anche più file: l’AI propone i dati, tu li verifichi.',
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
    </div>
  );
}
