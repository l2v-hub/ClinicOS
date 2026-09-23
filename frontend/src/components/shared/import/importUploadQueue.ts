import { ImportApiError, type ImportSessionApi } from './importSessionApi';
import { manifestEdit, opaqueKey, type ImportJob, type ImportOutcome } from './importSessionTypes';

export async function prepareUploadGroup(
  api: ImportSessionApi,
  job: ImportJob,
  groupId: string | undefined,
  commit: (action: () => Promise<ImportJob>) => Promise<boolean>,
  updateCurrent: (job: ImportJob) => void,
) {
  if (groupId) return groupId;
  const id = opaqueKey();
  const action = api.manifestMutation(job, {
    ...manifestEdit(job.manifest),
    groups: [{ id, label: 'Lettera 1', sortOrder: 0 }],
  });
  if (
    !(await commit(async () => {
      const next = await action();
      updateCurrent(next);
      return next;
    }))
  )
    throw new Error('Impossibile preparare la lettera. Riprova.');
  return id;
}
export interface PendingImportUpload {
  file: File;
  groupId: string;
  pageId?: string;
  requestId: string;
  clientFileId: string;
  state: 'pending' | 'saving' | 'error';
  expectedJob?: ImportJob;
  error?: string;
}
/** A retry keeps both bytes and request identity until the server gives a definitive outcome. */
export class ImportUploadQueue {
  items: PendingImportUpload[] = [];
  running: Promise<void> | null = null;
  private api: ImportSessionApi;
  private getJob: () => ImportJob;
  private changed: (job?: ImportJob, outcomes?: ImportOutcome[]) => void;
  private key: () => string;
  constructor(
    api: ImportSessionApi,
    getJob: () => ImportJob = () => {
      throw new Error('Sessione non pronta.');
    },
    changed: (job?: ImportJob, outcomes?: ImportOutcome[]) => void = () => {},
    key: () => string = opaqueKey,
  ) {
    this.api = api;
    this.getJob = getJob;
    this.changed = changed;
    this.key = key;
  }
  connect(getJob: () => ImportJob, changed: (job?: ImportJob, outcomes?: ImportOutcome[]) => void) {
    this.getJob = getJob;
    this.changed = changed;
  }
  add(files: File[], groupId: string, pageId?: string) {
    if (pageId && files.length !== 1)
      throw new Error('Per sostituire una pagina seleziona un solo file.');
    for (const file of files)
      if (!this.items.some((item) => item.file === file))
        this.items.push({
          file,
          groupId,
          pageId,
          requestId: this.key(),
          clientFileId: this.key(),
          state: 'pending',
        });
    this.changed();
  }
  discard() {
    if (this.running) return;
    this.items = [];
    this.changed();
  }
  run(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => {
      this.running = null;
      this.changed();
    });
    return this.running;
  }
  private async drain() {
    while (this.items.length) {
      const item = this.items[0];
      item.state = 'saving';
      item.error = undefined;
      item.expectedJob ??= this.getJob();
      this.changed();
      try {
        const result = await this.api.upload(
          item.expectedJob,
          item.file,
          item.requestId,
          item.clientFileId,
          item.groupId,
          item.pageId,
        );
        this.changed(result.job, result.outcomes);
        const outcome = result.outcomes.find((value) => value.clientFileId === item.clientFileId);
        if (!outcome || !['accepted', 'duplicate'].includes(outcome.status))
          throw new ImportApiError(
            outcome?.message || 'File non accettato. Controlla formato e limiti.',
            422,
          );
        this.items.shift();
        this.changed();
      } catch (error) {
        if (error instanceof ImportApiError) {
          if (error.job) this.changed(error.job);
          // A definitive rejection did not accept this upload. A new explicit retry uses the refreshed revision.
          if (error.status < 500) {
            item.expectedJob = undefined;
            item.requestId = this.key();
          }
        }
        item.state = 'error';
        item.error = error instanceof Error ? error.message : 'Caricamento non riuscito. Riprova.';
        this.changed();
        throw error;
      }
    }
  }
}
