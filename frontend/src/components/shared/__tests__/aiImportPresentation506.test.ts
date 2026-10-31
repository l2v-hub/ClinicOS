import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const entry = readFileSync(new URL('../AIImportStatus.tsx', import.meta.url), 'utf8');
const list = readFileSync(new URL('../../operator/PatientList.tsx', import.meta.url), 'utf8');

function presentations(source: string, tag: string): string[] {
  const tree = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values: string[] = [];
  function visit(node: ts.Node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(tree) === tag) {
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.getText(tree) !== 'presentation') continue;
        if (attr.initializer && ts.isStringLiteral(attr.initializer)) values.push(attr.initializer.text);
        else if (attr.initializer && ts.isJsxExpression(attr.initializer)) values.push(attr.initializer.expression?.getText(tree) ?? '');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return values;
}

test('the real PatientList direct import explicitly uses page presentation', () => {
  assert.deepEqual(presentations(list, 'AIImportStatus'), ['page'], 'Actual PatientList must request page presentation');
});

test('AIImportStatus preserves dialog default and forwards presentation to lazy and ready surfaces', () => {
  assert.ok(/presentation\?: 'dialog' \| 'page'/.test(entry), 'Explicit presentation contract');
  assert.ok(/presentation = 'dialog'/.test(entry), 'Preserve default modal callers');
  assert.deepEqual(presentations(entry, 'DialogLoading'), ['presentation'], 'Propagate loading presentation');
  assert.deepEqual(presentations(entry, 'DischargeImportModal'), ['presentation'], 'Propagate ready import presentation');
});
