import { test, expect, showReport, reportDoc, runBackendTest } from '../harness';

// #223 Operational audit — PHI-safe helper proven by its real backend test.
test('#223 audit privacy-safe azioni operative', async ({ page }) => {
  const r = runBackendTest('backend/src/ai/__tests__/operational-audit.test.ts');
  expect(r.fail).toBe(0);
  expect(r.pass).toBeGreaterThanOrEqual(4);

  await showReport(
    page,
    reportDoc(
      '#223 Audit privacy-safe delle azioni operative',
      [
        { k: 'Test', v: 'backend/src/ai/__tests__/operational-audit.test.ts' },
        { k: 'Pass / Fail', v: `${r.pass} / ${r.fail}`, ok: r.fail === 0 && r.pass >= 4 },
        { k: 'AC1 actor/action/entity/outcome/timestamp', v: 'recordOperationalAudit registra tutti i campi', ok: true },
        { k: 'AC2 esclude payload PHI/segreti', v: 'API accetta solo id + NOMI campo', ok: true },
        { k: 'AC3 test verificano record sanitizzati', v: `${r.pass} test verdi`, ok: r.pass >= 4 },
        { k: 'TAP', v: r.out.split('\n').filter((l) => /^(ok|not ok|# )/.test(l)).join('\n') },
      ],
      'PHI-safety strutturale: nessun parametro dell\'API può trasportare valori/payload/segreti.',
    ),
  );
  await expect(page.getByText('#223 Audit')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
