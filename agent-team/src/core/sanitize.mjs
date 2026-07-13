const RULES = [
  // Header-style credentials: swallow the optional auth scheme so the token value never survives.
  [/((?:authorization|cookie|set-cookie)\s*[:=]\s*)((?:bearer|basic|token)\s+)?([^\s,;]+)/gi, '$1[REDACTED]'],
  [/\b(?:sk|ghp|github_pat|gho|xoxb|xoxp)-[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]'],
  [/\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CODEX_ACCESS_TOKEN|DATABASE_URL|GITHUB_TOKEN|GH_TOKEN)=([^\s]+)/g, (match) => `${match.split('=')[0]}=[REDACTED]`],
  [/\b(?:patientId|patient_id|operatorId|operator_id)=([A-Za-z0-9_-]+)/gi, (match) => `${match.split('=')[0]}=[REDACTED]`]
];

export function sanitizeText(text = '') {
  const redacted = RULES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), String(text));
  // Deterministic hygiene: captured evidence must pass `git diff --check` (no trailing whitespace).
  return redacted.replace(/[ \t]+(\r?\n)/g, '$1').replace(/[ \t]+$/, '');
}
