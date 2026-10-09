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
      if (state.denyConsegne) capabilities['consegne.list'] = {allowed:false,effect:'DENIED'};
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
      if(path === `/patients/${p.id}/room-options`) return json([]);
      if(path === `/patients/${p.id}/therapies/page`) return json({items:[],summary:{total:0,active:0,inactive:0},pageInfo:{hasMore:false,nextCursor:null}});
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
 const author = await contextFor(); author.state.rows.find(r=>r.id==='zz-urgent').readReceipt={...receipt,isAuthor:true,canAcknowledge:false}; await login(author);
 await check('Independent author restriction: explanatory state, no self-read action, guide keyboard does not write',async()=>{
  const row=author.page.locator('[data-unread-id="zz-urgent"]');
  await expect(row.getByText('Conferma riservata a un altro operatore.')).toBeVisible();
  await expect(row.getByRole('button',{name:/Conferma lettura/})).toHaveCount(0);
  const guide=author.page.locator('.diary-reading-guide'); await guide.locator('summary').focus();await author.page.keyboard.press('Space');
  await expect(guide).toHaveAttribute('open','');await expect(guide).toContainText('non prende in carico');
  expect(author.state.allowedSyntheticReceipts).toEqual([]);
  await author.page.screenshot({path:out+'/screenshots/author-cannot-self-confirm.png'});
 });await finish(author,'author');
 const denied=await contextFor();denied.state.rows.find(r=>r.id==='consegna:d-051').readReceipt={...receipt,canAcknowledge:false};await login(denied);
 await denied.page.getByRole('button',{name:'Carica altre note non confermate'}).click();
 await check('Independent authoritative receipt denies handover self-action, diary action remains available',async()=>{
  const handover=denied.page.locator('[data-unread-id="consegna:d-051"]');await expect(handover.getByRole('button',{name:/Conferma lettura/})).toHaveCount(0);
  const diary=denied.page.locator('[data-unread-id="d-052"]');await expect(diary.getByRole('button',{name:/Conferma lettura/})).toBeEnabled();
  expect(denied.state.allowedSyntheticReceipts).toEqual([]);
  await denied.page.screenshot({path:out+'/screenshots/source-capability.png'});
 });await finish(denied,'capability');
 const hostile=await contextFor();const text='<img src=x onerror=alert(424)>';const zz=hostile.state.rows.find(r=>r.id==='zz-urgent');
 zz.readReceipt={state:'read',readBy:{operatorName:text,operatorRole:'medico',acknowledgedAt:'2026-10-09T07:00:00.000Z',byMe:false},isAuthor:false,canAcknowledge:false};
 await login(hostile);await view(hostile.page,'Per paziente').click();
 await check('Independent authoritative hostile server identity stays escaped with full date and separate urgency',async()=>{
  const row=hostile.page.locator('[data-entry-id="zz-urgent"]');await expect(row).toContainText('Lettura confermata da '+text+' (Medico)');
  await expect(row.locator('img')).toHaveCount(0);await expect(row.locator('time[datetime="2026-10-09T07:00:00.000Z"]')).toHaveText('09/10/2026 09:00');
  await expect(row.getByRole('button',{name:/Ho capito/})).toBeVisible();
  expect(hostile.state.allowedSyntheticReceipts).toEqual([]);
  await row.scrollIntoViewIfNeeded();await hostile.page.screenshot({path:out+'/screenshots/escaped-authoritative-receipt.png'});
 });await finish(hostile,'hostile');
 const chart=await contextFor();await login(chart);
 await chart.page.goto((process.env.APP_URL || 'http://127.0.0.1:'+process.env.QA_PORT)+'/#/dettaglio-paziente/QA-PATIENT-409-0/diario');
 await check('Independent direct patient chart action, server reader/date, unchanged urgency and after reload',async()=>{
  const row=chart.page.locator('.patient-record-view [data-entry-id="zz-urgent"]');
  await expect(row).toBeVisible();await expect(chart.page.locator('.patient-record-view .diary-reading-guide')).toHaveCount(1);
  const count=chart.state.allowedSyntheticReceipts.length;
  await row.getByRole('button',{name:/Conferma lettura/}).focus();await chart.page.keyboard.press('Enter');
  await expect(row).toContainText('Lettura confermata da Infermiere Sintetico (Infermiere)');
  await expect(row.locator('time[datetime="2026-10-09T07:00:00.000Z"]')).toHaveText('09/10/2026 09:00');
  await expect(row.getByRole('button',{name:/Conferma lettura/})).toHaveCount(0);await expect(row.getByRole('button',{name:/Ho capito/})).toBeVisible();
  expect(chart.state.allowedSyntheticReceipts.length-count).toBe(1);expect(chart.state.allowedSyntheticReceipts.at(-1).purpose).toBe('read');
  expect(chart.state.rows.find(r=>r.id==='zz-urgent').status).toBe('aperta');expect(chart.state.rows.find(r=>r.id==='zz-urgent').urgency.state).toBe('active');
  await row.scrollIntoViewIfNeeded();await chart.page.screenshot({path:out+'/screenshots/direct-chart-confirmed.png'});
  await chart.page.reload();await chart.page.getByRole('button',{name:/Infermiere Sintetico/}).click();
  await expect(chart.page.locator('.patient-record-view [data-entry-id="zz-urgent"]')).toContainText('Lettura confermata da Infermiere Sintetico (Infermiere)');
  await expect(chart.page.locator('.patient-record-view [data-entry-id="zz-urgent"] time[datetime="2026-10-09T07:00:00.000Z"]')).toHaveText('09/10/2026 09:00');
 });await finish(chart,'chart');
 writeFileSync(out+'/test-results/browser-results.json',JSON.stringify({outcomes,states,fixtureTransport:'Guarded in-memory synthetic transport; no production mutation. Real DB contract separately tested.'},null,2));
} catch(error) {
 for(const [i,c] of contexts.entries()){const p=c.pages()[0];if(p)await p.screenshot({path:out+'/screenshots/failure-'+i+'.png'}).catch(()=>{});await c.tracing.stop({path:out+'/failure-'+i+'-trace.zip'}).catch(()=>{});}
 writeFileSync(out+'/test-results/failure.json',JSON.stringify({message:error.message,stack:error.stack,outcomes,states},null,2));throw error;
} finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}



