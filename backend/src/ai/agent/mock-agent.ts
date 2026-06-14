// Deterministic MockAgentProvider (REQ-021) for CI/tests. No network.
// Simulates the agent loop: "extracts" a fixed synthetic patient, then actually
// calls the real find_existing_patient tool to decide new vs existing — so the
// decision logic + tool are exercised deterministically.

import { findExistingPatient } from './tools.js';
import type { AgentExtractionProvider, AgentExtractionRequest, AgentResult, AgentProposalInput } from './types.js';

export class MockAgentProvider implements AgentExtractionProvider {
  readonly name = 'mock-agent';
  readonly model = 'mock-agent';

  async run(request: AgentExtractionRequest): Promise<AgentResult> {
    const toolTrace: string[] = [];

    // Deterministic synthetic "extraction" (no real data invented from documents).
    const patient = { nome: 'AgentMock', cognome: 'Sintetico', dataNascita: '1970-01-01', sesso: 'M' };

    // Real tool call: does this patient already exist?
    toolTrace.push('find_existing_patient');
    const matches = await findExistingPatient({
      firstName: patient.nome, lastName: patient.cognome, dateOfBirth: patient.dataNascita,
    });

    const input: AgentProposalInput =
      matches.length > 0
        ? { mode: 'existing', patientId: matches[0].id, reason: 'match nome+data di nascita', patient, clinical: {} }
        : { mode: 'new', reason: 'nessun paziente esistente corrispondente', patient, clinical: {} };

    toolTrace.push('submit_proposal');
    void request;
    return { model: this.model, input, toolTrace };
  }
}
