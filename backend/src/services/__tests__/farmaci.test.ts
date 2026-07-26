import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, nucleoNome, dosaggiCitati } from '../farmaci/normalizza.js';
import { dividiRigaCsv, mappaConfezione, mappaPrincipioAttivo } from '../farmaci/import.js';
import { distanza } from '../farmaci/ricerca.js';

// Intestazioni reali dei due CSV AIFA (drive.aifa.gov.it).
const INT_CONF = [
  'CODICE_AIC',
  'COD_FARMACO',
  'COD_CONFEZIONE',
  'DENOMINAZIONE',
  'DESCRIZIONE',
  'CODICE_DITTA',
  'RAGIONE_SOCIALE',
  'STATO_AMMINISTRATIVO',
  'TIPO_PROCEDURA',
  'FORMA',
  'CODICE_ATC',
  'PA_ASSOCIATI',
  'FORNITURA',
  'LINK_FI',
  'LINK_RCP',
];
const INT_PA = ['CODICE_AIC', 'PRINCIPIO_ATTIVO', 'QUANTITA', 'UNITA_MISURA'];

test('normalizza: maiuscole, senza accenti e senza punteggiatura', () => {
  assert.equal(normalizza('Cardioaspirin*100 mg'), 'CARDIOASPIRIN 100 MG');
  assert.equal(normalizza('à-perù, così'), 'A PERU COSI');
  assert.equal(normalizza(''), '');
});

test("nucleoNome toglie dosaggi e forme, che l'operatore attacca al nome", () => {
  assert.equal(nucleoNome('Cardioaspirin 100 mg cpr'), 'CARDIOASPIRIN');
  assert.equal(nucleoNome('TACHIPIRINA 1000 MG COMPRESSE'), 'TACHIPIRINA');
  // numero nudo in coda: e' un dosaggio senza unita'
  assert.equal(nucleoNome('Cardioaspirin 100'), 'CARDIOASPIRIN');
});

test('nucleoNome NON rovina i nomi che contengono cifre', () => {
  // le cifre interne a un termine fanno parte del nome, non sono un dosaggio
  assert.equal(nucleoNome('VITAMINA B12'), 'VITAMINA B12');
});

test('nucleoNome non restituisce mai vuoto', () => {
  // se resta solo il dosaggio, meglio la forma piena che una stringa vuota,
  // che in ricerca corrisponderebbe a tutto
  assert.equal(nucleoNome('100 mg'), '100 MG');
});

test('dosaggiCitati estrae valore e unita', () => {
  assert.deepEqual(dosaggiCitati('Ramipril 2,5 mg'), [{ valore: 2.5, unita: 'mg' }]);
  assert.deepEqual(dosaggiCitati('senza dose'), []);
});

test('dividiRigaCsv rispetta le virgolette e il separatore', () => {
  assert.deepEqual(dividiRigaCsv('"000367045";"TISANA";"10 BUSTINE; FILTRO"'), [
    '000367045',
    'TISANA',
    '10 BUSTINE; FILTRO',
  ]);
  assert.deepEqual(dividiRigaCsv('a;;c'), ['a', '', 'c']);
});

test('mappaConfezione prende i campi che servono e indicizza il nucleo del nome', () => {
  const campi = [
    '000367045',
    '000367',
    '045',
    'TISANA ESEMPIO 100 MG',
    '10 BUSTINE',
    '2934',
    'DITTA ESEMPIO SRL',
    'Autorizzata',
    'Procedura Nazionale',
    'Tisana',
    'A06AB06',
    'ESEMPIO',
    'Medicinali non soggetti a prescrizione medica, da banco.',
    'https://esempio/fi',
    'https://esempio/rcp',
  ];
  const r = mappaConfezione(INT_CONF, campi);
  assert.ok(r);
  assert.equal(r.aic, '000367045');
  assert.equal(r.atc, 'A06AB06');
  assert.equal(r.statoAmministrativo, 'Autorizzata');
  assert.equal(r.linkFi, 'https://esempio/fi');
  // il campo indicizzato e' il nucleo, non la denominazione grezza
  assert.equal(r.denominazioneNorm, 'TISANA ESEMPIO');
});

test('mappaConfezione scarta le righe senza AIC o senza denominazione', () => {
  assert.equal(mappaConfezione(INT_CONF, ['', '', '', 'X']), null);
  assert.equal(mappaConfezione(INT_CONF, ['000367045', '', '', '']), null);
});

test('mappaPrincipioAttivo converte la quantita e scarta i segnaposto N.D.', () => {
  const r = mappaPrincipioAttivo(INT_PA, ['000367045', 'RAMIPRIL', '2,5', 'milligrammi']);
  assert.ok(r);
  assert.equal(r.quantita, 2.5);
  assert.equal(r.principioAttivoNorm, 'RAMIPRIL');
  // 'N.D.' e' il segnaposto AIFA: indicizzarlo creerebbe migliaia di falsi principi attivi
  assert.equal(mappaPrincipioAttivo(INT_PA, ['000140018', 'N.D.', ' 0.0', 'N.D.']), null);
  // quantita assente o zero -> null, non 0: chi la usa deve distinguere "non nota" da "zero"
  const senzaQ = mappaPrincipioAttivo(INT_PA, ['000367045', 'RAMIPRIL', '', '']);
  assert.equal(senzaQ?.quantita, null);
  assert.equal(senzaQ?.unitaMisura, null);
});

test('distanza si ferma quando supera il massimo, invece di completare il calcolo', () => {
  assert.equal(distanza('CARDIOASPIRIN', 'CARDIOASPIRIN'), 0);
  assert.equal(distanza('CARDIOASPRINA', 'CARDIOASPIRIN', 3) <= 3, true);
  // molto diverse: deve restituire oltre-soglia, non un valore esatto costoso
  assert.equal(distanza('ASPIRINA', 'PARACETAMOLO', 2), 3);
});
