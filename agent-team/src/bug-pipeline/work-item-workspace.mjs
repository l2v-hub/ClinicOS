import path from 'node:path';
import { mkdir, lstat, readFile, writeFile, realpath } from 'node:fs/promises';
import { relativeFile, editableFile, sha256, safeText } from './contracts.mjs';

const HASH = /^[a-f0-9]{40}$/;
function assert(condition, message) {
  if (!condition)
    throw Object.assign(new Error(`Work item workspace: ${message}`), {
      code: 'workspace-scope-invalid',
    });
}
function inside(parent, target) {
  const relative = path.relative(parent, target);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}
const exists = (file) => lstat(file).catch((e) => (e.code === 'ENOENT' ? null : Promise.reject(e)));

// Child Git operations use the controller runner, never a model-owned shell.
// No cleanup/reset/push exists here: uncertain worktrees and conflicts are evidence.
export function createWorkItemWorkspace({ root, run, parentWorkspace }) {
  assert(
    path.isAbsolute(root) && typeof run === 'function',
    'absolute root and controller runner required',
  );
  assert(
    typeof parentWorkspace?.coordinates === 'function' &&
      typeof parentWorkspace.assertScope === 'function',
    'parent workspace contract required',
  );
  const git = async (args, cwd = root, guard) => {
    await guard?.();
    const result = await run({
      command: 'git',
      args: [
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'tag.gpgsign=false',
        ...args,
      ],
      cwd,
      envMode: 'controller',
      timeoutMs: 30_000,
      maxOutputBytes: 2 * 1024 * 1024,
    });
    if (!result?.ok)
      throw Object.assign(new Error('Work item controller Git operation failed'), {
        code: 'controller-execution-failed',
      });
    return result.stdout.trim();
  };
  const parent = (batch) => {
    const coordinates = parentWorkspace.coordinates(batch);
    assert(path.isAbsolute(coordinates.cwd), 'absolute parent worktree required');
    relativeFile(coordinates.packet);
    return coordinates;
  };
  function coordinates(batch, item, reservation) {
    assert(
      /^bug-batch-[1-9][0-9]*$/.test(batch.id) &&
        /^[a-z][a-z0-9-]{0,39}$/.test(item.id) &&
        /^[a-zA-Z0-9-]{8,80}$/.test(reservation.nonce),
      'coordinate identity',
    );
    const name = `${batch.id}-wi-${item.id}-${reservation.nonce}`;
    return {
      cwd: path.join(root, 'agent-team', '.worktrees', name),
      branch: `codex/${name}`,
      packet: parent(batch).packet,
    };
  }
  async function regular(rootPath, file) {
    relativeFile(file);
    const target = path.join(rootPath, file);
    const info = await lstat(target);
    assert(
      info.isFile() &&
        !info.isSymbolicLink() &&
        info.nlink === 1 &&
        inside(await realpath(rootPath), await realpath(target)),
      'contained regular file required',
    );
    return { target, info, bytes: await readFile(target) };
  }
  async function registration(batch, item, reservation, guard) {
    const expected = coordinates(batch, item, reservation);
    assert(
      ['cwd', 'branch', 'packet'].every((key) => expected[key] === reservation[key]),
      'reservation coordinates changed',
    );
    assert(
      (await realpath(expected.cwd)) === expected.cwd &&
        !(await lstat(expected.cwd)).isSymbolicLink(),
      'child worktree path changed',
    );
    const entries = (await git(['worktree', 'list', '--porcelain'], root, guard)).split('\n\n');
    const entry = entries.find((e) => e.split('\n').includes(`worktree ${expected.cwd}`));
    assert(
      entry?.split('\n').includes(`branch refs/heads/${expected.branch}`),
      'registered owned child branch required',
    );
    const [common, parentCommon, rootCommon, branch, head] = await Promise.all([
      git(['rev-parse', '--git-common-dir'], expected.cwd, guard),
      git(['rev-parse', '--git-common-dir'], parent(batch).cwd, guard),
      git(['rev-parse', '--git-common-dir'], root, guard),
      git(['symbolic-ref', '--short', 'HEAD'], expected.cwd, guard),
      git(['rev-parse', 'HEAD'], expected.cwd, guard),
    ]);
    const gitCommonDir = await realpath(path.resolve(expected.cwd, common));
    assert(
      gitCommonDir === (await realpath(path.resolve(parent(batch).cwd, parentCommon))) &&
        gitCommonDir === (await realpath(path.resolve(root, rootCommon))) &&
        branch === expected.branch &&
        HASH.test(head),
      'Git common directory, branch or HEAD changed',
    );
    const metadata = await regular(expected.cwd, '.git');
    const gitFileSha256 = sha256(metadata.bytes);
    if (reservation.checkpoint)
      assert(
        reservation.checkpoint.gitFileSha256 === gitFileSha256 &&
          reservation.checkpoint.gitCommonDir === gitCommonDir,
        'worktree metadata changed',
      );
    return { ...expected, head, gitCommonDir, gitFileSha256 };
  }
  async function frozenPackets(batch, item, reservation) {
    const p = parent(batch);
    assert(
      batch.packetHashes && Object.keys(batch.packetHashes).length > 0,
      'frozen parent packet missing',
    );
    const hashes = {};
    for (const [file, hash] of Object.entries(batch.packetHashes)) {
      relativeFile(file);
      const original = await regular(p.cwd, `${p.packet}/${file}`);
      assert(sha256(original.bytes) === hash, 'parent frozen packet changed');
      hashes[`${p.packet}/${file}`] = hash;
    }
    const assignment = `${p.packet}/work-item.json`;
    const body =
      JSON.stringify(
        {
          schemaVersion: 1,
          batch: batch.id,
          item,
          nonce: reservation.nonce,
          parentPlanSha256: sha256(JSON.stringify(batch.plan)),
          specSha256: batch.workItems.specSha256,
          sourceIssues: batch.workItems.sourceIssues,
          sourceIntegrationSha: reservation.sourceIntegrationSha,
          parentPacketHashes: batch.packetHashes,
        },
        null,
        2,
      ) + '\n';
    safeText(body);
    hashes[assignment] = sha256(body);
    return { hashes, assignment, body };
  }
  async function captureChildCheckpoint({ batch, item, reservation, assertOwnership }) {
    const identity = await registration(batch, item, reservation, assertOwnership);
    assert(
      identity.head === (reservation.childSha ?? reservation.sourceIntegrationSha),
      'model changed child HEAD',
    );
    const packets = await frozenPackets(batch, item, reservation);
    for (const [file, hash] of Object.entries(packets.hashes)) {
      const current = await regular(identity.cwd, file);
      assert(sha256(current.bytes) === hash, 'child frozen packet changed');
    }
    // Git does not report replacement by a hardlink with identical bytes. Check
    // every assigned existing file before accepting a model's output, including
    // files whose content did not change.
    for (const file of item.scope) {
      if (await exists(path.join(identity.cwd, file))) await regular(identity.cwd, file);
    }
    const [changed, untracked] = await Promise.all([
      git(
        ['diff', '--name-only', '-z', reservation.sourceIntegrationSha],
        identity.cwd,
        assertOwnership,
      ),
      git(['ls-files', '--others', '-z'], identity.cwd, assertOwnership),
    ]);
    const files = [
      ...new Set([...changed.split('\0'), ...untracked.split('\0')].filter(Boolean)),
    ].sort();
    const output = {};
    for (const file of files) {
      relativeFile(file);
      if (packets.hashes[file]) continue;
      editableFile(file);
      assert(item.scope.includes(file), 'executor changed file outside node scope');
      const info = await exists(path.join(identity.cwd, file));
      if (!info) {
        output[file] = null;
        continue;
      }
      const entry = await regular(identity.cwd, file);
      output[file] = {
        sha256: sha256(entry.bytes),
        bytes: entry.bytes.length,
        executable: Boolean(entry.info.mode & 0o111),
      };
    }
    return {
      schemaVersion: 1,
      ...identity,
      baseSha: reservation.sourceIntegrationSha,
      packetHashes: packets.hashes,
      output,
    };
  }
  async function prepareChild({ batch, item, reservation, assertOwnership }) {
    assert(typeof assertOwnership === 'function', 'fresh ownership guard required');
    await assertOwnership();
    const expected = coordinates(batch, item, reservation);
    assert(
      ['cwd', 'branch', 'packet'].every((key) => expected[key] === reservation[key]) &&
        HASH.test(reservation.sourceIntegrationSha),
      'reserved coordinates/base required',
    );
    assert(!(await exists(expected.cwd)), 'occupied child path');
    const branches = await git(
      ['for-each-ref', '--format=%(refname)', `refs/heads/${expected.branch}`],
      root,
      assertOwnership,
    );
    assert(!branches, 'occupied child branch');
    const container = path.dirname(expected.cwd);
    await mkdir(container, { recursive: true });
    assert((await realpath(container)) === container, 'child container symlink');
    await git(
      ['worktree', 'add', '-b', expected.branch, expected.cwd, reservation.sourceIntegrationSha],
      root,
      assertOwnership,
    );
    const packets = await frozenPackets(batch, item, reservation);
    for (const file of Object.keys(packets.hashes)) {
      const target = path.join(expected.cwd, file);
      await mkdir(path.dirname(target), { recursive: true });
      assert(!(await exists(target)), 'child packet path already occupied in baseline');
      const bytes =
        file === packets.assignment ? packets.body : (await regular(parent(batch).cwd, file)).bytes;
      await assertOwnership();
      await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    }
    const checkpoint = await captureChildCheckpoint({ batch, item, reservation, assertOwnership });
    assert(
      Object.keys(checkpoint.output).length === 0,
      'fresh child is dirty outside frozen packet',
    );
    return { cwd: expected.cwd, packet: expected.packet, checkpoint };
  }
  async function checkpointChild({ batch, item, reservation, assertOwnership }) {
    assert(
      typeof assertOwnership === 'function' &&
        reservation.status === 'running' &&
        reservation.checkpoint,
      'running reserved child required',
    );
    const before = await captureChildCheckpoint({ batch, item, reservation, assertOwnership });
    assert(
      reservation.result?.status === 'implemented' &&
        reservation.commit?.status === 'running' &&
        reservation.commit.beforeSha === before.head &&
        JSON.stringify(reservation.outputCheckpoint) === JSON.stringify(before),
      'durable exact output and commit reservation required',
    );
    const paths = Object.keys(before.output);
    let head = before.head;
    if (paths.length) {
      await git(['add', '--', ...paths], before.cwd, assertOwnership);
      const staged = (
        await git(['diff', '--cached', '--name-only', '-z'], before.cwd, assertOwnership)
      )
        .split('\0')
        .filter(Boolean);
      assert(samePaths(staged, paths), 'staged files differ from exact node output');
      await git(
        ['commit', '--no-verify', '-m', `fix: ${batch.id} work item ${item.id}`],
        before.cwd,
        assertOwnership,
      );
      head = await git(['rev-parse', 'HEAD'], before.cwd, assertOwnership);
    }
    const manifest = await captureChildCheckpoint({
      batch,
      item,
      reservation: { ...reservation, childSha: head },
      assertOwnership,
    });
    assert(
      JSON.stringify(manifest.output) === JSON.stringify(before.output),
      'child output changed during checkpoint',
    );
    return { sha: head, manifest };
  }
  async function integrationHead(batch) {
    const p = parent(batch);
    assert(
      (await realpath(p.cwd)) === p.cwd && !(await lstat(p.cwd)).isSymbolicLink(),
      'parent integration path changed',
    );
    const entries = (await git(['worktree', 'list', '--porcelain'])).split('\n\n');
    const entry = entries.find((e) => e.split('\n').includes(`worktree ${p.cwd}`));
    assert(
      entry?.split('\n').includes(`branch refs/heads/${batch.branch}`),
      'owned registered parent required',
    );
    const head = await git(['rev-parse', 'HEAD'], p.cwd);
    assert(
      (await git(['symbolic-ref', '--short', 'HEAD'], p.cwd)) === batch.branch,
      'parent branch changed',
    );
    const common = await git(['rev-parse', '--git-common-dir'], p.cwd);
    const rootCommon = await git(['rev-parse', '--git-common-dir']);
    assert(
      (await realpath(path.resolve(p.cwd, common))) ===
        (await realpath(path.resolve(root, rootCommon))),
      'parent Git common directory changed',
    );
    assert(HASH.test(head), 'invalid parent integration HEAD');
    return head;
  }
  async function integrateChild({
    batch,
    item,
    reservation,
    childSha,
    beforeSha,
    assertOwnership,
  }) {
    assert(
      typeof assertOwnership === 'function' && HASH.test(childSha) && HASH.test(beforeSha),
      'integration guard/revisions required',
    );
    await assertOwnership();
    assert(
      reservation.status === 'implemented' &&
        reservation.childSha === childSha &&
        reservation.integration?.status === 'running' &&
        reservation.integration.beforeSha === beforeSha &&
        reservation.integration.childSha === childSha,
      'durable integration reservation required',
    );
    const exact = await captureChildCheckpoint({ batch, item, reservation, assertOwnership });
    assert(
      JSON.stringify(exact) === JSON.stringify(reservation.outputManifest),
      'child output manifest changed before integration',
    );
    assert((await integrationHead(batch)) === beforeSha, 'integration tip changed');
    await parentWorkspace.assertScope(batch);
    const p = parent(batch);
    const dirty = (await git(['diff', '--name-only', '-z', 'HEAD'], p.cwd, assertOwnership))
      .split('\0')
      .filter(Boolean);
    const staged = await git(['diff', '--cached', '--name-only'], p.cwd, assertOwnership);
    assert(!staged && dirty.length === 0, 'integration tracked files dirty before cherry-pick');
    if (childSha !== reservation.sourceIntegrationSha) {
      const parents = (
        await git(['rev-list', '--parents', '-n', '1', childSha], p.cwd, assertOwnership)
      ).split(' ');
      assert(
        parents.length === 2 && parents[1] === reservation.sourceIntegrationSha,
        'child commit lineage changed',
      );
      try {
        await git(['cherry-pick', '--no-edit', childSha], p.cwd, assertOwnership);
      } catch (error) {
        // A positive retained conflict proves a stop boundary, never a retry.
        try {
          const pending = await git(
            ['rev-parse', '--verify', 'CHERRY_PICK_HEAD'],
            p.cwd,
            assertOwnership,
          );
          const unmerged = await git(
            ['diff', '--name-only', '--diff-filter=U'],
            p.cwd,
            assertOwnership,
          );
          if (pending === childSha && unmerged && (await integrationHead(batch)) === beforeSha)
            throw Object.assign(
              new Error('Owned child cherry-pick conflict retained for explicit recovery'),
              { workItemDefinite: 'integration-conflict' },
            );
        } catch (inspection) {
          if (inspection.workItemDefinite === 'integration-conflict') throw inspection;
        }
        throw error;
      }
    }
    await parentWorkspace.assertScope(batch);
    return { sha: await integrationHead(batch) };
  }
  async function inspectIntegration({ batch, item, reservation }) {
    assert(
      reservation.integration?.status === 'integrated',
      'completed integration record required',
    );
    const actual = await captureChildCheckpoint({ batch, item, reservation });
    assert(
      JSON.stringify(actual) === JSON.stringify(reservation.outputManifest),
      'retained child manifest changed',
    );
    await git(
      [
        'merge-base',
        '--is-ancestor',
        reservation.integration.beforeSha,
        reservation.integration.afterSha,
      ],
      parent(batch).cwd,
    );
    await git(
      ['merge-base', '--is-ancestor', reservation.integration.afterSha, 'HEAD'],
      parent(batch).cwd,
    );
    return { sha: reservation.integration.afterSha, manifest: actual };
  }
  return {
    coordinates,
    integrationHead,
    prepareChild,
    captureChildCheckpoint,
    checkpointChild,
    integrateChild,
    inspectIntegration,
  };
}
function samePaths(a, b) {
  return a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x));
}
