import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectGiroAllergies, readGiroAllergies } from '../therapyAllergyRead';
import { deriveAllergySummary } from '../allergyStatusModel';
import { setCurrentOperator } from '../operatorSession';

const id = 'QA-ALLERGY-404';
const body = (allergie: unknown = [], allergieStatus?: unknown) => ({
  patientId: id,
  data: { allergie, allergieStatus },
});
test('known list wins contradictory absence and keeps source text without inventing severity', () => {
  const snapshot = projectGiroAllergies(
    body(
      [
        {
          allergene: ' Sostanza sintetica ',
          reazione: 'Rash',
          note: 'Test',
          extraChart: 'not retained',
        },
      ],
      'assenti',
    ),
    id,
  );
  assert.equal(deriveAllergySummary(snapshot.items, snapshot.status).label, '1 allergia');
  assert.deepEqual(snapshot.items[0], {
    allergene: 'Sostanza sintetica',
    gravita: undefined,
    reazione: 'Rash',
    note: 'Test',
    documentato: '',
    documentatoDa: '',
  });
  assert.equal(JSON.stringify(snapshot).includes('extraChart'), false);
});
test('explicit verified absence and patient denial remain distinct', () => {
  for (const [status, label] of [
    ['assenti', 'Allergie assenti (verificato)'],
    ['paziente_nega', 'Paziente nega allergie'],
  ] as const) {
    const snapshot = projectGiroAllergies(body([], status), id);
    assert.equal(deriveAllergySummary(snapshot.items, snapshot.status).label, label);
  }
});
test('missing/null/undocumented source never becomes verified absence', () => {
  for (const value of [
    { patientId: id, data: null },
    { patientId: id, data: {} },
    { patientId: id, data: { allergieStatus: 'assenti' } },
    body([], 'presenti'),
    body([]),
  ]) {
    const snapshot = projectGiroAllergies(value, id);
    assert.equal(
      deriveAllergySummary(snapshot.items, snapshot.status).label,
      'Stato non documentato',
    );
  }
});
test('malformed source and patient mismatch reject instead of claiming absence', () => {
  for (const value of [
    null,
    [],
    {},
    { patientId: 'different', data: { allergie: [], allergieStatus: 'assenti' } },
    { patientId: id, data: [] },
    body(null, 'assenti'),
    body([{}], 'assenti'),
    body([null]),
    body([], 'unknown-status'),
  ]) {
    assert.throws(() => projectGiroAllergies(value, id));
  }
});
test('allergen and severity/reaction/documentation are preserved, other chart fields discarded', () => {
  const item = {
    allergene: '<script>synthetic</script>',
    gravita: 'grave',
    reazione: 'Reazione sintetica',
    documentato: '2026-10-09',
    documentatoDa: 'QA',
    note: 'Nota sintetica',
  };
  assert.deepEqual(projectGiroAllergies({ ...body([item], 'presenti'), unrelated: 'ignore' }, id), {
    items: [item],
    status: 'presenti',
  });
});
test('fresh scoped request uses encoded identity, existing auth headers and no-store', async () => {
  const original = globalThis.fetch;
  setCurrentOperator({ id: 'QA-OPERATOR-404', role: 'nurse' });
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url).endsWith('/patients/QA%2F404/cartella'), true);
      assert.equal(init?.cache, 'no-store');
      assert.deepEqual(init?.headers, {
        'X-Operator-Id': 'QA-OPERATOR-404',
        'X-Operator-Role': 'nurse',
      });
      assert.ok(init?.signal);
      return new Response(JSON.stringify({ patientId: 'QA/404', data: { allergie: [] } }));
    };
    assert.deepEqual(await readGiroAllergies('QA/404', new AbortController().signal), {
      items: [],
      status: undefined,
    });
  } finally {
    globalThis.fetch = original;
    setCurrentOperator(null);
  }
});
test('failed HTTP and aborted late response never return source data', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(readGiroAllergies(id, new AbortController().signal));
    const controller = new AbortController();
    globalThis.fetch = async () => {
      controller.abort();
      return new Response(JSON.stringify(body([], 'assenti')));
    };
    await assert.rejects(readGiroAllergies(id, controller.signal), { name: 'AbortError' });
  } finally {
    globalThis.fetch = original;
  }
});
test('bounded concurrency never starts a cancelled queued read; slots released after completion', async () => {
  const original = globalThis.fetch;
  const releases: (() => void)[] = [];
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      await new Promise<void>((resolve) => releases.push(resolve));
      return new Response(JSON.stringify(body([])));
    };
    const controllers = Array.from({ length: 5 }, () => new AbortController());
    const reads = controllers.map((c) => readGiroAllergies(id, c.signal));
    const cancelled = assert.rejects(reads[4], { name: 'AbortError' });
    await Promise.resolve();
    assert.equal(calls, 4);
    controllers[4].abort();
    await cancelled;
    releases.forEach((release) => release());
    await Promise.all(reads.slice(0, 4));
    assert.equal(calls, 4);
  } finally {
    releases.forEach((release) => release());
    globalThis.fetch = original;
  }
});
test('UI context is before drug/actions; local disclosure preserves route and existing admin payload', () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const giro = source('../../components/operator/TherapyGiroRows.tsx');
  assert.ok(giro.indexOf('<TherapyPatientAllergies') < giro.indexOf('<ul className="giro-drugs"'));
  assert.match(giro, /!hidePatientHead &&/);
  const component = source('../../components/operator/TherapyPatientAllergies.tsx');
  assert.match(component, /useCan\('clinical_record.get'\)/);
  assert.match(component, /<details/);
  assert.match(component, /<summary/);
  assert.match(component, /controller.abort\(\)/);
  assert.match(component, /state\?\.key === key/);
  assert.doesNotMatch(
    component,
    /location\.|onConfirm|recordAdministration|cachedGetJson|dangerouslySetInnerHTML/,
  );
});
