import { chromium } from 'playwright';
const FRONTEND = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
await page.getByText('Operatore', { exact: true }).click();
await page.waitForTimeout(1500);
await page.getByText('Pazienti').first().click();
await page.waitForTimeout(1000);
await page.getByText('Moretti, Elena').first().click();
await page.waitForTimeout(1200);
const data = await page.evaluate(() => {
  const L = (sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(el.getBoundingClientRect().left) : null;
  };
  const pad = (sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).padding : null;
  };
  return {
    main: L('main.page-content'),
    mainPad: pad('main.page-content'),
    recordView: L('.patient-record-view'),
    recordViewPad: pad('.patient-record-view'),
    compactHeader: L('.patient-compact-header'),
    compactHeaderPad: pad('.patient-compact-header'),
    level2: L('.top-nav--level2'),
    level2item: L('.top-nav--level2 .top-nav__item'),
    level3: L('.top-nav--level3'),
    level3item: L('.top-nav--level3 .top-nav__item'),
    crLayout: L('.cr-detail-layout'),
    crLayoutPad: pad('.cr-detail-layout'),
    crContent: L('.cr-detail-content'),
    crContentPad: pad('.cr-detail-content'),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
