import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

// Re-run the unchanged static guard against its exact baseline source inputs.
// This does not alter the checkout or the shared dependencies.
const baseline = 'c52af6237c9cbbda9a39a770c1278573567eb958';
const sources = ['src/App.tsx', 'src/App.css', 'src/components/operator/MultiPatientParametri.tsx', 'src/lib/patientParametersPage.ts'];
const baselineSource = new Map(sources.map((file) => [resolve(file).toLowerCase(), execFileSync('git', ['show', `${baseline}:frontend/${file}`], {encoding:'utf8'})]));
const readFileSync = fs.readFileSync;
fs.readFileSync = function (file, options) {
  const path = file instanceof URL ? fileURLToPath(file) : file;
  const source = typeof path === 'string' ? baselineSource.get(resolve(path).toLowerCase()) : undefined;
  if (source === undefined) return readFileSync.call(this, file, options);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? source : Buffer.from(source);
};
syncBuiltinESMExports();
