// Ricerca nell'anagrafica AIFA: per nome commerciale o per principio attivo.
//
// Esiste perche' "farmaco non trovato" non e' una risposta utile. I casi sono reali e frequenti:
// il nome e' stato scritto storpiato, il farmaco e' un generico registrato con un'altra
// denominazione, oppure l'operatore conosce il principio attivo ma non il nome commerciale.
// Prima questa situazione produceva silenzio — nessuna icona e nessuna spiegazione.
//
// Un solo corpo (`RicercaFarmaco`) servito in due contorni: la modale che si apre dalla riga di
// terapia, senza far perdere il contesto del paziente, e la pagina dedicata per una consultazione
// piu' ampia. La logica non e' duplicata.
//
// PRIVACY: la query e' cio' che l'operatore digita. Nessun dato di paziente entra nell'URL.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMedicationSearch } from './useMedicationSearch';
import type { MedicationSearchCriterion } from './medicationSearch';
import { IcoSearch, IcoX } from '../../../icons';
import { documentoDi, testoConfezione, type FarmacoTrovato } from './farmacoDocumento';
import type { DocumentoFarmaco } from './farmacoDocumento';
import './RicercaFarmaco.css';

interface CorpoProps {
  /** Nome da cui partire: il farmaco della riga di terapia che non è stato risolto. */
  nomeIniziale?: string;
  /** Apre il documento ufficiale della confezione scelta. Assente = i risultati non sono apribili. */
  onApriDocumento?: (documento: DocumentoFarmaco, confezione: FarmacoTrovato) => void;
}

export function RicercaFarmaco({ nomeIniziale = '', onApriDocumento }: CorpoProps) {
  const [query, setQuery] = useState(nomeIniziale);
  const [criterio, setCriterio] = useState<MedicationSearchCriterion>('nome');
  const search = useMedicationSearch(query, criterio);
  const campo = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  return (
    <div className="ricerca-farmaco">
      <div className="ricerca-farmaco__campo">
        <IcoSearch />
        <input
          ref={campo}
          type="search"
          value={query}
          maxLength={80}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            criterio === 'nome'
              ? 'Nome commerciale — es. Tachipirina'
              : 'Principio attivo — es. paracetamolo'
          }
          aria-label={
            criterio === 'nome' ? 'Cerca per nome commerciale' : 'Cerca per principio attivo'
          }
        />
      </div>

      <div
        className="filter-chips ricerca-farmaco__criterio"
        role="group"
        aria-label="Criterio di ricerca"
      >
        {(
          [
            ['nome', 'Nome commerciale'],
            ['principio-attivo', 'Principio attivo'],
          ] as [MedicationSearchCriterion, string][]
        ).map(([valore, etichetta]) => (
          <button
            key={valore}
            type="button"
            className={`filter-chip${criterio === valore ? ' active' : ''}`}
            aria-pressed={criterio === valore}
            onClick={() => setCriterio(valore)}
          >
            {etichetta}
          </button>
        ))}
      </div>

      <div className="ricerca-farmaco__esiti" aria-live="polite">
        {search.phase === 'idle' && query.trim().length > 0 && query.trim().length < 3 && (
          <p className="ricerca-farmaco__nota">Almeno tre caratteri per cercare.</p>
        )}
        {search.phase === 'loading' && <p className="ricerca-farmaco__nota">Ricerca in corso…</p>}
        {search.phase === 'error' && (
          <p className="ricerca-farmaco__nota ricerca-farmaco__nota--errore">
            L'anagrafica non risponde. Se non è mai stata caricata, va importata dalla pagina di
            configurazione: la ricerca non può trovare ciò che non è in archivio.
          </p>
        )}
        {search.phase === 'ready' && search.items.length === 0 && !search.nextCursor && (
          <p className="ricerca-farmaco__nota">
            Nessun farmaco corrisponde a «{query.trim()}»
            {criterio === 'nome' ? ' fra i nomi commerciali. Provare per principio attivo.' : '.'}
          </p>
        )}
        {search.items.length > 0 && (
          <ul className="ricerca-farmaco__lista">
            {search.items.map((f) => (
              <RigaEsito key={f.aic} farmaco={f} onApriDocumento={onApriDocumento} />
            ))}
          </ul>
        )}
        {(search.nextCursor || search.phase === 'error') && (
          <button
            type="button"
            className="ricerca-farmaco__apri"
            disabled={search.phase === 'loading'}
            onClick={search.phase === 'error' ? search.retry : search.loadMore}
          >
            {search.phase === 'error' ? 'Riprova ricerca' : 'Continua ricerca'}
          </button>
        )}
        {search.nextCursor && search.items.length === 0 && (
          <p className="ricerca-farmaco__nota">La ricerca può proseguire su altre confezioni.</p>
        )}
      </div>
    </div>
  );
}

function RigaEsito({
  farmaco,
  onApriDocumento,
}: {
  farmaco: FarmacoTrovato;
  onApriDocumento?: (documento: DocumentoFarmaco, confezione: FarmacoTrovato) => void;
}) {
  const documento = documentoDi(farmaco);
  const revocato = /revocat|sospes/i.test(farmaco.statoAmministrativo ?? '');

  return (
    <li className="ricerca-farmaco__riga">
      <div>
        <p className="ricerca-farmaco__nome">
          {farmaco.denominazione}
          {revocato && (
            // Lo stato amministrativo non è un dettaglio burocratico: un farmaco revocato non è
            // più in commercio, e proporlo come se lo fosse sarebbe fuorviante.
            <span className="ricerca-farmaco__revocato">{farmaco.statoAmministrativo}</span>
          )}
        </p>
        <p className="ricerca-farmaco__dettagli">{testoConfezione(farmaco)}</p>
        <p className="ricerca-farmaco__dettagli">AIC {farmaco.aic}</p>
        {farmaco.principiAttivi && farmaco.principiAttivi.length > 0 && (
          <p className="ricerca-farmaco__pa">
            {farmaco.principiAttivi
              .map((p) => [p.nome, p.quantita, p.unita].filter(Boolean).join(' '))
              .join(' · ')}
          </p>
        )}
      </div>
      {documento && onApriDocumento ? (
        <button
          type="button"
          className="ricerca-farmaco__apri"
          onClick={() => onApriDocumento(documento, farmaco)}
        >
          Apri {documento.tipo === 'rcp' ? 'RCP' : 'foglietto'}
        </button>
      ) : (
        <span className="ricerca-farmaco__nota">Nessun documento ufficiale</span>
      )}
    </li>
  );
}

// ── Contorno 1: modale dalla riga di terapia ────────────────────────────────────────────────

export function RicercaFarmacoModal({
  nomeIniziale,
  onChiudi,
  onApriDocumento,
}: CorpoProps & { onChiudi: () => void }) {
  useEffect(() => {
    function chiudiConEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onChiudi();
    }
    window.addEventListener('keydown', chiudiConEsc);
    return () => window.removeEventListener('keydown', chiudiConEsc);
  }, [onChiudi]);

  // Portal su `document.body`: come il visore, altrimenti la navigazione L2 della scheda finisce
  // sopra la modale e ne intercetta i clic.
  return createPortal(
    <div className="modal-overlay" onClick={onChiudi}>
      <div
        className="modal-box ricerca-farmaco-modale"
        role="dialog"
        aria-modal="true"
        aria-label="Cerca un farmaco in anagrafica"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ricerca-farmaco-modale__testa">
          <div>
            <h2>Cerca il farmaco in anagrafica</h2>
            {nomeIniziale && (
              <p className="ricerca-farmaco__nota">
                «{nomeIniziale}» non risulta in anagrafica AIFA. Può essere un galenico, un farmaco
                estero, o un nome scritto in modo diverso da quello registrato.
              </p>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IcoX />
          </button>
        </header>
        <RicercaFarmaco nomeIniziale={nomeIniziale} onApriDocumento={onApriDocumento} />
      </div>
    </div>,
    document.body,
  );
}
