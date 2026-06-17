// REQ-039: internal AI Data Gateway endpoints. Provider/model-neutral. Reachable ONLY with the
// runtime service token AND a user context. There is deliberately NO generic SQL/query endpoint.

import { Router, type Request, type Response } from 'express';
import { checkServiceToken, parseUserContext } from '../ai/gateway/context.js';
import { GatewayError } from '../ai/gateway/types.js';
import * as svc from '../ai/gateway/services.js';
import { assistantQuery } from '../ai/assistant/service.js';

const internalAiRouter = Router();

// Gate 1: service token (the frontend never calls these). Gate 2: a parsed user context.
internalAiRouter.use((req: Request, res: Response, next) => {
  if (!checkServiceToken(req.header('authorization'))) {
    return res.status(401).json({ error: 'Service token required' });
  }
  next();
});

function ctxOf(req: Request) {
  return parseUserContext(req.headers as Record<string, string | undefined>);
}

function fail(res: Response, err: unknown) {
  if (err instanceof GatewayError) {
    const map: Record<string, number> = {
      unauthorized: 401, forbidden: 403, tenant_isolation: 403, cross_patient_disabled: 403,
      not_found: 404, bad_request: 400,
    };
    return res.status(map[err.kind] ?? 400).json({ error: err.message, kind: err.kind });
  }
  console.error('[internal-ai] error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Errore gateway' });
}

const handle = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { return res.status(200).json(await fn(req)); } catch (err) { return fail(res, err); }
};

// ── Search ──
internalAiRouter.post('/search/patients', handle((req) => svc.searchPatients(req.body ?? {}, ctxOf(req))));
internalAiRouter.post('/search/clinical-sections', handle((req) => svc.searchClinicalSections(req.body ?? {}, ctxOf(req))));
internalAiRouter.post('/search/documents', handle((req) => svc.searchDocuments(req.body ?? {}, ctxOf(req))));
internalAiRouter.post('/search/across-patients', handle((req) => svc.searchAcrossPatients(req.body ?? {}, ctxOf(req))));

// ── Query ──
internalAiRouter.post('/query/vital-signs', handle((req) => svc.getPatientVitalSigns(req.body ?? {}, ctxOf(req))));
internalAiRouter.post('/query/appointments', handle((req) => svc.getPatientAppointments(String(req.body?.patientId ?? ''), ctxOf(req), { from: req.body?.from, to: req.body?.to })));
internalAiRouter.post('/query/timeline', handle((req) => svc.getPatientTimeline(String(req.body?.patientId ?? ''), ctxOf(req))));
internalAiRouter.post('/query/correlate', handle((req) => svc.correlate(req.body ?? {}, ctxOf(req))));

// ── Per-patient getters ──
internalAiRouter.post('/patient/demographics', handle((req) => svc.getPatientDemographics(String(req.body?.patientId ?? ''), ctxOf(req))));
internalAiRouter.post('/patient/allergies', handle((req) => svc.getPatientAllergies(String(req.body?.patientId ?? ''), ctxOf(req))));
internalAiRouter.post('/patient/narrative-sections', handle((req) => svc.getPatientNarrativeSectionsG(String(req.body?.patientId ?? ''), ctxOf(req))));
internalAiRouter.post('/patient/therapies', handle((req) => svc.getPatientTherapies(String(req.body?.patientId ?? ''), ctxOf(req))));
internalAiRouter.post('/patient/diary', handle((req) => svc.getPatientDiary(String(req.body?.patientId ?? ''), ctxOf(req), { authorType: req.body?.authorType, from: req.body?.from, to: req.body?.to })));
internalAiRouter.post('/patient/documents', handle((req) => svc.getPatientDocumentsG(String(req.body?.patientId ?? ''), ctxOf(req))));

// ── Assistant (REQ-040): SOURCE_ONLY orchestration over the gateway ──
internalAiRouter.post('/assistant/query', handle((req) =>
  assistantQuery(String(req.body?.question ?? ''), ctxOf(req), { currentPatientId: req.body?.currentPatientId })));

// ── Source resolution ──
internalAiRouter.get('/sources/:sourceType/:recordId', handle(async (req) => {
  const ctx = ctxOf(req);
  const sourceType = String(req.params.sourceType);
  const recordId = String(req.params.recordId);
  // Resolve a stored record back to its verifiable text. Narrative + documents are the resolvable
  // sources; others are already self-describing in the result that produced them.
  if (sourceType === 'NARRATIVE_SECTION') {
    const row = await svc.resolveNarrativeSource(recordId, ctx);
    if (!row) throw new GatewayError('not_found', 'Source not found');
    return row;
  }
  throw new GatewayError('bad_request', 'Unsupported sourceType');
}));

export default internalAiRouter;
