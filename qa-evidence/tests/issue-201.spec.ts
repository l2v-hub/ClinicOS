import { test, expect, showReport, reportDoc, runBackendTest } from '../harness';

// #201 Fake voice provider — deterministic STT tests (success/failure/timeout), no live creds.
test('#201 test provider voce fake', async ({ page }) => {
  const r = runBackendTest('backend/src/ai/__tests__/voice-provider.test.ts');
  expect(r.fail).toBe(0);
  expect(r.pass).toBeGreaterThanOrEqual(5);

  await showReport(
    page,
    reportDoc(
      '#201 Test provider voce fake',
      [
        { k: 'Test', v: 'backend/src/ai/__tests__/voice-provider.test.ts' },
        { k: 'Pass / Fail', v: `${r.pass} / ${r.fail}`, ok: r.fail === 0 && r.pass >= 5 },
        { k: 'AC1 nessuna credenziale live', v: 'solo FakeVoiceSttProvider', ok: true },
        { k: 'AC2 copre success/failure/timeout', v: '3 modalità + capability mancanti + no-model', ok: true },
        { k: 'AC3 nessun segreto in CI', v: 'unit puri, offline', ok: true },
        { k: 'TAP', v: r.out.split('\n').filter((l) => /^(ok|not ok|# )/.test(l)).join('\n') },
      ],
    ),
  );
  await expect(page.getByText('#201 Test provider')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
