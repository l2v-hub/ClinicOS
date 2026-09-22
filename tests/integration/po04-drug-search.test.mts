import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  startParameterDatabase,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
import { nucleoNome } from '../../backend/src/services/farmaci/normalizza.js';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let search: typeof import('../../backend/src/services/farmaci/search-page.js').cercaPaginaFarmaci;
let wrapper: typeof import('../../backend/src/services/farmaci/ricerca.js').cercaFarmaci;
let server: import('node:http').Server;
let base: string;
before(
  async () => {
    database = await startParameterDatabase();
    selectLocalParameterDatabase(database.url);
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    ({ cercaPaginaFarmaci: search } =
      await import('../../backend/src/services/farmaci/search-page.js'));
    ({ cercaFarmaci: wrapper } = await import('../../backend/src/services/farmaci/ricerca.js'));
    async function insert(
      aic: string,
      name: string,
      description: string,
      form = 'Compressa',
      ingredient = 'PARACETAMOLO',
    ) {
      await database.db.query(
        'INSERT INTO "Farmaco" ("aic","denominazione","denominazioneNorm","descrizione","forma","statoAmministrativo","aggiornatoIl") VALUES ($1,$2,$3,$4,$5,\'Autorizzata\',NOW())',
        [aic, name, nucleoNome(name), description, form],
      );
      await database.db.query(
        'INSERT INTO "FarmacoPrincipioAttivo" ("id","aic","principioAttivo","principioAttivoNorm") VALUES ($1,$2,$3,$3)',
        [`pa-${aic}`, aic, ingredient],
      );
    }
    for (let i = 0; i < 14; i++)
      await insert(
        `012740${String(i).padStart(3, '0')}`,
        'TACHIPIRINA',
        '500 MG COMPRESSE - 20 COMPRESSE',
      );
    await insert('012745170', 'TACHIPIRINA', '1000 MG COMPRESSE - 8 COMPRESSE');
    await insert('012745182', 'TACHIPIRINA', '1000 MG COMPRESSE - 16 COMPRESSE');
    await insert('012745183', 'TACHIPIRINA', '1000 MG COMPRESSE EFFERVESCENTI - 16 COMPRESSE');
    await insert('012745184', 'TACHIPIRINA', '1000 MG SUPPOSTE', 'Supposta');
    await insert('022745170', 'VITAMINA B12', '1000 MCG COMPRESSE', 'Compressa', 'CIANOCOBALAMINA');
    await insert('022745171', 'COVID19', '20 MG COMPRESSE');
    await insert('022745172', 'COVID 19', '30 MG COMPRESSE');
    await database.db.exec(
      `INSERT INTO "Farmaco" ("aic","denominazione","denominazioneNorm","descrizione","forma","statoAmministrativo","aggiornatoIl") SELECT '09'||LPAD(n::text,7,'0'),'SCAN','SCAN','500 MG COMPRESSE','Compressa','Autorizzata',NOW() FROM generate_series(1,1100) n`,
    );
    await insert('099999999', 'SCAN', '1000 MG COMPRESSE');
    const [{ default: express }, { default: router }] = await Promise.all([
      import('express'),
      import('../../backend/src/routes/farmaci.js'),
    ]);
    const app = express();
    app.use('/farmaci', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  },
  { timeout: 60000 },
);
after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('null-PA description filtering happens before the first 12 results', async () => {
  for (const q of ['Tachipirina 1000 compresse', 'Tachipirina1000', 'Tachipirina1000compresse']) {
    const page = await search(q, { limite: 12 });
    const expected =
      q === 'Tachipirina1000'
        ? ['012745170', '012745182', '012745183', '012745184']
        : ['012745170', '012745182'];
    assert.deepEqual(
      page.esiti.map((x) => x.aic),
      expected,
    );
    assert.equal(page.pageInfo.hasMore, false);
  }
  assert.deepEqual(
    (await wrapper('Tachipirina 1000 compresse', { limite: 12 })).map((x) => x.aic),
    ['012745170', '012745182'],
  );
  assert.deepEqual(await wrapper(''), []);
  assert.deepEqual(
    (await search('Tachipirina 1000 compresse effervescenti')).esiti.map((x) => x.aic),
    ['012745183'],
  );
  assert.equal((await search('Tachipirina 750 mg compresse')).esiti.length, 0);
});
test('stable continuation visits every package once and binds query, mode and limit', async () => {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await search('Tachipirina', { limite: 3, cursor });
    ids.push(...page.esiti.map((x) => x.aic));
    cursor = page.pageInfo.nextCursor ?? undefined;
  } while (cursor);
  assert.equal(ids.length, 18);
  assert.equal(new Set(ids).size, 18);
  assert.deepEqual(ids, [...ids].sort());
  const first = await search('Tachipirina', { limite: 3 });
  for (const options of [{ limite: 4 }, { limite: 3, perPa: true }])
    await assert.rejects(
      search('Tachipirina', { ...options, cursor: first.pageInfo.nextCursor! }),
      /Cursore/,
    );
  await assert.rejects(
    search('Paracetamolo', { limite: 3, cursor: first.pageInfo.nextCursor! }),
    /Cursore/,
  );
});
test('empty bounded scan pages advance and eventually expose the matching tail', async () => {
  const first = await search('SCAN 1000 compresse', { limite: 12 });
  assert.deepEqual(first.esiti, []);
  assert.equal(first.pageInfo.hasMore, true);
  const next = await search('SCAN 1000 compresse', {
    limite: 12,
    cursor: first.pageInfo.nextCursor!,
  });
  assert.deepEqual(
    next.esiti.map((x) => x.aic),
    ['099999999'],
  );
  assert.equal(next.pageInfo.hasMore, false);
  assert.deepEqual(
    (await wrapper('SCAN 1000 compresse', { limite: 12 })).map((x) => x.aic),
    ['099999999'],
  );
});
test('active ingredient, typo, numeric brands and exact AIC remain available', async () => {
  assert.deepEqual(
    (await search('Paracetamolo 1000 compresse', { perPa: true })).esiti.map((x) => x.aic),
    ['099999999', '012745170', '012745182'],
  );
  assert.deepEqual(
    (await search('Tachiprina 1000 compresse')).esiti.map((x) => x.aic),
    ['012745170', '012745182'],
  );
  assert.deepEqual(
    (await search('Vitamina B12')).esiti.map((x) => x.aic),
    ['022745170'],
  );
  assert.deepEqual(
    (await search('Vitamina B12 1000 mcg compresse')).esiti.map((x) => x.aic),
    ['022745170'],
  );
  assert.deepEqual(
    (await search('COVID19')).esiti.map((x) => x.aic),
    ['022745171'],
  );
  assert.deepEqual(
    (await search('COVID 19')).esiti.map((x) => x.aic),
    ['022745172', '022745171'],
  );
  assert.deepEqual(
    (await search('012745182')).esiti.map((x) => x.aic),
    ['012745182'],
  );
  assert.deepEqual((await search('999999999')).esiti, []);
});
test('optional clients never reuse another client name cache', async () => {
  const counts = [0, 0];
  const client = (i: number) =>
    ({
      farmaco: {
        findMany: async () => [],
      },
      $queryRaw: async () => {
        counts[i]++;
        return [{ denominazioneNorm: 'MOCK' }];
      },
    }) as unknown as typeof prisma;
  const a = client(0);
  const b = client(1);
  await search('mock', { client: a });
  await search('mock', { client: b });
  await search('mock', { client: a });
  assert.deepEqual(counts, [1, 1]);
});

test('exact, AIC and ingredient lookup do not require a global name index', async () => {
  const client = {
    farmaco: prisma.farmaco,
    $queryRaw: async () => {
      throw new Error('Index must stay lazy');
    },
  } as unknown as typeof prisma;
  assert.equal((await search('Tachipirina 1000 compresse', { client })).esiti.length, 2);
  assert.equal((await search('012745170', { client })).esiti[0].aic, '012745170');
  assert.equal(
    (await search('Paracetamolo 1000 compresse', { client, perPa: true })).esiti.length,
    3,
  );
});

test('an oversized name index falls back to bounded scans without omissions', async () => {
  const client = {
    farmaco: prisma.farmaco,
    $queryRaw: async () =>
      Array.from({ length: 30001 }, (_, i) => ({ denominazioneNorm: `NAME${i}` })),
  } as unknown as typeof prisma;
  let cursor: string | undefined;
  const ids: string[] = [];
  for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
    const page = await search('Tachiprina 1000 compresse', { client, cursor, limite: 1 });
    ids.push(...page.esiti.map((row) => row.aic));
    cursor = page.pageInfo.nextCursor ?? undefined;
    if (!cursor) break;
  }
  assert.equal(cursor, undefined);
  assert.deepEqual(ids, ['012745170', '012745182']);
});
test('public route adds compatible pageInfo and rejects malformed inputs with 400', async () => {
  const first = await fetch(`${base}/farmaci/cerca?q=Tachipirina&limite=2`);
  assert.equal(first.status, 200);
  const page = await first.json();
  assert.equal(page.query, 'Tachipirina');
  assert.equal(page.esiti.length, 2);
  assert.equal(page.pageInfo.hasMore, true);
  for (const suffix of [
    'q=Tachipirina&limite=-1',
    'q=Tachipirina&limite=26',
    'q=Tachipirina&limite=2x',
    'q=Tachipirina&cursor=invalid',
    'q=Tachipirina&pa=2',
    'q=Tachipirina&pa=1&pa=1',
    `q=${'x'.repeat(81)}`,
    'q=Tachipirina&q=Altro',
  ])
    assert.equal((await fetch(`${base}/farmaci/cerca?${suffix}`)).status, 400, suffix);
});
