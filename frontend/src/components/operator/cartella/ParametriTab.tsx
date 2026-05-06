import { useState } from 'react';
import type { CartellaPaziente, Paziente, ParametriMensili, ParametroGiorno } from '../../../types';
import { uid, todayStr, nowISO, PrintButton } from './shared';
import { ParametriModuloView } from './ParametriModuloView';
import { VitaleModal } from './VitaleModal';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
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

function emptyGiorno(giorno: number): ParametroGiorno {
  return { giorno };
}

function findOrCreateMese(
  mensili: ParametriMensili[],
  mese: number,
  anno: number,
): ParametriMensili {
  const found = mensili.find(m => m.mese === mese && m.anno === anno);
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
  return !!(g.pa || g.fc || g.spo2 || g.temperatura || g.dtx08 || g.dtx12 || g.dtx18 || g.evacuazione || g.catetere || g.firmaIpM || g.firmaIpP || g.note);
}

function daysInMonth(mese: number, anno: number): number {
  return new Date(anno, mese, 0).getDate();
}

export function ParametriTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const today = new Date();
  const [viewMese, setViewMese] = useState(today.getMonth() + 1);
  const [viewAnno, setViewAnno] = useState(today.getFullYear());
  const [modulo, setModulo] = useState(false);
  const [editGiorno, setEditGiorno] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParametroGiorno>(emptyGiorno(1));
  const [modalCol, setModalCol] = useState<{ colKey: keyof ParametroGiorno | null; colLabel: string; colSub?: string } | null>(null);
  const [showVitalePanel, setShowVitalePanel] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<{ etichetta: string; valore: string; unita: string; stato: 'normale' | 'attenzione' | 'critico'; rilevato: string; note: string }>({
    etichetta: '', valore: '', unita: '', stato: 'normale', rilevato: todayStr(), note: '',
  });

  const mensili: ParametriMensili[] = cartella.parametriMensili ?? [];
  const meseCorrente = findOrCreateMese(mensili, viewMese, viewAnno);
  const numGiorni = daysInMonth(viewMese, viewAnno);

  function giornoData(g: number): ParametroGiorno {
    return meseCorrente.giorni.find(d => d.giorno === g) ?? emptyGiorno(g);
  }

  function prevMese() {
    if (viewMese === 1) { setViewMese(12); setViewAnno(v => v - 1); }
    else setViewMese(v => v - 1);
    setEditGiorno(null);
  }
  function nextMese() {
    if (viewMese === 12) { setViewMese(1); setViewAnno(v => v + 1); }
    else setViewMese(v => v + 1);
    setEditGiorno(null);
  }

  function openEdit(g: number, col?: { key: keyof ParametroGiorno; label: string; sub?: string }) {
    setEditGiorno(g);
    setEditForm({ ...giornoData(g), giorno: g });
    setModalCol(col ? { colKey: col.key, colLabel: col.label, colSub: col.sub } : { colKey: null, colLabel: 'Tutti i parametri' });
  }

  function saveEdit(updated: ParametroGiorno) {
    if (editGiorno === null) return;
    const updatedGiorni = meseCorrente.giorni.filter(d => d.giorno !== editGiorno);
    if (giornoHasData(updated)) updatedGiorni.push(updated);
    updatedGiorni.sort((a, b) => a.giorno - b.giorno);
    const updatedMese: ParametriMensili = { ...meseCorrente, giorni: updatedGiorni };
    const otherMesi = mensili.filter(m => !(m.mese === viewMese && m.anno === viewAnno));
    onUpdate({ parametriMensili: [...otherMesi, updatedMese] });
    setEditGiorno(null);
    setModalCol(null);
  }

  function closeModal() { setEditGiorno(null); setModalCol(null); }

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
    setVitaleForm({ etichetta: '', valore: '', unita: '', stato: 'normale', rilevato: todayStr(), note: '' });
    setShowVitalePanel(false);
  }

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        <ParametriModuloView cartella={cartella} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <div className="cr-tab-header">
          <h3 className="cr-tab-title">Parametri Vitali Mensili</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary btn-sm" onClick={() => setModulo(true)}>Vista modulo</button>
            <button className="btn-primary btn-sm" onClick={() => setShowVitalePanel(v => !v)}>+ Parametro rapido</button>
          </div>
        </div>

        {/* ── Quick vital panel ── */}
        {showVitalePanel && (
          <div className="cr-inline-form" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Aggiunta rapida parametro vitale</div>
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Parametro *</label>
                <input className="form-input" value={vitaleForm.etichetta} placeholder="Pressione Arteriosa"
                  onChange={e => setVitaleForm(p => ({ ...p, etichetta: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Valore *</label>
                <input className="form-input" value={vitaleForm.valore} placeholder="120/80"
                  onChange={e => setVitaleForm(p => ({ ...p, valore: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Unita'</label>
                <input className="form-input" value={vitaleForm.unita} placeholder="mmHg"
                  onChange={e => setVitaleForm(p => ({ ...p, unita: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Stato</label>
                <select className="form-select" value={vitaleForm.stato}
                  onChange={e => setVitaleForm(p => ({ ...p, stato: e.target.value as typeof vitaleForm.stato }))}>
                  <option value="normale">Normale</option>
                  <option value="attenzione">Attenzione</option>
                  <option value="critico">Critico</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={vitaleForm.rilevato}
                  onChange={e => setVitaleForm(p => ({ ...p, rilevato: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Note</label>
                <input className="form-input" value={vitaleForm.note}
                  onChange={e => setVitaleForm(p => ({ ...p, note: e.target.value }))} />
              </div>
            </div>
            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => setShowVitalePanel(false)}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={addVitale}>Salva</button>
            </div>
          </div>
        )}

        {/* ── Month selector ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button className="btn-secondary btn-sm" onClick={prevMese}>&#8249;</button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: 'center' }}>
            {MESI[viewMese - 1]} {viewAnno}
          </span>
          <button className="btn-secondary btn-sm" onClick={nextMese}>&#8250;</button>
          <span className="cr-meta" style={{ marginLeft: 8 }}>
            Clicca su un giorno per tutti i parametri, o su una cella per il singolo valore
          </span>
        </div>

        {/* ── Monthly grid ── */}
        <div className="parametri-grid-wrapper">
          <table className="parametri-mensili-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                {GRID_COLS.map(c => (
                  <th key={String(c.key)}>
                    {c.label}
                    {c.sub && <><br /><span style={{ fontWeight: 400, fontSize: 8 }}>{c.sub}</span></>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numGiorni }, (_, i) => i + 1).map(g => {
                const gd = giornoData(g);
                return (
                  <tr key={g}>
                    <td className="vitale-cell" onClick={() => openEdit(g)}>{g}</td>
                    {GRID_COLS.map(c => {
                      const val = gd[c.key] as string | undefined ?? '';
                      return (
                        <td key={String(c.key)}
                          className={`vitale-cell${val ? ' has-data' : ''}`}
                          onClick={e => { e.stopPropagation(); openEdit(g, c); }}>
                          {val ? (val.length > 8 ? val.slice(0, 8) + '…' : val) : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Vitale modal ── */}
        {editGiorno !== null && modalCol !== null && (
          <VitaleModal
            paziente={paziente}
            giorno={editGiorno}
            mese={viewMese}
            anno={viewAnno}
            colKey={modalCol.colKey}
            colLabel={modalCol.colLabel}
            colSub={modalCol.colSub}
            currentData={editForm}
            operatoreNome={operatoreNome}
            onSave={saveEdit}
            onClose={closeModal}
          />
        )}
      </div>
    </div>
  );
}
