// Risolve i farmaci di una scheda terapia nelle confezioni dell'anagrafica e nei rispettivi
// documenti ufficiali AIFA.
//
// I link arrivano dall'anagrafica AIFA gia' importata (campi `linkRcp` / `linkFi` di `Farmaco`)
// attraverso `GET /farmaci/cerca`. Qui non si decide nulla di clinico: si mette a disposizione
// dell'operatore la fonte ufficiale, che resta l'unica autorita' sulla posologia.
//
// PRIVACY: la ricerca viaggia col solo nome commerciale del farmaco. Nessun identificativo di
// paziente entra mai nell'URL.

import { useEffect, useState } from 'react';
import { API_URL } from '../../../config';
import { cachedGetJson } from '../../../lib/cachedFetch';
import {
  chiaveFarmaco,
  chiaviDistinte,
  risolviRiga,
  type FarmacoTrovato,
  type RisoluzioneFarmaco,
} from './farmacoDocumento';

export { chiaveFarmaco, etichettaDocumento, testoConfezione } from './farmacoDocumento';
export type {
  DocumentoFarmaco,
  FarmacoTrovato,
  RisoluzioneFarmaco,
  StatoRisoluzione,
} from './farmacoDocumento';

// L'anagrafica AIFA si aggiorna al massimo una volta al giorno: una cache lunga evita di ripetere
// la stessa ricerca a ogni render della scheda. Il TTL breve di default (15s) serve a dati che
// cambiano, non a un'anagrafica di prodotto.
const TTL_MS = 12 * 60 * 60 * 1000;

// Un farmaco ha molte confezioni: la Tachipirina ne conta decine fra dosaggi e formati. Il
// limite serve a vederle tutte, perche' e' fra loro che si sceglie quella prescritta. Con
// `limite=1` — il valore usato finora — la scelta era di fatto casuale.
const LIMITE_CONFEZIONI = 25;

/** Cio' che serve di una riga di terapia per riconoscere la confezione prescritta. */
export interface RigaDaRisolvere {
  farmacoNome: string;
  dosaggio?: string | null;
  viaSomministrazione?: string | null;
}

interface RispostaRicerca {
  query: string;
  esiti: FarmacoTrovato[];
}

/**
 * Separatore fra nome e dosaggio dentro la chiave.
 *
 * Non uno spazio: lo spazio compare dentro entrambe le parti («TACHIPIRINA 500» prescritta a
 * «1000 MG»), quindi da una chiave gia' composta non si saprebbe piu' dove finisce il nome.
 * Scritto come sequenza di escape e non come byte NUL letterale: invisibile nel sorgente, era
 * gia' costato una ricerca per prefisso che confrontava con uno spazio e non corrispondeva mai.
 */
const SEP_CHIAVE = '\u0000';

/**
 * Chiave di risoluzione della riga: nome **e** dosaggio.
 *
 * Il solo nome non basta piu'. Due righe "Tachipirina 500 mg" e "Tachipirina 1000 mg" cercano lo
 * stesso farmaco ma prescrivono confezioni diverse, e quindi vanno risolte separatamente.
 */
export function chiaveRiga(riga: RigaDaRisolvere): string {
  return `${chiaveFarmaco(riga.farmacoNome)}${SEP_CHIAVE}${(riga.dosaggio ?? '').trim().toUpperCase()}`;
}

/**
 * Indice per solo nome, ricavato una volta per mappa invece che a ogni ricerca.
 *
 * Il ripiego qui sotto scorreva l'intera mappa a ogni riga, e nelle due tabelle di
 * somministrazione — dove la chiave col dosaggio non combacia mai, perche' quelle righe portano
 * `farmacoDose`/`dosage` e non il `dosaggio` con cui la mappa e' costruita — scattava per tutte.
 * Costo: righe x farmaci distinti, a ogni render.
 *
 * `WeakMap` sull'istanza: `useRisoluzioniFarmaco` non muta mai una mappa, ne crea una nuova, e
 * cosi' l'indice non sopravvive ai dati da cui deriva. Vince la prima risoluzione incontrata,
 * che e' esattamente cio' che restituiva la scansione.
 */
const indiciPerNome = new WeakMap<
  Map<string, RisoluzioneFarmaco>,
  Map<string, RisoluzioneFarmaco>
>();

function indicePerNome(
  risoluzioni: Map<string, RisoluzioneFarmaco>,
): Map<string, RisoluzioneFarmaco> {
  const gia = indiciPerNome.get(risoluzioni);
  if (gia) return gia;
  const indice = new Map<string, RisoluzioneFarmaco>();
  for (const [chiave, risoluzione] of risoluzioni) {
    const nome = chiave.slice(0, chiave.indexOf(SEP_CHIAVE));
    if (!indice.has(nome)) indice.set(nome, risoluzione);
  }
  indiciPerNome.set(risoluzioni, indice);
  return indice;
}

/**
 * Cerca la risoluzione di un farmaco nella mappa restituita dal hook.
 *
 * La chiave esatta comprende il dosaggio, ma la stessa cella e' resa anche in tabelle le cui
 * righe non lo portano (programmazione, storico). Per quelle si ripiega su una qualunque
 * risoluzione dello stesso farmaco: l'informazione che si perde e' la formulazione, e il visore
 * la richiedera' all'operatore invece di indovinarla.
 *
 * Il ripiego era descritto ma non funzionante: cercava le chiavi per prefisso «NOME » con uno
 * spazio, mentre il separatore e' `SEP_CHIAVE`, e quindi non corrispondeva mai. In quelle
 * tabelle il farmaco restava senza icona e senza avviso «non in anagrafica» — cioe' proprio i
 * quattro stati distinti che la cella dovrebbe mostrare si riducevano a nessuno.
 */
export function trovaRisoluzione(
  risoluzioni: Map<string, RisoluzioneFarmaco>,
  nome: string,
  dosaggio?: string | null,
): RisoluzioneFarmaco | undefined {
  const esatta = risoluzioni.get(chiaveRiga({ farmacoNome: nome, dosaggio }));
  if (esatta) return esatta;
  return indicePerNome(risoluzioni).get(chiaveFarmaco(nome));
}

/**
 * Risolve le righe di terapia, una ricerca per nome distinto.
 *
 * La rete e' interrogata per NOME (deduplicato), la confezione e' scelta per RIGA: dieci righe di
 * sei farmaci distinti producono sei richieste, e le confezioni si distinguono senza costo
 * aggiuntivo. `cachedGetJson` condivide anche le richieste in volo sullo stesso URL.
 *
 * A differenza della versione precedente, un fallimento non e' silenzioso: la riga riceve lo
 * stato `fonte-non-disponibile`, distinto da `non-trovato`. Sono due cose diverse e l'operatore
 * ha diritto di saperle distinguere.
 */
export function useRisoluzioniFarmaco(righe: RigaDaRisolvere[]): Map<string, RisoluzioneFarmaco> {
  const [risoluzioni, setRisoluzioni] = useState<Map<string, RisoluzioneFarmaco>>(new Map());

  // Chiave di dipendenza stabile e ordinata: un riordino della tabella non rilancia le ricerche.
  const chiaviUniche = chiaviDistinte(righe.map((r) => r.farmacoNome)).join('\n');
  const firmaRighe = righe.map(chiaveRiga).sort().join('\n');

  useEffect(() => {
    if (!chiaviUniche) {
      setRisoluzioni(new Map());
      return;
    }
    let annullato = false;

    void (async () => {
      let catalogoNonCaricato = false;
      try {
        const stato = await cachedGetJson<{ caricata: boolean }>(
          `${API_URL}/farmaci/stato`,
          15_000,
        );
        catalogoNonCaricato = stato?.caricata === false;
      } catch {
        /* Unknown catalog status must not be interpreted as an empty catalog. */
      }
      if (annullato) return;
      const coppie = await Promise.all(
        chiaviUniche.split('\n').map(async (chiave): Promise<[string, FarmacoTrovato[] | null]> => {
          if (catalogoNonCaricato) return [chiave, null];
          try {
            const risposta = await cachedGetJson<RispostaRicerca>(
              `${API_URL}/farmaci/cerca?q=${encodeURIComponent(chiave)}&limite=${LIMITE_CONFEZIONI}`,
              TTL_MS,
            );
            // Una risposta senza `esiti` non e' una risposta vuota: e' una risposta malformata.
            return [chiave, Array.isArray(risposta?.esiti) ? risposta.esiti : null];
          } catch {
            return [chiave, null];
          }
        }),
      );
      if (annullato) return;
      const perNome = new Map(coppie);
      const esito = new Map<string, RisoluzioneFarmaco>();
      for (const riga of righe) {
        const esiti = perNome.get(chiaveFarmaco(riga.farmacoNome)) ?? null;
        esito.set(
          chiaveRiga(riga),
          risolviRiga(esiti, { dosaggio: riga.dosaggio, forma: riga.viaSomministrazione }),
        );
      }
      setRisoluzioni(esito);
    })();

    return () => {
      annullato = true;
    };
    // `righe` e' ricreato a ogni render dal chiamante: le dipendenze sono le due firme testuali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaviUniche, firmaRighe]);

  return risoluzioni;
}
