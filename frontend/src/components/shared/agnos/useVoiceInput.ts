import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceStartGate } from './voiceStartGate';

// The browser may use a remote speech service. Only the reviewed transcript is sent to ClinicOS.
export type VoicePhase = 'idle' | 'starting' | 'listening' | 'processing';
type SR = {
  lang: string; interimResults: boolean; continuous: boolean;
  start: () => void; stop: () => void; abort?: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
function getSpeechRecognition(): (new () => SR) | null {
  const browser = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}
export function voiceErrorMessage(error?: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed')
    return 'Microfono non autorizzato. Consenti l’accesso nel browser oppure scrivi la richiesta.';
  if (error === 'no-speech') return 'Non ho sentito parole. Riprova a parlare oppure scrivi la richiesta.';
  if (error === 'network') return 'Il servizio vocale non risponde. Riprova oppure scrivi la richiesta.';
  return 'Non riesco ad acquisire la voce. Riprova oppure scrivi la richiesta.';
}
interface UseVoiceInputOptions { onFinalTranscript: (text: string) => void; consentGranted: boolean }
export function useVoiceInput({ onFinalTranscript, consentGranted }: UseVoiceInputOptions) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const textRef = useRef('');
  const failedRef = useRef(false);
  const onFinalRef = useRef(onFinalTranscript); onFinalRef.current = onFinalTranscript;
  const consentRef = useRef(consentGranted); consentRef.current = consentGranted;
  const gate = useRef(createVoiceStartGate());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const supported = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  const detach = (rec: SR) => { rec.onresult = null; rec.onerror = null; rec.onend = null; };
  const finish = (rec: SR) => {
    if (recRef.current !== rec) return;
    clearTimer(); detach(rec); recRef.current = null;
    const text = textRef.current.trim(); textRef.current = '';
    setInterimText(''); setPhase('idle');
    if (text && !failedRef.current && consentRef.current) onFinalRef.current(text);
    else if (!failedRef.current) setError(voiceErrorMessage('no-speech'));
  };
  // Cancel discards late results; stop below explicitly finalizes the user's dictation.
  const cancel = useCallback(() => {
    gate.current.cancel(); clearTimer();
    const rec = recRef.current; recRef.current = null;
    if (rec) { detach(rec); try { if (rec.abort) rec.abort(); else rec.stop(); } catch { /* already stopped */ } }
    textRef.current = ''; setInterimText(''); setPhase('idle'); setError(null);
  }, []);
  const stop = useCallback(() => {
    gate.current.cancel();
    const rec = recRef.current;
    if (!rec) { clearTimer(); setPhase('idle'); return; }
    setPhase('processing'); clearTimer();
    timer.current = setTimeout(() => { finish(rec); try { rec.abort?.(); } catch { /* already stopped */ } }, 2000);
    try { rec.stop(); } catch { finish(rec); }
  }, []);
  const start = useCallback(async () => {
    if (recRef.current || !consentRef.current) return;
    const token = gate.current.begin(); if (token === null) return;
    setError(null); setInterimText(''); setPhase('starting');
    const SRClass = getSpeechRecognition();
    if (!SRClass) {
      gate.current.cancel(); setPhase('idle');
      setError('Dettatura non supportata in questo browser. Puoi scrivere la richiesta.'); return;
    }
    timer.current = setTimeout(() => {
      if (!gate.current.isCurrent(token)) return;
      gate.current.cancel(); setPhase('idle'); setError('Microfono non attivato. Controlla il permesso nel browser e riprova.');
    }, 20_000);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      if (gate.current.isCurrent(token)) { clearTimer(); gate.current.cancel(); setPhase('idle'); setError(voiceErrorMessage('not-allowed')); }
      return;
    }
    if (!consentRef.current || !gate.current.complete(token)) return;
    clearTimer();
    const rec = new SRClass();
    rec.lang = 'it-IT'; rec.interimResults = true; rec.continuous = false;
    recRef.current = rec; textRef.current = ''; failedRef.current = false;
    rec.onresult = (event) => {
      if (recRef.current !== rec) return;
      const text = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim();
      textRef.current = text; setInterimText(text);
    };
    rec.onerror = (event) => {
      if (recRef.current !== rec) return;
      failedRef.current = true; setError(voiceErrorMessage(event?.error)); finish(rec);
    };
    rec.onend = () => finish(rec);
    setPhase('listening');
    timer.current = setTimeout(stop, 60_000);
    try { rec.start(); } catch { failedRef.current = true; setError(voiceErrorMessage()); finish(rec); }
  }, [stop]);
  useEffect(() => { if (!consentGranted) cancel(); }, [consentGranted, cancel]);
  useEffect(() => () => cancel(), [cancel]);
  return { supported, phase, active: phase !== 'idle', listening: phase === 'listening', interimText, error, start, stop, cancel };
}
