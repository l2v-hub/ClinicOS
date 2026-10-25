import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGitHub } from '../../src/bug-pipeline/github.mjs';
function response(value, options = {}) {
  return { ok: true, code: 0, stdout: JSON.stringify(value), stderr: '', ...options };
}
function stateContentsBytes(bytes) {
  return {
    type: 'file',
    sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
    size: bytes.length,
    encoding: 'base64',
    content: bytes.toString('base64'),
  };
}
// Immutable semantic repository server shared by transport and actual-role tests.
export function gitDataStateFixture(initial = {}, { absent = false, mode = '100644' } = {}) {
  const blobs = new Map(),
    trees = new Map(),
    commits = new Map();
  const f = {
    calls: [],
    writes: [],
    objectWrites: [],
    refWrites: [],
    contentsWrites: [],
  };
  const digest = (type, bytes) =>
    createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex');
  const blob = (bytes) => {
    const sha = digest('blob', bytes);
    blobs.set(sha, Buffer.from(bytes));
    return sha;
  };
  const sorted = (entries) =>
    structuredClone(entries).sort((a, b) =>
      Buffer.compare(
        Buffer.from(a.path + (a.type === 'tree' ? '/' : '')),
        Buffer.from(b.path + (b.type === 'tree' ? '/' : '')),
      ),
    );
  const tree = (entries) => {
    entries = sorted(entries);
    const bytes = Buffer.concat(
      entries.map((e) =>
        Buffer.concat([
          Buffer.from(`${e.mode.replace(/^0/, '')} ${e.path}\0`),
          Buffer.from(e.sha, 'hex'),
        ]),
      ),
    );
    const sha = digest('tree', bytes);
    trees.set(sha, entries);
    return sha;
  };
  let serial = 0;
  const commit = (treeSHA, parents) => {
    const sha = digest(
      'commit',
      Buffer.from(
        `tree ${treeSHA}\n${parents.map((p) => `parent ${p}\n`).join('')}fixture ${++serial}\n`,
      ),
    );
    commits.set(sha, {
      sha,
      tree: { sha: treeSHA },
      parents: parents.map((sha) => ({ sha })),
    });
    return sha;
  };
  const sentinel = blob(Buffer.from('unrelated exact bytes\n'));
  f.sentinels = sorted([
    { path: 'README.md', mode: '100644', type: 'blob', sha: sentinel },
    { path: 'executable', mode: '100755', type: 'blob', sha: sentinel },
    { path: 'backend', mode: '040000', type: 'tree', sha: tree([]) },
    {
      path: 'shortcut',
      mode: '120000',
      type: 'blob',
      sha: blob(Buffer.from('README.md')),
    },
    { path: 'vendor', mode: '160000', type: 'commit', sha: '9'.repeat(40) },
  ]);
  const entriesAt = (sha) => structuredClone(trees.get(commits.get(sha).tree.sha));
  const stateEntry = (sha = f.head) =>
    entriesAt(sha).find((e) => e.path === '.codex-bug-state.json');
  f.head = commit(
    tree([
      ...f.sentinels,
      ...(absent
        ? []
        : [
            {
              path: '.codex-bug-state.json',
              mode,
              type: 'blob',
              sha: blob(Buffer.from(JSON.stringify(initial, null, 2) + '\n')),
            },
          ]),
    ]),
    [],
  );
  f.readBytes = (sha = f.head) => Buffer.from(blobs.get(stateEntry(sha).sha));
  f.readState = () => JSON.parse(f.readBytes());
  f.entries = () => entriesAt(f.head);
  f.advance = (state) => {
    f.head = commit(
      tree([
        ...entriesAt(f.head).filter((e) => e.path !== '.codex-bug-state.json'),
        {
          path: '.codex-bug-state.json',
          mode,
          type: 'blob',
          sha: blob(Buffer.from(JSON.stringify(state))),
        },
      ]),
      [f.head],
    );
  };
  Object.defineProperty(f, 'metadata', {
    get() {
      return stateContentsBytes(f.readBytes());
    },
  });
  const ancestor = (before, after) =>
    before === after || commits.get(after)?.parents.some((p) => ancestor(before, p.sha));
  f.run = async (call) => {
    const path = call.args[1],
      index = call.args.indexOf('-X'),
      method = index < 0 ? 'GET' : call.args[index + 1],
      body = call.input ? JSON.parse(call.input) : undefined;
    const request = { path, method, body, args: call.args, call };
    f.calls.push(request);
    const override = await f.before?.(request);
    if (override) return override;
    let value;
    if (path.includes('/git/ref/heads/'))
      value = {
        ref: 'refs/heads/codex/bug-control',
        object: { type: 'commit', sha: f.head },
      };
    else if (path.includes('/contents/.codex-bug-state.json')) {
      if (method === 'PUT') {
        f.contentsWrites.push(body);
        f.writes.push(body);
        const bytes = Buffer.from(body.content, 'base64');
        if (bytes.length > 1024 * 1024)
          return response(
            {},
            {
              ok: false,
              code: 1,
              stderr: 'HTTP 400 synthetic large Contents rejection',
            },
          );
        if ((stateEntry()?.sha ?? undefined) !== body.sha)
          return response({}, { ok: false, code: 1, stderr: 'HTTP 409 conflict' });
        f.advance(JSON.parse(bytes));
        value = { content: { sha: stateEntry().sha } };
      } else {
        const ref = new URLSearchParams(path.split('?')[1]).get('ref'),
          at = ref === 'codex/bug-control' ? f.head : ref;
        assert.ok(commits.has(at), 'Contents read pins a real branch or commit');
        const entry = stateEntry(at);
        if (!entry) return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
        value = stateContentsBytes(blobs.get(entry.sha));
        if (value.size > 1024 * 1024) {
          value.encoding = 'none';
          value.content = '';
        }
      }
    } else if (path.endsWith('/git/blobs') && method === 'POST') {
      f.objectWrites.push(request);
      assert.equal(body.encoding, 'base64');
      const bytes = Buffer.from(body.content, 'base64');
      assert.equal(bytes.toString('base64'), body.content);
      value = { sha: blob(bytes) };
    } else if (path.includes('/git/blobs/') && method === 'GET') {
      const sha = path.split('/').at(-1),
        bytes = blobs.get(sha);
      assert.ok(bytes);
      assert.equal(call.maxOutputBytes, 16 * 1024 * 1024);
      value = {
        sha,
        size: bytes.length,
        encoding: 'base64',
        content: bytes.toString('base64'),
      };
    } else if (path.endsWith('/git/trees') && method === 'POST') {
      f.objectWrites.push(request);
      assert.equal(body.tree.length, 1);
      assert.equal(body.tree[0].path, '.codex-bug-state.json');
      assert.ok(blobs.has(body.tree[0].sha));
      const sha = tree([
        ...structuredClone(trees.get(body.base_tree)).filter(
          (e) => e.path !== '.codex-bug-state.json',
        ),
        body.tree[0],
      ]);
      value = { sha, truncated: false, tree: structuredClone(trees.get(sha)) };
    } else if (path.includes('/git/trees/') && method === 'GET') {
      const sha = path.split('/').at(-1);
      assert.ok(trees.has(sha));
      value = { sha, truncated: false, tree: structuredClone(trees.get(sha)) };
    } else if (path.endsWith('/git/commits') && method === 'POST') {
      f.objectWrites.push(request);
      assert.equal(body.parents.length, 1);
      assert.ok(trees.has(body.tree));
      assert.ok(commits.has(body.parents[0]));
      value = structuredClone(commits.get(commit(body.tree, body.parents)));
    } else if (path.includes('/git/commits/') && method === 'GET') {
      value = structuredClone(commits.get(path.split('/').at(-1)));
      assert.ok(value);
    } else if (path.endsWith('/git/refs/heads/codex/bug-control') && method === 'PATCH') {
      f.refWrites.push(request);
      f.writes.push(request);
      assert.equal(body.force, false);
      assert.ok(commits.has(body.sha));
      if (!ancestor(f.head, body.sha))
        return response(
          {},
          {
            ok: false,
            code: 1,
            stderr: 'HTTP 422 update is not a fast forward',
          },
        );
      f.head = body.sha;
      value = {
        ref: 'refs/heads/codex/bug-control',
        object: { type: 'commit', sha: f.head },
      };
    } else assert.fail(`Unexpected semantic route ${method} ${path}`);
    await f.after?.(request, value);
    return response(value);
  };
  f.store = createGitHub({
    cwd: '/tmp',
    repo: 'l2v-hub/ClinicOS',
    run: f.run,
  }).createStateStore();
  return f;
}
