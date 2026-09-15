import { useEffect, useId, useRef, useState } from 'react';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import './CameraCapture.css';

// BUG-052: real in-app camera capture, distinct from file import. Uses getUserMedia (rear camera
// preferred), shows a live preview, lets the operator Scatta → Usa foto / Ripeti / Annulla, and
// degrades explicitly when the camera is unavailable or permission is denied. The captured frame
// is returned as a JPEG File (source=CAMERA) and added to the same ordered document list.

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the captured photo when the operator confirms "Usa foto". */
  onCapture: (file: File) => void;
  /** Explicit fallback to the normal file picker (desktop without camera / permission denied). */
  onFallbackImport: () => void;
}

type Phase = 'requesting' | 'live' | 'preview' | 'denied' | 'unavailable';

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

export function CameraCapture({ open, onClose, onCapture, onFallbackImport }: Props) {
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const capturingRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('requesting');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [restart, setRestart] = useState(0);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearPhoto() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    blobRef.current = null;
  }

  // Acquire the camera whenever the modal opens or a retake is requested.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    generationRef.current++;
    capturingRef.current = false;
    setCapturing(false);
    setReady(false);
    setPhase('requesting');
    clearPhoto();
    setPhotoUrl(null);
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      setPhase('unavailable');
      return;
    }
    md.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setPhase('live');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        setPhase(
          name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError'
            ? 'denied'
            : 'unavailable',
        );
      });
    return () => {
      cancelled = true;
      generationRef.current++;
      stopStream();
      clearPhoto();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restart]);

  // BUG-067: attach the live stream once the <video> is actually mounted. getUserMedia
  // resolves while phase is still 'requesting' (the <video> renders only in 'live'), so the
  // srcObject assignment in the acquire effect runs against a null ref and the preview stays
  // black. Re-attach here when phase flips to 'live' and the element exists.
  useEffect(() => {
    const v = videoRef.current;
    if (phase === 'live' && v && streamRef.current && v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current;
      void v.play().catch(() => {});
    }
  }, [phase]);

  if (!open) return null;

  function capture() {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight || capturingRef.current) return;
    const generation = generationRef.current;
    capturingRef.current = true;
    setCapturing(true);
    const scale = Math.min(
      1,
      Math.sqrt(12_000_000 / (v.videoWidth * v.videoHeight)),
      4096 / Math.max(v.videoWidth, v.videoHeight),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
    const fail = () => {
      if (generation !== generationRef.current) return;
      capturingRef.current = false;
      setCapturing(false);
      stopStream();
      setPhase('unavailable');
    };
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fail();
        return;
      }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (generation !== generationRef.current) return;
          if (!blob) {
            fail();
            return;
          }
          capturingRef.current = false;
          setCapturing(false);
          blobRef.current = blob;
          photoUrlRef.current = URL.createObjectURL(blob);
          setPhotoUrl(photoUrlRef.current);
          stopStream();
          setPhase('preview');
        },
        'image/jpeg',
        0.92,
      );
    } catch {
      fail();
    }
  }

  function usePhoto() {
    const blob = blobRef.current;
    if (!blob) return;
    onCapture(new File([blob], `foto-documento-${stamp()}.jpg`, { type: 'image/jpeg' }));
    close();
  }

  function close() {
    generationRef.current++;
    stopStream();
    clearPhoto();
    onClose();
  }

  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      onClose={close}
      surfaceClassName="modal-card camera-capture"
      closeOnOverlay={false}
    >
      <div data-testid="camera-capture">
        <header className="import-modal__head">
          <h3 id={titleId}>Scatta foto</h3>
          <button
            type="button"
            className="icon-btn"
            onClick={close}
            aria-label="Chiudi"
            data-dialog-initial-focus
          >
            ✕
          </button>
        </header>

        {phase === 'requesting' && (
          <p className="camera-capture__msg" data-testid="camera-requesting">
            Richiesta accesso alla fotocamera…
          </p>
        )}

        {phase === 'live' && (
          <div className="camera-capture__stage">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="camera-capture__video"
              playsInline
              muted
              data-testid="camera-live"
              onLoadedData={(event) =>
                setReady(event.currentTarget.videoWidth > 0 && event.currentTarget.videoHeight > 0)
              }
              onEmptied={() => setReady(false)}
            />
            <div className="camera-capture__actions">
              <button
                className="btn-primary"
                onClick={capture}
                data-testid="camera-shoot"
                disabled={!ready || capturing}
              >
                {capturing ? 'Acquisizione…' : 'Scatta'}
              </button>
              <button type="button" className="btn-secondary" onClick={close}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {phase === 'preview' && photoUrl && (
          <div className="camera-capture__stage">
            <img
              src={photoUrl}
              className="camera-capture__photo"
              alt="Anteprima foto acquisita"
              data-testid="camera-preview"
            />
            <div className="camera-capture__actions">
              <button className="btn-primary" onClick={usePhoto} data-testid="camera-use">
                Usa foto
              </button>
              <button
                className="btn-secondary"
                onClick={() => setRestart((n) => n + 1)}
                data-testid="camera-retake"
              >
                Ripeti
              </button>
              <button type="button" className="btn-secondary" onClick={close}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {phase === 'denied' && (
          <div className="camera-capture__msg" data-testid="camera-denied">
            <p>
              Non è possibile accedere alla fotocamera. Controlla i permessi del browser oppure
              seleziona un’immagine già presente sul dispositivo.
            </p>
            <div className="camera-capture__actions">
              <button className="btn-secondary" onClick={() => setRestart((n) => n + 1)}>
                Riprova
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  close();
                  onFallbackImport();
                }}
              >
                Apri importazione
              </button>
              <button type="button" className="btn-secondary" onClick={close}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {phase === 'unavailable' && (
          <div className="camera-capture__msg" data-testid="camera-unavailable">
            <p>Fotocamera non disponibile.</p>
            <div className="camera-capture__actions">
              <button
                className="btn-primary"
                onClick={() => {
                  close();
                  onFallbackImport();
                }}
              >
                Seleziona un’immagine dal dispositivo
              </button>
              <button type="button" className="btn-secondary" onClick={close}>
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </AccessibleDialogSurface>
  );
}
