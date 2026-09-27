import { useEffect, useRef, useState } from 'react';
import { News2Chip } from './News2Chip';

/** NEWS2 caricato solo quando la card entra nello schermo: una lettura per paziente visibile. */
export function LazyNews2({
  patientId,
  patientName,
  compact = false,
}: {
  patientId: string;
  patientName: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    // Si osserva la riga dei badge: lo span vuoto non ha dimensioni e non verrebbe mai visto.
    const el = ref.current?.parentElement;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return (
    <span ref={ref} className="turno-pcard__news2">
      {visible && (
        <News2Chip
          patientId={patientId}
          patientName={patientName}
          variant={compact ? 'compact' : 'chip'}
        />
      )}
    </span>
  );
}
