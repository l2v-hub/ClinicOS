// Risolve i farmaci di una scheda terapia nei rispettivi documenti ufficiali AIFA.
//
// I link arrivano dall'anagrafica AIFA gia' importata (campi `linkRcp` / `linkFi` di `Farmaco`)
// attraverso `GET /farmaci/cerca`. Qui non si decide nulla di clinico: si mette a disposizione
// dell'operatore la fonte ufficiale, che resta l'unica autorita' sulla posologia.
//
// PRIVACY: la ricerca viaggia col solo nome commerciale del farmaco. Nessun identificativo di
// paziente entra mai nell'URL.

import { useEffect, useState } from 'react';
import { cachedGetJson } from '../../../lib/cachedFetch';
import {
  chiaviDistinte,
  documentoDi,
  type DocumentoFarmaco,
  type FarmacoTrovato,
} from './farmacoDocumento';

export { chiaveFarmaco, etichettaDocumento } from './farmacoDocumento';
export type { DocumentoFarmaco } from './farmacoDocumento';

const API_URL = import.meta.env.VITE_API_URL || '';

// L'anagrafica AIFA si aggiorna al massimo una volta al giorno: una cache lunga evita di ripetere
// la stessa ricerca a ogni render della scheda. Il TTL breve di default (15s) serve a dati che
// cambiano, non a un'anagrafica di prodotto.
const TTL_MS = 12 * 60 * 60 * 1000;

interface RispostaRicerca {
  query: string;
  esiti: FarmacoTrovato[];
}

/**
 * Risolve una lista di nomi farmaco nei rispettivi documenti ufficiali.
 *
 * I nomi sono deduplicati prima della chiamata e `cachedGetJson` condivide le richieste in volo
 * sullo stesso URL: dieci righe di sei farmaci distinti producono sei richieste, non dieci.
 *
 * Un farmaco non trovato — galenico, estero, nome storpiato — semplicemente non compare nella
 * mappa: la riga di terapia resta identica a com'e' oggi, senza icona e senza errori.
 */
export function useDocumentiFarmaco(nomi: string[]): Map<string, DocumentoFarmaco> {
  const [documenti, setDocumenti] = useState<Map<string, DocumentoFarmaco>>(new Map());
  // Chiave di dipendenza stabile e ordinata: un riordino della tabella non rilancia le ricerche.
  const chiaviUniche = chiaviDistinte(nomi).join('\n');

  useEffect(() => {
    if (!chiaviUniche) {
      setDocumenti(new Map());
      return;
    }
    let annullato = false;

    void Promise.all(
      chiaviUniche.split('\n').map(async (chiave): Promise<[string, DocumentoFarmaco] | null> => {
        try {
          const risposta = await cachedGetJson<RispostaRicerca>(
            `${API_URL}/farmaci/cerca?q=${encodeURIComponent(chiave)}&limite=1`,
            TTL_MS,
          );
          const primo = risposta?.esiti?.[0];
          const doc = primo ? documentoDi(primo) : null;
          return doc ? [chiave, doc] : null;
        } catch {
          // Anagrafica non caricata o ricerca fallita: si degrada in silenzio, senza icona.
          // Un errore qui non deve mai rompere la scheda terapia.
          return null;
        }
      }),
    ).then((coppie) => {
      if (annullato) return;
      setDocumenti(new Map(coppie.filter((c): c is [string, DocumentoFarmaco] => c !== null)));
    });

    return () => {
      annullato = true;
    };
  }, [chiaviUniche]);

  return documenti;
}
