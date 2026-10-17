/** Resolve dependency-versioned image decoders beside the bundled worker, on the app origin. */
export function pdfPreviewResources(workerUrl: string, baseUrl: string, version: string) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid PDF decoder version');
  const worker = new URL(workerUrl, baseUrl);
  // Vite serves the worker from node_modules in dev, while the decoder plugin serves assets/.
  // Built workers already live beside their versioned decoder directory (including a base path).
  const devWorker =
    worker.pathname.includes('/node_modules/') || worker.pathname.startsWith('/@fs/');
  const decoderBase = devWorker ? new URL('assets/', new URL('.', baseUrl)) : worker;
  return {
    wasmUrl: new URL(`pdfjs-${version}/`, decoderBase).href,
    useWorkerFetch: true,
  };
}
