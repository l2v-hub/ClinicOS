import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './PatientWorkspaceSurface.css';

interface Props {
  labelledBy: string;
  describedBy?: string;
  onClose(): void;
  dismissible?: boolean;
  className?: string;
  surfaceClassName?: string;
  children: ReactNode;
  beforeNavigate?: () => Promise<boolean>;
}

/** A routed workspace fills the existing main pane; shell navigation stays available. */
export function PatientWorkspaceSurface({
  labelledBy, describedBy, onClose, dismissible = true,
  className = '', surfaceClassName = 'modal-box', children, beforeNavigate,
}: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [bounds, setBounds] = useState<CSSProperties>();
  const region = useRef<HTMLElement | null>(null);
  const close = useRef({ onClose, dismissible, beforeNavigate });
  useLayoutEffect(() => {
    close.current = { onClose, dismissible, beforeNavigate };
  }, [onClose, dismissible, beforeNavigate]);

  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>('main.page-content');
    if (!main) return;
    setHost(main);
    const topbar = document.querySelector<HTMLElement>('.compact-topbar');
    const measure = () => {
      const rect = main.getBoundingClientRect();
      const top = Math.max(0, rect.top, topbar?.getBoundingClientRect().bottom ?? 0);
      const left = Math.max(0, rect.left);
      setBounds({ top, left, width: Math.max(0, Math.min(innerWidth, rect.right) - left),
        height: Math.max(0, innerHeight - top) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    if (topbar) observer.observe(topbar);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // The replaced page is not another tab destination. Navigation outside main is untouched.
    const siblings = Array.from(host.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== region.current,
    ).map(node => ({ node, inert: node.inert }));
    siblings.forEach(({ node }) => { node.inert = true; });
    region.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !close.current.dismissible ||
          !region.current?.contains(document.activeElement) ||
          document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      close.current.onClose();
    };
    let replaying = false;
    let navigating = false;
    const navigate = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('button, a[href], [role="button"]') : null;
      if (replaying || !target?.closest('.teams-sidebar, .compact-topbar') ||
          !close.current.beforeNavigate || event.defaultPrevented) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (navigating) return;
      navigating = true;
      void close.current.beforeNavigate().then(allowed => {
        if (!allowed || !target.isConnected) return;
        replaying = true;
        try { target.click(); } finally { replaying = false; }
      }).catch(() => {
        // The workspace owns the save error and remains open for retry.
      }).finally(() => { navigating = false; });
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('click', navigate, true);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('click', navigate, true);
      siblings.forEach(({ node, inert }) => { node.inert = inert; });
      if (trigger?.isConnected && trigger !== document.body) trigger.focus();
    };
  }, [host]);

  const content = (
    <section ref={region} className={`patient-workspace${host ? '' : ' patient-workspace--inline'}`}
      style={bounds} aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <div className={`patient-workspace__surface ${surfaceClassName} ${className}`.trim()}>
        {children}
      </div>
    </section>
  );
  return host ? createPortal(content, host) : content;
}
