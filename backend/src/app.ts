
import cors from 'cors';
import express from 'express';
import patientsRouter from './routes/patients.js';

const app = express();

// Build allowed origins list from env
const allowedOrigins: string[] = ['http://localhost:5173'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.FRONTEND_URLS) {
  process.env.FRONTEND_URLS.split(',').map(u => u.trim()).filter(Boolean).forEach(u => {
    if (!allowedOrigins.includes(u)) allowedOrigins.push(u);
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}))

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/patients', patientsRouter);

export default app;
