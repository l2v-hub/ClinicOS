import { useState, useRef, useCallback } from 'react';
import { IcoX } from '../../icons';
import { API_URL } from '../../config';

// REQ-041: voice write-actions. Audio is transcribed CLIENT-SIDE (Web Speech, it-IT) and NEVER leaves
// the browser — only the text transcript is sent. Flow: record → transcribe → /ai/voice/plan →
// preview → operator confirms → /ai/voice/execute. Every write needs explicit confirmation; ambiguous
// commands cannot be confirmed. A typed-transcript fallback covers degraded STT / no-microphone.

type Stage = 'pronto' | 'registrazione' | 'trascrizione' | 'verifica' | 'attesa-conferma'
  | 'esecuzione' | 'completato' | 'errore' | 'permesso-negato';

interface PreviewLine { label: string; value: string }
interface ActionPreview {
  actionType: string; patientId: string | null; patientName?: string; title: string;
  lines: PreviewLine[]; diff?: { current: string; proposed: string; resulting: string };
  ambiguities: string[]; canExecute: boolean; warnings: string[];
}
interface ActionPlan { actionType: string; patientId: string | null; idempotencyKey: string; sourceTranscript: string; refusalReason?: string }
interface PlanResponse { plan: ActionPlan; preview?: ActionPreview; read?: { refusal?: string; notFound?: boolean; results?: unknown[]; sources?: Array<{ label: string; exactText?: string }> } }

interface Props {
  operatorId?: string;
  operatorRole?: string;
  operatorName?: string;
  currentPatientId?: string;
  currentPatientName?: string;
  onExecuted?: () => void;
}

const STAGE_LABEL: Record<Stage, string> = {
  pronto: 'Pronto', registrazione: 'Registrazione…', trascrizione: 'Trascrizione',
  verifica: 'Verifica comando…', 'attesa-conferma': 'In attesa di conferma', esecuzione: 'Esecuzione…',
  completato: 'Completato', errore: 'Errore', 'permesso-negato': 'Microfono non disponibile',
};

// Minimal Web Speech typing (not in lib.dom for all targets).
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null };

function getSpeechRecognition(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceAssistant({ operatorId, operatorRole, operatorName, currentPatientId, currentPatientName, onExecuted }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('pronto');
  const [transcript, setTranscript] = useState('');
  const [resp, setResp] = useState<PlanResponse | null>(null);
  const [message, setMessage] = useState('');
  const recRef = useRef<SR | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (operatorId) h['X-Operator-Id'] = operatorId;
    if (operatorRole) h['X-Operator-Role'] = operatorRole;
    if (operatorName) h['X-Operator-Name'] = operatorName;
    return h;
  }, [operatorId, operatorRole, operatorName]);

  function reset() { setStage('pronto'); setTranscript(''); setResp(null); setMessage(''); }
  function close() { recRef.current?.stop(); reset(); setOpen(false); }

  async function startListening() {
    setResp(null); setMessage('');
    const SRClass = getSpeechRecognition();
    if (!SRClass) { setStage('permesso-negato'); setMessage('Riconoscimento vocale non supportato dal browser. Digita il comando qui sotto.'); return; }
    try {
      // Explicit permission prompt; if denied we surface a clear state (audio never persisted).
      if (navigator.mediaDevices?.getUserMedia) await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStage('permesso-negato'); setMessage('Permesso del microfono negato. Puoi digitare il comando qui sotto.'); return;
    }
    const rec = new SRClass();
    rec.lang = 'it-IT'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ').trim();
      setTranscript(text); setStage('trascrizione');
    };
    rec.onerror = () => { setStage('permesso-negato'); setMessage('Errore di acquisizione audio.'); };
    rec.onend = () => setStage((s) => (s === 'registrazione' ? 'trascrizione' : s));
    recRef.current = rec;
    setStage('registrazione'); setTranscript('');
    rec.start();
  }

  function stopListening() { recRef.current?.stop(); setStage('trascrizione'); }

  async function interpret() {
    const t = transcript.trim();
    if (!t) return;
    setStage('verifica');
    try {
      const res = await fetch(`${API_URL}/ai/voice/plan`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ transcript: t, currentPatientId }),
      });
      const data = await res.json() as PlanResponse & { error?: string };
      if (!res.ok) { setStage('errore'); setMessage(data.error || 'Comando non interpretabile.'); return; }
      setResp(data);
      setStage('attesa-conferma');
    } catch { setStage('errore'); setMessage('Errore di rete.'); }
  }

  async function confirm() {
    if (!resp?.plan || !resp.preview?.canExecute) return;
    setStage('esecuzione');
    try {
      const res = await fetch(`${API_URL}/ai/voice/execute`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          transcript: resp.plan.sourceTranscript,
          patientId: resp.plan.patientId,
          idempotencyKey: resp.plan.idempotencyKey,
          confirmed: true,
        }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string; deduped?: boolean };
      if (!res.ok || !data.ok) { setStage('errore'); setMessage(data.error || 'Operazione non salvata.'); return; }
      setStage('completato');
      setMessage(data.deduped ? 'Operazione già registrata (nessun duplicato).' : (data.message || 'Salvato.'));
      onExecuted?.();
    } catch { setStage('errore'); setMessage('L’operazione non è stata salvata.'); }
  }

  const scopeLabel = currentPatientId ? `Paziente corrente: ${currentPatientName ?? currentPatientId}` : 'Nessun paziente selezionato';
  const preview = resp?.preview;
  const read = resp?.read;

  return (
    <>
      <button type="button" className="voice-fab" onClick={() => setOpen(true)} aria-label="Comandi vocali ClinicOS" title="Comandi vocali">
        <MicIcon />
      </button>

      {open && (
        <>
          <div className="ai-drawer__scrim" onClick={close} />
          <aside className="ai-drawer voice-drawer" role="dialog" aria-label="Comandi vocali ClinicOS">
            <header className="ai-drawer__header">
              <div className="ai-drawer__title"><span className="ai-drawer__icon"><MicIcon /></span><span>Comandi vocali</span></div>
              <button type="button" className="icon-btn" onClick={close} aria-label="Chiudi"><IcoX /></button>
            </header>

            <div className="ai-asst__scope">{scopeLabel}</div>

            <div className="ai-drawer__body voice-body">
              <div className={`voice-state voice-state--${stage}`} aria-live="polite">
                <span className="voice-state__dot" /> {STAGE_LABEL[stage]}
              </div>

              <div className="voice-mic-row">
                {stage === 'registrazione'
                  ? <button type="button" className="btn-primary voice-rec is-recording" onClick={stopListening}>■ Ferma</button>
                  : <button type="button" className="btn-primary voice-rec" onClick={startListening}>● Parla</button>}
              </div>

              <label className="voice-transcript-label" htmlFor="voice-transcript">Trascrizione</label>
              <textarea
                id="voice-transcript" className="voice-transcript" rows={2}
                value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder="Es. «Registra pressione 130 su 80 alle 9:00»"
              />
              <button type="button" className="btn-primary voice-interpret" onClick={interpret} disabled={!transcript.trim() || stage === 'verifica'}>
                Verifica comando
              </button>

              {message && <p className={`voice-msg ${stage === 'errore' || stage === 'permesso-negato' ? 'voice-msg--error' : ''}`}>{message}</p>}

              {read && (
                <div className="voice-read">
                  {read.refusal
                    ? <div className="ai-asst__refusal">{read.refusal}</div>
                    : read.notFound || !(read.results?.length)
                      ? <div className="ai-asst__muted">Informazione non trovata.</div>
                      : <ul className="ai-asst__sources">{read.sources?.slice(0, 8).map((s, i) =>
                          <li key={i} className="ai-asst__source"><div className="ai-asst__source-label">{s.label}</div>
                          {s.exactText && <div className="ai-asst__source-text">{s.exactText.slice(0, 200)}</div>}</li>)}</ul>}
                </div>
              )}

              {resp?.plan && (resp.plan.actionType === 'refuse_clinical' || resp.plan.actionType === 'refuse_forbidden') && (
                <div className="ai-asst__refusal">{resp.plan.refusalReason}</div>
              )}

              {preview && (
                <div className="voice-preview" role="group" aria-label="Operazione proposta">
                  <div className="voice-preview__title">{preview.title}</div>
                  {preview.patientName && <div className="voice-preview__patient">Paziente: <strong>{preview.patientName}</strong></div>}
                  <dl className="voice-preview__lines">
                    {preview.lines.map((l, i) => (<div key={i} className="voice-preview__row"><dt>{l.label}</dt><dd>{l.value}</dd></div>))}
                  </dl>
                  {preview.diff && (
                    <div className="voice-diff">
                      <div className="voice-diff__block"><span>Testo attuale</span><pre>{preview.diff.current || '—'}</pre></div>
                      <div className="voice-diff__block"><span>Aggiunta</span><pre>{preview.diff.proposed}</pre></div>
                      <div className="voice-diff__block voice-diff__result"><span>Testo risultante</span><pre>{preview.diff.resulting}</pre></div>
                    </div>
                  )}
                  {preview.warnings.map((w, i) => <p key={i} className="voice-warn">⚠ {w}</p>)}
                  {preview.ambiguities.map((a, i) => <p key={i} className="voice-amb">⛔ {a}</p>)}

                  <div className="voice-actions">
                    <button type="button" className="btn-primary" disabled={!preview.canExecute || stage === 'esecuzione'} onClick={confirm}>Conferma e salva</button>
                    <button type="button" className="btn-secondary" onClick={() => { setResp(null); setStage('trascrizione'); }}>Modifica</button>
                    <button type="button" className="btn-secondary" onClick={reset}>Annulla</button>
                  </div>
                </div>
              )}

              {stage === 'completato' && <div className="voice-done">✓ {message}</div>}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
