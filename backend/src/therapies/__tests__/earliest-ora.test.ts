import { test } from 'node:test';
import assert from 'node:assert/strict';
import { earliestOra } from '../slot-scheduling.js';

// Segnalazione utente: SABBATANI LILIANA ha LASIX sia alle 08:00 (fascia mattina) sia alle 14:00
// (fascia pomeriggio, default 16:00) — nell'agenda multi-paziente la fascia "pomeriggio" restava
// sempre etichettata/posizionata a 16:00 (l'orario di default), nascondendo che conteneva una dose
// reale delle 14:00. Verificato via query diretta al DB di produzione (sola lettura) che i dati
// stessi erano corretti: il bug era solo nel calcolo di `ora` per la card, non nella persistenza.

test('earliestOra: fascia vuota resta al default (nessun contenuto da ancorare)', () => {
  assert.equal(earliestOra([], '16:00'), '16:00');
});

test('earliestOra: un solo orario reale sostituisce il default', () => {
  assert.equal(earliestOra(['14:00'], '16:00'), '14:00');
});

test('earliestOra: piu` pazienti nella stessa fascia -> vince il piu` imminente', () => {
  // caso SABBATANI: la sua dose (14:00) e altri pazienti a orario di default (16:00) nella
  // stessa fascia "pomeriggio" -> la card si ancora al piu` precoce, non resta bloccata al default.
  assert.equal(earliestOra(['16:00', '14:00', '16:00'], '16:00'), '14:00');
});

test('earliestOra: orario reale successivo al default resta comunque il minimo reale', () => {
  // il default NON deve mai vincere sul dato reale quando la fascia non e` vuota, anche se
  // tutte le dosi reali sono piu` tardive del default fisso.
  assert.equal(earliestOra(['18:00'], '16:00'), '18:00');
});

test('earliestOra: ordine di inserimento non influenza il risultato', () => {
  assert.equal(earliestOra(['09:30', '08:00', '08:45'], '08:00'), '08:00');
});
