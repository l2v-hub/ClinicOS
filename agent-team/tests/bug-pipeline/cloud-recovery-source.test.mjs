import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReviewSourceReader } from '../../src/bug-pipeline/cloud-review-worker.mjs';
import { createGitHub } from '../../src/bug-pipeline/github.mjs';
const hash = (text) => createHash('sha256').update(text).digest('hex');
function fixture() {
  const sha = 'a'.repeat(40),
    base = 'b'.repeat(40),
    root = 'artifacts/task-validation/synthetic-followup',
    texts = new Map(),
    head = new Map(),
    before = new Map();
  const add = (map, file, text) => {
    const data = Buffer.from(text),
      id = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    texts.set(id, {
      sha: id,
      size: data.length,
      encoding: 'base64',
      content: data.toString('base64'),
    });
    map.set(file, { path: file, sha: id, size: data.length, type: 'blob', mode: '100644' });
  };
  add(before, 'src/layout.mjs', 'export const page = false;\n');
  add(head, 'src/layout.mjs', 'export const page = true;\n');
  for (const file of ['task-contract.md', 'validation-report.md']) {
    add(head, root + '/' + file, 'Synthetic frozen proof\n');
    before.set(root + '/' + file, head.get(root + '/' + file));
  }
  const subject = {
    id: 'synthetic-followup',
    kind: 'post-merge-review-recovery',
    sha,
    baseSha: base,
    branch: 'codex/synthetic-followup',
    pr: { number: 82 },
    packet: { path: root },
    recoveryRequestNonce: 'request',
    failedReviewNonce: 'failed',
  };
  const plan = {
    provenance: 'canonical-recovery',
    sourceSha: sha,
    requestNonce: 'request',
    failedReviewNonce: 'failed',
    text: 'Canonical synthetic implementation plan. Generated; not a committed file.',
    sourceManifest: [
      {
        path: 'src/layout.mjs',
        blob: head.get('src/layout.mjs').sha,
        sha256: hash('export const page = true;\n'),
      },
    ],
  };
  const calls = [],
    run = async ({ command, args }) => {
      calls.push(args);
      assert.equal(command, 'gh');
      const endpoint = args[1].replace('repos/l2v-hub/ClinicOS/', '');
      let value;
      if (endpoint === 'pulls/82')
        value = {
          number: 82,
          state: 'open',
          merged: false,
          draft: false,
          head: { sha, ref: subject.branch, repo: { full_name: 'l2v-hub/ClinicOS', fork: false } },
          base: { ref: 'main', repo: { full_name: 'l2v-hub/ClinicOS' } },
        };
      else if (endpoint.startsWith('compare/'))
        value = {
          base_commit: { sha: base },
          merge_base_commit: { sha: base },
          status: 'ahead',
          files: [{ filename: 'src/layout.mjs' }],
        };
      else if (endpoint === `git/trees/${sha}?recursive=1`)
        value = { truncated: false, tree: [...head.values()] };
      else if (endpoint === `git/trees/${base}?recursive=1`)
        value = { truncated: false, tree: [...before.values()] };
      else if (endpoint.startsWith('git/blobs/')) value = texts.get(endpoint.split('/').at(-1));
      else assert.fail('Unexpected synthetic API');
      return { ok: true, stdout: JSON.stringify(value) };
    };
  return {
    subject,
    plan,
    calls,
    head,
    before,
    add,
    run,
    root,
    read: (p) =>
      createReviewSourceReader({
        run,
        cwd: '/synthetic-empty',
        ...(p === undefined ? {} : { recoveryPlan: p }),
      })(subject),
  };
}
test('ordinary queued packet still refuses a missing committed implementation plan', async () => {
  const f = fixture();
  await assert.rejects(f.read(), /Required packet file missing/);
});
test('trusted recovery plan is explicitly generated, never inserted as fake committed evidence', async () => {
  const f = fixture(),
    result = await f.read(f.plan),
    generated = result.packet.generatedEvidence.implementationPlan;
  assert.equal(generated.committed, false);
  assert.equal(generated.provenance, 'canonical-recovery');
  assert.equal(generated.subjectSha, f.subject.sha);
  assert.equal(generated.sha256, hash(f.plan.text));
  assert.equal(result.packet.evidence[f.root + '/implementation-plan.md'], undefined);
  assert.ok(
    !result.packet.evidenceInventory.some((x) => x.file.endsWith('/implementation-plan.md')),
  );
  assert.equal(result.packet.changes.length, 1);
});
test('recovery fallback binds exact subject/nonces/complete source manifest and refuses omitted/forged inputs', async () => {
  for (const kind of [
    'kind',
    'provenance',
    'sha',
    'request',
    'failed',
    'missingNonce',
    'manifest',
    'blob',
    'digest',
    'duplicate',
    'oversize',
    'evidenceEscape',
    'evidenceMissing',
  ]) {
    const f = fixture(),
      p = structuredClone(f.plan);
    if (kind === 'kind') f.subject.kind = 'standalone-pr-review';
    if (kind === 'provenance') p.provenance = 'source';
    if (kind === 'sha') p.sourceSha = 'c'.repeat(40);
    if (kind === 'request') p.requestNonce = 'foreign';
    if (kind === 'failed') p.failedReviewNonce = 'foreign';
    if (kind === 'missingNonce') {
      delete p.requestNonce;
      delete f.subject.recoveryRequestNonce;
    }
    if (kind === 'manifest') p.sourceManifest = [];
    if (kind === 'blob') p.sourceManifest[0].blob = 'c'.repeat(40);
    if (kind === 'digest') p.sourceManifest[0].sha256 = 'd'.repeat(64);
    if (kind === 'duplicate') p.sourceManifest.push(p.sourceManifest[0]);
    if (kind === 'oversize') p.text = 'x'.repeat(64 * 1024 + 1);
    if (kind === 'evidenceEscape') p.evidenceFiles = ['../private'];
    if (kind === 'evidenceMissing') p.evidenceFiles = [f.root + '/missing.json'];
    await assert.rejects(f.read(p), undefined, kind);
  }
});
test('recovery cannot replace missing contract/validation or overwrite a genuinely committed implementation plan', async () => {
  for (const name of ['task-contract.md', 'validation-report.md']) {
    const f = fixture();
    f.head.delete(f.root + '/' + name);
    f.before.delete(f.root + '/' + name);
    await assert.rejects(f.read(f.plan));
  }
  const f = fixture();
  f.add(f.head, f.root + '/implementation-plan.md', 'Genuine frozen plan');
  f.before.set(f.root + '/implementation-plan.md', f.head.get(f.root + '/implementation-plan.md'));
  const result = await f.read(f.plan);
  assert.equal(result.packet.evidence[f.root + '/implementation-plan.md'], 'Genuine frozen plan');
});
test('additional recovery evidence is bounded frozen text under its own packet, not generated committed proof', async () => {
  const f = fixture(),
    file = f.root + '/evidence/public/qa-summary.json';
  f.add(f.head, file, '{"syntheticResult":"PASS"}');
  f.before.set(file, f.head.get(file));
  f.plan.evidenceFiles = [file];
  const result = await f.read(f.plan);
  assert.equal(result.packet.evidence[file], '{"syntheticResult":"PASS"}');
  assert.ok(result.packet.evidenceInventory.some((x) => x.file === file));
});
test('native review publisher checks revocation at actual POST boundary, and guards idempotent acknowledgement', async () => {
  let allow = true,
    guards = 0,
    posts = 0,
    previous = [];
  const gh = createGitHub({
    cwd: '/synthetic-empty',
    repo: 'l2v-hub/ClinicOS',
    run: async ({ args, input }) => {
      if (args.includes('POST')) {
        posts++;
        return {
          ok: true,
          stdout: JSON.stringify({
            id: 99,
            commit_id: 'a'.repeat(40),
            body: JSON.parse(input).body,
          }),
        };
      }
      return { ok: true, stdout: JSON.stringify([previous]) };
    },
  });
  const report = {
    subject_sha: 'a'.repeat(40),
    verdict: 'approved',
    summary: 'Synthetic evidence.',
    findings: [],
  };
  await assert.rejects(
    gh.publishExternalReview(82, report.subject_sha, report, 1, undefined, {
      guard: async () => {
        guards++;
        if (guards === 2) allow = false;
        assert.equal(allow, true);
      },
    }),
  );
  assert.equal(posts, 0);
  guards = 0;
  allow = true;
  await gh.publishExternalReview(82, report.subject_sha, report, 1, undefined, {
    guard: async () => {
      guards++;
      assert.equal(allow, true);
    },
  });
  assert.equal(posts, 1);
  assert.equal(guards, 2);
  previous = [
    {
      id: 99,
      commit_id: report.subject_sha,
      body: `<!-- clinicos-claude-cron:82:${report.subject_sha}:1 -->\nClaude Code review 1/4 on \`${report.subject_sha}\`: **approved**.\n\nSynthetic evidence.\n\n${JSON.stringify(report, null, 2)}`,
    },
  ];
  await assert.rejects(
    gh.publishExternalReview(82, report.subject_sha, report, 1, undefined, {
      guard: async () => {
        throw Error('Revoked');
      },
    }),
  );
  assert.equal(posts, 1);
});
