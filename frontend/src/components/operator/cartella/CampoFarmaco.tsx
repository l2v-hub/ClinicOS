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

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../../config';
import { IcoSearch } from '../../../icons';
import { testoConfezione, type FarmacoTrovato } from './farmacoDocumento';
import { PHARMA_FORMS } from './therapyDose';
import { normalizza } from './farmacoCorrispondenza';
import './CampoFarmaco.css';
const LIMITE = 12;
const ATTESA_MS = 300;
const MINIMO_CARATTERI = 3;

type Criterio = 'nome' | 'principio-attivo';

type Esito =
  | { fase: 'inerte' }
  | { fase: 'cerco' }
  | { fase: 'trovati'; farmaci: FarmacoTrovato[] }
  | { fase: 'errore' };

interface Props {
  /** Nome corrente della terapia: stringa vuota su una terapia nuova. */
  valore: string;
  /** Forma farmaceutica corrente, per non sovrascriverla quando la selezione non la determina. */
  forma: string;
  onCambia: (dati: { farmacoNome: string; pharmaceuticalForm?: string }) => void;
}

/** Riconduce la forma AIFA («Compressa effervescente») a una delle forme della maschera. */
export function formaDellaMaschera(formaAifa: string | null | undefined): string | undefined {
  if (!formaAifa) return undefined;
  const n = normalizza(formaAifa);
  // L'ordine conta: «soluzione per infusione» deve dare fiala, non flacone, e va controllato
  // prima di parole piu' generiche.
  const regole: [RegExp, string][] = [
    [/compress|cpr/, 'compressa'],
    [/capsul/, 'capsula'],
    [/sciroppo/, 'sciroppo'],
    [/iniett|infusion|fiala|fiale/, 'fiala'],
    [/bustin|granulat|polvere/, 'bustina'],
    [/gocce|goccia/, 'gocce'],
    [/cerotto|transdermic/, 'cerotto'],
    [/crema|unguento|pomata|gel/, 'crema'],
    [/flacone|soluzion|sospension/, 'flacone'],
  ];
  const trovata = regole.find(([re]) => re.test(n))?.[1];
  return trovata && PHARMA_FORMS.includes(trovata) ? trovata : undefined;
}

export function CampoFarmaco({ valore, forma, onCambia }: Props) {
  const [query, setQuery] = useState('');
  const [criterio, setCriterio] = useState<Criterio>('nome');
  const [esito, setEsito] = useState<Esito>({ fase: 'inerte' });
  /** true quando il nome corrente arriva da una selezione in anagrafica, non da testo libero. */
  const [daAnagrafica, setDaAnagrafica] = useState(false);
  const [fuoriAnagrafica, setFuoriAnagrafica] = useState(false);
  const contenitore = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const testo = query.trim();
    if (testo.length < MINIMO_CARATTERI) {
      setEsito({ fase: 'inerte' });
      return;
    }

    let annullato = false;
    const controller = new AbortController();
    setEsito({ fase: 'cerco' });
    const attesa = setTimeout(() => {
      const pa = criterio === 'principio-attivo' ? '&pa=1' : '';
      void fetch(`${API_URL}/farmaci/cerca?q=${encodeURIComponent(testo)}&limite=${LIMITE}${pa}`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((dati: { esiti?: FarmacoTrovato[] }) => {
          if (annullato) return;
          setEsito({ fase: 'trovati', farmaci: Array.isArray(dati.esiti) ? dati.esiti : [] });
        })
        .catch((error: unknown) => {
          if (!annullato && (error as Error)?.name !== 'AbortError') {
            setEsito({ fase: 'errore' });
          }
        });
    }, ATTESA_MS);

    return () => {
      annullato = true;
      clearTimeout(attesa);
      controller.abort();
    };
  }, [query, criterio]);

  function seleziona(farmaco: FarmacoTrovato) {
    const formaMaschera = formaDellaMaschera(farmaco.forma);
    onCambia({
      farmacoNome: farmaco.denominazione,
      // Non si sovrascrive la forma quando l'anagrafica non permette di dedurla.
      pharmaceuticalForm: formaMaschera ?? forma,
    });
    setDaAnagrafica(true);
    setFuoriAnagrafica(false);
    setQuery('');
    setEsito({ fase: 'inerte' });
  }

  function usaComunque() {
    const testo = query.trim();
    if (!testo) return;
    onCambia({ farmacoNome: testo });
    setDaAnagrafica(false);
    setFuoriAnagrafica(true);
    setQuery('');
    setEsito({ fase: 'inerte' });
  }

  function cambiaFarmaco() {
    onCambia({ farmacoNome: '' });
    setDaAnagrafica(false);
    setFuoriAnagrafica(false);
    setQuery('');
  }

  // Farmaco gia' scelto: si mostra cio' che e' stato scelto, non un campo da ricompilare.
  if (valore) {
    return (
      <div className="form-group">
        <label>Prodotto medicinale *</label>
        <div className={`campo-farmaco__scelto${fuoriAnagrafica ? ' is-fuori-anagrafica' : ''}`}>
          <div>
            <p className="campo-farmaco__nome">{valore}</p>
            <p className="campo-farmaco__stato">
              {daAnagrafica
                ? 'Selezionato dall’anagrafica AIFA'
                : fuoriAnagrafica
                  ? 'Nome libero: non risulta in anagrafica AIFA, comparirà fra le anomalie da sanare'
                  : 'Nome già presente in terapia: non verificato in questa maschera'}
            </p>
          </div>
          <button type="button" className="campo-farmaco__cambia" onClick={cambiaFarmaco}>
            Cambia
          </button>
        </div>
      </div>
    );
  }

  const testo = query.trim();
  const nessunEsito = esito.fase === 'trovati' && esito.farmaci.length === 0;

  return (
    <div className="form-group" ref={contenitore}>
      <label>Prodotto medicinale *</label>

      <div className="campo-farmaco__criterio" role="group" aria-label="Criterio di ricerca">
        {(
          [
            ['nome', 'Nome commerciale'],
            ['principio-attivo', 'Principio attivo'],
          ] as [Criterio, string][]
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
          className="campo-farmaco__input"
          type="search"
          value={query}
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
        {esito.fase === 'cerco' && <p className="campo-farmaco__nota">Ricerca in corso…</p>}
        {esito.fase === 'errore' && (
          <p className="campo-farmaco__nota campo-farmaco__nota--errore">
            L’anagrafica farmaci non risponde. Il farmaco si può inserire come nome libero, ma
            resterà da verificare.
          </p>
        )}
        {esito.fase === 'trovati' && esito.farmaci.length > 0 && (
          <ul className="campo-farmaco__lista">
            {esito.farmaci.map((f) => (
              <li key={f.aic}>
                <button type="button" onClick={() => seleziona(f)}>
                  <span className="campo-farmaco__nome">{f.denominazione}</span>
                  <span className="campo-farmaco__dettagli">{testoConfezione(f)}</span>
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
        {(nessunEsito || esito.fase === 'errore') && testo.length >= MINIMO_CARATTERI && (
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
              Da usare per preparati galenici o farmaci esteri. Comparirà fra le anomalie da sanare
              finché non è ricondotto all’anagrafica.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
