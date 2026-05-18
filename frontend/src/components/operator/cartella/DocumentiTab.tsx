import { useState } from 'react';
import type { CartellaPaziente, DocumentoConsegnato, TipoDocumento, StatoDocumento, Paziente } from '../../../types';
import { uid, todayStr, fmtDate, PrintButton, ClinicalTableSection } from './shared';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const TIPO_LABEL: Record<TipoDocumento, string> = {
  documento_identita: 'Documento di identità',
  tessera_sanitaria: 'Tessera sanitaria',
  consenso_privacy: 'Consenso privacy',
  consenso_trattamento: 'Consenso trattamento',
  invio_centro_medico: 'Invio centro medico',
  lettera_dimissione: 'Lettera di dimissione',
  referto: 'Referto',
  prescrizione: 'Prescrizione',
  delega: 'Delega',
  liberatoria_uscita: 'Liberatoria di uscita',
  consenso_contenzioni: 'Consenso contenzioni',
  documentazione_medicazioni: 'Documentazione medicazioni',
  consenso_informato: 'Consenso informato',
  privacy: 'Informativa privacy',
  regolamento: 'Regolamento struttura',
  carta_servizi: 'Carta dei servizi',
  modulo_allergie: 'Modulo allergie',
  piano_terapeutico: 'Piano terapeutico',
  altro: 'Altro',
};

const STATO_LABEL: Record<StatoDocumento, string> = {
  ricevuto: 'Ricevuto',
  mancante: 'Mancante',
  da_verificare: 'Da verificare',
  firmato: 'Firmato',
  scaduto: 'Scaduto',
};

const STATO_BADGE: Record<StatoDocumento, string> = {
  ricevuto: 'badge--blue',
  mancante: 'badge--red',
  da_verificare: 'badge--amber',
  firmato: 'badge--green',
  scaduto: 'badge--gray',
};

const EMPTY_FORM = {
  tipo: 'documento_identita' as TipoDocumento,
  descrizione: '',
  dataConsegna: todayStr(),
  scadenza: '',
  provenienza: '',
  firmatoDA: 'paziente',
  stato: 'ricevuto' as StatoDocumento,
  note: '',
};

export function DocumentiTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const allDocs = cartella.documentiConsegnati ?? [];
  const docs = allDocs.filter(d => !d.archiviato);
  const archived = allDocs.filter(d => d.archiviato);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showArchived, setShowArchived] = useState(false);

  function set(f: Partial<typeof form>) { setForm(p => ({ ...p, ...f })); }

  function handleSave() {
    const saved: DocumentoConsegnato = {
      id: editId ?? uid(),
      tipo: form.tipo,
      descrizione: form.descrizione || TIPO_LABEL[form.tipo],
      dataConsegna: form.dataConsegna,
      scadenza: form.scadenza || undefined,
      provenienza: form.provenienza || undefined,
      firmatoDA: form.firmatoDA,
      stato: form.stato,
      operatore: operatoreNome,
      note: form.note,
    };
    onUpdate({
      documentiConsegnati: editId
        ? allDocs.map(d => d.id === editId ? saved : d)
        : [saved, ...allDocs],
    });
    setShowAdd(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
  }

  function startEdit(d: DocumentoConsegnato) {
    setForm({
      tipo: d.tipo,
      descrizione: d.descrizione,
      dataConsegna: d.dataConsegna,
      scadenza: d.scadenza ?? '',
      provenienza: d.provenienza ?? '',
      firmatoDA: d.firmatoDA,
      stato: d.stato ?? 'ricevuto',
      note: d.note,
    });
    setEditId(d.id);
    setShowAdd(true);
  }

  function handleArchive(id: string) {
    onUpdate({ documentiConsegnati: allDocs.map(d => d.id === id ? { ...d, archiviato: true } : d) });
  }

  function handleDelete(id: string) {
    onUpdate({ documentiConsegnati: allDocs.filter(d => d.id !== id) });
  }

  function handleRestore(id: string) {
    onUpdate({ documentiConsegnati: allDocs.map(d => d.id === id ? { ...d, archiviato: false } : d) });
  }

  const mancanti = docs.filter(d => d.stato === 'mancante');
  const daVerificare = docs.filter(d => d.stato === 'da_verificare');

  return (
    <div className="cr-tab-content">
      {/* Print header */}
      <div className="print-only print-form-header">
        <div className="print-form-header__title">DOCUMENTI PAZIENTE</div>
        <div className="print-form-header__patient">
          Paziente: {paziente.lastName} {paziente.firstName} — Tessera: {paziente.medicalRecordNumber}
        </div>
      </div>

      <ClinicalTableSection
        title="Documenti Paziente"
        count={docs.length}
        countLabel="documenti"
        actions={<>
          <PrintButton label="Stampa elenco" />
          <button className="btn-sm" onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowAdd(true); }}>
            + Aggiungi
          </button>
        </>}
      >
      <div className="cts__body--padded">

      {/* Alert banners */}
      {mancanti.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '13px', color: '#B91C1C' }}>
          <strong>Documenti mancanti ({mancanti.length}):</strong> {mancanti.map(d => d.descrizione).join(', ')}
        </div>
      )}
      {daVerificare.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '13px', color: '#92400E' }}>
          <strong>Da verificare ({daVerificare.length}):</strong> {daVerificare.map(d => d.descrizione).join(', ')}
        </div>
      )}

      {/* Form */}
      {showAdd && (
        <div className="cr-inline-form">
          <div className="cr-form-section__title">{editId ? 'Modifica documento' : 'Nuovo documento'}</div>
          <div className="form-row-2col">
            <div className="form-row">
              <label className="form-label">Tipo documento</label>
              <select className="form-input" value={form.tipo} onChange={e => set({ tipo: e.target.value as TipoDocumento })}>
                {(Object.entries(TIPO_LABEL) as [TipoDocumento, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Stato</label>
              <select className="form-input" value={form.stato} onChange={e => set({ stato: e.target.value as StatoDocumento })}>
                {(Object.entries(STATO_LABEL) as [StatoDocumento, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row-2col">
            <div className="form-row">
              <label className="form-label">Data ricezione</label>
              <input type="date" className="form-input" value={form.dataConsegna} onChange={e => set({ dataConsegna: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Scadenza</label>
              <input type="date" className="form-input" value={form.scadenza} onChange={e => set({ scadenza: e.target.value })} />
            </div>
          </div>
          <div className="form-row-2col">
            <div className="form-row">
              <label className="form-label">Provenienza</label>
              <input type="text" className="form-input" value={form.provenienza} onChange={e => set({ provenienza: e.target.value })} placeholder="es. paziente, familiare, centro medico…" />
            </div>
            <div className="form-row">
              <label className="form-label">Firmato da</label>
              <select className="form-input" value={form.firmatoDA} onChange={e => set({ firmatoDA: e.target.value })}>
                <option value="paziente">Paziente</option>
                <option value="tutore">Tutore</option>
                <option value="familiare">Familiare</option>
                <option value="non_firmato">Non firmato</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Descrizione (opzionale)</label>
            <input type="text" className="form-input" value={form.descrizione} onChange={e => set({ descrizione: e.target.value })} placeholder={TIPO_LABEL[form.tipo]} />
          </div>
          <div className="form-row">
            <label className="form-label">Note</label>
            <input type="text" className="form-input" value={form.note} onChange={e => set({ note: e.target.value })} />
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', padding: '6px 0', borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
            📎 Allegato: funzione di upload disponibile in una versione futura.
          </div>
          <div className="cr-inline-form__actions">
            <button className="btn-secondary btn-sm" onClick={() => { setShowAdd(false); setEditId(null); }}>Annulla</button>
            <button className="btn-primary btn-sm" onClick={handleSave}>Salva</button>
          </div>
        </div>
      )}

      {/* Active documents list */}
      {docs.length === 0 && !showAdd ? (
        <p className="cr-empty">Nessun documento registrato.</p>
      ) : (
        <div className="doc-list">
          {docs.map(d => {
            const stato = d.stato ?? 'ricevuto';
            const isMancante = stato === 'mancante';
            const isDaVer = stato === 'da_verificare';
            return (
              <div
                key={d.id}
                className="doc-item"
                style={isMancante
                  ? { borderLeft: '3px solid #EF4444', background: '#FFF5F5' }
                  : isDaVer
                    ? { borderLeft: '3px solid #F59E0B', background: '#FFFDF0' }
                    : undefined}
              >
                <div className="doc-item__icon">📄</div>
                <div className="doc-item__body">
                  <div className="doc-item__title">{d.descrizione}</div>
                  <div className="doc-item__meta">
                    <span className={`badge ${STATO_BADGE[stato]}`}>{STATO_LABEL[stato]}</span>
                    <span className="badge badge--gray">{TIPO_LABEL[d.tipo]}</span>
                    <span className="cr-meta">{fmtDate(d.dataConsegna)}</span>
                    {d.provenienza && <span className="cr-meta">da: {d.provenienza}</span>}
                    {d.scadenza && (
                      <span className="cr-meta" style={{ color: new Date(d.scadenza) < new Date() ? '#EF4444' : undefined }}>
                        scad: {fmtDate(d.scadenza)}
                      </span>
                    )}
                    <span className="cr-meta">firmato: {d.firmatoDA}</span>
                    <span className="cr-meta">op: {d.operatore}</span>
                  </div>
                  {d.note && <div className="cr-meta" style={{ marginTop: 4 }}>{d.note}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} className="no-print">
                  <button className="icon-btn icon-btn--sm" onClick={() => startEdit(d)} title="Modifica">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="icon-btn icon-btn--sm" onClick={() => handleArchive(d.id)} title="Archivia">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  </button>
                  <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => handleDelete(d.id)} title="Elimina">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived documents */}
      {archived.length > 0 && (
        <div style={{ marginTop: 16 }} className="no-print">
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowArchived(v => !v)}
            style={{ marginBottom: 8 }}
          >
            {showArchived ? '▲' : '▼'} Archivio ({archived.length})
          </button>
          {showArchived && (
            <div className="doc-list" style={{ opacity: 0.65 }}>
              {archived.map(d => {
                const stato = d.stato ?? 'ricevuto';
                return (
                  <div key={d.id} className="doc-item">
                    <div className="doc-item__icon">🗃️</div>
                    <div className="doc-item__body">
                      <div className="doc-item__title">{d.descrizione}</div>
                      <div className="doc-item__meta">
                        <span className={`badge ${STATO_BADGE[stato]}`}>{STATO_LABEL[stato]}</span>
                        <span className="badge badge--gray">{TIPO_LABEL[d.tipo]}</span>
                        <span className="cr-meta">{fmtDate(d.dataConsegna)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="btn-secondary btn-sm" onClick={() => handleRestore(d.id)} title="Ripristina">
                        Ripristina
                      </button>
                      <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => handleDelete(d.id)} title="Elimina">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
      </ClinicalTableSection>
    </div>
  );
}
