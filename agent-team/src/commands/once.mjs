import { createRuntime } from '../runtime.mjs';
import { reconcileOnce, reconciliationOutcome } from '../core/reconciler.mjs';

export async function run({ config, repoRoot, allowCurrentSupervisor = false, overrides = {} }) {
  const runtime = await createRuntime({ config, repoRoot, allowCurrentSupervisor, overrides });
  const result = await reconcileOnce(runtime);
  return { ...reconciliationOutcome(result), ...result };
}
