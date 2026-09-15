import { cachedGetJson, expireCachedGet } from './cachedFetch';
import { parseTherapySlots } from './therapySlotPage';

/** A stalled day must not disable dashboard recovery indefinitely. */
export async function readDashboardTherapyDay(url: string, timeoutMs = 15_000) {
  const request = cachedGetJson<unknown>(url, 0);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expireCachedGet(url, request);
      reject(new Error('Therapy read timed out'));
    }, timeoutMs);
  });
  try {
    return parseTherapySlots(await Promise.race([request, timeout]));
  } finally {
    clearTimeout(timer);
  }
}
