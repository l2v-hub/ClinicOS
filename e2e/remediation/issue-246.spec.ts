import { test, expect, request as pwRequest } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Issue #246 remediation — Codex QA FAILED: the patient-documents endpoints
// (POST/GET /patients/:id/documents, GET /patients/:id/documents/:docId/content) had no
// authentication/authorization at all (anyone who knew/guessed a patientId/documentId could
// upload or read clinical document bytes) and trusted the client-declared MIME type instead of
// the actual file signature. Fix: requireOperator gate (backend/src/routes/patient-documents.ts)
// + magic-byte sniffing before persistence (sniffAllowedMime); frontend now sends
// X-Operator-Id/X-Operator-Role on every call and opens document bytes via an authenticated
// blob fetch instead of a plain <a href>/<img src>.
//
// This spec proves, against the real running stack:
//   (a) an authenticated operator can upload into each of the 3 sections (AC1/AC2/AC3), the
//       chip lands in — and survives a reload only in — its own section (AC4);
//   (b) an anonymous caller (no operator headers) is rejected with 401 on both upload and
//       content read (the security fix itself);
//   (c) camera permission denied does not block the upload — the file-picker fallback path
//       (the underlying <input type=file>) still completes it (AC5).
// Not run by the implementer (no local stack here) — executed later by the controller.

const API = process.env.CLINICOS_API ?? 'http://localhost:3001';
const PATIENT_ID = 'SEED-PAZ-008';
const PATIENT_LABEL = 'Moretti, Elena';
const OUT = join('..', '..', 'artifacts', 'task-validation', '246-photo-exams-rx-consults');
const KNOWN_PREEXISTING = /cannot be a descendant of|cannot contain a nested|hydration/i;

// Minimal valid PNG signature (8 bytes) + a few zero bytes — sniffAllowedMime only inspects the
// signature; the route/UI never re-decodes the image, so this is sufficient for the upload path.
const SYNTHETIC_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
// Bytes that do NOT match any allowed signature, used to prove the anonymous-upload rejection
// happens at the auth gate (401) before the body is even parsed for MIME sniffing.
const NON_IMAGE_BYTES = Buffer.from('#!/bin/sh\necho not-an-image\n');

test.beforeAll(() => {
  mkdirSync(join(OUT, 'screenshots'), { recursive: true });
});

async function openEsamiConsulenze(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('text="Operatore"').first().click();
  await page.waitForLoadState('networkidle');
  await page.locator('text="Pazienti"').first().click();
  await page.waitForTimeout(500);
  await page.getByText(PATIENT_LABEL, { exact: false }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('tab', { name: /^Clinica(\s+\d+)?$/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: /^Esami & Consulenze(\s+\d+)?$/ }).click();
  await page.waitForTimeout(500);
}

test('AC1-AC4: authenticated operator uploads into each section; chip stays in its own section after reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('response', (r) => {
    const status = r.status();
    if (status >= 400 && status !== 401 && status !== 403) badResponses.push(`${status} ${r.url()}`);
  });

  await openEsamiConsulenze(page);

  const sections: { doc: string; fileName: string }[] = [
    { doc: 'esame', fileName: '_test-246-esame.png' },
    { doc: 'rx', fileName: '_test-246-rx.png' },
    { doc: 'consulenza', fileName: '_test-246-consulenza.png' },
  ];

  for (const s of sections) {
    const panel = page.locator(`[data-testid="photos-${s.doc}"]`);
    await expect(panel).toBeVisible();
    const [uploadResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/patients/${PATIENT_ID}/documents`) && r.request().method() === 'POST'),
      panel.locator('input[type="file"]').setInputFiles({ name: s.fileName, mimeType: 'image/png', buffer: SYNTHETIC_PNG }),
    ]);
    expect(uploadResponse.status(), `upload into ${s.doc} must succeed (201) as an authenticated operator`).toBe(201);
    await expect(panel.getByText(s.fileName)).toBeVisible();
  }

  // AC4 — persistence + correct section after reload: no cross-section leakage.
  await openEsamiConsulenze(page);
  for (const s of sections) {
    const panel = page.locator(`[data-testid="photos-${s.doc}"]`);
    await expect(panel.getByText(s.fileName)).toBeVisible();
    for (const other of sections.filter((o) => o.doc !== s.doc)) {
      await expect(panel.getByText(other.fileName)).toHaveCount(0);
    }
  }

  await page.screenshot({ path: join(OUT, 'screenshots', 'result-authenticated-upload.png'), fullPage: true });

  const newConsoleErrors = consoleErrors.filter((e) => !KNOWN_PREEXISTING.test(e));
  expect(newConsoleErrors, `unexpected console errors: ${newConsoleErrors.join(' | ')}`).toHaveLength(0);
  expect(badResponses, `unexpected 4xx/5xx responses: ${badResponses.join(' | ')}`).toHaveLength(0);
});

test('security fix: anonymous caller (no operator headers) is rejected with 401 on upload and on content read', async () => {
  const ctx = await pwRequest.newContext(); // no X-Operator-Id/X-Operator-Role — simulates an attacker
  try {
    const uploadRes = await ctx.post(`${API}/patients/${PATIENT_ID}/documents`, {
      multipart: {
        file: { name: 'attacker.png', mimeType: 'image/png', buffer: NON_IMAGE_BYTES },
        documentType: 'esame',
      },
    });
    expect(uploadRes.status(), 'anonymous upload must be rejected before it ever reaches storage').toBe(401);

    const listRes = await ctx.get(`${API}/patients/${PATIENT_ID}/documents`);
    expect(listRes.status(), 'anonymous metadata read must be rejected').toBe(401);

    const contentRes = await ctx.get(`${API}/patients/${PATIENT_ID}/documents/anything/content`);
    expect(contentRes.status(), 'anonymous content read must be rejected regardless of documentId validity').toBe(401);
  } finally {
    await ctx.dispose();
  }
});

test('AC5: camera permission denied does not block upload — file-picker fallback still completes it', async ({ page, context }) => {
  await context.grantPermissions([]); // explicit camera denial
  await page.addInitScript(() => {
    // Stub getUserMedia so any camera-capture attempt rejects, simulating "permesso negato".
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
      },
      configurable: true,
    });
  });

  await openEsamiConsulenze(page);

  const panel = page.locator('[data-testid="photos-esame"]');
  await expect(panel).toBeVisible();
  // The upload control is a plain <input type="file" capture="environment">: on desktop/denied-
  // camera it always falls back to the OS file picker. Driving it via setInputFiles is exactly
  // that fallback path (no getUserMedia call is made by this control at all).
  const [uploadResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/patients/${PATIENT_ID}/documents`) && r.request().method() === 'POST'),
    panel.locator('input[type="file"]').setInputFiles({ name: '_test-246-ac5-fallback.png', mimeType: 'image/png', buffer: SYNTHETIC_PNG }),
  ]);
  expect(uploadResponse.status(), 'file-picker fallback upload must succeed even with camera permission denied').toBe(201);
  await expect(panel.getByText('_test-246-ac5-fallback.png')).toBeVisible();

  await page.screenshot({ path: join(OUT, 'screenshots', 'result-ac5-camera-denied-fallback.png'), fullPage: true });
});
