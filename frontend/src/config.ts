// Backend API base URL.
//
// Resolution order:
//   1. VITE_API_URL (set in Vercel project env) — used when non-empty.
//   2. Fallback: in a production build, the real Railway backend; in dev, localhost.
//
// The fallback exists because `??` only catches null/undefined, not an empty
// string. If VITE_API_URL is ever blank in a prod build, API_URL must NOT become
// '' — that would turn every request into a relative URL that hits the SPA host
// and silently returns no data. So prod always falls back to the real backend.
const PROD_BACKEND_URL = 'https://clinicos-backend-production-df88.up.railway.app';

const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const fallback = import.meta.env.PROD ? PROD_BACKEND_URL : 'http://localhost:3001';

export const API_URL = (raw ? raw : fallback).replace(/\/$/, '');
