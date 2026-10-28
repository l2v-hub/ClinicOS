import assert from 'node:assert/strict';

/**
 * Root-owned browser QA helper. Call with an authenticated, synthetic patient already open
 * on Oggi and one pending scheduled dose. This file does not start browsers/servers or seed data.
 * The caller owns request/audit capture and all screenshots/media sanitization.
 */
export async function verifyFocusPreservesDoseDraft(page, { patientId, doseRow, draft = 'QA synthetic draft' }) {
  const section = page.locator('[data-patient-today]');
  const row = doseRow ?? section.locator('.giro-drug').filter({ has: page.getByRole('button', { name: /^Non erogata:/ }) }).first();
  await row.getByRole('button', { name: /^Non erogata:/ }).click();
  await row.getByRole('button', { name: /^Altro:/ }).click();
  const input = row.getByPlaceholder('Specifica il motivo (obbligatorio)');
  await input.fill(draft);
  // DOM identity plus value/disclosure checks catch remounts even if a draft were restored later.
  const originalInput = await input.elementHandle();
  assert.ok(originalInput);
  const refreshed = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/therapy-slots' && response.request().method() === 'GET';
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const response = await refreshed;
  await response.finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await input.inputValue(), draft);
  assert.equal(await input.isVisible(), true);
  assert.equal(await row.getByRole('button', { name: /^Non erogata:/ }).getAttribute('aria-expanded'), 'true');
  assert.equal(await input.evaluate((node, original) => node === original, originalInput), true);
  // A different patient's PS event must not refresh this patient's slots.
  let unrelatedReads = 0;
  const count = request => { if (new URL(request.url()).pathname === '/therapy-slots') unrelatedReads++; };
  page.on('request', count);
  try {
    await page.evaluate(id => window.dispatchEvent(new CustomEvent('clinicos:temporary-ps-exit-changed', { detail: { patientId: id } })), `${patientId}-other`);
    await page.waitForTimeout(350);
    assert.equal(unrelatedReads, 0);
    assert.equal(await input.inputValue(), draft);
  } finally {
    page.off('request', count);
    await originalInput?.dispose();
  }
  return { outcome: 'PASS', patient: 'synthetic', focusPreservedDraft: true, sameInputNode: true, unrelatedPatientDidNotRefresh: true };
}
