// Default Tool Registry: every capability exposed as a tool in Phase 1.
// The catalog of record is .ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json; the
// tool-catalog consistency test keeps this list and that file aligned.

import { appointmentTools } from './capabilities/appointments.js';
import { assessmentTools } from './capabilities/assessments.js';
import { assistantTools } from './capabilities/assistant.js';
import { consegneTools } from './capabilities/consegne.js';
import { diaryTools } from './capabilities/diary.js';
import { documentTools } from './capabilities/documents.js';
import { drugTools } from './capabilities/drugs.js';
import { intakeTools } from './capabilities/intake.js';
import { narrativeTools } from './capabilities/narrative.js';
import { operationsTools } from './capabilities/operations.js';
import { patientTools } from './capabilities/patients.js';
import { therapyTools } from './capabilities/therapy.js';
import { createToolRegistry } from './registry.js';
import type { ToolDefinition } from './types.js';

export const allToolDefinitions: readonly ToolDefinition[] = [
  ...patientTools,
  ...diaryTools,
  ...narrativeTools,
  ...therapyTools,
  ...drugTools,
  ...assessmentTools,
  ...documentTools,
  ...intakeTools,
  ...consegneTools,
  ...appointmentTools,
  ...operationsTools,
  ...assistantTools,
];

export const defaultToolRegistry = createToolRegistry(allToolDefinitions);
