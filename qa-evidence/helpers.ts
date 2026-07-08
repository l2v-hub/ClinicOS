import { Page, expect } from '@playwright/test';
import { execSync as _exec } from 'node:child_process';
import { readFileSync as _read } from 'node:fs';

const ROOT = 'C:/Workspace/DG_SE_DEV/ClinicOS';
const EVID = `${ROOT}/.worktrees/evidence`;
const TSX = `${ROOT}/node_modules/tsx/dist/cli.mjs`;

/** DATABASE_URL / flags from the evidence backend/.env, injected into child test processes. */
function backendEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of _read(`${EVID}/backend/.env`, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
  } catch { /* ignore */ }
  return env;
}

/** Run a shell command from the evidence worktree; capture combined output + exit code. */
export function runCmd(cmd: string): { code: number; out: string } {
  try {
    const out = _exec(cmd, { cwd: EVID, encoding: 'utf8', stdio: 'pipe', maxBuffer: 20 * 1024 * 1024, env: { ...process.env, ...backendEnv() } });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Run a backend node:test file via the repo's tsx and return its TAP output + pass/fail summary. */
export function runBackendTest(relTestPath: string): { code: number; out: string; pass: number; fail: number } {
  const r = runCmd(`node "${TSX}" --test "${relTestPath}"`);
  const pass = Number(/# pass (\d+)/.exec(r.out)?.[1] ?? '0');
  const fail = Number(/# fail (\d+)/.exec(r.out)?.[1] ?? '0');
  return { ...r, pass, fail };
}

// Pre-existing, unrelated dev warnings (not introduced by these features) are filtered so the guard
// asserts on genuine, feature-relevant errors only. The nested-<button> hydration warning originates
// in AIImportStatus on main.
const BENIGN = /favicon|sourcemap|\.map\b|net::ERR_ABORTED|ResizeObserver|cannot be a descendant|cannot contain a nested|hydration/i;

/** Wire console-error and HTTP-4xx/5xx guards on a page. Returns collectors + an assert helper.
 *  Only backend (:3001) responses count as relevant HTTP errors; benign noise is filtered. */
export function guard(page: Page) {
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !BENIGN.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.includes('localhost:3001') && !BENIGN.test(u)) {
      httpErrors.push(`${r.status()} ${u.slice(0, 120)}`);
    }
  });
  return {
    consoleErrors,
    httpErrors,
    assertClean() {
      expect(consoleErrors, `console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
      expect(httpErrors, `HTTP 4xx/5xx: ${JSON.stringify(httpErrors)}`).toEqual([]);
    },
  };
}

/** Land on the SPA and click past the role-selection gate. */
export async function enterAs(page: Page, role: 'Operatore' | 'Amministratore' = 'Operatore') {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByText(role, { exact: true }).first().click({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

/** Click a sidebar / visible-text nav item. */
export async function nav(page: Page, label: string) {
  await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(1000);
}

/** Render an arbitrary HTML string as a data: URL and return the page — a safe QA surface for
 *  backend/internal features that have no production UI. Nothing is written to the app. */
export async function showReport(page: Page, html: string) {
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
}

/** Minimal styled QA report document (light, print-clean) for backend evidence. */
export function reportDoc(title: string, rows: Array<{ k: string; v: string; ok?: boolean }>, note = ''): string {
  const body = rows
    .map(
      (r) =>
        `<tr><td class="k">${esc(r.k)}</td><td class="v">${esc(r.v)}</td><td class="s ${r.ok === false ? 'bad' : r.ok ? 'ok' : ''}">${
          r.ok === undefined ? '' : r.ok ? 'PASS' : 'FAIL'
        }</td></tr>`,
    )
    .join('');
  return `<!doctype html><meta charset=utf-8><title>${esc(title)}</title>
  <style>body{font:14px/1.5 system-ui,Segoe UI,Arial;margin:32px;color:#101828;background:#fff}
  h1{font-size:20px;color:#0F5FD7;margin:0 0 4px} .sub{color:#667085;margin:0 0 20px}
  table{border-collapse:collapse;width:100%;max-width:900px} td{border:1px solid #D0D5DD;padding:8px 12px;vertical-align:top}
  .k{font-weight:600;width:280px} .v{font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-word}
  .s{width:64px;text-align:center;font-weight:700} .ok{color:#067647} .bad{color:#DC2626}
  .note{margin-top:16px;color:#667085;max-width:900px}</style>
  <h1>${esc(title)}</h1><p class="sub">ClinicOS — QA evidence surface (synthetic data, dev-only) — ${new Date().toISOString()}</p>
  <table><tbody>${body}</tbody></table>${note ? `<p class="note">${esc(note)}</p>` : ''}`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export { expect };
