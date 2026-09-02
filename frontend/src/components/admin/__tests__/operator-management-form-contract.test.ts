import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const management = readFileSync(new URL('../OperatorManagement.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../OperatorFormPanel.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../OperatorManagement.css', import.meta.url), 'utf8');

test('operator editor is a labelled native form with guided sections', () => {
  assert.match(panel, /<form[\s\S]*id="operator-form-panel"[\s\S]*onSubmit=\{submit\}/);
  assert.match(panel, /aria-labelledby="operator-form-title"/);
  assert.match(panel, /<fieldset className="operator-editor__section">/);
  assert.match(panel, /<legend>Identità<\/legend>/);
  assert.match(panel, /<legend>Ruolo e assegnazione<\/legend>/);
  assert.match(panel, /<legend>Contatti<\/legend>/);
  assert.match(panel, /<details className="operator-editor__optional">/);
  assert.match(panel, /Preferenze e note/);
});

test('operator fields support labels, browser validation and useful autofill', () => {
  const requiredFields = ['operator-name', 'operator-surname', 'operator-email'];
  for (const id of requiredFields) {
    assert.match(panel, new RegExp(`htmlFor="${id}"`));
    assert.match(panel, new RegExp(`id="${id}"[\\s\\S]*?required`));
  }

  for (const id of [
    'operator-role',
    'operator-qualification',
    'operator-ward',
    'operator-status',
    'operator-phone',
    'operator-notes',
  ]) {
    assert.match(panel, new RegExp(`htmlFor="${id}"`));
    assert.match(panel, new RegExp(`id="${id}"`));
  }

  assert.match(panel, /type="email"/);
  assert.match(panel, /type="tel"/);
  assert.match(panel, /autoComplete="given-name"/);
  assert.match(panel, /autoComplete="family-name"/);
  assert.match(panel, /autoComplete="email"/);
  assert.match(panel, /autoComplete="tel"/);
  assert.match(panel, /<textarea[\s\S]*id="operator-notes"/);
  assert.match(panel, /type="submit"[\s\S]*Salva modifiche/);
});

test('operator editor exposes every action and color choice accessibly', () => {
  assert.match(management, /aria-expanded=\{formAperto\}/);
  assert.match(management, /aria-controls="operator-form-panel"/);
  assert.match(panel, /aria-label=\{`Chiudi \$\{title\.toLowerCase\(\)\}`\}/);
  assert.match(panel, /aria-label=\{COLOR_LABELS\[index\]\}/);
  assert.match(panel, /aria-pressed=\{value\.colore === color\}/);
  assert.match(panel, /aria-label="Colore personalizzato"/);
  assert.match(panel, /type="button"[\s\S]*Annulla/);
});

test('operator editor uses scoped table-like geometry and responsive grids', () => {
  assert.match(styles, /\.op-management \.operator-editor\s*\{/);
  assert.match(
    styles,
    /\.op-management \.operator-editor__header\s*\{[^}]*background:\s*var\(--surface-raised\)[^}]*border-bottom:/s,
  );
  assert.match(styles, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(
    styles,
    /\.operator-editor__color-swatch\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/s,
  );
  assert.doesNotMatch(styles, /(^|\n)\.(?:op-form-grid|form-field|form-input)\s*\{/);
  assert.doesNotMatch(styles, /overflow-x:\s*(?:auto|scroll)/);
});
