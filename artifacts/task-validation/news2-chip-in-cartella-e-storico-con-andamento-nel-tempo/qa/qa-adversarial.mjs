// QA adversarial (independent reviewer). Run from C:/w6.
import { chromium } from 'playwright';
const DIR = 'artifacts/task-validation/news2-chip-in-cartella-e-storico-con-andamento-nel-tempo/qa';
const BASE = 'http://localhost:4176';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=12')).json();
const A = roster.items[0];
const B = roster.items.find((p) => p.lastName !== A.lastName);
const nameOf = (p) => `${p.lastName}, ${p.firstName}`;
const full = { fr: '16', spo2: '97', o2: 'no', pa: '130/80', fc: '72', coscienza: 'A', temperatura: '36,8' };
const mk = (id, pid, iso, values) => ({ id, requestId: id, patientId: pid, measuredAt: iso, values, authorOperatorId: 'op1', authorName: 'Inf. QA', createdAt: iso });
const iso = (h) => new Date(Date.now() - h * 3600e3).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const high = { fr: '26', spo2: '90', o2: 'si', pa: '88/50', fc: '135', coscienza: 'V', temperatura: '39,5' };
const log = [];
const out = (k, v) => { log.push(k + ': ' + v); };
let mode = {};
const browser = await chromium.launch();
async function run(vp, fn) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', (e) => out('PAGEERROR', e.message));
  await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, async (route) => {
    const u = new URL(route.request().url());
    const pid = decodeURIComponent(u.pathname.split('/')[2]);
    const m = mode[pid] ?? { readings: [] };
    if (m.delay) await new Promise((r) => setTimeout(r, m.delay));
    if (m.status) return route.fulfill({ status: m.status, body: 'x' }).catch(() => {});
    if (u.searchParams.get('cursor')) {
      if (m.page2Delay) await new Promise((r) => setTimeout(r, m.page2Delay));
      if (m.page2Status) return route.fulfill({ status: m.page2Status, body: 'x' }).catch(() => {});
      return route.fulfill({ json: { readings: m.page2 ?? [], hasMore: false, nextCursor: null } }).catch(() => {});
    }
    return route.fulfill({ json: { readings: m.readings, hasMore: !!m.page2, nextCursor: m.page2 ? 'c2' : null } }).catch(() => {});
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await fn(page);
  await page.close();
}
async function open(page, p) {
  await page.locator('.topbar-search').click();
  await page.locator('.search-modal__input').fill(p.lastName);
  await page.waitForTimeout(700);
  await page.locator('.search-modal__results button', { hasText: nameOf(p) }).first().click();
  await page.locator('.patient-compact-header', { hasText: nameOf(p) }).first().waitFor();
}
const chipOf = (page) => page.locator('.patient-compact-header button.news2-chip');

mode = { [A.id]: { delay: 2500, readings: [mk('a1', A.id, iso(1), high)] }, [B.id]: { readings: [] } };
await run({ width: 1280, height: 900 }, async (page) => {
  await open(page, A);
  await page.waitForTimeout(300);
  await open(page, B);
  await page.waitForTimeout(3500);
  const h = await page.locator('.patient-compact-header').innerText();
  out('R1 switch A(slow,high)->B header has B', h.includes(nameOf(B)));
  out('R1 B chip after A response landed', (await chipOf(page).innerText()).trim());
});

mode = { [A.id]: { readings: [mk('p', A.id, iso(0.5), { spo2: '84', fc: '140' }), mk('s', A.id, iso(72), full)] } };
await run({ width: 1280, height: 900 }, async (page) => {
  await open(page, A); await page.waitForTimeout(1200);
  const c = chipOf(page);
  out('R2 stale(72h)+newer abnormal partial chip text', (await c.innerText()).trim());
  out('R2 chip class', await c.getAttribute('class'));
  out('R2 chip title', await c.getAttribute('title'));
  await page.locator('.patient-compact-header').screenshot({ path: DIR + '/R2-stale-chip.png' });
});

mode = { [A.id]: { status: 500 } };
await run({ width: 1280, height: 900 }, async (page) => {
  await open(page, A); await page.waitForTimeout(1200);
  const c = chipOf(page);
  out('R3 error chip', (await c.innerText()).trim() + ' disabled=' + (await c.isDisabled()));
  await c.click();
  await page.waitForTimeout(400);
  const d = page.locator('.news2-dialog');
  if (await d.count()) { out('R3 dialog text on error', (await d.innerText()).replace(/\s+/g, ' ').slice(0, 220)); await d.screenshot({ path: DIR + '/R3-error-dialog.png' }); }
});

mode = { [A.id]: { readings: [mk('q1', A.id, iso(1), { pa: '120/80' })], page2: [mk('q2', A.id, iso(5), high)], page2Status: 500 } };
await run({ width: 1280, height: 900 }, async (page) => {
  await open(page, A); await page.waitForTimeout(1200);
  out('R4 chip when complete reading only on page 2', (await chipOf(page).innerText()).trim());
  await chipOf(page).click();
  await page.getByRole('button', { name: 'Carica rilevazioni precedenti' }).click();
  await page.waitForTimeout(800);
  const d = await page.locator('.news2-dialog').innerText();
  out('R4 after page2 500: error message shown', /errore|non è possibile|riprova/i.test(d));
});

mode = { [A.id]: { readings: [mk('h1', A.id, iso(1), high), mk('h2', A.id, iso(8), full)] } };
for (const vp of [{ width: 1024, height: 800 }, { width: 390, height: 844 }]) {
  await run(vp, async (page) => {
    await open(page, A); await page.waitForTimeout(1200);
    const c = chipOf(page);
    const bb = await c.boundingBox();
    out('R5 ' + vp.width + ' chip visible/box', (await c.isVisible()) + ' ' + JSON.stringify(bb) + ' right=' + (bb.x + bb.width) + ' clipped=' + (await c.evaluate((el) => { const r = el.getBoundingClientRect(); let p = el.parentElement; while (p) { const q = p.getBoundingClientRect(); if (getComputedStyle(p).overflow !== 'visible' && (r.right > q.right + 0.5 || r.left < q.left - 0.5)) return true; p = p.parentElement; } return r.right > innerWidth; })) + ' text=' + (await c.innerText()).replace(/s+/g, ' '));
    out('R5 ' + vp.width + ' doc scrollWidth/innerWidth', await page.evaluate(() => document.documentElement.scrollWidth + '/' + window.innerWidth));
    await page.locator('.patient-compact-header').screenshot({ path: DIR + '/header-' + vp.width + '.png' });
    await c.click();
    const d = page.locator('.news2-dialog'); await d.waitFor();
    out('R5 ' + vp.width + ' dialog box', JSON.stringify(await d.boundingBox()));
    out('R5 ' + vp.width + ' dialog aria', await page.evaluate(() => { const el = document.querySelector('[role="dialog"]'); return el ? 'modal=' + el.getAttribute('aria-modal') + ' labelledbyResolves=' + !!document.getElementById(el.getAttribute('aria-labelledby')) : 'no role=dialog'; }));
    await d.screenshot({ path: DIR + '/dialog-' + vp.width + '.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    out('R5 ' + vp.width + ' Esc closes', (await d.count()) === 0);
    out('R5 ' + vp.width + ' focus returns to chip', await page.evaluate(() => !!document.activeElement?.classList.contains('news2-chip')));
  });
}

// R6: save-triggered refresh while load-more is in flight (slow page 2)
mode = { [A.id]: { readings: [mk('z1', A.id, iso(1), { pa: '120/80' })], page2: [mk('z2', A.id, iso(5), high)], page2Delay: 2500 } };
await run({ width: 1280, height: 900 }, async (page) => {
  await open(page, A); await page.waitForTimeout(1200);
  await chipOf(page).click();
  await page.getByRole('button', { name: 'Carica rilevazioni precedenti' }).click();
  await page.waitForTimeout(300);
  await page.evaluate((id) => window.dispatchEvent(new CustomEvent('clinicos:parameter-reading-saved', { detail: { patientId: id } })), A.id);
  await page.waitForTimeout(4000);
  const b = page.locator('.news2-dialog button', { hasText: /Carica|Caricamento/ });
  out('R6 load-more button after refresh aborted it', (await b.count()) ? (await b.innerText()) + ' disabled=' + (await b.isDisabled()) : 'absent');
  if (await b.count() && !(await b.isDisabled())) { await b.click(); await page.waitForTimeout(3500); out('R6 page-2 reading visible after retry', (await page.locator('.news2-dialog tbody tr').count())); }
  out('R6 chip', (await chipOf(page).innerText()).trim());
});
// R7: low risk (score 3, no single 3) 8h old -> RCP minimum monitoring 4-6h
mode = { [A.id]: { readings: [mk('l1', A.id, iso(8), { ...full, fc: '95', temperatura: '38,5', spo2: '95' })] } };
await run({ width: 1280, height: 900 }, async (page) => {
  await open(page, A); await page.waitForTimeout(1200);
  out('R7 low-risk score 8h old', (await chipOf(page).innerText()).trim() + ' [' + (await chipOf(page).getAttribute('class')) + ']');
});
await browser.close();
console.log(log.join('\n'));
