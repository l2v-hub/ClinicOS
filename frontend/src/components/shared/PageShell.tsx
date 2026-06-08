import type { ReactNode } from 'react';

interface PageShellProps {
  /** Optional sub-navigation (L3) rendered as a sticky band under the header. */
  subnav?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard full-width content frame for ClinicOS pages.
 * Owns the page gutter and vertical scroll, and sets min-width:0 so wide
 * children (e.g. tables) scroll inside their own container instead of
 * forcing a global horizontal scrollbar.
 */
export function PageShell({ subnav, children, className }: PageShellProps) {
  return (
    <div className={`page-shell${className ? ` ${className}` : ''}`}>
      {subnav && <div className="page-shell__subnav">{subnav}</div>}
      <div className="page-shell__content">{children}</div>
    </div>
  );
}
