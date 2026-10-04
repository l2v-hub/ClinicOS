import assert from 'node:assert/strict';
import path from 'node:path';
export async function assertAllergyBand(page, severe, out) {
  const band = page.locator('.cr-alert-strip--allergie');
  await band.waitFor();
  assert.equal(await band.count(), 1);
  assert.equal(
    await page.locator('.patient-allergy-strip, .patient-topbar-title__allergy').count(),
    0,
  );
  assert.equal(
    await band.evaluate((el) => getComputedStyle(el).color),
    severe ? 'rgb(180, 35, 53)' : 'rgb(143, 85, 0)',
  );
  assert.match(await band.textContent(), severe ? /allergie gravi/ : /allergie:/);
  assert.match(await band.textContent(), /Gestisci/);
  for (const width of [390, 1150]) {
    await page.setViewportSize({ width, height: 1004 });
    await band.scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(await band.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
    const gap = await page
      .locator('.cr-alert-band')
      .evaluate(
        (el) =>
          document.querySelector('.cr-detail-layout').getBoundingClientRect().top -
          el.getBoundingClientRect().bottom,
      );
    assert.ok(gap >= 24);
    await page.screenshot({
      path: path.join(out, 'screenshots', `allergy-${severe ? 'severe' : 'mild'}-${width}.png`),
      fullPage: true,
    });
  }
}
