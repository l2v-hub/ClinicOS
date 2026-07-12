const names = (issue) => new Set((issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name));

export function isDevelopmentEligible(issue, labels) {
  const set = names(issue);
  return set.has(labels.readyForDev) && set.has(labels.assignedToClaude) && !set.has(labels.working) && !set.has(labels.readyForQa) && !set.has(labels.blocked);
}

export function isQaEligible(issue, labels) {
  const set = names(issue);
  return set.has(labels.readyForQa) && !set.has(labels.qaPassed) && !set.has(labels.qaFailed) && !set.has(labels.blocked);
}

export function assertTransition(from, to, role) {
  const allowed = role === 'claude'
    ? { 'ready-for-dev': ['agent-working'], 'agent-working': ['ready-for-qa', 'blocked'] }
    : { 'ready-for-qa': ['qa-passed', 'qa-failed', 'blocked'], 'qa-failed': ['ready-for-dev'] };
  if (!allowed[from]?.includes(to)) throw new Error(`forbidden ${role} transition: ${from} -> ${to}`);
}
