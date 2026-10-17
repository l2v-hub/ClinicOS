// Actual online demo proof. Standard TLS, normal UI login, no mock responses or saved tokens.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export const FRONTEND = 'https://clinicos-eosin.vercel.app';
export const BACKEND = 'https://clinicos-backend-demo.up.railway.app';

export function assertSafeTrace(tracePath, sessionToken) {
  const entries = execFileSync('unzip', ['-Z1', tracePath], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
    .trim()
    .split('\n');
  assert.ok(
    entries.some((entry) => entry.endsWith('.trace')),
    'ACTUAL_TRACE_REQUIRED',
  );
  for (const entry of entries.filter((e) => e.endsWith('.network'))) {
    assert.equal(
      execFileSync('unzip', ['-p', tracePath, entry], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      }).trim(),
      '',
      'TRACE_MUST_NOT_RECORD_NETWORK',
    );
  }
  for (const entry of entries.filter((e) => e.endsWith('.trace'))) {
    const text = execFileSync('unzip', ['-p', tracePath, entry], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.ok(!sessionToken || !text.includes(sessionToken), 'TRACE_SESSION_SECRET_REFUSED');
    assert.ok(
      !/"authorization"\s*:|bearer\s+[a-z\d._-]+/i.test(text),
      'TRACE_AUTHORIZATION_REFUSED',
    );
  }
  return true;
}
export async function verifyOnlineDemo({ chromium, outputDirectory, fetchImpl = fetch } = {}) {
  const directory = resolve(
    outputDirectory ?? 'artifacts/task-validation/maintenance-470/actual-online',
  );
  const parent = dirname(directory);
  await fs.mkdir(parent, { recursive: true });
  const staging = await fs.mkdtemp(join(parent, '.private-online-'));
  await fs.chmod(staging, 0o700);
  const failurePath = join(parent, basename(directory) + '-failure.json');
  const result = {
    frontend: FRONTEND,
    backend: BACKEND,
    online: true,
    patientPages: 0,
    emptyAfterReload: false,
    pageErrors: 0,
    consoleErrors: 0,
    httpErrors: [],
    sessionRevoked: false,
    networkTracing: false,
  };
  let browser,
    context,
    token,
    traceStarted = false,
    passed = false;
  const pending = [];
  try {
    const exists = await fs.access(directory).then(
      () => true,
      () => false,
    );
    assert.equal(exists, false, 'PUBLISHED_OUTPUT_ALREADY_EXISTS');
    const status = await fetchImpl(BACKEND + '/auth/status', {
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(status.status, 200);
    const auth = await status.json();
    assert.equal(auth.mode, 'demo');
    assert.equal(auth.simulator, true);
    const ready = await fetchImpl(BACKEND + '/ready', { signal: AbortSignal.timeout(15000) });
    assert.equal(ready.status, 200);
    const identities = await fetchImpl(BACKEND + '/auth/simulator/identities', {
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(identities.status, 200);
    const profile = (await identities.json()).identities.find((i) => i.id === 'SIM-ADMIN');
    assert.ok(profile);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: { dir: join(staging, 'video'), size: { width: 1280, height: 900 } },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('console', (m) => {
      if (m.type() === 'error') result.consoleErrors++;
    });
    page.on('pageerror', () => {
      result.pageErrors++;
    });
    page.on('response', (response) => {
      if (new URL(response.url()).origin !== BACKEND) return;
      const path = new URL(response.url()).pathname;
      if (response.status() >= 400)
        result.httpErrors.push({
          path: ['/auth/status', '/auth/me', '/patients/page', '/therapy-slots/page'].includes(path)
            ? path
            : '/other',
          status: response.status(),
        });
      if (path === '/patients/page' && response.ok())
        pending.push(
          response
            .json()
            .then((body) => {
              assert.ok(Array.isArray(body.items));
              assert.equal(body.items.length, 0);
              result.patientPages++;
            })
            .catch(() => {
              result.patientPageInvalid = true;
            }),
        );
    });
    await page.goto(FRONTEND + '/#/pazienti', { waitUntil: 'domcontentloaded' });
    const responsePromise = page.waitForResponse(
      (r) => r.url() === BACKEND + '/auth/simulator/session' && r.request().method() === 'POST',
    );
    const choice = page.locator('.login-sim__item').filter({ hasText: profile.name });
    await choice.waitFor({ state: 'visible' });
    assert.equal(await choice.count(), 1);
    await choice.click();
    const response = await responsePromise;
    assert.equal(response.status(), 201);
    token = (await response.json()).token;
    assert.ok(typeof token === 'string' && token.length > 0);
    const headers = { Authorization: 'Bearer ' + token };
    const me = await fetchImpl(BACKEND + '/auth/me', {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(me.status, 200);
    assert.ok((await me.json()).id);
    result.authenticatedUserVerified = true;
    const patients = await fetchImpl(BACKEND + '/patients/page?limit=1', {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patients.status, 200);
    const patientPage = await patients.json();
    assert.ok(Array.isArray(patientPage.items));
    assert.equal(patientPage.items.length, 0);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
    const therapy = await fetchImpl(BACKEND + '/therapy-slots/page?date=' + day + '&limit=1', {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(therapy.status, 200);
    const slots = await therapy.json();
    assert.ok(Array.isArray(slots.slots));
    assert.equal(slots.slots.length, 0);
    result.therapySlots = 0;
    await page.getByRole('heading', { name: 'Nessun paziente presente', exact: true }).waitFor();
    await Promise.all(pending);
    assert.ok(!result.patientPageInvalid);
    assert.ok(result.patientPages > 0);
    // Playwright1.61.1 starts HAR only when snapshots=true. False excludes request headers/bodies.
    await context.tracing.start({ screenshots: true, snapshots: false, sources: false });
    traceStarted = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Nessun paziente presente', exact: true }).waitFor();
    await Promise.all(pending);
    assert.ok(!result.patientPageInvalid);
    assert.ok(result.patientPages >= 2);
    assert.equal(result.pageErrors, 0);
    assert.equal(result.consoleErrors, 0);
    assert.equal(result.httpErrors.length, 0);
    result.emptyAfterReload = true;
    await page.screenshot({ path: join(staging, 'online-empty-patients.png'), fullPage: true });
    await context.tracing.stop({ path: join(staging, 'trace.zip') });
    traceStarted = false;
    assertSafeTrace(join(staging, 'trace.zip'), token);
    result.tracePrivacyVerified = true;
    passed = true;
    result.status = 'verified-empty-online';
  } catch {
    result.status = 'failed';
    result.failureCode = 'ACTUAL_ONLINE_VERIFICATION_FAILED';
  } finally {
    await Promise.allSettled(pending);
    if (traceStarted && context) await context.tracing.stop().catch(() => {});
    if (context)
      await context.close().catch(() => {
        passed = false;
        result.failureCode = 'BROWSER_FINALIZATION_FAILED';
      });
    if (browser)
      await browser.close().catch(() => {
        passed = false;
        result.failureCode = 'BROWSER_FINALIZATION_FAILED';
      });
    if (token)
      try {
        const response = await fetchImpl(BACKEND + '/auth/simulator/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          signal: AbortSignal.timeout(15000),
        });
        result.sessionRevoked = response.status === 204;
      } catch {}
    if (!result.sessionRevoked) {
      passed = false;
      result.failureCode = 'SESSION_REVOCATION_FAILED';
    }
    if (passed) {
      try {
        result.evidenceComplete = true;
        result.publicationVersion = 1;
        await fs.writeFile(
          join(staging, 'online-result.json'),
          JSON.stringify(result, null, 2) + '\n',
        );
        await assertPublishedBundle(staging);
        await fs.rm(failurePath, { force: true });
        await fs.rename(staging, directory);
        result.bundlePublished = true;
      } catch {
        passed = false;
        result.failureCode = 'EVIDENCE_PUBLICATION_FAILED';
      }
    }
    if (!passed) {
      result.status = 'failed';
      result.evidenceComplete = false;
      result.bundlePublished = false;
      await fs.rm(staging, { recursive: true, force: true });
      await fs.writeFile(
        failurePath,
        JSON.stringify(
          {
            status: 'failed',
            failureCode: result.failureCode ?? 'ACTUAL_ONLINE_VERIFICATION_FAILED',
            sessionRevoked: result.sessionRevoked,
            patientPages: result.patientPages,
            pageErrors: result.pageErrors,
            consoleErrors: result.consoleErrors,
            httpErrorCount: result.httpErrors.length,
          },
          null,
          2,
        ) + '\n',
      );
    }
  }

  return result;
}
export async function assertPublishedBundle(directory) {
  const result = JSON.parse(await fs.readFile(join(directory, 'online-result.json'), 'utf8'));
  assert.ok(
    result.status === 'verified-empty-online' &&
      result.sessionRevoked === true &&
      result.emptyAfterReload === true &&
      result.patientPages >= 2 &&
      result.pageErrors === 0 &&
      result.consoleErrors === 0 &&
      Array.isArray(result.httpErrors) &&
      result.httpErrors.length === 0 &&
      result.networkTracing === false &&
      result.tracePrivacyVerified === true &&
      result.evidenceComplete === true &&
      result.publicationVersion === 1,
    'COMPLETED_ONLINE_VERDICT_REQUIRED',
  );
  for (const file of ['online-result.json', 'online-empty-patients.png', 'trace.zip']) {
    const stat = await fs.lstat(join(directory, file));
    assert.ok(
      stat.isFile() && !stat.isSymbolicLink() && stat.size > 0,
      'COMPLETE_REGULAR_EVIDENCE_REQUIRED',
    );
  }
  const png = await fs.readFile(join(directory, 'online-empty-patients.png'));
  assert.ok(
    png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'PNG_EVIDENCE_REQUIRED',
  );
  assertSafeTrace(join(directory, 'trace.zip'));
  const videoRoot = join(directory, 'video');
  const videoStat = await fs.lstat(videoRoot);
  assert.ok(videoStat.isDirectory() && !videoStat.isSymbolicLink());
  const videos = await fs.readdir(videoRoot);
  assert.ok(videos.length > 0, 'VIDEO_EVIDENCE_REQUIRED');
  for (const file of videos) {
    assert.ok(/^[a-zA-Z0-9@._-]+\.webm$/.test(file));
    const stat = await fs.lstat(join(videoRoot, file));
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size > 4);
    const data = await fs.readFile(join(videoRoot, file));
    assert.ok(
      data.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])),
      'WEBM_EVIDENCE_REQUIRED',
    );
  }
  return true;
}

async function main() {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--check-published') {
      await assertPublishedBundle('artifacts/task-validation/maintenance-470/actual-online');
      console.log(JSON.stringify({ publishedEvidenceVerified: true }));
      return;
    }
    assert.equal(process.argv.length, 2);
    const { chromium } = await import(
      process.env.PLAYWRIGHT_MODULE_PATH
        ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href
        : 'playwright'
    );
    const report = await verifyOnlineDemo({ chromium });
    console.log(JSON.stringify(report));
    if (report.status !== 'verified-empty-online' || !report.sessionRevoked) process.exitCode = 1;
  } catch {
    console.error(JSON.stringify({ onlineDemoVerificationFailed: true }));
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
