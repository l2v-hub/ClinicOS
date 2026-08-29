import type { NextFunction, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthedRequest } from '../ai/auth.js';
import { patientIsInOperatorScope } from './patient-scope.js';

/** Hide both missing and out-of-scope patients behind the same response. */
export function requirePatientScope(req: AuthedRequest, res: Response, next: NextFunction): void {
  const operator = req.operator;
  if (!operator) {
    res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
    return;
  }
  const rawPatientId = req.params.patientId ?? req.params.id;
  const patientId = (Array.isArray(rawPatientId) ? rawPatientId[0] : rawPatientId) ?? '';
  patientIsInOperatorScope(patientId, operator, prisma)
    .then((allowed) => {
      if (!allowed) {
        res.status(404).json({ error: 'Paziente non trovato', code: 'patient_not_found' });
        return;
      }
      next();
    })
    .catch(() => {
      res
        .status(503)
        .json({ error: 'Verifica accesso non disponibile', code: 'scope_unavailable' });
    });
}
