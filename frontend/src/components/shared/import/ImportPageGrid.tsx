import { ImportThumbnail } from './ImportPageView';
import { movePage, orderedPages, type ImportJob } from './importSessionTypes';
import type { ImportSessionApi } from './importSessionApi';
import type { ImportSourceCache } from './importSourceCache';

export function ImportPageGrid({
  job,
  groupId,
  cache,
  disabled,
  api,
  onPreview,
  onRetake,
  onMutation,
}: {
  job: ImportJob;
  groupId?: string;
  cache: ImportSourceCache;
  disabled: boolean;
  api: ImportSessionApi;
  onPreview(id: string): void;
  onRetake(id: string): void;
  onMutation(action: () => Promise<ImportJob>): Promise<boolean>;
}) {
  const pages = groupId ? orderedPages(job.manifest, groupId) : [];
  const groups = [...job.manifest.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const group = groups.find((item) => item.id === groupId);
  function move(pageId: string, targetGroup: string, index: number) {
    void onMutation(api.manifestMutation(job, movePage(job.manifest, pageId, targetGroup, index)));
  }
  return (
    <div className="import-page-grid">
      {pages.map((page, index) => {
        const source = job.documents.find((document) => document.id === page.documentId);
        return (
          <article key={page.id} className="import-page" data-page-id={page.id}>
            <button
              className="import-page__open"
              onClick={() => onPreview(page.id)}
              aria-label={`Anteprima pagina ${index + 1} di ${group?.label}`}
            >
              {source && <ImportThumbnail document={source} page={page} cache={cache} />}
              <strong>Pagina {index + 1}</strong>
            </button>
            <small>
              {source?.filename} · originale p. {page.sourcePageNumber}
            </small>
            {page.status === 'failed' && <p role="alert">{page.error || 'Pagina da riprovare'}</p>}
            <div className="import-page__actions">
              <button
                className="btn-secondary btn-sm"
                disabled={disabled || index === 0}
                aria-label={`Sposta pagina ${index + 1} prima`}
                onClick={() => move(page.id, page.groupId, index - 1)}
              >
                ↑
              </button>
              <button
                className="btn-secondary btn-sm"
                disabled={disabled || index === pages.length - 1}
                aria-label={`Sposta pagina ${index + 1} dopo`}
                onClick={() => move(page.id, page.groupId, index + 1)}
              >
                ↓
              </button>
              <button
                className="btn-secondary btn-sm"
                disabled={disabled}
                onClick={() => onRetake(page.id)}
              >
                Rifai
              </button>
              <button
                className="btn-danger btn-sm"
                disabled={disabled}
                aria-label={`Rimuovi pagina ${index + 1}`}
                onClick={() => {
                  if (window.confirm(`Rimuovere pagina ${index + 1} dalla lettera?`))
                    void onMutation(api.removalMutation(job, page.id));
                }}
              >
                Rimuovi
              </button>
            </div>
            <label className="import-page__move">
              Sposta nella lettera{' '}
              <select
                disabled={disabled}
                value={page.groupId}
                onChange={(event) =>
                  move(
                    page.id,
                    event.target.value,
                    orderedPages(job.manifest, event.target.value).length,
                  )
                }
              >
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </article>
        );
      })}
    </div>
  );
}
