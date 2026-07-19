import { useEffect, useRef, useState } from 'react';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [phase, setPhase] = useState<Phase>('requesting');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [restart, setRestart] = useState(0);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Acquire the camera whenever the modal opens or a retake is requested.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('requesting');
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    }
    blobRef.current = null;
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
      stopStream();
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

  // Clean up object URL + stream on unmount / close.
  useEffect(
    () => () => {
      stopStream();
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  if (!open) return null;

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const w = v.videoWidth || 1280,
      h = v.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        blobRef.current = blob;
        setPhotoUrl(URL.createObjectURL(blob));
        stopStream();
        setPhase('preview');
      },
      'image/jpeg',
      0.92,
    );
  }

  function usePhoto() {
    const blob = blobRef.current;
    if (!blob) return;
    onCapture(new File([blob], `foto-documento-${stamp()}.jpg`, { type: 'image/jpeg' }));
    close();
  }

  function close() {
    stopStream();
    onClose();
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Scatta foto">
      <div className="modal-card camera-capture" data-testid="camera-capture">
        <header className="import-modal__head">
          <h3>Scatta foto</h3>
          <button className="btn-ghost" onClick={close} aria-label="Chiudi">
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
            />
            <div className="camera-capture__actions">
              <button className="btn-primary" onClick={capture} data-testid="camera-shoot">
                Scatta
              </button>
              <button className="btn-ghost" onClick={close}>
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
              <button className="btn-ghost" onClick={close}>
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
              <button className="btn-ghost" onClick={close}>
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
              <button className="btn-ghost" onClick={close}>
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
