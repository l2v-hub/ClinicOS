import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_ANOMALIE_NEL_RIEPILOGO,
  messaggioAnomalieCompatto,
  type AnomaliaFarmaco,
} from '../anomalieFarmaco.js';

function anomalia(index: number): AnomaliaFarmaco {
  return { farmacoNome: `Farmaco ${index}`, righe: 1, motivo: 'non-in-anagrafica' };
}

test('compact anomaly message bounds names and declares the omitted count', () => {
  const anomalie = Array.from({ length: 10 }, (_, index) => anomalia(index + 1));
  const message = messaggioAnomalieCompatto({
    anomalie,
    totale: anomalie.length,
    verificaIncompleta: false,
  });
  assert.match(message, /^10 farmaci da sanare:/);
  assert.match(message, new RegExp(`Farmaco ${MAX_ANOMALIE_NEL_RIEPILOGO}`));
  assert.match(message, /\+7 altri farmaci/);
  assert.doesNotMatch(message, /Farmaco 4|Farmaco 10/);
});

test('compact anomaly message preserves singular and empty states', () => {
  assert.equal(
    messaggioAnomalieCompatto({
      anomalie: [anomalia(1)],
      totale: 1,
      verificaIncompleta: false,
    }),
    '1 farmaco da sanare: Farmaco 1.',
  );
  assert.equal(
    messaggioAnomalieCompatto({ anomalie: [], totale: 0, verificaIncompleta: false }),
    '',
  );
});
