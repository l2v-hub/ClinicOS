// frontend/src/components/operator/cartella/__tests__/rcpStruttura.test.ts
//
// I casi non sono inventati: vengono dall'RCP reale della Tachipirina (AIC 012745, 48 pagine,
// sei RCP concatenati), incluse le due numerazioni sbagliate che AIFA pubblica a pagina 40.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dividiInBlocchi,
  raggruppaInRighe,
  scegliBlocco,
  type FrammentoTesto,
} from '../rcpStruttura.js';

/** Costruisce frammenti da righe descritte come [pagina, y, ...pezzi]. */
function frammenti(righe: [number, number, ...string[]][]): FrammentoTesto[] {
  const out: FrammentoTesto[] = [];
  for (const [pagina, y, ...pezzi] of righe) {
    pezzi.forEach((testo, i) => {
      out.push({ pagina, y, x: 50 + i * 40, larghezza: 30, altezza: 10, testo });
    });
  }
  return out;
}

const RCP_SEMPLICE: [number, number, ...string[]][] = [
  [1, 700, '1.', 'DENOMINAZIONE DEL MEDICINALE'],
  [1, 680, 'TACHIPIRINA 1000 mg compresse'],
  [1, 660, '4.', 'INFORMAZIONI CLINICHE'],
  [1, 640, '4.1', 'Indicazioni terapeutiche'],
  [1, 620, 'Trattamento sintomatico del dolore.'],
  [1, 600, '4.2', 'Posologia e modo di somministrazione'],
  [1, 580, 'Una compressa fino a tre volte al giorno.'],
  [1, 560, '4.3', 'Controindicazioni'],
  [1, 540, 'Ipersensibilita al paracetamolo.'],
  [1, 520, '4.4', 'Avvertenze speciali'],
  [1, 500, 'Non superare la dose consigliata.'],
];

test('AC2: raggruppa i frammenti spezzati in una sola intestazione leggibile', () => {
  // pdf.js consegna "4.1" e "Indicazioni terapeutiche" come frammenti distinti: separati non
  // sono riconoscibili come intestazione.
  const righe = raggruppaInRighe(frammenti(RCP_SEMPLICE));
  assert.ok(righe.some((r) => r.testo === '4.1 Indicazioni terapeutiche'));
});

test('AC2: le righe sono in ordine di lettura, non di estrazione', () => {
  // In PDF la y cresce verso l'alto: la riga piu' in alto va letta per prima.
  const righe = raggruppaInRighe(
    frammenti([
      [2, 700, 'seconda pagina in alto'],
      [1, 100, 'prima pagina in basso'],
      [1, 700, 'prima pagina in alto'],
    ]),
  );
  assert.deepEqual(
    righe.map((r) => r.testo),
    ['prima pagina in alto', 'prima pagina in basso', 'seconda pagina in alto'],
  );
});

test('AC2: individua 4.1, 4.2 e 4.3 e le delimita alla sezione successiva', () => {
  const blocchi = dividiInBlocchi(raggruppaInRighe(frammenti(RCP_SEMPLICE)));
  assert.equal(blocchi.length, 1);
  assert.deepEqual(
    blocchi[0].sezioni.map((s) => s.numero),
    ['4.1', '4.2', '4.3'],
  );
  // 4.3 comprende la propria intestazione e il proprio corpo, e si ferma prima di 4.4.
  const c = blocchi[0].sezioni.find((s) => s.numero === '4.3');
  assert.equal(c?.frammenti.length, 3); // "4.3" + "Controindicazioni" + la riga di corpo
});

test('AC8: un documento con piu RCP produce un blocco per formulazione', () => {
  const blocchi = dividiInBlocchi(
    raggruppaInRighe(
      frammenti([
        [1, 700, '1.', 'DENOMINAZIONE DEL MEDICINALE'],
        [1, 680, 'TACHIPIRINA 1000 mg compresse'],
        [1, 660, '4.2', 'Posologia e modo di somministrazione'],
        [1, 640, 'Una compressa al giorno.'],
        [7, 700, '1.', 'DENOMINAZIONE DEL MEDICINALE'],
        [7, 680, 'TACHIPIRINA 120 mg/5 ml sciroppo'],
        [7, 660, '4.2', 'Posologia e modo di somministrazione'],
        [7, 640, 'Un misurino ogni sei ore.'],
      ]),
    ),
  );
  assert.equal(blocchi.length, 2);
  assert.equal(blocchi[0].denominazione, 'TACHIPIRINA 1000 mg compresse');
  assert.equal(blocchi[1].denominazione, 'TACHIPIRINA 120 mg/5 ml sciroppo');
  assert.equal(blocchi[1].paginaIniziale, 7);
});

test("AC8: riconosce l'apertura di un RCP anche se AIFA sbaglia il numero", () => {
  // Caso reale, pagina 40 dell'RCP della Tachipirina: "2." al posto di "1.".
  const blocchi = dividiInBlocchi(
    raggruppaInRighe(
      frammenti([
        [1, 700, '1.', 'DENOMINAZIONE DEL MEDICINALE'],
        [1, 680, 'TACHIPIRINA 1000 mg compresse'],
        [40, 660, '2.', 'DENOMINAZIONE DEL MEDICINALE'],
        [40, 640, 'TACHIPIRINA 120 mg/5 ml sospensione orale'],
      ]),
    ),
  );
  assert.equal(blocchi.length, 2, 'il sesto RCP non deve confondersi col precedente');
  assert.equal(blocchi[1].denominazione, 'TACHIPIRINA 120 mg/5 ml sospensione orale');
});

test('AC2: il titolo prevale sul numero stampato quando i due si contraddicono', () => {
  // Caso reale: a pagina 40 la posologia e' numerata "4.3", e una vera 4.3 arriva dopo.
  const blocchi = dividiInBlocchi(
    raggruppaInRighe(
      frammenti([
        [40, 700, '1.', 'DENOMINAZIONE DEL MEDICINALE'],
        [40, 680, 'TACHIPIRINA sospensione orale'],
        [40, 660, '4.1', 'Indicazioni terapeutiche'],
        [40, 640, 'Trattamento del dolore.'],
        [40, 620, '4.3', 'Posologia e modo di somministrazione'],
        [40, 600, 'Un misurino ogni sei ore.'],
        [43, 700, '4.3', 'Controindicazioni'],
        [43, 680, 'Ipersensibilita al paracetamolo.'],
      ]),
    ),
  );
  const numeri = blocchi[0].sezioni.map((s) => s.numero);
  assert.deepEqual(numeri, ['4.1', '4.2', '4.3'], 'la posologia deve restare 4.2');
  const posologia = blocchi[0].sezioni.find((s) => s.numero === '4.2');
  assert.match(posologia!.titolo, /Posologia/);
  const controindicazioni = blocchi[0].sezioni.find((s) => s.numero === '4.3');
  assert.match(controindicazioni!.titolo, /Controindicazioni/);
});

// ── Scelta della formulazione: la parte da cui dipende quale posologia legge l'operatore ──

const BLOCCHI = [
  { denominazione: 'TACHIPIRINA 1000 mg compresse', paginaIniziale: 1, sezioni: [] },
  { denominazione: 'TACHIPIRINA 500 mg compresse', paginaIniziale: 7, sezioni: [] },
  {
    denominazione: 'Tachipirina 10 mg/ml soluzione per infusione',
    paginaIniziale: 15,
    sezioni: [],
  },
  { denominazione: 'TACHIPIRINA 120 mg/5 ml sciroppo', paginaIniziale: 23, sezioni: [] },
];

test('AC10: il dosaggio distingue due confezioni della stessa forma', () => {
  assert.equal(scegliBlocco(BLOCCHI, { dosaggio: '1000 mg', forma: 'Compressa' }), 0);
  assert.equal(scegliBlocco(BLOCCHI, { dosaggio: '500 mg', forma: 'Compressa' }), 1);
});

test('AC10: la forma dell anagrafica trova la denominazione anche se le parole differiscono', () => {
  // Anagrafica: "Soluzione per infusione". Denominazione: "soluzione per infusione". Ma anche
  // "Compressa" (singolare) deve trovare "compresse" (plurale).
  assert.equal(scegliBlocco(BLOCCHI, { dosaggio: '', forma: 'Soluzione per infusione' }), 2);
  assert.equal(scegliBlocco(BLOCCHI, { dosaggio: '120 mg/5 ml', forma: 'Sciroppo' }), 3);
});

test('AC9: due confezioni ugualmente plausibili non producono una scelta', () => {
  // Le due sciroppo 120 mg/5 ml dell'RCP reale: identiche a meno di "senza zucchero".
  const ambigui = [
    { denominazione: 'TACHIPIRINA 120 mg/5 ml sciroppo', paginaIniziale: 23, sezioni: [] },
    {
      denominazione: 'TACHIPIRINA 120 mg/5 ml sciroppo senza zucchero',
      paginaIniziale: 32,
      sezioni: [],
    },
  ];
  assert.equal(scegliBlocco(ambigui, { dosaggio: '120 mg/5 ml', forma: 'Sciroppo' }), null);
});

test('AC9: un dosaggio che non esiste nel documento non sceglie la forma piu simile', () => {
  // 250 mg non e' fra le confezioni: due compresse restano equivalenti, quindi nessuna scelta.
  assert.equal(scegliBlocco(BLOCCHI, { dosaggio: '250 mg', forma: 'Compressa' }), null);
});

test('AC9: senza dosaggio ne forma non si tira a indovinare', () => {
  assert.equal(scegliBlocco(BLOCCHI, { dosaggio: '', forma: '' }), null);
  assert.equal(scegliBlocco(BLOCCHI, {}), null);
});

test('AC9: con un solo RCP nel documento la scelta e obbligata', () => {
  assert.equal(scegliBlocco([BLOCCHI[0]], {}), 0);
});
