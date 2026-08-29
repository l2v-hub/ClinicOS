#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const requestedRows = Number.parseInt(process.argv[2] ?? '100000', 10);
if (!Number.isSafeInteger(requestedRows) || requestedRows < 1 || requestedRows > 1_000_000) {
  throw new Error('row count must be an integer between 1 and 1000000');
}

const P95_LIMIT_MS = 100;
const RUNS = 25;
const actor = 'bench-op-42';
const listSql = `
  SELECT b."id", b."createdAt"
    FROM (
      (SELECT n."id", n."createdAt"
         FROM "Nota" n
        WHERE n."autoreId" = $1
        ORDER BY n."createdAt" DESC, n."id" DESC
        LIMIT 51)
      UNION ALL
      (SELECT n."id", n."createdAt"
         FROM "Nota" n
        WHERE n."destinatarioId" IN ($1, 'tutti') AND n."autoreId" <> $1
        ORDER BY n."createdAt" DESC, n."id" DESC
        LIMIT 51)
    ) b
   ORDER BY b."createdAt" DESC, b."id" DESC
   LIMIT 51`;
const cursorSql = `
  SELECT b."id", b."createdAt"
    FROM (
      (SELECT n."id", n."createdAt"
         FROM "Nota" n
        WHERE n."autoreId" = $1
          AND (n."createdAt" < $2 OR (n."createdAt" = $2 AND n."id" < $3))
        ORDER BY n."createdAt" DESC, n."id" DESC
        LIMIT 51)
      UNION ALL
      (SELECT n."id", n."createdAt"
         FROM "Nota" n
        WHERE n."destinatarioId" IN ($1, 'tutti') AND n."autoreId" <> $1
          AND (n."createdAt" < $2 OR (n."createdAt" = $2 AND n."id" < $3))
        ORDER BY n."createdAt" DESC, n."id" DESC
        LIMIT 51)
    ) b
   ORDER BY b."createdAt" DESC, b."id" DESC
   LIMIT 51`;
const searchSql = `
  SELECT n."id", n."createdAt"
    FROM "Nota" n
   WHERE (n."autoreId" = $1
      OR (n."destinatarioId" IN ($1, 'tutti') AND n."autoreId" <> $1))
     AND to_tsvector(
       'simple'::regconfig,
       coalesce(n."messaggio", '') || ' ' || coalesce(n."autoreNome", '') || ' ' ||
       coalesce(n."destinatarioNome", '') || ' ' || coalesce(n."pazienteNome", '')
     ) @@ to_tsquery('simple'::regconfig, '4242:*')
   ORDER BY n."createdAt" DESC, n."id" DESC
   LIMIT 51`;
const unreadSql = `
  SELECT count(*)::int AS count
    FROM "Nota" n
   WHERE n."destinatarioId" IN ($1, 'tutti')
     AND n."autoreId" <> $1
     AND (
       EXISTS (
         SELECT 1 FROM "NotaRecipientState" rs
          WHERE rs."notaId" = n."id" AND rs."operatorId" = $1 AND rs."stato" = 'non_letta'
       )
       OR (
         n."stato" = 'non_letta'
         AND NOT EXISTS (
           SELECT 1 FROM "NotaRecipientState" rs
            WHERE rs."notaId" = n."id" AND rs."operatorId" = $1
         )
       )
     )`;

function p95(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

async function measure(client, sql, params) {
  await client.query(sql, params);
  const durations = [];
  let result;
  for (let run = 0; run < RUNS; run += 1) {
    const start = performance.now();
    result = await client.query(sql, params);
    durations.push(performance.now() - start);
  }
  return { result, p95Ms: p95(durations), maxMs: Math.max(...durations) };
}

async function explain(client, sql, params) {
  const result = await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, params);
  return result.rows[0]['QUERY PLAN'][0];
}

function indexNames(node, names = new Set()) {
  if (typeof node?.['Index Name'] === 'string') names.add(node['Index Name']);
  for (const child of node?.Plans ?? []) indexNames(child, names);
  return names;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('BEGIN');
  const insertStart = performance.now();
  await client.query(
    `INSERT INTO "Nota"
       ("id", "autoreId", "autoreNome", "destinatarioId", "destinatarioNome",
        "priorita", "messaggio", "stato", "createdAt", "updatedAt")
     SELECT
       'bench-note-' || g,
       'bench-op-' || (g % 200),
       'Operatore ' || (g % 200),
       CASE WHEN g % 1000 = 0 THEN 'tutti' ELSE 'bench-op-' || ((g + 17) % 200) END,
       'Destinatario',
       CASE WHEN g % 50 = 0 THEN 'urgente' ELSE 'normale' END,
       'Messaggio sintetico ' || g,
       CASE WHEN g % 3 = 0 THEN 'letta' ELSE 'non_letta' END,
       now() - (g * interval '1 second'),
       now()
     FROM generate_series(1, $1) AS g`,
    [requestedRows],
  );
  await client.query('ANALYZE "Nota"');
  await client.query('ANALYZE "NotaRecipientState"');
  const insertMs = performance.now() - insertStart;

  const deepId = `bench-note-${Math.max(1, Math.floor(requestedRows * 0.8))}`;
  const deep = await client.query(`SELECT "id", "createdAt" FROM "Nota" WHERE "id" = $1`, [deepId]);
  const cursorParams = [actor, deep.rows[0].createdAt, deep.rows[0].id];
  const list = await measure(client, listSql, [actor]);
  const cursor = await measure(client, cursorSql, cursorParams);
  const search = await measure(client, searchSql, [actor]);
  const unread = await measure(client, unreadSql, [actor]);
  const listPlan = await explain(client, listSql, [actor]);
  const cursorPlan = await explain(client, cursorSql, cursorParams);
  const searchPlan = await explain(client, searchSql, [actor]);
  const plans = {
    list: [...indexNames(listPlan.Plan)],
    cursor: [...indexNames(cursorPlan.Plan)],
    search: [...indexNames(searchPlan.Plan)],
  };
  const mailboxIndexes = new Set([
    'Nota_autoreId_createdAt_id_idx',
    'Nota_destinatarioId_createdAt_id_idx',
  ]);
  const failures = [];
  for (const [name, metric] of Object.entries({ list, cursor, search, unread })) {
    if (metric.p95Ms > P95_LIMIT_MS) {
      failures.push(`${name} p95 ${metric.p95Ms.toFixed(2)}ms > ${P95_LIMIT_MS}ms`);
    }
  }
  if (!plans.list.some((name) => mailboxIndexes.has(name))) {
    failures.push('list plan does not use a mailbox index');
  }
  if (!plans.cursor.some((name) => mailboxIndexes.has(name))) {
    failures.push('deep cursor plan does not use a mailbox index');
  }
  if (!plans.search.includes('Nota_search_fts_idx')) {
    failures.push('search plan does not use Nota_search_fts_idx');
  }

  const report = {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    rows: requestedRows,
    runs: RUNS,
    thresholdP95Ms: P95_LIMIT_MS,
    insertMs: Number(insertMs.toFixed(2)),
    list: {
      rows: list.result.rowCount,
      p95Ms: Number(list.p95Ms.toFixed(2)),
      maxMs: Number(list.maxMs.toFixed(2)),
      executionMs: listPlan['Execution Time'],
      indexes: plans.list,
    },
    deepCursor: {
      atRow: Math.floor(requestedRows * 0.8),
      rows: cursor.result.rowCount,
      p95Ms: Number(cursor.p95Ms.toFixed(2)),
      maxMs: Number(cursor.maxMs.toFixed(2)),
      executionMs: cursorPlan['Execution Time'],
      indexes: plans.cursor,
    },
    indexedSearch: {
      rows: search.result.rowCount,
      p95Ms: Number(search.p95Ms.toFixed(2)),
      maxMs: Number(search.maxMs.toFixed(2)),
      executionMs: searchPlan['Execution Time'],
      indexes: plans.search,
    },
    unreadSummary: {
      count: unread.result.rows[0].count,
      p95Ms: Number(unread.p95Ms.toFixed(2)),
      maxMs: Number(unread.maxMs.toFixed(2)),
    },
    failures,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length > 0)
    throw new Error(`notes mailbox benchmark failed: ${failures.join('; ')}`);
} finally {
  await client.query('ROLLBACK').catch(() => undefined);
  await client.end();
}
