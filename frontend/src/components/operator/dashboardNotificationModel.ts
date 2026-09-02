export type DashboardNotificationTone = 'alarm' | 'warning' | 'notice';

export interface DashboardNotificationCounts {
  alarm: number;
  warning: number;
  notice: number;
  total: number;
}

interface DashboardNotificationCountInput {
  delayedPatients: number;
  urgentHandovers: number;
  drugAnomalyPatients: number;
  deliveryOverviewFailed: boolean;
  clinicalOverviewFailed: boolean;
  administrationsFailed: boolean;
  drugVerificationFailed: boolean;
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function buildDashboardNotificationCounts({
  delayedPatients,
  urgentHandovers,
  drugAnomalyPatients,
  deliveryOverviewFailed,
  clinicalOverviewFailed,
  administrationsFailed,
  drugVerificationFailed,
}: DashboardNotificationCountInput): DashboardNotificationCounts {
  const alarm = safeCount(delayedPatients) + safeCount(urgentHandovers);
  const warning =
    safeCount(drugAnomalyPatients) +
    Number(clinicalOverviewFailed) +
    Number(administrationsFailed) +
    Number(drugVerificationFailed);
  const notice = Number(deliveryOverviewFailed);

  return { alarm, warning, notice, total: alarm + warning + notice };
}

export function preferredDashboardNotificationTone(
  counts: DashboardNotificationCounts,
): DashboardNotificationTone {
  if (counts.alarm > 0) return 'alarm';
  if (counts.warning > 0) return 'warning';
  return 'notice';
}
