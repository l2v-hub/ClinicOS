// Note: feature 010 reference baseline for clinical sub-menu gap = --clinical-submenu-gap (16px); applied via TerapiaFarmacologicaTab.tsx
import { useState, useRef, useCallback } from 'react';
import { IcoCheck } from '../../../icons';
import type { CartellaPaziente, Paziente, ParametriMensili, ParametroGiorno } from '../../../types';
import { uid, todayStr, nowISO, PrintButton, ClinicalTableSection } from './shared';
import { ParametriModuloView } from './ParametriModuloView';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const GRID_COLS: { key: keyof ParametroGiorno; label: string; sub?: string }[] = [
  { key: 'pa', label: 'PA', sub: 'mmHg' },
  { key: 'fc', label: 'FC', sub: 'bpm' },
  { key: 'spo2', label: 'SpO\u2082', sub: '%' },
  { key: 'temperatura', label: 'TC', sub: '\u00b0C' },
  { key: 'dtx08', label: 'DTX 08', sub: 'mg/dl' },
  { key: 'dtx12', label: 'DTX 12', sub: 'mg/dl' },
  { key: 'dtx18', label: 'DTX 18', sub: 'mg/dl' },
  { key: 'evacuazione', label: 'EVAC', sub: '' },
  { key: 'catetere', label: 'CATET', sub: '' },
  { key: 'firmaIpM', label: 'IP M', sub: '' },
  { key: 'firmaIpP', label: 'IP P', sub: '' },
  { key: 'note', label: 'NOTE', sub: '' },
];

const EVACUAZIONE_OPTIONS = ['\u2014', 'S\u00ec', 'No', 'Alvo regolare', 'Stipsi', 'Diarrea'];

const NUMERIC_COLS: Set<keyof ParametroGiorno> = new Set([
  'fc',
  'spo2',
  'temperatura',
  'dtx08',
  'dtx12',
  'dtx18',
  'catetere',
]);

function emptyGiorno(giorno: number): ParametroGiorno {
  return { giorno };
}

function findOrCreateMese(
  mensili: ParametriMensili[],
  mese: number,
  anno: number,
): ParametriMensili {
  const found = mensili.find((m) => m.mese === mese && m.anno === anno);
  if (found) return found;
  return {
    id: uid(),
    mese,
    anno,
    giorni: [],
    createdAt: nowISO(),
  };
}

function giornoHasData(g: ParametroGiorno): boolean {
  return !!(
    g.pa ||
    g.fc ||
    g.spo2 ||
    g.temperatura ||
    g.dtx08 ||
    g.dtx12 ||
    g.dtx18 ||
    g.evacuazione ||
    g.catetere ||
    g.firmaIpM ||
    g.firmaIpP ||
    g.note
  );
}

function daysInMonth(mese: number, anno: number): number {
  return new Date(anno, mese, 0).getDate();
}

export function ParametriTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const today = new Date();
  const [viewMese, setViewMese] = useState(today.getMonth() + 1);
  const [viewAnno, setViewAnno] = useState(today.getFullYear());
  const [modulo, setModulo] = useState(false);
  const [showVitalePanel, setShowVitalePanel] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<{
    etichetta: string;
    valore: string;
    unita: string;
    stato: 'normale' | 'attenzione' | 'critico';
    rilevato: string;
    note: string;
  }>({
    etichetta: '',
    valore: '',
    unita: '',
    stato: 'normale',
    rilevato: todayStr(),
    note: '',
  });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    giorno: number;
    colKey: keyof ParametroGiorno;
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const mensili: ParametriMensili[] = cartella.parametriMensili ?? [];
  const meseCorrente = findOrCreateMese(mensili, viewMese, viewAnno);
  const numGiorni = daysInMonth(viewMese, viewAnno);

  function giornoData(g: number): ParametroGiorno {
    return meseCorrente.giorni.find((d) => d.giorno === g) ?? emptyGiorno(g);
  }

  function prevMese() {
    if (viewMese === 1) {
      setViewMese(12);
      setViewAnno((v) => v - 1);
    } else setViewMese((v) => v - 1);
    setEditingCell(null);
  }
  function nextMese() {
    if (viewMese === 12) {
      setViewMese(1);
      setViewAnno((v) => v + 1);
    } else setViewMese((v) => v + 1);
    setEditingCell(null);
  }

  const saveCellValue = useCallback(
    (giorno: number, colKey: keyof ParametroGiorno, value: string) => {
      const gd = giornoData(giorno);
      const cleanValue = value.trim();
      // For evacuazione, treat the placeholder dash as empty
      const finalValue =
        colKey === 'evacuazione' && cleanValue === '\u2014' ? undefined : cleanValue || undefined;
      const updated = { ...gd, giorno, [colKey]: finalValue };
      const updatedGiorni = meseCorrente.giorni.filter((d) => d.giorno !== giorno);
      if (giornoHasData(updated)) updatedGiorni.push(updated);
      updatedGiorni.sort((a, b) => a.giorno - b.giorno);
      const updatedMese: ParametriMensili = { ...meseCorrente, giorni: updatedGiorni };
      const otherMesi = mensili.filter((m) => !(m.mese === viewMese && m.anno === viewAnno));
      onUpdate({ parametriMensili: [...otherMesi, updatedMese] });
      setModifiedCells((prev) => new Set(prev).add(`${giorno}-${String(colKey)}`));
    },
    [meseCorrente, mensili, viewMese, viewAnno, onUpdate],
  );

  function startEditing(giorno: number, colKey: keyof ParametroGiorno) {
    const gd = giornoData(giorno);
    const currentVal = (gd[colKey] as string | undefined) ?? '';
    setEditingCell({ giorno, colKey });
    setEditingValue(currentVal);
    // Focus will happen via useEffect-like approach in the render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  function moveToNextCell(giorno: number, colKey: keyof ParametroGiorno) {
    const colIdx = GRID_COLS.findIndex((c) => c.key === colKey);
    if (colIdx < GRID_COLS.length - 1) {
      // Next column, same row
      startEditing(giorno, GRID_COLS[colIdx + 1].key);
    } else if (giorno < numGiorni) {
      // First column, next row
      startEditing(giorno + 1, GRID_COLS[0].key);
    } else {
      // Last cell in grid, just close
      setEditingCell(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, giorno: number, colKey: keyof ParametroGiorno) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCellValue(giorno, colKey, editingValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCellValue(giorno, colKey, editingValue);
      moveToNextCell(giorno, colKey);
    }
  }

  function handleBlur() {
    // Use timeout to allow Tab key handler to fire first
    setTimeout(() => {
      if (!editingCell) return;
      saveCellValue(editingCell.giorno, editingCell.colKey, editingValue);
      setEditingCell(null);
    }, 0);
  }

  function addVitale() {
    if (!vitaleForm.etichetta || !vitaleForm.valore) return;
    const newV = {
      id: uid(),
      etichetta: vitaleForm.etichetta,
      valore: vitaleForm.valore,
      unita: vitaleForm.unita,
      stato: vitaleForm.stato,
      rilevato: vitaleForm.rilevato,
      rilevatoDa: operatoreNome,
      note: vitaleForm.note || undefined,
    };
    onUpdate({ parametriVitali: [newV, ...cartella.parametriVitali] });
    setVitaleForm({
      etichetta: '',
      valore: '',
      unita: '',
      stato: 'normale',
      rilevato: todayStr(),
      note: '',
    });
    setShowVitalePanel(false);
  }

  function renderCell(giorno: number, col: (typeof GRID_COLS)[number]) {
    const gd = giornoData(giorno);
    const val = (gd[col.key] as string | undefined) ?? '';
    const isEditing = editingCell?.giorno === giorno && editingCell?.colKey === col.key;
    const wasModified = modifiedCells.has(`${giorno}-${String(col.key)}`);

    const classes = [
      'vitale-inline-cell',
      val ? 'has-data' : '',
      isEditing ? 'is-editing' : '',
      wasModified ? 'was-modified' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (isEditing) {
      if (col.key === 'evacuazione') {
        return (
          <td key={String(col.key)} className={classes}>
            <select
              ref={(el) => {
                inputRef.current = el;
              }}
              className="vitale-inline-select"
              value={editingValue || '\u2014'}
              onChange={(e) => {
                setEditingValue(e.target.value);
                saveCellValue(giorno, col.key, e.target.value);
                setEditingCell(null);
              }}
              onKeyDown={(e) => handleKeyDown(e, giorno, col.key)}
              onBlur={handleBlur}
            >
              {EVACUAZIONE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </td>
        );
      }

      const isNumeric = NUMERIC_COLS.has(col.key);
      const isPA = col.key === 'pa';

      return (
        <td key={String(col.key)} className={classes}>
          <input
            ref={(el) => {
              inputRef.current = el;
            }}
            className="vitale-inline-input"
            type="text"
            inputMode={isNumeric ? 'numeric' : undefined}
            placeholder={isPA ? '120/80' : undefined}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleKeyDown(e, giorno, col.key)}
            onBlur={handleBlur}
          />
        </td>
      );
    }

    return (
      <td key={String(col.key)} className={classes} onClick={() => startEditing(giorno, col.key)}>
        {val ? (
          val.length > 8 ? (
            val.slice(0, 8) + '\u2026'
          ) : (
            val
          )
        ) : (
          <span className="vitale-placeholder">{'\u2014'}</span>
        )}
      </td>
    );
  }

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>
      {/* -- Modulo view -- */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>
            &#8592; Vista operativa
          </button>
          <PrintButton label="Stampa modulo" />
        </div>
        <ParametriModuloView cartella={cartella} paziente={paziente} />
      </div>

      {/* -- Web view -- */}
      <div className="web-content">
        <ClinicalTableSection
          title="Parametri Vitali Mensili"
          actions={
            <>
              <button className="btn-sm" onClick={() => setModulo(true)}>
                Vista modulo
              </button>
              <button className="btn-sm" onClick={() => setShowVitalePanel((v) => !v)}>
                + Parametro rapido
              </button>
            </>
          }
        >
          {/* -- Quick vital panel -- */}
          {showVitalePanel && (
            <div className="cr-inline-form" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                Aggiunta rapida parametro vitale
              </div>
              <div className="op-form-grid">
                <div className="form-field">
                  <label className="form-label">Parametro *</label>
                  <input
                    className="form-input"
                    value={vitaleForm.etichetta}
                    placeholder="Pressione Arteriosa"
                    onChange={(e) => setVitaleForm((p) => ({ ...p, etichetta: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Valore *</label>
                  <input
                    className="form-input"
                    value={vitaleForm.valore}
                    placeholder="120/80"
                    onChange={(e) => setVitaleForm((p) => ({ ...p, valore: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Unita'</label>
                  <input
                    className="form-input"
                    value={vitaleForm.unita}
                    placeholder="mmHg"
                    onChange={(e) => setVitaleForm((p) => ({ ...p, unita: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Stato</label>
                  <select
                    className="form-select"
                    value={vitaleForm.stato}
                    onChange={(e) =>
                      setVitaleForm((p) => ({
                        ...p,
                        stato: e.target.value as typeof vitaleForm.stato,
                      }))
                    }
                  >
                    <option value="normale">Normale</option>
                    <option value="attenzione">Attenzione</option>
                    <option value="critico">Critico</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Data</label>
                  <input
                    className="form-input"
                    type="date"
                    value={vitaleForm.rilevato}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, rilevato: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Note</label>
                  <input
                    className="form-input"
                    value={vitaleForm.note}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>
              </div>
              <div className="cr-inline-form__actions">
                <button className="btn-secondary btn-sm" onClick={() => setShowVitalePanel(false)}>
                  Annulla
                </button>
                <button className="btn-success btn-sm" onClick={addVitale}>
                  <IcoCheck /> Salva
                </button>
              </div>
            </div>
          )}

          {/* -- Month selector -- (clinical sub-menu spacing per FR-013) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 'var(--clinical-submenu-gap, 16px)',
              marginBottom: 14,
            }}
          >
            <button className="btn-secondary btn-sm" onClick={prevMese}>
              &#8249;
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: 'center' }}>
              {MESI[viewMese - 1]} {viewAnno}
            </span>
            <button className="btn-secondary btn-sm" onClick={nextMese}>
              &#8250;
            </button>
            <span className="cr-meta" style={{ marginLeft: 8 }}>
              Clicca su una cella per modificare il valore direttamente
            </span>
          </div>

          {/* -- Monthly grid -- */}
          <div className="clinicos-table-wrap">
            <table className="clinicos-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  {GRID_COLS.map((c) => (
                    <th key={String(c.key)}>
                      {c.label}
                      {c.sub && (
                        <>
                          <br />
                          <span style={{ fontWeight: 400, fontSize: 8 }}>{c.sub}</span>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numGiorni }, (_, i) => i + 1).map((g) => (
                  <tr key={g}>
                    <td className="parametri-day-col">{g}</td>
                    {GRID_COLS.map((c) => renderCell(g, c))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClinicalTableSection>
      </div>
    </div>
  );
}
