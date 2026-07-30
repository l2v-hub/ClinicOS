// frontend/src/components/operator/cartella/__tests__/anomalieFarmaco.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anomalieDi, messaggioAnomalie } from '../anomalieFarmaco.js';
import type { RisoluzioneFarmaco } from '../farmacoDocumento.js';

const TROVATO: RisoluzioneFarmaco = {
  stato: 'trovato',
  documento: { href: 'https://x', tipo: 'rcp', denominazione: 'TACHIPIRINA' },
  confezioni: 2,
};
const NON_TROVATO: RisoluzioneFarmaco = { stato: 'non-trovato', confezioni: 0 };
const SENZA_DOCUMENTO: RisoluzioneFarmaco = { stato: 'senza-documento', confezioni: 1 };
const FONTE_GIU: RisoluzioneFarmaco = { stato: 'fonte-non-disponibile', confezioni: 0 };

/** Lookup finto: mappa nome → risoluzione, come fa `trovaRisoluzione`. */
function lookup(mappa: Record<string, RisoluzioneFarmaco>) {
  return (nome: string) => mappa[nome.trim().toUpperCase()];
}

test('AC5: un farmaco fuori anagrafica e un anomalia da sanare', () => {
  const esito = anomalieDi(
    [{ farmacoNome: 'Tachipirina' }, { farmacoNome: 'Cardiofillina galenica' }],
    lookup({ TACHIPIRINA: TROVATO, 'CARDIOFILLINA GALENICA': NON_TROVATO }),
  );
  assert.equal(esito.totale, 1);
  assert.equal(esito.anomalie[0].farmacoNome, 'Cardiofillina galenica');
  assert.equal(esito.anomalie[0].motivo, 'non-in-anagrafica');
  assert.equal(esito.verificaIncompleta, false);
});

test('AC9: senza anomalie il totale e zero e la verifica e completa', () => {
  const esito = anomalieDi(
    [{ farmacoNome: 'Tachipirina' }, { farmacoNome: 'tachipirina' }],
    lookup({ TACHIPIRINA: TROVATO }),
  );
  assert.equal(esito.totale, 0);
  assert.deepEqual(esito.anomalie, []);
  assert.equal(esito.verificaIncompleta, false, 'nessuna anomalia != verifica non riuscita');
});

test("AC10: l'anagrafica che non risponde NON produce anomalie", () => {
  // Il caso piu' importante del modulo: uno stato indeterminato dichiarato come anomalia
  // manderebbe un operatore a correggere una prescrizione corretta.
  const esito = anomalieDi(
    [{ farmacoNome: 'Tachipirina' }, { farmacoNome: 'Lasix' }],
    lookup({ TACHIPIRINA: FONTE_GIU, LASIX: FONTE_GIU }),
  );
  assert.equal(esito.totale, 0);
  assert.equal(esito.verificaIncompleta, true, 'ma va dichiarato che la verifica non e conclusa');
});

test('AC10: una risoluzione mancante conta come verifica incompleta, non come anomalia', () => {
  const esito = anomalieDi([{ farmacoNome: 'Farmaco Mai Cercato' }], lookup({}));
  assert.equal(esito.totale, 0);
  assert.equal(esito.verificaIncompleta, true);
});

test('AC10: anomalie certe e verifica incompleta convivono', () => {
  const esito = anomalieDi(
    [{ farmacoNome: 'Sbagliato' }, { farmacoNome: 'Ignoto' }],
    lookup({ SBAGLIATO: NON_TROVATO, IGNOTO: FONTE_GIU }),
  );
  assert.equal(esito.totale, 1);
  assert.equal(esito.verificaIncompleta, true);
});

test('AC7: lo stesso farmaco su piu righe conta una anomalia sola', () => {
  const esito = anomalieDi(
    [
      { farmacoNome: 'Inesistolo', dosaggio: '10 mg' },
      { farmacoNome: 'INESISTOLO', dosaggio: '20 mg' },
      { farmacoNome: ' inesistolo ', dosaggio: '5 mg' },
    ],
    lookup({ INESISTOLO: NON_TROVATO }),
  );
  assert.equal(esito.totale, 1, 'un nome da correggere, non tre');
  assert.equal(esito.anomalie[0].righe, 3, 'ma si sa quante righe lo prescrivono');
});

test('«in anagrafica ma senza documento» non e un anomalia di prescrizione', () => {
  // E' un limite della pubblicazione AIFA: il farmaco esiste ed e' prescritto correttamente.
  const esito = anomalieDi(
    [{ farmacoNome: 'Farmaco Senza RCP' }],
    lookup({ 'FARMACO SENZA RCP': SENZA_DOCUMENTO }),
  );
  assert.equal(esito.totale, 0);
  assert.equal(esito.verificaIncompleta, false);
});

test('le righe senza nome farmaco non producono anomalie ne verifiche incomplete', () => {
  const esito = anomalieDi(
    [{ farmacoNome: '' }, { farmacoNome: '   ' }],
    lookup({ TACHIPIRINA: TROVATO }),
  );
  assert.equal(esito.totale, 0);
  assert.equal(esito.verificaIncompleta, false);
});

test('le anomalie sono ordinate per nome, cosi la lista non salta fra un render e l altro', () => {
  const esito = anomalieDi(
    [{ farmacoNome: 'Zeta' }, { farmacoNome: 'Alfa' }, { farmacoNome: 'Mu' }],
    lookup({ ZETA: NON_TROVATO, ALFA: NON_TROVATO, MU: NON_TROVATO }),
  );
  assert.deepEqual(
    esito.anomalie.map((a) => a.farmacoNome),
    ['Alfa', 'Mu', 'Zeta'],
  );
});

test("il messaggio dell'avviso concorda al singolare e al plurale", () => {
  const uno = anomalieDi([{ farmacoNome: 'Inesistolo' }], lookup({ INESISTOLO: NON_TROVATO }));
  assert.match(messaggioAnomalie(uno), /^1 farmaco .* non risulta .* Va corretto\.$/);

  const due = anomalieDi(
    [{ farmacoNome: 'Inesistolo' }, { farmacoNome: 'Altro' }],
    lookup({ INESISTOLO: NON_TROVATO, ALTRO: NON_TROVATO }),
  );
  assert.match(messaggioAnomalie(due), /^2 farmaci .* non risultano .* Vanno corretti\.$/);

  assert.equal(messaggioAnomalie(anomalieDi([], lookup({}))), '', 'nessuna anomalia, nessun testo');
});
