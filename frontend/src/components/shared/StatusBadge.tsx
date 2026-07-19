export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  /** Explicit tone; if omitted, falls back to neutral. Red (danger) is reserved
   *  for clinical alerts / errors only. */
  tone?: BadgeTone;
}

const TONES: Record<BadgeTone, true> = {
  success: true,
  warning: true,
  danger: true,
  info: true,
  neutral: true,
};

/** Single, shared status badge. Unknown/missing tone → neutral. */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const safeTone: BadgeTone = tone && TONES[tone] ? tone : 'neutral';
  return <span className={`status-badge status-badge--${safeTone}`}>{label}</span>;
}
