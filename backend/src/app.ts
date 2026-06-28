
import cors from 'cors';
import express from 'express';
import { adminRouter as adminRoomsRouter, patientAssignmentRouter } from './routes/admin-rooms.js';
import patientTherapiesRouter from './routes/patient-therapies.js';
import patientsRouter from './routes/patients.js';
import therapyRouter from './routes/therapy.js';
import patientIntakeRouter from './routes/patient-intake.js';
import patientDiaryRouter from './routes/patient-diary.js';
import narrativeSectionsRouter from './routes/narrative-sections.js';
import patientDocumentsRouter from './routes/patient-documents.js';
import consegneRouter from './routes/consegne.js';
import noteRouter from './routes/note.js';
import aiExtractionRouter from './routes/ai-extraction.js';
import aiJobsRouter from './routes/ai-jobs.js';
import intakeDraftsRouter from './routes/intake-drafts.js';
import internalAiRouter from './routes/internal-ai.js';
import assistantPublicRouter from './routes/ai-assistant-public.js';
import voiceRouter from './routes/ai-voice.js';

const app = express();

// ── CORS configuration ─────────────────────────────────────────────────────
//
// Allowed origins:
//  1. Localhost variants for local development
//  2. FRONTEND_URL env var (single URL)
//  3. FRONTEND_URLS env var (comma-separated list)
//  4. Any *.vercel.app URL containing 'clinicos' (prototype/preview support)
//
// In Railway, set:
//   FRONTEND_URL=https://clinicos-eosin.vercel.app
//   FRONTEND_URLS=https://clinicos-eosin.vercel.app,https://clinicos-el91lyszt-lucalavia-2482s-projects.vercel.app

const staticAllowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

const envAllowed: string[] = [];

if (process.env.FRONTEND_URL) {
  envAllowed.push(process.env.FRONTEND_URL.trim());
}
if (process.env.FRONTEND_URLS) {
  process.env.FRONTEND_URLS.split(',')
    .map(u => u.trim())
    .filter(Boolean)
    .forEach(u => envAllowed.push(u));
}

const allowedOrigins = Array.from(new Set([...staticAllowed, ...envAllowed]));

console.log('CORS allowed origins:', allowedOrigins);

function isAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Allow any Vercel preview/production URL for this project
  if (origin.endsWith('.vercel.app') && origin.includes('clinicos')) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (isAllowed(origin)) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/admin', adminRoomsRouter);
app.use('/patients', patientAssignmentRouter);
app.use('/patients', patientTherapiesRouter);
app.use('/patients', patientDiaryRouter);
app.use('/patients', narrativeSectionsRouter);
app.use('/patients', patientDocumentsRouter);
app.use('/patients', patientsRouter);
app.use('/therapy-slots', therapyRouter);
app.use('/patient-intake', patientIntakeRouter);
app.use('/consegne', consegneRouter);
app.use('/notes', noteRouter);
app.use('/intake/drafts', intakeDraftsRouter);
app.use('/ai/extraction/jobs', aiJobsRouter);
app.use('/ai/extraction', aiExtractionRouter);
// REQ-040: public operator-facing assistant (operator-auth; runs the gateway in-process, no token).
app.use('/ai/assistant', assistantPublicRouter);
// REQ-041: operator-facing voice write-actions (transcript-only; audio stays client-side).
app.use('/ai/voice', voiceRouter);
// REQ-039: internal AI Data Gateway (service-token gated; the model's only data path).
app.use('/internal/ai', internalAiRouter);

export default app;
