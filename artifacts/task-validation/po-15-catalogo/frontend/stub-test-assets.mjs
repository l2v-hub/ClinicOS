// Test-only Vite URL shim. Components are rendered without starting the PDF worker.
import { register } from 'node:module';
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/pdf.worker.min.mjs?url'))
    return { url: 'data:text/javascript,export%20default%20%22test-pdf-worker.mjs%22%3B', shortCircuit: true };
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.includes('pdf.worker.min.mjs') && new URL(url).searchParams.has('url'))
    return { format: 'module', source: 'export default "test-pdf-worker.mjs";', shortCircuit: true };
  const result = await nextLoad(url, context);
  // The legacy dressing form imports attachment/auth UI; SSR does not authenticate.
  if (new URL(url).pathname.endsWith('/frontend/src/lib/entraAuth.ts') && result.source)
    return { ...result, source: 'import.meta.env = Object.freeze({});\n' + String(result.source) };
  return result;
}
register(import.meta.url, import.meta.url);
