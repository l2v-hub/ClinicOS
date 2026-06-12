// Use the configured backend URL. Guard against an empty/whitespace VITE_API_URL
// (?? only catches null/undefined): an empty value must NOT collapse to a relative
// URL, which would make API calls hit the SPA host and silently return no data.
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_URL = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : 'http://localhost:3001';
