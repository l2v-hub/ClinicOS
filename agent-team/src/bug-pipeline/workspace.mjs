import { mkdir, readFile, writeFile, lstat, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { runBugReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';
import { relativeFile, editableFile, safeText, sha256 } from './contracts.mjs';
import { validatePng, validateTrace } from './evidence.mjs';
import { verificationArguments } from './verification.mjs';

export async function regularFile(root, file) {
  relativeFile(file);
  const target = path.resolve(root, file);
  const info = await lstat(target);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    !(await realpath(target)).startsWith((await realpath(root)) + path.sep)
  )
    throw new Error('file must be a contained regular file');
  return { target, info };
}
export async function validateEvidence(cwd, plan) {
  const entries = [];
  for (const item of plan.evidence) {
    const files = {};
    for (const kind of ['screenshot', 'trace', 'video']) {
      if (!item[kind] && kind === 'video') continue;
      const { target, info } = await regularFile(cwd, item[kind]);
      if (info.size < 16 || info.size > 25 * 1024 * 1024)
        throw new Error('evidence is empty or exceeds GitHub size budget');
      const bytes = await readFile(target);
      if (kind === 'screenshot') validatePng(bytes);
      if (kind === 'trace') validateTrace(bytes);
      if (
        kind === 'video' &&
        !(
          bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) ||
          bytes.subarray(4, 8).toString() === 'ftyp'
        )
      )
        throw new Error('invalid video evidence');
      files[kind] = { path: item[kind], sha256: sha256(bytes), bytes: info.size };
    }
    entries.push({ issue: item.issue, files });
  }
  return entries;
}

export function createWorkspace({ root, repo, run, models }) {
  const coordinates = (batch) => ({
    cwd: path.join(root, 'agent-team', '.worktrees', batch.id),
    packet: `artifacts/task-validation/${batch.id}`,
  });
  const invoke = async (command, args, cwd = root, envMode = 'controller') => {
    const result = await run({
      command,
      args,
      cwd,
      envMode,
      timeoutMs: command === 'npm' ? 10 * 60_000 : 30_000,
      maxOutputBytes: 2 * 1024 * 1024,
    });
    if (!result.ok) throw new Error(`${command} operation failed`);
    return result.stdout.trim();
  };
  const git = (args, cwd) => invoke('git', args, cwd);
  const packetFile = (batch, file) =>
    path.join(coordinates(batch).cwd, coordinates(batch).packet, file);
  const recordExecution = async (batch, phase, round) => {
    const selection = models.executionFor?.(coordinates(batch).cwd);
    if (!selection) return;
    batch.executionHistory ??= [];
    batch.executionHistory.push({ phase, round: round ?? null, ...selection });
    await writeFile(
      packetFile(batch, 'execution-history.json'),
      JSON.stringify(batch.executionHistory, null, 2) + '\n',
    );
  };
  const status = (cwd) => git(['status', '--porcelain', '--untracked-files=all'], cwd);
  async function assertScope(batch) {
    const { cwd, packet } = coordinates(batch);
    const changed = (await git(['diff', '--name-only', batch.baseSha], cwd))
      .split('\n')
      .filter(Boolean);
    const untracked = (await git(['ls-files', '--others', '--exclude-standard'], cwd))
      .split('\n')
      .filter(Boolean);
    for (const file of new Set([...changed, ...untracked])) {
      relativeFile(file);
      if (file.startsWith(packet + '/')) {
        if (
          ['task-contract.md', 'implementation-plan.md', 'analysis.md'].includes(
            file.slice(packet.length + 1),
          )
        )
          continue;
      } else {
        editableFile(file);
        if (!batch.plan.scope.includes(file))
          throw new Error('executor edited outside accepted file scope');
      }
      const fileInfo = await lstat(path.join(cwd, file)).catch((e) =>
        e.code === 'ENOENT' ? null : Promise.reject(e),
      );
      if (
        fileInfo?.isSymbolicLink() ||
        (fileInfo &&
          !(await realpath(path.join(cwd, file))).startsWith((await realpath(cwd)) + path.sep))
      )
        throw new Error('symlink implementation/evidence is not publishable');
    }
    const expected = batch.packetHashes;
    for (const [file, digest] of Object.entries(expected)) {
      const { target } = await regularFile(cwd, `${packet}/${file}`);
      if (sha256(await readFile(target)) !== digest)
        throw new Error('executor changed the frozen contract or plan');
    }
  }
  async function verify(batch) {
    const { cwd, packet } = coordinates(batch);
    await assertScope(batch);
    // Old artifacts never satisfy a fresh validation. Commands must regenerate every screenshot/trace.
    const evidenceDir = path.join(cwd, packet, 'evidence');
    const prior = await lstat(evidenceDir).catch((e) =>
      e.code === 'ENOENT' ? null : Promise.reject(e),
    );
    if (prior?.isSymbolicLink()) throw new Error('evidence directory must not be a symlink');
    await rm(evidenceDir, { recursive: true, force: true });
    await mkdir(evidenceDir, { recursive: true });
    const results = [];
    for (const entry of batch.plan.verification) {
      // Run model-selected test commands inside the actual Codex sandbox, with NO API/GitHub keys.
      const result = await run({
        command: 'codex',
        args: verificationArguments(cwd, entry.command, entry.args),
        cwd,
        envMode: 'verification',
        timeoutMs: 15 * 60_000,
        maxOutputBytes: 1024 * 1024,
      });
      results.push({
        command: entry.command,
        args: entry.args,
        ok: result.ok,
        code: result.code,
        output: result.stdout,
        errors: result.stderr,
      });
      await mkdir(path.join(cwd, packet, 'test-results'), { recursive: true });
      await writeFile(
        path.join(cwd, packet, 'test-results', 'controller-verification.json'),
        JSON.stringify(results, null, 2) + '\n',
      );
      if (
        !result.ok ||
        /(?:# tests 0\b|0 tests? passed|No test files found)/i.test(result.stdout + result.stderr)
      )
        throw new Error('required verification failed or executed no tests');
    }
    batch.evidence = await validateEvidence(cwd, batch.plan);
    await assertScope(batch);
    await writeFile(
      packetFile(batch, 'validation-report.md'),
      `# Validation report\n\nSource issues: ${batch.issues.map((n) => `#${n}`).join(', ')}\n\nAll ${results.length} required commands passed after the current executor/simplification session. Evidence regenerated and SHA-256 recorded in evidence-manifest.json.\n\n## Final Decision\n\nPARTIAL — waiting for independent Claude PR review and required remote checks.\n`,
    );
    await writeFile(
      packetFile(batch, 'evidence-manifest.json'),
      JSON.stringify(batch.evidence, null, 2) + '\n',
    );
  }
  return {
    root,
    async prepare(batch) {
      const { cwd, packet } = coordinates(batch);
      await git(['fetch', 'origin', 'main']);
      const entries = (await git(['worktree', 'list', '--porcelain'])).split('\n\n');
      const registered = entries.find((e) => e.split('\n').includes(`worktree ${cwd}`));
      if (registered) {
        if (
          !registered.split('\n').includes(`branch refs/heads/${batch.branch}`) ||
          (await status(cwd))
        )
          throw new Error('occupied worktree is not the clean expected batch');
      } else {
        const occupied = await lstat(cwd).catch((e) =>
          e.code === 'ENOENT' ? null : Promise.reject(e),
        );
        if (occupied) throw new Error('worktree path already occupied');
        await mkdir(path.dirname(cwd), { recursive: true });
        if (batch.sha) {
          await git(['fetch', 'origin', batch.branch]);
          await git(['worktree', 'add', '-b', batch.branch, cwd, `origin/${batch.branch}`]);
        } else await git(['worktree', 'add', '-b', batch.branch, cwd, 'origin/main']);
      }
      if (batch.sha && (await git(['rev-parse', 'HEAD'], cwd)) !== batch.sha)
        throw new Error('recovered worktree has a different revision');
      batch.baseSha ??= await git(['rev-parse', 'HEAD'], cwd);
      if (!batch.packetHashes) {
        await mkdir(path.join(cwd, packet), { recursive: true });
        const files = {
          'task-contract.md': `# Task Contract\n\n## Impact Classification\n\nBug batch ${batch.id}. Only the accepted file scope is authorized.\n\n## Current Behaviour\n\n${batch.plan.analysis}\n\n## Expected Behaviour\n\n${batch.plan.title}\n\n## Acceptance Criteria\n\n${JSON.stringify(batch.plan.acceptance, null, 2)}\n\n## Test Plan\n\n${JSON.stringify(batch.plan.verification, null, 2)}\n\n## Evidence Plan\n\nSynthetic local fixtures; per-issue PNG and Playwright trace, optional video. No production data.\n\n## Gate Status\n\nREADY FOR IMPLEMENTATION\n`,
          'analysis.md': `# Analysis\n\nFeature: ${batch.plan.feature}\n\n${batch.plan.rationale}\n\n${batch.plan.analysis}\n\nSource issues: ${batch.issues.join(', ')}\nBaseline: ${batch.baseSha}\n`,
          'triage-index.md': `# Issue grouping\n\nBatch: ${batch.id}\nBaseline: ${batch.baseSha}\nFeature: ${batch.plan.feature}\n\n${batch.plan.rationale}\n\n## Issue to affected files\n\n${JSON.stringify(batch.grouping?.fileMap ?? [], null, 2)}\n\n## Separation from overlapping groups\n\n${batch.grouping?.separationReason || 'No shared-file split declared.'}\n\nEvery source issue retains its own acceptance criteria, regression scenario and evidence in implementation-plan.md.\n`,
          'implementation-plan.md': `# Frozen implementation plan\n\nBranch: ${batch.branch}\nBaseline: ${batch.baseSha}\n\n${JSON.stringify({ ...batch.plan, ...batch.grouping }, null, 2)}\n`,
        };
        batch.packetHashes = {};
        for (const [file, content] of Object.entries(files)) {
          safeText(content);
          await writeFile(packetFile(batch, file), content, { flag: 'wx' });
          batch.packetHashes[file] = sha256(content);
        }
      }
      // No lifecycle scripts, model keys, GitHub token or production environment reach installation.
      if (!(await lstat(path.join(cwd, 'node_modules')).catch(() => null))) {
        await invoke(
          'npm',
          ['ci', '--ignore-scripts', '--no-audit', '--no-fund'],
          cwd,
          'verification',
        );
        await invoke('npm', ['run', 'db:generate'], cwd, 'verification');
      }
    },
    async execute(batch, options) {
      if (options.feedback) {
        const content = safeText(JSON.stringify(options.feedback, null, 2) + '\n');
        await writeFile(packetFile(batch, 'review-feedback.json'), content);
      }
      try {
        return await models.execute({ ...coordinates(batch), plan: batch.plan, ...options });
      } finally {
        await recordExecution(batch, options.phase, options.round);
      }
    },
    async simplify(batch) {
      try {
        return await models.simplify({ ...coordinates(batch), plan: batch.plan });
      } finally {
        await recordExecution(batch, 'simplify');
      }
    },
    async qa(batch) {
      const result = await models.qa({ ...coordinates(batch), plan: batch.plan });
      safeText(result.summary);
      await writeFile(
        packetFile(batch, 'codex-independent-qa.md'),
        `# Independent Codex QA\n\n${result.status}\n\n${result.summary}\n`,
      );
      return result;
    },
    async finalQa(batch) {
      // A finding must leave the reviewed worktree clean for prepare/correction.
      const result = await models.qa({ ...coordinates(batch), plan: batch.plan });
      safeText(result.summary);
      return result;
    },
    verify,
    async checkpoint(batch) {
      const { cwd, packet } = coordinates(batch);
      await assertScope(batch);
      // Stage only the accepted scope and packet; unrelated files never enter a commit.
      await git(['add', '--', ...batch.plan.scope, packet], cwd);
      if (!(await git(['diff', '--cached', '--name-only'], cwd)))
        return git(['rev-parse', 'HEAD'], cwd);
      await git(
        [
          '-c',
          'core.hooksPath=/dev/null',
          'commit',
          '-m',
          `fix: ${batch.id} validated implementation`,
        ],
        cwd,
      );
      if (await status(cwd)) throw new Error('checkpoint left uncommitted files');
      return git(['rev-parse', 'HEAD'], cwd);
    },
    async publish(batch) {
      const { cwd } = coordinates(batch);
      if ((await status(cwd)) || (await git(['rev-parse', 'HEAD'], cwd)) !== batch.sha)
        throw new Error('cannot publish dirty or changed revision');
      // Constant helper uses the controller's injected GitHub token without writing it into Git config.
      await git(
        [
          '-c',
          'credential.helper=',
          '-c',
          'credential.helper=!gh auth git-credential',
          'push',
          'origin',
          `HEAD:refs/heads/${batch.branch}`,
        ],
        cwd,
      );
    },
    async review(batch) {
      const { cwd, packet } = coordinates(batch);
      const ledgerFile = packetFile(batch, 'claude-review-state.local');
      if (batch.reviewLedger)
        await writeFile(ledgerFile, JSON.stringify(batch.reviewLedger) + '\n');
      // Prior report content is restored only after checking hashes in the existing helper.
      let result;
      try {
        result = await runBugReview({
          cwd,
          packet,
          run: (options) =>
            run({ ...options, envMode: options.command === 'claude' ? 'review' : 'verification' }),
        });
      } finally {
        const raw = await readFile(ledgerFile, 'utf8').catch(() => null);
        if (raw) batch.reviewLedger = JSON.parse(raw);
      }
      if (!result.report) throw new Error('no new final-review evidence');
      const name = path.basename(result.report);
      const content = await readFile(path.join(cwd, result.report), 'utf8');
      batch.reviewReports ??= {};
      batch.reviewReports[name] = content;
      // Keep review evidence in durable state and the PR comment, outside the reviewed commit.
      // Committing it now would change HEAD and invalidate the approval it just established.
      await rm(path.join(cwd, result.report));
      return JSON.parse(content);
    },
    prBody: (b) =>
      `Codex batch: ${b.issues.map((n) => `Refs #${n}`).join(', ')}.\n\n${b.plan.rationale}\n\nDetailed plan and synthetic validation evidence: \`artifacts/task-validation/${b.id}/\`.\n\nDraft awaiting Claude review and required checks. No automatic merge/deploy.`,
    issueEvidence: async (b) => {
      const base = `https://github.com/${repo}/blob/${b.sha}/`;
      const raw = `https://raw.githubusercontent.com/${repo}/${b.sha}/`;
      const lines = [
        `PR ${b.pr.url}; verified revision \`${b.sha}\`.`,
        `[Piano](${base}artifacts/task-validation/${b.id}/implementation-plan.md) · [Risultati](${base}artifacts/task-validation/${b.id}/test-results/controller-verification.json)`,
      ];
      for (const entry of b.evidence ?? []) {
        const urlPath = (file) => file.split('/').map(encodeURIComponent).join('/');
        lines.push(
          `\nIssue #${entry.issue}:\n![Verifica sintetica issue ${entry.issue}](${raw}${urlPath(entry.files.screenshot.path)})\n[Playwright trace](${base}${urlPath(entry.files.trace.path)})`,
        );
        if (entry.files.video) lines.push(`[Video](${base}${urlPath(entry.files.video.path)})`);
      }
      return lines.join('\n');
    },
    reviewBody: (b, r) =>
      `<!-- codex-bug-pipeline:review -->\nClaude review ${b.reviews.length}/4 on \`${r.subject_sha}\`: **${r.verdict}**.\n\n${r.summary}\n\n${r.findings.map((f) => `- ${f.file}:${f.line} (${f.severity}): ${f.problem}\n  Correction: ${f.requested_change}\n  Verification: ${f.test_expectation}`).join('\n')}`,
  };
}
