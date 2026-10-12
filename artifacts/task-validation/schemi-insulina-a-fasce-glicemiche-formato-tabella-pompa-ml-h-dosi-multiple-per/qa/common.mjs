import { resolve } from 'node:path';
import { mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const SHOTS = resolve(ROOT, 'screenshots');
export const TRACE = resolve(ROOT, 'trace');
export const VIDEO = resolve(ROOT, 'video');
export const RESULTS = resolve(ROOT, 'test-results');
for (const d of [SHOTS, TRACE, VIDEO, RESULTS]) mkdirSync(d, { recursive: true });
export const FE = 'http://127.0.0.1:5197';
export const BE = 'http://127.0.0.1:3097';
export function guard(page, ignore = []) {
  const consoleErrors = [];
  const httpErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('response', (r) => {
    const line = `${r.status()} ${r.request().method()} ${r.url()}`;
    if (r.url().startsWith(BE) && r.status() >= 400 && !ignore.some((re) => re.test(line)))
      httpErrors.push(line);
  });
  return { consoleErrors, httpErrors };
}
export async function login(page, who, hash = '') {
  await page.goto(`${FE}/${hash}`);
  await page.getByRole('button', { name: new RegExp(`^${who}`) }).click();
}
export async function noHScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
export async function saveVideo(page, name) {
  const video = page.video();
  if (!video) return;
  try {
    renameSync(await video.path(), resolve(VIDEO, name));
  } catch {
    /* keep default name */
  }
}
export async function simToken(identityId) {
  const r = await fetch(`${BE}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityId }),
  });
  return (await r.json()).token;
}
