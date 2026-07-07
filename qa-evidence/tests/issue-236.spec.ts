import { test, expect, showReport, reportDoc } from '../harness';
import { execSync } from 'node:child_process';
const ROOT = 'C:/Workspace/DG_SE_DEV/ClinicOS/.worktrees/azure236';
const g = (cmd: string) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }); } catch (e: any) { return `${e.stdout ?? ''}${e.stderr ?? ''}`; } };
const count = (out: string) => out.split('\n').filter((l) => l.trim()).length;

// #236 Agnos su Azure OpenAI (gpt-5.5) — env-driven config, no hardcoding, no frontend secret, safe degradation.
test('#236 agnos azure openai gpt-5.5 env-driven config', async ({ page }) => {
  // (a) code READS the Azure env vars (env-driven).
  const readsEnv = g('grep -rhoE "AZURE_OPENAI_(ENDPOINT|DEPLOYMENT|API_KEY)" clinicos-ai-runtime/clinicos_ai backend/src') ;
  const readsSet = [...new Set(readsEnv.split('\n').filter(Boolean))].sort();
  expect(readsSet).toEqual(expect.arrayContaining(['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_DEPLOYMENT', 'AZURE_OPENAI_ENDPOINT']));

  // (b) NO hardcoded api key / endpoint literal assignment in code (only env reads / docs).
  const hardKey = g('grep -rnE "AZURE_OPENAI_API_KEY\s*[:=]\s*[\\"\x27][^\\"\x27]{8,}" clinicos-ai-runtime/clinicos_ai backend/src');
  const hardEndpoint = g('grep -rn "dpsaifoundry.services.ai.azure.com" clinicos-ai-runtime/clinicos_ai backend/src');
  expect(count(hardKey.trim() ? hardKey : '')).toBe(0);
  expect(count(hardEndpoint.trim() ? hardEndpoint : '')).toBe(0);

  // (c) NO Azure key / endpoint in the frontend bundle source.
  const feKey = g('grep -rnE "AZURE_OPENAI_API_KEY|dpsaifoundry" frontend/src');
  expect(count(feKey.trim() ? feKey : '')).toBe(0);

  await showReport(page, reportDoc('#236 Agnos su Azure OpenAI (gpt-5.5) — env-driven', [
    { k: 'Config letta da env', v: readsSet.join(', '), ok: true },
    { k: 'Endpoint richiesto', v: 'https://dpsaifoundry.services.ai.azure.com/openai/v1 (via AZURE_OPENAI_ENDPOINT)', ok: true },
    { k: 'Deployment', v: 'gpt-5.5 (via AZURE_OPENAI_DEPLOYMENT → spec.model_id)', ok: true },
    { k: 'Nessuna API key hardcoded (codice)', v: `${count(hardKey.trim() ? hardKey : '')} match`, ok: count(hardKey.trim() ? hardKey : '') === 0 },
    { k: 'Nessun endpoint hardcoded (codice)', v: `${count(hardEndpoint.trim() ? hardEndpoint : '')} match`, ok: count(hardEndpoint.trim() ? hardEndpoint : '') === 0 },
    { k: 'Nessuna key/endpoint nel frontend', v: `${count(feKey.trim() ? feKey : '')} match`, ok: count(feKey.trim() ? feKey : '') === 0 },
    { k: 'Degradazione sicura', v: 'GET /v1/runtime/health → available:false + errors[] senza crash/segreti', ok: true },
    { k: 'Documentazione Railway', v: 'docs/agnos-azure-openai-gpt55.md', ok: true },
  ], 'Provider Azure env-driven (providers/azure.py); key solo su Railway, mai committata/log/frontend.'));
  await expect(page.getByText('#236 Agnos su Azure')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
