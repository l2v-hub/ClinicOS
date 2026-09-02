import type { ReactNode } from 'react';
import { IcoCheck, IcoChevronRight } from '../../icons';
import './DashboardKpiBand.css';

export type DashboardKpiTone = 'critical' | 'attention' | 'positive' | 'info' | 'unknown';

export interface DashboardKpiItem {
  id: string;
  label: string;
  value: string | number;
  spokenValue?: string;
  status: string;
  tone: DashboardKpiTone;
  icon: ReactNode;
  onOpen: () => void;
  actionLabel: string;
}

interface Props {
  label: string;
  items: DashboardKpiItem[];
  loading?: boolean;
}

export function DashboardKpiBand({ label, items, loading = false }: Props) {
  const columns = Math.min(Math.max(items.length, 1), 5);

  return (
    <section
      className={`dashboard-kpi-band dashboard-kpi-band--${columns}`}
      aria-label={label}
      aria-busy={loading}
    >
      {items.map((item) => (
        <button
          type="button"
          className={`dashboard-kpi-card dashboard-kpi-card--${item.tone}`}
          onClick={item.onOpen}
          key={item.id}
          aria-label={`${item.label}: ${item.spokenValue ?? item.value}. ${item.status}. ${item.actionLabel}`}
        >
          <span className="dashboard-kpi-card__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="dashboard-kpi-card__value">{item.value}</span>
          <span className="dashboard-kpi-card__label">{item.label}</span>
          <span className="dashboard-kpi-card__status">
            {item.tone === 'positive' && <IcoCheck />}
            {item.status}
          </span>
          <span className="dashboard-kpi-card__arrow" aria-hidden="true">
            <IcoChevronRight />
          </span>
        </button>
      ))}
    </section>
  );
}
