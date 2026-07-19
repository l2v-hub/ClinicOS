// REQ-036 live integration check against the running backend (:3001).
// Covers the backend criteria that have no DB unit test: reopen invalidates the draft,
// reprocess reuses the same job (no duplicate), and a double enqueue is idempotent.
const BASE = 'http://localhost:3001/ai/extraction/jobs';
const H = { 'X-Operator-Id': 'req036-check', 'X-Operator-Role': 'operator' };
const log = (...a) => console.log(...a);
const get = async (id) => (await fetch(`${BASE}/${id}`, { headers: H })).json();

const upload = async (names) => {
  const fd = new FormData();
  names.forEach((n) =>
    fd.append('files', new Blob([`Contenuto di ${n}\n`], { type: 'text/plain' }), n),
  );
  const r = await fetch(BASE, { method: 'POST', headers: H, body: fd });
  return { status: r.status, body: await r.json() };
};

const run = async () => {
  let pass = 0,
    fail = 0;
  const ok = (cond, msg) => {
    if (cond) {
      pass++;
      log('  PASS', msg);
    } else {
      fail++;
      log('  FAIL', msg);
    }
  };

  // 1. create a job with 3 files
  const up = await upload(['a.txt', 'b.txt', 'c.txt']);
  const job = up.body.job ?? up.body;
  const id = job.id;
  log('job', id, 'status', job.status, 'files', job.fileCount);
  ok(job.fileCount === 3, '3 files uploaded');

  // 2. reorder: reverse
  const ids = job.documents.map((d) => d.id);
  const rev = [...ids].reverse();
  await fetch(`${BASE}/${id}/reorder`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: rev }),
  });
  const afterReorder = await get(id);
  ok(afterReorder.documents[0].id === rev[0], 'order persisted (first = reversed first)');

  // 3. enqueue, then double-press enqueue → idempotent (no throw, same job, single run)
  const p1 = await fetch(`${BASE}/${id}/process`, { method: 'POST', headers: H });
  const p2 = await fetch(`${BASE}/${id}/process`, { method: 'POST', headers: H });
  ok(p1.status === 202, 'first process → 202');
  ok(p2.status === 202, 'second process (double-press) → 202 idempotent, not an error');

  // 4. reopen → back to editable phase, draft invalidated, files kept, SAME job id
  const rr = await fetch(`${BASE}/${id}/reopen`, { method: 'POST', headers: H });
  const reopened = await rr.json();
  ok(rr.status === 200, 'reopen → 200');
  ok(reopened.id === id, 'same job id (no duplicate job)');
  ok(reopened.status === 'uploaded', `status back to uploaded (was ${reopened.status})`);
  ok(reopened.fileCount === 3, 'files kept after reopen (no re-upload needed)');

  // 5. draft invalidated → result endpoint returns no resultData
  const res = await (await fetch(`${BASE}/${id}/result`, { headers: H })).json();
  ok(!res.resultData, 'previous draft invalidated (result.resultData empty)');

  // 6. can reprocess again after reopen (reuses files)
  const p3 = await fetch(`${BASE}/${id}/process`, { method: 'POST', headers: H });
  ok(p3.status === 202, 'reprocess after reopen → 202 (no re-upload)');

  // cleanup: cancel the job so the local DB stays tidy
  await fetch(`${BASE}/${id}/cancel`, { method: 'POST', headers: H });

  log(`\nREQ-036 API check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
run().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
