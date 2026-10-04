// Synthetic API boundary: every request to localhost API is intercepted.
export const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
export const therapy = (id, patch = {}) => ({
  id, patientId: 'patient-test', farmacoNome: 'Farmaco sintetico ' + id,
  dosaggio: '10 mg compressa', viaSomministrazione: 'orale', tipo: 'periodica', stato: 'attiva',
  dataInizio: '2026-01-01', dataFine: null, dataSomministrazione: null,
  orarioSomministrazione: null, orarioSpecifico: null, giorniSettimana: null,
  fasceMattina: true, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false,
  prescrittore: 'Medico Test', note: 'Nota sintetica', commercialStrengthValue: 10, commercialStrengthUnit: 'mg',
  schedules: [{ id: 'schedule-' + id, therapyId: id, time: '08:00', fascia: 'mattina',
    quantityNumerator: 1, quantityDenominator: 2, administrationUnit: 'compressa' }], ...patch,
});
export const drugs = [therapy('t1'), therapy('prn', { tipo: 'al_bisogno', schedules: [], note: 'Indicazione sintetica' })];
export const handover = { id: 'handover-test', pazienteId: 'patient-test', pazienteNome: 'Paziente Test',
  priorita: 'urgente', stato: 'aperta', tipo: 'Monitoraggio', note: 'Nota sintetica', scadenza: today(),
  operatoreAssegnato: 'Medico Test', creatoDA: 'Autore Test', createdAt: '2026-10-04T00:00:00Z',
  urgency: { state: 'active', takenBy: null, isAuthor: false, canAcknowledge: true } };
export async function mockApi(context, state) {
  await context.route('http://localhost:3001/**', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname;
    state.requests.push({ path: p, method: request.method() });
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return send({});
    if (p === '/auth/status') return send({ mode: 'demo', temporaryDemo: true, simulator: true });
    if (p === '/auth/simulator/identities') return send({ identities: [{ id: 'reader', name: 'Medico Test', roleLabel: 'Medico' }] });
    if (p === '/auth/simulator/session') return send({ token: 'sim.synthetic-discovery-test' });
    if (p === '/auth/me') return send({ id: 'reader', name: 'Medico Test', role: 'medico', appRole: 'medico',
      roleLabel: 'Medico', uiShell: 'operator', authMode: 'demo', temporaryDemo: true });
    if (p.endsWith('/therapies/page')) {
      const active = url.searchParams.get('status') === 'attiva';
      if (state.failMore && url.searchParams.has('cursor') && !active) return send({ error: 'Synthetic outage' }, 503);
      const pageDrugs = state.dashboardDensity ? [0, 1, 2].map(index => therapy('density-' + index, {
        farmacoNome: 'Farmaco sintetico ' + index,
        schedules: [{ id: 'density-schedule-' + index, therapyId: 'density-' + index,
          time: index === 0 ? '07:00' : '08:00', fascia: 'mattina', quantityNumerator: 1,
          quantityDenominator: 1, administrationUnit: 'compressa' }],
      })) : drugs;
      return send({ items: pageDrugs, summary: { total: pageDrugs.length, active: pageDrugs.length, inactive: 0 },
        pageInfo: { hasMore: state.failMore && !active, nextCursor: state.failMore && !active ? 'test-more' : null } });
    }
    if (p === '/therapy-slots/prn') return send({ items: [] });
    if (p === '/therapy-slots') {
      state.slotReads++;
      if (state.dashboardDensity) return send(['07:00', '08:00', '08:00'].map((ora, index) => ({
        id: 'density-' + index, fascia: 'mattina', label: 'Mattina', ora,
        summary: { total: 1, administered: 0, pending: 1, notAdministered: 0 },
        patients: [{ patientId: 'patient-test', firstName: 'Paziente', lastName: 'Test',
          location: { status: 'unassigned', source: null, room: null, bed: null, asOf: today() }, room: null, bed: null, administrations: [{
            administrationId: null, therapyId: 'density-' + index, drugName: 'Farmaco sintetico ' + index,
            dosage: '1 compressa — 10 mg', quantityLabel: '1 compressa — 10 mg', route: 'orale',
            scheduledTime: ora, status: 'pending', administeredAt: null, administeredBy: null,
            notAdministeredReason: null,
          }] }],
      })));
      return send([{ id: 'slot-test', fascia: 'mattina', label: 'Mattina', ora: '08:00',
        summary: { total: 1, administered: state.done ? 1 : 0, pending: state.done ? 0 : 1, notAdministered: 0 },
        patients: [{ patientId: 'patient-test', firstName: 'Paziente', lastName: 'Test', codiceFiscale: null, dateOfBirth: null,
          location: { status: 'unassigned' }, room: null, bed: null, administrations: [{
            administrationId: state.done ? 'done-test' : null, therapyId: 't1', drugName: drugs[0].farmacoNome,
            dosage: '1/2 compressa — 5 mg', quantityLabel: '1/2 compressa — 5 mg', route: 'orale', scheduledTime: '08:00',
            status: state.done ? 'administered' : 'pending', administeredAt: state.done ? new Date().toISOString() : null,
            administeredBy: state.done ? 'Collega Test' : null, notAdministeredReason: null,
          }] }] }]);
    }
    if (p === '/consegne/overview') return send({ scope: 'operator', summary: { total: 20, urgentActive: 12, urgentTaken: 2 },
      urgentPreview: [handover], recentPreview: [handover], byOperator: {} });
    if (p === '/consegne') return send({ items: state.badFeed ? [null] : [handover],
      summary: { total: 20, urgentActive: 12, urgentTaken: 2 }, pageInfo: { hasMore: false, nextCursor: null } });
    if (p === '/patients/patient-test') return send({ id: 'patient-test', firstName: 'Paziente', lastName: 'Test',
      dateOfBirth: '1960-01-01', sex: null, email: null, phone: null, codiceFiscale: null });
    if (p.endsWith('/cartella')) return send({ patientId: 'patient-test', data: {
      allergie: [{ id: 'a1', allergene: 'Allergene sintetico', gravita: 'grave', tipo: 'altro' },
        { id: 'a2', allergene: 'Secondo allergene', gravita: 'lieve', tipo: 'altro' }],
      medicazioniFerite: [{ id: 'm1', dataFine: null }], contenzioni: [{ id: 'c1', attiva: true }],
    } });
    if (p.endsWith('/parameter-readings')) return send({ readings: [], hasMore: false, nextCursor: null });
    if (p.endsWith('/diary')) return send({ entries: [{ id: 'legacy-urgent', patientId: 'patient-test', authorType: 'infermiere',
      authorName: 'Autore Test', title: 'Nota urgente sintetica', content: 'Contenuto sintetico', priority: 'urgente', status: 'aperta',
      entryDateTime: '2026-10-04T00:00:00Z', createdAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z' }],
      hasMore: false, nextCursor: null });
    if (p.endsWith('/intake-review')) return send({ draftId: null, deferredTherapies: [], sourceDocumentIds: [], legacyPainDrafts: [], legacyPainError: null });
    if (p.endsWith('/brief')) return send({ items: [], count: 0 });
    if (p === '/notes') return send({ items: [], summary: { unread: 0 }, pageInfo: { hasMore: false, nextCursor: null } });
    if (p === '/operators/directory/page') return send({ items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: null });
    if (p === '/patients/page' || p === '/patients/parameters/page') return send({ items: [], hasMore: false, nextCursor: null });
    if (p === '/patients/clinical-summary/overview') return send({ totalPatients: 1, dimessi: 0, critici: 0, rischiAlti: 0, allergieGravi: 1 });
    if (p === '/patients') return send({ patients: [], pageInfo: { hasMore: false, nextCursor: null } });
    if (p === '/appointments' || p === '/patients/clinical-summary' || p === '/operators' || p.endsWith('/room-options')) return send([]);
    if (request.method() !== 'GET') { state.clinicalWrites++; return send({ error: 'Synthetic refusal' }, 403); }
    return send({});
  });
}
