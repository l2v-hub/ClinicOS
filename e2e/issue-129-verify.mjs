// Issue #129 — verifica ordinamento alfabetico stabile dei pazienti (cognome, nome)
// nelle 4 viste operative: Consegne, Parametri, Pazienti (presenti), Terapia da somministrare.
//
//   node e2e/issue-129-verify.mjs [outDir] [prefix]
//
// Richiede backend :3001 e frontend preview (default http://localhost:5175, override FRONTEND env).
// Estrae i nomi visualizzati in ogni vista, verifica l'ordine alfabetico normalizzato
// (locale it, insensibile a maiuscole/accenti), poi ricarica la pagina e ri-verifica
// una vista per confermare la coerenza dopo refresh. Exit code 1 se una verifica fallisce.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const FRONTEND = process.env.FRONTEND ?? 'http://localhost:5175';
const outDir = resolve(process.argv[2] ?? 'docs/qa/issues/129/final');
const prefix = process.argv[3] ?? 'after';
mkdirSync(outDir, { recursive: true });

const collator = new Intl.Collator('it', { sensitivity: 'base' });
const failures = [];

function checkOrder(view, names) {
  if (names.length < 2) {
    failures.push(`${view}: trovati solo ${names.length} pazienti — servono almeno 2 per la verifica`);
    return;
  }
  for (let i = 1; i < names.length; i++) {
    if (collator.compare(names[i - 1], names[i]) > 0) {
      failures.push(`${view}: ordine errato — "${names[i - 1]}" prima di "${names[i]}"`);
      return;
    }
  }
  console.log(`  OK ${view}: ${names.length} pazienti in ordine alfabetico`);
}

async function login(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle' });
  await page.click('.login-role-card--operatore');
  await page.waitForSelector('.teams-sidebar', { timeout: 10_000 });
  await page.waitForTimeout(800); // attesa fetch pazienti/consegne/slot
}

async function nav(page, title) {
  await page.click(`.teams-sidebar__item[title="${title}"]`);
  await page.waitForTimeout(600);
}

async function texts(page, selector) {
  return page.$$eval(selector, els => els.map(el => (el.childNodes[0]?.textContent ?? el.textContent ?? '').trim()));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.on('dialog', d => d.accept());

try {
  await login(page);

  // ── 1. Consegne ──────────────────────────────────────────────────────────
  await nav(page, 'Consegne');
  await page.waitForSelector('.consegna-paziente', { timeout: 10_000 });
  const consegne = await texts(page, '.consegna-paziente');
  console.log('Consegne:', consegne.join(' | '));
  await page.screenshot({ path: join(outDir, `${prefix}-consegne.png`), fullPage: true });
  // NB: le urgenti sono raggruppate in cima; qui i seed sono tutti "normale",
  // quindi la lista intera deve risultare alfabetica.
  checkOrder('consegne', consegne);

  // ── 2. Parametri ─────────────────────────────────────────────────────────
  await nav(page, 'Parametri');
  await page.waitForSelector('.qe-row__name', { timeout: 10_000 });
  const parametri = await texts(page, '.qe-row__name');
  console.log('Parametri:', parametri.join(' | '));
  await page.screenshot({ path: join(outDir, `${prefix}-parametri.png`), fullPage: true });
  checkOrder('parametri', parametri);

  // ── 3. Pazienti presenti ─────────────────────────────────────────────────
  await nav(page, 'Pazienti');
  await page.waitForSelector('.cell--name', { timeout: 10_000 });
  const pazienti = await texts(page, '.cell--name');
  console.log('Pazienti presenti:', pazienti.join(' | '));
  await page.screenshot({ path: join(outDir, `${prefix}-pazienti-presenti.png`), fullPage: true });
  checkOrder('pazienti presenti', pazienti);

  // ── 4. Terapia da somministrare (slot Agenda) ────────────────────────────
  await nav(page, 'Agenda');
  await page.waitForSelector('.agt-therapy-slot', { timeout: 10_000 });
  await page.click('.agt-therapy-slot'); // primo slot (Terapia Mattina)
  await page.waitForSelector('.therapy-patient-header', { timeout: 10_000 });
  const terapia = await texts(page, '.therapy-patient-header');
  console.log('Terapia da somministrare:', terapia.join(' | '));
  await page.screenshot({ path: join(outDir, `${prefix}-terapia.png`), fullPage: true });
  checkOrder('terapia da somministrare', terapia);

  // ── 5. Refresh → ri-verifica Parametri ──────────────────────────────────
  await login(page);
  await nav(page, 'Parametri');
  await page.waitForSelector('.qe-row__name', { timeout: 10_000 });
  const dopoRefresh = await texts(page, '.qe-row__name');
  console.log('Parametri dopo refresh:', dopoRefresh.join(' | '));
  await page.screenshot({ path: join(outDir, `${prefix}-parametri-refresh.png`), fullPage: true });
  checkOrder('parametri dopo refresh', dopoRefresh);
} catch (err) {
  failures.push(`Errore esecuzione: ${err.message}`);
  await page.screenshot({ path: join(outDir, `${prefix}-error.png`), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error('\nFAIL — issue #129:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\nPASS — issue #129: ordinamento alfabetico verificato nelle 4 viste (+ refresh).');
