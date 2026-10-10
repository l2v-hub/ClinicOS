import { useEffect } from 'react';
import type { NavKey } from '../types';

/** Layout-only measurement: never changes identity, navigation or control handlers. */
export function useBedsideTouchLayout(route: NavKey, authenticated: boolean) {
  useEffect(() => {
    if (!authenticated || !['pazienti', 'dettaglio-paziente', 'posti-letto'].includes(route))
      return;
    const root = document.querySelector<HTMLElement>('.main-area-clean');
    const header = root?.querySelector<HTMLElement>('.compact-topbar');
    if (!root || !header) return;
    const measure = () =>
      root.style.setProperty('--ds-topbar-occlusion', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--ds-topbar-occlusion');
    };
  }, [route, authenticated]);
}
