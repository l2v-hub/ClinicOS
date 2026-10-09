import { useEffect, useEffectEvent } from 'react';
import type { LegacyCatalogViewRequest } from '../../../lib/assessments/assessmentEntry';
/** Navigation changes the view, never answers or the identity of an existing edit. */
export function useLegacyCatalogView(request: LegacyCatalogViewRequest | undefined, show: (compile: boolean) => void) {
  const apply = useEffectEvent(show);
  useEffect(() => {
    if (!request) return;
    const timer = setTimeout(() => apply(request.action === 'resume'), 0);
    return () => clearTimeout(timer);
  }, [request]);
}
