import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTabletScale, isTabletScreen, tabletViewportContent } from '../tabletScale';

test('only touch screens of tablet size are tablets', () => {
  assert.equal(isTabletScreen(1180, 820, true), true); // iPad Air 11" orizzontale
  assert.equal(isTabletScreen(834, 1194, true), true); // iPad Pro 11" verticale
  assert.equal(isTabletScreen(390, 844, true), false); // telefono
  assert.equal(isTabletScreen(1440, 900, false), false); // computer
  assert.equal(isTabletScreen(1180, 820, false), false); // finestra da computer senza touch
  assert.equal(isTabletScreen(1366, 1024, true), true); // iPad 12,9" in punti (≤ 1400)
  assert.equal(isTabletScreen(1600, 1000, true), false); // oltre i 1400
});

test('the tablet viewport starts at 90%', () => {
  assert.equal(tabletViewportContent(), 'width=device-width, initial-scale=0.9');
});

function fakeWindow(width: number, height: number, coarse: boolean) {
  let content = 'width=device-width, initial-scale=1.0';
  const meta = { setAttribute: (_: string, v: string) => (content = v) };
  const win = {
    document: { querySelector: () => meta },
    matchMedia: () => ({ matches: coarse }),
    screen: { width, height },
  } as unknown as Window;
  return { win, content: () => content };
}

test('applies the scale on tablets only; phones and computers are untouched', () => {
  const tablet = fakeWindow(1180, 820, true);
  assert.equal(applyTabletScale(tablet.win), true);
  assert.equal(tablet.content(), 'width=device-width, initial-scale=0.9');
  for (const [w, h, c] of [
    [390, 844, true],
    [1440, 900, false],
  ] as const) {
    const other = fakeWindow(w, h, c);
    assert.equal(applyTabletScale(other.win), false);
    assert.equal(other.content(), 'width=device-width, initial-scale=1.0');
  }
});
