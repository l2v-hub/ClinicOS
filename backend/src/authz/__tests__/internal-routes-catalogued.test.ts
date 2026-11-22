// Ogni rotta del gateway interno dell'AI deve essere catalogata (gate «service»): una rotta non
// catalogata viene respinta in produzione con «Operazione non catalogata» prima ancora del token.
// Trovato sulla demo: /internal/ai/tools/:tool (team di Milo) mancava e ogni lettura falliva.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
const { matchRoute } = await import('../registry.js');
const { default: internalAiRouter } = await import('../../routes/internal-ai.js');

type Layer = { route?: { path: string; methods: Record<string, boolean> } };

test('every /internal/ai route is catalogued with the service gate', () => {
  const routes = (internalAiRouter as unknown as { stack: Layer[] }).stack
    .filter((l) => l.route)
    .flatMap((l) =>
      Object.keys(l.route!.methods).map((m) => ({
        method: m.toUpperCase(),
        path: `/internal/ai${l.route!.path.replace(/:[A-Za-z]+/g, 'x1')}`,
      })),
    );
  assert.ok(routes.length > 10, `rotte trovate: ${routes.length}`);
  const missing = routes.filter((r) => matchRoute(r.method, r.path)?.gate !== 'service');
  assert.deepEqual(missing, []);
  assert.equal(
    matchRoute('POST', '/internal/ai/tools/get_patient_parameters')?.id,
    'internal_ai.agent_tools',
  );
});
