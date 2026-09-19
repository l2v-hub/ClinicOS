/** Fall back only on device/constraint failures, never retry a permission denial. */
export async function acquireDocumentCamera(
  media: Pick<MediaDevices, 'getUserMedia'>,
  cancelled: () => boolean,
): Promise<MediaStream> {
  try {
    return await media.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 2560 },
        height: { ideal: 1920 },
      },
      audio: false,
    });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (
      cancelled() ||
      ![
        'OverconstrainedError',
        'ConstraintNotSatisfiedError',
        'NotReadableError',
        'AbortError',
      ].includes(name ?? '')
    )
      throw error;
    return media.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  }
}

/** Normalize native camera images before preview/PDF conversion, with bounded canvas memory. */
export async function prepareNativeCameraPhoto(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith('image/') || file.size > 30 * 1024 * 1024)
    throw new Error('Seleziona una foto di massimo 30 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Foto non leggibile.');
    const ratio = Math.min(1, 2560 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Foto non leggibile.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Foto non leggibile.'))),
        'image/jpeg',
        0.92,
      ),
    );
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
