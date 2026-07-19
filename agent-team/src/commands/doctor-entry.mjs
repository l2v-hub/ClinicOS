import { createRuntime } from '../runtime.mjs';

export async function run({ config, repoRoot }) {
  const runtime = await createRuntime({ config, repoRoot });
  return runtime.doctor();
}
