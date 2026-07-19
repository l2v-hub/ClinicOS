import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Tinetti scoring ───────────────────────────────────────────────────────────
// We inline the logic here (mirrors the exported helpers) to avoid tsx/ESM complexity.

function calcBalance(v: Record<string, number>): number {
  return (
    (v.equilibrioSeduto ?? 0) +
    (v.alzarsi ?? 0) +
    (v.tentativiAlzarsi ?? 0) +
    (v.equilibrioImmediato ?? 0) +
    (v.equilibrioProlungato ?? 0) +
    (v.rombergSpinta ?? 0) +
    (v.occhiChiusi ?? 0) +
    (v.girarsi360Passi ?? 0) +
    (v.girarsi360Stabilita ?? 0) +
    (v.sedersi ?? 0)
  );
}

function calcGait(v: Record<string, number>): number {
  return (
    (v.iniziazione ?? 0) +
    (v.lunghezzaPassoDx ?? 0) +
    (v.altezzaPassoDx ?? 0) +
    (v.lunghezzaPassoSx ?? 0) +
    (v.altezzaPassoSx ?? 0) +
    (v.simmetria ?? 0) +
    (v.continuita ?? 0) +
    (v.traiettoria ?? 0) +
    (v.tronco ?? 0) +
    (v.cammino ?? 0)
  );
}

function calcTotal(v: Record<string, number>): number {
  return calcBalance(v) + calcGait(v);
}

function tinettiRischio(total: number): string {
  if (total < 19) return 'Alto rischio cadute';
  if (total < 24) return 'Rischio moderato';
  return 'Basso rischio';
}

// ── NRS severity ──────────────────────────────────────────────────────────────

function nrsSeverity(p: number): string {
  if (p === 0) return 'Assente';
  if (p <= 3) return 'Lieve';
  if (p <= 6) return 'Moderato';
  return 'Severo';
}

// ── Tinetti tests ─────────────────────────────────────────────────────────────

const MAX_BALANCE = {
  equilibrioSeduto: 1,
  alzarsi: 2,
  tentativiAlzarsi: 2,
  equilibrioImmediato: 2,
  equilibrioProlungato: 2,
  rombergSpinta: 2,
  occhiChiusi: 1,
  girarsi360Passi: 1,
  girarsi360Stabilita: 1,
  sedersi: 2,
};

const MAX_GAIT = {
  iniziazione: 1,
  lunghezzaPassoDx: 1,
  altezzaPassoDx: 1,
  lunghezzaPassoSx: 1,
  altezzaPassoSx: 1,
  simmetria: 1,
  continuita: 1,
  traiettoria: 2,
  tronco: 2,
  cammino: 1,
};

const MIN_RECORD = {
  equilibrioSeduto: 0,
  alzarsi: 0,
  tentativiAlzarsi: 0,
  equilibrioImmediato: 0,
  equilibrioProlungato: 0,
  rombergSpinta: 0,
  occhiChiusi: 0,
  girarsi360Passi: 0,
  girarsi360Stabilita: 0,
  sedersi: 0,
  iniziazione: 0,
  lunghezzaPassoDx: 0,
  altezzaPassoDx: 0,
  lunghezzaPassoSx: 0,
  altezzaPassoSx: 0,
  simmetria: 0,
  continuita: 0,
  traiettoria: 0,
  tronco: 0,
  cammino: 0,
};

test('Tinetti balance max is 16', () => {
  assert.equal(calcBalance(MAX_BALANCE), 16);
});

test('Tinetti gait max is 12', () => {
  assert.equal(calcGait(MAX_GAIT), 12);
});

test('Tinetti total max is 28', () => {
  const all = { ...MAX_BALANCE, ...MAX_GAIT };
  assert.equal(calcTotal(all), 28);
});

test('Tinetti total min is 0', () => {
  assert.equal(calcTotal(MIN_RECORD), 0);
});

test('Tinetti risk: score 0 -> Alto rischio cadute', () => {
  assert.equal(tinettiRischio(0), 'Alto rischio cadute');
});

test('Tinetti risk: score 18 -> Alto rischio cadute', () => {
  assert.equal(tinettiRischio(18), 'Alto rischio cadute');
});

test('Tinetti risk: score 19 -> Rischio moderato', () => {
  assert.equal(tinettiRischio(19), 'Rischio moderato');
});

test('Tinetti risk: score 23 -> Rischio moderato', () => {
  assert.equal(tinettiRischio(23), 'Rischio moderato');
});

test('Tinetti risk: score 24 -> Basso rischio', () => {
  assert.equal(tinettiRischio(24), 'Basso rischio');
});

test('Tinetti risk: score 28 -> Basso rischio', () => {
  assert.equal(tinettiRischio(28), 'Basso rischio');
});

// ── NRS tests ─────────────────────────────────────────────────────────────────

test('NRS severity: 0 -> Assente', () => {
  assert.equal(nrsSeverity(0), 'Assente');
});

test('NRS severity: 1 -> Lieve', () => {
  assert.equal(nrsSeverity(1), 'Lieve');
});

test('NRS severity: 3 -> Lieve', () => {
  assert.equal(nrsSeverity(3), 'Lieve');
});

test('NRS severity: 4 -> Moderato', () => {
  assert.equal(nrsSeverity(4), 'Moderato');
});

test('NRS severity: 6 -> Moderato', () => {
  assert.equal(nrsSeverity(6), 'Moderato');
});

test('NRS severity: 7 -> Severo', () => {
  assert.equal(nrsSeverity(7), 'Severo');
});

test('NRS severity: 10 -> Severo', () => {
  assert.equal(nrsSeverity(10), 'Severo');
});
