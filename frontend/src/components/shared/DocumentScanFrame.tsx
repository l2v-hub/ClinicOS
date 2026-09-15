import { useRef, type PointerEvent } from 'react';
import { moveScanCorner, type ScanCorner, type ScanCrop } from '../../lib/documentScan';

const corners: { corner: ScanCorner; label: string }[] = [
  { corner: 'top-left', label: 'Angolo in alto a sinistra' },
  { corner: 'top-right', label: 'Angolo in alto a destra' },
  { corner: 'bottom-left', label: 'Angolo in basso a sinistra' },
  { corner: 'bottom-right', label: 'Angolo in basso a destra' },
];

export function DocumentScanFrame({
  crop,
  onChange,
  disabled,
}: {
  crop: ScanCrop;
  onChange: (crop: ScanCrop) => void;
  disabled: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ pointer: number; corner: ScanCorner } | null>(null);
  function move(event: PointerEvent<HTMLButtonElement>, corner: ScanCorner) {
    const rect = surface.current?.getBoundingClientRect();
    if (disabled || !rect?.width || !rect.height) return;
    onChange(
      moveScanCorner(
        crop,
        corner,
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
      ),
    );
  }
  return (
    <div className="document-scan-frame" ref={surface} aria-label="Area da acquisire">
      <div
        className="document-scan-frame__window"
        data-testid="scan-boundary"
        style={{
          left: `${crop.left * 100}%`,
          top: `${crop.top * 100}%`,
          width: `${(crop.right - crop.left) * 100}%`,
          height: `${(crop.bottom - crop.top) * 100}%`,
        }}
      />
      {corners.map(({ corner, label }) => (
        <button
          key={corner}
          type="button"
          className={`document-scan-frame__corner document-scan-frame__corner--${corner}`}
          aria-label={label}
          aria-describedby="scan-frame-help"
          disabled={disabled}
          style={{
            left: `${(corner.endsWith('left') ? crop.left : crop.right) * 100}%`,
            top: `${(corner.startsWith('top') ? crop.top : crop.bottom) * 100}%`,
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragging.current = { pointer: event.pointerId, corner };
          }}
          onPointerMove={(event) => {
            if (dragging.current?.pointer === event.pointerId) move(event, corner);
          }}
          onPointerUp={() => {
            dragging.current = null;
          }}
          onPointerCancel={() => {
            dragging.current = null;
          }}
          onLostPointerCapture={() => {
            dragging.current = null;
          }}
          onKeyDown={(event) => {
            const delta = event.shiftKey ? 0.05 : 0.01;
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-delta, 0],
              ArrowRight: [delta, 0],
              ArrowUp: [0, -delta],
              ArrowDown: [0, delta],
            };
            const direction = directions[event.key];
            if (!direction) return;
            event.preventDefault();
            const x = corner.endsWith('left') ? crop.left : crop.right;
            const y = corner.startsWith('top') ? crop.top : crop.bottom;
            onChange(moveScanCorner(crop, corner, x + direction[0], y + direction[1]));
          }}
        >
          <span aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
