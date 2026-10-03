import { ConsegnaTimestamp } from './ConsegnaTimestamp';
import { landingOf, type PatientLanding } from '../../lib/patientTargetResolver';
import { useEffect, useState } from 'react';
import type { Consegna, ConsegnaSummary, Operatore, PrioritaConsegna } from '../../types';
import { IcoPlus, IcoCheck, IcoX, IcoSearch, IcoEdit, IcoClock } from '../../icons';
import { InlineEditableField } from '../shared/InlineEditableField';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import type { ConsegnaFeedQuery, ConsegnaUrgencyFilter } from '../../lib/consegneFeed';
import { PageHeader } from '../shared/PageHeader';
import { ConsegnaCreateForm } from './ConsegnaCreateForm';
import { useCan } from '../../lib/capabilities';
import { PatientIdentity } from '../shared/PatientIdentity';
import { parsePatientIdentity, patientIdentityName } from '../../lib/patientIdentity';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { corePriorityOptions } from '../../lib/corePriority';
import { UrgencyNotice } from '../shared/UrgencyNotice';
import { consegnaPriorityLabel, isConsegnaUrgencyActive } from '../../lib/consegnaUrgency';

// UX2 W8 (owner 2026-10-03): una consegna è una nota normale o urgente. Nessun «aperta / in corso
// / completata» nella UX: un'urgenza resta segnalata finché il primo operatore diverso
// dall'autore dice «Ho capito»; poi resta la traccia «Urgenza presa in carico da …».

export interface ConsegnePageProps {
  embedded?: boolean;
  consegne: Consegna[];
  summary: ConsegnaSummary;
  operatori: Operatore[];
  operatoreId: string;
  isAdmin: boolean;
  onAdd: ConsegnaCreate;
  draftStore?: ConsegnaDraftStore;
  initialPatientId?: string;
  initialQuery?: ConsegnaFeedQuery;
  onUpdate: (id: string, patch: Partial<Consegna>) => void | Promise<boolean>;
  /** «Ho capito» su una consegna urgente (prende in carico l'urgenza per tutti). */
  onAcknowledge: (id: string) => void | Promise<boolean>;
  onDelete: (id: string) => void;
  loading: boolean;
  loadError: string | null;
  hasMore: boolean;
  onQueryChange: (query: ConsegnaFeedQuery) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
  /** #283: filtro urgenza con cui aprire la pagina (dalla card «Urgenze da prendere in carico»). */
  initialUrgency?: ConsegnaUrgencyFilter;
  /** #283: consegna da evidenziare/scrollare quando la card ne apre una specifica. */
  focusId?: string | null;
}

const TIPO_OPTIONS = [
  'Monitoraggio',
  'Terapia',
  'Esami',
  'Dimissione',
  'Medicazione',
  'Consultazione',
  'Rivalutazione',
  'Altro',
];

type UrgencyChip = 'tutte' | ConsegnaUrgencyFilter;
const URGENCY_CHIPS: Array<{ value: UrgencyChip; label: string }> = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'active', label: 'Urgenze da prendere in carico' },
  { value: 'taken', label: 'Urgenze prese in carico' },
];
const PRIORITY_CHIPS: Array<{ value: 'tutte' | PrioritaConsegna; label: string }> = [
  { value: 'tutte', label: 'Tutte le priorità' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'normale', label: 'Normale' },
];

export function ConsegnePage({
  embedded = false,
  consegne,
  summary,
  operatori,
  operatoreId,
  isAdmin,
  onAdd,
  onUpdate,
  onAcknowledge,
  onDelete,
  loading,
  loadError,
  hasMore,
  onQueryChange,
  onLoadMore,
  onRetry,
  onSelectPaziente,
  initialUrgency,
  focusId,
  draftStore,
  initialPatientId,
  initialQuery,
}: ConsegnePageProps) {
  const [filtroUrgenza, setFiltroUrgenza] = useState<UrgencyChip>(
    initialUrgency ?? initialQuery?.urgency ?? 'tutte',
  );
  const [filtroPriorita, setFiltroPriorita] = useState<'tutte' | PrioritaConsegna>(
    initialQuery?.priority ?? 'tutte',
  );
  const [ricerca, setRicerca] = useState(initialQuery?.q ?? '');
  const [formAperto, setFormAperto] = useState(false);
  const canCreate = useCan('consegne.create');

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        onQueryChange({
          ...(filtroUrgenza !== 'tutte' ? { urgency: filtroUrgenza } : {}),
          ...(filtroPriorita !== 'tutte' ? { priority: filtroPriorita } : {}),
          ...(ricerca.trim() ? { q: ricerca.trim() } : {}),
          ...(initialPatientId ? { patientId: initialPatientId } : {}),
        }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [filtroUrgenza, filtroPriorita, ricerca, onQueryChange, initialPatientId]);

  // #283: quando la dashboard apre UNA consegna specifica, scrolla alla sua card evidenziata.
  useEffect(() => {
    if (!focusId) return;
    document
      .getElementById(`consegna-${focusId}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusId, consegne]);

  const urgenti = consegne.filter(isConsegnaUrgencyActive);
  const altre = consegne.filter((c) => !isConsegnaUrgencyActive(c));
  const filtered = filtroUrgenza !== 'tutte' || filtroPriorita !== 'tutte' || ricerca.trim();
  const summaryLabel = `Nel tuo perimetro: ${
    summary.urgentActive === 1
      ? '1 urgenza da prendere in carico'
      : `${summary.urgentActive} urgenze da prendere in carico`
  }${filtered ? ' · riepilogo indipendente dai filtri' : ''}`;
  // Il ruolo non consente di creare consegne: il pulsante non compare (il backend decide).
  const createAction = canCreate && (
    <button
      type="button"
      className="btn-success"
      aria-expanded={formAperto}
      aria-controls="nuova-consegna-panel"
      onClick={() => setFormAperto((open) => !open)}
    >
      <IcoPlus /> Nuova consegna
    </button>
  );
  const card = (c: Consegna) => (
    <ConsegnaCard
      key={c.id}
      consegna={c}
      onUpdate={onUpdate}
      onAcknowledge={onAcknowledge}
      onDelete={onDelete}
      isAdmin={isAdmin}
      operatoreId={operatoreId}
      operatori={operatori}
      onSelectPaziente={onSelectPaziente}
      focused={c.id === focusId}
    />
  );

  return (
    <div className="ds-page consegne-page">
      {embedded ? (
        <div className="toolbar" aria-label="Riepilogo consegne">
          <p className="page-header__subtitle">{summaryLabel}</p>
          {createAction}
        </div>
      ) : (
        <PageHeader
          breadcrumb={[{ label: 'ClinicOS' }, { label: 'Consegne' }]}
          title="Consegne"
          subtitle={summaryLabel}
          actions={createAction}
        />
      )}

      {formAperto && canCreate && (
        <ConsegnaCreateForm
          operatori={operatori}
          isAdmin={isAdmin}
          onAdd={onAdd}
          draftStore={draftStore}
          onClose={() => setFormAperto(false)}
        />
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico">
            <IcoSearch />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Cerca paziente, tipo, note…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          {ricerca && (
            <button className="search-clear-btn" onClick={() => setRicerca('')}>
              <IcoX />
            </button>
          )}
        </div>
        <div className="ds-chip-group" role="group" aria-label="Filtra per urgenza">
          {URGENCY_CHIPS.map((chip) => (
            <button
              type="button"
              key={chip.value}
              className="ds-chip"
              aria-pressed={filtroUrgenza === chip.value}
              onClick={() => setFiltroUrgenza(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="ds-chip-group" role="group" aria-label="Filtra per priorità">
          {PRIORITY_CHIPS.map((chip) => (
            <button
              type="button"
              key={chip.value}
              className="ds-chip"
              aria-pressed={filtroPriorita === chip.value}
              onClick={() => setFiltroPriorita(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Urgenze da prendere in carico in cima */}
      {urgenti.length > 0 && (
        <div className="consegne-section">
          <h3 className="consegne-section__title consegne-section__title--urgente">
            Urgenze da prendere in carico
          </h3>
          <div className="consegne-list">{urgenti.map(card)}</div>
        </div>
      )}

      {/* Tutte le altre */}
      <div className="consegne-list" style={{ marginTop: urgenti.length > 0 ? 24 : 0 }}>
        {altre.length === 0 && urgenti.length === 0 && !loading && !loadError ? (
          <div className="empty-state-card">Nessuna consegna trovata.</div>
        ) : (
          altre.map(card)
        )}
      </div>
      {loadError && (
        <div className="empty-state-card" role="alert">
          <p>{loadError}</p>
          <button className="btn-secondary btn-sm" onClick={onRetry}>
            Riprova
          </button>
        </div>
      )}
      {loading && consegne.length === 0 && (
        <div className="empty-state-card" role="status">
          Caricamento consegne…
        </div>
      )}
      {hasMore && !loadError && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <button className="btn-secondary" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Caricamento…' : 'Carica altre'}
          </button>
        </div>
      )}
    </div>
  );
}

function ConsegnaCard({
  consegna: c,
  onUpdate,
  onAcknowledge,
  onDelete,
  isAdmin,
  operatoreId,
  operatori,
  onSelectPaziente,
  focused = false,
}: {
  consegna: Consegna;
  onUpdate: (id: string, patch: Partial<Consegna>) => void | Promise<boolean>;
  onAcknowledge: (id: string) => void | Promise<boolean>;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  operatoreId: string;
  operatori: Operatore[];
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
  focused?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acking, setAcking] = useState(false);
  const canEditContent = isAdmin || c.creatoDaId === operatoreId;
  const canDelete = isAdmin || c.creatoDaId === operatoreId;
  const candidateIdentity = parsePatientIdentity(c.identity);
  const identity = candidateIdentity?.id === c.pazienteId ? candidateIdentity : null;
  const urgentActive = isConsegnaUrgencyActive(c);
  const badgeModifier = c.priorita === 'urgente' && !urgentActive ? 'normale' : c.priorita;

  async function acknowledge() {
    if (acking) return;
    setAcking(true);
    try {
      await onAcknowledge(c.id);
    } finally {
      setAcking(false);
    }
  }

  return (
    <div
      id={`consegna-${c.id}`}
      className={`consegna-card consegna-card--${badgeModifier}${focused ? ' consegna-card--focus' : ''}`}
      data-consegna-id={c.id}
      data-urgency-state={c.urgency?.state ?? 'none'}
    >
      <div className="consegna-card__top">
        <span className={`consegna-priorita-badge consegna-priorita-badge--${badgeModifier}`}>
          {consegnaPriorityLabel(c)}
        </span>
        <span className="consegna-tipo">{c.tipo}</span>
        {c.oraScadenza && (
          <span className="consegna-scadenza">
            <IcoClock />
            {c.oraScadenza}
          </span>
        )}
        {(canEditContent || isAdmin) && (
          <button
            className="icon-btn icon-btn--sm consegna-edit-btn icon-btn--edit"
            onClick={() => setEditOpen(true)}
            title="Modifica consegna"
            aria-label="Modifica consegna"
          >
            <IcoEdit />
          </button>
        )}
      </div>
      <div className="consegna-card__patient">
        {c.pazienteNome && (
          <span className="consegna-avatar" aria-hidden="true">
            {c.pazienteNome
              .split(/[,\s]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </span>
        )}
        <PatientIdentity patient={identity} fallbackName={c.pazienteNome} />
        {onSelectPaziente && identity && (
          <button
            className="link-btn consegna-paziente"
            type="button"
            aria-label={`Apri questa consegna nella cartella di ${patientIdentityName(identity)}`}
            data-consegna-open={c.id}
            // Direct access: la consegna stessa, evidenziata fra le consegne della cartella.
            onClick={() =>
              onSelectPaziente(
                patientIdentityName(identity),
                identity.id,
                landingOf({ kind: 'handover', patientId: identity.id, consegnaId: c.id }),
              )
            }
          >
            Apri cartella
          </button>
        )}
      </div>
      <ConsegnaTimestamp createdAt={c.createdAt} />
      <div className="consegna-note">
        {canEditContent ? (
          <InlineEditableField
            variant="block"
            label="Note consegna"
            type="textarea"
            value={c.note}
            emptyText="Aggiungi note…"
            placeholder="Istruzioni per il prossimo operatore…"
            onSave={(v) => onUpdate(c.id, { note: v })}
          />
        ) : (
          <p>{c.note}</p>
        )}
      </div>
      <UrgencyNotice
        urgency={c.urgency}
        onAcknowledge={() => void acknowledge()}
        busy={acking}
        subject={`della consegna per ${c.pazienteNome}`}
      />
      <div className="consegna-card__footer">
        <div>
          <span className="consegna-assegnato">→ {c.operatoreAssegnato || 'Non assegnata'}</span>
          {c.creatoDA !== c.operatoreAssegnato && (
            <span className="consegna-creato"> · da {c.creatoDA}</span>
          )}
        </div>
        {canDelete && (
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            onClick={() => setConfirmOpen(true)}
            title="Elimina"
            aria-label="Elimina consegna"
          >
            <IcoX />
          </button>
        )}
      </div>

      {editOpen && (
        <ConsegnaEditInline
          consegna={c}
          isAdmin={isAdmin}
          operatori={operatori}
          onUpdate={onUpdate}
          onClose={() => setEditOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminare la consegna?"
        message="La consegna verrà eliminata. L'azione non è reversibile."
        confirmLabel="Elimina consegna"
        onConfirm={() => {
          onDelete(c.id);
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function ConsegnaEditInline({
  consegna: c,
  isAdmin,
  operatori,
  onUpdate,
  onClose,
}: {
  consegna: Consegna;
  isAdmin: boolean;
  operatori: Operatore[];
  onUpdate: (id: string, patch: Partial<Consegna>) => void | Promise<boolean>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    priorita: c.priorita,
    tipo: c.tipo,
    oraScadenza: c.oraScadenza ?? '',
    operatoreAssegnatoId: c.operatoreAssegnatoId ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    // UX2 W8: the stored legacy stato is never asked nor sent by the UX.
    const ok = await onUpdate(c.id, {
      priorita: form.priorita,
      tipo: form.tipo,
      oraScadenza: form.oraScadenza,
      ...(isAdmin ? { operatoreAssegnatoId: form.operatoreAssegnatoId || null } : {}),
    });
    setSaving(false);
    if (ok === false) setError('Salvataggio non riuscito. Riprova.');
    else onClose();
  }

  // BUG-065 (#103): render the edit form INLINE inside the card (no modal overlay) so it never
  // overlaps the "Nuova consegna" panel or other cards, and entry stays fast.
  return (
    <div
      className="consegna-edit-inline"
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid var(--border, #D0D5DD)',
        borderRadius: 8,
        background: '#F9FAFB',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <strong style={{ fontSize: 13 }}>Modifica consegna</strong>
        <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Chiudi">
          <IcoX />
        </button>
      </div>
      <div>
        <div className="op-form-grid">
          <div className="form-field">
            <label className="form-label">Priorità</label>
            <select
              className="form-select"
              value={form.priorita}
              disabled={saving}
              onChange={(e) =>
                setForm((p) => ({ ...p, priorita: e.target.value as PrioritaConsegna }))
              }
            >
              {corePriorityOptions(form.priorita, 'alta', 'Alta').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={form.tipo}
              disabled={saving}
              onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
            >
              {TIPO_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Ora scadenza</label>
            <input
              className="form-input"
              type="time"
              value={form.oraScadenza}
              disabled={saving}
              onChange={(e) => setForm((p) => ({ ...p, oraScadenza: e.target.value }))}
            />
          </div>
          {isAdmin && (
            <div className="form-field">
              <label className="form-label">Assegnata a</label>
              <select
                className="form-select"
                value={form.operatoreAssegnatoId}
                disabled={saving}
                onChange={(e) => setForm((p) => ({ ...p, operatoreAssegnatoId: e.target.value }))}
              >
                <option value="">Non assegnata</option>
                {operatori
                  .filter((o) => o.stato === 'attivo')
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.cognome} {o.nome}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
        {error && (
          <p className="inline-edit__error" style={{ margin: 0 }}>
            {error}
          </p>
        )}
      </div>
      <div className="table-actions" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn-secondary btn-sm" onClick={onClose} disabled={saving}>
          Annulla
        </button>
        <button className="btn-success btn-sm" onClick={save} disabled={saving}>
          <IcoCheck /> Salva
        </button>
      </div>
    </div>
  );
}
