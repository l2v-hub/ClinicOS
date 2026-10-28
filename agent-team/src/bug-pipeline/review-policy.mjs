export const STANDALONE_INFRASTRUCTURE_SCOPES = Object.freeze([
  '.agents/',
  '.claude/',
  '.github/',
  'agent-team/src/',
  'agent-team/tests/',
  'scripts/quality-gate/',
  'docs/',
  'CLAUDE.md',
  'AGENTS.md',
]);

export function isStandaloneInfrastructureFile(file) {
  if (
    typeof file !== 'string' ||
    file.length === 0 ||
    file.startsWith('/') ||
    file.includes('\\') ||
    /\p{Cc}/u.test(file)
  )
    return false;

  const segments = file.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))
    return false;

  return (
    file === 'CLAUDE.md' ||
    file === 'AGENTS.md' ||
    STANDALONE_INFRASTRUCTURE_SCOPES.some((scope) =>
      scope.endsWith('/') ? file.startsWith(scope) : file === scope,
    )
  );
}

export function standaloneMergePolicy(input = {}) {
  const { files, infrastructureFiles } = input ?? {};
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    !Array.isArray(infrastructureFiles) ||
    infrastructureFiles.length === 0 ||
    !files.every(
      (file) =>
        isStandaloneInfrastructureFile(file) &&
        infrastructureFiles.some(
          (allowed) =>
            typeof allowed === 'string' &&
            (file === allowed || (allowed.endsWith('/') && file.startsWith(allowed))),
        ),
    )
  )
    return 'unsupported-infrastructure-scope';
  return null;
}
