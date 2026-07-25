import { Router } from 'express';

export const fakeTestRouter = Router();
fakeTestRouter.get('/fake-test-endpoint', (_req, res) => {
  res.status(418).json({ test: true });
});
