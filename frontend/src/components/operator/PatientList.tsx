import { useState } from 'react';
import type { Paziente, Consegna, Operatore, Camera, NuovoPaziente } from '../../types';
import { IcoSearch, IcoX, IcoChevronRight, IcoAlert, IcoPlus } from '../../icons';
import { NewPatientModal } from '../shared/NewPatientModal';

interface PatientListProps {
  pazienti: Paziente[];
  consegne: Consegna[];
  operatori: Operatore[];
  camere: Camera[];
  loading: boolean;
  onSelect: (p: Paziente) => void;
  onAddPaziente: (p: NuovoPaziente) => void;
}

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function PatientList({ pazienti, consegne, operatori, camere, loading, onSelect, onAddPaziente }: PatientListProps) {
  const [ricerca, setRicerca] = useState('');
  const [filtroSesso, setFiltroSesso] = useState<'tutti' | 'M' | 'F'>('tutti');
  const [showModal, setShowModal] = useState(false);

  const consegneAperte = new Set(
    consegne.filter(c => c.stato !== 'completata').map(c => c.pazienteId)
  );

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

  function handleAddPaziente(np: NuovoPaziente) {
    setShowModal(false);
    onAddPaziente(np);
  }

  return (
    <div className="patient-list-view">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Pazienti</h2>
          <p className="view-header__sub">{pazienti.length} pazienti totali</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <IcoPlus /> Nuovo paziente
        </button>
      </div>

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

      {/* Tabella desktop */}
      {(loading || pazienti.length > 0) && (
        <div className="table-wrap table-wrap--desktop">
          <table className="data-table">
            <thead>
              <tr>
                <th>Paziente</th>
                <th>MRN</th>
                <th>Data di nascita</th>
                <th>Sesso</th>
                <th>Contatti</th>
                <th>Consegne</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-row">Caricamento…</td></tr>
              ) : filtrati.length === 0 ? (
                <tr><td colSpan={7} className="empty-row">Nessun paziente trovato</td></tr>
              ) : filtrati.map(p => (
                <tr key={p.id} className="table-row--clickable" onClick={() => onSelect(p)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="op-avatar-sm">{p.firstName[0]}{p.lastName[0]}</div>
                      <div>
                        <div className="cell--name">{p.lastName}, {p.firstName}</div>
                        <div className="cell--muted" style={{ fontSize: 12 }}>{calcAge(p.dateOfBirth)} anni</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="mrn-tag">{p.medicalRecordNumber}</span></td>
                  <td className="cell--muted">{new Date(p.dateOfBirth).toLocaleDateString('it-IT')}</td>
                  <td className="cell--muted">{p.sex ?? '—'}</td>
                  <td className="cell--muted" style={{ fontSize: 12 }}>
                    <div>{p.email ?? '—'}</div>
                    <div>{p.phone ?? '—'}</div>
                  </td>
                  <td>
                    {consegneAperte.has(p.id) && (
                      <span className="consegna-alert-dot" title="Consegne aperte">
                        <IcoAlert />
                      </span>
                    )}
                  </td>
                  <td><span className="row-chevron"><IcoChevronRight /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card list mobile */}
      {(loading || pazienti.length > 0) && (
        <div className="pt-card-list">
          {filtrati.map(p => (
            <div key={p.id} className="pt-list-card" onClick={() => onSelect(p)}>
              <div className="pt-list-card__avatar op-avatar-sm">{p.firstName[0]}{p.lastName[0]}</div>
              <div className="pt-list-card__info">
                <span className="pt-list-card__name">{p.lastName}, {p.firstName}</span>
                <span className="pt-list-card__meta">
                  {p.medicalRecordNumber} · {calcAge(p.dateOfBirth)} anni · {p.sex ?? '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {consegneAperte.has(p.id) && (
                  <span className="consegna-alert-dot"><IcoAlert /></span>
                )}
                <span className="pt-list-card__chevron"><IcoChevronRight /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewPatientModal
          operatori={operatori}
          camere={camere}
          onSave={handleAddPaziente}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
