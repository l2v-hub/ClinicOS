// frontend/src/components/operator/cartella/__tests__/farmacoDocumento.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chiaveFarmaco,
  chiaviDistinte,
  documentoDi,
  etichettaDocumento,
} from '../farmacoDocumento.js';

const RCP = 'https://farmaci.agenziafarmaco.gov.it/aifa/servlet/PdfDownloadServlet?rcp=1';
const FI = 'https://farmaci.agenziafarmaco.gov.it/aifa/servlet/PdfDownloadServlet?fi=1';

test('AC1: preferisce l RCP, il documento destinato al professionista sanitario', () => {
  const doc = documentoDi({
    aic: '000000000',
    denominazione: 'TACHIPIRINA 500 MG',
    linkRcp: RCP,
    linkFi: FI,
  });
  assert.equal(doc?.href, RCP);
  assert.equal(doc?.tipo, 'rcp');
  assert.equal(doc?.denominazione, 'TACHIPIRINA 500 MG');
});

test('AC1: senza RCP ripiega sul foglietto illustrativo', () => {
  const doc = documentoDi({
    aic: '000000000',
    denominazione: 'FARMACO SENZA RCP',
    linkRcp: null,
    linkFi: FI,
  });
  assert.equal(doc?.href, FI);
  assert.equal(doc?.tipo, 'fi');
});

test('AC3: senza alcun documento non produce link — meglio nessuna icona che una rotta', () => {
  const doc = documentoDi({
    aic: '000000000',
    denominazione: 'GALENICO',
    linkRcp: null,
    linkFi: null,
  });
  assert.equal(doc, null);
});

test('AC4: i nomi sono deduplicati e normalizzati, una ricerca per farmaco non per riga', () => {
  // Stesso farmaco scritto in tre modi su tre righe di terapia diverse.
  const chiavi = chiaviDistinte(['Tachipirina', 'TACHIPIRINA', '  tachipirina  ', 'Eutirox']);
  assert.deepEqual(chiavi, ['EUTIROX', 'TACHIPIRINA']);
});

test('AC4: gli spazi interni multipli non generano chiavi diverse', () => {
  assert.equal(chiaveFarmaco('CACIT  VIT.D3'), 'CACIT VIT.D3');
  assert.equal(chiaveFarmaco(' eutirox 100 '), 'EUTIROX 100');
});

test('AC4: i nomi vuoti non generano ricerche', () => {
  assert.deepEqual(chiaviDistinte(['', '   ', 'LASIX']), ['LASIX']);
});

test("l'etichetta accessibile distingue i due documenti e avvisa della nuova scheda", () => {
  const rcp = etichettaDocumento({ href: RCP, tipo: 'rcp', denominazione: 'KEPPRA' });
  assert.match(rcp, /Riassunto delle Caratteristiche del Prodotto/);
  assert.match(rcp, /KEPPRA/);
  assert.match(rcp, /nuova scheda/);
  const fi = etichettaDocumento({ href: FI, tipo: 'fi', denominazione: 'KEPPRA' });
  assert.match(fi, /Foglietto Illustrativo/);
  assert.doesNotMatch(fi, /Riassunto/);
});

test('AC5: la chiave di ricerca contiene solo il nome del farmaco', () => {
  // Difesa contro una regressione che concatenasse dati di contesto alla query.
  const chiave = chiaveFarmaco('Tachipirina');
  assert.equal(chiave, 'TACHIPIRINA');
  assert.doesNotMatch(chiave, /paziente|patient|[0-9a-f]{8}-/i);
});
