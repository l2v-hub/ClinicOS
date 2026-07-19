import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

const router = Router();

// ── POST /patient-intake/discharge-letter/upload ──
// Receives base64 file, stores document
router.post('/discharge-letter/upload', async (req, res) => {
  const { fileName, fileType, fileData, operatoreNome } = req.body as {
    fileName: string;
    fileType: string;
    fileData: string; // base64
    operatoreNome?: string;
  };

  if (!fileName || !fileType || !fileData) {
    res.status(400).json({ error: 'fileName, fileType e fileData sono obbligatori' });
    return;
  }

  try {
    const doc = await prisma.patientIntakeDocument.create({
      data: {
        fileName,
        fileType,
        fileData,
        operatoreNome: operatoreNome || null,
        status: 'uploaded',
      },
    });

    res.status(201).json({ documentId: doc.id, status: doc.status });
  } catch (error) {
    console.error('POST /patient-intake/discharge-letter/upload error:', error);
    res.status(500).json({ error: 'Errore durante il caricamento del documento' });
  }
});

// ── POST /patient-intake/discharge-letter/extract ──
// Receives documentId + ocrText, parses text into structured data, stores both
router.post('/discharge-letter/extract', async (req, res) => {
  const { documentId, ocrText } = req.body as {
    documentId: string;
    ocrText: string;
  };

  if (!documentId || !ocrText) {
    res.status(400).json({ error: 'documentId e ocrText sono obbligatori' });
    return;
  }

  try {
    const doc = await prisma.patientIntakeDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      res.status(404).json({ error: 'Documento non trovato' });
      return;
    }

    // Extract structured data from Italian discharge letter text
    const extractedData = extractDischargeLetterData(ocrText);

    await prisma.patientIntakeDocument.update({
      where: { id: documentId },
      data: {
        ocrText,
        extractedData: extractedData as object,
        status: 'extracted',
      },
    });

    res.status(200).json({ documentId, extractedData, status: 'extracted' });
  } catch (error) {
    console.error('POST /patient-intake/discharge-letter/extract error:', error);
    res.status(500).json({ error: "Errore durante l'estrazione dei dati" });
  }
});

// ── POST /patient-intake/discharge-letter/apply ──
// Links document to a patient after creation
router.post('/discharge-letter/apply', async (req, res) => {
  const { documentId, patientId } = req.body as {
    documentId: string;
    patientId: string;
  };

  if (!documentId || !patientId) {
    res.status(400).json({ error: 'documentId e patientId sono obbligatori' });
    return;
  }

  try {
    const doc = await prisma.patientIntakeDocument.update({
      where: { id: documentId },
      data: {
        patientId,
        status: 'applied',
      },
    });

    res.status(200).json({ documentId: doc.id, patientId, status: 'applied' });
  } catch (error) {
    console.error('POST /patient-intake/discharge-letter/apply error:', error);
    res.status(500).json({ error: 'Errore durante il collegamento del documento' });
  }
});

// ── GET /patient-intake/documents/:patientId ──
// Get all intake documents for a patient
router.get('/documents/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    const docs = await prisma.patientIntakeDocument.findMany({
      where: { patientId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        ocrText: true,
        extractedData: true,
        status: true,
        operatoreNome: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(docs);
  } catch (error) {
    console.error('GET /patient-intake/documents/:patientId error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei documenti' });
  }
});

// ── Text extraction logic ──────────────────────────────────────────────────────

interface ExtractedField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractedDischargeData {
  firstName?: ExtractedField;
  lastName?: ExtractedField;
  dateOfBirth?: ExtractedField;
  sex?: ExtractedField;
  codiceFiscale?: ExtractedField;
  provenienza?: ExtractedField;
  dataDimissione?: ExtractedField;
  diagnosiIngresso?: ExtractedField;
  patologiePregresse?: ExtractedField;
  allergie?: ExtractedField;
  terapia?: ExtractedField;
  noteClinica?: ExtractedField;
}

function extractDischargeLetterData(text: string): ExtractedDischargeData {
  const result: ExtractedDischargeData = {};
  const t = text.replace(/\r\n/g, '\n');

  // ── Codice Fiscale (16 chars alphanumeric pattern) ──
  const cfMatch = t.match(/\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/i);
  if (cfMatch) {
    result.codiceFiscale = { value: cfMatch[1].toUpperCase(), confidence: 'high' };

    // Extract sex from CF (odd position 10 = month+40 for females)
    const dayPart = parseInt(cfMatch[1].substring(9, 11), 10);
    if (dayPart > 40) {
      result.sex = { value: 'F', confidence: 'high' };
    } else {
      result.sex = { value: 'M', confidence: 'high' };
    }
  }

  // ── Name patterns ──
  // "Paziente: Cognome Nome" or "Nome e Cognome:" or "Sig./Sig.ra Nome Cognome"
  const namePatterns = [
    /(?:paziente|pz|nome\s*e?\s*cognome|cognome\s*e?\s*nome|sig\.?\s*(?:ra)?)\s*[:\-]?\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+)\s+([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+)/i,
    /(?:cognome)\s*[:\-]?\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+)\s*(?:\n|,)\s*(?:nome)\s*[:\-]?\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+)/i,
  ];
  for (const pat of namePatterns) {
    const m = t.match(pat);
    if (m) {
      // First pattern: "Paziente: Cognome Nome" — first word is surname
      if (pat.source.startsWith('(?:cognome)')) {
        result.lastName = { value: m[1], confidence: 'medium' };
        result.firstName = { value: m[2], confidence: 'medium' };
      } else {
        result.lastName = { value: m[1], confidence: 'medium' };
        result.firstName = { value: m[2], confidence: 'medium' };
      }
      break;
    }
  }

  // ── Date of birth ──
  const dobPatterns = [
    /(?:nat[oa]\s+il|data\s+(?:di\s+)?nascita|d\.?n\.?)\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(?:nat[oa]\s+il|data\s+(?:di\s+)?nascita)\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
  ];
  for (const pat of dobPatterns) {
    const m = t.match(pat);
    if (m) {
      result.dateOfBirth = { value: normalizeDate(m[1]), confidence: 'medium' };
      break;
    }
  }

  // ── Date of discharge ──
  const ddPatterns = [
    /(?:data\s+(?:di\s+)?dimissione|dimess[oa]\s+il|data\s+dimissione)\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
  ];
  for (const pat of ddPatterns) {
    const m = t.match(pat);
    if (m) {
      result.dataDimissione = { value: normalizeDate(m[1]), confidence: 'medium' };
      break;
    }
  }

  // ── Provenienza ──
  const provPatterns = [
    /(?:provenien(?:za|te)|reparto|u\.?o\.?|unit\u00E0\s+operativa|struttura)\s*[:\-]?\s*([^\n]{3,60})/i,
  ];
  for (const pat of provPatterns) {
    const m = t.match(pat);
    if (m) {
      result.provenienza = { value: m[1].trim(), confidence: 'medium' };
      break;
    }
  }

  // ── Diagnosi ──
  const diagPatterns = [
    /(?:diagnosi(?:\s+di\s+(?:dimissione|ingresso|uscita))?|motivo\s+(?:del\s+)?ricovero)\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
  ];
  for (const pat of diagPatterns) {
    const m = t.match(pat);
    if (m) {
      result.diagnosiIngresso = { value: m[1].trim().slice(0, 500), confidence: 'medium' };
      break;
    }
  }

  // ── Patologie pregresse ──
  const patPatterns = [
    /(?:patologi[ae]\s+pregress[ae]|anamnesi\s+patologica|comorbidit\u00E0|comorbilita)\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
  ];
  for (const pat of patPatterns) {
    const m = t.match(pat);
    if (m) {
      result.patologiePregresse = { value: m[1].trim().slice(0, 500), confidence: 'medium' };
      break;
    }
  }

  // ── Allergie ──
  const allPatterns = [
    /(?:allergi[ae]|intolleran(?:za|ze))\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
  ];
  for (const pat of allPatterns) {
    const m = t.match(pat);
    if (m) {
      const val = m[1].trim();
      if (!/nessuna|negat|n\.?\s*d|non\s+note|assent/i.test(val)) {
        result.allergie = { value: val.slice(0, 300), confidence: 'medium' };
      }
      break;
    }
  }

  // ── Terapia ──
  const terapiaPatterns = [
    /(?:terapia(?:\s+(?:alla?\s+)?dimissione|\s+consigliata|\s+domiciliare|\s+farmacologica)?)\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z]{2})[^\n]+)*)/i,
  ];
  for (const pat of terapiaPatterns) {
    const m = t.match(pat);
    if (m) {
      result.terapia = { value: m[1].trim().slice(0, 1000), confidence: 'low' };
      break;
    }
  }

  // ── Note cliniche ──
  const notePatterns = [
    /(?:note\s*(?:cliniche)?|raccomandazioni|indicazioni(?:\s+alla\s+dimissione)?|follow[\s\-]?up)\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z]{2})[^\n]+)*)/i,
  ];
  for (const pat of notePatterns) {
    const m = t.match(pat);
    if (m) {
      result.noteClinica = { value: m[1].trim().slice(0, 500), confidence: 'low' };
      break;
    }
  }

  return result;
}

function normalizeDate(raw: string): string {
  // Try to convert dd/mm/yyyy or dd.mm.yyyy to yyyy-mm-dd
  const m = raw.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  return raw;
}

export default router;
