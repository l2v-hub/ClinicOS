// Shared utilities for cartella clinica sub-tabs
import { useState } from 'react';

export function uid(): string { return crypto.randomUUID(); }
export function nowISO(): string { return new Date().toISOString(); }
export function todayStr(): string { return new Date().toISOString().slice(0, 10); }
export function nowTime(): string { return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT');
}
export function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function PrintButton({ label = 'Stampa' }: { label?: string }) {
  return (
    <button
      className="btn-secondary btn-sm no-print"
      onClick={() => window.print()}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      {label}
    </button>
  );
}

export function SectionHeader({ title, onAdd, addLabel = 'Aggiungi', extra }: {
  title: string; onAdd?: () => void; addLabel?: string; extra?: React.ReactNode;
}) {
  return (
    <div className="cr-section-header">
      <span className="cr-section-title">{title}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {extra}
        {onAdd && (
          <button className="btn-primary btn-sm" onClick={onAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineForm({ onSave, onCancel, children }: {
  onSave: () => void; onCancel: () => void; children: React.ReactNode;
}) {
  return (
    <div className="cr-inline-form">
      {children}
      <div className="cr-inline-form__actions">
        <button className="btn-secondary btn-sm" onClick={onCancel}>Annulla</button>
        <button className="btn-primary btn-sm" onClick={onSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Salva
        </button>
      </div>
    </div>
  );
}

export function TabHeader({ title, showPrint = true }: { title: string; showPrint?: boolean }) {
  return (
    <div className="cr-tab-header no-print">
      <h3 className="cr-tab-title">{title}</h3>
      {showPrint && <PrintButton />}
    </div>
  );
}

export function EmptyState({ msg }: { msg: string }) {
  return <p className="cr-empty">{msg}</p>;
}

export function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

// ── Collapsible clinical section with blue header ────────────────────────────

export function ClinicalTableSection({
  title,
  count,
  countLabel,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string;
  count?: number;
  countLabel?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badge = count !== undefined
    ? `${count} ${countLabel ?? (count === 1 ? 'elemento' : 'elementi')}`
    : null;

  return (
    <div className={`cts${open ? ' cts--open' : ''}`}>
      {/* header è un div role=button (non <button>) così i pulsanti azione annidati sono HTML valido
          e i tap su mobile non innescano per errore anche il toggle della sezione. */}
      <div
        className="cts__header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
      >
        <div className="cts__header-left">
          <span className="cts__chevron">{open ? '▼' : '▶'}</span>
          <span className="cts__title">{title}</span>
          {badge && <span className="cts__badge">{badge}</span>}
        </div>
        <div className="cts__header-right" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      </div>
      {open && <div className="cts__body">{children}</div>}
    </div>
  );
}
