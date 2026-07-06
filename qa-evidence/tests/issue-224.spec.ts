import { test, expect, showReport, reportDoc, runCmd } from '../harness';

// #224 No-secret frontend + bundle scan — run the real scanner: self-test, clean scan of source, and a
// positive-detection proof on a seeded secret.
test('#224 no secret frontend + scansione bundle', async ({ page }) => {
  const selfTest = runCmd('node scripts/security/scan-frontend-secrets.mjs --self-test');
  const scanSrc = runCmd('node scripts/security/scan-frontend-secrets.mjs frontend/src frontend/index.html');
  // Positive proof: a temp file with a seeded secret must be detected (exit 1).
  const seed = runCmd(
    'mkdir -p qa-evidence/_tmp && printf \'const k="sk-ABCDEF0123456789GHIJKLMN";\\nconst e=import.meta.env.AZURE_OPENAI_API_KEY;\\n\' > qa-evidence/_tmp/leak.ts && node scripts/security/scan-frontend-secrets.mjs qa-evidence/_tmp/leak.ts',
  );

  expect(selfTest.code).toBe(0);
  expect(scanSrc.code).toBe(0);        // frontend is clean
  expect(seed.code).toBe(1);           // seeded secret detected

  await showReport(
    page,
    reportDoc(
      '#224 No secret frontend e scansione bundle',
      [
        { k: 'Scanner self-test', v: selfTest.out.trim().split('\n').pop() ?? '', ok: selfTest.code === 0 },
        { k: 'AC1 scan frontend/src (esito)', v: `${scanSrc.out.trim().split('\n').pop()} (exit ${scanSrc.code})`, ok: scanSrc.code === 0 },
        { k: 'AC3 rilevamento (secret finto)', v: `exit ${seed.code} — atteso 1`, ok: seed.code === 1 },
        { k: 'Findings sul secret finto', v: seed.out.split('\n').filter((l) => /finding|\[/.test(l)).join('\n') },
        { k: 'AC2 bundle scan', v: 'gate CI builda e scandisce frontend/dist (workflow frontend-secret-scan.yml)', ok: undefined },
      ],
      'Il frontend non contiene segreti (0 findings); lo scanner rileva pattern comuni; il CI scandisce anche il bundle.',
    ),
  );
  await expect(page.getByText('#224 No secret')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
