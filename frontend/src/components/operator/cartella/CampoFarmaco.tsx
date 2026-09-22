// Campo farmaco della maschera terapia: si cerca in anagrafica AIFA e si seleziona.
//
// PERCHE' SOSTITUISCE UN CAMPO DI TESTO. Prima qui c'era un `<input>` libero con placeholder
// «es. Kanrenol»: qualunque cosa si scrivesse finiva in terapia senza un controllo. E' la causa a
// monte dei farmaci che poi non risultano in anagrafica — un refuso di battitura diventava una
// prescrizione, e nessuno se ne accorgeva finche' non apriva quella riga.
//
// Un preparato galenico o un farmaco estero pero' esiste e va prescrivibile: bloccare tutto cio'
// che non e' in anagrafica romperebbe un flusso legittimo. Percio' si puo' usare un nome libero,
// ma solo con un'azione deliberata, che e' diversa dal digitare e passare avanti.

import { useId, useRef, useState } from 'react';
import { useMedicationSearch } from './useMedicationSearch';
import { SelectedDrugPackage } from './SelectedDrugPackage';
import { freeTextDrug, selectDrugPackage } from './drugPackageSelection';
import type { MedicationSearchCriterion } from './medicationSearch';
import type { TherapyFormValue } from './TherapyFormFields';
import { IcoSearch } from '../../../icons';
import { testoConfezione, type FarmacoTrovato } from './farmacoDocumento';
export { formaDellaMaschera } from './drugPackageSelection';

import type { TherapyFieldAttributes } from './therapyFieldFeedback';
import './CampoFarmaco.css';
const MINIMO_CARATTERI = 3;

interface Props {
  /** Nome corrente della terapia: stringa vuota su una terapia nuova. */
  valore: string;
  /** Forma farmaceutica corrente, per non sovrascriverla quando la selezione non la determina. */
  forma: string;
  drugPackageRef?: string | null;
  packageDetached?: boolean;
  onCambia: (dati: Partial<TherapyFormValue>) => void;
  validation?: TherapyFieldAttributes;
}

export function CampoFarmaco({
  valore,
  forma,
  drugPackageRef,
  packageDetached,
  onCambia,
  validation,
}: Props) {
  const fieldId = useId();
  const [query, setQuery] = useState('');
  const [criterio, setCriterio] = useState<MedicationSearchCriterion>('nome');
  const search = useMedicationSearch(query, criterio);
  const [selected, setSelected] = useState<FarmacoTrovato | null>(null);
  const [fuoriAnagrafica, setFuoriAnagrafica] = useState(false);
  const contenitore = useRef<HTMLDivElement | null>(null);

  function seleziona(farmaco: FarmacoTrovato) {
    onCambia(selectDrugPackage(farmaco, forma));
    setSelected(farmaco);
    setFuoriAnagrafica(false);
    setQuery('');
  }

  function usaComunque() {
    const testo = query.trim();
    if (!testo) return;
    onCambia(freeTextDrug(testo));
    setSelected(null);
    setFuoriAnagrafica(true);
    setQuery('');
  }

  function cambiaFarmaco() {
    onCambia(freeTextDrug(''));
    setSelected(null);
    setFuoriAnagrafica(false);
    setQuery('');
  }

  // Farmaco gia' scelto: si mostra cio' che e' stato scelto, non un campo da ricompilare.
  if (valore) {
    return (
      <div className="form-group">
        <span className="therapy-form__field-label">Prodotto medicinale *</span>
        <div className={`campo-farmaco__scelto${fuoriAnagrafica ? ' is-fuori-anagrafica' : ''}`}>
          <div>
            <p className="campo-farmaco__nome">{valore}</p>
            {drugPackageRef ? (
              <SelectedDrugPackage aic={drugPackageRef} selected={selected} />
            ) : (
              <p className="campo-farmaco__stato">
                {packageDetached
                  ? 'Confezione AIFA scollegata dopo la modifica della forma: seleziona nuovamente il prodotto.'
                  : fuoriAnagrafica
                    ? 'Nome libero: non risulta in anagrafica AIFA, comparirà fra le anomalie da sanare'
                    : 'Nome già presente in terapia: non verificato in questa maschera'}
              </p>
            )}{' '}
          </div>
          <button
            type="button"
            className="campo-farmaco__cambia"
            onClick={cambiaFarmaco}
            {...validation}
          >
            Cambia
          </button>
        </div>
      </div>
    );
  }

  const testo = query.trim();
  const nessunEsito = search.phase === 'ready' && search.items.length === 0 && !search.nextCursor;

  return (
    <div className="form-group" ref={contenitore}>
      <label htmlFor={fieldId}>Prodotto medicinale *</label>

      <div className="campo-farmaco__criterio" role="group" aria-label="Criterio di ricerca">
        {(
          [
            ['nome', 'Nome commerciale'],
            ['principio-attivo', 'Principio attivo'],
          ] as [MedicationSearchCriterion, string][]
        ).map(([v, etichetta]) => (
          <button
            key={v}
            type="button"
            className={criterio === v ? 'is-attivo' : undefined}
            aria-pressed={criterio === v}
            onClick={() => setCriterio(v)}
          >
            {etichetta}
          </button>
        ))}
      </div>

      <div className="campo-farmaco__campo">
        <IcoSearch />
        <input
          id={fieldId}
          {...validation}
          className="campo-farmaco__input"
          type="search"
          value={query}
          maxLength={80}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            criterio === 'nome'
              ? 'Cerca il farmaco — es. Tachipirina'
              : 'Cerca il principio attivo — es. paracetamolo'
          }
          aria-label={
            criterio === 'nome'
              ? 'Cerca il farmaco per nome commerciale'
              : 'Cerca il farmaco per principio attivo'
          }
        />
      </div>

      <div className="campo-farmaco__esiti" aria-live="polite">
        {testo.length > 0 && testo.length < MINIMO_CARATTERI && (
          <p className="campo-farmaco__nota">Almeno {MINIMO_CARATTERI} caratteri per cercare.</p>
        )}
        {search.phase === 'loading' && <p className="campo-farmaco__nota">Ricerca in corso…</p>}
        {search.phase === 'error' && (
          <p className="campo-farmaco__nota campo-farmaco__nota--errore">
            L’anagrafica farmaci non risponde. Il farmaco si può inserire come nome libero, ma
            resterà da verificare.
          </p>
        )}
        {search.items.length > 0 && (
          <ul className="campo-farmaco__lista">
            {search.items.map((f) => (
              <li key={f.aic}>
                <button type="button" onClick={() => seleziona(f)}>
                  <span className="campo-farmaco__nome">{f.denominazione}</span>
                  <span className="campo-farmaco__dettagli">{testoConfezione(f)}</span>
                  <span className="campo-farmaco__dettagli">AIC {f.aic}</span>
                  {f.principiAttivi && f.principiAttivi.length > 0 && (
                    <span className="campo-farmaco__pa">
                      {f.principiAttivi.map((p) => p.nome).join(' · ')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {(search.nextCursor || search.phase === 'error') && (
          <button
            type="button"
            className="campo-farmaco__cambia"
            disabled={search.phase === 'loading'}
            onClick={search.phase === 'error' ? search.retry : search.loadMore}
          >
            {search.phase === 'error' ? 'Riprova ricerca' : 'Continua ricerca'}
          </button>
        )}
        {search.nextCursor && search.items.length === 0 && (
          <p className="campo-farmaco__nota">La ricerca può proseguire su altre confezioni.</p>
        )}
        {(nessunEsito ||
          (search.phase === 'error' && !search.nextCursor && search.items.length === 0)) &&
          testo.length >= MINIMO_CARATTERI && (
            <div className="campo-farmaco__ripiego">
              {nessunEsito && (
                <p className="campo-farmaco__nota">
                  Nessun farmaco corrisponde a «{testo}»
                  {criterio === 'nome' && ' fra i nomi commerciali. Provare per principio attivo.'}
                </p>
              )}
              {/* Galenici ed esteri restano prescrivibili, ma con un gesto deliberato. */}
              <button type="button" className="campo-farmaco__usa-comunque" onClick={usaComunque}>
                Usa comunque «{testo}»
              </button>
              <p className="campo-farmaco__nota">
                Da usare per preparati galenici o farmaci esteri. Comparirà fra le anomalie da
                sanare finché non è ricondotto all’anagrafica.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
