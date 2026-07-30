// Struttura di un RCP AIFA: blocchi per formulazione e sezioni cliniche al loro interno.
//
// Sta in un file separato dal visore perche' non dipende da React ne' da pdf.js: prende
// frammenti di testo gia' estratti e restituisce coordinate logiche. Cosi' e' verificabile con
// `node:test`, che e' il minimo per del codice da cui dipende quale posologia legge un operatore.
//
// PERCHE' ESISTE. Il link AIFA e' per AIC6, che identifica il *farmaco*; l'anagrafica ha un
// record per *confezione*. Un solo PDF contiene quindi tutti gli RCP delle confezioni di quel
// farmaco: la Tachipirina ne ha cinque in 48 pagine — 1000 mg compresse, 500 mg compresse,
// 10 mg/ml soluzione per infusione, 120 mg/5 ml sciroppo, sciroppo senza zucchero. Le loro
// sezioni "4.2 Posologia" sono inconciliabili fra loro.
//
// REGOLA DI SICUREZZA: evidenziare il blocco sbagliato indica all'operatore un dosaggio errato.
// Nel dubbio questo modulo non sceglie: restituisce `null` e lascia decidere. Nessuna
// evidenziazione e' un esito accettabile, un'evidenziazione sbagliata no.

import {
  normalizza,
  scegliPerDosaggioEForma,
  type PrescrizioneDaAbbinare,
} from './farmacoCorrispondenza';

export type { PrescrizioneDaAbbinare };

/** Frammento di testo come lo restituisce pdf.js, ridotto ai campi che servono qui. */
export interface FrammentoTesto {
  pagina: number; // 1-based
  x: number;
  y: number; // coordinate PDF: cresce verso l'alto
  larghezza: number;
  altezza: number;
  testo: string;
}

export interface RigaTesto {
  pagina: number;
  y: number;
  testo: string;
  /** Indici dei frammenti che compongono la riga, nell'array di partenza. */
  frammenti: number[];
}

export interface SezioneRcp {
  numero: string; // '4.1' | '4.2' | '4.3'
  titolo: string;
  pagina: number;
  /** Frammenti da evidenziare: intestazione inclusa, fino alla sezione successiva esclusa. */
  frammenti: number[];
}

export interface BloccoRcp {
  /** Denominazione della confezione, come stampata sotto "1. DENOMINAZIONE DEL MEDICINALE". */
  denominazione: string;
  paginaIniziale: number;
  sezioni: SezioneRcp[];
}

/** Sezioni cliniche richieste: indicazioni, posologia, controindicazioni. */
export const SEZIONI_RICHIESTE = ['4.1', '4.2', '4.3'] as const;

// Due frammenti appartengono alla stessa riga se le loro basi distano meno di questa soglia.
// I frammenti di una riga condividono la baseline, ma apici e font misti la spostano di poco.
const TOLLERANZA_RIGA = 2.5;

/**
 * Raggruppa i frammenti in righe di lettura.
 *
 * Serve perche' pdf.js spezza le intestazioni: "4.1" e "Indicazioni terapeutiche" arrivano come
 * due frammenti distinti sulla stessa riga, e nessuno dei due da solo e' riconoscibile.
 * L'ordine restituito e' quello di lettura: pagina crescente, poi y decrescente.
 */
export function raggruppaInRighe(frammenti: FrammentoTesto[]): RigaTesto[] {
  const perPagina = new Map<number, { y: number; indici: number[] }[]>();

  frammenti.forEach((f, indice) => {
    if (!f.testo.trim()) return;
    const righe = perPagina.get(f.pagina) ?? [];
    const riga = righe.find((r) => Math.abs(r.y - f.y) <= TOLLERANZA_RIGA);
    if (riga) riga.indici.push(indice);
    else righe.push({ y: f.y, indici: [indice] });
    perPagina.set(f.pagina, righe);
  });

  const risultato: RigaTesto[] = [];
  for (const [pagina, righe] of perPagina) {
    for (const riga of righe) {
      // Dentro la riga l'ordine e' quello orizzontale, non quello di estrazione.
      const ordinati = [...riga.indici].sort((a, b) => frammenti[a].x - frammenti[b].x);
      const testo = ordinati
        .map((i) => frammenti[i].testo)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (testo) risultato.push({ pagina, y: riga.y, testo, frammenti: ordinati });
    }
  }

  return risultato.sort((a, b) => a.pagina - b.pagina || b.y - a.y);
}

// Intestazione di sezione: "4.1 Indicazioni…", "4 . INFORMAZIONI…", "10. DATA DI REVISIONE".
// AIFA stampa spazi variabili attorno al punto, quindi la regex li tollera.
const INTESTAZIONE = /^(\d{1,2})\s*\.\s*(\d{1,2})?\s*(.*)$/;
// Le intestazioni sono brevi; oltre questa soglia e' una riga di testo che inizia per numero.
const LUNGHEZZA_MASSIMA_INTESTAZIONE = 120;

// Il numero stampato NON e' affidabile. Verificato sull'RCP reale della Tachipirina, dove AIFA
// pubblica due errori di numerazione nello stesso documento: a pagina 40 l'apertura del sesto RCP
// e' "2. DENOMINAZIONE DEL MEDICINALE" invece di "1.", e la posologia e' "4.3 Posologia e modo di
// somministrazione" invece di "4.2" — con una vera "4.3 Controindicazioni" tre pagine dopo.
//
// Il titolo, al contrario, e' testo standardizzato dal modello EMA e resta corretto. Qui comanda
// quindi il titolo, e il numero stampato serve solo quando il titolo non e' riconosciuto.
const TITOLI_CANONICI: { numero: string; riconosce: RegExp }[] = [
  { numero: '1', riconosce: /^denominazione del medicinale/ },
  { numero: '4.1', riconosce: /^indicazioni terapeutiche/ },
  { numero: '4.2', riconosce: /^posologia e modo di somministrazione/ },
  { numero: '4.3', riconosce: /^controindicazioni/ },
];

interface Intestazione {
  numero: string; // '4' | '4.1' — canonico se il titolo e' riconosciuto, altrimenti quello stampato
  titolo: string;
  indiceRiga: number;
  /** true quando il numero viene dal titolo standard e non dalla stampa. */
  daTitolo: boolean;
}

function intestazioneDi(riga: RigaTesto, indiceRiga: number): Intestazione | null {
  if (riga.testo.length > LUNGHEZZA_MASSIMA_INTESTAZIONE) return null;
  const m = INTESTAZIONE.exec(riga.testo);
  if (!m) return null;
  const [, principale, secondaria, resto] = m;
  const titolo = resto.trim();
  // Un'intestazione ha un titolo: "4.2" da solo, o seguito da cifre, e' altro (una misura, una data).
  if (!titolo || !/^[A-Za-zÀ-ÿ]/.test(titolo)) return null;

  const canonico = TITOLI_CANONICI.find((t) => t.riconosce.test(normalizza(titolo)));
  return {
    numero: canonico ? canonico.numero : secondaria ? `${principale}.${secondaria}` : principale,
    titolo,
    indiceRiga,
    daTitolo: canonico !== undefined,
  };
}

/** Tutte le intestazioni di sezione del documento, in ordine di lettura. */
function intestazioni(righe: RigaTesto[]): Intestazione[] {
  return righe
    .map((riga, i) => intestazioneDi(riga, i))
    .filter((i): i is Intestazione => i !== null);
}

/**
 * Divide il documento nei singoli RCP che contiene.
 *
 * Il confine e' l'intestazione "1. DENOMINAZIONE DEL MEDICINALE", che apre ogni RCP secondo il
 * modello EMA. La denominazione della confezione e' la prima riga di testo che la segue.
 * Un documento con un solo RCP produce un solo blocco: il caso multiplo non e' un'eccezione da
 * gestire a parte, e' il caso generale con n = 1.
 */
export function dividiInBlocchi(righe: RigaTesto[]): BloccoRcp[] {
  const tutte = intestazioni(righe);
  // L'apertura si riconosce dal titolo, non dal "1." stampato: vedi TITOLI_CANONICI.
  const aperture = tutte.filter((i) => i.numero === '1' && i.daTitolo);

  // Nessuna apertura riconoscibile: il documento non segue il modello EMA. Un blocco unico
  // sull'intero testo e' comunque meglio di nessuna struttura.
  if (aperture.length === 0) {
    return [
      {
        denominazione: '',
        paginaIniziale: righe[0]?.pagina ?? 1,
        sezioni: sezioniTra(righe, tutte, 0, righe.length),
      },
    ];
  }

  return aperture.map((apertura, i) => {
    const da = apertura.indiceRiga;
    const a = i + 1 < aperture.length ? aperture[i + 1].indiceRiga : righe.length;
    const primaRiga = righe.slice(da + 1, a).find((r) => r.testo.trim().length > 3);
    return {
      denominazione: primaRiga?.testo.trim() ?? '',
      paginaIniziale: righe[da].pagina,
      sezioni: sezioniTra(righe, tutte, da, a),
    };
  });
}

/** Sezioni richieste comprese fra due righe, con l'estensione dei frammenti da evidenziare. */
function sezioniTra(
  righe: RigaTesto[],
  tutte: Intestazione[],
  da: number,
  a: number,
): SezioneRcp[] {
  const interne = tutte.filter((i) => i.indiceRiga >= da && i.indiceRiga < a);

  return interne
    .filter((i) => (SEZIONI_RICHIESTE as readonly string[]).includes(i.numero))
    .map((sezione) => {
      // La sezione finisce dove comincia la successiva, qualunque sia il suo numero. Fermarsi
      // alla sola sezione richiesta seguente perderebbe il confine con "4.4".
      const successiva = interne.find((i) => i.indiceRiga > sezione.indiceRiga);
      const fine = successiva ? successiva.indiceRiga : a;
      const frammenti = righe.slice(sezione.indiceRiga, fine).flatMap((r) => r.frammenti);
      return {
        numero: sezione.numero,
        titolo: sezione.titolo,
        pagina: righe[sezione.indiceRiga].pagina,
        frammenti,
      };
    });
}

// ── Scelta della formulazione ──────────────────────────────────────────────────────────────

/**
 * Sceglie il blocco RCP che corrisponde alla confezione prescritta.
 *
 * Il confronto avviene sulla denominazione stampata nel documento, con lo stesso criterio che
 * sceglie la confezione in anagrafica (`farmacoCorrispondenza.ts`). Un criterio solo per le due
 * decisioni: due criteri diversi potrebbero concordare per caso e dichiarare coerente con la
 * prescrizione un documento che non lo è.
 *
 * `null` significa "decida l'operatore": davanti a sei posologie diverse, indicarne una a caso
 * è peggio che non indicarne nessuna.
 */
export function scegliBlocco(
  blocchi: BloccoRcp[],
  prescrizione: PrescrizioneDaAbbinare,
): number | null {
  return scegliPerDosaggioEForma(
    blocchi.map((b) => b.denominazione),
    prescrizione,
  );
}
