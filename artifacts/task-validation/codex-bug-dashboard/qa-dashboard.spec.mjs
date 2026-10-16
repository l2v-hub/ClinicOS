import { test, expect } from 'playwright/test';
import { writeFile } from 'node:fs/promises';

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40);
const fixtureFile = '/tmp/clinicos-dashboard-qa-followup-fixture.json';
const ids = [900017, 900018];
const issue = (number, labels = []) => ({ number, labels, title: '<script>throw new Error("unsafe")</script>', body: 'PRIVATE_SYNTHETIC_PAYLOAD' });
function plan(numbers) {
  const n = Math.min(...numbers);
  return { title: 'Synthetic regression', feature: 'Dashboard fixture', rationale: 'Synthetic QA only', analysis: 'Synthetic QA only', execution: { difficulty: 'low', mode: 'direct', reason: 'Synthetic fixture' }, issues: numbers, scope: ['frontend/src/synthetic.ts'], acceptance: numbers.map(issue => ({ issue, criteria: ['Synthetic fixed result'] })), tasks: [{ title: 'Synthetic', files: ['frontend/src/synthetic.ts'], steps: ['Assert synthetic result'] }], verification: [{ command: 'node', args: ['--test', 'synthetic.test.mjs'] }, { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] }], evidence: numbers.map(issue => ({ issue, screenshot: `artifacts/task-validation/bug-batch-${n}/evidence/${issue}.png`, trace: `artifacts/task-validation/bug-batch-${n}/evidence/${issue}.zip`, video: '' })) };
}
function batch(numbers, phase) {
  const n = Math.min(...numbers);
  return { id: `bug-batch-${n}`, branch: `codex/bug-batch-${n}`, issues: numbers, plan: plan(numbers), phase, implementation: [{ round: 1, status: phase === 'blocked' ? 'failed' : 'passed' }], reviews: [], sha, pr: { number: 900081, url: `https://github.com/${repo}/pull/900081` } };
}
function fixture() {
  return { state: { schemaVersion: 1, repository: repo, batches: [], updatedAt: '2026-10-16T20:00:00.000Z', setupReview471: { ledger: { rounds: [{ round: 1, subject_sha: sha, verdict: 'failed' }] } } }, issues: [issue(900017), issue(900018), issue(900019), issue(900020), issue(900021, ['ready-for-qa']), issue(900022)], queue: [900017, 900018, 900019], setup: { merged: false, head: sha, check: { status: 'completed', conclusion: 'success' } } };
}
const save = value => writeFile(fixtureFile, JSON.stringify(value));
function observe(page) {
  const errors = [], failures = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  return () => { expect(errors).toEqual([]); expect(failures).toEqual([]); };
}
const row = (page, id) => page.locator('#issues tr').filter({ has: page.getByRole('link', { name: `#${id}`, exact: true }) });

test('actual dashboard renders synthetic queue, durable phases, resolved state and refresh failure without leaking source payloads', async ({ page }) => {
  const verifyNoErrors = observe(page);
  const value = fixture(); await save(value);
  await page.clock.install();
  expect((await page.goto('http://127.0.0.1:4399/')).ok()).toBe(true);
  await expect(page.locator('#queued')).toHaveText('3');
  await expect(page.locator('#processing')).toHaveText('0');
  await expect(page.locator('#setup-rounds')).toHaveText('Review utilizzate: 1/4');
  await expect(row(page, 900021)).toContainText('Gestita da altro flusso');
  await expect(row(page, 900022)).toContainText('In attesa di avvio');
  expect(await page.locator('body').innerText()).not.toContain('PRIVATE_SYNTHETIC_PAYLOAD');
  expect(await page.locator('body').innerText()).not.toContain('<script>');
  value.state.pendingTriage = { issues: ids, status: 'claiming' }; await save(value);
  await page.clock.fastForward(15000);
  await expect(page.locator('#processing')).toHaveText('2');
  await expect(row(page, 900017)).toContainText('Triage e accorpamento');
  delete value.state.pendingTriage;
  const active = batch(ids, 'implementing'); value.state.batches = [active, batch([900020], 'blocked')]; await save(value);
  await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(row(page, 900017)).toContainText('Implementazione');
  await expect(page.locator('#queued')).toHaveText('1'); await expect(page.locator('#blocked')).toHaveText('1');
  active.phase = 'validating'; await save(value); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(row(page, 900018)).toContainText('Test, evidenze e QA');
  active.phase = 'waiting-review'; active.externalReview = { status: 'requested', subjectSha: sha }; value.setup.head = 'b'.repeat(40); value.setup.draft = false;
  await save(value); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(row(page, 900018)).toContainText('Ready for review · attesa cron Claude');
  await expect(page.locator('#setup-phase')).toHaveText('Ready for review · attesa cron Claude');
  active.phase = 'reviewing'; active.reviews = [{ round: 1, status: 'running' }]; await save(value); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(row(page, 900017)).toContainText('Review Claude');
  active.reviews[0].status = 'approved'; active.phase = 'ready'; active.release = { status: 'merged', reviewedSha: sha, mergeSha: 'b'.repeat(40) }; await save(value); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(row(page, 900017)).toContainText('Deploy in corso'); await expect(page.locator('#resolved')).toHaveText('0');
  active.release.status = 'deployed'; active.release.deployment = { status: 'deployed', completedAt: '2026-10-16T21:00:00.000Z' }; await save(value); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(page.locator('#resolved')).toHaveText('2'); await expect(row(page, 900018)).toContainText('Rilascio confermato');
  await save({ fail: true }); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('alert')).toContainText('Stato precedente non confermato'); await expect(page.locator('#resolved')).toHaveText('2');
  await page.reload(); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('#resolved')).toHaveText('2');
  await page.screenshot({ path: new URL('stale-result.png', import.meta.url).pathname, fullPage: true });
  await save(value); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await expect(page.getByRole('alert')).toBeHidden(); await expect(page.locator('#resolved')).toHaveText('2'); await expect(page.locator('#processing')).toHaveText('0');
  await expect(row(page, 900020)).toContainText('Bloccato'); await expect(page.locator('#updated')).toContainText('Ultima lettura GitHub:');
  verifyNoErrors();
  await page.screenshot({ path: new URL('result.png', import.meta.url).pathname, fullPage: true });
});

test('actual live read-only dashboard matches its current GitHub snapshot and survives reload', async ({ page, request }) => {
  const verifyNoErrors = observe(page);
  const api = await request.get('http://127.0.0.1:4317/api/status'); expect(api.ok()).toBe(true);
  const data = await api.json(); expect(data.ok).toBe(true);
  expect((await page.goto('http://127.0.0.1:4317/')).ok()).toBe(true);
  for (const key of ['queued', 'processing', 'blocked', 'resolved']) await expect(page.locator(`#${key}`)).toHaveText(String(data.snapshot.counts[key]));
  await expect(page.locator('#setup-rounds')).toHaveText(`Review utilizzate: ${data.snapshot.setup.reviews}/4`);
  await expect(page.locator('#issues tr')).toHaveCount(data.snapshot.rows.length);
  for (const value of data.snapshot.rows) await expect(row(page, value.number)).toContainText(value.phase);
  await page.reload(); await expect(page.locator('#issues tr')).toHaveCount(data.snapshot.rows.length);
  await expect(page.locator('#setup-phase')).toHaveText(data.snapshot.setup.phase); await expect(page.getByRole('alert')).toBeHidden();
  verifyNoErrors();
  await page.screenshot({ path: new URL('live-result.png', import.meta.url).pathname, fullPage: true });
});
