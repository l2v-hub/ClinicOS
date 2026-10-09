import { writeFileSync } from 'node:fs';
import { browser, makeContext, openChart, check, finish, out, outcomes, expect } from '../qa-fixture.mjs';
const contexts = [];
try {
  for (const mobile of [false, true]) {
    const ctx = await makeContext({ mobile }); contexts.push(ctx);
    await ctx.context.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('clinicos:assessment-drafts:')) throw new DOMException('Synthetic storage denied', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    let release, held = false, attempts = 0;
    const gate = new Promise(resolve => { release = resolve; });
    ctx.state.apiHandler = async (req, json) => {
      if (req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/assessments')) {
        attempts++; held = true; await gate;
        // A transport success without a verified receipt must never become a saved state.
        await json({ syntheticUnverifiedReceipt: true }, 201); return true;
      }
      return false;
    };
    await openChart(ctx);
    await ctx.page.getByRole('tab', { name: /^Moduli/ }).click();
    await ctx.page.getByRole('button', { name: 'Apri PAINAD', exact: true }).click();
    await ctx.page.getByRole('button', { name: 'Nuova valutazione PAINAD', exact: true }).click();
    const radio = ctx.page.locator('input[data-field-path="respiration"]').first();
    const label = mobile ? 'mobile' : 'desktop';
    await check(`${label} 413 focus survives new414 compact status`, async () => {
      await expect(radio).toBeFocused(); await expect(radio).toBeVisible();
      await expect(ctx.page.getByText('Non salvata in ClinicOS', { exact: true })).toBeVisible();
      expect(await ctx.page.getByRole('button', { name: 'Riprendi compilazione', exact: true }).count()).toBe(0);
      expect(await ctx.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
    await radio.check();
    await ctx.page.locator('.painad-metadata > summary').click();
    await check(`${label} blocked browser storage explicitly denies reload guarantee`, async () => {
      await expect(ctx.page.locator('.painad-metadata .assessment-draft-status')).toContainText('il browser non le conserva dopo il ricaricamento');
      await expect(ctx.page.locator('.painad-compilation-toolbar')).toContainText('1 di 5 risposte');
    });
    await ctx.page.getByRole('button', { name: 'Salva bozza', exact: true }).click();
    await expect.poll(() => held).toBe(true);
    await check(`${label} in-flight save retains locality and cannot become successful`, async () => {
      await expect(ctx.page.getByText('Salvataggio in corso', { exact: true })).toBeVisible();
      await expect(ctx.page.locator('.painad-metadata .assessment-draft-status')).toContainText('non le conserva dopo il ricaricamento');
      expect(await ctx.page.getByText('Bozza salvata in ClinicOS', { exact: true }).count()).toBe(0);
      await expect(ctx.page.getByRole('button', { name: 'Salvataggio…', exact: true })).toBeDisabled();
    });
    release();
    await check(`${label} malformed successful transport keeps draft unconfirmed and retryable`, async () => {
      await expect(ctx.page.getByText('Salvataggio da verificare', { exact: true })).toBeVisible();
      await expect(ctx.page.getByRole('button', { name: 'Riprova la stessa richiesta', exact: true })).toBeVisible();
      await expect(ctx.page.locator('.painad-metadata .assessment-draft-status')).toContainText('non le conserva dopo il ricaricamento');
      await expect(radio).toBeChecked();
      await expect(ctx.page.getByRole('button', { name: 'Elimina bozza locale', exact: true })).toBeDisabled();
      expect(await ctx.page.getByText('Bozza salvata in ClinicOS', { exact: true }).count()).toBe(0);
      expect(attempts).toBe(1);
    });
    await ctx.page.screenshot({ path: `${out}/screenshots/${label}-malformed-receipt-blocked-storage.png`, fullPage: true });
    await finish(ctx, `${label}-adversarial`);
  }
  writeFileSync(`${out}/test-results/adversarial-results.json`, JSON.stringify({ outcomes, syntheticOnly: true, productionWrites: 0, malformed201Cases: 2 }, null, 2));
  writeFileSync(`${out}/playwright-report/index.html`, `<html lang="it"><meta charset="utf-8"><title>414 independent adversarial</title><body><h1>414 independent adversarial</h1><p>Source-bound actual SPA, guarded synthetic API only.</p><pre>${JSON.stringify(outcomes, null, 2)}</pre></body></html>`);
} finally { await browser.close(); }
