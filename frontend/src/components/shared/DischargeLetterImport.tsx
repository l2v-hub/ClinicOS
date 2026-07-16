import { useState, useRef, useCallback, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { API_URL } from '../../config';
import type { NuovoPaziente } from '../../types';

// ── Types ────────────────────────────────────────────────────────────────────────

interface ExtractedField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractedData {
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

type ImportStep = 'upload' | 'processing' | 'review' | 'applied';

interface Props {
  onApply: (data: Partial<NuovoPaziente>) => void;
  onClose: () => void;
  operatoreNome?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mapToPatient(data: ExtractedData): Partial<NuovoPaziente> {
  const p: Partial<NuovoPaziente> = {};
  if (data.firstName?.value) p.firstName = data.firstName.value;
  if (data.lastName?.value) p.lastName = data.lastName.value;
  if (data.dateOfBirth?.value) p.dateOfBirth = data.dateOfBirth.value;
  if (data.sex?.value) p.sex = data.sex.value;
  if (data.codiceFiscale?.value) p.codiceFiscale = data.codiceFiscale.value.toUpperCase();
  if (data.provenienza?.value) p.centroInviante = data.provenienza.value;
  if (data.diagnosiIngresso?.value) p.motivoIngresso = data.diagnosiIngresso.value;
  if (data.patologiePregresse?.value) p.condizioniIniziali = data.patologiePregresse.value;
  if (data.allergie?.value) p.allergie = data.allergie.value;
  if (data.terapia?.value) p.farmaci = data.terapia.value;
  if (data.noteClinica?.value) p.notaClinicaIniziale = data.noteClinica.value;
  p.provenienza = 'ospedale';
  return p;
}

// ── Field definitions for review ─────────────────────────────────────────────────

const FIELD_DEFS: { key: keyof ExtractedData; label: string; textarea?: boolean }[] = [
  { key: 'lastName', label: 'Cognome' },
  { key: 'firstName', label: 'Nome' },
  { key: 'dateOfBirth', label: 'Data di nascita' },
  { key: 'sex', label: 'Sesso' },
  { key: 'codiceFiscale', label: 'Codice fiscale' },
  { key: 'provenienza', label: 'Struttura di provenienza' },
  { key: 'dataDimissione', label: 'Data dimissione' },
  { key: 'diagnosiIngresso', label: 'Diagnosi di ingresso', textarea: true },
  { key: 'patologiePregresse', label: 'Patologie pregresse', textarea: true },
  { key: 'allergie', label: 'Allergie', textarea: true },
  { key: 'terapia', label: 'Terapia in corso', textarea: true },
  { key: 'noteClinica', label: 'Note cliniche', textarea: true },
];

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Trovato',
  medium: 'Da verificare',
  low: 'Incerto',
};

const STEP_LABELS: { key: ImportStep; num: number; label: string }[] = [
  { key: 'upload', num: 1, label: 'Caricamento' },
  { key: 'processing', num: 2, label: 'Elaborazione' },
  { key: 'review', num: 3, label: 'Revisione' },
];

const STEP_ORDER: ImportStep[] = ['upload', 'processing', 'review', 'applied'];

// ── Component ────────────────────────────────────────────────────────────────────

export function DischargeLetterImport({ onApply, onClose, operatoreNome }: Props) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData>({});
  const [showOcr, setShowOcr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-close on applied
  useEffect(() => {
    if (step !== 'applied') return;
    const t = setTimeout(onClose, 1000);
    return () => clearTimeout(t);
  }, [step, onClose]);

  // File selection
  function handleFile(f: File) {
    setFile(f);
    setError(null);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
    e.target.value = '';
  }

  // OCR processing
  const processImage = useCallback(async (srcFile: File) => {
    setStep('processing');
    setProgress(0);
    setError(null);

    try {
      // Upload to backend
      const base64 = await fileToBase64(srcFile);
      const uploadRes = await fetch(`${API_URL}/patient-intake/discharge-letter/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: srcFile.name,
          fileType: srcFile.type,
          fileData: base64,
          operatoreNome: operatoreNome || '',
        }),
      });

      let docId = '';
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        docId = uploadData.documentId;
      }
      setProgress(10);

      // OCR with tesseract.js
      const worker = await createWorker('ita', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(10 + Math.round((m.progress || 0) * 70));
          }
        },
      });

      const { data: { text } } = await worker.recognize(srcFile);
      await worker.terminate();
      setOcrText(text);
      setProgress(85);

      // Send OCR text to backend for extraction
      if (docId) {
        const extractRes = await fetch(`${API_URL}/patient-intake/discharge-letter/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId, ocrText: text }),
        });

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          setExtracted(extractData.extractedData);
        }
      }

      setProgress(100);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante elaborazione');
      setStep('upload');
    }
  }, [operatoreNome]);

  // Review field update
  function updateField(key: keyof ExtractedData, value: string) {
    setExtracted(prev => ({
      ...prev,
      [key]: { value, confidence: prev[key]?.confidence || 'low' } as ExtractedField,
    }));
  }

  // Apply
  function handleApply() {
    onApply(mapToPatient(extracted));
    setStep('applied');
  }

  // Step index for indicator
  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="dli-overlay" onClick={onClose}>
      <div className="dli-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="dli-header">
          <div>
            <h3>Importa lettera di dimissioni</h3>
            <div className="dli-header__sub">Estrai automaticamente i dati dal documento</div>
          </div>
          <button className="dli-close" onClick={onClose} aria-label="Chiudi">&times;</button>
        </div>

        {/* Step indicator */}
        {step !== 'applied' && (
          <div className="dli-steps">
            {STEP_LABELS.map(s => {
              const sIdx = STEP_ORDER.indexOf(s.key);
              const cls = sIdx < stepIdx ? 'done' : sIdx === stepIdx ? 'active' : '';
              return (
                <div key={s.key} className={`dli-step ${cls}`}>
                  <span className="dli-step__num">
                    {sIdx < stepIdx ? '\u2713' : s.num}
                  </span>
                  {s.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="dli-body">

          {error && <div className="dli-error">{error}</div>}

          {/* Upload step */}
          {step === 'upload' && (
            <>
              <div className="dli-upload-btns">
                <button type="button" className="dli-upload-btn" onClick={() => cameraInputRef.current?.click()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Scatta foto
                </button>
                <button type="button" className="dli-upload-btn" onClick={() => fileInputRef.current?.click()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Carica file
                </button>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={onInputChange} />
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }} onChange={onInputChange} />

              {file && (
                <div className="dli-preview">
                  {preview ? (
                    <img src={preview} alt="Anteprima documento" />
                  ) : (
                    <div className="dli-preview__name">{file.name}</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Processing step */}
          {step === 'processing' && (
            <div className="dli-progress">
              <div className="dli-progress__pct">{progress}%</div>
              <div className="dli-progress__bar">
                <div className="dli-progress__fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="dli-progress__text">
                {progress < 80 ? 'Riconoscimento testo in corso...' : 'Estrazione dati...'}
              </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <>
              <div className="dli-review-grid">
                {FIELD_DEFS.map(fd => {
                  const field = extracted[fd.key];
                  const conf = field?.confidence || 'none';
                  return (
                    <div key={fd.key} className="dli-field">
                      <span className={`dli-field__indicator dli-field__indicator--${conf}`} />
                      <div className="dli-field__content">
                        <div className="dli-field__label">
                          {fd.label}
                          <span className={`dli-field__confidence dli-field__confidence--${conf}`}>
                            {conf === 'none' ? 'Non trovato' : CONFIDENCE_LABELS[conf]}
                          </span>
                        </div>
                        {field?.value != null ? (
                          fd.textarea ? (
                            <textarea
                              className="dli-field__input dli-field__input--textarea"
                              value={field.value}
                              onChange={e => updateField(fd.key, e.target.value)}
                            />
                          ) : (
                            <input
                              className="dli-field__input"
                              value={field.value}
                              onChange={e => updateField(fd.key, e.target.value)}
                            />
                          )
                        ) : (
                          <div className="dli-field__empty">Nessun dato estratto</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="dli-ocr-toggle"
                onClick={() => setShowOcr(v => !v)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points={showOcr ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                </svg>
                Testo OCR originale
              </button>
              {showOcr && <div className="dli-ocr-text">{ocrText || 'Nessun testo riconosciuto'}</div>}
            </>
          )}

          {/* Applied step */}
          {step === 'applied' && (
            <div className="dli-progress" style={{ padding: '40px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16A37B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div className="dli-progress__text" style={{ marginTop: 12, fontWeight: 600, color: '#16A37B' }}>
                Dati applicati ai campi del paziente
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'upload' && (
          <div className="dli-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Annulla</button>
            <button
              type="button"
              className="btn-primary"
              disabled={!file}
              onClick={() => file && processImage(file)}
            >
              Avvia estrazione
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="dli-footer">
            <button type="button" className="btn-secondary" onClick={() => setStep('upload')}>Indietro</button>
            <button type="button" className="btn-primary" onClick={handleApply}>
              Applica ai campi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
