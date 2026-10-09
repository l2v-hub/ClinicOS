import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire('C:/w-insulin-qa/package.json');
const { chromium, expect } = require('playwright/test');
const out = resolve(process.argv[2] || 'artifacts/task-validation/411-patient-regimes/root-initial/browser');
for (const dir of ['screenshots', 'test-results', 'video', 'playwright-report']) mkdirSync(`${out}/${dir}`, { recursive: true });
const outcomes = [], states = [], contexts = [];
const browser = await chromium.launch({ headless: true });
const identities = [
  { id: 'QA-NURSE-411', name: 'Infermiere Sintetico', roleLabel: 'Infermiere', appRole: 'nurse', uiShell: 'operator' },
  { id: 'QA-DOCTOR-411', name: 'Medico Sintetico', roleLabel: 'Medico', appRole: 'doctor', uiShell: 'operator' },
];
const names = ['Ricoverato', 'Day Hospital', 'Ambulatoriale', 'Dimesso', 'Senza regime', 'Riepilogo assente', 'Regime storico', 'Day Hospital secondo'];
const regimes = ['ricoverato', 'day_hospital', 'ambulatoriale', 'dimesso', null, undefined, 'legacy', 'day_hospital'];
const patients = names.map((name, i) => ({ id: `QA-PATIENT-411-${i}`, medicalRecordNumber: `QA-411-${i}`, firstName: 'Persona', lastName: `Sintetica ${name}`, dateOfBirth: '1980-01-01', codiceFiscale: null, sex: i % 2 ? 'F' : 'M', phone: null, email: null,
  location: { status: 'unassigned', source: null, room: null, bed: null, asOf: '2026-10-09' } }));
function summary(p) {
  const i = patients.findIndex(item => item.id === p.id);
  return { patientId: p.id, statoRicovero: regimes[i], consegneAperte: 0, parametriCritici: [], rischiElevati: [], allergeni: [], hasCriticalVitals: i === 1, hasHighRisk: false, allergieCount: 0, hasSevereAllergy: false, terapieTotali: 0, terapieCompletate: 0 };
}
async function contextFor({ mobile = false, denied = false, failSummary = false, holdSummary = false, doctor = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1150, height: 1004 }, recordVideo: { dir: `${out}/video` } });
  contexts.push(context); await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const state = { mobile, denied, failSummary, holdSummary, held: false, role: doctor ? 'doctor' : 'nurse', requests: [], writes: [], unexpected: [], external: [], errors: [], pageErrors: [], httpErrors: [] };
  states.push(state);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { state.external.push(url.origin); return route.abort(); }
    if (url.port !== '3001') return route.continue();
    state.requests.push({ method: req.method(), path, query: url.search });
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/status') return json({ mode: 'disabled', temporaryDemo: false, simulator: true });
    if (path === '/auth/simulator/identities') return json({ identities });
    if (path === '/auth/simulator/session' && req.method() === 'POST') { state.role = req.postDataJSON().identityId === identities[1].id ? 'doctor' : 'nurse'; return json({ token: `synthetic411-${state.role}-not-a-secret` }); }
    if (path === '/auth/simulator/logout' && req.method() === 'POST') return json({ ok: true });
    const readonlySearch = req.method() === 'POST' && path === '/patients/page/search';
    if (req.method() !== 'GET' && !readonlySearch) { state.writes.push({ method: req.method(), path }); return json({ error: 'Domain write forbidden' }, 500); }
    if (path === '/auth/me') {
      const capabilities = Object.fromEntries(['patients.list_page', 'patients.get', 'patients.clinical_summary', 'patients.clinical_overview', 'appointments.list', 'consegne.list', 'notes.list', 'operators.directory', 'administration.list_slots', 'therapy.list', 'therapy.list_page', 'clinical_record.get', 'diary.list', 'parameters.list_readings'].map(key => [key, { allowed: true, effect: 'ALLOWED' }]));
      capabilities['intake.create_draft'] = { allowed: false, effect: 'DENIED' };
      if (state.denied) capabilities['patients.clinical_summary'] = { allowed: false, effect: 'DENIED' };
      const identity = state.role === 'doctor' ? identities[1] : identities[0];
      return json({ ...identity, role: 'operatore', authMode: 'disabled', temporaryDemo: false, capabilities });
    }
    if (path === '/me/roster-order') return json({ context: null, default: null, override: null, effective: { criterion: 'name', direction: 'asc' }, source: 'system', revision: null, canEdit: false, canEditDefault: false, temporary: false, reason: null });
    if (path === '/patients/page' || readonlySearch) {
      const body = readonlySearch ? req.postDataJSON() : {};
      const query = (body.q || url.searchParams.get('q') || url.searchParams.get('search') || '').toLowerCase();
      const sex = body.sex || url.searchParams.get('sex');
      const base = patients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) && (!sex || sex === 'tutti' || p.sex === sex));
      const start = url.searchParams.has('cursor') ? 4 : 0;
      return json({ items: base.slice(start, start + 4), hasMore: base.length > start + 4, nextCursor: base.length > start + 4 ? 'synthetic-next-411' : null });
    }
    if (path === '/patients/clinical-summary') {
      if (state.holdSummary) { state.held = true; await new Promise(resolve => { state.release = resolve; }); state.holdSummary = false; state.held = false; }
      if (state.failSummary) return json({ error: 'Synthetic summary unavailable' }, 503);
      const ids = (url.searchParams.get('patientIds') || '').split(',');
      return json(patients.filter(p => ids.includes(p.id) && p.id !== patients[5].id).map(summary));
    }
    if (path === '/patients/clinical-summary/overview') return json({ totalPatients: 8, critici: 1, rischiAlti: 0, ricoverati: 1, dimessi: 1, allergieGravi: 0, terapieTotali: 0, terapieCompletate: 0 });
    if (path === '/patients/settings') return json({ deleteEnabled: false });
    for (const p of patients) {
      if (path === `/patients/${p.id}`) return json(p);
      if (path === `/patients/${p.id}/cartella`) return json({ patientId: p.id, data: { pazienteId: p.id, statoRicovero: summary(p).statoRicovero } });
    }
    if (path === '/patients/diary-unread-count') return json({ unreadCount: 0 });
    if (path === '/patients/parameters/page') return json({ items: [], hasMore: false, nextCursor: null });
    if (/\/parameter-readings$/.test(path)) return json({ readings: [], hasMore: false, nextCursor: null });
    if (['/therapy-slots', '/appointments'].includes(path)) return json([]);
    if (path === '/consegne/overview') return json({ scope: 'operator', summary: { total: 0, urgentActive: 0, urgentTaken: 0 }, recentPreview: [], urgentPreview: [], byOperator: {} });
    if (path === '/notes') return json({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: { unread: 0 } });
    if (path === '/operators/directory/page') return json({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: null });
    state.unexpected.push(`${req.method()} ${path}`); return json({ error: 'Unexpected guarded API' }, 500);
  });
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') state.errors.push(message.text()); });
  page.on('pageerror', error => state.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) state.httpErrors.push({ status: response.status(), path: new URL(response.url()).pathname }); });
  return { context, page, state };
}
async function sidebar(ctx, name) {
  if (ctx.state.mobile) await ctx.page.getByRole('button', { name: 'Apri menu' }).click();
  await ctx.page.locator('.teams-sidebar').getByRole('button', { name, exact: true }).click();
}
async function login(ctx) {
  await ctx.page.goto('http://127.0.0.1:7474/#/operator-dashboard');
  await ctx.page.getByRole('button', { name: ctx.state.role === 'doctor' ? /Medico Sintetico/ : /Infermiere Sintetico/ }).click();
  await expect(ctx.page.getByRole('heading', { name: 'Il mio turno' })).toBeVisible();
}
const views = page => page.getByRole('group', { name: 'Vista dei pazienti caricati' });
const view = (page, label) => views(page).getByRole('button', { name: new RegExp(`^${label}`) });
const rows = page => page.locator('.patient-roster tbody .patient-roster__row');
const control = page => page.getByRole('combobox', { name: 'Regime registrato' });
async function check(name, fn) { await fn(); outcomes.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
async function finish(ctx, name) {
  for (const key of ['writes', 'unexpected', 'external', 'pageErrors']) expect(ctx.state[key], key).toEqual([]);
  expect(ctx.state.httpErrors.every(error => error.status === 503 && error.path === '/patients/clinical-summary')).toBe(true);
  expect(ctx.state.errors.filter(error => !/Failed to load resource.*503/.test(error))).toEqual([]);
  await ctx.context.tracing.stop({ path: `${out}/${name}-trace.zip` });
  const video = ctx.page.video(); await ctx.context.close(); await video.saveAs(`${out}/video/${name}.webm`); await video.delete();
}
try {
  const ctx = await contextFor(); await login(ctx); const { page } = ctx;
  await check('AC1 scoped dashboard global7 Non dimessi opens exact first-page broad predicate3', async () => {
    const kpi = page.locator('[data-kpi-id="ricoverati"]');
    await expect(kpi).toContainText('Non dimessi'); await expect(kpi.locator('.dashboard-kpi-card__value')).toHaveText('7');
    await expect(kpi).toContainText('nel tuo perimetro'); await expect(page.getByText(/7 pazienti non dimessi/)).toBeVisible();
    await page.screenshot({ path: `${out}/screenshots/dashboard-non-dimessi7.png` }); await kpi.click();
    await expect(rows(page)).toHaveCount(3); await expect(view(page, 'Non dimessi')).toContainText('3');
    await expect(page.getByText(/3 visualizzati su 4 pazienti caricati/)).toBeVisible();
    await expect(page.getByText(/senza dimissione registrata, inclusi Day Hospital/)).toBeVisible();
    await page.screenshot({ path: `${out}/screenshots/desktop-broad3-loaded4.png` });
  });
  await check('AC2 exact Day Hospital and Ambulatoriale filters/labels/counts, native keyboard', async () => {
    await control(page).focus(); await expect(control(page)).toBeFocused();
    await control(page).selectOption('day_hospital'); await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText('Day Hospital'); await expect(view(page, 'Non dimessi')).toContainText('1');
    await page.screenshot({ path: `${out}/screenshots/desktop-day-hospital1.png` });
    await control(page).selectOption('ambulatoriale'); await expect(rows(page)).toHaveCount(1); await expect(rows(page)).toContainText('Ambulatoriale');
    await expect(view(page, 'Non dimessi')).toContainText('1');
  });
  await check('AC2/4 empty explicit intersection retains load-more and explains loaded pages', async () => {
    await view(page, 'Dimessi e archivio').click(); await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText(/0 visualizzati su 4 pazienti caricati/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Carica altri pazienti' })).toBeVisible();
    await expect(page.getByText(/Altri pazienti non ancora caricati/)).toBeVisible();
  });
  await check('AC4 search removes stale regime exclusion, reaches discharged, clearing restores view', async () => {
    await view(page, 'Non dimessi').click(); await control(page).selectOption('ricoverato');
    await page.getByRole('searchbox').fill('Dimesso'); await expect(control(page)).toHaveValue('tutti');
    await expect(view(page, 'Tutti')).toHaveAttribute('aria-pressed', 'true'); await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText('Dimesso'); await page.getByRole('button', { name: 'Cancella', exact: true }).click();
    await expect(view(page, 'Non dimessi')).toHaveAttribute('aria-pressed', 'true'); await expect(rows(page)).toHaveCount(3);
  });
  await check('AC3/4 later page includes missing/null/legacy distinctly, never fabricated state count', async () => {
    await page.getByRole('button', { name: 'Carica altri pazienti' }).click(); await expect(rows(page)).toHaveCount(7);
    await expect(page.getByText(/7 visualizzati su 8 pazienti caricati/)).toBeVisible();
    await expect(view(page, 'Non dimessi').locator('.ds-chip__count')).toHaveCount(0);
    await expect(page.getByText('Conteggi per stato non disponibili.', { exact: false })).toBeVisible();
    await control(page).selectOption('non_disponibile'); await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).locator('td:nth-child(2)')).toHaveText(['Non disponibile', 'Non disponibile', 'Non disponibile']);
    await expect(page.getByText(/3 visualizzati su 8 pazienti caricati/)).toBeVisible();
    await page.screenshot({ path: `${out}/screenshots/desktop-unavailable3-loaded8.png` });
    await control(page).selectOption('ricoverato'); await expect(rows(page)).toHaveCount(1);
    await control(page).selectOption('day_hospital'); await expect(rows(page)).toHaveCount(2); await expect(view(page, 'Non dimessi')).toContainText('2');
  });
  await check('AC1/4 KPI entry resets stale regime; signal contextual counts agree with rows', async () => {
    await sidebar(ctx, 'Turno'); await page.locator('[data-kpi-id="ricoverati"]').click();
    await expect(control(page)).toHaveValue('tutti'); await expect(rows(page)).toHaveCount(3);
    await sidebar(ctx, 'Turno'); await page.locator('[data-kpi-id="parametri"]').click();
    await expect(rows(page)).toHaveCount(1); await expect(view(page, 'Non dimessi')).toContainText('1');
    await expect(page.locator('[data-list-signal="critici"]')).toContainText('1 fra i pazienti caricati');
  });
  await finish(ctx, 'desktop');
  const doctor = await contextFor({ doctor: true }); await login(doctor); await sidebar(doctor, 'Pazienti');
  await check('AC1/2 physician has same exact labels and strict outpatient filter after reload', async () => {
    await expect(rows(doctor.page)).toHaveCount(3); await control(doctor.page).selectOption('ambulatoriale');
    await expect(rows(doctor.page)).toHaveCount(1); await expect(rows(doctor.page)).toContainText('Ambulatoriale');
    await doctor.page.reload(); await doctor.page.getByRole('button', { name: /Medico Sintetico/ }).click(); await sidebar(doctor, 'Pazienti');
    await expect(control(doctor.page)).toHaveValue('tutti'); await expect(rows(doctor.page)).toHaveCount(3);
    await doctor.page.screenshot({ path: `${out}/screenshots/physician-default-non-dimessi.png` });
  }); await finish(doctor, 'physician');
  const fail = await contextFor({ failSummary: true }); await login(fail); await sidebar(fail, 'Pazienti');
  await check('AC3 unavailable enrichment retains4 identities, suppresses verified counts, retry recovers3', async () => {
    await expect(rows(fail.page)).toHaveCount(4); await expect(fail.page.getByRole('button', { name: 'Riprova segnalazioni' })).toBeVisible();
    await expect(view(fail.page, 'Non dimessi').locator('.ds-chip__count')).toHaveCount(0);
    await fail.page.screenshot({ path: `${out}/screenshots/failed-summary-identities-retained.png` });
    fail.state.failSummary = false; await fail.page.getByRole('button', { name: 'Riprova segnalazioni' }).click();
    await expect(rows(fail.page)).toHaveCount(3); await expect(view(fail.page, 'Non dimessi')).toContainText('3');
  }); await finish(fail, 'failed-summary');
  const pending = await contextFor({ holdSummary: true }); await login(pending); await sidebar(pending, 'Pazienti');
  await check('AC3 loading keeps identities and cannot certify missing regime/count', async () => {
    await expect.poll(() => pending.state.held).toBe(true); await expect(rows(pending.page)).toHaveCount(4);
    await expect(pending.page.getByText('Verifica regimi in corso.', { exact: false })).toBeVisible();
    await expect(view(pending.page, 'Non dimessi').locator('.ds-chip__count')).toHaveCount(0);
    pending.state.release(); await expect(rows(pending.page)).toHaveCount(3);
  }); await finish(pending, 'loading-summary');
  const denied = await contextFor({ denied: true }); await login(denied); await sidebar(denied, 'Pazienti');
  await check('AC3 capability-denied page enrichment makes no prohibited summary request', async () => {
    await expect(rows(denied.page)).toHaveCount(4); await expect(view(denied.page, 'Non dimessi').locator('.ds-chip__count')).toHaveCount(0);
    expect(denied.state.requests.filter(r => r.path === '/patients/clinical-summary')).toEqual([]);
    await expect(denied.page.getByText(/Conteggi per stato non disponibili/)).toBeVisible();
  }); await finish(denied, 'denied-summary');
  const mobile = await contextFor({ mobile: true }); await login(mobile); await sidebar(mobile, 'Pazienti');
  await check('AC2/3 mobile grayscale readable regime labels/control without horizontal overflow', async () => {
    const cdp = await mobile.context.newCDPSession(mobile.page); await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'achromatopsia' });
    await control(mobile.page).selectOption('day_hospital'); await expect(mobile.page.locator('.patient-card-grid .patient-card')).toHaveCount(1);
    await expect(mobile.page.locator('.patient-card-grid .stato-pill')).toHaveText('Day Hospital');
    expect(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mobile.page.screenshot({ path: `${out}/screenshots/mobile-grayscale-day-hospital.png`, fullPage: true });
    await control(mobile.page).selectOption('non_disponibile'); await mobile.page.getByRole('button', { name: 'Carica altri pazienti' }).click();
    await expect(mobile.page.locator('.patient-card-grid .patient-card')).toHaveCount(3);
    await expect(mobile.page.locator('.patient-card-grid')).toContainText('Regime non disponibile');
    await mobile.page.screenshot({ path: `${out}/screenshots/mobile-grayscale-unavailable.png`, fullPage: true }); await cdp.detach();
  }); await finish(mobile, 'mobile');
  writeFileSync(`${out}/test-results/browser-results.json`, JSON.stringify({ outcomes, states, actualSurface: 'Source-bound Vite SPA; fully guarded synthetic in-memory API. No domain mutations or production patient test writes. Mobile grayscale is emulation only.' }, null, 2));
  writeFileSync(`${out}/playwright-report/index.html`, '<!doctype html><meta charset="utf-8"><title>411 synthetic browser assertions</title><h1>Issue411 guarded actual SPA</h1><p>No real patient data; local synthetic transport; viewport emulation only.</p><ul>' + outcomes.map(o => `<li>${o.status}: ${o.name}</li>`).join('') + '</ul>');
} catch (error) {
  for (const [i, context] of contexts.entries()) { const p = context.pages()[0]; if (p) await p.screenshot({ path: `${out}/screenshots/failure-${i}.png` }).catch(() => {}); }
  writeFileSync(`${out}/test-results/failure.json`, JSON.stringify({ message: error.message, outcomes, states }, null, 2)); throw error;
} finally { for (const context of contexts) await context.close().catch(() => {}); await browser.close(); }
