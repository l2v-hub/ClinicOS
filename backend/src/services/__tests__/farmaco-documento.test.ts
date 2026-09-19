import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaLettoreDocumentoAifa, riferimentoDocumentoAifa } from '../farmaci/documento.js';

const ref = { organizzazione: '219', farmaco: '12745', tipo: 'RCP' as const };
const pdf = Buffer.from('%PDF-1.7\npublic product document');
const fake = (response: () => Response) => (async () => response()) as typeof fetch;

test('only numeric official identifiers and RCP/FI are accepted; URL injection is rejected', () => {
  assert.deepEqual(riferimentoDocumentoAifa(ref), ref);
  for (const input of [
    { ...ref, url: 'http://127.0.0.1' }, { ...ref, farmaco: '../private' },
    { ...ref, organizzazione: ['219'] }, { ...ref, organizzazione: '0' },
    { ...ref, farmaco: '1'.repeat(10) }, { ...ref, tipo: 'HTML' },
    { ...ref, farmaco: '219?url=http://169.254.169.254' },
  ]) assert.throws(() => riferimentoDocumentoAifa(input), { status: 400 });
});

test('RCP and FI fetch exact fixed origin, omit credentials, reject redirects and retain PDF bytes', async () => {
  const calls: Array<{ url: string; options?: RequestInit }> = [];
  const read = creaLettoreDocumentoAifa({ fetchImpl: (async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(pdf, { headers: { 'Content-Type': 'application/octet-stream' } });
  }) as typeof fetch });
  for (const tipo of ['RCP', 'FI'] as const) {
    assert.deepEqual(await read({ ...ref, tipo }), pdf);
    const call = calls.at(-1)!;
    assert.equal(call.url, `https://api.aifa.gov.it/aifa-bdf-eif-be/1.0.0/organizzazione/219/farmaci/12745/stampati?ts=${tipo}`);
    assert.equal(call.options?.redirect, 'error');
    assert.equal(call.options?.credentials, 'omit');
    assert.deepEqual(call.options?.headers, { Accept: 'application/pdf, application/octet-stream' });
  }
  assert.equal(calls.length, 2, 'no stale or persistent document cache');
});

test('upstream errors, redirects and HTML responses cannot become PDF previews', async () => {
  for (const [response, status] of [
    [() => new Response('not found', { status: 404 }), 404],
    [() => new Response('unavailable', { status: 503 }), 502],
    [() => new Response('', { status: 302, headers: { Location: 'http://127.0.0.1' } }), 502],
    [() => new Response('<html>blocked</html>'), 502],
    [() => new Response(''), 502],
  ] as const) {
    await assert.rejects(creaLettoreDocumentoAifa({ fetchImpl: fake(response) })(ref), { status });
  }
});

test('byte limit is enforced with and without content-length', async () => {
  for (const response of [
    () => new Response(pdf, { headers: { 'Content-Length': '900' } }),
    () => new Response(new ReadableStream({ start(controller) {
      controller.enqueue(pdf.subarray(0, 8));
      controller.enqueue(pdf.subarray(8));
      controller.close();
    } })),
  ]) await assert.rejects(creaLettoreDocumentoAifa({ fetchImpl: fake(response), maxBytes: 10 })(ref), { status: 502 });
});

test('timeout and caller cancellation terminate upstream work', async () => {
  const fetchImpl = (async (_url: unknown, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true });
  })) as typeof fetch;
  await assert.rejects(creaLettoreDocumentoAifa({ fetchImpl, timeoutMs: 10 })(ref), { status: 504 });
  const controller = new AbortController();
  const result = creaLettoreDocumentoAifa({ fetchImpl })(ref, controller.signal);
  controller.abort(new Error('closed'));
  await assert.rejects(result, /closed/);
});

test('concurrency limit rejects excess work and releases capacity after completion', async () => {
  let complete: (response: Response) => void = () => undefined;
  let calls = 0;
  const read = creaLettoreDocumentoAifa({ maxConcurrent: 1, fetchImpl: (async () => {
    calls++;
    return new Promise<Response>((resolve) => { complete = resolve; });
  }) as typeof fetch });
  const first = read(ref);
  await assert.rejects(read(ref), { status: 503 });
  assert.equal(calls, 1);
  complete(new Response(pdf));
  await first;
  const next = read(ref);
  complete(new Response(pdf));
  assert.deepEqual(await next, pdf);
  assert.equal(calls, 2);
});
