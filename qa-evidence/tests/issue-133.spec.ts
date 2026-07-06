import { test, expect, showReport, reportDoc, runCmd } from '../harness';

// #133 CI browser-e2e drift — the fix is static (CI workflow + e2e assertion). Evidence: the workflow
// now targets 127.0.0.1, asserts the runtime job call, and the e2e script is syntactically valid.
test('#133 CI browser-e2e runtime reachability', async ({ page }) => {
  const wf = runCmd('grep -c "http://127.0.0.1:8000" .github/workflows/ai-import-e2e.yml');
  const stale = runCmd('grep -c "http://localhost:8000" .github/workflows/ai-import-e2e.yml');
  const jobAssert = runCmd('grep -c "/v1/document-jobs" .github/workflows/ai-import-e2e.yml');
  const syntax = runCmd('node --check e2e/import-happy-path.mjs');
  const assertCreated = runCmd('grep -c "ASSERT FAILED: patient not created" e2e/import-happy-path.mjs');

  expect(Number(wf.out.trim())).toBeGreaterThanOrEqual(2);
  expect(Number(stale.out.trim())).toBe(0);
  expect(Number(jobAssert.out.trim())).toBeGreaterThanOrEqual(1);
  expect(syntax.code).toBe(0);
  expect(Number(assertCreated.out.trim())).toBeGreaterThanOrEqual(1);

  await showReport(
    page,
    reportDoc(
      '#133 CI browser-e2e — runtime mock reachability',
      [
        { k: 'AC1 endpoint 127.0.0.1 nel workflow', v: `${wf.out.trim()} occorrenze`, ok: Number(wf.out.trim()) >= 2 },
        { k: 'localhost:8000 residui', v: stale.out.trim(), ok: Number(stale.out.trim()) === 0 },
        { k: 'AC2 assert chiamata /v1/document-jobs', v: `${jobAssert.out.trim()} occorrenze`, ok: Number(jobAssert.out.trim()) >= 1 },
        { k: 'AC4 assert creazione paziente', v: `presente: ${Number(assertCreated.out.trim()) >= 1}`, ok: Number(assertCreated.out.trim()) >= 1 },
        { k: 'node --check e2e', v: `exit ${syntax.code}`, ok: syntax.code === 0 },
        { k: 'AC5 job API-level gate', v: 'invariato (localhost→127.0.0.1 più sicuro)', ok: undefined },
        { k: 'Root cause', v: 'runtime bind 0.0.0.0 (IPv4) vs Node localhost→::1 → ECONNREFUSED', ok: undefined },
      ],
      'Prova d\'esecuzione end-to-end del workflow = run su GitHub Actions (Codex gate). Qui: verifica statica del fix.',
    ),
  );
  await expect(page.getByText('#133 CI browser-e2e')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
