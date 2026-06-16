// Patient imported-documents API (REQ-035 v2). Mounted at /patients.
// Files are served by the authenticated backend (never public URLs); ownership is verified.

import { Router } from 'express';
import { listPatientDocuments, getPatientDocumentContent } from '../ai/upload/patient-documents.js';

const router = Router();

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
