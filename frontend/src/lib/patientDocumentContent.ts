export interface ScopedDocumentOpenOptions {
  url: string;
  signal: AbortSignal;
  getHeaders: () => Promise<HeadersInit>;
  isCurrent: () => boolean;
  fetchImpl?: typeof fetch;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  openWindow?: (url: string) => void;
  scheduleRevoke?: (callback: () => void) => void;
}

/**
 * Opens protected document bytes only while the originating patient/session scope is current.
 * The guards intentionally surround every asynchronous and browser-side boundary so a delayed
 * response cannot surface PHI after navigation or logout.
 */
export async function openScopedPatientDocument({
  url,
  signal,
  getHeaders,
  isCurrent,
  fetchImpl = fetch,
  createObjectUrl = URL.createObjectURL,
  revokeObjectUrl = URL.revokeObjectURL,
  openWindow = (objectUrl) => window.open(objectUrl, '_blank', 'noreferrer'),
  scheduleRevoke = (callback) => setTimeout(callback, 60_000),
}: ScopedDocumentOpenOptions): Promise<'opened' | 'stale'> {
  const isStale = () => signal.aborted || !isCurrent();
  if (isStale()) return 'stale';

  const headers = await getHeaders();
  if (isStale()) return 'stale';

  const response = await fetchImpl(url, { headers, signal });
  if (!response.ok) throw new Error(String(response.status));
  if (isStale()) return 'stale';

  const blob = await response.blob();
  if (isStale()) return 'stale';

  const objectUrl = createObjectUrl(blob);
  if (isStale()) {
    revokeObjectUrl(objectUrl);
    return 'stale';
  }

  openWindow(objectUrl);
  scheduleRevoke(() => revokeObjectUrl(objectUrl));
  return 'opened';
}
