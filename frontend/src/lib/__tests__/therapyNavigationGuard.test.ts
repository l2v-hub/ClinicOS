import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const administration = readFileSync(
  new URL('../therapyAdministrationWrite.ts', import.meta.url),
  'utf8',
);

test('Terapia owns its bounded request while Agenda verification owns its selected day; no session prefetch', () => {
  assert.match(app, /navKey !== 'terapie'[\s\S]*void loadTherapySlots\(\)/);
  assert.match(app, /\[utente, navKey, loadTherapySlots\]/);
  const sessionSection = app.slice(
    app.indexOf('// ── Fetch constant-size session data'),
    app.indexOf("navKey !== 'terapie'"),
  );
  assert.doesNotMatch(sessionSection, /loadTherapySlots\(\)/);
});

test('agenda follows the bounded page contract and aborts obsolete date requests', () => {
  assert.match(app, /buildTherapySlotPageUrl\(API_URL, d, options\.cursor, rosterRequest\)/);
  assert.match(app, /therapyAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(app, /mergeTherapySlotPages\(current, page\.slots, page\.pageInfo\.summaryExact\)/);
  assert.match(app, /append: true,[\s\S]*cursor: therapyPageInfo\.nextCursor/);
  assert.doesNotMatch(app, /cachedGetJson<unknown>\(`\$\{API_URL\}\/therapy-slots/);
  assert.match(app, /recordAdministration\(info,/);
  assert.match(administration, /date: info\.date/);
  assert.match(app, /loadTherapySlots\(info\.date\)/);
});

test('both actual App agenda call sites require only the projected verification feed, preserving UX447', () => {
  const source = ts.createSourceFile(
    'App.tsx',
    app,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const seen = new Set<string>();
  const forbidden = new Set([
    'therapySlots',
    'onLoadTherapySlots',
    'onConfirmTherapy',
    'onNotAdministeredTherapy',
  ]);
  function visit(node: ts.Node) {
    if (
      ts.isJsxSelfClosingElement(node) &&
      ['OperatorAgenda', 'AdminAgenda'].includes(node.tagName.getText(source))
    ) {
      const tag = node.tagName.getText(source);
      seen.add(tag);
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const verification = attributes.find(
        (attribute) => attribute.name.getText(source) === 'verificationFeed',
      );
      assert.ok(verification, `${tag} must receive the real verification feed`);
      assert.equal(verification.initializer?.getText(source), '{agendaVerificationFeed}');
      for (const attribute of attributes) assert.ok(!forbidden.has(attribute.name.getText(source)));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual([...seen].sort(), ['AdminAgenda', 'OperatorAgenda']);
  assert.match(
    app,
    /groups: therapySlots\.filter\([\s\S]*?group is TherapyVerificationGroup[\s\S]*?group\.kind === 'verification'/,
  );
  assert.match(app, /setTherapyAcceptedIdentity\(identity\)/);
  assert.match(app, /loadedTherapyKeyRef\.current !== therapyKey/);
});
