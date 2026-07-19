import type { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  breadcrumb?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
}

export function PageHeader({ breadcrumb, title, subtitle, actions, tabs }: Props) {
  return (
    <header className="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="page-header__breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((item, idx) => {
            const last = idx === breadcrumb.length - 1;
            return (
              <span key={`${item.label}-${idx}`} className="page-header__crumb">
                {item.onClick && !last ? (
                  <button type="button" className="page-header__crumb-link" onClick={item.onClick}>
                    {item.label}
                  </button>
                ) : (
                  <span className={last ? 'page-header__crumb-current' : 'page-header__crumb-text'}>
                    {item.label}
                  </span>
                )}
                {!last && (
                  <span className="page-header__crumb-sep" aria-hidden="true">
                    /
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      <div className="page-header__row">
        <div className="page-header__titles">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>

      {tabs && <div className="page-header__tabs">{tabs}</div>}
    </header>
  );
}
