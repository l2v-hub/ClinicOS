import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CapabilityMap } from '../../types';
import { can, canNavigate, capabilityDeniedMessage, effectOf } from '../capabilities.js';

const caps: CapabilityMap = {
  'patients.list_page': { effect: 'ALLOWED', allowed: true, requiresConfirmation: false },
  'therapy.create': { effect: 'DENIED', allowed: false, requiresConfirmation: false },
  'consegne.list': { effect: 'READ_ONLY', allowed: true, requiresConfirmation: false },
};

test('can(): allowed, denied, missing, and no policy map', () => {
  assert.equal(can(caps, 'patients.list_page'), true);
  assert.equal(can(caps, 'therapy.create'), false);
  assert.equal(can(caps, 'authz.view_policy'), false);
  // Senza mappa la GUI non nasconde nulla: decide il backend.
  assert.equal(can(null, 'therapy.create'), true);
  assert.equal(effectOf(caps, 'consegne.list'), 'READ_ONLY');
  assert.equal(effectOf(null, 'consegne.list'), null);
});

test('canNavigate(): pages follow their backing capability, dashboards are always visible', () => {
  assert.equal(canNavigate(caps, 'pazienti'), true);
  assert.equal(canNavigate(caps, 'consegne'), true);
  assert.equal(canNavigate(caps, 'ruoli-permessi'), false);
  assert.equal(canNavigate(caps, 'gestione-operatori'), false);
  assert.equal(canNavigate(caps, 'admin-dashboard'), true);
  assert.equal(canNavigate(caps, 'anagrafica-farmaci'), true);
});

test('capabilityDeniedMessage(): only policy 403s get the role message', () => {
  assert.match(
    capabilityDeniedMessage(403, { code: 'capability_denied' }) ?? '',
    /non consentita per il tuo ruolo/,
  );
  assert.match(capabilityDeniedMessage(403, { code: 'read_only' }) ?? '', /sola lettura/);
  assert.equal(capabilityDeniedMessage(403, { code: 'patient_scope' }), null);
  assert.equal(capabilityDeniedMessage(500, { code: 'capability_denied' }), null);
});
