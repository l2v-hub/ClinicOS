export type AgnosSuggestionAudience = 'facility' | 'operator' | 'patient';

export interface AgnosSuggestedPrompt {
  id: string;
  audience: AgnosSuggestionAudience;
  text: string;
}

export interface AgnosSuggestedPromptGroup {
  id: AgnosSuggestionAudience;
  label: string;
  prompts: AgnosSuggestedPrompt[];
}

const FACILITY_PROMPTS: AgnosSuggestedPrompt[] = [
  {
    id: 'facility-snapshot',
    audience: 'facility',
    text: 'Cosa sta succedendo nella struttura?',
  },
  {
    id: 'facility-occupancy',
    audience: 'facility',
    text: 'Qual è l’occupazione di camere e letti?',
  },
  {
    id: 'facility-staff',
    audience: 'facility',
    text: 'Elenca il personale della struttura',
  },
];

const OPERATOR_PROMPT: AgnosSuggestedPrompt = {
  id: 'operator-now',
  audience: 'operator',
  text: 'Cosa devo fare adesso?',
};

const PATIENT_PROMPTS: AgnosSuggestedPrompt[] = [
  {
    id: 'patient-allergies',
    audience: 'patient',
    text: 'Quali allergie sono documentate?',
  },
  {
    id: 'patient-therapies',
    audience: 'patient',
    text: 'Quali terapie risultano registrate?',
  },
  {
    id: 'patient-vitals',
    audience: 'patient',
    text: 'Mostrami gli ultimi parametri',
  },
];

function isFacilityRole(role?: string): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager';
}

/**
 * Keep the first screen deliberately short: at most four concrete questions.
 * An administrator always receives both facility and operational suggestions;
 * an operator never receives the facility-only group.
 */
export function agnosSuggestedPromptGroups(
  role: string | undefined,
  hasCurrentPatient: boolean,
): AgnosSuggestedPromptGroup[] {
  const groups: AgnosSuggestedPromptGroup[] = [];

  if (isFacilityRole(role)) {
    const facilityPrompts = hasCurrentPatient ? FACILITY_PROMPTS.slice(0, 2) : FACILITY_PROMPTS;
    groups.push({ id: 'facility', label: 'Struttura', prompts: facilityPrompts });
  }

  if (hasCurrentPatient) {
    const patientPrompts = isFacilityRole(role) ? PATIENT_PROMPTS.slice(0, 1) : PATIENT_PROMPTS;
    groups.push({ id: 'patient', label: 'Paziente aperto', prompts: patientPrompts });
  }

  groups.push({ id: 'operator', label: 'Attività operativa', prompts: [OPERATOR_PROMPT] });
  return groups;
}
