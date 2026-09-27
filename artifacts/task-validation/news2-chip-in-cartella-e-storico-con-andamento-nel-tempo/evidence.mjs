// Evidenza browser del NEWS2: chip nella testata della cartella e storico con andamento.
// Rilevazioni simulate con page.route (lo stub :3001 non le implementa).
//   A — paziente con storico misto: il chip usa l'ultima COMPLETA (non la più recente parziale)
//   H — storico: grafico, sotto-punteggi, riga incompleta senza totale, dichiarazione
//   U — nuova rilevazione completa dal modulo della cartella → il chip si aggiorna da solo
//   N — paziente senza rilevazioni complete → "NEWS2 non calcolabile"
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/news2-chip-in-cartella-e-storico-con-andamento-nel-tempo';
const BASE = process.env.BASE ?? 'http://localhost:4176';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=12')).json();
const A = roster.items[0];
const others = roster.items.filter((p) => p.lastName !== A.lastName);
const N = others[0];
const S = others[1];
const E = others[2];
const M = others[3];
const L = others[4];
const R = others[5];
const nameOf = (p) => `${p.lastName}, ${p.firstName}`;
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const full = { fr: '16', spo2: '97', o2: 'no', pa: '130/80', fc: '72', coscienza: 'A', temperatura: '36,8' };
const mk = (id, patientId, iso, values) => ({ id, requestId: id, patientId, measuredAt: iso, values, authorOperatorId: 'op1', authorName: 'Inf. Test', createdAt: iso });
const now = Date.now();
const iso = (hAgo) => new Date(now - hAgo * 3600e3).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const store = {
  [A.id]: [
    mk('a1', A.id, iso(48), full),
    mk('a2', A.id, iso(30), { ...full, fc: '95', temperatura: '37,9' }),
    mk('a3', A.id, iso(20), { ...full, fr: '22', spo2: '93', fc: '104', temperatura: '38,3' }),
    mk('a4', A.id, iso(6), { ...full, fr: '24', spo2: '92', fc: '108', temperatura: '38,2' }),
    mk('a5', A.id, iso(1), { pa: '140/85', fc: '110' }),
  ],
  [N.id]: [mk('n1', N.id, iso(3), { pa: '120/80', spo2: '96' })],
  // S: unico NEWS2 completo di 72 h fa (0) e una rilevazione di 30 min fa con SpO₂ 84, FC 140
  [S.id]: [mk('s1', S.id, iso(72), full), mk('s2', S.id, iso(0.5), { spo2: '84', fc: '140' })],
  // M: prima pagina ok, la seconda fallisce
  [M.id]: [mk('m1', M.id, iso(2), full)],
};
store[L.id] = [mk('l1', L.id, iso(8), { ...full, fc: '95' })]; // NEWS2 1, 8 h fa
store[R.id] = [mk('r1', R.id, iso(0.2), full)];
const FAIL = new Set([E.id]);
let slowCursor = false;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, async (route) => {
  const req = route.request();
  const pid = decodeURIComponent(new URL(req.url()).pathname.split('/')[2]);
  const list = (store[pid] ??= []);
  if (req.method() === 'POST') {
    const b = JSON.parse(req.postData());
    const r = mk(`x${list.length}`, pid, b.measuredAt, b.values);
    r.requestId = b.requestId;
    list.push(r);
    return route.fulfill({ status: 201, json: { reading: r, summary: { date: b.measuredAt.slice(0, 10), count: list.length, noteCount: 0, lastReadingAt: b.measuredAt } } });
  }
  if (FAIL.has(pid)) return route.fulfill({ status: 500, json: { error: 'errore' } });
  const sorted = [...list].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  if (pid === R.id && new URL(req.url()).searchParams.get('cursor')) {
    slowCursor = true;
    await new Promise((r) => setTimeout(r, 3000));
    return route.fulfill({ json: { readings: [], hasMore: false, nextCursor: null } }).catch(() => {});
  }
  if (pid === R.id) return route.fulfill({ json: { readings: [...list], hasMore: true, nextCursor: 'r2' } });
  if (pid === M.id) {
    if (new URL(req.url()).searchParams.get('cursor'))
      return route.fulfill({ status: 500, json: { error: 'errore' } });
    return route.fulfill({ json: { readings: sorted, hasMore: true, nextCursor: 'c2' } });
  }
  return route.fulfill({ json: { readings: sorted, hasMore: false, nextCursor: null } });
});
async function open(p) {
  await page.locator('.topbar-search').click();
  await page.locator('.search-modal__input').fill(p.lastName);
  await page.waitForTimeout(800);
  await page.locator('.search-modal__results button', { hasText: nameOf(p) }).first().click();
  await page.locator('.patient-compact-header', { hasText: nameOf(p) }).first().waitFor();
  await page.waitForTimeout(1200);
}
await page.goto(BASE);
await page.getByText('Operatore', { exact: true }).first().click();
await open(A);
const chip = page.locator('.patient-compact-header .news2-chip');
const chipText = (await chip.innerText()).trim();
check(
  'A: chip della rilevazione completa (6), segnato da aggiornare per la parziale più recente',
  /^NEWS2 6 · (\d\d\/\d\d )?\d\d:\d\d · da aggiornare$/.test(chipText),
  chipText,
);
check('A: chip rosso per rischio medio', (await chip.getAttribute('class')).includes('news2-chip--medium'));
await page.locator('.patient-compact-header').screenshot({ path: `${DIR}/screenshots/A-chip-testata.png` });

await chip.click();
const dialog = page.locator('.news2-dialog');
await dialog.waitFor();
const dtext = await dialog.innerText();
check('H: valutazione attuale con risposta clinica', /NEWS2 6/.test(dtext) && /Valutazione medica urgente/.test(dtext));
check('H: grafico con 4 punti (solo rilevazioni complete)', (await dialog.locator('.news2-chart__dot').count()) === 4);
check('H: 5 righe nello storico, la parziale segnata incompleta senza totale', (await dialog.locator('tbody tr').count()) === 5 && (await dialog.locator('.news2-table__row--incomplete').count()) === 1 && /Incompleta · mancano FR, SpO₂, O₂, Coscienza, TC/.test(dtext));
check('H: sotto-punteggi visibili (+2 FR a 24)', (await dialog.locator('.news2-part').count()) > 0 && /24\+2/.test(dtext.replace(/\s/g, '')));
check('H: dichiarazione su scala SpO₂ e supporto alla decisione', /scala SpO₂ 1/.test(dtext) && /non sostituisce la valutazione clinica/.test(dtext));
await dialog.screenshot({ path: `${DIR}/screenshots/H-storico.png` });
await dialog.getByRole('button', { name: 'Chiudi' }).click();

// U — nuova rilevazione completa (NEWS2 0) dal modulo della cartella
await page.getByRole('tab', { name: /^Clinica/ }).first().click();
await page.getByRole('tab', { name: /^Parametri Vitali/ }).first().click();
await page.getByLabel('Nuova rilevazione FR').waitFor({ timeout: 15000 });
for (const [label, v] of [['PA', '125/80'], ['SpO₂', '97'], ['FC', '70'], ['FR', '16'], ['TC', '36,6']]) await page.getByLabel(`Nuova rilevazione ${label}`).fill(v);
await page.getByLabel('Nuova rilevazione O₂').selectOption('no');
await page.getByLabel('Nuova rilevazione Coscienza').selectOption('A');
await page.getByRole('button', { name: 'Salva rilevazione' }).click();
await page.waitForTimeout(2000);
const after = (await chip.innerText()).trim();
check(
  'U: dopo il salvataggio il chip passa a NEWS2 0 senza ricaricare',
  /^NEWS2 0 · \d\d:\d\d$/.test(after) &&
    (await chip.getAttribute('class')).includes('news2-chip--ok'),
  after,
);

// N — nessuna rilevazione completa
await open(N);
const n = (await page.locator('.patient-compact-header .news2-chip').innerText()).trim();
check('N: paziente senza rilevazioni complete → non calcolabile', n === 'NEWS2 non calcolabile', n);
await page.locator('.patient-compact-header .news2-chip').click();
const nd = await page.locator('.news2-dialog').innerText();
check('N: lo storico spiega perché', /il NEWS2 non è calcolabile/.test(nd) && (await page.locator('.news2-chart').count()) === 0);

// S — punteggio vecchio e rassicurante con rilevazioni più recenti incomplete: mai verde.
await page.keyboard.press("Escape");
await open(S);
const sChip = page.locator(".patient-compact-header .news2-chip");
const sText = (await sChip.innerText()).trim();
const sClass = await sChip.getAttribute("class");
check(
  'S: NEWS2 0 di 72 h fa mostrato con data e "da aggiornare", non verde',
  /^NEWS2 0 · \d\d\/\d\d \d\d:\d\d · da aggiornare$/.test(sText) &&
    sClass.includes("news2-chip--stale") &&
    !sClass.includes("news2-chip--ok"),
  `${sText} [${sClass}]`,
);
await sChip.click();
const sd = await page.locator(".news2-dialog").innerText();
check(
  "S: lo storico spiega che ci sono rilevazioni più recenti incomplete",
  /Da aggiornare: dopo questa c'è 1 rilevazione incompleta/.test(sd),
);
await page
  .locator(".patient-compact-header")
  .screenshot({ path: `${DIR}/screenshots/S-chip-da-aggiornare.png` });
await page
  .locator(".news2-dialog")
  .getByRole("button", { name: "Chiudi" })
  .click();

// E — errore di caricamento: mai "nessuna rilevazione".
await open(E);
const eChip = page.locator(".patient-compact-header .news2-chip");
check(
  'E: chip "NEWS2 non caricato"',
  (await eChip.innerText()).trim() === "NEWS2 non caricato",
);
await eChip.click();
await page.waitForTimeout(800);
const ed = await page.locator(".news2-dialog").innerText();
check(
  "E: lo storico dice che il caricamento non è riuscito, non che mancano rilevazioni",
  /Non è stato possibile caricare le rilevazioni/.test(ed) &&
    !/Nessuna rilevazione/.test(ed) &&
    !/non è calcolabile/.test(ed) &&
    (await page
      .locator(".news2-dialog")
      .getByRole("button", { name: "Riprova" })
      .count()) === 1,
);
await page
  .locator(".news2-dialog")
  .screenshot({ path: `${DIR}/screenshots/E-errore.png` });
await page
  .locator(".news2-dialog")
  .getByRole("button", { name: "Chiudi" })
  .click();

// M — la pagina precedente fallisce: messaggio visibile, niente errore silenzioso.
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
await open(M);
await page.locator(".patient-compact-header .news2-chip").click();
await page
  .locator(".news2-dialog")
  .getByRole("button", { name: /Carica rilevazioni precedenti/ })
  .click();
await page.waitForTimeout(1000);
const md = await page.locator(".news2-dialog").innerText();
check(
  "M: errore sulle rilevazioni precedenti mostrato, nessuna eccezione non gestita",
  /Caricamento delle rilevazioni precedenti non riuscito/.test(md) &&
    pageErrors.length === 0,
  JSON.stringify(pageErrors),
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
// R7 — NEWS2 1 di 8 ore fa: oltre la frequenza RCP per 1–4 (4–6 h) → da aggiornare.
await open(L);
const lText = (await page.locator('.patient-compact-header .news2-chip').innerText()).trim();
check('R7: punteggio 1–4 di 8 h fa segnato da aggiornare', /^NEWS2 1 · .* · da aggiornare$/.test(lText), lText);

// R6 — un aggiornamento dopo un salvataggio mentre "carica precedenti" è in corso: il pulsante
// non resta bloccato su "Caricamento…".
await open(R);
await page.locator('.patient-compact-header .news2-chip').click();
await page.locator('.news2-dialog').getByRole('button', { name: /Carica rilevazioni precedenti/ }).click();
await page.waitForTimeout(300);
await page.evaluate((id) => window.dispatchEvent(new CustomEvent('clinicos:parameter-reading-saved', { detail: { patientId: id } })), R.id);
await page.waitForTimeout(1500);
const moreBtn = page.locator('.news2-dialog').getByRole('button', { name: /Carica rilevazioni precedenti|Caricamento/ });
check('R6: dopo l\u2019aggiornamento il pulsante torna utilizzabile', slowCursor && (await moreBtn.count()) === 1 && !(await moreBtn.isDisabled()) && /Carica rilevazioni precedenti/.test(await moreBtn.innerText()));
await page.keyboard.press('Escape');

// P — telefono 390 px: l'etichetta più lunga ("… · da aggiornare") resta intera e visibile.
{
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, async (route) => {
    const pid = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[2]);
    const list = [...(store[pid] ?? [])].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    return route.fulfill({ json: { readings: list, hasMore: false, nextCursor: null } });
  });
  await phone.goto(`${BASE}/#/dettaglio-paziente/${S.id}`);
  await phone.getByText('Operatore', { exact: true }).first().click().catch(() => {});
  const pchip = phone.locator('.patient-compact-header button.news2-chip');
  await pchip.waitFor({ timeout: 15000 });
  await phone.waitForTimeout(800);
  const m = await pchip.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const header = el.closest('.patient-compact-header').getBoundingClientRect();
    return { right: Math.round(r.right), headerRight: Math.round(header.right), vw: window.innerWidth, clipped: el.scrollWidth > el.clientWidth + 1, text: el.innerText };
  });
  check('P: a 390 px il chip "da aggiornare" è intero e dentro lo schermo', /da aggiornare/.test(m.text) && m.right <= m.vw && m.right <= m.headerRight && !m.clipped, JSON.stringify(m));
  await phone.locator('.patient-compact-header').screenshot({ path: `${DIR}/screenshots/P-chip-390.png` });
  await phone.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
