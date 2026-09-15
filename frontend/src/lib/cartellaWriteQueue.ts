import type { CartellaPaziente } from '../types';

/** Reconcile record IDs so a form reopened during a pending save cannot erase that save. */
export function mergeCartellaPatch(
  latest: CartellaPaziente,
  initial: CartellaPaziente,
  patch: Partial<CartellaPaziente>,
): CartellaPaziente {
  if (!patch.documentiConsegnati) return { ...latest, ...patch };
  const before = new Map((initial.documentiConsegnati ?? []).map((item) => [item.id, item]));
  const after = new Map(patch.documentiConsegnati.map((item) => [item.id, item]));
  const records = new Map((latest.documentiConsegnati ?? []).map((item) => [item.id, item]));
  for (const id of before.keys()) if (!after.has(id)) records.delete(id);
  for (const [id, item] of after) {
    if (!before.has(id) || JSON.stringify(before.get(id)) !== JSON.stringify(item))
      records.set(id, item);
  }
  return { ...latest, ...patch, documentiConsegnati: [...records.values()] };
}

/** Full-record PUTs must include earlier successful edits from other open sections. */
export class CartellaWriteQueue<T extends object> {
  private pending = new Map<string, { snapshot: T; tail: Promise<unknown>; count: number }>();

  enqueue(
    key: string,
    initial: T,
    patch: Partial<T>,
    persist: (snapshot: T) => Promise<boolean>,
    merge = (latest: T, _initial: T, change: Partial<T>): T => ({ ...latest, ...change }),
  ): Promise<boolean> {
    let queue = this.pending.get(key);
    if (!queue) {
      queue = { snapshot: initial, tail: Promise.resolve(), count: 0 };
      this.pending.set(key, queue);
    }
    const current = queue;
    current.count++;
    const result = current.tail.then(async () => {
      const next = merge(current.snapshot, initial, patch);
      const ok = await persist(next);
      if (ok) current.snapshot = next;
      return ok;
    });
    current.tail = result.catch(() => {});
    return result.finally(() => {
      current.count--;
      if (!current.count && this.pending.get(key) === current) this.pending.delete(key);
    });
  }
}
