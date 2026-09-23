export function CameraCaptureFallback({
  phase,
  error,
  onRestart,
  onImport,
  onClose,
}: {
  phase: 'denied' | 'unavailable';
  error: string;
  onRestart(): void;
  onImport(): void;
  onClose(): void;
}) {
  const denied = phase === 'denied';
  return (
    <div
      className="camera-capture__msg"
      data-testid={denied ? 'camera-denied' : 'camera-unavailable'}
    >
      <p>
        {denied
          ? 'Non è possibile accedere alla fotocamera. Controlla i permessi del browser oppure seleziona un’immagine già presente sul dispositivo.'
          : 'Anteprima della fotocamera non disponibile. Puoi riprovare o usare la fotocamera del dispositivo.'}
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="camera-capture__actions">
        <button type="button" className="btn-secondary" onClick={onRestart}>
          Riprova
        </button>
        <button type="button" className="btn-primary" onClick={onImport}>
          {denied ? 'Apri importazione' : 'Seleziona un’immagine dal dispositivo'}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Annulla
        </button>
      </div>
    </div>
  );
}
