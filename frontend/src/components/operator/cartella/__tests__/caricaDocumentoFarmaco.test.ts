import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caricaDocumentoFarmaco, endpointDocumentoFarmaco, ErroreCaricamentoDocumento } from '../caricaDocumentoFarmaco.js';

const href = 'https://api.aifa.gov.it/aifa-bdf-eif-be/1.0.0/organizzazione/219/farmaci/12745/stampati?ts=RCP';
const doc = { href, tipo: 'rcp' as const, denominazione: 'TACHIPIRINA' };
const api = 'https://backend.example';

test('catalog references become backend IDs only, including FI, without patient context', () => {
  assert.equal(endpointDocumentoFarmaco(doc, api), `${api}/farmaci/documento?organizzazione=219&farmaco=12745&tipo=RCP`);
  assert.equal(endpointDocumentoFarmaco({ ...doc, href: href.replace('RCP', 'FI'), tipo: 'fi' }, api), `${api}/farmaci/documento?organizzazione=219&farmaco=12745&tipo=FI`);
  for (const invalid of [
    'invalid', href.replace('https:', 'http:'), href.replace('api.aifa.gov.it', 'example.com'),
    href + '&patient=private', href + '#fragment', href.replace('/219/', '/../'),
    href.replace('RCP', 'FI'), href.replace('https://', 'https://user:password@'),
  ]) assert.throws(() => endpointDocumentoFarmaco({ ...doc, href: invalid }, api), ErroreCaricamentoDocumento);
});

test('retrieves PDF through backend with cancellation and no credentials', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, endpointDocumentoFarmaco(doc, api));
    assert.equal(options.signal, controller.signal);
    assert.equal(options.credentials, 'omit');
    return new Response('%PDF-1.7');
  });
  assert.equal(new TextDecoder().decode(await caricaDocumentoFarmaco(doc, api, controller.signal)), '%PDF-1.7');
});

test('source failures provide a retry message without asserting the PDF exists or reflecting raw errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('private upstream detail', { status: 502 }));
  await assert.rejects(caricaDocumentoFarmaco(doc, api, new AbortController().signal), (error: Error) => {
    assert.ok(error instanceof ErroreCaricamentoDocumento);
    assert.match(error.message, /Riprova/);
    assert.doesNotMatch(error.message, /private|esiste/);
    return true;
  });
});
