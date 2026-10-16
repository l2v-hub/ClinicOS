import { createHash } from 'node:crypto';

const STATE_BRANCH = 'codex/bug-control';
const STATE_PATH = '.codex-bug-state.json';
const REQUIRED_LABELS = ['bug', 'codex-triage', 'codex-run'];
const BLOCKING_LABELS = new Set([
  'codex-blocked',
  'codex-in-flight',
  'codex-processing',
  'status-blocked',
]);
const BOT_PROTOCOL_MARKER = '<!-- codex-bug-pipeline:';

function assertRepo(repo) {
  if (typeof repo !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new TypeError('repo must be an owner/name pair');
  }
  return repo;
}

function parseJson(text, description) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GitHub returned invalid JSON for ${description}`);
  }
}

function encodeState(state) {
  return Buffer.from(`${JSON.stringify(state, null, 2)}\n`, 'utf8').toString('base64');
}

function issueNumber(issue) {
  const n = Number(issue?.number);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new TypeError('issue number must be a positive integer');
  return n;
}

function actorLogin(actor) {
  const login = actor?.login ?? actor?.user?.login ?? actor?.name;
  return typeof login === 'string' && login.length > 0 ? login : null;
}

export function createGitHub({ cwd = process.cwd(), repo, run }) {
  assertRepo(repo);
  if (typeof run !== 'function') throw new TypeError('run must be a function');
  const [owner, name] = repo.split('/');
  let identityPromise;

  async function invoke(
    args,
    { input, allowFailure = false, maxOutputBytes = 2 * 1024 * 1024 } = {},
  ) {
    const result = await run({
      command: 'gh',
      args,
      cwd,
      ...(input === undefined ? {} : { input }),
      timeoutMs: 30000,
      maxOutputBytes,
    });
    if (!result?.ok && !allowFailure) {
      const detail = String(
        result?.stderr || result?.error || `gh exited ${result?.code ?? 'unknown'}`,
      );
      throw new Error(`GitHub command failed: ${detail.slice(0, 1000)}`);
    }
    return result ?? { ok: false, stdout: '', stderr: 'No command result' };
  }

  async function api(path, { method, body, allowFailure = false, maxOutputBytes } = {}) {
    const args = ['api', path];
    if (method) args.push('-X', method);
    if (body !== undefined) args.push('--input', '-');
    const result = await invoke(args, {
      ...(body === undefined ? {} : { input: JSON.stringify(body) }),
      allowFailure,
      ...(maxOutputBytes === undefined ? {} : { maxOutputBytes }),
    });
    if (!result.ok && allowFailure) return { ok: false, status: result.code, value: null, result };
    return { ok: true, status: result.code, value: parseJson(result.stdout, path), result };
  }

  async function apiList(path) {
    const result = await invoke(['api', path, '--paginate', '--slurp']);
    const pages = parseJson(result.stdout, path);
    if (!Array.isArray(pages) || !pages.every(Array.isArray))
      throw new Error(`GitHub returned invalid list for ${path}`);
    return pages.flat();
  }

  function notFound(response) {
    return /\b404\b/.test(String(response?.result?.stderr ?? response?.result?.error ?? ''));
  }

  async function authorized(login) {
    if (typeof login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(login)) return false;
    const response = await api(
      `repos/${repo}/collaborators/${encodeURIComponent(login)}/permission`,
      {
        allowFailure: true,
      },
    );
    if (!response.ok) return false;
    return ['write', 'maintain', 'admin'].includes(response.value?.permission);
  }

  async function authenticatedLogin() {
    if (!identityPromise) {
      identityPromise = api('user', { allowFailure: true }).then((response) =>
        response.ok ? actorLogin(response.value) : null,
      );
    }
    return (await identityPromise) ?? 'github-actions[bot]';
  }

  async function ensureLabel(label) {
    const check = await api(`repos/${repo}/labels/${encodeURIComponent(label)}`, {
      allowFailure: true,
    });
    if (check.ok) return;
    if (!notFound(check)) throw new Error(`Cannot inspect GitHub label ${label}`);
    const created = await api(`repos/${repo}/labels`, {
      method: 'POST',
      body: { name: label, color: '1D76DB', description: 'Codex bug pipeline queue' },
      allowFailure: true,
    });
    if (created.ok) return;
    // A concurrent workflow may have created it between GET and POST.
    const retry = await api(`repos/${repo}/labels/${encodeURIComponent(label)}`, {
      allowFailure: true,
    });
    if (!retry.ok) throw new Error(`Could not ensure GitHub label ${label}`);
  }

  async function applyIntakeLabels(number) {
    for (const label of REQUIRED_LABELS) await ensureLabel(label);
    const response = await api(`repos/${repo}/issues/${number}/labels`, {
      method: 'POST',
      body: { labels: REQUIRED_LABELS },
    });
    return response.value;
  }

  async function intake(event) {
    const issue = event?.issue;
    if (!issue || issue.pull_request) return [];
    const number = issueNumber(issue);
    const actor = actorLogin(event?.sender);
    let isCommand = false;
    if (event?.comment && event?.action === 'created') {
      if (actor !== actorLogin(event.comment.user)) return [];
      isCommand = /^\/codex fix$/.test(String(event.comment.body ?? '').trim());
    } else if (event?.action === 'labeled') {
      isCommand = event?.label?.name === 'codex-run';
    }
    if (!isCommand || !actor || !(await authorized(actor))) return [];
    await applyIntakeLabels(number);
    return [number];
  }

  async function latestAuthorizedRunEvent(number) {
    const events = await apiList(`repos/${repo}/issues/${number}/events?per_page=100`);
    if (!Array.isArray(events))
      throw new Error(`GitHub returned invalid issue events for #${number}`);
    const latest = events
      .filter((event) => event?.event === 'labeled' && event?.label?.name === 'codex-run')
      .sort(
        (a, b) =>
          Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0) ||
          Number(b.id ?? 0) - Number(a.id ?? 0),
      )[0];
    const login = actorLogin(latest?.actor);
    if (!login) return false;
    const botLogin = await authenticatedLogin();
    if (login === botLogin || login === 'github-actions[bot]') {
      // A label added by this workflow cannot authenticate itself. Accept its event only
      // when a recent exact command by a write-capable human immediately preceded it.
      const eventAt = Date.parse(latest.created_at ?? '');
      if (!Number.isFinite(eventAt)) return false;
      const comments = await apiList(`repos/${repo}/issues/${number}/comments?per_page=100`);
      for (const comment of comments) {
        const createdAt = Date.parse(comment.created_at ?? '');
        const author = actorLogin(comment.user);
        if (
          author &&
          /^\/codex fix$/.test(String(comment.body ?? '').trim()) &&
          Number.isFinite(createdAt) &&
          createdAt <= eventAt &&
          eventAt - createdAt <= 60 * 60 * 1000 &&
          (await authorized(author))
        )
          return true;
      }
      return false;
    }
    return await authorized(login);
  }

  async function discoverQueue() {
    const issues = await apiList(
      `repos/${repo}/issues?state=open&labels=bug,codex-run&per_page=100`,
    );
    const queued = [];
    for (const issue of issues) {
      if (issue.pull_request) continue;
      const labels = new Set((issue.labels ?? []).map((label) => label.name));
      if ([...BLOCKING_LABELS].some((label) => labels.has(label))) continue;
      if (await latestAuthorizedRunEvent(issueNumber(issue))) queued.push(issue);
    }
    return queued;
  }

  function createStateStore() {
    let fileSHA;
    let loaded = false;

    async function ensureBranch() {
      const refPath = `repos/${repo}/git/ref/heads/${STATE_BRANCH}`;
      const existing = await api(refPath, { allowFailure: true });
      if (existing.ok) return;
      if (!notFound(existing)) throw new Error('Cannot inspect durable state branch');
      const main = await api(`repos/${repo}/git/ref/heads/main`, { allowFailure: true });
      if (!main.ok)
        throw new Error('Cannot initialize durable state: main branch ref is unavailable');
      const sha = main.value?.object?.sha;
      if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/i.test(sha)) {
        throw new Error('Cannot initialize durable state: main ref has an invalid commit SHA');
      }
      const created = await api(`repos/${repo}/git/refs`, {
        method: 'POST',
        body: { ref: `refs/heads/${STATE_BRANCH}`, sha },
        allowFailure: true,
      });
      if (!created.ok && !(await api(refPath, { allowFailure: true })).ok) {
        throw new Error('Cannot initialize durable state branch');
      }
    }

    async function load() {
      await ensureBranch();
      const response = await api(
        `repos/${repo}/contents/${STATE_PATH}?ref=${encodeURIComponent(STATE_BRANCH)}`,
        {
          allowFailure: true,
        },
      );
      if (!response.ok) {
        if (!notFound(response)) throw new Error('Cannot read durable bug pipeline state');
        loaded = true;
        fileSHA = null;
        return null;
      }
      if (response.value?.type !== 'file' || typeof response.value.sha !== 'string') {
        throw new Error('Durable state path is not a regular file');
      }
      let text;
      try {
        text = Buffer.from(response.value.content, 'base64').toString('utf8');
      } catch {
        throw new Error('Durable state file is not valid base64');
      }
      fileSHA = response.value.sha;
      loaded = true;
      return parseJson(text, 'durable state');
    }

    async function save(state) {
      if (!loaded) throw new Error('load durable state before saving (optimistic concurrency)');
      if (state === null || typeof state !== 'object' || Array.isArray(state)) {
        throw new TypeError('state must be a JSON object');
      }
      await ensureBranch();
      const body = {
        message: 'chore: update Codex bug pipeline state',
        content: encodeState(state),
        branch: STATE_BRANCH,
      };
      if (fileSHA) body.sha = fileSHA;
      const response = await api(`repos/${repo}/contents/${STATE_PATH}`, {
        method: 'PUT',
        body,
        allowFailure: true,
      });
      if (!response.ok)
        throw new Error('Durable state compare-and-swap failed; state was not reset');
      const sha = response.value?.content?.sha;
      if (typeof sha !== 'string')
        throw new Error('GitHub saved state without returning its file SHA');
      fileSHA = sha;
      loaded = true;
      return sha;
    }

    return { load, save };
  }

  async function createDraft({ branch, title, body }) {
    if (
      typeof branch !== 'string' ||
      !/^[A-Za-z0-9._/-]+$/.test(branch) ||
      branch.startsWith('-')
    ) {
      throw new TypeError('invalid draft branch');
    }
    if (typeof title !== 'string' || !title.trim() || typeof body !== 'string') {
      throw new TypeError('draft title and body are required');
    }
    const response = await invoke([
      'pr',
      'create',
      '--repo',
      repo,
      '--base',
      'main',
      '--head',
      branch,
      '--title',
      title,
      '--body',
      body,
      '--draft',
    ]);
    const url = response.stdout.trim();
    const match = url.match(/\/pull\/(\d+)\/?$/);
    if (!match) throw new Error('GitHub did not return a draft pull request URL');
    return { number: Number(match[1]), url };
  }

  async function commentIssue(number, body) {
    issueNumber({ number });
    return (
      await api(`repos/${repo}/issues/${number}/comments`, {
        method: 'POST',
        body: { body: String(body) },
      })
    ).value;
  }

  async function commentPR(number, body) {
    issueNumber({ number });
    return (
      await api(`repos/${repo}/issues/${number}/comments`, {
        method: 'POST',
        body: { body: String(body) },
      })
    ).value;
  }

  async function viewIssue(number) {
    issueNumber({ number });
    const value = (await api(`repos/${repo}/issues/${number}`)).value;
    const [labels, comments] = await Promise.all([
      apiList(`repos/${repo}/issues/${number}/labels?per_page=100`),
      apiList(`repos/${repo}/issues/${number}/comments?per_page=100`),
    ]);
    return { ...value, labels, comments };
  }

  async function reviewFeedback(pr) {
    const number = issueNumber({ number: typeof pr === 'object' ? pr.number : pr });
    const details = await api(`repos/${repo}/pulls/${number}`);
    const [reviews, reviewComments, issueComments, user] = await Promise.all([
      apiList(`repos/${repo}/pulls/${number}/reviews?per_page=100`),
      apiList(`repos/${repo}/pulls/${number}/comments?per_page=100`),
      apiList(`repos/${repo}/issues/${number}/comments?per_page=100`),
      api('user', { allowFailure: true }),
    ]);
    const graph = await invoke([
      'api',
      'graphql',
      '-f',
      'query=query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){pageInfo{hasNextPage} nodes{isResolved}}}}}',
      '-F',
      `owner=${owner}`,
      '-F',
      `name=${name}`,
      '-F',
      `number=${number}`,
    ]);
    const threadData = parseJson(graph.stdout, 'unresolved review threads');
    const threadConnection = threadData?.data?.repository?.pullRequest?.reviewThreads;
    const threads = threadConnection?.nodes;
    if (!Array.isArray(threads)) throw new Error('GitHub did not return PR review thread status');
    const ownLogin = user.ok ? actorLogin(user.value) : null;
    const isOwnProtocolComment = (author, body) =>
      (author === ownLogin || author === 'github-actions[bot]') &&
      String(body ?? '').includes(BOT_PROTOCOL_MARKER);
    const comments = [];
    for (const review of reviews) {
      const author = actorLogin(review.user);
      if (isOwnProtocolComment(author, review.body)) continue;
      if (review.body)
        comments.push({
          id: review.id,
          body: review.body,
          author,
          state: review.state,
          submitted_at: review.submitted_at,
        });
    }
    for (const comment of [...reviewComments, ...issueComments]) {
      const author = actorLogin(comment.user);
      if (isOwnProtocolComment(author, comment.body)) continue;
      comments.push({
        id: comment.id,
        body: comment.body ?? '',
        author,
        path: comment.path,
        line: comment.line,
        created_at: comment.created_at,
        url: comment.html_url,
      });
    }
    const latestReviewByAuthor = new Map();
    for (const review of reviews) {
      // A later COMMENTED/PENDING review is not an approval and cannot clear a
      // prior request for changes. Dismissed decisions are already marked by GitHub.
      if (!['APPROVED', 'CHANGES_REQUESTED'].includes(review.state)) continue;
      const author = actorLogin(review.user);
      if (!author) continue;
      const prior = latestReviewByAuthor.get(author);
      if (!prior || Date.parse(review.submitted_at ?? 0) > Date.parse(prior.submitted_at ?? 0)) {
        latestReviewByAuthor.set(author, review);
      }
    }
    return {
      number,
      url: details.value.html_url,
      state:
        details.value.merged === true ? 'MERGED' : String(details.value.state ?? '').toUpperCase(),
      isDraft: details.value.draft === true,
      mergeCommitSha: details.value.merge_commit_sha,
      head: details.value.head?.sha,
      headRef: details.value.head?.ref,
      headRepo: details.value.head?.repo?.full_name,
      headIsFork:
        details.value.head?.repo?.fork === true || details.value.head?.repo?.full_name !== repo,
      baseRef: details.value.base?.ref,
      comments,
      unresolved:
        threadConnection.pageInfo?.hasNextPage === true ||
        threads.some((thread) => !thread.isResolved),
      changesRequested: [...latestReviewByAuthor.values()].some(
        (review) => review.state === 'CHANGES_REQUESTED',
      ),
    };
  }

  async function draftReady(pr) {
    const number = issueNumber({ number: typeof pr === 'object' ? pr.number : pr });
    await invoke(['pr', 'ready', String(number), '--repo', repo]);
    return (await api(`repos/${repo}/pulls/${number}`)).value;
  }

  async function mergePullRequest(pr, sha) {
    const number = issueNumber({ number: typeof pr === 'object' ? pr.number : pr });
    if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha))
      throw new TypeError('merge requires an exact reviewed SHA');
    await invoke([
      'pr',
      'merge',
      String(number),
      '--repo',
      repo,
      '--squash',
      '--match-head-commit',
      sha,
    ]);
    const merged = await api(`repos/${repo}/pulls/${number}`);
    if (
      String(merged.value.state ?? '').toUpperCase() !== 'CLOSED' ||
      merged.value.merged !== true ||
      !/^[a-f0-9]{40}$/.test(merged.value.merge_commit_sha ?? '')
    ) {
      throw new Error('GitHub did not confirm the expected pull request merge');
    }
    return {
      number,
      reviewedSha: sha,
      mergeSha: merged.value.merge_commit_sha,
      url: merged.value.html_url,
    };
  }

  async function readFileAtRevision(file, sha) {
    if (
      typeof file !== 'string' ||
      !file ||
      file.startsWith('/') ||
      file.includes('\\') ||
      file.split('/').some((part) => !part || part === '.' || part === '..')
    ) {
      throw new TypeError('invalid repository file path');
    }
    if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha))
      throw new TypeError('file lookup requires an exact commit SHA');
    const encoded = file.split('/').map(encodeURIComponent).join('/');
    const metadata = await api(`repos/${repo}/contents/${encoded}?ref=${sha}`);
    if (
      metadata.value?.type !== 'file' ||
      !/^[a-f0-9]{40}$/.test(metadata.value.sha ?? '') ||
      !Number.isSafeInteger(metadata.value.size) ||
      metadata.value.size < 0 ||
      metadata.value.size > 25 * 1024 * 1024
    ) {
      throw new Error(`remote evidence file is unavailable or outside size limits: ${file}`);
    }
    const blob = await api(`repos/${repo}/git/blobs/${metadata.value.sha}`, {
      maxOutputBytes: 40 * 1024 * 1024,
    });
    if (blob.value?.encoding !== 'base64' || typeof blob.value.content !== 'string')
      throw new Error(`remote evidence blob is not base64: ${file}`);
    const bytes = Buffer.from(blob.value.content, 'base64');
    if (bytes.length !== metadata.value.size || blob.value.size !== bytes.length)
      throw new Error(`remote evidence size does not match GitHub metadata: ${file}`);
    return {
      path: file,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      ...(bytes.length <= 1024 * 1024 ? { content: bytes.toString('utf8') } : {}),
    };
  }

  /**
   * Query branch-protection-required checks only. Empty, pending, failed, malformed or
   * unavailable results all block readiness. An empty result cannot prove that protection
   * is configured, so callers must treat it as a configuration failure and verify protection.
   */
  async function requiredChecks(pr) {
    const number = issueNumber({ number: typeof pr === 'object' ? pr.number : pr });
    const result = await invoke(
      ['pr', 'checks', String(number), '--repo', repo, '--required', '--json', 'name,state,bucket'],
      { allowFailure: true },
    );
    let checks;
    try {
      checks = JSON.parse(result.stdout);
    } catch {
      return {
        ok: false,
        details: ['Cannot determine required checks; GitHub response was missing or invalid.'],
      };
    }
    if (!Array.isArray(checks) || checks.length === 0) {
      return {
        ok: false,
        details: ['No required checks were reported; verify branch protection before release.'],
      };
    }
    const details = checks.map(
      (check) => `${check.name}: ${check.state ?? check.bucket ?? 'unknown'}`,
    );
    const passing = checks.every((check) => {
      const state = String(check.state ?? '').toUpperCase();
      const bucket = String(check.bucket ?? '').toUpperCase();
      return (state ? state === 'SUCCESS' : bucket === 'PASS') && (!bucket || bucket === 'PASS');
    });
    if (!result.ok) details.push(`gh pr checks exited ${result.code ?? 'with an error'}`);
    return { ok: result.ok && passing, details };
  }

  return {
    authorized,
    intake,
    discoverQueue,
    createStateStore,
    viewIssue,
    createDraft,
    commentIssue,
    commentPR,
    reviewFeedback,
    draftReady,
    mergePullRequest,
    readFileAtRevision,
    requiredChecks,
  };
}

export const BUG_PIPELINE_STATE_BRANCH = STATE_BRANCH;
