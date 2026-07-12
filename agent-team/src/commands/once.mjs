import { createRuntime } from '../runtime.mjs';
import { reconcileOnce } from '../core/reconciler.mjs';

export async function run({ config, repoRoot, allowCurrentSupervisor = false }) {
  const runtime = await createRuntime({ config, repoRoot, allowCurrentSupervisor });
  const result = await reconcileOnce(runtime);
  return { ok: result.doctor.developmentReady || result.doctor.qaReady, ...result };
}
