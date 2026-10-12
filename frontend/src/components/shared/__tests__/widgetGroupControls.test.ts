// #448: nella cartella il comando «Apri/Chiudi tutte le sezioni» non deve comparire sopra la
// barra delle schede solo in alcune schede (spostava la barra di ~37 px tra una scheda e l'altra).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('WidgetGroup renders the bulk toggle only when controls are enabled', () => {
  const group = source('../WidgetGroup.tsx');
  assert.match(group, /controls = true/);
  assert.match(group, /\{controls && entries\.size > 1 && \(/);
});

test('the page-level group hides the bulk toggle on the patient chart only', () => {
  const app = source('../../../App.tsx');
  assert.match(
    app,
    /<WidgetGroup\s+key=\{`\$\{navKey\}[^>]*controls=\{navKey !== 'dettaglio-paziente'\}/,
  );
});
