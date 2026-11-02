import test from 'node:test';
import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Login } from '../Login';
import type { AuthAvailability } from '../../lib/authAvailability';
Object.assign(globalThis, { React });

function markup(availability: AuthAvailability, extra = {}) {
  return renderToStaticMarkup(
    createElement(Login, {
      availability,
      authMode: null,
      onRetryAuth() {},
      onLogin() {},
      ...extra,
    }),
  );
}

test('unverified and disabled login states never render generic role cards or demo promises', () => {
  for (const availability of ['checking', 'unavailable', 'disabled', 'expired'] as const) {
    const html = markup(availability, { simulator: true, demoMode: true, onSimulatorLogin() {} });
    assert.doesNotMatch(
      html,
      /login-role-card|login-sim__item|nessuna credenziale richiesta|login-demo-warning/,
    );
    assert.match(html, /Nessun accesso effettuato/);
    assert.equal(html.includes('Ricontrolla accesso'), availability !== 'checking');
  }
  assert.match(markup('expired'), /Accesso demo scaduto/);
  assert.match(markup('disabled'), /servizio di autenticazione non è abilitato/);
});

test('only confirmed demo shows generic demo cards; Entra preserves account-login wording', () => {
  const demo = markup('ready', { authMode: 'demo' });
  assert.equal((demo.match(/class="login-role-card /g) ?? []).length, 2);
  assert.match(demo, /Accesso dimostrativo/);
  const entra = markup('ready', { authMode: 'entra' });
  assert.equal((entra.match(/class="login-role-card /g) ?? []).length, 2);
  assert.match(entra, /Accesso con account della struttura/);
  assert.doesNotMatch(entra, /nessuna credenziale richiesta/);
});

test('confirmed simulator keeps the server profile picker and pending login disables cards', () => {
  const sim = markup('ready', { simulator: true, authMode: 'demo', onSimulatorLogin() {} });
  assert.match(sim, /Scegli il profilo|Caricamento profili/);
  assert.doesNotMatch(sim, /login-role-card/);
  const pending = markup('ready', { loading: true, authMode: 'demo' });
  assert.equal((pending.match(/ disabled=""/g) ?? []).length, 2);
});
