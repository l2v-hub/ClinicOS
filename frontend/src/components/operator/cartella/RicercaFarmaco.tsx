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

import { useEffect, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMedicationSearch } from './useMedicationSearch';
import type { MedicationSearchCriterion } from './medicationSearch';
import { IcoPill, IcoSearch, IcoX } from '../../../icons';
import { documentoDi, type FarmacoTrovato } from './farmacoDocumento';
import type { DocumentoFarmaco } from './farmacoDocumento';
import { TableFilters } from '../../shared/TableFilters';
import { filterPackages, packageForms, packageDocumentName, initialSearchPresentation, searchPresentationReducer } from './drugSearchPresentation';
import './RicercaFarmaco.css';

interface CorpoProps {
  /** Nome da cui partire: il farmaco della riga di terapia che non è stato risolto. */
  nomeIniziale?: string;
  /** Apre il documento ufficiale della confezione scelta. Assente = i risultati non sono apribili. */
  onApriDocumento?: (documento: DocumentoFarmaco, confezione: FarmacoTrovato) => void;
}

export function RicercaFarmaco({ nomeIniziale = '', onApriDocumento }: CorpoProps) {
  const [{ query, criterion: criterio, filters }, dispatch] = useReducer(searchPresentationReducer, nomeIniziale, initialSearchPresentation);
  const search = useMedicationSearch(query, criterio);
  const visiblePackages = filterPackages(search.items, filters);
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
          onChange={(e) => dispatch({ type: 'query', value: e.target.value })}
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
            onClick={() => dispatch({ type: 'criterion', value: valore })}
          >
            {etichetta}
          </button>
        ))}
      </div>

      {search.items.length > 0 && (
        <div className="ricerca-farmaco__filtri">
          <p className="ricerca-farmaco__nota">
            Filtri sulle {search.items.length} confezioni caricate per «{query.trim()}».
            {search.nextCursor && ' Altre confezioni disponibili con Continua ricerca.'}
          </p>
          <TableFilters
            tableLabel="farmaci"
            fields={[
              { key: 'forma', label: 'Forma farmaceutica', type: 'select', options: packageForms(search.items).map((form) => ({ value: form, label: form })) },
              { key: 'confezione', label: 'Dosaggio / confezione', type: 'text' },
            ]}
            values={{ ...filters }}
            onChange={(key, value) => {
              if (key === 'forma' || key === 'confezione') dispatch({ type: 'filter', key, value });
            }}
            onClear={() => dispatch({ type: 'clear' })}
            resultCount={visiblePackages.length}
            totalCount={search.items.length}
          />
        </div>
      )}

      <div className="ricerca-farmaco__esiti" aria-live="polite">
        {query.trim().length === 0 && (
          <p className="ricerca-farmaco__nota ricerca-farmaco__vuoto">
            Scrivi almeno tre lettere del nome commerciale o del principio attivo: l'anagrafica AIFA
            si consulta cercando.
          </p>
        )}
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
        {search.items.length > 0 && visiblePackages.length === 0 && (
          <p className="ricerca-farmaco__nota">Nessuna confezione caricata corrisponde ai filtri. Azzera i filtri o continua la ricerca, se disponibile.</p>
        )}
        {visiblePackages.length > 0 && (
          <ul className="ricerca-farmaco__lista">
            {visiblePackages.map((f) => (
              <RigaEsito key={f.aic} farmaco={f} onApriDocumento={onApriDocumento} />
            ))}
          </ul>
        )}
        {(search.nextCursor || search.phase === 'error') && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
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
      <span className="ricerca-farmaco__icona" aria-hidden="true">
        <IcoPill />
      </span>
      <div className="ricerca-farmaco__testo">
        <p className="ricerca-farmaco__nome">
          {farmaco.denominazione}
          {revocato && (
            // Lo stato amministrativo non è un dettaglio burocratico: un farmaco revocato non è
            // più in commercio, e proporlo come se lo fosse sarebbe fuorviante.
            <span className="ricerca-farmaco__revocato">{farmaco.statoAmministrativo}</span>
          )}
        </p>
        <p className="ricerca-farmaco__confezione">{farmaco.descrizione || 'Dosaggio / confezione non indicati'}</p>
        <p className="ricerca-farmaco__forma">{farmaco.forma || 'Forma farmaceutica non indicata'}</p>
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
          className="ds-btn ds-btn--secondary"
          aria-label={packageDocumentName(farmaco, documento)}
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
