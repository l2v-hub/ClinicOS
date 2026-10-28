export const DEFAULT_DELEGATE_MODEL = 'gpt-6-luna';

// Profiles come from the trusted host, never from issue text. Readiness describes
// CLI/auth preflight; it is not proof of model entitlement or global capacity.
export function selectWorkItemExecutor({ item, profiles, localClaims = [] }) {
  if (!Array.isArray(profiles) || !item) throw new Error('Invalid work-item routing context');
  const claimed = (profile) =>
    localClaims.filter(
      (claim) =>
        claim.profileId === profile.id ||
        (claim.provider === profile.provider && claim.model === profile.model),
    ).length;
  const available = profiles.filter(
    (profile) =>
      profile.ready === true &&
      ['codex', 'claude'].includes(profile.provider) &&
      typeof profile.id === 'string' &&
      typeof profile.model === 'string' &&
      profile.model.trim() &&
      ['senior', 'delegate'].includes(profile.tier) &&
      Number.isSafeInteger(profile.limit) &&
      profile.limit > 0 &&
      claimed(profile) < profile.limit,
  );
  const senior =
    item.routePreference === 'senior' ||
    item.difficulty === 'high' ||
    item.risk?.level !== 'low' ||
    item.coupling?.level === 'shared';
  const profile = senior
    ? available.find((candidate) => candidate.tier === 'senior')
    : available.find((candidate) => candidate.tier === 'delegate') ||
      available.find((candidate) => candidate.tier === 'senior');
  return profile
    ? {
        ...profile,
        profileId: profile.id,
        reason: senior
          ? 'risk-coupling-or-senior-plan'
          : profile.tier === 'delegate'
            ? 'bounded-work-item-delegation'
            : 'delegate-not-locally-ready',
        localActive: claimed(profile),
      }
    : null;
}
export const legacyExecution = {
  difficulty: 'high',
  mode: 'direct',
  reason: 'Legacy plan has no assessed delegation boundary; retain senior execution.',
};

export function selectExecutor({
  plan,
  plannerModel,
  executorModel = 'auto',
  delegateModel = DEFAULT_DELEGATE_MODEL,
  active = () => 0,
  unavailable = () => false,
  round = 1,
}) {
  if (typeof executorModel !== 'string' || !executorModel.trim())
    throw new Error('executorModel is not configured; set auto or an explicit supported model ID');
  const assessment = plan?.execution === undefined ? legacyExecution : plan.execution;
  if (
    !assessment ||
    typeof assessment !== 'object' ||
    Array.isArray(assessment) ||
    !['low', 'medium', 'high'].includes(assessment.difficulty) ||
    !['direct', 'delegate'].includes(assessment.mode) ||
    typeof assessment.reason !== 'string' ||
    !assessment.reason.trim()
  )
    throw new Error('invalid execution assessment');
  let model, reason;
  if (executorModel !== 'auto') {
    model = executorModel.trim();
    reason = 'configured-override';
  } else if (assessment.difficulty === 'high' || assessment.mode === 'direct') {
    model = plannerModel;
    reason = 'difficulty-or-direct-plan';
  } else if (round > 1) {
    model = plannerModel;
    reason = 'escalated-attempt';
  } else if (!delegateModel || delegateModel === plannerModel) {
    model = plannerModel;
    reason = 'senior-only-pool';
  } else if (unavailable(delegateModel)) {
    model = plannerModel;
    reason = 'delegate-capacity-unavailable';
  } else if (active(delegateModel) > 0) {
    model = plannerModel;
    reason = 'delegate-locally-busy';
  } else {
    model = delegateModel;
    reason = 'bounded-delegation';
  }
  if (typeof model !== 'string' || !model.trim())
    throw new Error('selected execution model is not configured');
  return {
    model: model.trim(),
    difficulty: assessment.difficulty,
    mode: model === plannerModel ? 'direct' : 'delegate',
    reason,
    localActive: active(model),
  };
}
