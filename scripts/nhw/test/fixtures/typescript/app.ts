import express from 'express';
import patientsRouter, { secondaryRouter as aliasedSecondaryRouter } from './routes/patients.js';

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/patients', patientsRouter);
app.use('/patients', aliasedSecondaryRouter);

export default app;
