// Test-only surface: real workspace and PDF components, synthetic in-memory API only.
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ImportDocumentsWorkspace } from '../../../frontend/src/components/shared/import/ImportDocumentsWorkspace';
import { ImportSourceCache } from '../../../frontend/src/components/shared/import/importSourceCache';
import { ImportSessionApi } from '../../../frontend/src/components/shared/import/importSessionApi';
import { job as emptyJob } from '../../../frontend/src/components/shared/import/__tests__/fixtures';
import type { ImportJob } from '../../../frontend/src/components/shared/import/importSessionTypes';
import '../../../frontend/src/App.css';
import '../../../frontend/src/components/shared/import/ImportSession.css';

const initial = emptyJob();
initial.documents = [{ id: 'synthetic-doc', filename: 'four-pages-synthetic.pdf', mimeType: 'application/pdf', pageCount: 4, sizeBytes: 6000, contentUrl: '' }];
initial.manifest.groups[0].pageCount = 4;
initial.manifest.pages = Array.from({ length: 4 }, (_, i) => ({ id: `synthetic-page-${i + 1}`, documentId: 'synthetic-doc', sourcePageNumber: i + 1, groupId: 'letter-a', sortOrder: i, status: 'pending', canRetry: false, error: null, errorCode: null }));

function Surface() {
  const [job, setJob] = useState<ImportJob>(() => {
    const saved = sessionStorage.getItem('synthetic-manifest');
    return saved ? { ...initial, manifest: JSON.parse(saved) } : initial;
  });
  const cache = useMemo(() => {
    const value = new ImportSourceCache((path, init) => fetch(path, init), '/synthetic', initial.limits.maxFileBytes);
    const original = value.thumbnail.bind(value);
    value.thumbnail = (doc, page) => original(doc, page).catch(error => { console.warn('Synthetic thumbnail failure:', String(error)); throw error; });
    return value;
  }, []);
  const api = useMemo(() => new ImportSessionApi(async (_path, init) => {
    const body = JSON.parse(String(init?.body));
    const edit = body;
    const next = { ...job, manifest: { ...job.manifest, revision: job.manifest.revision + 1,
      pages: edit.pages.map((p: {id: string}) => ({ ...job.manifest.pages.find(old => old.id === p.id), ...p })),
      groups: edit.groups.map((g: {id: string}) => ({ ...job.manifest.groups.find(old => old.id === g.id), ...g })) } };
    return new Response(JSON.stringify(next), { headers: { 'Content-Type': 'application/json' } });
  }, '/synthetic'), [job]);
  useEffect(() => { cache.retain(job.documents); }, [cache, job]);
  useEffect(() => () => cache.clear(), [cache]);
  return <main className="modal-card import-session" style={{ margin: '20px auto', background: 'white' }}>
    <h1 style={{ padding: '16px' }}>Importa lettere di dimissione · QA sintetico</h1>
    <ImportDocumentsWorkspace job={job} api={api} cache={cache} busy={false} onJob={setJob} onPending={() => {}}
      onMutation={async action => { const next = await action(); sessionStorage.setItem('synthetic-manifest', JSON.stringify(next.manifest)); setJob(next); return true; }}
      onProcess={() => { throw new Error('Processing forbidden in synthetic preview QA'); }} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Surface />);
