// Patient imported-documents API (REQ-035 v2). Mounted at /patients.
// Files are served by the authenticated backend (never public URLs); ownership is verified.
//
// #246 remediation: these routes carry clinical document bytes (photos/RX/consult scans) and
// were previously reachable by anyone who knew/guessed a patientId/documentId — gated behind the
// same operator role-gate already used by the AI import/actions routes (backend/src/ai/auth.ts).

import { Router } from 'express';
import multer from 'multer';
import { requireOperator } from '../ai/auth.js';
import { listPatientDocuments, getPatientDocumentContent, createPatientDocument } from '../ai/upload/patient-documents.js';

const router = Router();
// #246 FIX: NON usare router.use(requireOperator). Questo router è montato su '/patients'
// (app.ts) PRIMA del patientsRouter, quindi un middleware a livello di router intercetterebbe
// l'INTERO namespace /patients — incluso il pubblico GET /patients (lista) → 401, app vuota.
// L'auth va applicata SOLO alle 3 route documenti, come middleware per-route.

// #246: photo/scan attachments for exams/RX/consultations. In-memory (bytes go to Postgres base64).
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
]);
const ALLOWED_DOC_TYPES = new Set(['esame', 'rx', 'consulenza', 'allegato']);

// HEIC/HEIF share the ISOBMFF ('ftyp') container; either family may be declared for either brand.
const MIME_FAMILY: Record<string, string> = { 'image/heif': 'image/heic' };
function mimeFamily(m: string): string { return MIME_FAMILY[m] ?? m; }

/**
 * #246 remediation: verify the actual file BYTES match a known signature — never trust the
 * client-declared multipart Content-Type alone (a renamed/relabeled file would otherwise pass).
 * Returns the sniffed canonical mime type, or null if no supported signature is recognised.
 */
export function sniffAllowedMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === '%PDF') return 'application/pdf';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12).toLowerCase();
    if (brand.startsWith('heic') || brand === 'heix' || brand === 'hevc' || brand === 'hevx') return 'image/heic';
    if (brand.startsWith('mif1') || brand.startsWith('msf1') || brand === 'heif') return 'image/heif';
  }
  return null;
}

// POST /patients/:patientId/documents — attach a photo/scan to an existing patient chart.
router.post('/:patientId/documents', requireOperator, upload.single('file'), async (req, res) => {
  try {
    const file = (req as unknown as { file?: { originalname: string; mimetype: string; buffer: Buffer } }).file;
    if (!file) { res.status(400).json({ error: 'File mancante' }); return; }
    if (!ALLOWED_MIME.has(file.mimetype)) { res.status(415).json({ error: 'Tipo file non supportato (solo immagini o PDF)' }); return; }
    const sniffed = sniffAllowedMime(file.buffer);
    if (!sniffed || mimeFamily(sniffed) !== mimeFamily(file.mimetype)) {
      res.status(415).json({ error: 'Il contenuto del file non corrisponde al tipo dichiarato' }); return;
    }
    const raw = typeof req.body?.documentType === 'string' ? req.body.documentType.trim() : '';
    const documentType = ALLOWED_DOC_TYPES.has(raw) ? raw : 'allegato';
    const document = await createPatientDocument(String(req.params.patientId), file, documentType);
    res.status(201).json({ document });
  } catch (err) {
    if (err instanceof Error && err.message === 'patient_not_found') {
      res.status(404).json({ error: 'Paziente non trovato' }); return;
    }
    res.status(500).json({ error: 'Errore nel salvataggio del documento' });
  }
});

// GET /patients/:patientId/documents — metadata of the patient's imported documents.
router.get('/:patientId/documents', requireOperator, async (req, res) => {
  try {
    const documents = await listPatientDocuments(String(req.params.patientId));
    res.status(200).json({ documents, total: documents.length });
  } catch {
    res.status(500).json({ error: 'Errore nel recupero dei documenti' });
  }
});

// GET /patients/:patientId/documents/:documentId/content — the file bytes (ownership-checked).
router.get('/:patientId/documents/:documentId/content', requireOperator, async (req, res) => {
  try {
    const doc = await getPatientDocumentContent(String(req.params.patientId), String(req.params.documentId));
    if (!doc) { res.status(404).json({ error: 'Documento non trovato' }); return; }
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(doc.buffer);
  } catch {
    res.status(500).json({ error: 'Errore nel recupero del documento' });
  }
});

export default router;
