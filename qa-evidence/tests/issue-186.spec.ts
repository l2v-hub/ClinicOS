import { test, expect, showReport, reportDoc } from '../harness';

// #186 Action registry — live GET /ai/actions/catalog proves the allowlist is CRU-only, zero delete.
test('#186 action registry Agnos (CRU-only, no delete)', async ({ page }) => {
  const res = await page.request.get('http://localhost:3001/ai/actions/catalog', {
    headers: { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' },
  });
  expect(res.ok()).toBeTruthy();
  const catalog = await res.json();
  expect(Array.isArray(catalog)).toBeTruthy();
  expect(catalog.length).toBeGreaterThanOrEqual(8);

  const kinds = [...new Set(catalog.map((e: any) => e.kind))].sort();
  const hasDelete = catalog.some((e: any) => e.kind === 'delete' || /delete|cancella|elimina/i.test(e.name));
  expect(hasDelete).toBeFalsy();
  for (const e of catalog) expect(['read', 'create', 'update']).toContain(e.kind);

  await showReport(
    page,
    reportDoc(
      '#186 Action registry Agnos — live GET /ai/actions/catalog',
      [
        { k: 'Endpoint', v: 'GET http://localhost:3001/ai/actions/catalog' },
        { k: 'Numero azioni', v: String(catalog.length), ok: catalog.length >= 8 },
        { k: 'Kinds presenti', v: kinds.join(', '), ok: kinds.every((k: string) => ['read', 'create', 'update'].includes(k)) },
        { k: 'AC1 solo azioni CRU allowlisted', v: 'ogni entry kind ∈ {read,create,update}', ok: true },
        { k: 'AC2 nessuna azione delete', v: hasDelete ? 'TROVATA' : 'nessuna (per costruzione)', ok: !hasDelete },
        ...catalog.map((e: any) => ({ k: `· ${e.name}`, v: `${e.kind} — ${e.entity}` })),
      ],
      'Registro azioni Agnos: allowlist deny-by-default, delete non rappresentabile. Fonte: risposta HTTP live.',
    ),
  );
  await expect(page.getByText('#186 Action registry')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
