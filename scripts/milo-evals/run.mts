// Esegue le prove dei casi d'uso di Milo contro un sito (demo) e stampa l'esito per caso, con il
// percorso usato (classico o team) e le versioni delle competenze degli specialisti.
//
//   node --import tsx scripts/milo-evals/run.mts --site https://… --api https://… [--out dir] [--only id]
//        [--chromium /percorso/chromium]
//
// Accede con i profili simulati del sito (pulsanti di ruolo) e interroga `POST /ai/actions/plan`
// dalla pagina, con la sessione di quel profilo: sono solo letture e anteprime, non conferma nulla.
// Richiede Playwright (già presente nelle postazioni e nelle sessioni cloud).

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  MILO_EVAL_CASES,
  evaluateCase,
  summarize,
  type EvalResult,
} from '../../backend/src/ai/evals/milo-cases.js';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const site = arg('site');
const apiBase = arg('api');
const only = arg('only');
const out = arg('out');
if (!site || !apiBase) {
  console.error(
    'Uso: run.mts --site <url del sito> --api <url del backend> [--out dir] [--only id]',
  );
  process.exit(2);
}

const { chromium } = createRequire(import.meta.url)('playwright');
const cases = MILO_EVAL_CASES.filter((c) => !only || c.id === only);
// Se la versione di Playwright del progetto non trova il suo browser, indica un Chromium già
// installato: --chromium <percorso> oppure MILO_EVALS_CHROMIUM.
const executablePath = arg('chromium') ?? process.env.MILO_EVALS_CHROMIUM;
const browser = await chromium.launch(
  executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
);
const results: Array<EvalResult & { seconds: number; role: string }> = [];
const raw: Record<string, unknown> = {};

try {
  for (const role of [...new Set(cases.map((c) => c.role))]) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    let auth: string | null = null;
    page.on('request', (r: { url(): string; headers(): Record<string, string> }) => {
      const header = r.headers().authorization;
      if (r.url().startsWith(apiBase) && header) auth = header;
    });
    await page.goto(site, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.locator('button', { hasText: role }).first().click();
    for (let i = 0; i < 40 && !auth; i += 1) await page.waitForTimeout(500);
    if (!auth) throw new Error(`Accesso non riuscito con il profilo «${role}»`);

    for (const testCase of cases.filter((c) => c.role === role)) {
      const started = Date.now();
      const response = await page.evaluate(
        async ([base, authorization, text]: string[]) => {
          const r = await fetch(`${base}/ai/actions/plan`, {
            method: 'POST',
            headers: { Authorization: authorization, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, channel: 'testo' }),
          });
          let body: unknown = null;
          try {
            body = await r.json();
          } catch {
            /* risposta senza corpo */
          }
          return { status: r.status, body };
        },
        [apiBase, auth, testCase.question],
      );
      // Un rifiuto del ruolo arriva anche come 403: per le prove è un rifiuto a tutti gli effetti.
      const body =
        response.status === 403
          ? { plan: { actionType: 'refuse_forbidden' }, preview: { refusal: 'ruolo' }, read: null }
          : response.body;
      const seconds = Math.round((Date.now() - started) / 100) / 10;
      const result = evaluateCase(testCase, body, { seconds });
      results.push({ ...result, seconds, role });
      raw[testCase.id] = response;
      console.log(
        `${result.pass ? 'OK' : 'KO'}  ${testCase.id}  ${role}  ${results[results.length - 1].seconds}s`,
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${summarize(results)}`);
const skills = results.find((r) => r.skills)?.skills;
if (skills)
  console.log(
    `Competenze: ${Object.entries(skills)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
  );
if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/milo-evals.json`,
    JSON.stringify({ site, ranAt: new Date().toISOString(), results }, null, 2),
  );
  writeFileSync(`${out}/milo-evals-responses.json`, JSON.stringify(raw, null, 2));
}
process.exit(results.every((r) => r.pass) ? 0 : 1);
