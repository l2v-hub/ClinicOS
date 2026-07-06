import { test, expect, showReport, reportDoc, runBackendTest } from '../harness';

// #137 Agnos LLM planner — the planner's mode=llm path + deterministic fallback proven by its real
// test using a CONTROLLED FAKE planner (no live LLM credentials).
test('#137 Agnos planner LLM (controlled fake)', async ({ page }) => {
  const r = runBackendTest('backend/src/ai/__tests__/llm-planner.test.ts');
  expect(r.fail).toBe(0);
  expect(r.pass).toBeGreaterThan(0);

  await showReport(
    page,
    reportDoc(
      '#137 Agnos chatbot — planner LLM (fake provider controllato)',
      [
        { k: 'Test', v: 'backend/src/ai/__tests__/llm-planner.test.ts' },
        { k: 'Pass / Fail', v: `${r.pass} / ${r.fail}`, ok: r.fail === 0 && r.pass > 0 },
        { k: 'Provider', v: 'fake LLM controllato (deps iniettati) — nessuna credenziale live', ok: true },
        { k: 'mode=llm', v: 'intent enum, allowlist read, validate deny-by-default', ok: true },
        { k: 'Fallback deterministico', v: 'quando LLM assente/errore → planner deterministico', ok: true },
        { k: 'TAP', v: r.out.split('\n').filter((l) => /^(ok|not ok|# )/.test(l)).join('\n').slice(0, 1500) },
      ],
      'La classificazione intent via LLM è coperta da un provider fake controllato; il fallback deterministico resta garantito.',
    ),
  );
  await expect(page.getByText('#137 Agnos')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
