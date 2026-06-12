
import cors from 'cors';
import express from 'express';
import { adminRouter as adminRoomsRouter, patientAssignmentRouter } from './routes/admin-rooms.js';
import patientTherapiesRouter from './routes/patient-therapies.js';
import patientsRouter from './routes/patients.js';
import therapyRouter from './routes/therapy.js';
import patientIntakeRouter from './routes/patient-intake.js';
import patientDiaryRouter from './routes/patient-diary.js';
import consegneRouter from './routes/consegne.js';

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
app.use('/patients', patientsRouter);
app.use('/therapy-slots', therapyRouter);
app.use('/patient-intake', patientIntakeRouter);
app.use('/consegne', consegneRouter);

export default app;
