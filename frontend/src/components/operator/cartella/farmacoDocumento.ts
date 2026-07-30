// Logica pura per collegare un farmaco al suo documento ufficiale AIFA.
//
// Sta in un file separato dal hook perche' non dipende da React ne' da `import.meta.env`:
// cosi' e' verificabile con `node:test` senza montare Vite.

import { scegliPerDosaggioEForma, type PrescrizioneDaAbbinare } from './farmacoCorrispondenza';

export type { PrescrizioneDaAbbinare };

export interface FarmacoTrovato {
  aic: string;
  denominazione: string;
  linkFi: string | null;
  linkRcp: string | null;
  /** Forma farmaceutica AIFA ("Compressa", "Sciroppo"): serve a riconoscere la confezione. */
  forma?: string | null;
  /** Confezione ("10 COMPRESSE"): porta spesso il dosaggio che la denominazione non ripete. */
  descrizione?: string | null;
  /** Autorizzata | Sospesa | Revocata: un farmaco revocato non e' piu' in commercio. */
  statoAmministrativo?: string | null;
  principiAttivi?: Array<{ nome: string; quantita: number | null; unita: string | null }>;
}

export interface DocumentoFarmaco {
  href: string;
  tipo: 'rcp' | 'fi';
  denominazione: string;
}

/** Chiave di lookup stabile: maiuscole e spazi normalizzati, come l'indice del backend. */
export function chiaveFarmaco(nome: string): string {
  return nome.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Documento da mostrare: il Riassunto delle Caratteristiche del Prodotto se disponibile,
 * altrimenti il Foglietto Illustrativo.
 *
 * L'ordine non e' arbitrario: l'RCP e' il documento destinato al professionista sanitario, il
 * foglietto illustrativo e' scritto per il paziente. Con un operatore davanti allo schermo il
 * primo e' la fonte giusta; il secondo e' un ripiego, non un equivalente.
 *
 * `null` quando il farmaco non ha nessuno dei due: meglio nessuna icona che un link rotto.
 */
export function documentoDi(farmaco: FarmacoTrovato): DocumentoFarmaco | null {
  if (farmaco.linkRcp) {
    return { href: farmaco.linkRcp, tipo: 'rcp', denominazione: farmaco.denominazione };
  }
  if (farmaco.linkFi) {
    return { href: farmaco.linkFi, tipo: 'fi', denominazione: farmaco.denominazione };
  }
  return null;
}

/** Etichetta accessibile del link: nomina il documento per esteso, perche' i due non coincidono. */
export function etichettaDocumento(doc: DocumentoFarmaco): string {
  const nome =
    doc.tipo === 'rcp' ? 'Riassunto delle Caratteristiche del Prodotto' : 'Foglietto Illustrativo';
  return `${nome} AIFA di ${doc.denominazione} (si apre in una nuova scheda)`;
}

/** Nomi distinti da risolvere, normalizzati e ordinati: una ricerca per farmaco, non per riga. */
export function chiaviDistinte(nomi: string[]): string[] {
  return [...new Set(nomi.map(chiaveFarmaco).filter(Boolean))].sort();
}

// ── Dal nome di terapia alla confezione ────────────────────────────────────────────────────

/** Esito della risoluzione di una riga di terapia. Ogni stato ha un'interfaccia diversa. */
export type StatoRisoluzione =
  /** Confezione in anagrafica e documento ufficiale disponibile. */
  | 'trovato'
  /** Farmaco in anagrafica, ma senza RCP ne' foglietto: non c'e' nulla da aprire. */
  | 'senza-documento'
  /** Nessuna corrispondenza: galenico, estero, nome storpiato oltre il recupero. */
  | 'non-trovato'
  /** La ricerca non ha risposto: anagrafica non caricata o backend irraggiungibile. */
  | 'fonte-non-disponibile';

export interface RisoluzioneFarmaco {
  stato: StatoRisoluzione;
  documento?: DocumentoFarmaco;
  /**
   * Confezione riconosciuta **con certezza**. Assente quando l'anagrafica offre piu' confezioni
   * ugualmente compatibili: in quel caso la forma non va usata per scegliere una posologia,
   * perche' sarebbe un'ipotesi travestita da dato.
   */
  confezione?: FarmacoTrovato;
  /** Quante confezioni ha restituito l'anagrafica per questo nome. */
  confezioni: number;
}

/**
 * Testo su cui riconoscere una confezione: denominazione, confezione e forma insieme.
 *
 * Il dosaggio non e' sempre nella denominazione — "TACHIPIRINA" secca contro "10 COMPRESSE
 * 500 MG" nella descrizione — quindi guardarne una sola perderebbe l'informazione decisiva.
 */
export function testoConfezione(f: FarmacoTrovato): string {
  return [f.denominazione, f.descrizione, f.forma].filter(Boolean).join(' ');
}

/**
 * Sceglie fra le confezioni restituite dall'anagrafica quella che la riga di terapia prescrive.
 *
 * Prima di questa funzione il codice prendeva `esiti[0]` con `limite=1`: per "Tachipirina"
 * l'anagrafica restituisce lo sciroppo prima delle compresse, quindi la confezione era scelta
 * di fatto a caso. Per il *documento* la differenza non si vedeva — tutte le confezioni di un
 * farmaco condividono lo stesso PDF, che e' per AIC6 — ma diventa decisiva nel momento in cui
 * si evidenzia una posologia dentro quel PDF.
 */
export function scegliConfezione(
  esiti: FarmacoTrovato[],
  prescrizione: PrescrizioneDaAbbinare,
): number | null {
  return scegliPerDosaggioEForma(esiti.map(testoConfezione), prescrizione);
}

/**
 * Risolve una riga di terapia negli esiti dell'anagrafica.
 *
 * `esiti === null` distingue "la ricerca non ha risposto" da "la ricerca non ha trovato nulla":
 * sono due messaggi diversi per l'operatore, e confonderli è il difetto della versione attuale,
 * che degrada in silenzio in entrambi i casi.
 */
export function risolviRiga(
  esiti: FarmacoTrovato[] | null,
  prescrizione: PrescrizioneDaAbbinare,
): RisoluzioneFarmaco {
  if (esiti === null) return { stato: 'fonte-non-disponibile', confezioni: 0 };
  if (esiti.length === 0) return { stato: 'non-trovato', confezioni: 0 };

  const indice = scegliConfezione(esiti, prescrizione);
  const certa = indice === null ? undefined : esiti[indice];

  // Il documento e' per AIC6: qualunque confezione dello stesso farmaco porta al medesimo PDF.
  // Quindi l'incertezza sulla confezione non impedisce di aprire il documento — impedisce solo
  // di dedurne la forma, che resta `undefined` e lascia decidere l'operatore.
  const conDocumento = certa ?? esiti.find((e) => documentoDi(e) !== null);
  const documento = conDocumento ? documentoDi(conDocumento) : null;

  if (!documento) return { stato: 'senza-documento', confezione: certa, confezioni: esiti.length };
  return { stato: 'trovato', documento, confezione: certa, confezioni: esiti.length };
}
