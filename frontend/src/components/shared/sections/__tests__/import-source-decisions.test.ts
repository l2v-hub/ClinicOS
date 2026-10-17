import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import type { ImportSectionsReview } from '../ImportSectionsReview';
import { sectionsFromNarrative } from '../deriveSections';
import { effectiveImportSections } from '../../import/importReviewModel';
import type { ImportResult } from '../../import/importSessionTypes';
import type { ImportReviewWorkspace } from '../../import/ImportReviewWorkspace';
import { job, json } from '../../import/__tests__/fixtures';

type Props = Parameters<typeof ImportSectionsReview>[0];
type Element = { type: unknown; props: Record<string, unknown> };

/** Exercise the real component's render/event handlers with persistent hook state, without a DOM. */
function componentRenderer<TProps>(
  url: URL,
  exportName: string,
  overrides: Record<string, unknown> = {},
) {
  const values: unknown[] = [];
  let cursor = 0;
  let pendingEffects: Array<() => void | (() => void)> = [];
  let cleanups: Array<() => void> = [];
  const hooks = {
    useEffect: (make: () => void | (() => void)) => pendingEffects.push(make),
    useMemo: (make: () => unknown) => make(),
    useRef: (initial: unknown) => {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
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
  const require = createRequire(url);
  const output = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    (name: string) => {
      if (name === 'react') return hooks;
      if (Object.hasOwn(overrides, name)) return overrides[name];
      // Leaf visuals are not under test; the real review state, labels and handlers are.
      if (name === '../DemographicsStatus') return { DemographicsStatus: () => null };
      if (name === './SemanticTaggedText') return { SemanticTaggedText: () => null };
      return require(name);
    },
    module,
    module.exports,
  );
  const component = (module.exports as Record<string, (props: TProps) => unknown>)[exportName];
  const render = (props: TProps) => {
    cursor = 0;
    pendingEffects = [];
    const tree = component(props);
    for (const cleanup of cleanups) cleanup();
    cleanups = pendingEffects
      .map((effect) => effect())
      .filter((cleanup): cleanup is () => void => typeof cleanup === 'function');
    return tree;
  };
  return Object.assign(render, {
    unmount() {
      for (const cleanup of cleanups) cleanup();
      cleanups = [];
    },
  });
}
function renderer() {
  return componentRenderer<Props>(
    new URL('../ImportSectionsReview.tsx', import.meta.url),
    'ImportSectionsReview',
  );
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

test('472 save-and-leave registers latest reviewed edits, preserves source and cleans up on unmount', () => {
  const render = renderer();
  const sections = sectionsFromNarrative({
    firstName: 'Maria',
    lastName: 'Sintetica',
    diagnosisText: 'Immutable synthetic source',
  });
  const before = structuredClone(sections);
  let save: (() => void) | null = null;
  const saved: Array<{ patient: unknown; cartella: unknown }> = [];
  let confirms = 0;
  const props: Props = {
    sections,
    documents: [],
    onBack() {},
    onConfirm() {
      confirms++;
    },
    registerSave(value) {
      save = value;
    },
    onSaveDraft(patient, cartella) {
      saved.push({ patient, cartella });
    },
  };
  let tree = render(props);
  invoke(
    find(tree, (element) => element.props.id === 'import-demographic-firstName'),
    'onChange',
    { target: { value: 'Modificata' } },
  );
  tree = render(props);
  assert.ok(save, 'close handler must be registered after render');
  (save as () => void)();
  assert.equal((saved[0].patient as { firstName: string }).firstName, 'Modificata');
  assert.equal(confirms, 0, 'saving an incomplete draft never confirms a patient');
  assert.deepEqual(sections, before, 'original extracted sections remain immutable');
  invoke(
    find(tree, (element) => element.type === 'button' && text(element) === 'Salva bozza e chiudi'),
    'onClick',
  );
  assert.equal(saved.length, 2);
  render.unmount();
  assert.equal(save, null, 'a closed review cannot retain a stale save callback');
});

type WorkspaceProps = Parameters<typeof ImportReviewWorkspace>[0];
const ReviewLeaf = () => null;
const ConflictLeaf = () => null;
function reviewLifecycle(value: ImportResult, ready: boolean) {
  const currentJob = job(3);
  currentJob.status = 'review_ready';
  currentJob.review.canProceed = ready;
  currentJob.review.draftSourceIsCurrent = true;
  let registered: (() => void) | null = null;
  let closed = 0;
  const opened: string[] = [];
  const workspace = componentRenderer<WorkspaceProps>(
    new URL('../../import/ImportReviewWorkspace.tsx', import.meta.url),
    'ImportReviewWorkspace',
    {
      '../sections/ImportSectionsReview': { ImportSectionsReview: ReviewLeaf },
      './ImportConflictReview': { ImportConflictReview: ConflictLeaf },
      './ImportPageView': { ImportPageContent: () => null },
    },
  );
  const review = renderer();
  const api = {
    async get() {
      return currentJob;
    },
    async review(_id: string, _source: unknown, decisions: ImportResult['_review']['decisions']) {
      value._review = { decisions, unresolvedConflictIds: [] };
      currentJob.review.canProceed = true;
      return { job: currentJob };
    },
    async result() {
      return value;
    },
  };
  const props = {
    job: currentJob,
    result: value,
    api,
    actor: {},
    cache: {},
    onResult(next: ImportResult) {
      Object.assign(value, next);
    },
    onJob(next: typeof currentJob) {
      Object.assign(currentJob, next);
    },
    onWorkspace(id: string) {
      opened.push(id);
    },
    onClose() {
      closed++;
    },
    registerSave(save: (() => void) | null) {
      registered = save;
    },
    onBusy() {},
    onBack() {},
    onImported() {},
  } as unknown as WorkspaceProps;
  let workspaceTree: unknown;
  let reviewTree: unknown;
  function render() {
    workspaceTree = workspace(props);
    reviewTree = review(
      find(workspaceTree, (element) => element.type === ReviewLeaf).props as unknown as Props,
    );
    return { workspace: workspaceTree, review: reviewTree };
  }
  render();
  return {
    render,
    currentJob,
    api,
    opened,
    get closed() {
      return closed;
    },
    get workspace() {
      return workspaceTree;
    },
    get review() {
      return reviewTree;
    },
    saveRegistered() {
      assert.ok(registered);
      registered();
    },
    dirty() {
      invoke(
        find(workspaceTree, (element) => element.type === ConflictLeaf),
        'onDirty',
      );
    },
    async resolve(candidateId: string) {
      const conflict = find(workspaceTree, (element) => element.type === ConflictLeaf);
      await (conflict.props.onSave as (decisions: unknown[]) => Promise<void>)([
        { conflictId: 'name', action: 'select', candidateId },
      ]);
      render();
    },
    unmount() {
      review.unmount();
      workspace.unmount();
      assert.equal(registered, null);
    },
  };
}
const settleReview = () => new Promise<void>((resolve) => setImmediate(resolve));
function editReview(lifecycle: ReturnType<typeof reviewLifecycle>, field: string, value: string) {
  invoke(
    find(lifecycle.review, (element) => element.props.id === `import-demographic-${field}`),
    'onChange',
    { target: { value } },
  );
  lifecycle.render();
}

test('QA450-1 registered close-save preserves unresolved/dirty review until corrected choices can be persisted', async () => {
  const previous = globalThis.fetch;
  const value = result();
  const immutableSource = structuredClone(value._narrative);
  const lifecycle = reviewLifecycle(value, false);
  const requests: string[] = [];
  let patch: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_url, init) => {
    requests.push(init?.method ?? 'GET');
    if (init?.method === 'POST')
      return json({
        id: 'corrected-draft',
        version: 0,
        data: { anagrafica: { firstName: 'Bea', lastName: 'Synthetic' } },
      });
    assert.equal(init?.method, 'PATCH');
    patch = JSON.parse(String(init.body));
    return json({ id: 'corrected-draft', version: 1, data: patch });
  }) as typeof fetch;
  try {
    editReview(lifecycle, 'address', 'Correzione manuale conservata');
    // The mounted review registers the callback consumed by header/footer/Escape dismissal.
    for (let attempt = 0; attempt < 3; attempt++) {
      lifecycle.saveRegistered();
      await settleReview();
      lifecycle.render();
      assert.deepEqual(requests, []);
      assert.equal(lifecycle.closed, 0);
      assert.deepEqual(lifecycle.opened, []);
      assert.doesNotMatch(text(lifecycle.workspace), /passaggio alla bozza è in attesa/);
    }
    await lifecycle.resolve('Alba');
    lifecycle.dirty();
    lifecycle.render();
    lifecycle.saveRegistered();
    await settleReview();
    lifecycle.render();
    assert.deepEqual(requests, [], 'unsaved choices cannot start an intent either');
    await lifecycle.resolve('Bea');
    lifecycle.saveRegistered();
    await settleReview();
    lifecycle.render();
    assert.deepEqual(requests, ['POST', 'PATCH']);
    assert.equal((patch?.anagrafica as Record<string, unknown>).firstName, 'Bea');
    assert.equal(
      (patch?.anagrafica as Record<string, unknown>).address,
      'Correzione manuale conservata',
    );
    assert.deepEqual(value._narrative, immutableSource);
    assert.equal(lifecycle.closed, 1);
    assert.deepEqual(lifecycle.opened, ['corrected-draft']);
  } finally {
    lifecycle.unmount();
    globalThis.fetch = previous;
  }
});

test('QA450-1 definitive unresolved409 discards rejected intent before the corrected same-hash review', async () => {
  const previous = globalThis.fetch;
  const value = result();
  choose(value, 'Alba');
  const source = structuredClone(value._source);
  const lifecycle = reviewLifecycle(value, true);
  let creates = 0;
  const patches: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_url, init) => {
    if (init?.method === 'POST') {
      creates++;
      if (creates === 1)
        return json(
          {
            code: 'unresolved_conflicts',
            error: 'Scegli come gestire ogni informazione discordante prima di continuare',
          },
          409,
        );
      return json({
        id: 'resolved-draft',
        version: 0,
        data: { anagrafica: { firstName: 'Bea', lastName: 'Synthetic' } },
      });
    }
    assert.equal(init?.method, 'PATCH');
    const patch = JSON.parse(String(init.body));
    patches.push(patch);
    return json({ id: 'resolved-draft', version: 1, data: patch });
  }) as typeof fetch;
  try {
    editReview(lifecycle, 'firstName', 'Prima');
    lifecycle.saveRegistered();
    await settleReview();
    lifecycle.render();
    assert.equal(lifecycle.closed, 0);
    assert.deepEqual(patches, []);
    assert.doesNotMatch(text(lifecycle.workspace), /passaggio alla bozza è in attesa/);
    await lifecycle.resolve('Bea');
    editReview(lifecycle, 'firstName', 'Corretto');
    lifecycle.saveRegistered();
    await settleReview();
    lifecycle.render();
    assert.equal(creates, 2);
    assert.equal(patches.length, 1);
    assert.equal((patches[0].anagrafica as Record<string, unknown>).firstName, 'Corretto');
    assert.deepEqual(
      value._source,
      source,
      'conflict resolution need not change extraction identity',
    );
    assert.equal(lifecycle.closed, 1);
  } finally {
    lifecycle.unmount();
    globalThis.fetch = previous;
  }
});

for (const failure of ['network', '503'] as const)
  test(`uncertain ${failure} handoff preserves the frozen review until actual recovery`, async () => {
    const previous = globalThis.fetch;
    const value = result();
    choose(value, 'Alba');
    const lifecycle = reviewLifecycle(value, true);
    let created = false;
    let creates = 0;
    let patch: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_url, init) => {
      if (init?.method === 'POST') {
        creates++;
        created = true;
        if (failure === 'network') throw new TypeError('lost response');
        return json({ error: 'temporary unknown write outcome' }, 503);
      }
      if (init?.method === 'GET')
        return json({
          id: 'uncertain-draft',
          version: 0,
          data: { anagrafica: { firstName: 'Seed' } },
        });
      assert.equal(init?.method, 'PATCH');
      patch = JSON.parse(String(init.body));
      return json({ id: 'uncertain-draft', version: 1, data: patch });
    }) as typeof fetch;
    const originalGet = lifecycle.api.get;
    lifecycle.api.get = async () => {
      const job = await originalGet();
      job.review.draftId = created ? 'uncertain-draft' : null;
      return job;
    };
    try {
      editReview(lifecycle, 'firstName', 'Prima incerta');
      lifecycle.saveRegistered();
      await settleReview();
      lifecycle.render();
      assert.equal(lifecycle.closed, 0);
      assert.match(text(lifecycle.workspace), /passaggio alla bozza è in attesa/);
      choose(value, 'Bea');
      lifecycle.render();
      invoke(
        find(
          lifecycle.workspace,
          (element) =>
            element.type === 'button' && text(element) === 'Riprova passaggio alla bozza',
        ),
        'onClick',
      );
      await settleReview();
      lifecycle.render();
      assert.equal(creates, 1);
      assert.equal((patch?.anagrafica as Record<string, unknown>).firstName, 'Prima incerta');
      assert.deepEqual(lifecycle.opened, ['uncertain-draft']);
    } finally {
      lifecycle.unmount();
      globalThis.fetch = previous;
    }
  });
