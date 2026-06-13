// Deterministic mock provider for CI and local dev (REQ-013 / REQ-020).
// Never calls a network. Echoes an empty-but-valid-shaped result so the rest of
// the pipeline can be exercised without a real key or clinical data.

import { EXTRACTION_PROMPT_VERSION, EXTRACTION_SCHEMA_VERSION } from '../version.js';
import type {
  AiExtractionProvider,
  ExtractionRequest,
  ExtractionResult,
  ProviderCapabilities,
} from '../types.js';

export class MockExtractionProvider implements AiExtractionProvider {
  readonly name = 'mock';
  readonly model: string;

  constructor(model = 'mock-extractor') {
    this.model = model;
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return { images: true, documents: true, structuredOutput: true };
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    // Schema-valid, empty instance: no data is invented (REQ-015 acceptance).
    const data = {
      anagrafica: { nome: '', cognome: '', dataNascita: '', sesso: '' },
      cartella: {
        statoRicovero: '',
        codiceFiscale: '',
        anamnesi: {},
        diagnosi: [],
        allergie: [],
        farmaci: [],
        terapie: [],
        parametriVitali: [],
        diarioMedico: [],
        indicatoriRischio: [],
        noteClinica: [],
        pianoCura: {},
        presaInCarico: {},
      },
    };
    return {
      jobId: request.jobId,
      model: this.model,
      schemaVersion: EXTRACTION_SCHEMA_VERSION,
      promptVersion: EXTRACTION_PROMPT_VERSION,
      data,
      warnings: [
        { code: 'mock_provider', message: 'Provider mock attivo: estrazione vuota, nessun dato inventato.' },
      ],
      valid: true,
    };
  }
}
