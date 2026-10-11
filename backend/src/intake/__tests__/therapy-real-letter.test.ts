// 2026-10-11: lettera di dimissione reale (scansione di 4 pagine) segnalata dall'utente: la terapia
// inizia in fondo a pagina 1 e prosegue in cima a pagina 2 senza titolo, dopo l'intestazione del
// paziente ripetuta; insulina basale (LANTUS) e schema a fasce (HUMALOG). Trascrizione nello stile
// dell'OCR (markdown), con paziente, medici e struttura ANONIMIZZATI: nessun dato reale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRepeatedHeaders } from '../../ai/sections/header-filter.js';
import { parseNarrativeFromMarkdown } from '../../ai/sections/markdown-parse.js';
import {
  parseTherapyLine,
  therapyRowsFromNarrative,
  type ParsedTherapyRow,
} from '../parse-discharge-therapy.js';

const BANNER = `![img-0.jpeg](img-0.jpeg)

# Azienda Usl Esempio

Viale Esempio, 1 - 40000 Esempio (BO)

Lungodegenza Esempio
DIRETTORE ESEMPIO

| Paziente | ROSSI MARIO | Codice fiscale | RSSMRA30A01H501Z |
| --- | --- | --- | --- |
| Nascita | 01/01/1930 ESEMPIO | Numero Nosografico | 2026/00001 |
| Residenza | VIA ESEMPIO, 1 ESEMPIO |  |  |`;

const PAGE1 = `${BANNER}

## LETTERA DIMISSIONE

Il/La Sig. / ra ROSSI MARIO
ricoverato/a in data 14/09/2026 viene dimesso/a in data 6/10/2026

## DIAGNOSI

Sindrome ipocinetica in postumi di focolaio broncopneumonico destro.

Patologie di base: DM insulino dipendente. Polineuropatia. IRC.

## DECORSO_OSPEDALIERO

Abbiamo effettuato teleconsulto diabetologico per il riscontro di glicemie non controllate, in data odierna abbiamo risentito la collega diabetologa telefonicamente per aggiornamenti terapia (inserire Humulog ai pasti principali come indicato sotto in terapia).

## Prestazioni e Interventi

- esami ematici: WBC 8.30, Hb 8.6, PLT 228000, creatinina1.33, sodio140, potassio 4.4, PCR 4.57 (da 13)

## TERAPIA

Terapia Domiciliare
TACHIPIRINA 1000 1 CP ORE 8-15-20
LANSOX CPR OROD 30 MGR 1 Cpr ore 08:00
LYRICA CPS RIGIDE 25 MG 1 Cpr ore 08:00 e alle 20:00
CARDIOASPIRIN CPR 100 MGR 1 Cpr ore 12:00
ROSUMIBE 10/10 MG CPR 1 Dosi ore 22:00

Firmato digitalmente dal dott.MEDICO ESEMPIO
06.10.2026 09:29:14 CEST

1/3`;

const PAGE2_BODY = `MIRAPEXIN*30CPR 0,18MG N/ORD 1 Cpr ore 22:00
XANAX*OS GTT FL 20ML 0,75MG/ML Al Bisogno 12 Gtt (max x 2/die)
SILODYX*30CPS 8MG 1 Cps ore 20:00
CALCIPARINA 5000U/0,2 ML 1 F ore 08:00 e alle 20:00
FUROSEMIDE*30CPR 25MG 1 Dosi ore 08:00
LATTULAC*SCIR 200ML 67G/100ML 2 Dosi ore 08:00
TARGIN CP RIL PROL 5MG/2,5MG 1 Cpr ore 08:00 e alle 21:00
ORAMORPH OS 10 MGR/5 ML Al Bisogno 1 Mg (max x 3/die)
MOVICOL*OS POLV 20BUST 13,8G 1 Bust ore 14:00 e alle 08:00
RIZMOIC*28CPR RIV 200MCG 1 Cpr ore 12:00
TRAJENTA CPR RIV 5 MGR 1 Cpr ore 08:00
DIAMICRON*30CPR 60MG RM 1/2 Dosi ore 08:00
LANTUS FL SC 100 UI /ML 10 Ui ore 08:00
HUMALOG*1 FL 10 ML 100 UI/ML 4 U se glicemia tra 200-250, 6 U tra 250-300, 8 U da 350-450, eventuale rivalutazione diabetologica con glicemia e Hb glicata
AUGMENTIN CPR 875 + 125 MG 1 Cpr ore 08:00 e alle 14:00 e alle 21:00 fino al 12/10/2026
DIETA PER DIABETICI + ADEGUATO APPORTO IDRICO
Controlli periodici di emocromo, creatinina, elettroliti, glicemia`;

const PAGE2 = `${BANNER}

${PAGE2_BODY}

## CONSIGLI_E_CONTROLLI

Si consiglia l'esecuzione di vaccino anti-influenzale per la stagione autunnale (rivolgersi al proprio Medico di Medicina Generale)

Restando a sua completa disposizione per ogni ulteriore informazione e chiarimento si inviano cordiali saluti.

Dirigenti Medici: Medico Uno, Medico Due`;

const DRUGS_P1 = ['TACHIPIRINA', 'LANSOX', 'LYRICA', 'CARDIOASPIRIN', 'ROSUMIBE'];
const DRUGS_P2 = [
  'MIRAPEXIN',
  'XANAX',
  'SILODYX',
  'CALCIPARINA',
  'FUROSEMIDE',
  'LATTULAC',
  'TARGIN',
  'ORAMORPH',
  'MOVICOL',
  'RIZMOIC',
  'TRAJENTA',
  'DIAMICRON',
  'LANTUS',
  'HUMALOG',
  'AUGMENTIN',
];

function rowsOf(pages: string[]): ParsedTherapyRow[] {
  const cleaned = filterRepeatedHeaders(pages.join('\n\n')).cleanedText;
  const narrative = parseNarrativeFromMarkdown(cleaned, {}, { id: 'g1', filename: 'Lettera 1' });
  return therapyRowsFromNarrative(narrative as unknown as Record<string, unknown>, '2026-10-11');
}
const byName = (rows: ParsedTherapyRow[], name: string) => {
  const row = rows.find((r) => r.farmacoNome === name);
  assert.ok(row, `${name} missing`);
  return row;
};

test('AC1: la lettera su due pagine dà esattamente i 20 farmaci, senza dieta né controlli', () => {
  const rows = rowsOf([PAGE1, PAGE2]);
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    [...DRUGS_P1, ...DRUGS_P2],
  );
});

test('AC1: anche senza markdown (OCR in testo semplice) i farmaci sono 20', () => {
  const plain = [PAGE1, PAGE2].map((p) => p.replace(/^#+ /gm, '').replace(/^!\[.*$/gm, ''));
  assert.deepEqual(
    rowsOf(plain).map((r) => r.farmacoNome),
    [...DRUGS_P1, ...DRUGS_P2],
  );
});

test('AC2: gli orari scritti nella riga vengono letti anche dopo sigle e concentrazioni', () => {
  const rows = rowsOf([PAGE1, PAGE2]);
  const times: Record<string, string[]> = {
    TACHIPIRINA: ['08:00', '15:00', '20:00'],
    ROSUMIBE: ['22:00'],
    MIRAPEXIN: ['22:00'],
    CALCIPARINA: ['08:00', '20:00'],
    LATTULAC: ['08:00'],
    DIAMICRON: ['08:00'],
    LANTUS: ['08:00'],
    AUGMENTIN: ['08:00', '14:00', '21:00'],
    MOVICOL: ['14:00', '08:00'],
  };
  for (const [name, orari] of Object.entries(times))
    assert.deepEqual(byName(rows, name).orari, orari, name);
  // Al bisogno: nessun orario inventato.
  assert.deepEqual(byName(rows, 'XANAX').orari, []);
  assert.deepEqual(byName(rows, 'ORAMORPH').orari, []);
});

test('AC2: un numero non collocato lascia la riga da verificare anche con gli orari', () => {
  const rows = rowsOf([PAGE1, PAGE2]);
  // "1000" senza unità, "fino al 12/10/2026": restano sotto gli occhi dell'operatore.
  assert.equal(byName(rows, 'TACHIPIRINA').stato, 'da_verificare');
  assert.equal(byName(rows, 'AUGMENTIN').stato, 'da_verificare');
  assert.equal(byName(rows, 'LANSOX').stato, 'ok');
});

test('AC3: insulina basale — concentrazione, 10 unità alle 08:00', () => {
  const lantus = byName(rowsOf([PAGE1, PAGE2]), 'LANTUS');
  assert.equal(lantus.dosaggio, '100 UI /ML');
  assert.equal(lantus.quantita, '10 UI');
  assert.deepEqual(lantus.orari, ['08:00']);
  assert.equal(lantus.doseMode, 'fixed');
});

test('AC3: HUMALOG — fasce esattamente come scritte, riga da verificare', () => {
  const humalog = byName(rowsOf([PAGE1, PAGE2]), 'HUMALOG');
  assert.equal(humalog.dosaggio, '100 UI/ML');
  assert.equal(humalog.doseMode, 'glucose_scale');
  assert.deepEqual(humalog.glucoseScale, [
    { minMgDl: 200, maxMgDl: 250, units: 4 },
    { minMgDl: 250, maxMgDl: 300, units: 6 },
    { minMgDl: 350, maxMgDl: 450, units: 8 },
  ]);
  assert.equal(humalog.stato, 'da_verificare');
});

test('AC3: dosaggi composti e quantità non spezzati', () => {
  const rows = rowsOf([PAGE1, PAGE2]);
  assert.equal(byName(rows, 'CALCIPARINA').dosaggio, '5000U/0,2 ML');
  assert.equal(byName(rows, 'CALCIPARINA').quantita, '1 F');
  assert.equal(byName(rows, 'AUGMENTIN').dosaggio, '875 + 125 MG');
  assert.equal(byName(rows, 'ROSUMIBE').dosaggio, '10/10 MG');
  assert.equal(byName(rows, 'XANAX').dosaggio, '0,75MG/ML');
  assert.equal(byName(rows, 'LATTULAC').dosaggio, '67G/100ML');
});

test('AC4: la pagina 2 importata da sola (elenco prima di ogni titolo) dà i suoi 15 farmaci', () => {
  assert.deepEqual(
    rowsOf([PAGE2]).map((r) => r.farmacoNome),
    DRUGS_P2,
  );
});

test('una basale a dose fissa senza concentrazione resta com era (dosaggio = unità)', () => {
  const row = parseTherapyLine('LANTUS 14 UI ore 22:00');
  assert.equal(row.dosaggio, '14 UI');
  assert.equal(row.quantita, '');
  assert.deepEqual(row.orari, ['22:00']);
});

test('la prosa prima dell ora continua a bloccare la lettura degli orari', () => {
  const row = parseTherapyLine('RAMIPRIL 5 MG 1 Cpr se pressione alta ore 08:00');
  assert.deepEqual(row.orari, []);
  assert.equal(row.stato, 'da_verificare');
});

// ── QA r1 (FAILED VALIDATION) ────────────────────────────────────────────────
import { parseDischargeTherapy } from '../parse-discharge-therapy.js';

test('QA F1: un dosaggio con separatori delle migliaia resta il dosaggio', () => {
  const r = parseTherapyLine('PENICILLINA 1.200.000 UI 1 F (IM)');
  assert.equal(r.dosaggio, '1.200.000 UI');
  assert.equal(r.quantita, '1 F');
});

test('QA F2: sospensione, negazione o condizione nella riga → mai ok', () => {
  for (const line of [
    'LANTUS 100 UI/ML 10 UI ore 22:00 NON SOMMINISTRARE',
    'LANTUS 100 UI/ML 10 UI ore 22:00 SOSPESA',
    'LANTUS 100 UI/ML 10 UI ore 22:00 SOLO SE GLICEMIA ELEVATA',
    'LANTUS SOSPESA 100 UI/ML 10 UI ore 22:00',
    'FUROSEMIDE 25 MG 1 CPR ore 08:00 NON SOMMINISTRARE',
    'FUROSEMIDE SOSPESA 25 MG 1 CPR ore 08:00',
    'LEVOPRAID 25 MG 1 F (IM) ore 08:00 SE AGITAZIONE',
    'NOVORAPID 100 UI/ML 4 UI ai pasti',
  ])
    assert.equal(parseTherapyLine(line).stato, 'da_verificare', line);
});

test('QA F3: unità di insulina scritte come intervallo o somma non diventano un frammento', () => {
  for (const line of [
    'LANTUS 100 UI/ML 10-12 UI ore 22:00',
    'NOVORAPID 100 UI/ML 6+6+4 U ai pasti',
    'NOVORAPID 100 UI/ML 6-6-4 U ore 08:00',
  ]) {
    const r = parseTherapyLine(line);
    assert.equal(r.quantita, '', line);
    assert.equal(r.stato, 'da_verificare', line);
  }
});

test('QA F4: il preambolo non porta in terapia prosa, misure o firme', () => {
  const rows = (pre: string) => {
    const n = parseNarrativeFromMarkdown(`${pre}\n\n## DIAGNOSI\n\nPolmonite.`, {}, {});
    return therapyRowsFromNarrative(n as unknown as Record<string, unknown>, '2026-10-11').map(
      (r) => r.farmacoNome,
    );
  };
  assert.deepEqual(
    rows('Gentile Collega, dimettiamo il paziente che assume Ramipril 5 mg/die\nSi ricovera per scompenso.'),
    [],
  );
  assert.deepEqual(rows('GLICEMIA 150 MG/DL ore 08:00\nSaturazione 96%'), []);
  assert.deepEqual(
    rows(
      'RAMIPRIL CPR 5 MG 1 Cpr ore 08:00\nIl paziente viene dimesso in buone condizioni.\nSi raccomanda controllo pressorio.\nFirma del medico',
    ),
    ['RAMIPRIL'],
  );
  assert.deepEqual(
    rows(`${PAGE2_BODY}\nFirmato digitalmente dal dott.MEDICO ESEMPIO\n06.10.2026 09:29:14 CEST`),
    DRUGS_P2,
  );
});

test('QA F5: una riga "Controllo" fra insulina e fasce non stacca lo schema', () => {
  const rows = parseDischargeTherapy(
    'HUMALOG 100 UI/ML secondo schema glicemico:\nControllo glicemico pre-prandiale\n150-200: 2 UI\n201-250: 4 UI',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].farmacoNome, 'HUMALOG');
  assert.deepEqual(rows[0].glucoseScale, [
    { minMgDl: 150, maxMgDl: 200, units: 2 },
    { minMgDl: 201, maxMgDl: 250, units: 4 },
  ]);
});

test('QA F5: una riga che nomina un farmaco non viene scartata; la dieta sì', () => {
  const names = parseDischargeTherapy(
    'RAMIPRIL CPR 5 MG 1 Cpr ore 08:00\nMonitoraggio glicemico e Humalog secondo schema ai pasti\nDIETA IPOSODICA 1500 ML/DIE',
  ).map((r) => r.farmacoNome);
  assert.deepEqual(names, ['RAMIPRIL', 'MONITORAGGIO']);
});

test('QA F7: insulina con volume della penna prima della concentrazione', () => {
  const r = parseTherapyLine('LANTUS 3 ML 100 UI/ML 10 UI ore 22:00');
  assert.equal(r.quantita, '10 UI');
  assert.equal(r.dosaggio, '100 UI/ML');
  assert.equal(r.stato, 'da_verificare');
});

// ── QA r2 (FAILED VALIDATION) ────────────────────────────────────────────────
const preambleRows = (body: string) => {
  const n = parseNarrativeFromMarkdown(`${body}\n\n## CONSIGLI_E_CONTROLLI\n\nRiposo.`, {}, {});
  return therapyRowsFromNarrative(n as unknown as Record<string, unknown>, '2026-10-11').map(
    (r) => r.farmacoNome,
  );
};
const MIRA = 'MIRAPEXIN*30CPR 0,18MG N/ORD 1 Cpr ore 22:00';
const ROSU = 'ROSUMIBE 10/10 MG CPR 1 Dosi ore 22:00';

test('QA r2 F1: una pagina di continuazione non perde farmaci dopo righe vuote o righe incomplete', () => {
  assert.deepEqual(preambleRows(PAGE2_BODY.split('\n').join('\n\n')), DRUGS_P2);
  assert.deepEqual(preambleRows([ROSU, 'LASIX 25 MG 1 CPR', MIRA].join('\n')), [
    'ROSUMIBE',
    'LASIX',
    'MIRAPEXIN',
  ]);
  assert.deepEqual(
    preambleRows([ROSU, 'SODIO CLORURO 0,9% 100 ML 1 FL (EV) ore 08:00', MIRA].join('\n')),
    ['ROSUMIBE', 'SODIO', 'MIRAPEXIN'],
  );
  assert.deepEqual(
    preambleRows([ROSU, 'CARDIOASPIRIN 100 MG 1 CPR ore 12:00 sospesa per intervento', MIRA].join('\n')),
    ['ROSUMIBE', 'CARDIOASPIRIN', 'MIRAPEXIN'],
  );
  assert.deepEqual(
    preambleRows(
      [
        'LANTUS 100 UI/ML 10 UI ore 22:00',
        'HUMALOG 100 UI/ML secondo schema:',
        '150-200: 2 UI',
        '201-250: 4 UI',
        MIRA,
      ].join('\n'),
    ),
    ['LANTUS', 'HUMALOG', 'MIRAPEXIN'],
  );
});

test('QA r2 F2: unità come alternativa ("10 a 12 UI", "10 o 12 UI") non diventano la quantità', () => {
  for (const line of ['LANTUS 100 UI/ML 10 a 12 UI ore 22:00', 'LANTUS 100 UI/ML 10 o 12 UI ore 22:00']) {
    const r = parseTherapyLine(line);
    assert.equal(r.quantita, '', line);
    assert.equal(r.stato, 'da_verificare', line);
  }
});

test('QA r2 F3: un numero con il punto delle migliaia rende la riga da verificare', () => {
  for (const line of [
    'TACHIPIRINA 1.000 MG 1 CPR ore 08:00',
    'INSULINA 100 UI/ML 1.000 UI ore 08:00',
    'PENICILLINA 1.200.000 UI 1 F (IM)',
  ])
    assert.equal(parseTherapyLine(line).stato, 'da_verificare', line);
});

// ── QA r3 ────────────────────────────────────────────────────────────────────
test('QA r3 F2: un farmaco senza dose in fondo a una pagina senza titolo non si perde', () => {
  assert.deepEqual(
    preambleRows([ROSU, MIRA, 'PANTOPRAZOLO 1 cpr la mattina', 'EUTIROX a digiuno'].join('\n')),
    ['ROSUMIBE', 'MIRAPEXIN', 'PANTOPRAZOLO', 'EUTIROX'],
  );
  // La firma in coda allo stesso paragrafo resta fuori.
  assert.deepEqual(
    preambleRows([ROSU, 'FIRMATO DIGITALMENTE DAL DOTT. ESEMPIO'].join('\n')),
    ['ROSUMIBE'],
  );
});

test('QA r3 F4: "max 12 UI" e "10 ~ 12 UI" non diventano la quantità', () => {
  for (const line of ['LANTUS 100 UI/ML max 12 UI ore 22:00', 'LANTUS 100 UI/ML 10 ~ 12 UI ore 22:00']) {
    const r = parseTherapyLine(line);
    assert.equal(r.quantita, '', line);
    assert.equal(r.stato, 'da_verificare', line);
  }
});
