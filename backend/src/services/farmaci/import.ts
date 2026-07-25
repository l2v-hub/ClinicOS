// Caricamento dell'anagrafica farmaci AIFA nella copia locale.
//
// Le sorgenti sono due CSV pubblici (drive.aifa.gov.it), aggiornati da AIFA:
//   confezioni_fornitura.csv  ~160.000 righe, 82 MB  → una riga per confezione
//   PA_confezioni.csv         ~338.000 righe          → principi attivi con quantita' e unita'
// Il primo NON entra in memoria tutto insieme: si legge a flusso, riga per riga.
//
// Nessun dato di paziente: e' anagrafica pubblica.

import { prisma } from '../../lib/prisma.js';
import { normalizza, nucleoNome } from './normalizza.js';

export const FONTE_CONFEZIONI = 'https://drive.aifa.gov.it/farmaci/confezioni_fornitura.csv';
export const FONTE_PRINCIPI_ATTIVI = 'https://drive.aifa.gov.it/farmaci/PA_confezioni.csv';

const LOTTO = 2_000;

/** Divide una riga CSV con delimitatore `;` rispettando le virgolette. */
export function dividiRigaCsv(riga: string): string[] {
  const campi: string[] = [];
  let corrente = '';
  let dentroVirgolette = false;
  for (let i = 0; i < riga.length; i++) {
    const c = riga[i];
    if (c === '"') {
      // "" dentro un campo quotato significa una virgoletta letterale
      if (dentroVirgolette && riga[i + 1] === '"') {
        corrente += '"';
        i++;
      } else dentroVirgolette = !dentroVirgolette;
    } else if (c === ';' && !dentroVirgolette) {
      campi.push(corrente);
      corrente = '';
    } else corrente += c;
  }
  campi.push(corrente);
  return campi.map((x) => x.trim());
}

/** Legge un CSV remoto riga per riga senza tenerlo tutto in memoria. */
export async function* righeCsvRemoto(
  url: string,
  fetchImpl: typeof fetch = fetch,
): AsyncGenerator<string> {
  const res = await fetchImpl(url);
  if (!res.ok || !res.body) {
    throw new Error(`Sorgente non raggiungibile (${res.status}): ${url}`);
  }
  // I file AIFA sono in UTF-8 con BOM; `fatal:false` evita che un byte sporco
  // interrompa un import da centinaia di migliaia di righe.
  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });
  let resto = '';
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    resto += decoder.decode(chunk, { stream: true });
    let taglio: number;
    while ((taglio = resto.indexOf('\n')) >= 0) {
      const riga = resto.slice(0, taglio).replace(/\r$/, '');
      resto = resto.slice(taglio + 1);
      if (riga) yield riga;
    }
  }
  const coda = (resto + decoder.decode()).replace(/\r$/, '');
  if (coda) yield coda;
}

/** Mappa una riga di confezioni_fornitura.csv sul modello Farmaco. */
export function mappaConfezione(intestazione: string[], campi: string[]) {
  const v = (nome: string) => {
    const i = intestazione.indexOf(nome);
    return i >= 0 ? campi[i] || null : null;
  };
  const aic = v('CODICE_AIC');
  const denominazione = v('DENOMINAZIONE');
  if (!aic || !denominazione) return null; // riga inutilizzabile: si salta, non si interrompe
  return {
    aic,
    denominazione,
    descrizione: v('DESCRIZIONE'),
    ragioneSociale: v('RAGIONE_SOCIALE'),
    statoAmministrativo: v('STATO_AMMINISTRATIVO') || 'Sconosciuto',
    forma: v('FORMA'),
    atc: v('CODICE_ATC'),
    paAssociati: v('PA_ASSOCIATI'),
    fornitura: v('FORNITURA'),
    linkFi: v('LINK_FI'),
    linkRcp: v('LINK_RCP'),
    // Si indicizza il NUCLEO del nome (senza dosaggi ne' forme): e' cio' che l'operatore
    // digita davvero quando scrive "cardioaspirin" invece della denominazione completa.
    denominazioneNorm: nucleoNome(denominazione),
  };
}

/** Mappa una riga di PA_confezioni.csv sul modello FarmacoPrincipioAttivo. */
export function mappaPrincipioAttivo(intestazione: string[], campi: string[]) {
  const v = (nome: string) => {
    const i = intestazione.indexOf(nome);
    return i >= 0 ? campi[i] || null : null;
  };
  const aic = v('CODICE_AIC');
  const pa = v('PRINCIPIO_ATTIVO');
  // 'N.D.' e' il segnaposto AIFA per "non disponibile": indicizzarlo creerebbe migliaia di
  // falsi principi attivi tutti uguali.
  if (!aic || !pa || pa.toUpperCase() === 'N.D.') return null;
  const q = Number((v('QUANTITA') || '').replace(',', '.'));
  const unita = v('UNITA_MISURA');
  return {
    aic,
    principioAttivo: pa,
    principioAttivoNorm: normalizza(pa),
    quantita: Number.isFinite(q) && q > 0 ? q : null,
    unitaMisura: unita && unita.toUpperCase() !== 'N.D.' ? unita : null,
  };
}

export interface EsitoImport {
  righeLette: number;
  righeScritte: number;
  durataMs: number;
}

/**
 * Ricarica l'intera anagrafica. E' una sostituzione completa: le sorgenti sono istantanee
 * complete, e cio' che sparisce fra un aggiornamento e l'altro e' esattamente il segnale
 * che serve al controllo periodico (confezione ritirata dal commercio).
 *
 * Tutto dentro una transazione: se il caricamento fallisce a meta', l'anagrafica precedente
 * resta intatta invece di lasciare l'app con una tabella mezza vuota — che sarebbe peggio
 * di un'anagrafica vecchia, perche' segnalerebbe come sconosciuti farmaci notissimi.
 */
export async function importaAnagraficaFarmaci(
  opzioni: {
    fonteConfezioni?: string;
    fontePrincipiAttivi?: string;
    fetchImpl?: typeof fetch;
    client?: typeof prisma;
  } = {},
): Promise<EsitoImport> {
  const {
    fonteConfezioni = FONTE_CONFEZIONI,
    fontePrincipiAttivi = FONTE_PRINCIPI_ATTIVI,
    fetchImpl = fetch,
    client = prisma,
  } = opzioni;
  const avvio = Date.now();
  let righeLette = 0;
  let righeScritte = 0;

  try {
    await client.$transaction(
      async (tx) => {
        // I principi attivi hanno una FK su Farmaco con onDelete: Cascade, quindi basta
        // svuotare Farmaco; l'ordine esplicito rende comunque leggibile l'intenzione.
        await tx.farmacoPrincipioAttivo.deleteMany({});
        await tx.farmaco.deleteMany({});

        let intestazione: string[] | null = null;
        let lotto: NonNullable<ReturnType<typeof mappaConfezione>>[] = [];
        const visti = new Set<string>();
        for await (const riga of righeCsvRemoto(fonteConfezioni, fetchImpl)) {
          const campi = dividiRigaCsv(riga);
          if (!intestazione) {
            intestazione = campi.map((c) => c.replace(/^﻿/, ''));
            continue;
          }
          righeLette++;
          const rec = mappaConfezione(intestazione, campi);
          // L'AIC e' chiave primaria: un duplicato nella sorgente farebbe fallire l'intero
          // lotto, quindi si tiene la prima occorrenza.
          if (!rec || visti.has(rec.aic)) continue;
          visti.add(rec.aic);
          lotto.push(rec);
          if (lotto.length >= LOTTO) {
            await tx.farmaco.createMany({ data: lotto });
            righeScritte += lotto.length;
            lotto = [];
          }
        }
        if (lotto.length) {
          await tx.farmaco.createMany({ data: lotto });
          righeScritte += lotto.length;
        }

        let intPa: string[] | null = null;
        let lottoPa: NonNullable<ReturnType<typeof mappaPrincipioAttivo>>[] = [];
        for await (const riga of righeCsvRemoto(fontePrincipiAttivi, fetchImpl)) {
          const campi = dividiRigaCsv(riga);
          if (!intPa) {
            intPa = campi.map((c) => c.replace(/^﻿/, ''));
            continue;
          }
          righeLette++;
          const rec = mappaPrincipioAttivo(intPa, campi);
          // Si scartano i principi attivi di confezioni assenti dall'altro file: la FK
          // li rifiuterebbe facendo fallire tutto il lotto.
          if (!rec || !visti.has(rec.aic)) continue;
          lottoPa.push(rec);
          if (lottoPa.length >= LOTTO) {
            await tx.farmacoPrincipioAttivo.createMany({ data: lottoPa });
            righeScritte += lottoPa.length;
            lottoPa = [];
          }
        }
        if (lottoPa.length) {
          await tx.farmacoPrincipioAttivo.createMany({ data: lottoPa });
          righeScritte += lottoPa.length;
        }
      },
      { timeout: 15 * 60 * 1000, maxWait: 30_000 },
    );

    const durataMs = Date.now() - avvio;
    await client.farmacoImport.create({
      data: { fonte: fonteConfezioni, righeLette, righeScritte, esito: 'ok', durataMs },
    });
    return { righeLette, righeScritte, durataMs };
  } catch (err) {
    const messaggio = err instanceof Error ? err.message.slice(0, 400) : 'errore sconosciuto';
    await client.farmacoImport
      .create({
        data: {
          fonte: fonteConfezioni,
          righeLette,
          righeScritte: 0,
          esito: 'errore',
          messaggio,
          durataMs: Date.now() - avvio,
        },
      })
      .catch(() => {
        /* la traccia e' best-effort: non deve mascherare l'errore vero */
      });
    throw err;
  }
}
