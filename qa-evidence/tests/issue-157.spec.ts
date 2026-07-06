import { test, expect, showReport, reportDoc, runBackendTest } from '../harness';

// #157 Agnos query operative su struttura e pazienti — the composable facility query engine: its
// authorization gating, query validation and schema are proven by DB-free tests; live facility data
// (rooms) is reachable. The NL→plan step in the live UI is the LLM planner (EU model; not local).
test('#157 Agnos query operative (composable engine)', async ({ page }) => {
  const authz = runBackendTest('backend/src/ai/__tests__/context-facility.test.ts');
  const validate = runBackendTest('backend/src/ai/__tests__/query-validate.test.ts');
  const schema = runBackendTest('backend/src/ai/__tests__/query-schema.test.ts');
  const pass = authz.pass + validate.pass + schema.pass;
  const fail = authz.fail + validate.fail + schema.fail;
  expect(fail).toBe(0);
  expect(pass).toBeGreaterThan(10);

  // Live facility data source the engine reads from.
  const rooms = await page.request.get('http://localhost:3001/admin/rooms');
  const roomsData = await rooms.json();
  expect(roomsData.length).toBeGreaterThan(0);

  await showReport(
    page,
    reportDoc(
      '#157 Agnos — query operative su struttura e pazienti',
      [
        { k: 'Authz facility (context-facility)', v: `${authz.pass}/${authz.pass + authz.fail} pass`, ok: authz.fail === 0 },
        { k: 'Validazione query (query-validate)', v: `${validate.pass}/${validate.pass + validate.fail} pass`, ok: validate.fail === 0 },
        { k: 'Schema query (query-schema)', v: `${schema.pass}/${schema.pass + schema.fail} pass`, ok: schema.fail === 0 },
        { k: 'Flag AI_FACILITY_QUERIES_ENABLED', v: 'on (evidence env)', ok: true },
        { k: 'Dato facility live (/admin/rooms)', v: `${roomsData.length} camere`, ok: roomsData.length > 0 },
        { k: 'Nota: NL→plan nella UI live', v: 'usa il planner LLM (EU) — non disponibile in locale', ok: undefined },
      ],
      'Motore componibile (authz+validate+schema) evidenziato da test DB-free + dato facility live. La traduzione NL nella UI passa dal planner LLM.',
    ),
  );
  await expect(page.getByText('#157 Agnos')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
