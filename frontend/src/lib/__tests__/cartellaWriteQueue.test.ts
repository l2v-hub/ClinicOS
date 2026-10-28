import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createDefaultCartella } from '../../mockData';
import { operatorHeaders, getCurrentOperator, setCurrentOperator } from '../operatorSession';
import {
  saveTemporaryPsExit,
  TEMPORARY_PS_EXIT_CHANGED,
  type TemporaryPsExitCommand,
} from '../temporaryPsExit';
import { CartellaWriteQueue, mergeCartellaPatch, cartellaWriteData } from '../cartellaWriteQueue';
import type { CartellaPaziente, DocumentoConsegnato } from '../../types';

test('verified server command serializes with ordinary saves and preserves its authoritative state', async () => {
  const queue = new CartellaWriteQueue<{ notes: string; exit: string | null }>();
  const initial = { notes: 'original', exit: null };
  let release!: (snapshot: typeof initial) => void;
  const command = queue.enqueueMutation(
    'session:patient',
    initial,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const save = queue.enqueue('session:patient', initial, { notes: 'updated' }, async (snapshot) => {
    assert.deepEqual(snapshot, { notes: 'updated', exit: 'verified-exit' });
    return true;
  });
  await Promise.resolve();
  release({ ...initial, exit: 'verified-exit' });
  assert.equal((await command).exit, 'verified-exit');
  assert.equal(await save, true);
});
test('failed command never contaminates queued snapshots or another session', async () => {
  const queue = new CartellaWriteQueue<{ exit: string | null; note: string }>();
  const initial = { exit: null, note: 'before' };
  const failed = queue.enqueueMutation('old:p', initial, async () => {
    throw new Error('unverified');
  });
  const save = queue.enqueue('old:p', initial, { note: 'after' }, async (snapshot) => {
    assert.equal(snapshot.exit, null);
    return true;
  });
  await assert.rejects(failed, /unverified/);
  assert.equal(await save, true);
  assert.deepEqual(await queue.enqueueMutation('new:p', initial, async () => initial), initial);
});

test('a later ordinary server receipt recovers an exit committed during an uncertain command', async () => {
  const queue = new CartellaWriteQueue<{ exit: string | null; note: string }>();
  const initial = { exit: null, note: 'before' };
  const uncertain = queue.enqueueMutation('s:p', initial, async () => {
    throw new Error('response lost after commit');
  });
  const recovery = queue.enqueue('s:p', initial, { note: 'after' }, async () => ({
    exit: 'actual-server-exit',
    note: 'after',
  }));
  const last = queue.enqueue('s:p', initial, { note: 'last' }, async (snapshot) => {
    assert.equal(snapshot.exit, 'actual-server-exit');
    return snapshot;
  });
  await assert.rejects(uncertain, /response lost/);
  assert.equal(await recovery, true);
  assert.equal(await last, true);
});

test('serializes full snapshots, retaining earlier successful edits regardless of section order', async () => {
  for (const reverse of [false, true]) {
    const queue = new CartellaWriteQueue<{ docs: number; notes: number }>();
    let release!: (ok: boolean) => void;
    const snapshots: object[] = [];
    const baseline = { docs: 0, notes: 0 };
    const first = queue.enqueue(
      'patient',
      baseline,
      reverse ? { notes: 1 } : { docs: 1 },
      async (next) => {
        snapshots.push(next);
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    );
    const second = queue.enqueue(
      'patient',
      baseline,
      reverse ? { docs: 1 } : { notes: 1 },
      async (next) => {
        snapshots.push(next);
        return true;
      },
    );
    await Promise.resolve();
    assert.equal(snapshots.length, 1);
    release(true);
    await Promise.all([first, second]);
    assert.deepEqual(snapshots[1], { docs: 1, notes: 1 });
  }
});

test('failed edits are not carried into later saves; independent patients do not block', async () => {
  const queue = new CartellaWriteQueue<{ docs: number; notes: number }>();
  const baseline = { docs: 0, notes: 0 };
  let release!: (ok: boolean) => void;
  const first = queue.enqueue(
    'patient-a',
    baseline,
    { docs: 1 },
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const second = queue.enqueue('patient-a', baseline, { notes: 1 }, async (next) => {
    assert.deepEqual(next, { docs: 0, notes: 1 });
    return true;
  });
  assert.equal(await queue.enqueue('patient-b', baseline, { docs: 2 }, async () => true), true);
  release(false);
  assert.equal(await first, false);
  assert.equal(await second, true);
});

test('record deltas retain additions made while a document form was reopened', async () => {
  const queue = new CartellaWriteQueue<CartellaPaziente>();
  const doc = (id: string, note = '') => ({ id, note }) as DocumentoConsegnato;
  const baseline = {
    pazienteId: 'patient-a',
    documentiConsegnati: [doc('old')],
  } as CartellaPaziente;
  const a = queue.enqueue(
    'a',
    baseline,
    { documentiConsegnati: [doc('new-a'), doc('old')] },
    async () => true,
    mergeCartellaPatch,
  );
  const b = queue.enqueue(
    'a',
    baseline,
    { documentiConsegnati: [doc('new-b'), doc('old', 'updated')] },
    async (next) => {
      assert.deepEqual(next.documentiConsegnati.map((item) => item.id).sort(), [
        'new-a',
        'new-b',
        'old',
      ]);
      assert.equal(next.documentiConsegnati.find((item) => item.id === 'old')?.note, 'updated');
      return true;
    },
    mergeCartellaPatch,
  );
  await Promise.all([a, b]);
  const latest = { ...baseline, documentiConsegnati: [doc('old'), doc('concurrent')] };
  assert.deepEqual(
    mergeCartellaPatch(latest, baseline, { documentiConsegnati: [] }).documentiConsegnati.map(
      (item) => item.id,
    ),
    ['concurrent'],
  );
});

test('rejected requests release queue and a new session uses its own baseline', async () => {
  const queue = new CartellaWriteQueue<{ value: number }>();
  const a = queue.enqueue('old-session', { value: 0 }, { value: 1 }, async () => {
    throw new Error('offline');
  });
  const b = queue.enqueue(
    'old-session',
    { value: 0 },
    { value: 2 },
    async (next) => next.value === 2,
  );
  await assert.rejects(() => a, /offline/);
  assert.equal(await b, true);
  assert.equal(
    await queue.enqueue('new-session', { value: 3 }, {}, async (next) => next.value === 3),
    true,
  );
});

// Execute the production functions themselves: these regressions control transport timing
// and the React setter scheduler, rather than reimplementing the receipt/queue algorithm.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
type ChartUpdater = (previous: CartellaPaziente[]) => CartellaPaziente[];
type TestResponse = { ok: boolean; json: () => Promise<unknown> };
type Transport = (url: string, init: RequestInit) => Promise<TestResponse>;
type OrdinarySave = (
  id: string,
  patch: Partial<CartellaPaziente>,
  options?: { optimistic?: boolean },
) => Promise<boolean>;
type PsSave = (id: string, command: TemporaryPsExitCommand) => Promise<CartellaPaziente>;
const productionSource = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const productionAst = ts.createSourceFile(
  'App.tsx',
  productionSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
function actualAppFunction<T>(name: string, dependencies: Record<string, unknown>): T {
  const matches: ts.FunctionDeclaration[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(productionAst);
  assert.equal(matches.length, 1, `Execute exactly one production ${name}`);
  const compiled = ts.transpileModule(matches[0].getText(productionAst), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(dependencies), `${compiled};return ${name};`)(
    ...Object.values(dependencies),
  ) as T;
}
function appSaveHarness() {
  const harness = {
    epoch: { current: 1 },
    visible: [createDefaultCartella('synthetic-session-patient')],
    queue: { current: new CartellaWriteQueue<CartellaPaziente>() },
    scheduled: [] as ChartUpdater[],
    deferSetters: false,
    stateWrites: [] as CartellaPaziente[][],
    toasts: [] as string[],
    calls: [] as Array<{ url: string; data: Record<string, unknown> }>,
    effects: [] as string[],
    transport: (async () => {
      throw new Error('Unexpected transport');
    }) as Transport,
    flush() {
      for (const update of this.scheduled.splice(0)) {
        this.visible = update(this.visible);
        this.stateWrites.push(this.visible);
      }
    },
    dependencies() {
      return {
        sessionEpochRef: this.epoch,
        cartelle: this.visible,
        cartellaWrites: this.queue,
        createDefaultCartella,
        mergeCartellaPatch,
        cartellaWriteData,
        operatorHeaders,
        API_URL: 'http://127.0.0.1:1',
        fetch: async (url: string, init: RequestInit) => {
          this.calls.push({ url, data: JSON.parse(String(init.body)) });
          return this.transport(url, init);
        },
        setCartelle: (update: ChartUpdater) => {
          if (this.deferSetters) this.scheduled.push(update);
          else {
            this.visible = update(this.visible);
            this.stateWrites.push(this.visible);
          }
        },
        showToast: (message: string) => this.toasts.push(message),
        saveTemporaryPsExit,
        invalidateCachedGet: () => this.effects.push('invalidate'),
        loadTherapySlots: () => this.effects.push('load'),
        therapyDateRef: { current: '2026-10-17' },
        TEMPORARY_PS_EXIT_CHANGED,
        window: {
          dispatchEvent: (event: CustomEvent) =>
            this.effects.push(`${event.type}:${event.detail.patientId}`),
        },
        CustomEvent,
      };
    },
    ordinary() {
      return actualAppFunction<OrdinarySave>('updateCartella', this.dependencies());
    },
    ps() {
      return actualAppFunction<PsSave>('updateTemporaryPsExit', this.dependencies());
    },
  };
  return harness;
}
function receipt(patientId: string, data: Partial<CartellaPaziente>): TestResponse {
  return { ok: true, json: async () => ({ patientId, data }) };
}

test('actual App rejects a JSON receipt from the old session, skips old queued PUT and accepts a new same-patient session', async () => {
  const h = appSaveHarness(),
    id = h.visible[0].pazienteId;
  const bodyStarted = deferred<void>(),
    body = deferred<unknown>();
  h.transport = async () =>
    h.calls.length === 1
      ? {
          ok: true,
          json: () => {
            bodyStarted.resolve();
            return body.promise;
          },
        }
      : receipt(id, { noteGenerali: 'new-session authoritative receipt' });
  const oldSave = h.ordinary();
  const first = oldSave(id, { noteGenerali: 'old first patch' }, { optimistic: false });
  const queued = oldSave(id, { medicoCurante: 'old queued patch' }, { optimistic: false });
  await bodyStarted.promise;
  h.epoch.current = 2;
  h.visible = [{ ...createDefaultCartella(id), noteGenerali: 'new-session initial' }];
  assert.equal(
    await h.ordinary()(id, { noteGenerali: 'new-session patch' }, { optimistic: false }),
    true,
  );
  const current = h.visible;
  body.resolve({ patientId: id, data: { noteGenerali: 'old-session late receipt' } });
  assert.equal(await first, false);
  assert.equal(await queued, false);
  assert.equal(h.calls.length, 2, 'Queued old-session save never issues its PUT');
  assert.equal(h.visible, current);
  assert.equal(h.visible[0].noteGenerali, 'new-session authoritative receipt');
  assert.equal(h.stateWrites.length, 1);
  assert.deepEqual(h.toasts, ['Dati salvati correttamente']);
});

test('actual App deferred confirmed and optimistic setters preserve new-session state by reference', async () => {
  for (const optimistic of [false, true]) {
    const h = appSaveHarness(),
      id = h.visible[0].pazienteId;
    h.deferSetters = true;
    h.transport = async () => receipt(id, { noteGenerali: 'old-session confirmed' });
    assert.equal(
      await h.ordinary()(id, { noteGenerali: 'old-session optimistic' }, { optimistic }),
      true,
    );
    assert.equal(h.scheduled.length, optimistic ? 2 : 1);
    h.epoch.current = 2;
    const current = [
      { ...createDefaultCartella('new-session-patient'), noteGenerali: 'new-session data' },
    ];
    h.visible = current;
    h.flush();
    assert.equal(h.visible, current);
    assert.ok(h.stateWrites.every((value) => value === current));
    assert.equal(h.visible[0].noteGenerali, 'new-session data');
  }
});

test('actual App same-session writes keep authoritative PS state, serialized patches and success feedback', async () => {
  const h = appSaveHarness(),
    id = h.visible[0].pazienteId;
  const hold = {
    exitId: 'verified-exit',
    decision: 'pause' as const,
    departedAt: '2026-10-17T12:00:00Z',
  };
  h.transport = async (_url, init) => {
    const data = JSON.parse(String(init.body)).data;
    assert.equal(Object.hasOwn(data, 'pazienteId'), false);
    assert.equal(Object.hasOwn(data, 'valutazioniTinetti'), false);
    if (h.calls.length === 1)
      return receipt(id, {
        ...data,
        noteGenerali: 'server verified',
        liberatoria: { temporaryPsExit: hold },
      });
    assert.equal(data.noteGenerali, 'server verified');
    assert.deepEqual(data.liberatoria.temporaryPsExit, hold);
    return receipt(id, data);
  };
  const save = h.ordinary();
  const first = save(id, { noteGenerali: 'client first' }, { optimistic: false });
  const second = save(id, { medicoCurante: 'client second' }, { optimistic: false });
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(h.visible[0].noteGenerali, 'server verified');
  assert.equal(h.visible[0].medicoCurante, 'client second');
  assert.deepEqual(h.visible[0].liberatoria?.temporaryPsExit, hold);
  assert.deepEqual(h.toasts, ['Dati salvati correttamente', 'Dati salvati correttamente']);
});

test('actual App still rejects foreign-patient authoritative receipts without installing data', async () => {
  const h = appSaveHarness(),
    original = h.visible;
  h.transport = async () => receipt('foreign-patient', { noteGenerali: 'must not enter chart' });
  assert.equal(await h.ordinary()(original[0].pazienteId, {}, { optimistic: false }), false);
  assert.equal(h.visible, original);
  assert.equal(h.stateWrites.length, 0);
  assert.deepEqual(h.toasts, ['Impossibile salvare i dati']);
});

const psCommand: TemporaryPsExitCommand = {
  action: 'depart',
  decision: 'pause',
  reason: 'Synthetic explicit decision',
  requestId: 'synthetic-session-request',
  confirmed: true,
};
function psReceipt(id: string, actorId: string, command = psCommand) {
  assert.equal(command.action, 'depart');
  const departedAt = '2026-10-17T12:00:00Z';
  return {
    patientId: id,
    data: {
      ...createDefaultCartella(id),
      liberatoria: {
        temporaryPsExit: { exitId: `exit-${actorId}`, decision: command.decision, departedAt },
        usciteLog: [
          {
            id: `exit-${actorId}`,
            data: '2026-10-17',
            ora: '14:00',
            operatore: actorId,
            note: command.reason,
            psExit: {
              decision: command.decision,
              departedAt,
              actorId,
              requestId: command.requestId,
              requestHash: 'synthetic-server-hash',
            },
          },
        ],
      },
    },
  };
}

test('actual App PS uses the real receipt verifier and guards its deferred React setter', async () => {
  const previousFetch = globalThis.fetch,
    previousOperator = getCurrentOperator();
  try {
    for (const defer of [false, true]) {
      const h = appSaveHarness(),
        id = h.visible[0].pazienteId;
      h.deferSetters = defer;
      setCurrentOperator({ id: 'synthetic-actor', role: 'infermiere' });
      globalThis.fetch = async () =>
        new Response(JSON.stringify(psReceipt(id, 'synthetic-actor')), { status: 200 });
      const result = await h.ps()(id, psCommand);
      assert.equal(result.liberatoria?.temporaryPsExit?.exitId, 'exit-synthetic-actor');
      assert.equal(
        h.effects.length,
        3,
        'Verified same-session command refreshes the feed and event once',
      );
      if (defer) {
        h.epoch.current++;
        const current = [createDefaultCartella('new-session-patient')];
        h.visible = current;
        h.flush();
        assert.equal(h.visible, current);
        assert.equal(h.visible[0].liberatoria?.temporaryPsExit, undefined);
      } else
        assert.equal(h.visible[0].liberatoria?.temporaryPsExit?.exitId, 'exit-synthetic-actor');
    }
  } finally {
    globalThis.fetch = previousFetch;
    setCurrentOperator(previousOperator);
  }
});

test('actual App late PS JSON and its queued ordinary save cannot affect a new same-patient session', async () => {
  const previousFetch = globalThis.fetch,
    previousOperator = getCurrentOperator();
  const h = appSaveHarness(),
    id = h.visible[0].pazienteId;
  const started = deferred<void>(),
    body = deferred<unknown>();
  let writes = 0;
  try {
    setCurrentOperator({ id: 'old-actor', role: 'infermiere' });
    globalThis.fetch = async () => {
      writes++;
      return writes === 1
        ? ({
            ok: true,
            json: () => {
              started.resolve();
              return body.promise;
            },
          } as Response)
        : new Response(
            JSON.stringify(
              psReceipt(id, 'new-actor', { ...psCommand, requestId: 'new-session-request' }),
            ),
            { status: 200 },
          );
    };
    const oldPs = h.ps()(id, psCommand);
    const rejected = assert.rejects(oldPs, /Sessione cambiata/);
    const oldOrdinary = h.ordinary()(id, { noteGenerali: 'old queued' }, { optimistic: false });
    await started.promise;
    h.epoch.current = 2;
    h.visible = [createDefaultCartella(id)];
    setCurrentOperator({ id: 'new-actor', role: 'infermiere' });
    await h.ps()(id, { ...psCommand, requestId: 'new-session-request' });
    const current = h.visible;
    body.resolve(psReceipt(id, 'old-actor'));
    await rejected;
    assert.equal(await oldOrdinary, false);
    assert.equal(writes, 2);
    assert.equal(h.calls.length, 0, 'Old ordinary save is rejected before transport');
    assert.equal(h.visible, current);
    assert.equal(h.visible[0].liberatoria?.temporaryPsExit?.exitId, 'exit-new-actor');
    assert.equal(h.effects.length, 3, 'Only the verified new session publishes effects');
    assert.deepEqual(h.toasts, []);
  } finally {
    globalThis.fetch = previousFetch;
    setCurrentOperator(previousOperator);
  }
});
