// This file and every controller source are part of the human-protected trust root.
export function requiresHumanReview(file) {
  return (
    file.startsWith('.github/') ||
    file.startsWith('agent-team/src/') ||
    file.startsWith('scripts/quality-gate/') ||
    file.startsWith('.agents/') ||
    file.startsWith('.claude/')
  );
}

export function standaloneMergePolicy({ files, reviewer, actor, native }) {
  if (files.some(requiresHumanReview)) return 'human-protected-trust-root';
  if (!reviewer || !native?.author || reviewer === native.author || reviewer === actor)
    return 'independent-reviewer-required';
  return null;
}
