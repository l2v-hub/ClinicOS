import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAllergySummary, canSetStatus } from '../allergyStatusModel';
import type { AllergiaItem } from '../../types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const allergen = (allergene = 'Penicillina'): AllergiaItem => ({
  id: `a-${allergene}`,
  allergene,
  reazione: 'Orticaria',
  gravita: 'moderata',
  documentato: '2026-01-01',
  documentatoDa: 'Infermiere Test',
});

// ── deriveAllergySummary ──────────────────────────────────────────────────────

test('deriveAllergySummary: non-empty list wins regardless of status (count)', () => {
  const s = deriveAllergySummary([allergen()], 'presenti');
  assert.equal(s.badge, 'count');
  assert.equal(s.count, 1);
  assert.equal(s.label, '1 allergia');
});

test('deriveAllergySummary: non-empty list wins even if status contradicts it (legacy/edge data)', () => {
  const s = deriveAllergySummary([allergen(), allergen('Lattice')], 'assenti');
  assert.equal(s.badge, 'count');
  assert.equal(s.count, 2);
  assert.equal(s.label, '2 allergie');
});

test('deriveAllergySummary: empty list + status assenti -> success, verified-absent', () => {
  const s = deriveAllergySummary([], 'assenti');
  assert.equal(s.badge, 'success');
  assert.equal(s.count, 0);
  assert.equal(s.label, 'Allergie assenti (verificato)');
});

test('deriveAllergySummary: empty list + status paziente_nega -> info, patient denies', () => {
  const s = deriveAllergySummary([], 'paziente_nega');
  assert.equal(s.badge, 'info');
  assert.equal(s.label, 'Paziente nega allergie');
});

test('deriveAllergySummary: undefined status + empty list -> warning, undocumented', () => {
  const s = deriveAllergySummary(undefined, undefined);
  assert.equal(s.badge, 'warning');
  assert.equal(s.label, 'Stato non documentato');
});

test('deriveAllergySummary: empty list + undefined status (explicit []) -> warning, undocumented', () => {
  const s = deriveAllergySummary([], undefined);
  assert.equal(s.badge, 'warning');
  assert.equal(s.label, 'Stato non documentato');
});

test('deriveAllergySummary: status presenti but list emptied (edge case) -> falls back to undocumented', () => {
  const s = deriveAllergySummary([], 'presenti');
  assert.equal(s.badge, 'warning');
  assert.equal(s.label, 'Stato non documentato');
});

// ── canSetStatus ──────────────────────────────────────────────────────────────

test('canSetStatus: blocks "assenti" when the list has entries', () => {
  const r = canSetStatus([allergen()], 'assenti');
  assert.equal(r.ok, false);
  assert.ok(r.reason && r.reason.length > 0);
});

test('canSetStatus: blocks "paziente_nega" when the list has entries', () => {
  const r = canSetStatus([allergen()], 'paziente_nega');
  assert.equal(r.ok, false);
  assert.ok(r.reason && r.reason.length > 0);
});

test('canSetStatus: allows "presenti" even when the list has entries', () => {
  const r = canSetStatus([allergen()], 'presenti');
  assert.equal(r.ok, true);
  assert.equal(r.reason, undefined);
});

test('canSetStatus: allows "assenti" when the list is empty', () => {
  const r = canSetStatus([], 'assenti');
  assert.equal(r.ok, true);
});

test('canSetStatus: allows "paziente_nega" when the list is empty', () => {
  const r = canSetStatus([], 'paziente_nega');
  assert.equal(r.ok, true);
});

test('canSetStatus: allows "assenti"/"paziente_nega" when list is undefined', () => {
  assert.equal(canSetStatus(undefined, 'assenti').ok, true);
  assert.equal(canSetStatus(undefined, 'paziente_nega').ok, true);
});
