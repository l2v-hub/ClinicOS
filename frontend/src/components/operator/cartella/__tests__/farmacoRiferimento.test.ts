// frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts
//
// Il ripiego per nome di `trovaRisoluzione` era descritto ma non funzionava: le chiavi separano
// nome e dosaggio con un byte NUL, il ripiego cercava per prefisso «NOME » con uno spazio, e non
// corrispondeva mai. Nelle tabelle Programmazione / Storico / Giornaliere — le uniche le cui
// righe non portano il campo `dosaggio`, e quindi le uniche che sul ripiego contano — la cella
// del farmaco restava senza icona e senza avviso «non in anagrafica».
//
// Il difetto non si vedeva ne' nel diff (il NUL rendeva il file binario per git) ne' nei test
// (`anomalieFarmaco.test.ts` usa un lookup finto, quindi resta verde anche col ripiego rotto).
// Questi casi coprono il ripiego vero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chiaveRiga, trovaRisoluzione } from '../farmacoRiferimento.js';
import type { RisoluzioneFarmaco } from '../farmacoDocumento.js';

function risoluzione(stato: RisoluzioneFarmaco['stato'], confezioni = 1): RisoluzioneFarmaco {
  return { stato, confezioni };
}

/** Mappa costruita come la costruisce `useRisoluzioniFarmaco`: una voce per riga di terapia. */
function mappaDa(
  righe: { farmacoNome: string; dosaggio?: string | null; esito: RisoluzioneFarmaco }[],
): Map<string, RisoluzioneFarmaco> {
  const m = new Map<string, RisoluzioneFarmaco>();
  for (const r of righe) {
    m.set(chiaveRiga({ farmacoNome: r.farmacoNome, dosaggio: r.dosaggio }), r.esito);
  }
  return m;
}

test('AC7: la chiave esatta distingue due dosaggi dello stesso farmaco', () => {
  const alta = risoluzione('trovato');
  const bassa = risoluzione('senza-documento');
  const m = mappaDa([
    { farmacoNome: 'Tachipirina', dosaggio: '1000 mg', esito: alta },
    { farmacoNome: 'Tachipirina', dosaggio: '500 mg', esito: bassa },
  ]);

  assert.equal(trovaRisoluzione(m, 'Tachipirina', '1000 mg'), alta);
  assert.equal(trovaRisoluzione(m, 'Tachipirina', '500 mg'), bassa);
});

test('AC7: senza dosaggio ripiega su una risoluzione dello stesso farmaco invece di arrendersi', () => {
  const esito = risoluzione('trovato');
  const m = mappaDa([{ farmacoNome: 'Kanrenol', dosaggio: '200 mg', esito }]);

  // E' il caso di Programmazione e Storico: la riga non porta il `dosaggio` con cui la mappa e'
  // stata costruita, quindi la chiave esatta non combacia e conta solo il ripiego.
  assert.equal(trovaRisoluzione(m, 'Kanrenol', null), esito);
  assert.equal(trovaRisoluzione(m, 'Kanrenol', undefined), esito);
});

test('AC7: un dosaggio che non combacia ripiega comunque sul farmaco', () => {
  const esito = risoluzione('non-trovato');
  const m = mappaDa([{ farmacoNome: 'Coumadin', dosaggio: '5 mg', esito }]);

  // Le righe di somministrazione portano una quantita' («1 compressa»), non il dosaggio
  // commerciale: la chiave esatta non puo' combaciare per costruzione.
  assert.equal(trovaRisoluzione(m, 'Coumadin', '1 compressa'), esito);
});

test('AC7: il ripiego regge i nomi con spazi — e il vecchio taglio al primo spazio no', () => {
  const esito = risoluzione('trovato');
  const m = mappaDa([{ farmacoNome: 'Tachipirina 500', dosaggio: '1000 mg', esito }]);

  // Nome E dosaggio contengono spazi: un indice che tagliasse la chiave al primo spazio
  // registrerebbe «TACHIPIRINA» e mancherebbe questa ricerca.
  assert.equal(trovaRisoluzione(m, 'Tachipirina 500', '1 compressa'), esito);
  assert.equal(trovaRisoluzione(m, 'Tachipirina 500', null), esito);
});

test('AC7: il nome e normalizzato come in anagrafica (maiuscole, spazi ridondanti)', () => {
  const esito = risoluzione('trovato');
  const m = mappaDa([{ farmacoNome: 'Tachipirina 500', dosaggio: '1000 mg', esito }]);

  assert.equal(trovaRisoluzione(m, '  tachipirina   500  ', null), esito);
});

test('AC7: un farmaco assente resta assente — il ripiego non inventa una risoluzione', () => {
  const m = mappaDa([
    { farmacoNome: 'Tachipirina', dosaggio: '500 mg', esito: risoluzione('trovato') },
  ]);

  assert.equal(trovaRisoluzione(m, 'Inesistente', null), undefined);
  // Un nome che e' prefisso di un altro non deve agganciarlo: sono farmaci diversi.
  assert.equal(trovaRisoluzione(m, 'Tachi', null), undefined);
});

test("AC7: su piu' righe dello stesso farmaco il ripiego e stabile", () => {
  const prima = risoluzione('trovato');
  const m = mappaDa([
    { farmacoNome: 'Tachipirina', dosaggio: '1000 mg', esito: prima },
    { farmacoNome: 'Tachipirina', dosaggio: '500 mg', esito: risoluzione('senza-documento') },
  ]);

  // Vince la prima incontrata, come faceva la scansione che l'indice sostituisce: due chiamate
  // identiche non possono dare risposte diverse.
  const a = trovaRisoluzione(m, 'Tachipirina', '1 compressa');
  const b = trovaRisoluzione(m, 'Tachipirina', '1 compressa');
  assert.equal(a, prima);
  assert.equal(b, prima);
});

test('AC7: mappa vuota — nessuna risoluzione, nessuna eccezione', () => {
  assert.equal(trovaRisoluzione(new Map(), 'Tachipirina', '500 mg'), undefined);
});
