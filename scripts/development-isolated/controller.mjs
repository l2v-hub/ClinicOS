import assert from 'node:assert/strict';
import { APP, TARGET, sourcePatch, hash, validateInventory } from './policy.mjs';

// The host supplies authenticated GitHub reservations and native Railway reads.
// Neither a JSON file nor this module can mint a release approval or capability.
export async function execute({ req, host, provider }) {
  await host.authorize(req);
  if (req.action !== 'preflight') {
    // A native review is provenance, not an action capability. The trusted host
    // must bind an observed user grant and fencing epoch to this exact action.
    assert.equal(typeof host.requireWriteAuthority, 'function');
    await host.requireWriteAuthority(req);
    // No combination of read/recheck and local receipts is provider-side CAS.
    // The live adapter currently cannot qualify atomic no-deploy configuration
    // or immutable pre-migration DB binding, and therefore fails closed here.
    assert.equal(typeof provider.requireAtomicEffect, 'function');
    await provider.requireAtomicEffect(req);
  }
  const before = await provider.inspect(req);
  const row = validateInventory(before, req);
  const patches = await provider.patches(req);
  assert.equal(patches.pageInfo?.hasNextPage, false);
  const staged = patches.edges.filter(({ node }) => node.status === 'STAGED');
  assert.ok(
    patches.edges.every(({ node }) => ['STAGED', 'COMMITTED'].includes(node.status)),
    'Failed or applying patches require independent reconciliation',
  );
  assert.ok(staged.length <= 1);
  if (req.action === 'stage-source') {
    assert.equal(staged.length, 0, 'Never replace a pre-existing staged patch');
    assert.equal(row.source, null, 'Initial binding requires a source-free service');
    assert.equal(row.latestDeployment, null);
  }
  if (req.action === 'commit-source') {
    assert.equal(staged.length, 1);
    assert.deepEqual(staged[0].node.patch, sourcePatch(req.service));
  }
  if (req.action === 'deploy') {
    assert.equal(staged.length, 0);
    assert.equal(row.source?.repo, 'l2v-hub/ClinicOS');
    // An independent attestation of the isolated database/configuration is required;
    // /ready and an opaque DATABASE_URL are not proof of its target identity.
    await host.validateConfiguration(req);
  }
  const preflight = {
    schemaVersion: 1,
    operation: req.action,
    target: TARGET,
    serviceId: req.serviceId,
    app: APP,
    workflowSha: req.workflowSha,
    dispatchId: req.dispatchId,
    inventoryDigest: hash(before),
    deployed: false,
  };
  if (req.action === 'preflight') return preflight;
  // Reserve durably before POST. Unknown outcomes retain the reservation forever
  // until a separate native reconciliation proves their outcome. No retry exists here.
  const reservation = await host.reserve(req, preflight);
  await host.authorize(req, reservation);
  await host.requireWriteAuthority(req, reservation);
  await provider.requireAtomicEffect(req, reservation);
  assert.deepEqual(await provider.inspect(req), before, 'Inventory drift before write');
  assert.deepEqual(await provider.patches(req), patches, 'Patch drift before write');
  const action =
    req.action === 'stage-source'
      ? () => provider.stage(req, sourcePatch(req.service))
      : req.action === 'commit-source'
        ? () => provider.commit(req, staged[0].node.id, { skipDeploys: true })
        : () => provider.deploy(req, APP.sha);
  let result;
  try {
    result = await action();
  } catch {
    await host.unknown(reservation);
    throw new Error('DEVELOPMENT_OPERATION_UNKNOWN_RECONCILE_ONLY');
  }
  const proof = await provider.verify(req, result, before);
  // Failure here also leaves an outstanding durable reservation. A successful POST
  // is never repeated merely because proof, receipt storage or finalization failed.
  const receipt = {
    ...preflight,
    result: proof,
    deployed: req.action === 'deploy',
    migrationDelta: 'unproven',
  };
  await host.complete(reservation, receipt);
  return receipt;
}
