// BUG-046 follow-up: isolate the ACTUAL extracted narrative text (excluding section UI chrome
// like the "Cartella clinica" section-name chip and Accetta/Modifica/Escludi buttons) and assert
// no anagraphic header bled into the clinical sections. Read-only; stops at review (no patient write).
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.PROD_URL ?? 'https://clinicos-eosin.vercel.app';
const pdf = process.argv[2];
const outDir = process.argv[3] ?? '.';

async function clickFirst(page, names) {
  for (const re of names) {
    const el = page.getByRole('button', { name: re }).first();
    try { if (await el.count() && await el.isVisible()) { await el.click(); return true; } } catch { /* */ }
    const t = page.getByText(re).first();
    try { if (await t.count() && await t.isVisible()) { await t.click(); return true; } } catch { /* */ }
  }
  return false;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
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

  let reached = false;
  for (let i = 0; i < 110; i++) {
    await page.waitForTimeout(2000);
    if (await page.locator('[data-testid="sections-review"]').count() || (await page.textContent('body') ?? '').includes('Crea paziente')) { reached = true; break; }
    if ((await page.textContent('body') ?? '').includes('non riuscita')) break;
  }
  await page.waitForTimeout(1200);

  // Pull the narrative-only text for each section: prefer a content/value node; strip the known
  // chrome tokens (section title chip + action buttons) so we test the EXTRACTED text, not the UI.
  async function narrative(testid) {
    const loc = page.locator(`[data-testid="${testid}"]`);
    if (!(await loc.count())) return '';
    // textContent of the whole section, then strip the leading chrome run before the markdown body.
    let txt = (await loc.textContent().catch(() => '')) ?? '';
    // Remove the source-footer and the leading UI chrome tokens.
    const chrome = ['Accetta', 'Modifica', 'Escludi', 'Confronta con la fonte', 'Cartella clinica', 'Anamnesi', 'Terapia a domicilio', 'Terapia'];
    // Keep only from the first markdown heading or first sentence onward.
    const bodyStart = txt.search(/##\s|Frase di prova|Farmaco/);
    let body = bodyStart >= 0 ? txt.slice(bodyStart) : txt;
    body = body.replace(/Fonte:.*$/s, '');
    return { full: txt, body };
  }

  const anam = await narrative('srev-ANAMNESIS');
  const ther = await narrative('srev-DISCHARGE_HOME_THERAPY');

  const headerTokens = /codice fiscale|RSSMRA50A01L000T|ROSSI MARIO|01\/01\/1950|Via di Prova|TEST-0001|Residenza|Nascita/i;

  const result = {
    reached,
    anamnesi_full_textContent: anam.full,
    anamnesi_narrative_body: anam.body,
    therapy_narrative_body: ther.body,
    // The real test: does the EXTRACTED narrative body contain anagraphic header tokens?
    anamnesi_body_hasHeaderToken: headerTokens.test(anam.body || ''),
    therapy_body_hasHeaderToken: headerTokens.test(ther.body || ''),
    // Specific header fields that BUG-046 was about (only meaningful in the narrative body):
    anamnesi_body_hasCodiceFiscaleValue: /RSSMRA50A01L000T/i.test(anam.body || ''),
    anamnesi_body_hasPatientName: /ROSSI MARIO/i.test(anam.body || ''),
    anamnesi_body_hasBirthDate: /01\/01\/1950/i.test(anam.body || ''),
    anamnesi_mergedBothPages: /pagina uno/i.test(anam.body || '') && /pagina due/i.test(anam.body || ''),
  };
  console.log(JSON.stringify(result, null, 2));
  await page.close();
} finally { await browser.close(); }
