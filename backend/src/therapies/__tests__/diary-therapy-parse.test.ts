// Diario terapia (PR 1) — interprete deterministico del testo di diario.
// Regola dell'utente: mai inventare, mai un valore sbagliato ma plausibile. Elenco POSITIVO: un
// campo si precompila solo con una forma nota; altrimenti resta vuoto, il testo resta nelle note
// e la riga e' da verificare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diaryDroppedCharacters,
  diaryPrescriptionLeftover,
  foldText,
  parseDiaryTherapyText,
} from '../diary-therapy-parse.js';

const ENTRY = '2026-09-29T10:15';
const seen = new Set<string>();
const parse = (text: string, entry: string | null = ENTRY) => {
  seen.add(text);
  return parseDiaryTherapyText(text, entry);
};

// ── Esempio del contratto e casi base ────────────────────────────────────────────────────

test('AC1: esempio del contratto — nome, dose, quantità 1, via OS, 08:00 e 20:00, inizio dedotto, unità vuota', () => {
  const r = parse('Ramipril 5 mg 1 cp ore 8 e 20 per os dal 30/09');
  assert.equal(r.intent, 'prescrizione');
  assert.equal(r.row.farmacoNome, 'RAMIPRIL');
  assert.equal(r.row.dosaggio, '5 mg');
  assert.equal(r.row.quantitaValore, '1');
  assert.equal(r.row.quantityNumerator, 1);
  assert.equal(r.row.quantityDenominator, 1);
  assert.equal(r.row.unitaSomministrazione, '', '"cp" è ambiguo: non si indovina');
  assert.equal(r.row.viaSomministrazione, 'OS');
  assert.deepEqual(r.row.orari, ['08:00', '20:00']);
  assert.equal(r.row.dataInizio, '2026-09-30');
  assert.deepEqual(r.inferred, ['dataInizio']);
  assert.equal(r.row.note, '');
  assert.equal(r.row.stato, 'da_verificare');
  assert.equal(r.row.originalText, 'Ramipril 5 mg 1 cp ore 8 e 20 per os dal 30/09');
});

test('AC1: riga completa e univoca resta ok', () => {
  const r = parse('Paracetamolo 1000 mg 1 cpr per os alle 8, 14 e 20');
  assert.deepEqual(r.row.orari, ['08:00', '14:00', '20:00']);
  assert.equal(r.row.unitaSomministrazione, 'compressa');
  assert.equal(r.row.note, '');
  assert.equal(r.row.stato, 'ok');
});

test('AC1: "alle 7:30 e alle 20" mantiene i minuti', () => {
  assert.deepEqual(parse('Eutirox 50 mcg 1 cpr per os alle 7:30 e alle 20').row.orari, [
    '07:30',
    '20:00',
  ]);
});

test('AC1: nessun campo inventato — solo un nome, nessuna clausola di prescrizione: campi vuoti', () => {
  const r = parse('Ramipril');
  assert.equal(r.prescriptionRange, null);
  assert.equal(r.row.note, 'Ramipril', 'il testo resta nelle note');
  for (const field of [
    'farmacoNome',
    'dosaggio',
    'viaSomministrazione',
    'quantita',
    'quantitaValore',
    'unitaSomministrazione',
    'dataInizio',
    'dataFine',
  ] as const) {
    assert.equal(r.row[field], '', field);
  }
  assert.equal(r.row.quantityNumerator, null);
  assert.deepEqual(r.row.orari, []);
  assert.equal(r.row.stato, 'da_verificare');
});

test('AC1: ore fuori 0-23, numeri senza "ore"/"alle", dosi dopo "alle" non diventano orari', () => {
  const r25 = parse('Cardioaspirina 100 mg 1 cpr ore 25');
  assert.deepEqual(r25.row.orari, []);
  assert.match(r25.row.note, /ore 25/);
  assert.equal(r25.row.stato, 'da_verificare');
  assert.deepEqual(parse('Ramipril 5 mg 1 cpr per os 8 e 20').row.orari, []);
  assert.deepEqual(parse('Ramipril alle 5 mg per os').row.orari, []);
});

// ── A. Quantità: elenco positivo ─────────────────────────────────────────────────────────

for (const [text, valore, num, den] of [
  ['Ramipril 5 mg 1,5 cpr per os ore 8', '1,5', 3, 2],
  ['Ramipril 5 mg 1.5 cpr per os ore 8', '1,5', 3, 2],
  ['Ramipril 5 mg 0,25 cpr per os ore 8', '0,25', 1, 4],
  ['Ramipril 5 mg 1/2 cpr per os ore 8', '1/2', 1, 2],
  ['Ramipril 5 mg 1/4 cpr per os ore 8', '1/4', 1, 4],
  ['Ramipril 5 mg ½ cpr per os ore 8', '1/2', 1, 2],
  ['Ramipril 5 mg ¼ cpr per os ore 8', '1/4', 1, 4],
  ['Ramipril 5 mg mezza cpr per os ore 8', '1/2', 1, 2],
  ['Ramipril 5 mg 1 e 1/2 cpr per os ore 8', '3/2', 3, 2],
  ['Ramipril 5 mg 1+1/2 cpr per os ore 8', '3/2', 3, 2],
  ['Ramipril 5 mg 1-1/2 cpr per os ore 8', '3/2', 3, 2],
  ['Ramipril 5 mg 1 1/2 cpr per os ore 8', '3/2', 3, 2],
  ['Ramipril 5 mg 1 ½ cpr per os ore 8', '3/2', 3, 2],
  ['Ramipril 5 mg 1 e mezza cpr per os ore 8', '3/2', 3, 2],
  ['Coumadin 5 mg 2 1/2 cpr', '5/2', 5, 2],
] as const) {
  test(`A: quantità ammessa, frazione esatta — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.quantitaValore, valore);
    assert.equal(r.row.quantityNumerator, num);
    assert.equal(r.row.quantityDenominator, den);
    assert.equal(r.row.unitaSomministrazione, 'compressa');
  });
}

for (const text of [
  'Ramipril 5 mg 1-2 cpr per os ore 8',
  'Ramipril 5 mg 1 o 2 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr e 1/4 per os ore 8',
  'Ramipril 5 mg 0,33 cpr per os ore 8',
  'Ramipril 5 mg 3/4 cpr per os ore 8',
  'Ramipril 5 mg 1 e 1/2 per os ore 8',
]) {
  test(`A: quantità non ammessa → vuota, testo nelle note, da_verificare — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.quantitaValore, '');
    assert.equal(r.row.quantita, '');
    assert.equal(r.row.quantityNumerator, null);
    assert.equal(r.row.stato, 'da_verificare');
    assert.notEqual(r.row.note, '');
  });
}

test('A: quantità dopo un orario ("ore 8 e 1/2 cpr ore 20") → quantità vuota, orari ambigui', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 e 1/2 cpr ore 20');
  assert.equal(r.row.quantitaValore, '');
  assert.equal(r.row.quantityNumerator, null);
  assert.deepEqual(r.row.orari, []);
  assert.deepEqual(r.ambiguous, ['orari']);
  assert.equal(r.row.stato, 'da_verificare');
  assert.match(r.row.note, /ore 8 e 1\/2 cpr ore 20/);
});

test('A: "1,5 cp" / "1 e 1/2 cp" → frazione giusta ma unità ambigua → da_verificare', () => {
  for (const text of [
    'Ramipril 5 mg 1,5 cp per os ore 8',
    'Ramipril 5 mg 1 e 1/2 cp per os ore 8',
  ]) {
    const r = parse(text);
    assert.equal(r.row.quantityNumerator, 3);
    assert.equal(r.row.unitaSomministrazione, '');
    assert.equal(r.row.stato, 'da_verificare');
  }
});

// ── C. Dosaggio ──────────────────────────────────────────────────────────────────────────

test('C: dose composta "875/125 mg" resta intera, forma senza cifre, da_verificare', () => {
  const r = parse('Augmentin 875/125 mg 1 cpr per os ore 8 e 20');
  assert.equal(r.row.dosaggio, '875/125 mg');
  assert.doesNotMatch(r.row.forma, /[\d/]/);
  assert.equal(r.row.stato, 'da_verificare');
});

test('C: concentrazione "20 mg/ml" resta intera, da_verificare', () => {
  const r = parse('Lattulosio 20 mg/ml 10 ml per os ore 8');
  assert.equal(r.row.dosaggio, '20 mg/ml');
  assert.equal(r.row.quantitaValore, '10');
  assert.equal(r.row.stato, 'da_verificare');
});

test('C: "6-8-6 UI" → dosaggio vuoto, stringa intera nelle note', () => {
  const r = parse('Humalog 6-8-6 UI sc ore 8, 12 e 20');
  assert.equal(r.row.dosaggio, '');
  assert.match(r.row.note, /6-8-6 UI/);
  assert.equal(r.row.stato, 'da_verificare');
});

test('C: "2 , 5 mg" → dosaggio vuoto (mai 5), testo nelle note', () => {
  const r = parse('Bisoprololo 2 , 5 mg 1 cpr per os ore 8');
  assert.equal(r.row.dosaggio, '');
  assert.match(r.row.note, /2 , 5 mg/);
  assert.equal(r.row.stato, 'da_verificare');
});

for (const [text, kept] of [
  ['Eutirox 75 μg 1 cpr per os ore 7', '75 μg'],
  ['Lattulosio 1 misurino per os ore 8', '1 misurino'],
  ['Novalgina gtt 10 per os ore 8', 'gtt 10'],
  ['Ossigeno 2 l/min', '2 l/min'],
] as const) {
  test(`C: testo con cifre fuori dai campi resta nelle note — "${text}"`, () => {
    const r = parse(text);
    assert.doesNotMatch(r.row.forma, /\d/);
    assert.ok(r.row.note.includes(kept), r.row.note);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('C: forma nota resta forma ma rende la riga da verificare', () => {
  const r = parse('Ramipril compresse rivestite 5 mg 1 cpr per os ore 8');
  assert.equal(r.row.forma, 'compresse rivestite');
  assert.equal(r.row.stato, 'da_verificare');
});

test('R1 tutto o niente: una parola non classificata svuota tutti i campi', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 dopo colazione');
  assert.equal(r.row.farmacoNome, '');
  assert.equal(r.row.dosaggio, '');
  assert.deepEqual(r.row.orari, []);
  assert.equal(r.row.note, 'Ramipril 5 mg 1 cpr per os ore 8 dopo colazione');
  assert.equal(r.row.stato, 'da_verificare');
});

// ── D. Intenti: blocco solo in testa o riferito al farmaco ───────────────────────────────

for (const [text, intent] of [
  ['Sospendere Ramipril', 'sospensione'],
  ['Sosp. Ramipril', 'sospensione'],
  ['SOSP Ramipril', 'sospensione'],
  ['Sospendo Ramipril', 'sospensione'],
  ['Stop Ramipril', 'sospensione'],
  ['Togliere Ramipril', 'sospensione'],
  ['Eliminare Cardioaspirina', 'sospensione'],
  ['Non più Ramipril', 'sospensione'],
  ['Interrompere Ramipril 5 mg', 'sospensione'],
  ['Non somministrare Ramipril 5 mg ore 8', 'sospensione'],
  ['Sòspendere Ramipril', 'sospensione'],
  ['SOSPÈNDERE Ramipril', 'sospensione'],
  ['- Sospendere Ramipril', 'sospensione'],
  ['1) Sospendere Ramipril', 'sospensione'],
  ['Rp: sospendere Ramipril', 'sospensione'],
  ['Ramipril sospeso', 'sospensione'],
  ['Ramipril 5 mg sospeso', 'sospensione'],
  ['Ramipril interrotto', 'sospensione'],
  ['Somministrata Tachipirina 1000 mg', 'somministrazione'],
  ['Eseguito Clexane 4000 UI sc', 'somministrazione'],
  ['Fatto Lasix 20 mg ev', 'somministrazione'],
  ['Praticata Morfina 5 mg sc', 'somministrazione'],
  ['Tachipirina 1000 mg somministrata', 'somministrazione'],
  ['Ramipril 5 mg somministrato alle 8', 'somministrazione'],
  ['Tachipirina 1000 mg assunta ore 8', 'somministrazione'],
  ['Paracetamolo data alle 8', 'somministrazione'],
  ['Tachipirina dato alle 20', 'somministrazione'],
  ['Ramipril 5 mg omesso', 'somministrazione'],
  ['Ramipril … omesso', 'somministrazione'],
  ['Aumentare Ramipril a 10 mg ore 8', 'modifica'],
  ['Ridurre Lasix 25 mg 1 cpr ore 8', 'modifica'],
  ['Scalare Prednisone', 'modifica'],
  ['Sostituire Ramipril con Enalapril', 'modifica'],
  ['Ripreso Ramipril 5 mg 1 cpr per os ore 8', 'modifica'],
  ['Riprendere Cardioaspirina', 'modifica'],
  ['Portare Ramipril a 10 mg', 'modifica'],
  ['Modificare orario Ramipril', 'modifica'],
  ['Modificato orario Ramipril', 'modifica'],
  ['Ramipril aumentato a 10 mg', 'modifica'],
  ['Lasix ridotto a 25 mg', 'modifica'],
  ['Ramipril da 5 mg a 10 mg', 'modifica'],
  // R5: sospensione riferita al farmaco nella clausola subito dopo la prescrizione.
  ['Ramipril 5 mg 1 cpr per os ore 8, sospeso da oggi', 'sospensione'],
] as const) {
  test(`D: blocco (${intent}) — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, intent);
    assert.equal(r.row.stato, 'da_verificare');
    assert.doesNotMatch(
      foldText(r.row.farmacoNome),
      /^(sosp|stop|togli|elimin|non|interr|somministr|esegu|fatt|pratic|aument|ridu|scal|sostitu|ripre|porta|modific|orario)/,
    );
  });
}

for (const [text, warning, nome] of [
  ['PA ridotta, si inizia Ramipril 5 mg 1 cpr per os ore 8', 'menzione_modifica', 'RAMIPRIL'],
  ['Diuresi ridotta: Lasix 25 mg 1 cpr per os ore 8', 'menzione_modifica', 'LASIX'],
  [
    'Dolore aumentato: Paracetamolo 1000 mg 1 cpr per os ore 8',
    'menzione_modifica',
    'PARACETAMOLO',
  ],
  [
    'Paziente portato in reparto, si prescrive Ramipril 5 mg 1 cpr per os ore 8',
    'menzione_modifica',
    'RAMIPRIL',
  ],
  ['Ha preso poco cibo. Ramipril 5 mg 1 cpr per os ore 8', 'menzione_somministrazione', 'RAMIPRIL'],
  // Parole non classificate nella prescrizione: nessun campo (R1), ma mai un blocco.
  [
    'Ramipril 5 mg 1 cpr per os ore 8 dopo aver assunto la colazione',
    'menzione_somministrazione',
    '',
  ],
  ['Ramipril 5 mg 1 cpr per os ore 8 (portato da casa)', 'menzione_modifica', 'RAMIPRIL'],
  [
    'Febbre, stop antipiretici esterni: Paracetamolo 1000 mg 1 cpr per os ore 8',
    'menzione_sospensione',
    'PARACETAMOLO',
  ],
  [
    'Amoxicillina 1 g 1 cpr per os ore 8 e 20 per 7 giorni poi sospendere',
    'menzione_sospensione',
    '',
  ],
  [
    'Ramipril 5 mg 1 cpr per os ore 8, non somministrare se PAS < 100',
    'menzione_sospensione',
    'RAMIPRIL',
  ],
  ['Il paziente ha assunto Ramipril 5 mg', 'menzione_somministrazione', ''],
] as const) {
  test(`D: menzione → prescrizione con avviso, mai blocco — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.ok(r.warnings.includes(warning), JSON.stringify(r.warnings));
    assert.equal(r.row.farmacoNome, nome);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

for (const text of [
  'Amoxicillina sospensione orale 5 ml per os ore 8 e 20',
  'Amoxicillina sosp. orale 5 ml per os ore 8',
  'Claritromicina sospensione os 7,5 ml ore 8',
]) {
  test(`D: "sospensione orale" è una forma, non un intento — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.ok(!r.warnings.some((w) => w.startsWith('menzione_')), JSON.stringify(r.warnings));
  });
}

for (const text of [
  'Paracetamolo 1000 mg 1 cpr per os al bisogno max 3 volte',
  'Paracetamolo 1000 mg 1 cpr per os ore 8 se necessario',
  'Tramadolo 50 mg prn',
  'Paracetamolo 1000 mg al bisogno max 3 cpr/die',
]) {
  test(`al bisogno → intent al_bisogno, orari vuoti, da_verificare — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'al_bisogno');
    assert.deepEqual(r.row.orari, []);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('al bisogno — gli orari scritti restano nelle note, come scritti', () => {
  const r = parse('Paracetamolo 1000 mg 1 cpr per os ore 8 e al bisogno');
  assert.equal(r.intent, 'al_bisogno');
  assert.deepEqual(r.row.orari, []);
  assert.match(r.row.note, /ore 8/);
});

// ── E. Nomi e testa della frase ──────────────────────────────────────────────────────────

for (const [text, nome] of [
  ['Si prescrive Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Prescrivo Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Iniziare Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Inizia Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Avviare Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Aggiungere Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Dare Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Somministrare Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Il Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Ore 8 Ramipril 5 mg 1 cpr per os', 'RAMIPRIL'],
  ['Alle 8 dare il Ramipril 5 mg 1 cpr per os', 'RAMIPRIL'],
  ['Rp: Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Rp Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Nuova terapia: Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Terapia: Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Le gocce di Novalgina 20 gtt per os ore 8', 'NOVALGINA'],
  ['La Cardioaspirina 100 mg 1 cpr per os ore 8', 'CARDIOASPIRINA'],
  ['Lo Zyloric 300 mg 1 cpr per os ore 8', 'ZYLORIC'],
  ['Aggiunto Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Aggiunta Cardioaspirina 100 mg 1 cpr per os ore 8', 'CARDIOASPIRINA'],
  ['Introdotto Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['Introdotta Cardioaspirina 100 mg 1 cpr per os ore 8', 'CARDIOASPIRINA'],
  ['- Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['• Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['1) Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
  ['1. Ramipril 5 mg 1 cpr per os ore 8', 'RAMIPRIL'],
] as const) {
  test(`E: prefisso/etichetta/verbo tolto → ${nome} alle 08:00 — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.equal(r.row.farmacoNome, nome);
    assert.deepEqual(r.row.orari, ['08:00']);
  });
}

test('E: elenco puntato con riga completa resta ok', () => {
  assert.equal(parse('- Ramipril 5 mg 1 cpr per os ore 8').row.stato, 'ok');
  assert.equal(parse('1) Ramipril 5 mg 1 cpr per os ore 8').row.stato, 'ok');
});

for (const text of [
  'Si prescrive',
  'Prescrivo terapia',
  'Ore 8',
  'Alle 20 per os',
  'Cpr Ramipril 5 mg ore 8',
  'Una cpr di Ramipril 5 mg ore 8',
  'Una',
  'Sostituire',
]) {
  test(`E: il nome cade su una parola vietata → nome vuoto — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.farmacoNome, '');
    assert.equal(r.row.stato, 'da_verificare');
  });
}

// ── Orari e conflitti ────────────────────────────────────────────────────────────────────

test('due orari distinti nella stessa fascia restano due dosi', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 e 10');
  assert.deepEqual(r.fasciaConflicts, []);
  assert.deepEqual(r.row.orari, ['08:00', '10:00']);
});

test('lo stesso orario ripetuto è un conflitto', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 e 8');
  assert.deepEqual(r.fasciaConflicts, ['mattina: 08:00, 08:00']);
});

for (const text of [
  'Ramipril 5 mg 1 cpr per os alle 8 e 15',
  'Ramipril 5 mg 1 cpr per os alle 8:00 e 15',
]) {
  test(`orari ambigui (8:15?) — "${text}"`, () => {
    const r = parse(text);
    assert.deepEqual(r.ambiguous, ['orari']);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('"ore 8 e 20" non è ambiguo', () => {
  assert.deepEqual(parse('Ramipril 5 mg 1 cpr per os ore 8 e 20').ambiguous, []);
});

// ── Date ─────────────────────────────────────────────────────────────────────────────────

test('"dal dd/mm al dd/mm" — date dedotte, segnalate, da_verificare', () => {
  const r = parse('Amoxicillina 1 g 1 cpr per os ore 8 e 20 dal 30/09 al 10/10');
  assert.equal(r.row.dataInizio, '2026-09-30');
  assert.equal(r.row.dataFine, '2026-10-10');
  assert.deepEqual(r.inferred, ['dataInizio', 'dataFine']);
  assert.equal(r.row.note, '');
  assert.equal(r.row.stato, 'da_verificare');
});

test('date con anno esplicito non sono dedotte e la riga resta ok', () => {
  const r = parse('Amoxicillina 1 g 1 cpr per os ore 8 dal 30/09/2026 al 10/10/2026');
  assert.equal(r.row.dataInizio, '2026-09-30');
  assert.equal(r.row.dataFine, '2026-10-10');
  assert.deepEqual(r.inferred, []);
  assert.equal(r.row.stato, 'ok');
});

test("fine prima dell'inizio → nessuna data (la fine avanza: tutto o niente), testo nelle note", () => {
  const r = parse('Lasix 25 mg 1 cpr ore 8 per os dal 20/12 al 10/01');
  assert.equal(r.row.dataInizio, '');
  assert.equal(r.row.dataFine, '');
  assert.match(r.row.note, /al 10\/01/);
  assert.equal(r.row.stato, 'da_verificare');
});

test('"dal 02/01" in una voce del 30/12 → anno dopo, dedotto, da_verificare', () => {
  const r = parse('Lasix 25 mg 1 cpr per os ore 8 dal 02/01', '2026-12-30T09:00');
  assert.equal(r.row.dataInizio, '2027-01-02');
  assert.deepEqual(r.inferred, ['dataInizio']);
  assert.equal(r.row.stato, 'da_verificare');
});

test('data impossibile o voce senza data → nessuna deduzione', () => {
  const impossible = parse('Ramipril 5 mg 1 cpr ore 8 per os dal 31/02');
  assert.equal(impossible.row.dataInizio, '');
  assert.deepEqual(impossible.inferred, []);
  assert.equal(impossible.row.stato, 'da_verificare');
  const noEntry = parse('Ramipril 5 mg 1 cpr ore 8 per os dal 30/09', null);
  assert.equal(noEntry.row.dataInizio, '');
  assert.deepEqual(noEntry.inferred, []);
});

// ── QA4. Clausole: i campi si leggono solo dalla clausola di prescrizione ────────────────

test('QA4-3: "Ricoverato dal 25/09, Ramipril ..." → RAMIPRIL, dataInizio vuota, note', () => {
  const r = parse('Ricoverato dal 25/09, Ramipril 5 mg 1 cpr per os ore 8');
  assert.equal(r.row.farmacoNome, 'RAMIPRIL');
  assert.equal(r.row.dataInizio, '');
  assert.deepEqual(r.inferred, []);
  assert.equal(r.row.note, 'Ricoverato dal 25/09');
  assert.deepEqual(r.row.orari, ['08:00']);
});

test('QA4-3: "…ore 8, visita cardiologica al 15/10" → dataFine vuota', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8, visita cardiologica al 15/10');
  assert.equal(r.row.dataFine, '');
  assert.match(r.row.note, /visita cardiologica al 15\/10/);
});

test('QA4-3: "…ore 8 dal 30/09, controllo al 15/10" → inizio dedotto, fine vuota', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 dal 30/09, controllo al 15/10');
  assert.equal(r.row.dataInizio, '2026-09-30');
  assert.deepEqual(r.inferred, ['dataInizio']);
  assert.equal(r.row.dataFine, '');
  assert.match(r.row.note, /controllo al 15\/10/);
});

for (const text of [
  'Lasix 1 cpr per os ore 8, creatinina 1,2 mg',
  'Ramipril 1 cpr per os ore 8 (glicemia 120 mg)',
]) {
  test(`QA4-3: due clausole con nome e dose → piu_farmaci, dosaggio vuoto — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.dosaggio, '');
    assert.deepEqual(r.ambiguous, ['piu_farmaci']);
    assert.equal(r.prescriptionRange, null);
    assert.equal(r.row.farmacoNome, '');
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('QA4-3: "Mar e Gio controllo, Ramipril …" → giorni vuoti', () => {
  const r = parse('Mar e Gio controllo, Ramipril 5 mg 1 cpr per os ore 8');
  assert.deepEqual(r.row.giorni, []);
  assert.equal(r.row.farmacoNome, 'RAMIPRIL');
  assert.match(r.row.note, /Mar e Gio controllo/);
});

test('QA4-2: le continuazioni di sola posologia fanno parte della prescrizione', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os, ore 8');
  assert.deepEqual(r.row.orari, ['08:00']);
  assert.equal(r.row.stato, 'ok');
  const prn = parse('Paracetamolo 1000 mg 1 cpr per os, al bisogno');
  assert.equal(prn.intent, 'al_bisogno');
});

for (const [text, warning, nome] of [
  [
    'Fatto ECG, si inizia Ramipril 5 mg 1 cpr per os ore 8',
    'menzione_somministrazione',
    'RAMIPRIL',
  ],
  ['Eseguito prelievo. Ramipril 5 mg 1 cpr per os ore 8', 'menzione_somministrazione', 'RAMIPRIL'],
  ['Tolto CVC, Ceftriaxone 2 g ev ore 8', 'menzione_sospensione', 'CEFTRIAXONE'],
  ['Eliminato catetere, Ramipril 5 mg 1 cpr per os ore 8', 'menzione_sospensione', 'RAMIPRIL'],
  [
    'Sospesa alimentazione, Pantoprazolo 40 mg 1 cpr per os ore 8',
    'menzione_sospensione',
    'PANTOPRAZOLO',
  ],
  ['Ridotta mobilità: Enoxaparina 4000 UI sc ore 20', 'menzione_modifica', 'ENOXAPARINA'],
  ['Ramipril 5 mg 1 cpr per os ore 8, dimezzare dopo 3 giorni', 'menzione_modifica', 'RAMIPRIL'],
] as const) {
  test(`QA4-4: verbo in un'altra clausola → crea con avviso, verbo nelle note — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.ok(r.warnings.includes(warning), JSON.stringify(r.warnings));
    assert.equal(r.row.farmacoNome, nome);
    const verb = foldText(
      /\b(Fatto|Eseguito|Tolto|Eliminato|Sospesa|Ridotta|dimezzare)\b/.exec(text)?.[1] ?? '?',
    );
    assert.ok(foldText(r.row.note).includes(verb), `"${verb}" deve restare nelle note`);
  });
}

test('QA4-4: "Scala di Braden 12, Enoxaparina …" non è un intento (radice di scalare ristretta)', () => {
  const r = parse('Scala di Braden 12, Enoxaparina 4000 UI sc ore 20');
  assert.equal(r.intent, 'prescrizione');
  // Nessuna menzione d'intento; l'inciso resta nelle note, quindi avviso di lettura (QA8).
  assert.deepEqual(r.warnings, ['testo_non_classificato']);
  assert.equal(r.row.farmacoNome, 'ENOXAPARINA');
  assert.match(r.row.note, /Scala di Braden 12/);
});

for (const [text, intent] of [
  ['PA ridotta, sospendere Ramipril 5 mg', 'sospensione'],
  ['Pz agitato: sospendere Aloperidolo 2 mg ore 20', 'sospensione'],
  ['Ore 10 somministrata Tachipirina 1000 mg 1 cpr per os', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 sospeso', 'sospensione'],
  ['Ramipril da 5 a 10 mg 1 cpr per os ore 8', 'modifica'],
  ['Ramipril 5 mg 1 cpr per os ore 8 -> 10 mg', 'modifica'],
  ['Ramipril 5 mg 1 cpr per os ore 8 → 10 mg', 'modifica'],
  ['Ramipril da 5 mg a 10 mg 1 cpr per os ore 8', 'modifica'],
  ['Incrementare Ramipril 10 mg ore 8', 'modifica'],
  ['Dimezzare Lasix 25 mg ore 8', 'modifica'],
  ['Raddoppiare Ramipril 5 mg ore 8', 'modifica'],
  ['Cambio Ramipril con Enalapril 5 mg ore 8', 'modifica'],
  ['Cambiare Ramipril 5 mg ore 8', 'modifica'],
  ['Ramipril 5 mg 1 cpr per os ore 8 raddoppiare', 'modifica'],
] as const) {
  test(`QA4-4/5: blocco nella clausola di prescrizione (${intent}) — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, intent);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('QA4-5: cambio di dose → nessuna dose precompilata', () => {
  for (const text of [
    'Ramipril da 5 a 10 mg 1 cpr per os ore 8',
    'Ramipril 5 mg 1 cpr per os ore 8 -> 10 mg',
  ]) {
    assert.equal(parse(text).row.dosaggio, '', text);
  }
});

test("QA4-6: un verbo d'intento non sparisce mai: resta nelle note", () => {
  assert.match(parse('Il paziente ha assunto Ramipril 5 mg').row.note, /ha assunto/);
  assert.match(parse('PA ridotta, sospendere Ramipril 5 mg').row.note, /sospendere/);
  assert.match(parse('Sosp. Ramipril').row.note, /Sosp\./);
  assert.match(
    parse('Ramipril 5 mg 1 cpr per os ore 8, sospeso da oggi').row.note,
    /sospeso da oggi/,
  );
});

// ── QA5. Tutto o niente, separatori, participi in coda ───────────────────────────────────

for (const text of [
  'Febbre Tachipirina 1000 mg 1 cpr per os ore 8',
  'Mattino Ramipril 5 mg 1 cpr per os ore 8',
  'Dr Rossi Ramipril 5 mg 1 cpr per os ore 8',
  'Sig. Rossi Ramipril 5 mg 1 cpr per os ore 8',
  'PA 150/90 FC 88 Ramipril 5 mg 1 cpr per os ore 8',
  'SpO2 94% Ramipril 5 mg 1 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr per os ore 8 tranne Dom',
  'Ramipril 5 mg 1 cpr per os ore 8 eccetto Dom',
  'Ramipril 5 mg 1 cpr per os ore 8 salvo Dom',
  'Ramipril 5 mg 1 cpr per os ore 8 non Dom',
  'Ramipril 5 mg 1 cpr per os ore 8 escluso Dom',
  'Ramipril 5 mg 1 cpr per os ore 8 da Lun a Ven',
  'Ramipril 5 mg 1 cpr per os ore 8 Lun e Mer ore 20 Ven',
]) {
  test(`QA5-R1: parola non classificata → tutti i campi vuoti — "${JSON.stringify(text)}"`, () => {
    const r = parse(text);
    for (const field of [
      'farmacoNome',
      'dosaggio',
      'quantita',
      'viaSomministrazione',
      'dataInizio',
      'dataFine',
    ] as const) {
      assert.equal(r.row[field], '', field);
    }
    assert.deepEqual(r.row.orari, []);
    assert.deepEqual(r.row.giorni, []);
    assert.equal(r.row.note, text);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('QA5-R1: un solo gruppo positivo di giorni è ammesso', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 Lun, Mer e Ven');
  assert.deepEqual(r.row.giorni, ['Lun', 'Mer', 'Ven']);
  assert.equal(r.row.note, '');
  assert.equal(r.row.stato, 'ok');
});

test('QA5-R1: "per N giorni" è ammesso ma resta nelle note (nessun campo lo porta)', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8 per 7 giorni');
  assert.equal(r.row.farmacoNome, 'RAMIPRIL');
  assert.equal(r.row.note, 'per 7 giorni');
});

test('QA5-R1: sigle di via isolate (sc, ev) sono classificate', () => {
  assert.equal(parse('Enoxaparina 4000 UI sc ore 20').row.viaSomministrazione, 'SC');
  assert.equal(parse('Ceftriaxone 2 g ev ore 8').row.viaSomministrazione, 'EV');
});

test('QA5-R2: "Ramipril⏎Lasix 25 mg …" → mai la dose di Lasix su Ramipril', () => {
  const r = parse('Ramipril\nLasix 25 mg 1 cpr per os ore 8');
  assert.notEqual(r.row.farmacoNome, 'RAMIPRIL');
  if (r.row.dosaggio) assert.equal(r.row.farmacoNome, 'LASIX');
  assert.match(r.row.note, /Ramipril/);
});

for (const text of [
  'Ramipril 5 mg\nLasix 25 mg 1 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr per os ore 8 | Lasix 25 mg 1 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr per os ore 8 - Lasix 25 mg 1 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr per os ore 8 2) Lasix 25 mg 1 cpr per os ore 8',
]) {
  test(`QA5-R2: a capo, " | ", elenco in mezzo → piu_farmaci — "${JSON.stringify(text)}"`, () => {
    const r = parse(text);
    assert.deepEqual(r.ambiguous, ['piu_farmaci']);
    assert.equal(r.row.farmacoNome, '');
    assert.equal(r.row.dosaggio, '');
  });
}

test('QA5-R2/R3: "…ore 8. Lasix sospeso" → Ramipril non bloccato, Lasix menzione', () => {
  const r = parse('Ramipril 5 mg 1 cpr per os ore 8. Lasix sospeso');
  assert.equal(r.intent, 'prescrizione');
  assert.deepEqual(r.warnings, ['menzione_sospensione']);
  assert.equal(r.row.farmacoNome, 'RAMIPRIL');
  assert.deepEqual(r.row.orari, ['08:00']);
  assert.equal(r.row.note, 'Lasix sospeso');
});

for (const text of [
  'Ramipril 5 mg 1 cpr per os ore 8 per PA aumentata',
  'Paracetamolo 1000 mg 1 cpr per os ore 8 se dolore aumentato',
  'Lasix 25 mg 1 cpr per os ore 8 per diuresi ridotta',
  'Lasix 25 mg 1 cpr per os ore 8 per edemi aumentati',
]) {
  test(`QA5-R3: participio con altro soggetto ("per/se" + nome) → solo menzione — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.ok(r.warnings.includes('menzione_modifica'), JSON.stringify(r.warnings));
    assert.equal(r.row.stato, 'da_verificare');
  });
}

for (const [text, intent] of [
  ['Tachipirina 1000 mg 1 cpr per os ore 8 dato', 'somministrazione'],
  ['Tachipirina 1000 mg 1 cpr per os ore 8 già data', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 rifiutato', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 vomitata', 'somministrazione'],
  ['Ceftriaxone 2 g ev ore 8 prima dose già data', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8, sospeso da oggi', 'sospensione'],
  ['Ramipril 5 mg: sospendere', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 -> sospendere', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 da sospendere', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 STOP', 'sospensione'],
] as const) {
  test(`QA5-R4/R5: in coda alla prescrizione → blocco (${intent}) — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, intent);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

for (const text of [
  'Sospesa alimentazione, Pantoprazolo 40 mg 1 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr per os ore 8, sospesa alimentazione',
]) {
  test(`QA5-R5: la sospensione ha un altro oggetto → menzione — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.deepEqual(r.warnings, ['menzione_sospensione']);
    assert.notEqual(r.row.farmacoNome, '');
  });
}

// ── QA6. Intenti mancanti, simboli, migliaia ─────────────────────────────────────────────

for (const [text, intent] of [
  ['Ramipril 5 mg 1 cpr per os ore 8 annullato', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 revocato', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 cancellata', 'sospensione'],
  ['Annullare Ramipril 5 mg ore 8', 'sospensione'],
  ['Revocare Ramipril', 'sospensione'],
  ['Cancellare Ramipril 5 mg', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 rifiuta', 'somministrazione'],
  ['Rifiuta Ramipril 5 mg', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 somm.', 'somministrazione'],
  ['Somm. Tachipirina 1000 mg ore 8', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 (sospeso)', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 — sospeso', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 [SOSPESO]', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 SOSP.', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 sosp', 'sospensione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 (somministrato)', 'somministrazione'],
  ['Ramipril 5 mg 1 cpr per os ore 8 - fatto', 'somministrazione'],
] as const) {
  test(`QA6-1: blocco (${intent}) — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, intent);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

for (const text of [
  'Ramipril 5 mg 1 cpr per os ore 8 sospeso?',
  'Ramipril 5 mg 1 cpr per os ore 8 (sospeso?)',
  'Ramipril 5 mg 1 cpr per os ore 8 non più',
  'Ramipril 5 mg 1 cpr per os ore 8 non dare',
  'Ramipril 5 mg 1 cpr per os ore 8 da non somministrare',
]) {
  test(`QA6-1: resta solo menzione — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'prescrizione');
    assert.ok(r.warnings.includes('menzione_sospensione'), JSON.stringify(r.warnings));
    assert.equal(r.row.stato, 'da_verificare');
  });
}

for (const symbol of ['✓', '✔', '✗', '→', '⇒', '*', '#2', '@reparto', '💊']) {
  const text = `Ramipril 5 mg 1 cpr per os ore 8 ${symbol}`;
  test(`QA6-2: un simbolo avanza → campi vuoti, simbolo nelle note — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.farmacoNome, '');
    assert.equal(r.row.dosaggio, '');
    assert.deepEqual(r.row.orari, []);
    assert.ok(r.row.note.includes(symbol), r.row.note);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

for (const text of ['Eparina 5,000 UI sc ore 8', 'Eparina 5.000 UI sc ore 8']) {
  test(`QA6-3: tre cifre dopo il separatore → dosaggio vuoto, testo nelle note — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.dosaggio, '');
    assert.ok(r.row.note.includes(text.slice(8, 17)), r.row.note);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

test('QA6-3: "5000 UI" senza separatore resta un dosaggio', () => {
  assert.equal(parse('Eparina 5000 UI sc ore 8').row.dosaggio, '5000 UI');
});

// ── QA7. Testo avanzato ⇒ mai "prescrizione" senza avvisi ────────────────────────────────

const BASE = 'Ramipril 5 mg 1 cpr per os ore 8';
const NON_PRESCRIPTION = new Set(['sospensione', 'somministrazione', 'modifica']);
for (const tail of [
  'terminato',
  'rimosso',
  'inserito per errore',
  'dato al paziente',
  'effettuato',
  'non accetta',
  '❌',
  '✓',
  '👍',
]) {
  const text = `${BASE} ${tail}`;
  test(`QA7: testo avanzato → testo_non_classificato o blocco, mai zero avvisi — "${text}"`, () => {
    const r = parse(text);
    const blocked =
      r.intent === 'sospensione' || r.intent === 'somministrazione' || r.intent === 'modifica';
    assert.ok(
      blocked || r.warnings.includes('testo_non_classificato'),
      `${r.intent} ${JSON.stringify(r.warnings)}`,
    );
    assert.equal(r.row.stato, 'da_verificare');
    assert.ok(r.row.note.includes(tail), r.row.note);
  });
}

for (const text of [
  BASE,
  'Paracetamolo 1000 mg 1 cpr per os alle 8, 14 e 20',
  `${BASE} Lun, Mer e Ven`,
  `- ${BASE}`,
]) {
  test(`QA7: le righe complete restano ok e senza avvisi — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.stato, 'ok');
    assert.deepEqual(r.warnings, []);
  });
}

for (const tail of ['«sospeso»', '"sospeso"', "'sospeso'"]) {
  test(`QA7: participio fra virgolette in coda come "(sospeso)" — ${tail}`, () => {
    assert.equal(parse(`${BASE} ${tail}`).intent, 'sospensione');
  });
}

// ── QA8. Note non vuote o nessuna prescrizione ⇒ avviso ─────────────────────────────────

for (const text of [
  `${BASE}, allergia`,
  `${BASE}, paziente allergico`,
  `${BASE}, controindicato`,
  `${BASE}, terminato`,
  `${BASE}. Terminato`,
  `${BASE}, inserito per errore`,
  `${BASE}, fine terapia`,
  `${BASE}, dato al paziente`,
  `${BASE}; effettuato`,
  `${BASE}, ❌`,
  `${BASE}, ✓`,
  `${BASE} | ✓`,
  `${BASE}, da confermare`,
  `${BASE}, in attesa di conferma medica`,
  'Ramipril terminato',
  'Terminato Ramipril',
  'Ramipril ✓',
  'Paziente allergico al Ramipril',
  'Fine terapia Ramipril',
  'Ramipril da confermare',
  `~~${BASE}~~`,
]) {
  test(`QA8: avviso o blocco, mai "prescrizione" silenziosa — "${text}"`, () => {
    const r = parse(text);
    const blocked = NON_PRESCRIPTION.has(r.intent);
    assert.ok(blocked || r.warnings.length > 0, `${r.intent} ${JSON.stringify(r.warnings)}`);
    assert.equal(r.row.stato, 'da_verificare');
  });
}

// Scelta documentata: "per N giorni" e "al bisogno" sono classificati (non svuotano i campi) ma
// nessun campo li porta, quindi restano nelle note. Si ACCETTA l'avviso anche per loro: chi
// conferma deve leggere la durata / la condizione, che la terapia creata non contiene.
test('QA8: "per 7 giorni" resta nelle note con avviso di lettura, campi precompilati', () => {
  const r = parse(`${BASE} per 7 giorni`);
  assert.equal(r.row.farmacoNome, 'RAMIPRIL');
  assert.equal(r.row.note, 'per 7 giorni');
  assert.deepEqual(r.warnings, ['testo_non_classificato']);
});

// ── QA9. Al bisogno, "si somministra", segni sui giorni, dosi alternative ───────────────

const TACHI = 'Tachipirina 1000 mg 1 cpr per os';
for (const text of [
  `${TACHI} al bisogno, allergia`,
  `${TACHI} al bisogno, paziente allergico`,
  `${TACHI} se necessario, controindicata`,
  `${TACHI} al bisogno, terminato`,
  `${TACHI} al bisogno, inserito per errore`,
  `${TACHI} al bisogno, da confermare`,
  `${TACHI} al bisogno, dato ore 10`,
  'Tachipirina al bisogno terminato',
  'Tachipirina al bisogno ✓',
  'Al bisogno Tachipirina 1000 mg ✓',
  'Si somministra Tachipirina 1000 mg 1 cpr per os ore 10',
  `${BASE} -Dom`,
  `${BASE} (- Dom)`,
  `${BASE} +Dom`,
  'Ramipril 5 mg -1 cpr per os ore 8',
  'Ramipril 5 mg / 10 mg 1 cpr per os ore 8',
  'Ramipril 5 mg/10 mg 1 cpr per os ore 8',
]) {
  test(`QA9: avviso o blocco, mai silenziosa — "${text}"`, () => {
    const r = parse(text);
    assert.ok(
      NON_PRESCRIPTION.has(r.intent) || r.warnings.length > 0,
      `${r.intent} ${JSON.stringify(r.warnings)}`,
    );
    assert.equal(r.row.stato, 'da_verificare');
    assert.notDeepEqual(r.row.giorni, ['Dom']);
  });
}

for (const text of [`${TACHI} al bisogno`, `${TACHI} se necessario`, `${TACHI} prn`]) {
  test(`QA9: al bisogno pulito resta senza avvisi — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.intent, 'al_bisogno');
    assert.deepEqual(r.warnings, []);
    assert.equal(r.row.farmacoNome, 'TACHIPIRINA');
  });
}

test('QA9: dosi alternative → dosaggio vuoto, testo nelle note; composte invariate', () => {
  const alt = parse('Ramipril 5 mg / 10 mg 1 cpr per os ore 8');
  assert.equal(alt.row.dosaggio, '');
  assert.match(alt.row.note, /5 mg \/ 10 mg/);
  assert.equal(parse('Augmentin 875/125 mg 1 cpr per os ore 8 e 20').row.dosaggio, '875/125 mg');
  assert.equal(parse('Lattulosio 20 mg/ml 10 ml per os ore 8').row.dosaggio, '20 mg/ml');
});

test('QA9: un giorno senza segno resta un giorno', () => {
  const r = parse(`${BASE} Dom`);
  assert.deepEqual(r.row.giorni, ['Dom']);
  assert.equal(r.row.stato, 'ok');
});

// ── QA10. "Somministro/a", segni sui giorni, grandezze nelle dosi alternative ───────────

for (const text of [
  'Somministro Ramipril 5 mg 1 cpr per os ore 8',
  'Somministra Ramipril 5 mg 1 cpr per os ore 8',
  `${BASE} /Dom`,
  `${BASE} Dom-`,
  `${BASE} Dom+`,
  'Amoxicillina 500 mg/1 g 1 cpr per os ore 8',
  'Amoxicillina 1 g/500 mg 1 cpr per os ore 8',
  'Eutirox 50 mcg/0,1 mg 1 cpr per os ore 8',
]) {
  test(`QA10: avviso, mai ok silenzioso — "${text}"`, () => {
    const r = parse(text);
    assert.ok(r.warnings.includes('testo_non_classificato'), JSON.stringify(r.warnings));
    assert.equal(r.row.stato, 'da_verificare');
    assert.equal(r.row.dosaggio, '');
    assert.deepEqual(r.row.giorni, []);
  });
}

for (const text of [
  'Somministrare Ramipril 5 mg 1 cpr per os ore 8',
  'Dare Ramipril 5 mg 1 cpr per os ore 8',
  `${BASE} (Dom)`,
]) {
  test(`QA10: resta una prescrizione completa — "${text}"`, () => {
    const r = parse(text);
    assert.equal(r.row.farmacoNome, 'RAMIPRIL');
    assert.equal(r.row.stato, 'ok');
    assert.deepEqual(r.warnings, []);
  });
}

for (const [text, dose] of [
  ['Sciroppo 5 mg/5 ml 10 ml per os ore 8', '5 mg/5 ml'],
  ['Morfina 2 mg/ml 10 ml per os ore 8', '2 mg/ml'],
  ['Vancomicina 5 mg/kg ev ore 8', '5 mg/kg'],
  ['Fentanil 35 mcg/h 1 cerotto ore 8', '35 mcg/h'],
  ['Ramipril 5/10 mg 1 cpr per os ore 8', '5/10 mg'],
] as const) {
  test(`QA10: concentrazioni e composte restano invariate — "${text}"`, () => {
    assert.equal(parse(text).row.dosaggio, dose);
  });
}

// ── B. Regola generale: solo testo dell'originale ────────────────────────────────────────
// Deve restare l'ULTIMO test del file: controlla ogni frase usata sopra.

test("B: nome, forma, note, quantità e dosaggio contengono solo testo dell'originale", () => {
  assert.ok(seen.size > 100, `frasi controllate: ${seen.size}`);
  for (const text of seen) {
    const r = parseDiaryTherapyText(text, ENTRY);
    const source = foldText(text).replace(/\s+/g, ' ');
    for (const field of ['farmacoNome', 'forma', 'note', 'quantita', 'dosaggio'] as const) {
      for (const word of r.row[field].split(/\s+/).filter(Boolean)) {
        assert.ok(
          source.includes(foldText(word)),
          `"${text}" → ${field} contiene "${word}", assente dall'originale`,
        );
      }
    }
    assert.doesNotMatch(r.row.note, /\b1 Cpr\b/, `segnaposto nelle note di "${text}"`);
    if (!/1 cpr/i.test(text)) assert.doesNotMatch(r.row.quantita, /1 Cpr/);
  }
});

// ── QA4-7. Regola generale: ogni numero dei campi viene dalla clausola di prescrizione ───────
// Anche questo controlla tutte le frasi usate sopra; deve restare in fondo al file.

test('QA4-7: date e numeri dei campi precompilati cadono dentro la clausola di prescrizione', () => {
  const tokens = (text: string) => new Set(text.match(/\d+/g)?.map((n) => String(Number(n))) ?? []);
  for (const text of seen) {
    const r = parseDiaryTherapyText(text, ENTRY);
    const row = r.row;
    const trimmed = text.trim();
    if (!r.prescriptionRange) {
      for (const field of ['dosaggio', 'quantita', 'dataInizio', 'dataFine'] as const) {
        assert.equal(row[field], '', `"${text}" → ${field} senza clausola di prescrizione`);
      }
      assert.deepEqual(row.orari, [], `"${text}" → orari senza clausola di prescrizione`);
      continue;
    }
    const inside = tokens(trimmed.slice(r.prescriptionRange.start, r.prescriptionRange.end));
    const numbers = [
      ...(row.dosaggio.match(/\d+/g) ?? []),
      ...(row.quantita.match(/\d+/g) ?? []),
      ...row.orari.flatMap((t) => t.split(':').filter((p, i) => i === 0 || p !== '00')),
      ...[row.dataInizio, row.dataFine].filter(Boolean).flatMap((d) => d.split('-').slice(1)),
    ].map((n) => String(Number(n)));
    for (const n of numbers) {
      assert.ok(inside.has(n), `"${text}" → il numero ${n} di un campo è fuori dalla prescrizione`);
    }
  }
});

// ── QA5-R1. Regola generale: campo precompilato ⇒ prescrizione consumata per intero ─────────

test('QA5-R1: se un campo è precompilato, ogni parola della prescrizione è classificata', () => {
  let prefilled = 0;
  for (const text of seen) {
    const { row } = parseDiaryTherapyText(text, ENTRY);
    const any =
      row.farmacoNome ||
      row.dosaggio ||
      row.quantita ||
      row.viaSomministrazione ||
      row.forma ||
      row.dataInizio ||
      row.dataFine ||
      row.orari.length ||
      row.giorni.length;
    if (!any) continue;
    prefilled++;
    assert.deepEqual(
      diaryPrescriptionLeftover(text, ENTRY),
      [],
      `"${text}" ha campi precompilati ma parole non classificate`,
    );
  }
  assert.ok(prefilled > 50, `righe precompilate controllate: ${prefilled}`);
});

// ── QA6-2. Regola generale: nessun carattere sparisce ────────────────────────────────────

test('QA6-2: ogni carattere non spazio sta in un campo, nelle note o è punteggiatura comune', () => {
  assert.ok(seen.size > 150, `frasi controllate: ${seen.size}`);
  for (const text of seen) {
    assert.deepEqual(diaryDroppedCharacters(text, ENTRY), [], `"${text}" → caratteri spariti`);
  }
});

// ── QA7. Regola generale: testo avanzato ⇒ intento bloccante o avvisi ───────────────────

test('QA7: nessuna frase con testo avanzato esce come prescrizione senza avvisi', () => {
  let withLeftover = 0;
  for (const text of seen) {
    if (diaryPrescriptionLeftover(text, ENTRY).length === 0) continue;
    withLeftover++;
    const r = parseDiaryTherapyText(text, ENTRY);
    assert.ok(
      r.intent !== 'prescrizione' || r.warnings.length > 0,
      `"${text}" → prescrizione con testo avanzato e zero avvisi`,
    );
    assert.equal(r.row.stato, 'da_verificare', text);
  }
  assert.ok(withLeftover > 30, `frasi con testo avanzato controllate: ${withLeftover}`);
});

// ── QA8. Regola generale su tutto `seen` ────────────────────────────────────────────────

test('QA8/QA9: nessuna prescrizione o al bisogno senza avvisi con note o senza prescrizione', () => {
  let checked = 0;
  for (const text of seen) {
    const r = parseDiaryTherapyText(text, ENTRY);
    if (r.intent !== 'prescrizione' && r.intent !== 'al_bisogno') continue;
    if (r.warnings.length > 0) continue;
    checked++;
    // QA9: per "al bisogno" la formula stessa è classificata; tutto il resto no.
    const rest = foldText(r.row.note)
      .replace(
        /(?<![a-z0-9])(?:al\s+bisogno|se\s+necessario|prn|all['’]\s?occorrenza)(?![a-z0-9])/g,
        ' ',
      )
      .replace(/[.,;:()[\]\-/+'"’‘“”\s]/g, '');
    assert.equal(rest, '', `"${text}" → ${r.intent} senza avvisi ma con testo nelle note`);
    assert.notEqual(r.prescriptionRange, null, `"${text}" → senza avvisi e senza prescrizione`);
  }
  assert.ok(checked > 10, `prescrizioni silenziose controllate: ${checked}`);
});
