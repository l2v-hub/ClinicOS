// Ricerca nell'anagrafica farmaci: per nome commerciale e per principio attivo.
//
// Il punto non e' trovare cio' che l'operatore ha scritto correttamente — quello e' facile —
// ma cio' che ha scritto MALE: "Cardioasprina 100" deve arrivare a CARDIOASPIRIN. Per questo
// alla corrispondenza esatta e per prefisso (che usano gli indici) si affianca un confronto
// approssimato su un indice dei soli nomi distinti, che sono ~10.500 e stanno in memoria.

import { prisma } from '../../lib/prisma.js';
import { nucleoNome, normalizza, dosaggiCitati } from './normalizza.js';

export interface FarmacoTrovato {
  aic: string;
  denominazione: string;
  descrizione: string | null;
  forma: string | null;
  atc: string | null;
  statoAmministrativo: string;
  fornitura: string | null;
  linkFi: string | null;
  linkRcp: string | null;
  principiAttivi: Array<{ nome: string; quantita: number | null; unita: string | null }>;
  /** 1 = corrispondenza esatta; sotto 1 = approssimata. Decide se proporre o solo suggerire. */
  confidenza: number;
  /** Come si e' arrivati al farmaco: serve a spiegarlo all'operatore in interfaccia. */
  criterio: 'esatto' | 'prefisso' | 'approssimato' | 'principio-attivo';
}

const SELEZIONE = {
  aic: true,
  denominazione: true,
  descrizione: true,
  forma: true,
  atc: true,
  statoAmministrativo: true,
  fornitura: true,
  linkFi: true,
  linkRcp: true,
  principiAttivi: { select: { principioAttivo: true, quantita: true, unitaMisura: true } },
} as const;

type RigaDb = {
  aic: string;
  denominazione: string;
  descrizione: string | null;
  forma: string | null;
  atc: string | null;
  statoAmministrativo: string;
  fornitura: string | null;
  linkFi: string | null;
  linkRcp: string | null;
  principiAttivi: Array<{
    principioAttivo: string;
    quantita: number | null;
    unitaMisura: string | null;
  }>;
};

function componi(
  r: RigaDb,
  confidenza: number,
  criterio: FarmacoTrovato['criterio'],
): FarmacoTrovato {
  return {
    aic: r.aic,
    denominazione: r.denominazione,
    descrizione: r.descrizione,
    forma: r.forma,
    atc: r.atc,
    statoAmministrativo: r.statoAmministrativo,
    fornitura: r.fornitura,
    linkFi: r.linkFi,
    linkRcp: r.linkRcp,
    principiAttivi: r.principiAttivi.map((p) => ({
      nome: p.principioAttivo,
      quantita: p.quantita,
      unita: p.unitaMisura,
    })),
    confidenza,
    criterio,
  };
}

/** Distanza di Levenshtein, limitata: oltre `massimo` si abbandona invece di completare. */
export function distanza(a: string, b: string, massimo = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > massimo) return massimo + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minRiga = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prec[j] + 1, prec[j - 1] + costo);
      if (cur[j] < minRiga) minRiga = cur[j];
    }
    // Se l'intera riga supera gia' il massimo, nessun percorso potra' scendere sotto.
    if (minRiga > massimo) return massimo + 1;
    prec = cur;
  }
  return prec[b.length];
}

// Indice in memoria dei soli nomi DISTINTI normalizzati. Ricostruirlo a ogni ricerca
// costerebbe una scansione di 160.000 righe; i nomi distinti sono ~10.500 e cambiano solo
// quando si ricarica l'anagrafica.
let indiceNomi: string[] | null = null;
let indiceCaricatoIl = 0;
const TTL_INDICE_MS = 60 * 60 * 1000;

/** Da chiamare dopo un ricaricamento dell'anagrafica. */
export function invalidaIndice(): void {
  indiceNomi = null;
}

async function nomiDistinti(client: typeof prisma): Promise<string[]> {
  const adesso = Date.now();
  if (indiceNomi && adesso - indiceCaricatoIl < TTL_INDICE_MS) return indiceNomi;
  const righe = await client.farmaco.findMany({
    distinct: ['denominazioneNorm'],
    select: { denominazioneNorm: true },
  });
  indiceNomi = righe.map((r) => r.denominazioneNorm);
  indiceCaricatoIl = adesso;
  return indiceNomi;
}

/**
 * Cerca un farmaco a partire da cio' che l'operatore ha scritto (o che l'OCR ha letto).
 * Restituisce i candidati ordinati per confidenza; a chi chiama tocca decidere se proporre
 * il primo o mostrare una scelta.
 */
export async function cercaFarmaci(
  testo: string,
  opzioni: { limite?: number; client?: typeof prisma } = {},
): Promise<FarmacoTrovato[]> {
  const { limite = 8, client = prisma } = opzioni;
  const nucleo = nucleoNome(testo);
  if (!nucleo) return [];

  // 1. Esatto sul nucleo del nome: caso piu' frequente, usa l'indice.
  const esatti = (await client.farmaco.findMany({
    where: { denominazioneNorm: nucleo },
    select: SELEZIONE,
    take: limite,
  })) as RigaDb[];
  if (esatti.length) return esatti.map((r) => componi(r, 1, 'esatto'));

  // 2. Per prefisso: "CARDIOASPIRIN" trova anche "CARDIOASPIRIN PREVENT".
  const perPrefisso = (await client.farmaco.findMany({
    where: { denominazioneNorm: { startsWith: nucleo } },
    select: SELEZIONE,
    take: limite,
  })) as RigaDb[];
  if (perPrefisso.length) return perPrefisso.map((r) => componi(r, 0.9, 'prefisso'));

  // 3. Approssimato: qui si recuperano gli errori di battitura e di OCR.
  const soglia = nucleo.length <= 6 ? 1 : nucleo.length <= 12 ? 2 : 3;
  const vicini: Array<{ nome: string; d: number }> = [];
  for (const nome of await nomiDistinti(client)) {
    // Si confronta sia il nome intero sia il suo PRIMO termine: a registro i generici sono
    // "METFORMINA EG", "METFORMINA SANDOZ"… mentre l'operatore scrive solo la molecola.
    // Senza questo, un refuso su un generico non verrebbe mai recuperato.
    const primo = nome.indexOf(' ') > 0 ? nome.slice(0, nome.indexOf(' ')) : nome;
    const d = Math.min(distanza(nucleo, nome, soglia), distanza(nucleo, primo, soglia));
    if (d <= soglia) vicini.push({ nome, d });
  }
  if (vicini.length) {
    vicini.sort((a, b) => a.d - b.d);
    const migliori = vicini.slice(0, limite).map((v) => v.nome);
    const distanzaPerNome = new Map(vicini.map((v) => [v.nome, v.d]));
    const righe = (await client.farmaco.findMany({
      where: { denominazioneNorm: { in: migliori } },
      select: SELEZIONE,
      take: limite,
    })) as RigaDb[];
    return righe
      .map((r) => {
        const d = distanzaPerNome.get(nucleoNome(r.denominazione)) ?? soglia;
        // Piu' e' lontano, meno ci si fida: resta comunque sotto la soglia del prefisso.
        return componi(r, Math.max(0.5, 0.85 - d * 0.1), 'approssimato');
      })
      .sort((a, b) => b.confidenza - a.confidenza);
  }

  // 4. Ultimo tentativo: forse ha scritto il principio attivo invece del nome commerciale.
  return cercaPerPrincipioAttivo(testo, { limite, client });
}

/**
 * Cerca per principio attivo. E' la ricerca che risponde a "quali farmaci contengono questa
 * molecola" e, di riflesso, permette di accorgersi delle duplicazioni terapeutiche.
 */
export async function cercaPerPrincipioAttivo(
  testo: string,
  opzioni: { limite?: number; client?: typeof prisma } = {},
): Promise<FarmacoTrovato[]> {
  const { limite = 8, client = prisma } = opzioni;
  const pa = normalizza(nucleoNome(testo));
  if (!pa) return [];
  const righe = (await client.farmaco.findMany({
    where: { principiAttivi: { some: { principioAttivoNorm: { startsWith: pa } } } },
    select: SELEZIONE,
    take: limite,
  })) as RigaDb[];
  return righe.map((r) => componi(r, 0.8, 'principio-attivo'));
}

/**
 * Dosaggi realmente in commercio per un principio attivo: e' cio' che si propone
 * all'operatore quando la lettera cita il farmaco senza la dose.
 */
export async function dosaggiInCommercio(
  principioAttivo: string,
  opzioni: { client?: typeof prisma } = {},
): Promise<Array<{ quantita: number; unita: string }>> {
  const { client = prisma } = opzioni;
  const pa = normalizza(principioAttivo);
  if (!pa) return [];
  const righe = await client.farmacoPrincipioAttivo.findMany({
    where: { principioAttivoNorm: { startsWith: pa }, quantita: { not: null } },
    select: { quantita: true, unitaMisura: true },
    take: 5000,
  });
  const visti = new Map<string, { quantita: number; unita: string }>();
  for (const r of righe) {
    if (r.quantita == null || !r.unitaMisura) continue;
    const chiave = `${r.quantita}|${r.unitaMisura}`;
    if (!visti.has(chiave)) visti.set(chiave, { quantita: r.quantita, unita: r.unitaMisura });
  }
  return [...visti.values()].sort((a, b) => a.quantita - b.quantita);
}

/**
 * Verifica se il dosaggio citato nel testo corrisponde a una confezione in commercio.
 * Un "no" quasi sempre significa errore di lettura, non prescrizione anomala: per questo
 * il risultato e' un'informazione da mostrare, mai un blocco.
 */
export async function dosaggioPlausibile(
  testo: string,
  principioAttivo: string,
  opzioni: { client?: typeof prisma } = {},
): Promise<{ verificabile: boolean; plausibile: boolean; disponibili: number[] }> {
  const citati = dosaggiCitati(testo);
  const disponibili = await dosaggiInCommercio(principioAttivo, opzioni);
  const valori = disponibili.map((d) => d.quantita);
  if (!citati.length || !disponibili.length) {
    return { verificabile: false, plausibile: true, disponibili: valori };
  }
  const plausibile = citati.some((c) =>
    disponibili.some(
      (d) =>
        Math.abs(d.quantita - c.valore) < 0.001 &&
        d.unita.toLowerCase().startsWith(c.unita[0].toLowerCase()),
    ),
  );
  return { verificabile: true, plausibile, disponibili: valori };
}
