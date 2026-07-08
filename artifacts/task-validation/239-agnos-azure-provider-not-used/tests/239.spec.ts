import { test, expect } from '@playwright/test';

// Issue #239 — AC7 browser-level evidence against the LIVE production runtime (dopo fix).
// Il service token resta lato Node (mai nel browser): la spec chiama il runtime in Node,
// poi RENDER-izza i risultati in una pagina e ne cattura screenshot/trace/report.
const BASE = 'https://clinicos-ai-runtime-production.up.railway.app';
const TOKEN = process.env.PLAY_RUNTIME_TOKEN ?? '';
const TOOLS = [
  { name: 'search_patients', args: { query: 'string' } },
  { name: 'query_data', args: { plan: 'object' } },
];

async function plan(question: string) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/v1/assistant/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ question, toolSchema: TOOLS }),
  });
  const body = await res.json();
  return { status: res.status, ms: Date.now() - t0, model: body.model, intent: body.plan?.intent, tools: (body.plan?.tools ?? []).map((t: any) => t.tool) };
}

test('#239 Agnos usa Azure gpt-5.5 (produzione, dopo fix)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // 1) health: provider selezionato Azure
  const health = await (await fetch(`${BASE}/v1/runtime/health`)).json();
  expect(health.available).toBe(true);
  expect(health.roles.agent.model).toBe('azure:gpt-5.5');
  expect(health.roles.agent.credentials_present).toBe(true);

  // 2) chiamate reali ad Azure (AC2)
  const r1 = await plan('cerca il paziente Rossi');
  const r2 = await plan('quante camere sono occupate oggi');
  const r3 = await plan('Rispondi solo con OK-AZURE');
  for (const r of [r1, r2, r3]) { expect(r.status).toBe(200); expect(r.model).toBe('azure:gpt-5.5'); }
  expect(r1.intent).toBe('patient_search');
  expect(r1.tools).toContain('search_patients');
  expect(r2.intent).toBe('data_query');

  // 3) render report + screenshot
  const row = (q: string, r: any) => `<tr><td>${q}</td><td>HTTP ${r.status}</td><td><b>${r.model}</b></td><td>${r.intent}</td><td>${r.tools.join(', ') || '—'}</td><td>${r.ms}ms</td></tr>`;
  await page.setContent(`<!doctype html><meta charset="utf-8">
    <body style="font:15px system-ui;padding:28px;color:#101828">
    <h1 style="color:#0F5FD7">#239 — Agnos AI usa Azure OpenAI (gpt-5.5)</h1>
    <p>Runtime health: <b>agent = ${health.roles.agent.model}</b> · credentials_present = ${health.roles.agent.credentials_present} · available = ${health.available}</p>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr style="background:#E9EDF2"><th>Domanda</th><th>HTTP</th><th>model</th><th>intent</th><th>tools</th><th>durata</th></tr>
      ${row('cerca il paziente Rossi', r1)}${row('quante camere sono occupate oggi', r2)}${row('Rispondi solo con OK-AZURE', r3)}
    </table>
    <p style="margin-top:18px">Provider LLM effettivo: <b style="color:#0F5FD7">azure-openai / deployment gpt-5.5</b> — chiamate reali (latenza multi-secondo), nessun 4xx/5xx. Fix Railway: endpoint senza /openai/v1, api-version 2024-10-21, temperature 1.</p>
    <p id="verdict" style="font-weight:700;color:#0E8A16">VERDICT: Agnos AI raggiunge Azure OpenAI e produce piani reali.</p>
    </body>`);
  await expect(page.locator('#verdict')).toBeVisible();
  await expect(page.getByText('agent = azure:gpt-5.5')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/screenshots/final-agnos-azure-provider.png`, fullPage: true });
  expect(errors).toEqual([]);
});
