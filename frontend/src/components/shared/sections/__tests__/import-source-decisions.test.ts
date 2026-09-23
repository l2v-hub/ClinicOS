import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import type { ImportSectionsReview } from '../ImportSectionsReview';
import { sectionsFromNarrative } from '../deriveSections';
import { effectiveImportSections } from '../../import/importReviewModel';
import type { ImportResult } from '../../import/importSessionTypes';

type Props = Parameters<typeof ImportSectionsReview>[0];
type Element = { type: unknown; props: Record<string, unknown> };

/** Exercise the real component's render/event handlers with persistent hook state, without a DOM. */
function renderer() {
  const values: unknown[] = [];
  let cursor = 0;
  const hooks = {
    useMemo: (make: () => unknown) => make(),
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [
        values[index],
        (next: unknown) => {
          values[index] = typeof next === 'function' ? next(values[index]) : next;
        },
      ];
    },
  };
  const url = new URL('../ImportSectionsReview.tsx', import.meta.url);
  const require = createRequire(url);
  const output = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    (name: string) => {
      if (name === 'react') return hooks;
      // Leaf visuals are not under test; the real review state, labels and handlers are.
      if (name === '../DemographicsStatus') return { DemographicsStatus: () => null };
      if (name === './SemanticTaggedText') return { SemanticTaggedText: () => null };
      return require(name);
    },
    module,
    module.exports,
  );
  const component = (module.exports as { ImportSectionsReview: typeof ImportSectionsReview })
    .ImportSectionsReview;
  return (props: Props) => {
    cursor = 0;
    return component(props);
  };
}
function nodes(root: unknown): Element[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== 'object' || !('props' in root)) return [];
  const element = root as Element;
  return [element, ...nodes(element.props.children)];
}
function find(root: unknown, predicate: (element: Element) => boolean) {
  const found = nodes(root).find(predicate);
  assert.ok(found, 'expected component element');
  return found;
}
function text(root: unknown): string {
  if (typeof root === 'string' || typeof root === 'number') return String(root);
  if (Array.isArray(root)) return root.map(text).join('');
  return root && typeof root === 'object' && 'props' in root
    ? text((root as Element).props.children)
    : '';
}
function invoke(element: Element, event: string, value?: unknown) {
  (element.props[event] as (value?: unknown) => void)(value);
}
function result(): ImportResult {
  return {
    _source: { manifestRevision: 3, resultHash: 'synthetic-result' },
    _groups: [],
    _narrative: {
      firstName: '',
      lastName: 'Synthetic',
      diagnosisText: 'Original diagnosis',
      therapyText: 'Original therapy',
    },
    _conflicts: [
      {
        id: 'name',
        field: 'anagrafica.nome',
        label: 'Nome',
        candidates: ['Alba', 'Bea'].map((value) => ({
          id: value,
          value,
          displayValue: value,
          sources: [],
        })),
      },
    ],
    _review: { decisions: [], unresolvedConflictIds: ['name'] },
  };
}
function choose(value: ImportResult, candidateId?: string) {
  value._review = {
    decisions: [
      candidateId
        ? { conflictId: 'name', action: 'select', candidateId }
        : { conflictId: 'name', action: 'defer' },
    ],
    unresolvedConflictIds: [],
  };
}

test('effective demographics follows each explicit select/defer and preserves immutable source text', () => {
  const value = result();
  const fields = {
    'anagrafica.nome': 'firstName',
    'anagrafica.cognome': 'lastName',
    'anagrafica.dataNascita': 'dateOfBirth',
    'anagrafica.sesso': 'sex',
    'anagrafica.telefono': 'phone',
    'anagrafica.email': 'email',
    'anagrafica.indirizzo': 'address',
    'cartella.codiceFiscale': 'codiceFiscale',
  };
  for (const [field, target] of Object.entries(fields)) {
    value._conflicts[0].field = field;
    choose(value, 'Alba');
    const before = structuredClone(value);
    assert.equal(effectiveImportSections(value).demographics?.[target], 'Alba');
    assert.deepEqual(value, before);
    choose(value, 'Bea');
    assert.equal(effectiveImportSections(value).demographics?.[target], 'Bea');
    choose(value);
    assert.equal(effectiveImportSections(value).demographics?.[target], '');
  }
  value._conflicts[0].field = 'cartella.farmaci';
  assert.equal(
    effectiveImportSections(value).sections.find((s) => s.sectionKey === 'DISCHARGE_HOME_THERAPY')
      ?.rawText,
    'Original therapy',
  );
});

test('real review keeps untouched demographics current while retaining manual fields and section review', () => {
  const render = renderer();
  const value = result();
  const received: Parameters<Props['onConfirm']>[] = [];
  const props = () => ({
    sections: effectiveImportSections(value),
    documents: [],
    onConfirm: (...args: Parameters<Props['onConfirm']>) => received.push(args),
    onBack() {},
  });
  const name = (tree: unknown) => find(tree, (e) => e.props.id === 'import-demographic-firstName');
  const diagnosis = (tree: unknown) =>
    find(tree, (e) => e.props['data-testid'] === 'srev-DISCHARGE_DIAGNOSIS');
  let tree = render(props());
  assert.equal(name(tree).props.value, '');
  choose(value, 'Alba');
  tree = render(props());
  assert.equal(name(tree).props.value, 'Alba');
  choose(value, 'Bea');
  tree = render(props());
  assert.equal(name(tree).props.value, 'Bea');
  choose(value);
  tree = render(props());
  assert.equal(name(tree).props.value, '');
  choose(value, 'Alba');
  tree = render(props());
  invoke(name(tree), 'onChange', { target: { value: 'Manual correction' } });
  invoke(
    find(diagnosis(tree), (e) => e.type === 'button' && text(e) === 'Modifica'),
    'onClick',
  );
  tree = render(props());
  invoke(
    find(diagnosis(tree), (e) => e.type === 'textarea'),
    'onChange',
    { target: { value: 'Reviewed diagnosis' } },
  );
  choose(value, 'Bea');
  tree = render(props());
  assert.equal(name(tree).props.value, 'Manual correction');
  assert.equal(
    find(diagnosis(tree), (e) => e.type === 'textarea').props.value,
    'Reviewed diagnosis',
  );
  invoke(
    find(tree, (e) => e.type === 'button' && text(e).includes('Crea paziente')),
    'onClick',
  );
  assert.equal(received[0][0].firstName, 'Manual correction');
  const saved = received[0][1].documentSections as { sectionKey: string; reviewedText: string }[];
  assert.equal(
    saved.find((s) => s.sectionKey === 'DISCHARGE_DIAGNOSIS')?.reviewedText,
    'Reviewed diagnosis',
  );
  invoke(name(tree), 'onChange', { target: { value: '' } });
  choose(value, 'Alba');
  assert.equal(name(render(props())).props.value, '', 'an intentional manual blank also survives');
});

test('three letter identities remain distinct and compare requires an explicit source when several exist', () => {
  const sourceReferences = [1, 2, 3].map((n) => ({
    sectionKey: 'DIAGNOSI',
    fileId: `group-${n}`,
    fileName: `Lettera ${n}`,
  }));
  const sections = sectionsFromNarrative({ diagnosisText: 'Three sources', sourceReferences });
  assert.deepEqual(
    sections.sections
      .find((s) => s.sectionKey === 'DISCHARGE_DIAGNOSIS')
      ?.sourceRanges?.map((s) => s.fileId),
    ['group-1', 'group-2', 'group-3'],
  );
  const documents = [
    ...[1, 2, 3].map((n) => ({ id: `doc-${n}`, filename: `lettera-${n}.pdf` })),
    ...[1, 2, 3].map((n) => ({ id: `group-${n}`, filename: `Lettera ${n}` })),
  ];
  const opened: unknown[][] = [];
  const props: Props = {
    sections,
    documents,
    onConfirm() {},
    onBack() {},
    onOpenSource: (...args) => opened.push(args),
  };
  const render = renderer();
  let tree = render(props);
  const section = () => find(tree, (e) => e.props['data-testid'] === 'srev-DISCHARGE_DIAGNOSIS');
  assert.match(text(section()), /Fonte: Lettera 1 · Fonte: Lettera 2 · Fonte: Lettera 3/);
  assert.doesNotMatch(text(section()), /Fonte: lettera-1.pdf/);
  invoke(
    find(section(), (e) => e.type === 'button' && text(e) === 'Confronta con la fonte'),
    'onClick',
  );
  assert.deepEqual(opened, [], 'comparison cannot silently choose one of several letters');
  tree = render(props);
  invoke(
    find(section(), (e) => e.type === 'button' && text(e) === 'Apri fonte: Lettera 2'),
    'onClick',
  );
  assert.deepEqual(opened, [['Lettera 2', undefined, 'group-2']]);
});

test('legacy names remain labels and absent/unknown source identities never become the first original', () => {
  const render = renderer();
  const sections = sectionsFromNarrative({
    diagnosisText: 'Legacy source',
    sourceReferences: [{ sectionKey: 'DIAGNOSI', fileName: 'legacy.pdf', pageFrom: 2 }],
  });
  const range = sections.sections.find((s) => s.sectionKey === 'DISCHARGE_DIAGNOSIS')!
    .sourceRanges![0];
  assert.equal(range.fileId, undefined);
  assert.equal(range.fileName, 'legacy.pdf');
  const props: Props = {
    sections,
    documents: [{ id: 'doc-first', filename: 'wrong-first.pdf' }],
    onConfirm() {},
    onBack() {},
  };
  let tree = render(props);
  assert.match(text(tree), /Fonte: legacy.pdf — pagina 2/);
  assert.doesNotMatch(text(tree), /wrong-first.pdf/);
  range.fileId = 'unknown-id';
  delete range.fileName;
  tree = render(props);
  assert.match(text(tree), /Fonte: non identificata/);
  assert.doesNotMatch(text(tree), /wrong-first.pdf/);
});
