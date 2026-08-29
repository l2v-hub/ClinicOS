// Avviso «questo paziente ha farmaci da sanare», condiviso dalle superfici che lo mostrano.
//
// Un solo componente per testa della cartella e scheda terapia: due avvisi scritti separatamente
// finirebbero per contraddirsi, ed e' l'ultima cosa che serve su un allarme clinico.
//
// COLORE: ambra, non rosso. In ClinicOS il rosso e' riservato agli allarmi clinici — un'allergia,
// un parametro fuori soglia. Un farmaco scritto male e' un dato da correggere, urgente ma non
// pericoloso di per se': dargli lo stesso peso visivo di un'allergia svaluterebbe entrambi.

import type { AnomaliePaziente } from './anomalieFarmaco';
import { messaggioAnomalie, messaggioAnomalieCompatto } from './anomalieFarmaco';
import './AvvisoAnomalieFarmaci.css';

interface Props {
  esito: AnomaliePaziente;
  /** Testo dell'azione (es. «Vai alla terapia»). Senza `onAzione` non viene mostrata. */
  etichettaAzione?: string;
  onAzione?: () => void;
  /**
   * Precisa a quali terapie si riferisce il conteggio. Serve dove i dati vengono da
   * `/therapy-slots`, che copre solo le terapie attive di oggi.
   */
  ambito?: string;
  compatto?: boolean;
}

export function AvvisoAnomalieFarmaci({
  esito,
  etichettaAzione,
  onAzione,
  ambito,
  compatto = false,
}: Props) {
  // Nessuna anomalia: nessun avviso. Un riquadro verde «tutto in ordine» su ogni cartella
  // diventerebbe arredamento, e l'arredamento non si legge piu'.
  if (esito.totale === 0) return null;

  return (
    <div
      className={`avviso-anomalie${compatto ? ' avviso-anomalie--compatto' : ''}`}
      role="status"
      data-anomalie={esito.totale}
    >
      <span className="avviso-anomalie__icona" aria-hidden="true">
        !
      </span>
      <div className="avviso-anomalie__testo">
        <p className="avviso-anomalie__titolo">
          Anomalie da sanare su questo paziente
          {ambito && <span className="avviso-anomalie__ambito"> — {ambito}</span>}
        </p>
        <p className="avviso-anomalie__dettaglio">{messaggioAnomalie(esito)}</p>
        {esito.verificaIncompleta && (
          // Dichiararlo evita che l'assenza di altre anomalie venga letta come «tutto verificato».
          <p className="avviso-anomalie__parziale">
            Verifica incompleta: l'anagrafica farmaci non ha risposto per tutti i farmaci, altre
            anomalie potrebbero non essere elencate.
          </p>
        )}
      </div>
      {etichettaAzione && onAzione && (
        <button type="button" className="avviso-anomalie__azione" onClick={onAzione}>
          {etichettaAzione}
        </button>
      )}
    </div>
  );
}

/** Indicatore minimo per una riga di elenco: solo il numero, con il perché nel titolo. */
export function IndicatoreAnomalie({ esito }: { esito: AnomaliePaziente }) {
  if (esito.totale === 0) return null;
  const messaggio = messaggioAnomalieCompatto(esito);
  return (
    <span
      className="indicatore-anomalie"
      title={messaggio}
      aria-label={messaggio}
      data-anomalie={esito.totale}
    >
      {esito.totale} da sanare
    </span>
  );
}
