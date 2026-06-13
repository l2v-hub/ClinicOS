// Measure left-edge offsets of nav + content across ClinicOS pages.
import { chromium } from 'playwright';
const FRONTEND = 'http://localhost:5173';
const VP = { width: 1366, height: 768 };

async function measurePage(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main.page-content') || document.querySelector('.content-panel');
    const cs = main ? getComputedStyle(main) : null;
    const L = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return Math.round(el.getBoundingClientRect().left);
    };
    return {
      mainPadLeft: cs ? cs.paddingLeft : null,
      mainLeft: main ? Math.round(main.getBoundingClientRect().left) : null,
      level2: L('.top-nav--level2'),
      level3: L('.top-nav--level3'),
      pageHeader: L('.page-header'),
      breadcrumb: L('.page-header__breadcrumb'),
      title: L('.page-header__title'),
      // first generic content block candidates
      clinicalTable: L('.clinical-table, .clinical-table-section, .ct-wrap, table'),
      firstCard: L('.clinical-card, .stat-card, .kpi-card, .card'),
      patientHeader: L('.patient-compact-header, .pch, .patient-record-view > *'),
    };
  });
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VP });
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);

  const out = {};
  const go = async (label, clicks) => {
    for (const c of clicks) { await page.getByText(c).first().click(); await page.waitForTimeout(1000); }
    out[label] = await measurePage(page);
  };
  out['Dashboard'] = await measurePage(page);
  await go('Pazienti', ['Pazienti']);
  await go('Detail', ['Moretti, Elena']);
  await go('Parametri', ['Parametri']);
  await go('Agenda', ['Agenda']);

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
run().catch(e => { console.error('MEASURE FAILED:', e.message); process.exit(1); });
