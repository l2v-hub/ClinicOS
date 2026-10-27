import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { editableFile, relativeFile, sha256, safeText as safeTextSummary } from './contracts.mjs';
import { regularFile, knownTerminalFailure, safeVerificationText } from './workspace.mjs';
import { sanitizeText } from '../core/sanitize.mjs';

const exec = promisify(execFile);
const MAX_FILES = 20;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_PACKET_BYTES = 1024 * 1024 + 16 * 1024;
const knownCredentialKey = `["']?(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|CODEX_ACCESS_TOKEN|DATABASE_URL|GITHUB_TOKEN|GH_TOKEN)["']?`;
const secretPattern = new RegExp(
  `-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:${knownCredentialKey}\\s*(?::\\s*[^=;\\n]+)?=\\s*(?:['"][^'"\\r\\n]+['"]|[^\\s;]+)|${knownCredentialKey}\\s*:\\s*['"][^'"\\r\\n]+['"])|(?:password|secret|api[_-]?key|access[_-]?token)\\s*[:=]\\s*['"][A-Za-z0-9_+./=-]{12,}['"]|(?:postgres(?:ql)?|https?):\\/\\/[^\\s/@]+:[^\\s/@]+@`,
  'i',
);
function safeSource(bytes) {
  assert.ok(bytes.length <= MAX_FILE_BYTES, 'Retained source exceeds per-file limit');
  const content = bytes.toString('utf8');
  assert.ok(Buffer.from(content).equals(bytes), 'Retained source is not UTF-8 text');
  assert.ok(
    !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(content),
    'Retained source contains binary controls',
  );
  const whitespaceOnly = content.replace(/[ \t]+(\r?\n)/g, '$1').replace(/[ \t]+$/, '');
  assert.equal(sanitizeText(content), whitespaceOnly, 'Retained source contains redacted material');
  assert.ok(!secretPattern.test(content), 'Retained source contains credential material');
  return content;
}
function patchFor(file, oldText, newText) {
  if (oldText === newText) return '';
  assert.ok(
    [oldText, newText].every((text) => text === null || text === '' || text.endsWith('\n')),
    'Retained patch requires newline-terminated text',
  );
  const lines = (value) => (value ? value.replace(/\n$/, '').split('\n') : []);
  const before = lines(oldText),
    after = lines(newText);
  assert.ok(before.length + after.length <= 8000, 'Retained patch line limit');
  const oldName = oldText === null ? '/dev/null' : `a/${file}`;
  const newName = newText === null ? '/dev/null' : `b/${file}`;
  return (
    `diff --git a/${file} b/${file}\n--- ${oldName}\n+++ ${newName}\n@@ -${before.length ? `1,${before.length}` : '0,0'} +${after.length ? `1,${after.length}` : '0,0'} @@\n` +
    before.map((line) => `-${line}\n`).join('') +
    after.map((line) => `+${line}\n`).join('')
  );
}
function safeFileName(file) {
  editableFile(file);
  assert.ok(
    !/(?:^|\/)(?:home|\.env[^/]*|credentials?|secrets?|tokens?)(?:\/|\.|$)/i.test(file),
    'Retained path is sensitive',
  );
  assert.ok(
    !/\.(?:png|jpe?g|webp|gif|pdf|zip|webm|mp4|mp3|wav|sqlite|db)$/i.test(file),
    'Retained source is media or binary',
  );
  assert.ok(
    /\.(?:[cm]?[jt]sx?|py|css|scss|html|sql|prisma)$/.test(file),
    'Retained file is outside text source types',
  );
}
async function baseline(root, sha, file) {
  try {
    const { stdout } = await exec('git', ['show', `${sha}:${file}`], {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: MAX_FILE_BYTES + 1,
      env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' },
    });
    return safeSource(stdout);
  } catch (error) {
    if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') throw error;
    // A missing baseline path is an added file. Any other Git failure is refused.
    const present = await exec('git', ['cat-file', '-e', `${sha}:${file}`], {
      cwd: root,
      env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' },
    }).then(
      () => true,
      () => false,
    );
    if (present) throw error;
    const commitPresent = await exec('git', ['cat-file', '-e', `${sha}^{commit}`], {
      cwd: root,
      env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' },
    }).then(
      () => true,
      () => false,
    );
    assert.ok(commitPresent, 'Retained source baseline is unavailable');
    return null;
  }
}
export async function exportFailedCode({ batch, workspace, outputRoot }) {
  const progress = batch.controllerProgress;
  assert.ok(knownTerminalFailure(batch), 'Exact known terminal failure required');
  const initialFailure = progress.flow === 'implementation';
  const checkpoint = progress.checkpoint;
  const sourceSha = initialFailure ? checkpoint?.head : batch.sha;
  assert.ok(
    checkpoint?.schemaVersion === 1 &&
      checkpoint.head === sourceSha &&
      /^[a-f0-9]{40}$/.test(sourceSha) &&
      /^[a-f0-9]{40}$/.test(checkpoint.baseSha) &&
      checkpoint.baseSha === batch.baseSha &&
      (!initialFailure || checkpoint.head === batch.baseSha) &&
      checkpoint.planSha256 === sha256(JSON.stringify(batch.plan)) &&
      checkpoint.output &&
      typeof checkpoint.output === 'object' &&
      !Array.isArray(checkpoint.output),
    'Exact failed checkpoint required',
  );
  assert.deepEqual(
    await workspace.captureCheckpoint(batch),
    checkpoint,
    'Failed output checkpoint changed',
  );
  const cwd = checkpoint.cwd;
  assert.equal(await realpath(cwd), cwd, 'Owned worktree identity changed');
  const files = Object.keys(checkpoint.output).filter(
    (file) => !file.startsWith(`artifacts/task-validation/${batch.id}/`),
  );
  assert.ok(files.length <= MAX_FILES, 'Retained source file count exceeded');
  const copies = [];
  let sourceBytes = 0,
    patch = '';
  for (const file of files) {
    safeFileName(file);
    assert.ok(batch.plan.scope.includes(file), 'Retained source outside accepted plan');
    const identity = checkpoint.output[file];
    const previous = await baseline(cwd, checkpoint.baseSha, file);
    let current = null;
    if (identity) {
      const { target, info } = await regularFile(cwd, file);
      assert.ok(
        info.size <= MAX_FILE_BYTES && info.size === identity.bytes,
        'Retained source size changed',
      );
      const bytes = await readFile(target);
      assert.equal(sha256(bytes), identity.sha256, 'Retained source hash changed');
      assert.equal(Boolean(info.mode & 0o111), identity.executable, 'Retained source mode changed');
      current = safeSource(bytes);
      sourceBytes += bytes.length;
      copies.push({ file, bytes, sha256: identity.sha256, mode: info.mode & 0o777 });
    }
    patch += patchFor(file, previous, current);
    assert.ok(
      sourceBytes + Buffer.byteLength(patch) <= MAX_TOTAL_BYTES,
      'Retained source total size exceeded',
    );
  }
  assert.ok(Buffer.byteLength(patch) <= MAX_TOTAL_BYTES, 'Retained patch size exceeded');
  const packetFile = `artifacts/task-validation/${batch.id}/test-results/controller-verification.json`;
  let verification = null;
  if (checkpoint.output[packetFile]) {
    const { target, info } = await regularFile(cwd, packetFile);
    assert.ok(info.size <= MAX_PACKET_BYTES, 'Verification record exceeds export limit');
    const bytes = await readFile(target);
    assert.equal(
      sha256(bytes),
      checkpoint.output[packetFile].sha256,
      'Verification record changed',
    );
    const entries = JSON.parse(bytes.toString('utf8'));
    assert.ok(Array.isArray(entries) && entries.length <= 12, 'Invalid verification record');
    verification = entries.map((entry, index) => {
      const stdout = safeVerificationText(entry.output ?? '');
      const stderr = safeVerificationText(entry.errors ?? '');
      return {
        index,
        command: batch.plan.verification[index]?.command,
        argsSha256: sha256(JSON.stringify(batch.plan.verification[index]?.args)),
        exitCode: entry.code ?? null,
        ok: entry.ok === true,
        stdoutSanitizedCapturedBytes: Buffer.byteLength(stdout),
        stderrSanitizedCapturedBytes: Buffer.byteLength(stderr),
        stdoutSanitizedSha256: sha256(stdout),
        stderrSanitizedSha256: sha256(stderr),
      };
    });
  }
  let modelReport = null,
    reportCopy = null;
  if (['execute', 'simplify', 'qa'].includes(progress.failedStep)) {
    const round = progress.implementationRound ?? progress.round;
    const file = `artifacts/task-validation/${batch.id}/model-results/${round}-${progress.failedStep}.json`;
    const identity = checkpoint.output[file];
    modelReport = { availability: 'not-recorded' };
    if (identity) {
      try {
        const { target, info } = await regularFile(cwd, file);
        assert.ok(info.size <= 64 * 1024 && info.size === identity.bytes);
        const bytes = await readFile(target);
        assert.equal(sha256(bytes), identity.sha256);
        assert.equal(Boolean(info.mode & 0o111), identity.executable);
        const record = JSON.parse(safeSource(bytes));
        assert.deepEqual(
          Object.keys(record).sort(),
          [
            'schemaVersion',
            'kind',
            'step',
            'round',
            'status',
            'summary',
            'summaryDisposition',
            'originalSummarySha256',
          ].sort(),
        );
        assert.equal(record.schemaVersion, 1);
        assert.equal(record.kind, 'terminal-model-result');
        assert.equal(record.status, 'blocked');
        assert.equal(record.step, progress.failedStep);
        assert.equal(record.round, round);
        assert.ok(
          [
            'retained',
            'sanitized',
            'omitted-invalid',
            'omitted-oversized',
            'omitted-unsafe',
          ].includes(record.summaryDisposition),
        );
        assert.ok(
          record.originalSummarySha256 === null ||
            /^[a-f0-9]{64}$/.test(record.originalSummarySha256),
        );
        if (['retained', 'sanitized'].includes(record.summaryDisposition)) {
          assert.equal(typeof record.summary, 'string');
          assert.ok(Buffer.byteLength(record.summary) <= 32 * 1024);
          assert.match(record.originalSummarySha256, /^[a-f0-9]{64}$/);
          if (record.summaryDisposition === 'retained')
            assert.equal(record.originalSummarySha256, sha256(record.summary));
          assert.equal(safeVerificationText(record.summary), record.summary);
          safeTextSummary(record.summary);
          safeSource(Buffer.from(record.summary));
        } else assert.equal(record.summary, null);
        const exportedPath = `reports/${round}-${progress.failedStep}.json`;
        modelReport = {
          availability: 'retained',
          file,
          exportedPath,
          status: record.status,
          sha256: identity.sha256,
          bytes: bytes.length,
          summaryDisposition: record.summaryDisposition,
        };
        reportCopy = { exportedPath, bytes };
      } catch {
        modelReport = {
          availability: 'invalid-or-unsafe',
          file,
          ...(/^[a-f0-9]{64}$/.test(identity.sha256) ? { sha256: identity.sha256 } : {}),
        };
      }
    }
  }
  assert.ok(
    sourceBytes + Buffer.byteLength(patch) + (reportCopy?.bytes.length ?? 0) <= MAX_TOTAL_BYTES,
    'Retained source and report total size exceeded',
  );
  const manifest = {
    schemaVersion: 1,
    kind: 'partial-failed-code-retention',
    completeness: 'allowed-source-and-sanitized-failure-evidence-only',
    batchId: batch.id,
    sourceSha,
    baseSha: checkpoint.baseSha,
    failedStep: batch.controllerProgress.failedStep,
    failureCode: batch.controllerProgress.failureCode,
    round: batch.controllerProgress.round,
    feedbackSha256: batch.controllerProgress.feedbackSha256,
    planSha256: checkpoint.planSha256,
    checkpointSha256: sha256(JSON.stringify(checkpoint)),
    files: copies.map(({ file, bytes, sha256: digest, mode }) => ({
      file,
      bytes: bytes.length,
      sha256: digest,
      mode,
    })),
    deletedFiles: files.filter((file) => checkpoint.output[file] === null),
    verification,
    modelReport,
  };
  const name = relativeFile(batch.id);
  assert.match(name, /^bug-batch-[1-9]\d*$/, 'Invalid batch export identity');
  const batchRoot = path.join(outputRoot, name);
  const destination = path.join(
    batchRoot,
    `round-${batch.controllerProgress.round}-${batch.controllerProgress.failedStep}-${manifest.checkpointSha256}`,
  );
  const stage = path.join(batchRoot, `.partial-${randomUUID()}`);
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  assert.equal(await realpath(outputRoot), path.resolve(outputRoot), 'Export root is redirected');
  await mkdir(batchRoot, { recursive: true, mode: 0o700 });
  assert.equal(
    await realpath(batchRoot),
    path.resolve(batchRoot),
    'Export batch root is redirected',
  );
  assert.equal(
    await lstat(destination).then(
      () => true,
      (error) => {
        if (error.code === 'ENOENT') return false;
        throw error;
      },
    ),
    false,
    'Exact failed output export already exists',
  );
  try {
    await mkdir(stage, { mode: 0o700 });
    for (const item of copies) {
      const target = path.join(stage, 'files', item.file);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, item.bytes, { mode: 0o600 });
    }
    if (reportCopy) {
      const file = path.join(stage, reportCopy.exportedPath);
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await writeFile(file, reportCopy.bytes, { mode: 0o600 });
    }
    await writeFile(path.join(stage, 'source.patch'), patch, { mode: 0o600 });
    await writeFile(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(stage, destination);
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
  return manifest;
}
