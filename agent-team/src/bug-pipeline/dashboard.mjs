import { validateState } from './contracts.mjs';

const PHASES = {
  planned: 'Analisi e piano pronti',
  implementing: 'Implementazione',
  validating: 'Test, evidenze e QA',
  simplifying: 'Semplificazione',
  publishing: 'Preparazione PR',
  reviewing: 'Review Claude',
  'waiting-review': 'Ready for review · attesa cron Claude',
  'waiting-checks': 'Attesa controlli GitHub',
  ready: 'Pronto al rilascio',
  blocked: 'Bloccato',
};

export function dashboardSnapshot({ repo, state, issues, queue, setup, now = new Date() }) {
  state = validateState(state ?? { schemaVersion: 1, repository: repo, batches: [] }, repo);
  const eligible = new Set(
    queue.map((issue) => (typeof issue === 'number' ? issue : issue.number)),
  );
  const batches = new Map(
    state.batches.flatMap((batch) => batch.issues.map((number) => [number, batch])),
  );
  const byNumber = new Map(issues.map((issue) => [issue.number, issue]));
  for (const number of batches.keys()) if (!byNumber.has(number)) byNumber.set(number, { number });
  for (const queued of queue) {
    const number = typeof queued === 'number' ? queued : queued.number;
    if (!byNumber.has(number))
      byNumber.set(number, { number, labels: typeof queued === 'number' ? [] : queued.labels });
  }
  const rows = [...byNumber.values()]
    .map((issue) => {
      const batch = batches.get(issue.number);
      const labels = (issue.labels ?? []).map((label) =>
        typeof label === 'string' ? label : label.name,
      );
      const pending = state.pendingTriage?.issues?.includes(issue.number);
      const external = labels.some((label) =>
        [
          'agent-working',
          'ready-for-dev',
          'assigned-to-claude',
          'ready-for-qa',
          'qa-passed',
        ].includes(label),
      );
      const resolved = batch?.release?.status === 'deployed';
      const blocked = batch?.phase === 'blocked';
      const status = resolved
        ? 'Risolto'
        : blocked
          ? 'Bloccato'
          : batch || pending
            ? 'In progress'
            : external
              ? 'Gestita da altro flusso'
              : eligible.has(issue.number)
                ? 'In coda'
                : 'In attesa di avvio';
      const phase = resolved
        ? 'Rilascio confermato'
        : batch?.release?.status === 'merged'
          ? 'Deploy in corso'
          : batch
            ? PHASES[batch.phase]
            : pending
              ? 'Triage e accorpamento'
              : external
                ? 'Verifica QA esterna'
                : eligible.has(issue.number)
                  ? state.triageQueue?.issues.includes(issue.number)
                    ? 'Raccolta issue per accorpamento'
                    : 'In attesa del controller'
                  : 'Aggiungere codex-run o /codex fix';
      return {
        number: issue.number,
        url: `https://github.com/${repo}/issues/${issue.number}`,
        status,
        phase,
        batch: batch?.id ?? null,
        // Titles/bodies, raw model reports and credentials are never part of this DTO.
        implementation: batch?.implementation.length ?? 0,
        reviews: batch?.reviews.length ?? 0,
        sha: batch?.sha ?? null,
        pr: batch?.pr?.number ?? null,
      };
    })
    .sort((a, b) => a.number - b.number);
  const rounds = state.setupReview471?.ledger?.rounds ?? [];
  const review = rounds.at(-1);
  return {
    repository: repo,
    fetchedAt: now.toISOString(),
    updatedAt: state.updatedAt ?? null,
    counts: {
      queued: rows.filter((row) => row.status === 'In coda').length,
      processing: rows.filter((row) => row.status === 'In progress').length,
      blocked: rows.filter((row) => row.status === 'Bloccato').length,
      resolved: rows.filter((row) => row.status === 'Risolto').length,
    },
    setup: {
      pr: 471,
      integrated: setup?.merged === true,
      phase: setup?.merged
        ? 'Integrato in main'
        : setup?.check?.status !== 'completed' && setup?.check
          ? 'Verifica runner in corso'
          : setup?.check?.conclusion === 'failure'
            ? 'Verifica runner non superata'
            : review?.verdict === 'failed' && review.subject_sha === setup?.head
              ? 'Review non riuscita: intervento richiesto'
              : review?.verdict === 'running'
                ? 'Review Claude in corso'
                : review?.verdict === 'approved' && review.subject_sha === setup?.head
                  ? 'Review approvata; attesa integrazione'
                  : setup?.draft === false
                    ? 'Ready for review · attesa cron Claude'
                    : 'Preparazione review esterna',
      reviews: rounds.length,
      reviewLimit: 4,
      check: setup?.check
        ? { status: setup.check.status, conclusion: setup.check.conclusion }
        : null,
    },
    rows,
  };
}

export async function loadDashboard(github, repo) {
  const [state, issues, queue, setup] = await Promise.all([
    github.readDashboardState(),
    github.listBugIssues(),
    github.discoverQueue(),
    github.dashboardSetup(),
  ]);
  return dashboardSnapshot({ repo, state, issues, queue, setup });
}
