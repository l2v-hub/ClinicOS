import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire('C:/w-insulin-qa/package.json');
const { chromium, expect: baseExpect } = require('playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const out = resolve(process.argv[2] || 'artifacts/task-validation/424-reading-action/root-initial/browser');
for (const dir of ['screenshots', 'test-results', 'video']) mkdirSync(`${out}/${dir}`, { recursive: true });
const outcomes = [], states = [], contexts = [];
const before = process.env.BEFORE === '1';
const action = before ? /Segna come letto/ : /Conferma lettura/;
const browser = await chromium.launch({ headless: true });
const identities = [
  { id: 'QA-NURSE-409', name: 'Infermiere Sintetico', roleLabel: 'Infermiere', appRole: 'nurse', uiShell: 'operator' },
  { id: 'QA-DOCTOR-424', name: 'Medico Lettore Sintetico', roleLabel: 'Medico', appRole: 'doctor', uiShell: 'operator' },
  { id: 'QA-ADMIN-409', name: 'Amministratore Sintetico', roleLabel: 'Amministratore', appRole: 'administrator', uiShell: 'admin' },
];
const patient = index => ({ id: `QA-PATIENT-409-${index}`, medicalRecordNumber: `QA-409-${index}`, firstName: 'Persona', lastName: index ? 'Sintetica fuori pagina' : 'Sintetica', dateOfBirth: '1980-01-01', codiceFiscale: null, sex: 'M', phone: null, email: null,
  location: { status: 'unassigned', source: null, room: null, bed: null, asOf: '2026-10-09' } });
const patients = [patient(0), patient(1)];
const receipt = { state: 'unread', readBy: null, isAuthor: false, canAcknowledge: true };
const none = { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false };
function fixtures() {
  return Array.from({ length: 53 }, (_, i) => {
    const sourceType = i % 2 ? 'consegna' : 'diary', sourceId = i === 0 ? 'zz-urgent' : `d-${String(i).padStart(3, '0')}`;
    const p = patients[i % 2];
    return { id: sourceType === 'consegna' ? `consegna:${sourceId}` : sourceId, patientId: p.id, sourceId, sourceType, identity: { id: p.id, firstName: p.firstName, lastName: p.lastName, codiceFiscale: p.codiceFiscale, dateOfBirth: p.dateOfBirth, location: p.location },
      entryDateTime: '2026-10-06T09:00', authorType: 'medico', authorName: 'Medico Sintetico', title: `Nota sintetica ${i}`, content: 'Dati inventati per verificare la coda. Nessuna informazione di un paziente reale.', priority: i === 0 ? 'urgente' : i % 3 ? 'normale' : 'importante', status: 'aperta', category: null,
      readReceipt: { ...receipt }, urgency: i === 0 ? { state: 'active', takenBy: null, isAuthor: false, canAcknowledge: true } : { ...none } };
  }).sort((a, b) => a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}
async function contextFor(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1150, height: 1004 }, recordVideo: { dir: `${out}/video` } }); contexts.push(context);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const state = { mobile, rows: fixtures(), requests: [], clinicalWrites: [], allowedSyntheticReceipts: [], unexpected: [], external: [], errors: [], pageErrors: [], httpErrors: [], failNext: false, countError: false, role: 'nurse' }; states.push(state);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { state.external.push(url.origin); return route.abort(); }
    if (url.port !== '3001') return route.continue();
    state.requests.push({ method: req.method(), path, query: url.search });
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const unread = state.rows.filter(row => row.readReceipt.state === 'unread');
    if (path === '/auth/status') return json({ mode: 'disabled', temporaryDemo: false, simulator: true });
    if (path === '/auth/simulator/identities') return json({ identities });
    if (path === '/auth/simulator/session' && req.method() === 'POST') { state.role = req.postDataJSON().identityId === identities[2].id ? 'administrator' : req.postDataJSON().identityId === identities[1].id ? 'doctor' : 'nurse'; return json({ token: `synthetic409-${state.role}-not-a-secret` }); }
    if (path === '/auth/simulator/logout' && req.method() === 'POST') return json({ ok: true });
    const ack = /\/ack$/.test(path) && req.method() === 'POST';
    if (ack) {
      const row = state.rows.find(row => path === (row.sourceType === 'consegna' ? `/consegne/${row.sourceId}/ack` : `/patients/${row.patientId}/diary/${row.sourceId}/ack`));
      if (!row) { state.unexpected.push(`ACK ${path}`); return json({ error: 'Unknown synthetic note' }, 500); }
      const purpose = req.postDataJSON()?.purpose ?? 'urgency'; state.allowedSyntheticReceipts.push({ path, purpose });
      if (state.failNext) { state.failNext = false; return json({ error: 'Synthetic failure' }, state.failStatus || 503); }
      if (state.invalidNext) { state.invalidNext = false; return json({}); }
      if (state.delayNext) {
        state.delayNext = false; state.ackHeld = true;
        await new Promise(resolve => { state.releaseAck = resolve; }); state.ackHeld = false;
      }
      const readBy = { operatorName: state.role === 'doctor' ? 'Medico Lettore Sintetico' : 'Infermiere Sintetico', operatorRole: state.role === 'doctor' ? 'medico' : 'infermiere', acknowledgedAt: '2026-10-09T07:00:00.000Z', byMe: true };
      row.readReceipt = { state: 'read', readBy, isAuthor: false, canAcknowledge: false };
      if (purpose === 'urgency') row.urgency = { state: 'taken', takenBy: readBy, isAuthor: false, canAcknowledge: false };
      return json({ created: true, readReceipt: row.readReceipt, urgency: row.urgency }, 201);
    }
    if (req.method() !== 'GET') { state.clinicalWrites.push({ method: req.method(), path }); return json({ error: 'Clinical write forbidden' }, 500); }
    if (path === '/auth/me') {
      const capabilities = Object.fromEntries(['patients.list_page', 'patients.get', 'patients.clinical_summary', 'patients.clinical_overview', 'appointments.list', 'consegne.list', 'notes.list', 'operators.directory', 'administration.list_slots', 'therapy.list', 'therapy.list_page', 'clinical_record.get', 'diary.list', 'consegne.create'].map(key => [key, { allowed: true, effect: 'ALLOWED' }]));
      capabilities['intake.create_draft'] = { allowed: false, effect: 'DENIED' };
      if (state.role === 'administrator') capabilities['diary.list'] = { allowed: false, effect: 'DENIED' };
      const identity = state.role === 'administrator' ? identities[2] : state.role === 'doctor' ? identities[1] : identities[0];
      return json({ ...identity, role: state.role === 'administrator' ? 'admin' : 'operatore', authMode: 'disabled', temporaryDemo: false, capabilities });
    }
    if (path === '/patients/diary-unread-count') return json({ unreadCount: unread.length });
    if (path === '/patients/diary-unread') {
      const after = url.searchParams.get('cursor'), start = after ? unread.findIndex(row => row.id === after) + 1 : 0;
      const entries = unread.slice(start, start + 20), hasMore = start + 20 < unread.length;
      return json({ entries, totalUnread: unread.length, filteredUnread: unread.length, hasMore, nextCursor: hasMore ? entries.at(-1).id : null,
        patientCounts: [...new Set(entries.map(row => row.patientId))].map(patientId => ({ patientId, total: unread.filter(row => row.patientId === patientId).length })) });
    }
    if (path === '/patients/diary-unread-patient-counts') {
      if (state.countError) return json({ error: 'Synthetic count unavailable' }, 503);
      return json({ items: (url.searchParams.get('patientIds') || '').split(',').map(patientId => ({ patientId, total: unread.filter(row => row.patientId === patientId).length })) });
    }
    if (path === '/me/roster-order') return json({ context: null, default: null, override: null, effective: { criterion: 'name', direction: 'asc' }, source: 'system', revision: null, canEdit: false, canEditDefault: false, temporary: false, reason: null });
    if (path === '/patients/page') return json({ items: [patients[0]], hasMore: true, nextCursor: 'next-patients' });
    for (const p of patients) {
      if (path === `/patients/${p.id}`) return json(p);
      if (path === `/patients/${p.id}/diary`) return json({ entries: state.rows.filter(row => row.patientId === p.id), hasMore: false, nextCursor: null });
      if (path === `/patients/${p.id}/cartella`) return json({ patientId: p.id, data: { pazienteId: p.id, statoRicovero: 'ricoverato' } });
    }
    if (path === '/patients/parameters/page') return json({ items: [], hasMore: false, nextCursor: null });
    if (path === '/patients/clinical-summary') return json(patients.map(p => ({ patientId: p.id, statoRicovero: 'ricoverato', consegneAperte: 0, parametriCritici: [], rischiElevati: [], allergeni: [], hasCriticalVitals: false, hasHighRisk: false, allergieCount: 0, hasSevereAllergy: false, terapieTotali: 0, terapieCompletate: 0 })));
    if (path === '/patients/clinical-summary/overview') return json({ totalPatients: 2, critici: 0, rischiAlti: 0, ricoverati: 2, dimessi: 0, allergieGravi: 0, terapieTotali: 0, terapieCompletate: 0 });
    if (path === '/patients/settings') return json({ deleteEnabled: false });
    if (['/therapy-slots', '/appointments', '/admin/rooms'].includes(path)) return json([]);
    if (path === '/consegne/overview') return json({ scope: 'operator', summary: { total: 0, urgentActive: 0, urgentTaken: 0 }, recentPreview: [], urgentPreview: [], byOperator: {} });
    if (path === '/consegne') return json({ items: [], hasMore: false, nextCursor: null, summary: { total: 0, urgentActive: 0, urgentTaken: 0 } });
    if (path === '/notes') return json({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: { unread: 0 } });
    if (['/operators/directory/page', '/operators/page'].includes(path)) return json({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: path === '/operators/page' ? { total: 0, active: 0, matching: 0, appointmentsToday: 0 } : null });
    state.unexpected.push(`${req.method()} ${path}`); return json({ error: 'Unexpected guarded API' }, 500);
  });
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') state.errors.push(message.text()); });
  page.on('pageerror', error => state.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) state.httpErrors.push({ status: response.status(), path: new URL(response.url()).pathname }); });
  return { context, page, state };
}
async function login(ctx) {
  ctx.page.setDefaultTimeout(60000);
  await ctx.page.goto((process.env.APP_URL || `http://127.0.0.1:${process.env.QA_PORT || 7513}`) + '/#/consegne');
  await ctx.page.getByRole('button', { name: /Infermiere Sintetico/ }).click();
  if (ctx.state.mobile) await ctx.page.getByRole('button', { name: 'Apri menu' }).click();
  await ctx.page.locator('.teams-sidebar').getByRole('button', { name: /Consegne/ }).click();
  await expect(ctx.page.getByRole('heading', { name: 'Non confermate' })).toBeVisible();
  await expect(ctx.page.locator('[data-unread-id]')).toHaveCount(20);
}
const sidebar = page => page.locator('.teams-sidebar').getByRole('button', { name: /Consegne/ });
const view = (page, name) => page.getByRole('group', { name: 'Vista consegne' }).getByRole('button', { name, exact: true });
async function check(name, fn) { await fn(); outcomes.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
async function finish(ctx, name) {
  for (const key of ['clinicalWrites', 'unexpected', 'external', 'pageErrors']) expect(ctx.state[key], key).toEqual([]);
  expect(ctx.state.httpErrors.every(error => [503, 409].includes(error.status) && (/\/ack$/.test(error.path) || error.path === '/patients/diary-unread-patient-counts'))).toBe(true);
  expect(ctx.state.errors.filter(error => !/Failed to load resource.*(503|409)/.test(error))).toEqual([]);
  await ctx.context.tracing.stop({ path: `${out}/${name}-trace.zip` });
  const video = ctx.page.video(); await ctx.context.close(); await video.saveAs(`${out}/video/${name}.webm`); await video.delete();
}
try {
  const desktop = await contextFor(); await login(desktop);
  const { page, state } = desktop;
  await view(page, 'Per paziente').click();
  const history = page.locator('.handover-rounds__history');
  await expect(history.locator('[data-entry-id="d-052"]')).toBeVisible();
  const heights = await history.locator('.diario-card').evaluateAll(nodes => nodes.filter(node => ['d-052','d-050','d-048'].includes(node.dataset.entryId)).map(node => ({ id: node.dataset.entryId, height: node.getBoundingClientRect().height, text: node.innerText })));
  expect(heights).toHaveLength(3);
  writeFileSync(out + '/benchmark.json', JSON.stringify({ before, source: process.env.SOURCE_COMMIT, viewport: page.viewportSize(), heights }, null, 2));
  if (before) {
    outcomes.push({name:'Reproduced original ambiguous action and repeated explanation',status:'PASS'});
    await expect(history.getByRole('button', { name: action }).first()).toHaveText('Letto');
    await page.screenshot({ path: out + '/screenshots/desktop-before-brief-notes.png' });
    await finish(desktop, 'before-desktop');
    const mobileBaseline=await contextFor(true); await login(mobileBaseline);
    await view(mobileBaseline.page,'Per paziente').click();
    await expect(mobileBaseline.page.locator('[data-entry-id="d-052"]')).toBeVisible();
    const mobileHeights=await mobileBaseline.page.locator('.diario-card').evaluateAll(nodes=>nodes.filter(node=>['d-052','d-050','d-048'].includes(node.dataset.entryId)).map(node=>({id:node.dataset.entryId,height:node.getBoundingClientRect().height,text:node.innerText})));
    expect(mobileHeights).toHaveLength(3);
    writeFileSync(out+'/benchmark-mobile.json',JSON.stringify({before:true,source:process.env.SOURCE_COMMIT,viewport:mobileBaseline.page.viewportSize(),heights:mobileHeights},null,2));
    await mobileBaseline.page.locator('[data-entry-id="d-052"]').scrollIntoViewIfNeeded();
    await mobileBaseline.page.screenshot({path:out+'/screenshots/mobile-before-brief-notes.png'});
    await finish(mobileBaseline,'before-mobile');
    writeFileSync(out + '/test-results/browser-results.json', JSON.stringify({ outcomes: [{name:'Reproduced original ambiguous visible action and repeated explanation',status:'PASS'}], states, baselineOnly:true }, null, 2));
  } else {
    await check('424 AC1/4 concise action and one collapsed guide in diary; brief content complete', async () => {
      await expect(history.getByRole('button', { name: /Conferma lettura/ }).first()).toHaveText('Conferma lettura');
      await expect(history.locator('.diary-reading-guide')).toHaveCount(1);
      await expect(history.locator('.diary-reading-guide')).not.toHaveAttribute('open', '');
      await expect(history.locator('.diario-card').getByText('Aprire la nota non la segna come letta.', {exact:true})).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: out + '/screenshots/desktop-after-brief-notes.png' });
      const guide = history.locator('.diary-reading-guide summary');
      await guide.focus(); await page.keyboard.press('Enter');
      await expect(history.locator('.diary-reading-guide')).toHaveAttribute('open', '');
      await expect(history.locator('.diary-reading-guide')).toContainText('non dichiara completato');
      await page.keyboard.press('Enter');
    });
    await view(page, 'Non confermate').click();
    await expect(page.locator('[data-unread-id]')).toHaveCount(20);
    await expect(page.locator('.diary-reading-guide')).toHaveCount(1);

  await check('AC1/2 badge53 opens default Non confermate and explains both sources/all dates without implicit receipts', async () => {
    await expect(sidebar(page)).toContainText('53'); await expect(view(page, 'Non confermate')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('20 note caricate di 53 non confermate')).toBeVisible();
    expect(state.allowedSyntheticReceipts).toEqual([]);
    await page.screenshot({ path: `${out}/screenshots/desktop-unread-badge53.png` });
  });
  const urgent = page.locator('[data-unread-id="zz-urgent"]');
  await check('AC3 failed reading keeps queue/count and exposes retry without clinical takeover', async () => {
    state.failNext = true; await urgent.getByRole('button', { name: /Conferma lettura/ }).click();
    await expect(page.getByText('Conferma di lettura non registrata. Riprova.', { exact: true })).toBeVisible();
    await expect(urgent).toBeVisible(); await expect(sidebar(page)).toContainText('53');
    expect(state.rows.find(row => row.id === 'zz-urgent').urgency.state).toBe('active');
    await page.screenshot({ path: `${out}/screenshots/desktop-failed-read-no-decrement.png` });
  });
  await check('AC3 validated read removes exactly one, updates badge52, returns keyboard focus and leaves urgency active', async () => {
    await urgent.getByRole('button', { name: /Conferma lettura/ }).click();
    await expect(urgent).toHaveCount(0); await expect(sidebar(page)).toContainText('52');
    await expect(page.getByRole('heading', { name: 'Non confermate' })).toBeFocused();
    expect(state.rows.find(row => row.id === 'zz-urgent').urgency.state).toBe('active');
    await page.screenshot({ path: `${out}/screenshots/desktop-confirmed-read-badge52.png` });
  });
  await check('AC1/4 complete bounded pagination reaches52 mixed-source notes and exact26+26 patient counts', async () => {
    await page.getByRole('button', { name: 'Carica altre note non confermate' }).click(); await expect(page.locator('[data-unread-id]')).toHaveCount(40);
    await page.getByRole('button', { name: 'Carica altre note non confermate' }).click(); await expect(page.locator('[data-unread-id]')).toHaveCount(52);
    await expect(page.getByText('52 note caricate di 52 non confermate')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Carica altre note non confermate' })).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Conteggi per paziente' }).getByText('26 non confermate', { exact: true })).toHaveCount(2);
    const ids = await page.locator('[data-unread-id]').evaluateAll(nodes => nodes.map(node => node.dataset.unreadId)); expect(new Set(ids).size).toBe(52);
  });
  await check('AC4 queue patient outside first roster page opens exact requested diary, never first patient fallback', async () => {
    await page.getByRole('complementary', { name: 'Conteggi per paziente' }).getByRole('button', { name: /Sintetica fuori pagina/ }).click();
    await expect(page.locator('.handover-rounds__patient-heading')).toContainText('Sintetica fuori pagina');
    await expect(page.locator('.handover-rounds__history')).toContainText('Nota sintetica 1');
    await page.screenshot({ path: `${out}/screenshots/desktop-outside-first-page-target.png` });
  });
  await check('AC3 diary retains Letta plus separate Ho capito, then explicit clinical takeover does not decrement unread twice', async () => {
    await page.locator('.handover-rounds__roster .handover-rounds__select').first().click();
    const history = page.locator('.handover-rounds__history');
    await expect(history).toContainText('Lettura confermata da Infermiere Sintetico');
    await expect(history.getByRole('button', { name: /Ho capito/ })).toBeVisible();
    await page.screenshot({ path: `${out}/screenshots/desktop-read-urgent-still-active.png` });
    await history.getByRole('button', { name: /Ho capito/ }).click();
    await expect(history.locator('.urgency-notice[data-urgency-state="taken"]')).toContainText('Infermiere Sintetico');
    await expect(history.getByRole('button', { name: /Ho capito/ })).toHaveCount(0); await expect(sidebar(page)).toContainText('52');
    expect(state.allowedSyntheticReceipts.at(-1).purpose).toBe('urgency');
  });
  await check('AC4 unavailable per-patient counts are labeled, never fabricated0; retry recovers', async () => {
    state.countError = true; await page.evaluate(() => window.dispatchEvent(new Event('clinicos:diary-reading-changed')));
    await expect(page.locator('.handover-rounds__roster')).toContainText('Conteggio letture non disponibile');
    await page.screenshot({ path: `${out}/screenshots/desktop-count-unavailable.png` });
    state.countError = false; await page.getByRole('button', { name: /Riprova conteggio/ }).click();
    await expect(page.locator('.handover-rounds__roster')).toContainText('26 non confermate');
  });
  await check('AC2 sidebar reopens unread instead of patient diary; reload retains server receipts and badge', async () => {
    await sidebar(page).click(); await expect(view(page, 'Non confermate')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-unread-id]')).toHaveCount(20); await expect(urgent).toHaveCount(0);
    await page.reload();
    // Simulator authentication intentionally does not survive reload; re-enter the same identity.
    await page.getByRole('button', { name: /Infermiere Sintetico/ }).click(); await sidebar(page).click();
    await expect(page.locator('[data-unread-id]')).toHaveCount(20); await expect(sidebar(page)).toContainText('52');
  });
  await finish(desktop, 'desktop');
  const mobile = await contextFor(true); await login(mobile);
  await check('AC1/2/4 mobile grayscale conveys source/priority/nonconfirmed state and patient counts without overflow', async () => {
    const session = await mobile.context.newCDPSession(mobile.page);
    await session.send('Emulation.setEmulatedVisionDeficiency', { type: 'achromatopsia' });
    await expect(mobile.page.getByText('20 note caricate di 53 non confermate')).toBeVisible();
    await expect(mobile.page.locator('[data-unread-id="zz-urgent"]')).toContainText('Urgente');
    await expect(mobile.page.locator('[data-unread-id="zz-urgent"]')).toContainText('Non confermata');
    expect(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mobile.page.screenshot({ path: `${out}/screenshots/mobile-grayscale-queue.png`, fullPage: false });
    await mobile.page.locator('[data-unread-id="zz-urgent"]').scrollIntoViewIfNeeded();
    await mobile.page.screenshot({ path: `${out}/screenshots/mobile-grayscale-note-controls.png` });
    await session.detach();
  });
  await check('424 mobile brief diary preserves content and one guide without horizontal overflow',async()=>{
    await view(mobile.page,'Per paziente').click();
    await expect(mobile.page.locator('[data-entry-id="d-052"]')).toBeVisible();
    await expect(mobile.page.locator('.handover-rounds__history .diary-reading-guide')).toHaveCount(1);
    const heights=await mobile.page.locator('.diario-card').evaluateAll(nodes=>nodes.filter(node=>['d-052','d-050','d-048'].includes(node.dataset.entryId)).map(node=>({id:node.dataset.entryId,height:node.getBoundingClientRect().height,text:node.innerText})));
    expect(heights).toHaveLength(3);
    writeFileSync(out+'/benchmark-mobile.json',JSON.stringify({before:false,source:process.env.SOURCE_COMMIT,viewport:mobile.page.viewportSize(),heights},null,2));
    expect(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await mobile.page.locator('[data-entry-id="d-052"]').scrollIntoViewIfNeeded();
    await mobile.page.screenshot({path:out+'/screenshots/mobile-after-brief-notes.png'});
  });
  await finish(mobile, 'mobile');
  const fence = await contextFor(); await login(fence);
  await check('stale receipt after leaving queue cannot publish a reading event or success into another view', async () => {
    await fence.page.evaluate(() => { window.__qa409events = 0; window.addEventListener('clinicos:diary-reading-changed', () => window.__qa409events++); });
    fence.state.delayNext = true;
    await fence.page.locator('[data-unread-id="zz-urgent"]').getByRole('button', { name: /Conferma lettura/ }).click();
    await expect.poll(() => fence.state.ackHeld).toBe(true);
    await view(fence.page, 'Per paziente').click(); await expect(fence.page.locator('.handover-rounds__patient-heading')).toBeVisible();
    const response = fence.page.waitForResponse(response => /\/ack$/.test(new URL(response.url()).pathname));
    fence.state.releaseAck(); await response; await fence.page.waitForTimeout(100);
    expect(await fence.page.evaluate(() => window.__qa409events)).toBe(0);
    await expect(fence.page.getByText('Lettura confermata. La presa in carico clinica non è stata modificata.')).toHaveCount(0);
  });
  await check('switching queue/patient views preserves the exact patient draft without any clinical save', async () => {
    await fence.page.getByRole('tab', { name: /Nuova nota/ }).click();
    await fence.page.getByRole('textbox', { name: 'Segnalazione' }).fill('Bozza sintetica personale 409');
    await view(fence.page, 'Non confermate').click(); await expect(fence.page.getByRole('heading', { name: 'Non confermate' })).toBeVisible();
    await view(fence.page, 'Per paziente').click(); await fence.page.getByRole('tab', { name: /Nuova nota/ }).click();
    await expect(fence.page.getByRole('textbox', { name: 'Segnalazione' })).toHaveValue('Bozza sintetica personale 409');
    expect(fence.state.clinicalWrites).toEqual([]);
  });
  await finish(fence, 'fencing-draft');
  const denied = await contextFor(); await login(denied);
  await check('role/session switch fences late read receipt and denied diary role makes no queue/count request', async () => {
    denied.state.delayNext = true;
    await denied.page.locator('[data-unread-id="zz-urgent"]').getByRole('button', { name: /Conferma lettura/ }).click();
    await expect.poll(() => denied.state.ackHeld).toBe(true);
    await denied.page.getByRole('button', { name: /menu utente/ }).click(); await denied.page.getByRole('button', { name: 'Cambia profilo' }).click();
    await denied.page.getByRole('button', { name: /Amministratore Sintetico/ }).click(); await sidebar(denied.page).click();
    await expect(denied.page.getByText(/La coda Non confermate non è disponibile per questo ruolo/)).toBeVisible();
    const offset = denied.state.requests.length;
    const response = denied.page.waitForResponse(response => /\/ack$/.test(new URL(response.url()).pathname));
    denied.state.releaseAck(); await response; await denied.page.waitForTimeout(100);
    expect(denied.state.requests.slice(offset).filter(request => request.path.startsWith('/patients/diary-unread'))).toEqual([]);
    await expect(denied.page.getByText('Lettura confermata. La presa in carico clinica non è stata modificata.')).toHaveCount(0);
    await expect(denied.page.locator('[data-unread-id]')).toHaveCount(0);
    await denied.page.screenshot({ path: `${out}/screenshots/denied-role-no-leaked-queue.png` });
  });
  await finish(denied, 'denied-session');
  const extra = await contextFor(); await login(extra);
  await check('424 failure409 and malformed response never manufacture confirmation; guarded retry', async () => {
    const row = extra.page.locator('[data-unread-id="zz-urgent"]');
    extra.state.failStatus=409; extra.state.failNext=true;
    await row.getByRole('button',{name:/Conferma lettura/}).click();
    await expect(extra.page.getByText('Conferma di lettura non registrata. Riprova.',{exact:true})).toBeVisible();
    expect(extra.state.rows.find(row=>row.id==='zz-urgent').readReceipt.state).toBe('unread');
    extra.state.invalidNext=true; await row.getByRole('button',{name:/Conferma lettura/}).click();
    await expect(extra.page.getByText('Il server non ha confermato la lettura. Aggiorna la pagina.',{exact:true})).toBeVisible();
    await expect(row.getByRole('button',{name:/Conferma lettura/})).toHaveText('Conferma lettura');
  });
  await check('424 pending reading is disabled and sends exactly one read purpose; authoritative server identity survives refetch', async () => {
    const row=extra.page.locator('[data-unread-id="zz-urgent"]'); const start=extra.state.allowedSyntheticReceipts.length;
    extra.state.delayNext=true; await row.getByRole('button',{name:/Conferma lettura/}).click();
    await expect.poll(()=>extra.state.ackHeld).toBe(true);
    await expect(row.getByRole('button',{name:/Conferma lettura/})).toBeDisabled();
    await expect(row.getByRole('button',{name:/Conferma lettura/})).toHaveText('Registrazione…');
    expect(extra.state.allowedSyntheticReceipts.length-start).toBe(1);
    expect(extra.state.allowedSyntheticReceipts.at(-1).purpose).toBe('read');
    extra.state.releaseAck(); await expect(row).toHaveCount(0);
    await view(extra.page,'Per paziente').click();
    const history=extra.page.locator('.handover-rounds__history');
    await expect(history).toContainText('Lettura confermata da Infermiere Sintetico (Infermiere)');
    await expect(history.locator('[data-entry-id="zz-urgent"] time[datetime="2026-10-09T07:00:00.000Z"]')).toHaveText('09/10/2026 09:00');
    await expect(history.getByRole('button',{name:/Ho capito/})).toBeVisible();
    expect(extra.state.rows.find(row=>row.id==='zz-urgent').status).toBe('aperta');
    await extra.page.screenshot({path:out+'/screenshots/authoritative-read-active-urgency.png'});
    await extra.page.reload(); await extra.page.getByRole('button',{name:/Infermiere Sintetico/}).click(); await sidebar(extra.page).click();
    await view(extra.page,'Per paziente').click();
    await expect(extra.page.locator('.handover-rounds__history')).toContainText('Lettura confermata da Infermiere Sintetico');
    await expect(extra.page.locator('[data-entry-id="zz-urgent"] time[datetime="2026-10-09T07:00:00.000Z"]')).toHaveText('09/10/2026 09:00');
  });
  await finish(extra,'failure-busy-reload');
  const doctor=await contextFor(); await login(doctor);
  await doctor.page.getByRole('button',{name:/menu utente/}).click(); await doctor.page.getByRole('button',{name:'Cambia profilo'}).click();
  await doctor.page.getByRole('button',{name:/Medico Lettore Sintetico/}).click(); await sidebar(doctor.page).click();
  await check('424 doctor also has explicit reading action and exact server role/time',async()=>{
    const row=doctor.page.locator('[data-unread-id="zz-urgent"]');
    const btn=row.getByRole('button',{name:/Conferma lettura/}); await btn.focus(); await doctor.page.keyboard.press('Enter'); await expect(row).toHaveCount(0);
    await view(doctor.page,'Per paziente').click(); await expect(doctor.page.locator('.handover-rounds__history')).toContainText('Lettura confermata da Medico Lettore Sintetico (Medico)');
    await doctor.page.screenshot({path:out+'/screenshots/doctor-reading.png'});
  });
  await finish(doctor,'doctor');
  }
  writeFileSync(`${out}/test-results/browser-results.json`, JSON.stringify({ outcomes, states, fixtureTransport: 'Actual SPA with guarded in-memory synthetic endpoints; database persistence/authz separately verified by real PostgreSQL tests. No real patient test writes.', noClinicalWrites: true }, null, 2));
} catch (error) {
  for (const [i, context] of contexts.entries()) { const page = context.pages()[0]; if (page) await page.screenshot({ path: `${out}/screenshots/failure-${i}.png` }).catch(() => {}); }
  writeFileSync(`${out}/test-results/failure.json`, JSON.stringify({ message: error.message, stack: error.stack, outcomes, states }, null, 2)); throw error;
} finally { for (const context of contexts) await context.close().catch(() => {}); await browser.close(); }
