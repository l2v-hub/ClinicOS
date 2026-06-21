// BUG-049 (#71) file persistence + BUG-048 (#70) source compare — verified on the DEPLOYED app.
// Creates a SYNTHETIC patient via the real import (Crea paziente), verifies the imported file is
// persisted + served + linked to narrative sources, then DELETES the synthetic patient and confirms
// the cascade. Identifies the new patient by ID-DIFF (before vs after) so NO real patient name is
// ever read or shown. PHI-safe.
import { chromium } from 'playwright';

const URL = process.env.PROD_URL ?? 'https://clinicos-eosin.vercel.app';
const API = process.env.API_URL ?? 'https://clinicos-backend-production-df88.up.railway.app';
const pdf = process.argv[2];

const ids = async () => new Set((await (await fetch(`${API}/patients`)).json()).map((p) => p.id));
const out = (o) => console.log(JSON.stringify(o, null, 2));

async function clickFirst(page, names) {
  for (const re of names) {
    const el = page.getByRole('button', { name: re }).first();
    try { if (await el.count() && await el.isVisible()) { await el.click(); return true; } } catch { /* */ }
    const t = page.getByText(re).first();
    try { if (await t.count() && await t.isVisible()) { await t.click(); return true; } } catch { /* */ }
  }
  return false;
}

const before = await ids();
const browser = await chromium.launch();
let createdId = null;
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  await clickFirst(page, [/Pazienti/i]);
  await page.waitForTimeout(800);
  await clickFirst(page, [/Importa dimissione/i, /Importa lettera/i, /Importa/i]);
  await page.waitForTimeout(800);
  await page.setInputFiles('input[type=file][multiple]', [pdf]);
  await page.waitForTimeout(1000);
  await clickFirst(page, [/Avvia elaborazione/i]);
  for (let i = 0; i < 110; i++) {
    await page.waitForTimeout(2000);
    if (await page.locator('[data-testid="sections-review"]').count() || (await page.textContent('body') ?? '').includes('Crea paziente')) break;
  }
  // acknowledge the allergy checkbox if the review requires it, then create the patient
  try { const ack = page.locator('.srev-ack input[type=checkbox]'); if (await ack.count()) await ack.first().check(); } catch { /* */ }
  await clickFirst(page, [/Crea paziente/i]);
  // handle a possible duplicate confirmation
  await page.waitForTimeout(1500);
  await clickFirst(page, [/Conferma/i, /Crea comunque/i, /Procedi/i]);
  await page.waitForTimeout(3500);
  await page.close();
} finally { await browser.close(); }

// find the newly created patient by id-diff (no names read)
const after = await ids();
const created = [...after].filter((id) => !before.has(id));
createdId = created[0] ?? null;
report.createdNewPatient = created.length === 1;
report.createdId = createdId ? `${createdId.slice(0, 6)}…` : null;

if (createdId) {
  // BUG-049: imported file persisted + served
  const docs = await (await fetch(`${API}/patients/${createdId}/documents`)).json();
  report.documentsPersisted = Array.isArray(docs) ? docs.length : 0;
  const doc0 = Array.isArray(docs) && docs[0];
  if (doc0) {
    const c = await fetch(`${API}/patients/${createdId}/documents/${doc0.id}/content`);
    report.contentServedHttp = c.status;
    report.contentType = c.headers.get('content-type');
    report.docName = doc0.originalName;
  }
  // BUG-048: narrative sections carry sourceReferences (the compare target)
  const secs = await (await fetch(`${API}/patients/${createdId}/narrative-sections`)).json();
  const withSrc = (secs.sections ?? []).filter((s) => (s.sourceReferences ?? []).length > 0);
  report.sectionsWithSource = withSrc.map((s) => s.sectionKey);
  report.anamnesiPopulated = !!(secs.sections ?? []).find((s) => s.sectionKey === 'ANAMNESIS' && (s.displayText ?? '').trim());

  // CLEANUP: delete the synthetic patient, confirm cascade
  const del = await fetch(`${API}/patients/${createdId}`, { method: 'DELETE' });
  report.deleteHttp = del.status;
  await new Promise((r) => setTimeout(r, 1000));
  const after2 = await ids();
  report.patientGoneAfterDelete = !after2.has(createdId);
  const docsAfter = await fetch(`${API}/patients/${createdId}/documents`).then((r) => r.json()).catch(() => []);
  report.documentsGoneAfterDelete = !Array.isArray(docsAfter) || docsAfter.length === 0;
}
out(report);
