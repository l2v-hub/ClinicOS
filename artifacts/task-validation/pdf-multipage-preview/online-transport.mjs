import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export async function guard(context, base, requests, state) {
  const identity = { id: 'QA-PDF-OP', name: 'Operatore Sintetico PDF', roleLabel: 'Infermiere', appRole: 'operator', uiShell: 'operator' };
  const job = JSON.parse(readFileSync('artifacts/task-validation/pdf-multipage-preview/fixtures/job.json', 'utf8'));
  const apiHosts = ['localhost', 'clinicos-backend-demo.up.railway.app', 'clinicos-backend-production-df88.up.railway.app'];
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url()), p = u.pathname;
    requests.push({ path: p, method: req.method() });
    if (u.hostname === 'fonts.googleapis.com' && req.method() === 'GET') return route.fulfill({ contentType: 'text/css', body: '' });
    if (!apiHosts.includes(u.hostname)) {
      if (req.method() === 'GET' && u.origin === base && (p === '/' || p.startsWith('/assets/') || p === '/favicon.ico')) return route.continue();
      state.forbidden.push({ method: req.method(), path: p }); return route.abort();
    }
    const json = (body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/auth/status') return json({ mode: 'disabled', temporaryDemo: false, simulator: true });
    if (p === '/auth/simulator/identities') return json({ identities: [identity] });
    if (p === '/auth/simulator/session' && req.method() === 'POST') return json({ token: 'sim.synthetic-pdf-not-a-secret' });
    if (p === '/ai/extraction/jobs' && req.method() === 'POST') { state.mockMutations.push('synthetic session creation'); return json({ job }); }
    if (p === '/ai/extraction/jobs/job-one/manifest' && req.method() === 'PUT') {
      const body = req.postDataJSON(); assert.equal(body.expectedRevision, job.manifest.revision);
      job.manifest = { ...job.manifest, revision: job.manifest.revision + 1,
        pages: body.pages.map(next => ({ ...job.manifest.pages.find(old => old.id === next.id), ...next })),
        groups: body.groups.map(next => ({ ...job.manifest.groups.find(old => old.id === next.id), ...next })) };
      state.mockMutations.push('synthetic manifest reorder'); return json(job);
    }
    if (req.method() !== 'GET') { state.forbidden.push({ method: req.method(), path: p }); return route.abort(); }
    if (p === '/ai/extraction/jobs/job-one') return json(job);
    if (p === '/ai/extraction/jobs/job-one/files/synthetic-doc/content') return route.fulfill({ contentType: 'application/pdf', body: readFileSync(process.env.FIXTURE || 'artifacts/task-validation/pdf-multipage-preview/fixtures/four-pages-synthetic.pdf') });
    if (p === '/auth/me') return json({ ...identity, role: 'operator', authMode: 'disabled', capabilities: Object.fromEntries(['intake.create_draft', 'patients.list_page', 'patients.settings', 'patients.clinical_summary', 'patients.clinical_overview', 'appointments.list', 'consegne.list', 'notes.list', 'operators.directory', 'operators.page', 'administration.list_slots', 'therapy.list', 'therapy.list_page', 'rooms.list'].map(k => [k, { allowed: true, effect: 'ALLOWED' }])) });
    if (p === '/ai/extraction/status') return json({ available: true, provider: 'synthetic', model: 'not-invoked', errors: [] });
    if (p === '/patients/page' || p === '/patients/parameters/page') return json({ items: [], hasMore: false, nextCursor: null });
    if (p === '/patients/settings') return json({ deleteEnabled: false });
    if (p === '/patients/diary-unread-count') return json({ unreadCount: 0 });
    if (p === '/patients/clinical-summary') return json([]);
    if (p === '/patients/clinical-summary/overview') return json({ totalPatients: 0, critici: 0, rischiAlti: 0, ricoverati: 0, dimessi: 0, allergieGravi: 0, terapieTotali: 0, terapieCompletate: 0 });
    if (p === '/me/roster-order') return json({ context: null, default: null, override: null, effective: { criterion: 'name', direction: 'asc' }, source: 'system', revision: null, canEdit: false, canEditDefault: false, temporary: false, reason: null });
    if (['/operators/page', '/operators/directory/page'].includes(p)) return json({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: { total: 0, active: 0, matching: 0, appointmentsToday: 0 } });
    if (p === '/consegne/overview') return json({ scope: 'operator', summary: { total: 0, urgentActive: 0, urgentTaken: 0 }, recentPreview: [], urgentPreview: [], byOperator: {} });
    if (p === '/consegne') return json({ items: [], hasMore: false, nextCursor: null, summary: { total: 0, urgentActive: 0, urgentTaken: 0 } });
    if (p === '/notes') return json({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: { unread: 0 } });
    if (['/appointments', '/therapy-slots', '/admin/rooms', '/operators/schedules'].includes(p)) return json([]);
    state.forbidden.push({ method: req.method(), path: p }); return route.abort();
  });
  return async page => {
    await page.getByRole('button', { name: new RegExp(identity.name) }).click();
    await page.getByRole('button', { name: 'Importa lettera di dimissione', exact: true }).click();
  };
}
