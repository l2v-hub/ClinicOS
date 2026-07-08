// Patient imported-documents API (REQ-035 v2). Mounted at /patients.
// Files are served by the authenticated backend (never public URLs); ownership is verified.

import { Router } from 'express';
import multer from 'multer';
import { listPatientDocuments, getPatientDocumentContent, createPatientDocument } from '../ai/upload/patient-documents.js';

const router = Router();

// #246: photo/scan attachments for exams/RX/consultations. In-memory (bytes go to Postgres base64).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
]);
const ALLOWED_DOC_TYPES = new Set(['esame', 'rx', 'consulenza', 'allegato']);

// POST /patients/:patientId/documents — attach a photo/scan to an existing patient chart.
router.post('/:patientId/documents', upload.single('file'), async (req, res) => {
  try {
    const file = (req as unknown as { file?: { originalname: string; mimetype: string; buffer: Buffer } }).file;
    if (!file) { res.status(400).json({ error: 'File mancante' }); return; }
    if (!ALLOWED_MIME.has(file.mimetype)) { res.status(415).json({ error: 'Tipo file non supportato (solo immagini o PDF)' }); return; }
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
router.get('/:patientId/documents', async (req, res) => {
  try {
    const documents = await listPatientDocuments(String(req.params.patientId));
    res.status(200).json({ documents, total: documents.length });
  } catch {
    res.status(500).json({ error: 'Errore nel recupero dei documenti' });
  }
});

// GET /patients/:patientId/documents/:documentId/content — the file bytes (ownership-checked).
router.get('/:patientId/documents/:documentId/content', async (req, res) => {
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
