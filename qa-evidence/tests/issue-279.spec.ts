// #279 — filterRepeatedHeaders: header istituzionale in formato tabella markdown ripetuto su ogni
// pagina viene rimosso (banner assorbito, "numero nosografico" riconosciuto), contenuto clinico
// intatto. Logica backend pura: evidenza = suite unit header-filter eseguita dal test, resa come
// superficie QA (report HTML) fotografata da Playwright.
import { test } from '@playwright/test';
import { runBackendTest, showReport, reportDoc, expect } from '../helpers';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';

test('#279 header-filter: suite unit completa PASS (tabella-cella, nosografico, banner)', async ({
  page,
}) => {
  const r = runBackendTest('backend/src/ai/__tests__/header-filter.test.ts');

  // Log sanitizzato (solo TAP: nomi test e conteggi, nessun PHI).
  mkdirSync(`${OUT}/logs`, { recursive: true });
  writeFileSync(`${OUT}/logs/header-filter-tap.log`, r.out, 'utf8');

  const names = [...r.out.matchAll(/^ok \d+ - (.+)$/gm)].map((m) => m[1]);
  const new279 = names.filter((n) => n.includes('279'));

  await showReport(
    page,
    reportDoc(
      'Issue #279 — header-filter unit suite',
      [
        { k: 'Test file', v: 'backend/src/ai/__tests__/header-filter.test.ts' },
        { k: 'Esito processo', v: `exit code ${r.code}`, ok: r.code === 0 },
        { k: 'Test PASS', v: String(r.pass), ok: r.pass > 0 },
        { k: 'Test FAIL', v: String(r.fail), ok: r.fail === 0 },
        { k: 'Nuovi casi #279', v: new279.join('\n') || '(nessuno)', ok: new279.length >= 3 },
      ],
      'AC1 header tabella rimosso · AC2 contenuto clinico intatto · AC3 suite estesa PASS. ' +
        'Fixture sintetiche, nessun dato reale.',
    ),
  );

  await expect(page.getByText('Test FAIL')).toBeVisible();
  await page.screenshot({ path: `${OUT}/screenshots/279-header-filter-suite.png`, fullPage: true });

  expect(r.code, `header-filter suite exit code — TAP:\n${r.out.slice(-2000)}`).toBe(0);
  expect(r.fail).toBe(0);
  expect(r.pass).toBeGreaterThanOrEqual(20);
  expect(new279.length).toBeGreaterThanOrEqual(3);
});
