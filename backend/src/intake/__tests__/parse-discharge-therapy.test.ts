import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDischargeTherapy, parseTherapyLine } from '../parse-discharge-therapy.js';

// Realistic fixture from issue #156 (NOT hardcoded in the parser — used only as test data).
const FIXTURE = [
  'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  'EUTIROX 100*FL 50CPR 100MCG (OS) 1 Cpr ore 08:00 dal 03/07/2026 (Classe A)',
  'CACIT VIT.D3 BS 1GR/880UI (OS) 1 Dosi ore 08:00 dal 03/07/2026 Mar Gio Sab Dom (Classe A)',
  'KANRENOL CPR 25 MGR (OS) 1 Cpr ore 18:00 dal 03/07/2026 (Classe C)',
  'LASIX CPR 25 MG (OS) 1 Cpr ore 08:00 e alle 14:00 dal 03/07/2026 (Classe A)',
  'FOLINA CPS 5 MGR (OS) 1 Cps ore 08:00 dal 03/07/2026 (Classe A)',
  'LATTULAC*SCIR 200ML 67G/100ML (OS) 1 Dosi ore 08:00 dal 03/07/2026 (Classe )',
  'MEDROL CPR 4 MGR (OS) 1 Cpr ore 08:00 dal 03/07/2026 (Classe C)',
  'CETIRIZINA ZENT*20CPR RIV 10MG (OS) 1/2 Dosi ore 08:00 dal 03/07/2026 (Classe )',
  'PEVARYL POLVERE INGUINE SN X 1 AL DI',
].join('\n');

test('#156 AC1/AC2: recognises therapy and yields one row per drug line', () => {
  const rows = parseDischargeTherapy(FIXTURE);
  assert.equal(rows.length, 10);
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    [
      'KEPPRA',
      'EUTIROX',
      'CACIT',
      'KANRENOL',
      'LASIX',
      'FOLINA',
      'LATTULAC',
      'MEDROL',
      'CETIRIZINA',
      'PEVARYL',
    ],
  );
});

test('#156 AC3: KEPPRA structured fields', () => {
  const r = parseTherapyLine(
    'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  );
  assert.equal(r.farmacoNome, 'KEPPRA');
  assert.equal(r.forma, 'CPR RIV');
  assert.equal(r.dosaggio, '500 MGR');
  assert.equal(r.viaSomministrazione, 'OS');
  assert.equal(r.quantita, '1 Cpr');
  assert.equal(r.dataInizio, '2026-07-03');
  assert.equal(r.classe, 'A');
  assert.equal(r.stato, 'ok');
  assert.ok(r.originalText.startsWith('KEPPRA'));
});

test('#156 AC4: multiple times are all extracted', () => {
  const r = parseTherapyLine(
    'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  );
  assert.deepEqual(r.orari, ['08:00', '20:00']);
  const r2 = parseTherapyLine(
    'LASIX CPR 25 MG (OS) 1 Cpr ore 08:00 e alle 14:00 dal 03/07/2026 (Classe A)',
  );
  assert.deepEqual(r2.orari, ['08:00', '14:00']);
});

test('#156 AC5: specific weekdays are captured', () => {
  const r = parseTherapyLine(
    'CACIT VIT.D3 BS 1GR/880UI (OS) 1 Dosi ore 08:00 dal 03/07/2026 Mar Gio Sab Dom (Classe A)',
  );
  assert.deepEqual(r.giorni, ['Mar', 'Gio', 'Sab', 'Dom']);
  assert.equal(r.dosaggio, '1GR/880UI'); // unusual dosage preserved (AC "dosaggio non perso")
});

test('#156 AC6: incomplete line kept as da_verificare, original preserved, not dropped', () => {
  const rows = parseDischargeTherapy(FIXTURE);
  const pev = rows.find((r) => r.farmacoNome === 'PEVARYL')!;
  assert.ok(pev, 'PEVARYL row must exist');
  assert.equal(pev.stato, 'da_verificare');
  assert.ok(pev.originalText.includes('PEVARYL POLVERE INGUINE SN X 1 AL DI'));
});

test('#156 AC3: unusual dosage/quantity and empty class preserved (CETIRIZINA)', () => {
  const r = parseTherapyLine(
    'CETIRIZINA ZENT*20CPR RIV 10MG (OS) 1/2 Dosi ore 08:00 dal 03/07/2026 (Classe )',
  );
  assert.equal(r.farmacoNome, 'CETIRIZINA');
  assert.equal(r.dosaggio, '10MG');
  assert.equal(r.quantita, '1/2 Dosi');
  assert.equal(r.classe, '');
});

test('#156 AC10: no hardcoding — a DIFFERENT prescription of the same shape parses correctly', () => {
  const r = parseTherapyLine(
    'AUGMENTIN CPR 875 MG (OS) 1 Cpr ore 09:00 e alle 21:00 dal 12/01/2027 Lun Mer Ven (Classe A)',
  );
  assert.equal(r.farmacoNome, 'AUGMENTIN');
  assert.equal(r.dosaggio, '875 MG');
  assert.equal(r.viaSomministrazione, 'OS');
  assert.deepEqual(r.orari, ['09:00', '21:00']);
  assert.deepEqual(r.giorni, ['Lun', 'Mer', 'Ven']);
  assert.equal(r.dataInizio, '2027-01-12');
  assert.equal(r.classe, 'A');
  assert.equal(r.stato, 'ok');
});

test('#156: every row keeps its original text verbatim (audit/reference)', () => {
  const rows = parseDischargeTherapy(FIXTURE);
  for (const r of rows) assert.ok(r.originalText.length > 0);
});

test('#156: blank/empty text yields no rows', () => {
  assert.deepEqual(parseDischargeTherapy(''), []);
  assert.deepEqual(parseDischargeTherapy('\n   \n'), []);
});

// ── #274: medicinale + quantitativo + modalità di somministrazione anche in testo libero ──

test('#274: free-text administration route is captured (per os, endovena, sottocute)', () => {
  assert.equal(
    parseTherapyLine('Ramipril 5 mg 1 compressa al giorno per os').viaSomministrazione,
    'OS',
  );
  assert.equal(
    parseTherapyLine('Furosemide 25 mg 1 fiala 2 volte al giorno endovena').viaSomministrazione,
    'EV',
  );
  assert.equal(parseTherapyLine('Enoxaparina 4000 UI sottocute la sera').viaSomministrazione, 'SC');
  assert.equal(
    parseTherapyLine('Insulina 10 UI sottocutanea prima dei pasti').viaSomministrazione,
    'SC',
  );
  assert.equal(parseTherapyLine('Morfina 10 mg intramuscolo').viaSomministrazione, 'IM');
});

test('#274: full-word quantity units are captured (compressa/e, fiala/e, capsula/e)', () => {
  assert.equal(
    parseTherapyLine('Ramipril 5 mg 1 compressa al giorno per os').quantita,
    '1 compressa',
  );
  assert.equal(
    parseTherapyLine('Amoxicillina 875 mg 2 compresse al giorno per os').quantita,
    '2 compresse',
  );
  assert.equal(parseTherapyLine('Furosemide 25 mg 1 fiala endovena').quantita, '1 fiala');
});

test('#274: medicinale + quantitativo + via together upgrade the row to ok', () => {
  const r = parseTherapyLine('Pantoprazolo 20 mg 1 cp al mattino per os');
  assert.equal(r.farmacoNome, 'PANTOPRAZOLO');
  assert.equal(r.dosaggio, '20 mg');
  assert.equal(r.quantita, '1 cp');
  assert.equal(r.viaSomministrazione, 'OS');
  assert.equal(r.stato, 'ok');
});

test('#274: parenthesized route codes still work (no regression)', () => {
  assert.equal(
    parseTherapyLine('KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00').viaSomministrazione,
    'OS',
  );
  assert.equal(parseTherapyLine('Farmaco 10 MG (EV) 1 Fl ore 08:00').viaSomministrazione, 'EV');
});

// ── #296: righe vuote = delimitatore di fine terapia ─────────────────────────
// Dopo contenuto farmacologico, il primo paragrafo (separato da righe vuote) che NON parla
// di farmaci termina la terapia: quel testo e tutto ciò che segue non producono righe.

const PROSE = [
  'Si consiglia controllo cardiologico tra 30 giorni.',
  'Proseguire la fisioterapia respiratoria a domicilio.',
  'In caso di febbre contattare il curante.',
].join('\n');

test('#296 AC2: la prosa dopo righe vuote non diventa righe farmaco (terapia terminata)', () => {
  const rows = parseDischargeTherapy(`${FIXTURE}\n\n${PROSE}`);
  assert.equal(rows.length, 10, 'solo le 10 prescrizioni, niente righe spurie dalla prosa');
  assert.ok(
    rows.every((r) => r.farmacoNome !== 'SI' && r.farmacoNome !== 'PROSEGUIRE'),
    'nessuna riga creata dalle frasi di consiglio',
  );
});

test('#296 AC2: tutto ciò che segue il terminatore è escluso (anche paragrafi successivi)', () => {
  const rows = parseDischargeTherapy(
    `${FIXTURE}\n\n${PROSE}\n\nAUGMENTIN CPR 875 MG (OS) 1 Cpr ore 09:00`,
  );
  // Il requisito è esplicito: dopo il primo paragrafo non farmacologico la terapia È terminata.
  assert.equal(rows.length, 10);
  assert.ok(!rows.some((r) => r.farmacoNome === 'AUGMENTIN'));
});

test('#296 AC4: più blocchi farmaci separati da righe vuote sono tutti parsati', () => {
  const rows = parseDischargeTherapy(
    [
      'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
      '',
      'LASIX CPR 25 MG (OS) 1 Cpr ore 08:00 e alle 14:00 dal 03/07/2026 (Classe A)',
      '',
      '',
      'Pantoprazolo 20 mg 1 cp al mattino per os',
    ].join('\n'),
  );
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['KEPPRA', 'LASIX', 'PANTOPRAZOLO'],
  );
});

test('#296 AC4: intestazione iniziale + riga vuota non termina il blocco', () => {
  const rows = parseDischargeTherapy(
    ['Terapia domiciliare:', '', 'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00'].join('\n'),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].farmacoNome, 'KEPPRA');
});

test('#296 AC3: righe atipiche NELLO stesso paragrafo dei farmaci restano da_verificare (no drop)', () => {
  // PEVARYL (nessun segnale strutturale) è nel MEDESIMO paragrafo: mai scartato.
  const rows = parseDischargeTherapy(FIXTURE);
  assert.ok(rows.some((r) => r.farmacoNome === 'PEVARYL' && r.stato === 'da_verificare'));
});

// ── Intestazione = marcatore d'inizio elenco (non un farmaco) ────────────────
// La riga "Terapia / Tp domiciliare o similare" annuncia l'elenco: non deve mai diventare
// una riga farmaco. Il riconoscimento è strutturale, non una lista chiusa di varianti.

const INTESTAZIONI = [
  'Terapia:',
  'Terapia domiciliare',
  'Tp Domiciliare',
  'TERAPIA ALLA DIMISSIONE:',
  'Terapia consigliata:',
  'Terapia farmacologica alla dimissione:',
  'TD:',
  'T.D.:',
  '## Terapia domiciliare',
  '**Terapia:**',
  '- Terapia domiciliare:',
];

test('AC1: ogni variante di intestazione non genera una riga farmaco', () => {
  for (const intestazione of INTESTAZIONI) {
    const rows = parseDischargeTherapy(
      [intestazione, 'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00'].join('\n'),
    );
    assert.equal(rows.length, 1, `intestazione non riconosciuta: ${intestazione}`);
    assert.equal(rows[0].farmacoNome, 'KEPPRA', `intestazione non riconosciuta: ${intestazione}`);
  }
});

test("AC1: l'intestazione non interrompe l'elenco che la segue", () => {
  const rows = parseDischargeTherapy(['TERAPIA ALLA DIMISSIONE:', FIXTURE].join('\n'));
  assert.equal(rows.length, 10);
  assert.ok(!rows.some((r) => r.farmacoNome === 'TERAPIA'));
});

test('AC2: una riga che prescrive resta un farmaco anche se inizia per "Terapia"', () => {
  const conDose = parseDischargeTherapy('Terapia con Ramipril 5 mg 1 cpr per os');
  assert.equal(conDose.length, 1);
  assert.equal(conDose[0].farmacoNome, 'RAMIPRIL');

  // Nessun segnale strutturale MA nessun due punti e parole non-qualificatore: è un farmaco.
  const senzaDose = parseDischargeTherapy('Terapia con Ramipril per os');
  assert.equal(senzaDose.length, 1);
  assert.equal(senzaDose[0].farmacoNome, 'RAMIPRIL');
});

test('AC2: una riga di prosa clinica che nomina la terapia non viene scartata', () => {
  const rows = parseDischargeTherapy('Terapia antibiotica proseguita per sette giorni in reparto');
  assert.equal(rows.length, 1, 'la riga non deve sparire silenziosamente');
});

// ── Note = tutto ciò che non si riesce a collocare ───────────────────────────

test('AC3: la forma non assorbe la riga; il resto finisce in note e la riga è da verificare', () => {
  const r = parseTherapyLine('PEVARYL POLVERE INGUINE SN X 1 AL DI');
  assert.equal(r.farmacoNome, 'PEVARYL');
  assert.ok(
    r.forma.split(/\s+/).filter(Boolean).length <= 3,
    `forma troppo lunga: "${r.forma}" — deve smettere di fare da discarica`,
  );
  assert.ok(r.note.length > 0, 'il testo non collocato deve arrivare in note');
  assert.match(r.note, /1 AL DI/i);
  assert.equal(r.stato, 'da_verificare');
  assert.equal(r.originalText, 'PEVARYL POLVERE INGUINE SN X 1 AL DI');
});

test('AC4: la via riconosciuta a parole non resta duplicata in note', () => {
  const r = parseTherapyLine('Ramipril 5 mg 1 compressa al giorno per os');
  assert.equal(r.viaSomministrazione, 'OS');
  assert.doesNotMatch(r.note, /per\s+os/i);
  assert.equal(r.stato, 'ok');
});

test('AC4: note non ripete il nome del farmaco né i campi già mappati', () => {
  const r = parseTherapyLine(
    'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  );
  assert.equal(r.note, '', 'una riga completamente mappata non lascia residuo');
});

test('AC4: un nome farmaco con caratteri speciali non rompe la pulizia di note', () => {
  const r = parseTherapyLine('VIT.D3 BS 1GR/880UI (OS) 1 Dosi ore 08:00');
  assert.equal(r.farmacoNome, 'VIT.D3');
  assert.doesNotMatch(r.note, /VIT\.D3/i);
});

test('AC4: una posologia in lettere resta in note senza declassare una riga completa', () => {
  const r = parseTherapyLine('Pantoprazolo 20 mg 1 cp al mattino per os');
  assert.match(r.note, /al mattino/i);
  assert.equal(r.stato, 'ok', 'con dosaggio + quantità + via la riga resta valida');
});

test('AC4: un numero non collocato porta la riga a da_verificare', () => {
  // 67G/100ML e' una concentrazione che nessun campo strutturato ha raccolto: l'operatore
  // deve vederla, perche' un numero perso in una prescrizione e' clinicamente rilevante.
  const r = parseTherapyLine(
    'LATTULAC*SCIR 200ML 67G/100ML (OS) 1 Dosi ore 08:00 dal 03/07/2026 (Classe )',
  );
  assert.match(r.note, /67G\/100ML/i);
  assert.equal(r.stato, 'da_verificare');
});
