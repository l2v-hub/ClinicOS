import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function run({ config }) {
  await mkdir(config.runtimeRoot, { recursive: true });
  await writeFile(path.join(config.runtimeRoot, 'stop.request'), new Date().toISOString());
  return { ok: true, stop_requested: true };
}
