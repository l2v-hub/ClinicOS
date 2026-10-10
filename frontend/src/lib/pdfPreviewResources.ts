/** Resolve dependency-versioned image decoders beside the bundled worker, on the app origin. */
export function pdfPreviewResources(workerUrl: string, baseUrl: string, version: string) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid PDF decoder version');
  return {
    wasmUrl: new URL(`pdfjs-${version}/`, new URL(workerUrl, baseUrl)).href,
    useWorkerFetch: true,
  };
}
