import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import type { Paziente, Consegna, Operatore, Camera, NuovoPaziente } from '../../types';
import { IcoSearch, IcoX, IcoChevronRight, IcoAlert, IcoPlus, IcoTrash } from '../../icons';
import { IntakeWorkspace } from '../shared/intake/IntakeWorkspace';
import { ClinicalTableSection } from './cartella/shared';
import { ClinicalTable } from './cartella/ClinicalTable';
import { PageHeader } from '../shared/PageHeader';
import { AIImportStatus } from '../shared/AIImportStatus';

interface PatientListProps {
  pazienti: Paziente[];
  consegne: Consegna[];
  operatori: Operatore[];
  camere: Camera[];
  loading: boolean;
  onSelect: (p: Paziente) => void;
  onAddPaziente: (p: NuovoPaziente) => Promise<void>;
  /** REQ-018: refresh the list after an imported patient is created. */
  onImported?: () => void;
  /** REQ-019: operator identity for import authorization. */
  operatorId?: string;
  operatorRole?: string;
}

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function PatientList({ pazienti, consegne, loading, onSelect, onAddPaziente: _onAddPaziente, onImported, operatorId, operatorRole }: PatientListProps) {
  const [ricerca, setRicerca] = useState('');
  const [filtroSesso, setFiltroSesso] = useState<'tutti' | 'M' | 'F'>('tutti');
  const [showModal, setShowModal] = useState(false);
  // TEST-ONLY: patient deletion. Backend gates it via ALLOW_PATIENT_DELETE; we hide the
  // button when disabled so production simply never shows it.
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/patients/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (s) setDeleteEnabled(!!s.deleteEnabled); })
      .catch(() => { /* leave hidden */ });
  }, []);

  async function handleDelete(p: Paziente, e: React.MouseEvent) {
    e.stopPropagation();
    if (deletingId) return;
    if (!window.confirm(`Eliminare definitivamente ${p.lastName}, ${p.firstName} (${p.medicalRecordNumber})? Verranno rimossi anche cartella e dati clinici. Azione di test.`)) return;
    setDeletingId(p.id);
    try {
      const headers: Record<string, string> = {};
      if (operatorId) headers['X-Operator-Id'] = operatorId;
      if (operatorRole) headers['X-Operator-Role'] = operatorRole;
      const res = await fetch(`${API_URL}/patients/${p.id}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Eliminazione non riuscita');
        return;
      }
      onImported?.();
    } catch {
      alert('Errore di rete durante l’eliminazione');
    } finally {
      setDeletingId(null);
    }
  }

  const consegneAperteMap = new Map<string, number>();
  consegne.filter(c => c.stato !== 'completata').forEach(c => {
    consegneAperteMap.set(c.pazienteId, (consegneAperteMap.get(c.pazienteId) ?? 0) + 1);
  });
  const consegneAperte = new Set(consegneAperteMap.keys());

  const filtrati = pazienti.filter(p => {
    const q = ricerca.toLowerCase();
    const match = !q ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.medicalRecordNumber.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').toLowerCase().includes(q);
    const sessoMatch = filtroSesso === 'tutti' || p.sex === filtroSesso;
    return match && sessoMatch;
  });

  return (
    <div className="patient-list-view">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Pazienti' }]}
        title="Pazienti"
        subtitle={`${pazienti.length} pazienti totali`}
        actions={
          <>
            <AIImportStatus onImported={onImported} operatorId={operatorId} operatorRole={operatorRole} />
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <IcoPlus /> Nuovo paziente
            </button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico"><IcoSearch /></span>
          <input
            className="search-input"
            type="search"
            placeholder="Cerca per nome, MRN, email…"
            value={ricerca}
            onChange={e => setRicerca(e.target.value)}
          />
          {ricerca && (
            <button className="search-clear-btn" onClick={() => setRicerca('')} aria-label="Cancella">
              <IcoX />
            </button>
          )}
        </div>
        <div className="filter-chips">
          {(['tutti', 'M', 'F'] as const).map(s => (
            <button
              key={s}
              className={`filter-chip${filtroSesso === s ? ' active' : ''}`}
              onClick={() => setFiltroSesso(s)}
            >
              {s === 'tutti' ? 'Tutti' : s === 'M' ? 'Maschio' : 'Femmina'}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loading && pazienti.length === 0 && (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>Nessun paziente presente</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            Non ci sono ancora pazienti registrati. Aggiungi il primo paziente per iniziare.
          </p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <IcoPlus /> Aggiungi primo paziente
          </button>
        </div>
      )}

      {/* Table + cards wrapped in collapsible section */}
      {(loading || pazienti.length > 0) && (
        <ClinicalTableSection title="Pazienti" count={pazienti.length} countLabel="pazienti">
          {/* Tabella desktop — shared ClinicalTable */}
          <div className="table-wrap table-wrap--desktop">
            <ClinicalTable<Paziente>
              title="Pazienti"
              noWrapper
              keyField="id"
              data={loading ? [] : filtrati}
              onRowClick={onSelect}
              emptyMessage={loading ? 'Caricamento…' : 'Nessun paziente trovato'}
              columns={[
                {
                  key: 'lastName', label: 'Paziente', sortable: true,
                  render: (_v, p) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="op-avatar-sm" aria-hidden="true">{p.firstName[0]}{p.lastName[0]}</div>
                      <div>
                        <div className="cell--name">{p.lastName}, {p.firstName}</div>
                        <div className="cell--muted" style={{ fontSize: 12 }}>{calcAge(p.dateOfBirth)} anni</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'medicalRecordNumber', label: 'MRN', sortable: true,
                  render: (_v, p) => <span className="mrn-tag">{p.medicalRecordNumber}</span>,
                },
                {
                  key: 'dateOfBirth', label: 'Data di nascita', sortable: true, filterType: 'date',
                  render: (_v, p) => <span className="cell--muted">{new Date(p.dateOfBirth).toLocaleDateString('it-IT')}</span>,
                },
                {
                  key: 'cameraLetto', label: 'Camera / Letto',
                  render: () => <span className="cell--muted" style={{ fontSize: 12 }}>--</span>,
                },
                {
                  key: 'contatti', label: 'Contatti',
                  render: (_v, p) => (
                    <div className="cell--muted" style={{ fontSize: 12 }}>
                      <div>{p.email ?? '--'}</div>
                      <div>{p.phone ?? '--'}</div>
                    </div>
                  ),
                },
                {
                  key: 'consegne', label: 'Consegne', align: 'center',
                  render: (_v, p) => (
                    consegneAperteMap.has(p.id) ? (
                      <span className="consegna-priorita-badge consegna-priorita-badge--alta" title={`${consegneAperteMap.get(p.id)} consegne aperte`}>
                        {consegneAperteMap.get(p.id)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-xmuted)', fontSize: 11 }}>—</span>
                    )
                  ),
                },
                ...(deleteEnabled ? [{
                  key: 'elimina', label: '', align: 'center' as const,
                  render: (_v: unknown, p: Paziente) => (
                    <button
                      className="pt-delete-btn"
                      title="Elimina paziente (test)"
                      disabled={deletingId === p.id}
                      onClick={(e) => handleDelete(p, e)}
                    >
                      <IcoTrash />
                    </button>
                  ),
                }] : []),
                {
                  key: 'chevron', label: '', align: 'right',
                  render: () => <span className="row-chevron"><IcoChevronRight /></span>,
                },
              ]}
            />
          </div>

          {/* Card list mobile */}
          <div className="pt-card-list">
            {filtrati.map(p => (
              <div key={p.id} className="pt-list-card" onClick={() => onSelect(p)}>
                <div className="pt-list-card__avatar op-avatar-sm" aria-hidden="true">{p.firstName[0]}{p.lastName[0]}</div>
                <div className="pt-list-card__info">
                  <span className="pt-list-card__name">{p.lastName}, {p.firstName}</span>
                  <span className="pt-list-card__meta">
                    {p.medicalRecordNumber} · {calcAge(p.dateOfBirth)} anni · {p.sex ?? '--'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {consegneAperte.has(p.id) && (
                    <span className="consegna-alert-dot"><IcoAlert /></span>
                  )}
                  {deleteEnabled && (
                    <button className="pt-delete-btn" title="Elimina paziente (test)" disabled={deletingId === p.id} onClick={(e) => handleDelete(p, e)}>
                      <IcoTrash />
                    </button>
                  )}
                  <span className="pt-list-card__chevron"><IcoChevronRight /></span>
                </div>
              </div>
            ))}
          </div>
        </ClinicalTableSection>
      )}

      <IntakeWorkspace
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); onImported?.(); }}
        operatorId={operatorId}
        operatorRole={operatorRole}
      />
    </div>
  );
}
