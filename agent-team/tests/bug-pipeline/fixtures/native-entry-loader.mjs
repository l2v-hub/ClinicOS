import { readFile } from 'node:fs/promises';
export async function load(url, context, nextLoad) {
  if (!url.endsWith('/agent-team/src/bug-pipeline/cloud-review-worker.mjs'))
    return nextLoad(url, context);
  const source = await readFile(new URL(url), 'utf8');
  const original = "main({ mode: process.argv[2]?.slice(2) || 'review' })";
  if (!source.includes(original)) throw Error('fixture entry boundary missing');
  const replacement =
    "(async()=>{await import('./native-guard-qualification.mjs');await import('./native-guard-session.mjs');await import(import.meta.url);return {status:'empty'};})()";
  return { format: 'module', source: source.replace(original, replacement), shortCircuit: true };
}
