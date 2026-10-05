import assert from 'node:assert/strict';
import path from 'node:path';

export async function assertPendingThread(page) {
  const pending = page.locator('[data-entry-id="handover-critical"]');
  assert.match(await pending.textContent(), /Segnalata da Infermiere Autore/);
  assert.equal(await pending.locator('[data-diary-response-state="active"]').count(), 1);
  assert.match(await pending.textContent(), /In attesa di conferma/);
  assert.equal(await pending.getByRole('button', { name: /^Ho capito:/ }).count(), 1);
  const author = page.locator('[data-entry-id="mine"]');
  assert.match(await author.textContent(), /In attesa di conferma/);
  assert.equal(await author.getByRole('button', { name: /^Ho capito:/ }).count(), 0);
}

export async function assertTakenThread(page, out) {
  const shared = page.locator('[data-entry-id="handover-critical"]');
  const reply = shared.locator('[data-diary-response-state="taken"]');
  assert.match(await reply.textContent(), /Letta e compresa da Infermiere Test \(Infermiere\)/);
  assert.equal(await reply.locator('time').getAttribute('datetime'), '2026-10-03T16:35:00Z');
  assert.equal(await reply.locator('time').textContent(), '03/10/2026 18:35');
  assert.match(await shared.textContent(), /Priorità originale: urgente/);
  assert.match(await reply.textContent(), /«Ho capito».*conferma registrata/s);
  assert.doesNotMatch(await shared.textContent(), /COMPLETATA|valore precedente/);
  assert.equal(await reply.getByRole('button').count(), 0);
  for (const width of [390, 1150]) {
    await page.setViewportSize({ width, height: 1004 });
    await shared.scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(await reply.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({
      path: path.join(out, 'screenshots', `diary-thread-${width}.png`),
      fullPage: true,
    });
  }
}

export async function assertThreadFallbacks(page) {
  const unavailable = page.locator('[data-entry-id="no-shared-trace"]');
  assert.equal(await unavailable.locator('[data-diary-response-state="unavailable"]').count(), 1);
  assert.doesNotMatch(await unavailable.textContent(), /Visione non verificabile/);
  assert.match(
    await unavailable.textContent(),
    /Letta da Collega Legacy Test \(OSS\).*Lettura personale registrata/s,
  );
  assert.equal(await unavailable.locator('time').textContent(), '03/10/2026 18:35');
  const history = page.locator('[data-entry-id="taken-no-reader"]');
  assert.match(await history.textContent(), /Visione non verificabile/);
  assert.equal(await history.locator('time').count(), 0);
  const important = page.locator('[data-entry-id="important-none"]');
  assert.match(await important.textContent(), /Importante.*Conferma non richiesta/s);
  assert.equal(await important.getByRole('button', { name: /^Ho capito:/ }).count(), 0);
}
