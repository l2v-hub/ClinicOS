import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccessibleDialogSurface } from '../AccessibleDialogSurface';

test('default surfaces retain modal semantics and page surfaces expose a named region without overlay', () => {
  const props = { labelledBy: 'qa-title', onClose() {}, children: createElement('h2', { id: 'qa-title' }, 'QA') };
  const modal = renderToStaticMarkup(createElement(AccessibleDialogSurface, props));
  assert.match(modal, /role="dialog"/); assert.match(modal, /aria-modal="true"/); assert.match(modal, /modal-overlay/);
  const page = renderToStaticMarkup(createElement(AccessibleDialogSurface, { ...props, presentation: 'page' }));
  assert.match(page, /<section[^>]*aria-labelledby="qa-title"/);
  assert.doesNotMatch(page, /aria-modal|modal-overlay|role="dialog"/);
  assert.match(page, /<h2 id="qa-title">QA<\/h2>/);
});
