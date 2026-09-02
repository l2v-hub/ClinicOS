import { useEffect, useRef, useState } from 'react';
import type { Operatore, RuoloOperatore, StatoOperatore } from '../../types';
import { OPERATOR_COLOR_PALETTE } from '../../types';
import { IcoPlus, IcoEdit, IcoCheck, IcoX, IcoSearch, IcoChevronRight } from '../../icons';
import { ClinicalTable } from '../operator/cartella/ClinicalTable';
import type { ColumnDef } from '../operator/cartella/ClinicalTable';
import { OperatorFormPanel } from './OperatorFormPanel';
import { EMPTY_OPERATOR_FORM } from './operatorFormModel';
import type {
  OperatorDirectoryStatus,
  OperatorDirectorySummary,
} from '../../lib/operatorDirectoryPage';

interface OperatorManagementProps {
  operatori: Operatore[];
  summary?: OperatorDirectorySummary | null;
  onSearch?: (query: string) => void;
  onStatusChange?: (status: OperatorDirectoryStatus) => void;
  onAdd: (
    op: Omit<Operatore, 'id' | 'pazientiAssegnati' | 'appuntamentiOggi' | 'iniziali'>,
  ) => void;
  onUpdate: (id: string, updates: Partial<Operatore>) => void;
  onToggleStato: (id: string) => void;
}

function operatoriColumns(
  ruoloLabel: Record<RuoloOperatore, string>,
  apriModifica: (op: Operatore) => void,
  onToggleStato: (id: string) => void,
): ColumnDef<Operatore>[] {
  return [
    {
      key: 'cognome',
      label: 'Operatore',
      sortable: true,
      filterable: true,
      filterType: 'text',
      render: (_v, op) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="op-avatar-sm" style={{ background: op.colore }}>
            {op.iniziali}
          </div>
          <div className="cell--name">
            {op.cognome} {op.nome}
          </div>
        </div>
      ),
    },
    {
      key: 'ruolo',
      label: 'Ruolo',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'medico', label: 'Medico' },
        { value: 'infermiere', label: 'Infermiere' },
        { value: 'coordinatore', label: 'Coordinatore' },
      ],
      render: (_v, op) => (
        <span className="cell--muted">
          {ruoloLabel[op.ruolo]}
          {op.qualifica ? ` · ${op.qualifica}` : ''}
        </span>
      ),
    },
    {
      key: 'reparto',
      label: 'Reparto',
      sortable: true,
      filterable: true,
      filterType: 'text',
      render: (v) => <span className="cell--muted">{v}</span>,
    },
    {
      key: 'email',
      label: 'Contatti',
      render: (_v, op) => (
        <div className="cell--muted" style={{ fontSize: 12 }}>
          <div>{op.email}</div>
          <div>{op.telefono}</div>
        </div>
      ),
    },
    {
      key: 'pazientiAssegnati',
      label: 'Pazienti',
      sortable: true,
      render: (v) => <span className="cell--muted">{v}</span>,
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'attivo', label: 'Attivo' },
        { value: 'inattivo', label: 'Inattivo' },
      ],
      render: (v) => <span className={`stato-pill stato-pill--${v}`}>{v}</span>,
    },
    {
      key: 'id',
      label: 'Azioni',
      width: '72px',
      render: (_v, op) => (
        <div className="table-actions">
          <button
            className="icon-btn icon-btn--sm icon-btn--edit"
            onClick={() => apriModifica(op)}
            title="Modifica"
          >
            <IcoEdit />
          </button>
          <button
            className={`icon-btn icon-btn--sm${op.stato === 'attivo' ? ' icon-btn--danger' : ' icon-btn--success'}`}
            onClick={() => onToggleStato(op.id)}
            title={op.stato === 'attivo' ? 'Disattiva' : 'Riattiva'}
          >
            {op.stato === 'attivo' ? <IcoX /> : <IcoCheck />}
          </button>
        </div>
      ),
    },
  ];
}

export function OperatorManagement({
  operatori,
  summary = null,
  onSearch,
  onStatusChange,
  onAdd,
  onUpdate,
  onToggleStato,
}: OperatorManagementProps) {
  const [ricerca, setRicerca] = useState('');
  const [filtroStato, setFiltroStato] = useState<'tutti' | StatoOperatore>('tutti');
  const [formAperto, setFormAperto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_OPERATOR_FORM);
  const searchMounted = useRef(false);

  useEffect(() => {
    if (!searchMounted.current) {
      searchMounted.current = true;
      return;
    }
    const timer = window.setTimeout(() => onSearch?.(ricerca.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [ricerca, onSearch]);

  const filtrati = operatori.filter((op) => {
    const match =
      `${op.nome} ${op.cognome} ${op.reparto} ${op.email} ${op.ruolo} ${op.qualifica ?? ''}`
        .toLowerCase()
        .includes(ricerca.toLowerCase());
    const statoMatch = filtroStato === 'tutti' || op.stato === filtroStato;
    return match && statoMatch;
  });

  function apriNuovo() {
    setEditId(null);
    // Pick next unused color
    const usedColors = operatori.map((o) => o.colore);
    const nextColor =
      OPERATOR_COLOR_PALETTE.find((c) => !usedColors.includes(c)) ?? EMPTY_OPERATOR_FORM.colore;
    setForm({ ...EMPTY_OPERATOR_FORM, colore: nextColor });
    setFormAperto(true);
  }

  function apriModifica(op: Operatore) {
    setEditId(op.id);
    setForm({
      nome: op.nome,
      cognome: op.cognome,
      ruolo: op.ruolo,
      email: op.email,
      telefono: op.telefono,
      reparto: op.reparto,
      stato: op.stato,
      qualifica: op.qualifica ?? '',
      colore: op.colore,
      note: op.note ?? '',
    });
    setFormAperto(true);
  }

  function salva() {
    // email obbligatoria: lato backend l'operatore è uno User (email unica)
    if (!form.nome.trim() || !form.cognome.trim() || !form.email.trim()) return;
    if (editId) {
      onUpdate(editId, form);
    } else {
      onAdd(form);
    }
    setFormAperto(false);
    setEditId(null);
    setForm(EMPTY_OPERATOR_FORM);
  }

  function annulla() {
    setFormAperto(false);
    setEditId(null);
    setForm(EMPTY_OPERATOR_FORM);
  }

  const ruoloLabel: Record<RuoloOperatore, string> = {
    medico: 'Medico',
    infermiere: 'Infermiere',
    coordinatore: 'Coordinatore',
  };

  return (
    <div className="op-management">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Gestione Operatori</h2>
          <p className="view-header__sub">
            {summary?.active ?? operatori.filter((o) => o.stato === 'attivo').length} attivi su{' '}
            {summary?.total ?? operatori.length} totali
          </p>
        </div>
        <button
          className="btn-success"
          onClick={apriNuovo}
          aria-expanded={formAperto}
          aria-controls="operator-form-panel"
        >
          <IcoPlus /> Nuovo Operatore
        </button>
      </div>

      {/* Form */}
      {formAperto && (
        <OperatorFormPanel
          value={form}
          editMode={Boolean(editId)}
          onChange={setForm}
          onCancel={annulla}
          onSubmit={salva}
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
            placeholder="Cerca per nome, reparto, email…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          {ricerca && (
            <button className="search-clear-btn" onClick={() => setRicerca('')}>
              <IcoX />
            </button>
          )}
        </div>
        <div className="filter-chips">
          {(['tutti', 'attivo', 'inattivo'] as const).map((s) => (
            <button
              key={s}
              className={`filter-chip${filtroStato === s ? ' active' : ''}`}
              onClick={() => {
                setFiltroStato(s);
                onStatusChange?.(s === 'attivo' ? 'active' : s === 'inattivo' ? 'inactive' : 'all');
              }}
            >
              {s === 'tutti' ? 'Tutti' : s === 'attivo' ? 'Attivi' : 'Inattivi'}
            </button>
          ))}
        </div>
      </div>

      {/* Table wrapped in collapsible ClinicalTable */}
      <ClinicalTable<Operatore>
        title="Operatori"
        count={summary?.matching ?? operatori.length}
        countLabel="operatori"
        columns={operatoriColumns(ruoloLabel, apriModifica, onToggleStato)}
        data={filtrati}
        emptyMessage="Nessun operatore trovato."
      />

      {/* Card list mobile */}
      <div className="pt-card-list">
        {filtrati.map((op) => (
          <div key={op.id} className="pt-list-card" style={{ cursor: 'default' }}>
            <div className="op-avatar-sm" style={{ background: op.colore }}>
              {op.iniziali}
            </div>
            <div className="pt-list-card__info">
              <span className="pt-list-card__name">
                {op.cognome} {op.nome}
              </span>
              <span className="pt-list-card__meta">
                {ruoloLabel[op.ruolo]} · {op.reparto}
              </span>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}
            >
              <span className={`stato-pill stato-pill--${op.stato}`}>{op.stato}</span>
              <div className="table-actions">
                <button
                  className="icon-btn icon-btn--sm icon-btn--edit"
                  onClick={() => apriModifica(op)}
                >
                  <IcoEdit />
                </button>
                <button
                  className={`icon-btn icon-btn--sm${op.stato === 'attivo' ? ' icon-btn--danger' : ' icon-btn--success'}`}
                  onClick={() => onToggleStato(op.id)}
                >
                  {op.stato === 'attivo' ? <IcoX /> : <IcoCheck />}
                </button>
              </div>
            </div>
            <span className="pt-list-card__chevron">
              <IcoChevronRight />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
