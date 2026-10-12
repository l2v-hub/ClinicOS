import { chromium } from 'playwright';
const b = await chromium.launch();
const out = 'artifacts/task-validation/445-turno-infermiere-somministra-sul-posto/screenshots';
for (const role of ['Medico 1', 'OSS 1', 'Supervisore 1']) {
  const p = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  const errs = [];
  p.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/Failed to load resource/.test(m.text()) &&
      errs.push(m.text().slice(0, 120)),
  );
  await p.goto('http://127.0.0.1:5211');
  await p
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await p.waitForSelector('.teams-sidebar');
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => ({
    title: document.querySelector('h1, .page-header__title')?.textContent?.trim(),
    somministra: [...document.querySelectorAll('button')].filter((x) =>
      /^Somministra/.test(x.textContent.trim()),
    ).length,
    blocks: document.querySelectorAll('.adesso-dose__block').length,
    chips: [...document.querySelectorAll('.turno-action-chip')].map((c) => c.textContent.trim()),
    crash: /Qualcosa è andato storto|Errore imprevisto/.test(document.body.innerText),
  }));
  console.log(role, JSON.stringify(r), 'console errors:', errs.length, errs[0] ?? '');
  await p.screenshot({ path: `${out}/ruolo-${role.replace(' ', '-').toLowerCase()}.png` });
}
await b.close();
