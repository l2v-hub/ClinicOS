import { useEffect, useId, useRef, useState } from 'react';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import { DocumentScanFrame } from './DocumentScanFrame';
import { CameraCaptureFallback } from './CameraCaptureFallback';
import { acquireDocumentCamera, prepareNativeCameraPhoto } from '../../lib/cameraAcquisition';
import {
  initialScanCrop,
  scanCaptureGeometry,
  scannedJpegToPdf,
  type ScanCrop,
} from '../../lib/documentScan';
import './CameraCapture.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Confirmation returns a JPEG by default, or a cropped one-page PDF for document scanning. */
  onCapture: (file: File) => void | Promise<void>;
  outputFormat?: 'jpeg' | 'pdf';
  continueCapture?: boolean;
  captureContext?: string;
  captureDisabled?: boolean;
  onDiscardCapture?: () => void;
  /** Explicit fallback to the normal file picker (desktop without camera / permission denied). */
  onFallbackImport: () => void;
}

type Phase = 'requesting' | 'live' | 'preview' | 'denied' | 'unavailable';

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export function CameraCapture({
  open,
  onClose,
  onCapture,
  onFallbackImport,
  outputFormat = 'jpeg',
  continueCapture = false,
  captureContext,
  captureDisabled = false,
  onDiscardCapture,
}: Props) {
  const scanning = outputFormat === 'pdf';
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const preparedFileRef = useRef<File | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const capturingRef = useRef(false);
  const confirmingRef = useRef(false);
  const imageSizeRef = useRef({ width: 0, height: 0 });
  const [phase, setPhase] = useState<Phase>('requesting');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [restart, setRestart] = useState(0);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const [frameSize, setFrameSize] = useState({ width: 4, height: 3 });
  const [crop, setCrop] = useState<ScanCrop>({ left: 0, top: 0, right: 1, bottom: 1 });

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearPhoto() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    blobRef.current = null;
    preparedFileRef.current = null;
  }

  // Acquire the camera whenever the modal opens or a retake is requested.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const generation = ++generationRef.current;
    capturingRef.current = false;
    confirmingRef.current = false;
    // Reset controls when acquiring a new external camera stream.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapturing(false);
    setConfirming(false);
    setConversionError('');
    setReady(false);
    setPhase('requesting');
    clearPhoto();
    setPhotoUrl(null);
    const md = navigator.mediaDevices;
    const request =
      typeof md?.getUserMedia === 'function'
        ? acquireDocumentCamera(md, () => cancelled || generation !== generationRef.current)
        : Promise.reject(new DOMException('Camera unavailable', 'NotFoundError'));
    request
      .then((stream) => {
        if (cancelled || generation !== generationRef.current) {
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
        if (cancelled || generation !== generationRef.current) return;
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

  async function acceptNativePhoto(file: File) {
    const generation = ++generationRef.current;
    stopStream();
    clearPhoto();
    setConversionError('');
    setPhase('requesting');
    try {
      const photo = await prepareNativeCameraPhoto(file);
      if (generation !== generationRef.current) return;
      blobRef.current = photo.blob;
      imageSizeRef.current = { width: photo.width, height: photo.height };
      photoUrlRef.current = URL.createObjectURL(photo.blob);
      setPhotoUrl(photoUrlRef.current);
      setPhase('preview');
    } catch {
      if (generation !== generationRef.current) return;
      setConversionError('Foto non leggibile. Riprova con una foto JPEG o PNG di massimo 30 MB.');
      setPhase('unavailable');
    }
  }

  function capture() {
    const v = videoRef.current;
    if (
      !v ||
      v.readyState < 2 ||
      !v.videoWidth ||
      !v.videoHeight ||
      capturingRef.current ||
      captureDisabled
    )
      return;
    const generation = generationRef.current;
    capturingRef.current = true;
    setCapturing(true);
    const area = scanCaptureGeometry(
      v.videoWidth,
      v.videoHeight,
      scanning ? crop : { left: 0, top: 0, right: 1, bottom: 1 },
    );
    const canvas = document.createElement('canvas');
    canvas.width = area.width;
    canvas.height = area.height;
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
      ctx.drawImage(
        v,
        area.x,
        area.y,
        area.sourceWidth,
        area.sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
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
          imageSizeRef.current = { width: canvas.width, height: canvas.height };
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

  async function confirmPhoto() {
    const blob = blobRef.current;
    if (!blob || confirmingRef.current) return;
    const generation = generationRef.current;
    confirmingRef.current = true;
    setConfirming(true);
    setConversionError('');
    try {
      if (!preparedFileRef.current) {
        const result = scanning
          ? await scannedJpegToPdf(blob, imageSizeRef.current.width, imageSizeRef.current.height)
          : blob;
        if (generation !== generationRef.current) return;
        preparedFileRef.current = new File(
          [result],
          `${scanning ? 'scansione' : 'foto-documento'}-${stamp()}.${scanning ? 'pdf' : 'jpg'}`,
          { type: scanning ? 'application/pdf' : 'image/jpeg' },
        );
      }
      await onCapture(preparedFileRef.current);
      if (generation !== generationRef.current) return;
      confirmingRef.current = false;
      setConfirming(false);
      if (continueCapture) setRestart((value) => value + 1);
      else close();
    } catch (error) {
      if (generation === generationRef.current)
        setConversionError(
          error instanceof Error ? error.message : 'Impossibile salvare la pagina. Riprova.',
        );
    } finally {
      if (generation === generationRef.current) {
        confirmingRef.current = false;
        setConfirming(false);
      }
    }
  }

  function videoReady(video: HTMLVideoElement) {
    if (!video.videoWidth || !video.videoHeight) return;
    setReady(video.readyState >= 2);
    if (frameSize.width !== video.videoWidth || frameSize.height !== video.videoHeight) {
      setFrameSize({ width: video.videoWidth, height: video.videoHeight });
      setCrop(initialScanCrop(video.videoWidth, video.videoHeight));
    }
  }

  function close() {
    if (confirmingRef.current) return;
    onDiscardCapture?.();
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
      dismissible={!confirming}
    >
      <div data-testid="camera-capture">
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          aria-label="Foto dalla fotocamera del dispositivo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void acceptNativePhoto(file);
          }}
        />
        <header className="import-modal__head">
          <h3 id={titleId}>{scanning ? 'Scansiona documento' : 'Scatta foto'}</h3>
          <button
            type="button"
            className="icon-btn"
            onClick={close}
            disabled={confirming}
            aria-label="Chiudi"
            data-dialog-initial-focus
          >
            ✕
          </button>
        </header>
        {captureContext && (
          <p className="camera-capture__hint" role="status">
            {captureContext}
          </p>
        )}
        {captureDisabled && (
          <p role="status">Limite pagine raggiunto. Chiudi per rivedere le pagine salvate.</p>
        )}
        {phase !== 'preview' && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => nativeInputRef.current?.click()}
          >
            Usa fotocamera del dispositivo
          </button>
        )}

        {phase === 'requesting' && (
          <p className="camera-capture__msg" data-testid="camera-requesting">
            Richiesta accesso alla fotocamera…
          </p>
        )}

        {phase === 'live' && (
          <div className="camera-capture__stage">
            {scanning && (
              <p className="camera-capture__hint" id="scan-frame-help">
                Inquadra il foglio e trascina gli angoli. Verrà acquisita solo l’area nel bordo.
                <span className="sr-only">
                  {' '}
                  Usa le frecce della tastiera per regolare gli angoli.
                </span>
              </p>
            )}
            <div
              className={scanning ? 'camera-capture__viewfinder' : 'camera-capture__full-frame'}
              style={
                scanning
                  ? {
                      aspectRatio: `${frameSize.width} / ${frameSize.height}`,
                      width: `min(100%, calc(50dvh * ${frameSize.width / frameSize.height}))`,
                    }
                  : undefined
              }
            >
              <video
                ref={videoRef}
                className="camera-capture__video"
                playsInline
                muted
                data-testid="camera-live"
                onLoadedData={(event) => videoReady(event.currentTarget)}
                onResize={(event) => videoReady(event.currentTarget)}
                onEmptied={() => setReady(false)}
              />
              {scanning && (
                <DocumentScanFrame crop={crop} onChange={setCrop} disabled={!ready || capturing} />
              )}
            </div>
            {scanning && (
              <button
                type="button"
                className="btn-secondary camera-capture__reset"
                disabled={!ready || capturing || captureDisabled}
                onClick={() => setCrop(initialScanCrop(frameSize.width, frameSize.height))}
              >
                Ripristina bordo
              </button>
            )}
            <div className="camera-capture__actions">
              <button
                className="btn-primary"
                onClick={capture}
                data-testid="camera-shoot"
                disabled={!ready || capturing || captureDisabled}
              >
                {capturing ? 'Acquisizione…' : scanning ? 'Acquisisci pagina' : 'Scatta'}
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
              alt={
                scanning ? 'Anteprima del ritaglio da salvare in PDF' : 'Anteprima foto acquisita'
              }
              data-testid="camera-preview"
            />
            {scanning && (
              <p className="camera-capture__hint">
                Controlla che il testo sia leggibile. Questa pagina sarà salvata in PDF.
              </p>
            )}
            {conversionError && (
              <p role="alert" className="camera-capture__error">
                {conversionError}
              </p>
            )}
            <div className="camera-capture__actions">
              <button
                className="btn-primary"
                onClick={() => void confirmPhoto()}
                data-testid="camera-use"
                disabled={confirming}
              >
                {confirming
                  ? 'Salvataggio…'
                  : continueCapture
                    ? 'Salva e scansiona la prossima'
                    : scanning
                      ? 'Usa PDF'
                      : 'Usa foto'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  onDiscardCapture?.();
                  setRestart((n) => n + 1);
                }}
                data-testid="camera-retake"
                disabled={confirming}
              >
                Ripeti
              </button>
              <button type="button" className="btn-secondary" onClick={close} disabled={confirming}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {(phase === 'denied' || phase === 'unavailable') && (
          <CameraCaptureFallback
            phase={phase}
            error={conversionError}
            onRestart={() => setRestart((value) => value + 1)}
            onClose={close}
            onImport={() => {
              close();
              onFallbackImport();
            }}
          />
        )}
      </div>
    </AccessibleDialogSurface>
  );
}
