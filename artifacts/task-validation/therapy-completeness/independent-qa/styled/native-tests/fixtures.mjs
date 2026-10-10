export const today = '2026-10-08';
export const drug = (id, patch = {}) => ({ id, patientId: 'synthetic-patient', farmacoNome: `Farmaco sintetico ${id}`,
  dosaggio: 'Prescrizione sintetica', viaSomministrazione: 'orale', tipo: 'periodica', stato: 'attiva',
  dataInizio: '2026-01-01', dataFine: null, dataSomministrazione: null, orarioSomministrazione: null, orarioSpecifico: '08:00',
  fasceMattina: true, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false,
  prescrittore: 'Prescrittore sintetico', operatoreInseritore: null, note: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...patch });
export const therapies = Array.from({ length: 108 }, (_, i) => drug(String(i).padStart(3, '0'),
  i === 100 ? { tipo: 'una_tantum', dataSomministrazione: '2027-02-01' } :
  i === 101 ? { tipo: 'al_bisogno' } : i === 102 ? { stato: 'sospesa' } : i === 103 ? { stato: 'conclusa' } :
  i === 104 ? { tipo: 'al_bisogno', dataInizio: '2026-10-09', dataFine: '2026-10-10' } :
  i === 105 ? { giorniSettimana: '1' } : i === 106 ? { orarioSpecifico: null, fasceMattina: false } :
  i === 107 ? { note: 'Schema da verificare con prescrittore; nessuna dose inventata', doseMode: 'glucose_scale', doseProtocol: null } : {}));
export const slots = [{ id: 'mattina', fascia: 'mattina', label: 'Mattina', ora: '08:00',
  summary: { total: 1, administered: 0, notAdministered: 0, pending: 1 }, patients: [{ patientId: 'synthetic-patient',
    firstName: 'Sintetico', lastName: 'Verifica', room: '', bed: '', administrations: [{ administrationId: null,
      therapyId: '000', drugName: therapies[0].farmacoNome, dosage: 'Prescrizione sintetica', route: 'orale', scheduledTime: '08:00',
      status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null }] }] }];
export async function guard(page, state = {}) {
  const errors = []; const requests = []; const blocked = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); });
  await page.clock.install({ time: new Date('2026-10-08T09:00:00+02:00') });
  await page.route('**/*', async route => {
    const req = route.request(); const u = new URL(req.url());
    if (req.method() !== 'GET') { blocked.push(req.method() + ' ' + u.pathname); return route.abort(); }
    if (u.origin === 'http://127.0.0.1:7543' && (u.pathname === '/qa-therapy' || u.pathname.startsWith('/assets/'))) return route.continue();
    if (['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(u.origin)) return route.continue();
    requests.push(u.pathname + u.search);
    const json = value => route.fulfill({ json: value });
    if (/\/patients\/synthetic-(patient|other)\/therapies\/page$/.test(u.pathname)) {
      if (state.delay && u.pathname.includes('synthetic-patient')) await new Promise(r => setTimeout(r, 400));
      const all = u.pathname.includes('synthetic-other') ? [drug('other', { patientId: 'synthetic-other' })] : (state.therapies || therapies);
      const filtered = all.filter(t => u.searchParams.get('status') === 'attiva' ? t.stato === 'attiva' : true);
      const cursor = u.searchParams.get('cursor');
      const items = cursor ? filtered.slice(100) : filtered.slice(0, 100);
      return json({ items: state.short ? items.slice(0, 1) : items,
        summary: cursor ? null : { total: filtered.length, active: filtered.filter(t => t.stato === 'attiva').length,
          inactive: filtered.filter(t => t.stato !== 'attiva').length },
        pageInfo: { hasMore: !cursor && filtered.length > 100, nextCursor: !cursor && filtered.length > 100 ? 'synthetic-next' : null } });
    }
    if (u.pathname === '/therapy-slots') return json(state.slots || slots);
    if (u.pathname === '/farmaci/cerca') return json({ query: u.searchParams.get('q'), esiti: [] });
    if (u.pathname.includes('/medication-administrations/page')) return json({ items: [], pageInfo: { hasMore: false, nextCursor: null } });
    if (u.pathname === '/therapy-slots/prn') return json({ items: [] });
    blocked.push(u.origin + u.pathname); console.error('Unmatched QA request: ' + u.origin + u.pathname); return route.abort();
  });
  return { errors, requests, blocked };
}
