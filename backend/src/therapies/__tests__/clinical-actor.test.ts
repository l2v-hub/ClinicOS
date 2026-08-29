import { test } from 'node:test';
import assert from 'node:assert/strict';
import { therapiesWithAuthenticatedActor } from '../clinical-actor.js';

test('intake therapy actor always comes from the authenticated operator', () => {
  const result = therapiesWithAuthenticatedActor(
    [
      {
        farmacoNome: 'Farmaco test',
        dataInizio: '2030-01-01',
        operatoreInseritore: 'Attore inviato dal client',
      },
    ],
    { id: 'operator-a', name: 'Operatore Verificato' },
  );
  assert.equal(result?.[0].operatoreInseritore, 'Operatore Verificato');
});
