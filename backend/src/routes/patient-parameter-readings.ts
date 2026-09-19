import { Router } from 'express';
import type { AuthedRequest } from '../ai/auth.js';
import { createParameterReading, listParameterReadings } from '../patients/parameter-readings.js';
import { ParameterReadingError } from '../patients/parameter-reading-input.js';

// Mounted after patients.requireOperator/private no-store. Service repeats patient scope checks.
export const parameterReadingsRouter = Router();
function failure(res: import('express').Response, error: unknown) {
  if (error instanceof ParameterReadingError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error('[parameter-readings] request failed');
  res
    .status(500)
    .json({ error: 'Non è possibile verificare la rilevazione. Riprova la stessa richiesta.' });
}
parameterReadingsRouter.get('/:id/parameter-readings', async (req, res) => {
  try {
    res
      .status(200)
      .json(
        await listParameterReadings(
          req.params.id,
          req.query as Record<string, unknown>,
          (req as AuthedRequest).operator!,
        ),
      );
  } catch (error) {
    failure(res, error);
  }
});
parameterReadingsRouter.post('/:id/parameter-readings', async (req, res) => {
  try {
    const result = await createParameterReading(
      req.params.id,
      req.body,
      (req as AuthedRequest).operator!,
    );
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) {
    failure(res, error);
  }
});
