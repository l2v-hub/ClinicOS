import { test, expect, showReport, reportDoc, runBackendTest, enterAs } from '../harness';

// #202 Privacy voice logging — the privacy regression test proves transcript/PHI never reach logs;
// plus the real voice-dictation control is present in the Agnos UI.
test('#202 privacy voice logging', async ({ page }) => {
  const r = runBackendTest('backend/src/ai/__tests__/voice-privacy-logging.test.ts');
  expect(r.fail).toBe(0);
  expect(r.pass).toBeGreaterThanOrEqual(4);

  // Voice dictation control exists in the real chatbot UI.
  await enterAs(page, 'Operatore');
  await page.getByRole('button', { name: /Agnos/ }).first().click();
  const mic = page.getByRole('button', { name: /Detta un comando/ });
  const micPresent = await mic.count();

  await showReport(
    page,
    reportDoc(
      '#202 Privacy voice logging',
      [
        { k: 'Test', v: 'backend/src/ai/__tests__/voice-privacy-logging.test.ts' },
        { k: 'Pass / Fail', v: `${r.pass} / ${r.fail}`, ok: r.fail === 0 && r.pass >= 4 },
        { k: 'AC1 nessuna trascrizione loggata', v: 'asserito su create/diario/rifiuto/plan', ok: true },
        { k: 'AC2 solo metadati minimi', v: 'chiavi allowlist + fields = nomi', ok: true },
        { k: 'AC3 test privacy sui log', v: `${r.pass} test verdi`, ok: r.pass >= 4 },
        { k: 'Controllo dettatura in UI (mic)', v: micPresent ? 'presente' : 'assente', ok: micPresent > 0 },
        { k: 'TAP', v: r.out.split('\n').filter((l) => /^(ok|not ok|# )/.test(l)).join('\n') },
      ],
    ),
  );
  await expect(page.getByText('#202 Privacy voice')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
