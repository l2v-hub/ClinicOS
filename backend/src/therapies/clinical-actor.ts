import type { TherapyCreateInput } from './therapy-create.js';

export interface ClinicalActor {
  id: string;
  name?: string;
}

export function therapiesWithAuthenticatedActor(
  therapies: TherapyCreateInput[] | undefined,
  actor: ClinicalActor,
): TherapyCreateInput[] | undefined {
  return therapies?.map((therapy) => ({
    ...therapy,
    operatoreInseritore: actor.name || actor.id,
  }));
}
