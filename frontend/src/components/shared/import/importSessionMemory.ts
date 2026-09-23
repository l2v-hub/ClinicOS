import type { ImportActor, ImportJob } from './importSessionTypes';

export interface OpaqueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
/** Only opaque IDs/keys are written. Never serialize a job, manifest, file or clinical value. */
export class ImportSessionMemory {
  private pending = new Map<string, Promise<ImportJob>>();
  private ids = new Map<string, string>();
  private keys = new Map<string, string>();
  private storage: () => OpaqueStorage | null;
  private newKey: () => string;
  constructor(storage: () => OpaqueStorage | null, newKey: () => string) {
    this.storage = storage;
    this.newKey = newKey;
  }
  actorKey(actor: ImportActor) {
    if (!actor.operatorId || !actor.operatorRole)
      throw new Error('Accedi come operatore per importare documenti.');
    return `clinicos:import-session:${encodeURIComponent(actor.operatorId)}:${encodeURIComponent(actor.operatorRole)}`;
  }
  private read(key: string) {
    try {
      return this.storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  private write(key: string, value: string) {
    try {
      this.storage()?.setItem(key, value);
    } catch {
      /* In-memory session still works. */
    }
  }
  clear(actor: ImportActor) {
    const key = this.actorKey(actor);
    this.ids.delete(key);
    this.keys.delete(key);
    try {
      this.storage()?.removeItem(key);
      this.storage()?.removeItem(`${key}:create`);
    } catch {
      /* Storage unavailable. */
    }
  }
  open(
    actor: ImportActor,
    api: { get(id: string): Promise<ImportJob>; create(key: string): Promise<ImportJob> },
  ) {
    const key = this.actorKey(actor);
    const pending = this.pending.get(key);
    if (pending) return pending;
    const id = this.ids.get(key) ?? this.read(key);
    let createKey = this.keys.get(key) ?? this.read(`${key}:create`);
    if (!id && !createKey) {
      createKey = this.newKey();
      this.keys.set(key, createKey);
      this.write(`${key}:create`, createKey);
    }
    const request = (id ? api.get(id) : api.create(createKey!))
      .then((job) => {
        this.ids.set(key, job.id);
        this.write(key, job.id);
        return job;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}
export const importSessionMemory = new ImportSessionMemory(
  () => (typeof window === 'undefined' ? null : window.localStorage),
  () => crypto.randomUUID(),
);
