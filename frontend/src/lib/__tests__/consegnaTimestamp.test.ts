import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsegnaTimestamp } from '../../components/operator/ConsegnaTimestamp';
Object.assign(globalThis, { React });
test('handoff creation displays Italian local date and time with machine-readable original', () => {
  const markup = renderToStaticMarkup(
    createElement(ConsegnaTimestamp, { createdAt: '2026-09-18T07:20:00Z' }),
  );
  assert.match(markup, /18\/09\/2026, 09:20/);
  assert.match(markup, /dateTime="2026-09-18T07:20:00.000Z"/);
});
test('legacy missing, date-only and invalid timestamps never invent creation time', () => {
  for (const createdAt of [undefined, '', 'invalid', '2026-09-18']) {
    const markup = renderToStaticMarkup(createElement(ConsegnaTimestamp, { createdAt }));
    assert.match(markup, /Data di creazione non disponibile/);
    assert.doesNotMatch(markup, /<time/);
  }
});
