import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { creaRouterDocumentoFarmaco } from '../farmaci-documento.js';
import { ErroreDocumentoAifa } from '../../services/farmaci/documento.js';

test('public PDF route returns inline bytes, validates queries and bounds requests', async () => {
  const app = express();
  let calls = 0;
  app.use('/farmaci/documento', creaRouterDocumentoFarmaco(async (ref) => {
    calls++;
    if (ref.farmaco === '404') throw new ErroreDocumentoAifa(404, 'Documento non disponibile su AIFA.');
    return Buffer.from('%PDF-1.7\nreference');
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}/farmaci/documento`;
  try {
    const response = await fetch(`${base}?organizzazione=219&farmaco=12745&tipo=RCP`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type')!, /^application\/pdf/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-disposition')!, /^inline;/);
    assert.equal(await response.text(), '%PDF-1.7\nreference');
    for (const query of ['', '?url=http://127.0.0.1', '?organizzazione=219&farmaco=12745&tipo=RCP&tipo=FI']) {
      assert.equal((await fetch(base + query)).status, 400);
    }
    assert.equal(calls, 1, 'invalid requests must not contact AIFA');
    assert.equal((await fetch(`${base}?organizzazione=219&farmaco=404&tipo=FI`)).status, 404);
    let blocked: Response | undefined;
    for (let i = 0; i < 21; i++) {
      const candidate = await fetch(base);
      if (candidate.status === 429) { blocked = candidate; break; }
    }
    assert.ok(blocked);
    assert.ok(blocked.headers.get('retry-after'));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
