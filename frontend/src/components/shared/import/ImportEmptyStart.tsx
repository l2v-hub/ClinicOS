import type { ImportJob } from './importSessionTypes';

export const hasImportContent = (job: ImportJob) =>
  job.manifest.pages.length > 0 || job.documents.length > 0;

export function importFileGuidance(limits: ImportJob['limits']) {
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
  };
  const formats = limits.acceptedMimeTypes.map((type) => labels[type] ?? type).join(', ');
  const size = (bytes: number) =>
    `${(bytes / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 7 })} MB`;
  return (
    `Formati: ${formats}. Puoi aggiungere fino a ${limits.maxPages} pagine, ` +
    `${limits.maxSourceFiles} file e ${limits.maxGroups} lettere. ` +
    `Dimensione massima: ${size(limits.maxFileBytes)} per file, ${size(limits.maxTotalBytes)} complessivi.`
  );
}

export function ImportEmptyStart({
  limits,
  disabled,
  onUpload,
  onScan,
}: {
  limits: ImportJob['limits'];
  disabled: boolean;
  onUpload(): void;
  onScan(): void;
}) {
  return (
    <section className="import-empty-start" aria-labelledby="import-empty-title">
      <h3 id="import-empty-title">Aggiungi la lettera di dimissione</h3>
      <p>Carica un documento dal dispositivo oppure scansiona le pagine con la fotocamera.</p>
      <p className="import-empty-start__guidance">{importFileGuidance(limits)}</p>
      <div className="import-empty-start__actions">
        <button className="btn-primary" disabled={disabled} onClick={onUpload}>
          Carica documento
        </button>
        <button
          className="btn-secondary"
          data-testid="scatta-foto"
          disabled={disabled}
          onClick={onScan}
        >
          Scansiona
        </button>
      </div>
      <p className="import-empty-start__hint">
        Dopo il caricamento puoi riordinare le pagine e organizzare più lettere.
      </p>
    </section>
  );
}
