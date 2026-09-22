import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';

const PatientList = lazy(() => import('../../../../frontend/src/components/operator/PatientList').then(m => ({ default: m.PatientList })));
const rows = Array.from({ length: 52 }, (_, i) => ({ id: `synthetic-${i}`, firstName: 'Esempio', lastName: `${i === 0 ? 'Alfa' : i === 1 ? 'Beta' : 'Paziente'} ${String(i).padStart(2, '0')}`, dateOfBirth: '1980-01-01', codiceFiscale: null, sex: i % 2 ? 'M' : 'F', medicalRecordNumber: `QA-${i}`, email: null, phone: null }));
let scenario = 'slow'; let started = 0; let calls = []; let metrics = {}; let errors = []; let selected = '';
window.addEventListener('error', e => errors.push(e.message));
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
function response(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
function wait(ms, signal, ignoreAbort = false) {
  return new Promise((resolve, reject) => {
    const fail = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', fail); resolve(); }, ms);
    if (!ignoreAbort) { if (signal?.aborted) fail(); else signal?.addEventListener('abort', fail, { once: true }); }
  });
}
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.origin); const path = url.pathname.replace('/synthetic-api', '');
  const params = init?.body ? JSON.parse(String(init.body)) : Object.fromEntries(url.searchParams);
  const method = init?.method ?? 'GET';
  calls.push({ path, method, at: Math.round(performance.now() - started) });
  if (path === '/ai/extraction/status') { await wait(1600, init?.signal); return response({ available: scenario !== 'ai-error', errors: [], model: 'synthetic' }, scenario === 'ai-error' ? 503 : 200); }
  if (path === '/patients/settings') return response({ deleteEnabled: false });
  if (path === '/therapy-slots') { await wait(250, init?.signal); return response([]); }
  if (path === '/patients/page' || path === '/patients/page/search') {
    if (!metrics.requestMs) metrics.requestMs = Math.round(performance.now() - started);
    await wait(params.q === 'Alfa' ? 1900 : params.q ? 100 : 700, init?.signal, params.q === 'Alfa');
    if (scenario === 'page-error') return response({}, 500);
    const filtered = scenario === 'empty' ? [] : rows.filter(p => (!params.sex || p.sex === params.sex) && (!params.q || p.lastName.toLowerCase().includes(params.q.toLowerCase())));
    const offset = params.cursor ? 50 : 0;
    return response({ items: filtered.slice(offset, offset + 50), hasMore: filtered.length > offset + 50, nextCursor: filtered.length > offset + 50 ? 'next' : null });
  }
  if (path === '/patients/clinical-summary') {
    await wait(1000, init?.signal);
    if (scenario === 'summary-error') return response({}, 500);
    return response(String(params.patientIds).split(',').map(patientId => ({ patientId, statoRicovero: 'ricoverato', hasCriticalVitals: patientId === 'synthetic-0', hasHighRisk: false, allergieCount: 0, consegneAperte: 0 })));
  }
  if (path === '/intake/drafts' && method === 'POST') return response({ id: 'synthetic-draft', status: 'draft', data: {}, currentStep: 1 });
  if (path === '/ai/uploads' && method === 'POST') return response({ id: 'synthetic-upload', status: 'created', documents: [], maxFiles: 10, maxTotalBytes: 25000000 });
  if (path.startsWith('/ai/uploads/') || path.startsWith('/intake/drafts/')) return response({ id: 'synthetic-draft', data: {}, status: 'draft', documents: [] });
  errors.push(`Unexpected ${method} ${path}`); return response({}, 404);
};

function Preview() {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [sex, setSex] = useState('tutti'); const [, tick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      if (open && started) {
        const button = document.querySelector('.ai-import-btn');
        if (button && metrics.buttonMs === undefined) {
          metrics.buttonMs = Math.round(performance.now() - started);
          metrics.buttonWidth = Math.round(button.getBoundingClientRect().width);
          metrics.buttonDisabledInitially = button.disabled;
        }
        if (document.querySelector('.patient-roster__row') && metrics.rowsMs === undefined) metrics.rowsMs = Math.round(performance.now() - started);
        if (document.querySelector('.patient-roster__row .alert-chip--red') && metrics.summaryMs === undefined) metrics.summaryMs = Math.round(performance.now() - started);
      }
      tick(t => t + 1);
    }, 20);
    return () => clearInterval(interval);
  }, [open]);
  return <main style={{ padding: 24, maxWidth: 1400, margin: 'auto' }}>
    <section style={{ padding: 12, background: '#dce7f6', marginBottom: 16 }}>
      <strong>Verifica locale · solo dati sintetici</strong>{' '}
      <label>Scenario <select aria-label="Scenario" defaultValue="slow" onChange={e => { scenario = e.target.value; }}><option value="slow">Rete lenta</option><option value="summary-error">Errore riepilogo</option><option value="ai-error">Errore servizio import</option><option value="page-error">Errore elenco</option><option value="empty">Elenco vuoto</option></select></label>{' '}
      <button onClick={() => { metrics = {}; calls = []; errors = []; started = performance.now(); setOpen(true); }}>Apri elenco</button>{' '}
      <button onClick={() => setOpen(false)}>Chiudi elenco</button>
      <pre id="qa-metrics" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify({ metrics, requests: calls, errors, selected })}</pre>
    </section>
    {open && <Suspense fallback={<p>Caricamento modulo…</p>}><PatientList totalPatients={52} ricerca={query} onRicercaChange={setQuery} filtroSesso={sex} onFiltroSessoChange={setSex} onSelect={p => { selected = p.id; tick(t => t + 1); }} operatorId="synthetic-operator" operatorRole="operatore" /></Suspense>}
  </main>;
}
createRoot(document.getElementById('root')).render(<Preview />);
