// Pure unit tests for locateFieldPages (Ingresso 3b, AC1 + QA probes). Synthetic text only.
// Principle under test: a wrong page is worse than no page.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { locateFieldPages, normalizeText, type PageText } from '../page-locate.js';

const page = (pageId: string, text: string, groupId = 'g1'): PageText => ({
  groupId,
  pageId,
  documentId: `d-${pageId}`,
  text,
});
const ids = (refs: Array<{ pageId: string }>) => refs.map((r) => r.pageId);
const one = (text: string) => [page('p1', text)];

const P1 = page('p1', 'OSPEDALE SINTETICO\nLettera di dimissione\nReparto di Medicina');
const P2 = page(
  'p2',
  'Paziente: ROSSINI Mario  nato il 05/02/1939\nC.F. RSS MRA 39B05 H501 X\nSesso: M',
);
const P3 = page('p3', 'Sig. Mario Rossi, nato a Roma il 5.2.1939\nAllergie: Penicillina, lattosio');
const LONG_DIAGNOSIS = 'Scompenso cardiaco cronico in cardiopatia ischemica post infartuale';
const P4 = page('p4', `Diagnosi: ${LONG_DIAGNOSIS}\nControllo tra 30 giorni`, 'g2');
const MARIO_ROSSI = { firstName: 'Mario', lastName: 'Rossi' };

describe('locateFieldPages (AC1)', () => {
  test('normalizes case, accents and whitespace', () => {
    assert.equal(normalizeText('  Città   di\n\tFORLÌ '), 'citta di forli');
  });

  test('a date written as 05/02/1939 on page 2 finds page 2', () => {
    assert.deepEqual(locateFieldPages('anagrafica.dateOfBirth', '1939-02-05', [P1, P2]), [
      { groupId: 'g1', pageId: 'p2', documentId: 'd-p2' },
    ]);
  });

  test('dates are recognised as dd.mm.yyyy, d/m/yyyy and ISO, never a different date', () => {
    const iso = page('pi', 'Data di nascita 1939-02-05');
    const short = page('ps', 'nato il 5/2/1939');
    const other = page('po', 'nato il 06/02/1939 — ricovero 05/02/2021');
    assert.deepEqual(
      ids(locateFieldPages('anagrafica.dateOfBirth', '1939-02-05', [P3, iso, short, other])),
      ['p3', 'pi', 'ps'],
    );
    assert.deepEqual(ids(locateFieldPages('anagrafica.dateOfBirth', '05/02/1939', [P2])), ['p2']);
    assert.deepEqual(locateFieldPages('anagrafica.dateOfBirth', 'non valida', [P2]), []);
  });

  test('the codice fiscale is found even when written with spaces', () => {
    assert.deepEqual(
      ids(locateFieldPages('anagrafica.codiceFiscale', 'RSSMRA39B05H501X', [P1, P2, P3])),
      ['p2'],
    );
    assert.deepEqual(locateFieldPages('anagrafica.codiceFiscale', 'RSSMRA39B05H501Y', [P2]), []);
  });

  test('a surname is never found inside another word', () => {
    // "Rossi" is inside "ROSSINI" on page 2: only page 3 has the name pair.
    assert.deepEqual(
      ids(locateFieldPages('anagrafica.lastName', 'Rossi', [P1, P2, P3], MARIO_ROSSI)),
      ['p3'],
    );
  });

  test('no certain match returns nothing', () => {
    const pages = [P1, P2, P3, P4];
    assert.deepEqual(locateFieldPages('anagrafica.lastName', 'Bianchi', pages, MARIO_ROSSI), []);
    assert.deepEqual(locateFieldPages('allergieStatus', 'presenti', pages), [], 'categorical');
    assert.deepEqual(locateFieldPages('anagrafica.firstName', 'Mario', [], MARIO_ROSSI), []);
    assert.deepEqual(locateFieldPages('diagnosi', [{ descrizione: 'BPCO' }], pages), []);
  });

  test('a value present on two pages returns both, in page order', () => {
    const header = page('p0', 'Paziente ROSSI MARIO — nato il 05/02/1939');
    assert.deepEqual(
      ids(locateFieldPages('anagrafica.firstName', 'Mario', [header, P1, P2, P3], MARIO_ROSSI)),
      ['p0', 'p3'],
    );
    assert.deepEqual(
      ids(locateFieldPages('anagrafica.dateOfBirth', '1939-02-05', [header, P1, P2])),
      ['p0', 'p2'],
    );
  });

  test('allergies are found per allergen, next to an allergy word', () => {
    const noWord = page('px', 'Terapia: compresse contenenti lattosio e penicillina');
    assert.deepEqual(
      ids(
        locateFieldPages(
          'allergie',
          [{ allergene: 'Penicillina' }, { allergene: 'Lattosio' }, { allergene: 'ASA' }],
          [P1, noWord, P3],
        ),
      ),
      ['p3'],
    );
    const onlyFirst = page('pa', 'Allergia nota: penicillina');
    const onlySecond = page('pb', 'Intolleranza al lattosio');
    assert.deepEqual(
      ids(
        locateFieldPages(
          'allergie',
          [{ allergene: 'Penicillina' }, { allergene: 'Lattosio' }],
          [onlyFirst, P1, onlySecond],
        ),
      ),
      ['pa', 'pb'],
    );
  });

  test('sex follows the page of the name pair', () => {
    assert.deepEqual(ids(locateFieldPages('anagrafica.sex', 'M', [P1, P2, P3], MARIO_ROSSI)), [
      'p3',
    ]);
    assert.deepEqual(locateFieldPages('anagrafica.sex', 'M', [P1], MARIO_ROSSI), []);
  });

  test('long text is found by its normalized beginning', () => {
    const anamnesi = '## ANAMNESI\nIperteso da anni, in terapia con ACE-inibitore da tempo';
    const p5 = page('p5', 'blah\n## Anamnesi\niperteso  da anni, in terapia con ace inibitore');
    assert.deepEqual(ids(locateFieldPages('anamnesi.patologicaProssima', anamnesi, [P1, p5])), [
      'p5',
    ]);
    assert.deepEqual(
      ids(locateFieldPages('diagnosi', [{ descrizione: LONG_DIAGNOSIS }], [P3, P4])),
      ['p4'],
    );
  });
});

describe('locateFieldPages — QA probes: a wrong page is worse than no page', () => {
  const none = (path: string, value: unknown, text: string, related = {}) =>
    assert.deepEqual(locateFieldPages(path, value, one(text), related), [], `${path} in "${text}"`);

  test('names: a lone surname that is an ordinary word finds no page', () => {
    none('anagrafica.lastName', 'Rosa', 'Cute: colorito rosa', { firstName: 'Anna' });
    none('anagrafica.lastName', 'Porta', 'Paziente porta catetere vescicale', {
      firstName: 'Luigi',
    });
    none('anagrafica.lastName', 'Villa', 'Trasferito da Villa Serena', { firstName: 'Carlo' });
    none('anagrafica.lastName', 'Bianco', 'Tosse con espettorato bianco', { firstName: 'Paolo' });
    none('anagrafica.lastName', 'Basso', 'Morse: rischio cadute basso', { firstName: 'Giovanni' });
  });

  test('names: a lone first name that is an ordinary word finds no page', () => {
    none('anagrafica.firstName', 'Maria', 'OSPEDALE SANTA MARIA NUOVA', { lastName: 'Galli' });
    none('anagrafica.firstName', 'Maria', 'Riferimento: figlia Maria', { lastName: 'Galli' });
    none('anagrafica.firstName', 'Serena', 'Notte trascorsa, paziente serena', {
      lastName: 'Galli',
    });
    none('anagrafica.firstName', 'Chiara', 'Diuresi valida, urina chiara', { lastName: 'Galli' });
  });

  test('names: no fallback to one name when the pair is not adjacent', () => {
    const apart = 'Paziente Galli, ricoverata. Teresa riferisce dolore';
    none('anagrafica.lastName', 'Galli', apart, { firstName: 'Teresa' });
    none('anagrafica.firstName', 'Teresa', apart, { lastName: 'Galli' });
    none('anagrafica.lastName', 'Galli', 'Paziente GALLI', {});
    none('anagrafica.lastName', 'Galli', 'GALLI.\nTERESA', { firstName: 'Teresa' });
  });

  test('names: the adjacent pair is found in both orders, also with a comma', () => {
    const galli = { firstName: 'Teresa', lastName: 'Galli' };
    for (const text of ['Paziente: GALLI TERESA nata il', 'Sig.ra Teresa Galli', 'Galli, Teresa'])
      for (const path of ['anagrafica.lastName', 'anagrafica.firstName', 'anagrafica.sex']) {
        const value =
          path === 'anagrafica.lastName'
            ? 'Galli'
            : path === 'anagrafica.firstName'
              ? 'Teresa'
              : 'F';
        assert.deepEqual(ids(locateFieldPages(path, value, one(text), galli)), ['p1'], text);
      }
  });

  test('sex: no page with surname "Li" or without a surname', () => {
    none('anagrafica.sex', 'F', 'Paziente LI WEI, sesso F', { firstName: 'Wei', lastName: 'Li' });
    none('anagrafica.sex', 'F', 'Paziente Teresa, sesso F', { firstName: 'Teresa' });
    none('anagrafica.sex', 'F', 'Paziente Galli, sesso F', { lastName: 'Galli' });
  });

  test('long text: boilerplate and short text find no page', () => {
    none('anamnesi.patologicaRemota', 'Nulla di rilevante', 'APR: nulla di rilevante');
    none(
      'anamnesi.patologicaRemota',
      '## ANAMNESI\nNulla da segnalare',
      '## ANAMNESI\nNulla da segnalare',
    );
    none('anamnesi.patologicaRemota', 'Non noto', 'Anamnesi remota: non noto');
    none('anamnesi.patologicaProssima', 'Iperteso da anni', 'Iperteso da anni');
    none('diagnosi', [{ descrizione: 'Scompenso cardiaco' }], 'Diagnosi: Scompenso cardiaco');
  });

  test('allergies: an allergen far from an allergy word finds no page', () => {
    none('allergie', [{ allergene: 'Lattosio' }], 'Terapia: compresse contenenti lattosio');
    none('allergie', [{ allergene: 'Mezzo di contrasto' }], 'Eseguita TC senza mezzo di contrasto');
    none('allergie', [{ allergene: 'Allergia stagionale' }], 'Pollini: allergia stagionale nota');
    assert.deepEqual(
      ids(locateFieldPages('allergie', [{ allergene: 'Lattosio' }], one('Allergie: lattosio'))),
      ['p1'],
    );
  });

  test('names: a signing doctor with the same name is not the patient', () => {
    none('anagrafica.lastName', 'Rossi', 'Firma: Dott. Rossi Mario', MARIO_ROSSI);
    none('anagrafica.lastName', 'Rossi', 'Il medico: Dr Mario Rossi', MARIO_ROSSI);
    none('anagrafica.lastName', 'Rossi', 'Prof. Rossi, Mario', MARIO_ROSSI);
    assert.deepEqual(
      ids(
        locateFieldPages('anagrafica.lastName', 'Rossi', one('Paziente: Rossi Mario'), MARIO_ROSSI),
      ),
      ['p1'],
    );
  });

  test('allergies: a negated allergy word is no evidence', () => {
    none('allergie', [{ allergene: 'Penicillina' }], 'Nega allergie. Terapia con penicillina');
    none('allergie', [{ allergene: 'Lattosio' }], 'ALLERGIE: nessuna nota. Terapia con lattosio');
    none(
      'allergie',
      [{ allergene: 'Mezzo di contrasto' }],
      'Non allergie note. TC senza mezzo di contrasto',
    );
  });

  test('dates: a two-digit year never matches', () => {
    none('anagrafica.dateOfBirth', '1924-02-05', 'Ricovero del 05/02/24');
    none('anagrafica.dateOfBirth', '1939-02-05', 'nato il 5/2/39');
  });

  test('email and numeric codes: whole tokens only', () => {
    none('anagrafica.email', 'a.rossi@gmail.com', 'Contatto: ma.rossi@gmail.com');
    none('anagrafica.email', 'rossi@gmail.com', 'Contatto: rossi@gmail.com.br');
    assert.deepEqual(
      ids(
        locateFieldPages('anagrafica.email', 'a.rossi@gmail.com', one('Email: a.rossi@gmail.com.')),
      ),
      ['p1'],
    );
    none('anagrafica.codiceFiscale', '12345678901', 'Pratica n. 99912345678901999999');
    none('anagrafica.codiceFiscale', 'RSSMRA39B05H501X', 'XRSSMRA39B05H501X');
    assert.deepEqual(
      ids(locateFieldPages('anagrafica.codiceFiscale', '12345678901', one('P.IVA 12345678901'))),
      ['p1'],
    );
  });
});
