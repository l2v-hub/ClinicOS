#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const requestedRows = Number.parseInt(process.argv[2] ?? '100000', 10);
if (!Number.isSafeInteger(requestedRows) || requestedRows < 1 || requestedRows > 1_000_000) {
  throw new Error('row count must be an integer between 1 and 1000000');
}

const RUNS = 25;
const P95_LIMIT_MS = 150;
const actor = 'bench-op-42';
const filteredActor = 'bench-op-50';
const patient = 'bench-patient-77';
const actorWhere = `("creatoDaId" = $1 OR "operatoreAssegnatoId" = $1)`;
const feedColumns = `"id", "pazienteId", "pazienteNome", "priorita", "stato", "tipo",
  "note", "scadenza", "oraScadenza", "operatoreAssegnato", "operatoreAssegnatoId",
  "creatoDA", "creatoDaId", "createdAt", "updatedAt"`;
const listSql = `
  SELECT * FROM (
    (SELECT ${feedColumns} FROM "Consegna" WHERE "creatoDaId" = $1
     ORDER BY "createdAt" DESC, "id" DESC LIMIT 21)
    UNION ALL
    (SELECT ${feedColumns} FROM "Consegna"
     WHERE "operatoreAssegnatoId" = $1 AND ("creatoDaId" IS NULL OR "creatoDaId" <> $1)
     ORDER BY "createdAt" DESC, "id" DESC LIMIT 21)
  ) scoped ORDER BY "createdAt" DESC, "id" DESC LIMIT 21`;
const cursorSql = `
  SELECT * FROM (
    (SELECT ${feedColumns} FROM "Consegna"
     WHERE "creatoDaId" = $1
       AND ("createdAt" < $2 OR ("createdAt" = $2 AND "id" < $3))
     ORDER BY "createdAt" DESC, "id" DESC LIMIT 21)
    UNION ALL
    (SELECT ${feedColumns} FROM "Consegna"
     WHERE "operatoreAssegnatoId" = $1 AND ("creatoDaId" IS NULL OR "creatoDaId" <> $1)
       AND ("createdAt" < $2 OR ("createdAt" = $2 AND "id" < $3))
     ORDER BY "createdAt" DESC, "id" DESC LIMIT 21)
  ) scoped ORDER BY "createdAt" DESC, "id" DESC LIMIT 21`;
const statusPrioritySql = `
  SELECT * FROM (
    (SELECT ${feedColumns} FROM "Consegna"
     WHERE "creatoDaId" = $1 AND "stato" <> 'completata' AND "priorita" = 'urgente'
     ORDER BY "createdAt" DESC, "id" DESC LIMIT 21)
    UNION ALL
    (SELECT ${feedColumns} FROM "Consegna"
     WHERE "operatoreAssegnatoId" = $1 AND ("creatoDaId" IS NULL OR "creatoDaId" <> $1)
       AND "stato" <> 'completata' AND "priorita" = 'urgente'
     ORDER BY "createdAt" DESC, "id" DESC LIMIT 21)
  ) scoped ORDER BY "createdAt" DESC, "id" DESC LIMIT 21`;
const searchSql = `
  SELECT ${feedColumns} FROM "Consegna"
  WHERE ${actorWhere}
    AND to_tsvector(
      'simple'::regconfig,
      coalesce("pazienteNome", '') || ' ' || coalesce("note", '') || ' ' ||
      coalesce("tipo", '') || ' ' || coalesce("operatoreAssegnato", '')
    ) @@ to_tsquery('simple'::regconfig, '4242:*')
  ORDER BY "createdAt" DESC, "id" DESC LIMIT 21`;
const overviewSql = `
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE "stato" <> 'completata')::int AS open,
    COUNT(*) FILTER (WHERE "stato" = 'in_corso')::int AS in_progress,
    COUNT(*) FILTER (WHERE "stato" <> 'completata' AND "priorita" = 'urgente')::int AS urgent_open
  FROM "Consegna"`;
const operatorSummarySql = `${overviewSql} WHERE ${actorWhere}`;
const operatorLoadSql = `
  SELECT "operatoreAssegnatoId", COUNT(*)::int AS open
  FROM "Consegna"
  WHERE "operatoreAssegnatoId" IS NOT NULL AND "stato" <> 'completata'
  GROUP BY "operatoreAssegnatoId"`;
const patientSql = `
  SELECT "pazienteId", COUNT(*)::int AS open
  FROM "Consegna"
  WHERE "pazienteId" = $1 AND "stato" <> 'completata'
  GROUP BY "pazienteId"`;
const aiSql = `
  SELECT "id", "createdAt" FROM "Consegna"
  WHERE ${actorWhere}
    AND "stato" <> 'completata'
    AND "scadenza" < '2026-08-29'
  ORDER BY CASE "priorita" WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 ELSE 2 END,
    "scadenza", "oraScadenza" NULLS LAST, "id"
  LIMIT 5`;

const maxPayloadSql = `
  SELECT ${feedColumns} FROM "Consegna"
  WHERE "creatoDaId" = 'bench-max-note'
  ORDER BY "createdAt" DESC, "id" DESC LIMIT 20`;

function expectedActorSummary(rows) {
  const expected = { total: 0, open: 0, in_progress: 0, urgent_open: 0 };
  for (let g = 1; g <= rows; g += 1) {
    if (g % 200 !== 42 && g % 200 !== 25) continue;
    expected.total += 1;
    if (g % 4 !== 0) expected.open += 1;
    if (g % 4 !== 0 && g % 3 === 0) expected.in_progress += 1;
    if (g % 4 !== 0 && g % 50 === 0) expected.urgent_open += 1;
  }
  return expected;
}

function percentile95(values) {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
}

async function measure(client, sql, params = []) {
  await client.query(sql, params);
  const durations = [];
  let result;
  for (let run = 0; run < RUNS; run += 1) {
    const start = performance.now();
    result = await client.query(sql, params);
    durations.push(performance.now() - start);
  }
  return { result, p95Ms: percentile95(durations), maxMs: Math.max(...durations) };
}

async function plan(client, sql, params = []) {
  const result = await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, params);
  return result.rows[0]['QUERY PLAN'][0];
}

function collectIndexes(node, names = new Set()) {
  if (typeof node?.['Index Name'] === 'string') names.add(node['Index Name']);
  for (const child of node?.Plans ?? []) collectIndexes(child, names);
  return names;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('BEGIN');
  const insertStart = performance.now();
  await client.query(
    `INSERT INTO "Consegna"
       ("id", "pazienteId", "pazienteNome", "priorita", "stato", "tipo", "note",
        "scadenza", "oraScadenza", "operatoreAssegnato", "operatoreAssegnatoId",
        "creatoDA", "creatoDaId", "createdAt", "updatedAt")
     SELECT
       'bench-consegna-' || g,
       'bench-patient-' || (g % 500),
       'Paziente ' || (g % 500),
       CASE WHEN g % 50 = 0 THEN 'urgente' WHEN g % 10 = 0 THEN 'alta' ELSE 'normale' END,
       CASE WHEN g % 4 = 0 THEN 'completata' WHEN g % 3 = 0 THEN 'in_corso' ELSE 'aperta' END,
       'Monitoraggio',
       'Consegna sintetica ' || g,
       CASE WHEN g % 5 = 0 THEN '2026-08-28' ELSE '2026-08-30' END,
       CASE WHEN g % 2 = 0 THEN '09:30' ELSE NULL END,
       'Operatore ' || ((g + 17) % 200),
       'bench-op-' || ((g + 17) % 200),
       'Operatore ' || (g % 200),
       'bench-op-' || (g % 200),
       now() - (g * interval '1 second'),
       now()
     FROM generate_series(1, $1) AS g`,
    [requestedRows],
  );
  // Worst-case page: 20 records with the accepted 4 kB note maximum. This is deliberately
  // separate from the large fixture so the scale run does not allocate hundreds of MB of text.
  await client.query(
    `INSERT INTO "Consegna"
       ("id", "pazienteId", "pazienteNome", "priorita", "stato", "tipo", "note",
        "scadenza", "operatoreAssegnato", "creatoDA", "creatoDaId", "createdAt", "updatedAt")
     SELECT 'bench-max-note-' || g, 'bench-max-patient', 'Paziente Payload', 'normale',
       'aperta', 'Monitoraggio', repeat('x', 4000), '2026-08-30', '', 'Payload Operator',
       'bench-max-note', now() - (g * interval '1 second'), now()
     FROM generate_series(1, 20) AS g`,
  );
  await client.query('ANALYZE "Consegna"');
  const insertMs = performance.now() - insertStart;

  const scopedCount = Math.max(1, Math.floor(requestedRows / 100));
  const deep = await client.query(
    `SELECT "id", "createdAt" FROM "Consegna" WHERE ${actorWhere}
     ORDER BY "createdAt" DESC, "id" DESC OFFSET $2 LIMIT 1`,
    [actor, Math.floor(scopedCount * 0.8)],
  );
  const cursorParams = [actor, deep.rows[0].createdAt, deep.rows[0].id];
  const metrics = {
    firstPage: await measure(client, listSql, [actor]),
    deepCursor: await measure(client, cursorSql, cursorParams),
    search: await measure(client, searchSql, [actor]),
    statusPriority: await measure(client, statusPrioritySql, [filteredActor]),
    overview: await measure(client, overviewSql),
    operatorSummary: await measure(client, operatorSummarySql, [actor]),
    operatorLoad: await measure(client, operatorLoadSql),
    patientSummary: await measure(client, patientSql, [patient]),
    aiSnapshot: await measure(client, aiSql, [actor]),
    maxPayload: await measure(client, maxPayloadSql),
  };
  const plans = {
    firstPage: await plan(client, listSql, [actor]),
    deepCursor: await plan(client, cursorSql, cursorParams),
    search: await plan(client, searchSql, [actor]),
    patientSummary: await plan(client, patientSql, [patient]),
  };
  const indexes = Object.fromEntries(
    Object.entries(plans).map(([name, value]) => [name, [...collectIndexes(value.Plan)]]),
  );
  const failures = [];
  for (const [name, metric] of Object.entries(metrics)) {
    if (metric.p95Ms > P95_LIMIT_MS) {
      failures.push(`${name} p95 ${metric.p95Ms.toFixed(2)}ms > ${P95_LIMIT_MS}ms`);
    }
  }
  const actorIndexes = new Set([
    'Consegna_creatoDaId_createdAt_id_idx',
    'Consegna_operatoreAssegnatoId_createdAt_id_idx',
  ]);
  if (!indexes.firstPage.some((name) => actorIndexes.has(name))) {
    failures.push('first page plan does not use a verified actor index');
  }
  if (!indexes.deepCursor.some((name) => actorIndexes.has(name))) {
    failures.push('deep cursor plan does not use a verified actor index');
  }
  if (!indexes.search.includes('Consegna_search_tsv_idx')) {
    failures.push('search plan does not use Consegna_search_tsv_idx');
  }
  if (!indexes.patientSummary.includes('Consegna_pazienteId_stato_createdAt_id_idx')) {
    failures.push('patient summary plan does not use the patient/status index');
  }
  const firstPageBytes = Buffer.byteLength(JSON.stringify(metrics.firstPage.result.rows), 'utf8');
  if (firstPageBytes > 100_000) {
    failures.push(`first page payload ${firstPageBytes} bytes > 100000 bytes`);
  }
  const maxPayloadBytes = Buffer.byteLength(JSON.stringify(metrics.maxPayload.result.rows), 'utf8');
  if (maxPayloadBytes > 100_000) {
    failures.push(`max-note page payload ${maxPayloadBytes} bytes > 100000 bytes`);
  }
  if (
    metrics.statusPriority.result.rows.some(
      (row) => row.stato === 'completata' || row.priorita !== 'urgente',
    )
  ) {
    failures.push('status/priority feed returned a row outside its filters');
  }
  if (metrics.statusPriority.result.rows.length === 0) {
    failures.push('status/priority fixture returned no rows, filter gate is not demonstrated');
  }
  const expected = expectedActorSummary(requestedRows);
  const actual = metrics.operatorSummary.result.rows[0];
  for (const key of Object.keys(expected)) {
    if (Number(actual?.[key]) !== expected[key]) {
      failures.push(`operator summary ${key}: expected ${expected[key]}, got ${actual?.[key]}`);
    }
  }

  const report = {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    rows: requestedRows,
    runs: RUNS,
    thresholdP95Ms: P95_LIMIT_MS,
    insertMs: Number(insertMs.toFixed(2)),
    metrics: Object.fromEntries(
      Object.entries(metrics).map(([name, metric]) => [
        name,
        {
          rows: metric.result.rowCount,
          p95Ms: Number(metric.p95Ms.toFixed(2)),
          maxMs: Number(metric.maxMs.toFixed(2)),
          ...(name === 'firstPage' ? { payloadBytes: firstPageBytes } : {}),
          ...(name === 'maxPayload' ? { payloadBytes: maxPayloadBytes } : {}),
          indexes: indexes[name] ?? undefined,
        },
      ]),
    ),
    expectedOperatorSummary: expected,
    failures,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length > 0) throw new Error(`consegne benchmark failed: ${failures.join('; ')}`);
} finally {
  await client.query('ROLLBACK').catch(() => undefined);
  await client.end();
}
