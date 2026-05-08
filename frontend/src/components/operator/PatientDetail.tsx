import { useState } from 'react';
import type {
  Paziente, Consegna, Operatore, Camera, CartellaPaziente,
  Diagnosi, NotaClinica,
  VisitaRecord, IndicatoreRischio,
  PrioritaConsegna, AllergiaItem, VitaleItem,
} from '../../types';
import {
  IcoChevronLeft, IcoEdit, IcoCheck, IcoX, IcoPlus,
  IcoWarning, IcoActivity, IcoPill, IcoShield, IcoConsegne, IcoBed,
  IcoCartelle,
} from '../../icons';
import { PresaInCaricoTab } from './cartella/PresaInCaricoTab';
import { DocumentiTab } from './cartella/DocumentiTab';
import { DiarioTab } from './cartella/DiarioTab';
import { MedicazioniTab } from './cartella/MedicazioniTab';
import { ContenzioniTab } from './cartella/ContenzioniTab';
import { ScalaBradenTab } from './cartella/ScalaBradenTab';
import { DimissioneTab } from './cartella/DimissioneTab';
import { ParametriTab } from './cartella/ParametriTab';
import { TerapiaMedicaTab } from './cartella/TerapiaMedicaTab';
import { PageTabs, SectionTabs } from '../shared/NavComponents';
import type { PageTabGroup, SectionTab } from '../shared/NavComponents';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | 'riepilogo' | 'profilo' | 'anamnesi' | 'diagnosi' | 'terapie'
  | 'note' | 'parametri' | 'consegne'
  | 'presa-in-carico' | 'documenti' | 'diario-inf' | 'diario-med'
  | 'medicazioni' | 'contenzioni' | 'braden' | 'dimissione';

type TabGroup = 'panoramica' | 'clinica' | 'diario' | 'moduli' | 'documenti';

interface TabGroupDef {
  id: TabGroup;
  label: string;
  tabs: { id: TabId; label: string }[];
}

const TAB_GROUPS: TabGroupDef[] = [
  {
    id: 'panoramica', label: 'Panoramica',
    tabs: [
      { id: 'riepilogo',  label: 'Riepilogo' },
      { id: 'profilo',    label: 'Profilo' },
      { id: 'consegne',   label: 'Consegne' },
    ],
  },
  {
    id: 'clinica', label: 'Clinica',
    tabs: [
      { id: 'presa-in-carico', label: 'Presa in Carico' },
      { id: 'anamnesi',        label: 'Anamnesi' },
      { id: 'diagnosi',        label: 'Diagnosi' },
      { id: 'terapie',         label: 'Terapie & Farmaci' },
      { id: 'parametri',       label: 'Parametri Vitali' },
      { id: 'note',            label: 'Note & Visite' },
    ],
  },
  {
    id: 'diario', label: 'Diario',
    tabs: [
      { id: 'diario-inf', label: 'Infermieristico' },
      { id: 'diario-med', label: 'Medico' },
    ],
  },
  {
    id: 'moduli', label: 'Moduli',
    tabs: [
      { id: 'medicazioni', label: 'Medicazioni' },
      { id: 'contenzioni', label: 'Contenzioni' },
      { id: 'braden',      label: 'Scala Braden' },
      { id: 'dimissione',  label: 'Dimissione' },
    ],
  },
  {
    id: 'documenti', label: 'Documenti',
    tabs: [{ id: 'documenti', label: 'Documenti' }],
  },
];

function findGroupForTab(tabId: TabId): TabGroup {
  for (const g of TAB_GROUPS) {
    if (g.tabs.some(t => t.id === tabId)) return g.id;
  }
  return 'panoramica';
}

interface PatientDetailProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  consegne: Consegna[];
  operatori: Operatore[];
  camere: Camera[];
  onBack: () => void;
  onAddConsegna: (c: Omit<Consegna, 'id' | 'createdAt'>) => void;
  onUpdateConsegnaStato: (id: string, stato: Consegna['stato']) => void;
  onUpdateCartella: (pazienteId: string, updates: Partial<CartellaPaziente>) => void;
  onUpdatePaziente: (id: string, updates: Partial<Pick<Paziente, 'email' | 'phone'>>) => void;
  operatoreNome: string;
  operatoreId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function uid(): string { return crypto.randomUUID(); }
function nowISO(): string { return new Date().toISOString(); }
function todayStr(): string { return new Date().toISOString().slice(0, 10); }

const RISCHIO_CLASS: Record<string, string> = {
  critico: 'badge--red', alto: 'badge--amber', medio: 'badge--blue', basso: 'badge--gray',
};
const STATO_DIAG_CLASS: Record<string, string> = {
  attiva: 'badge--blue', risolta: 'badge--green', monitoraggio: 'badge--amber', sospetta: 'badge--gray',
};
const STATO_VITALE_CLASS: Record<string, string> = {
  normale: 'vital-card--normale', attenzione: 'vital-card--attenzione', critico: 'vital-card--critico',
};

const TIPO_CONSEGNA_OPTIONS = ['Monitoraggio', 'Terapia', 'Esami', 'Dimissione', 'Medicazione', 'Consultazione', 'Rivalutazione', 'Altro'];
const PRIORITA_OPTIONS: PrioritaConsegna[] = ['normale', 'alta', 'urgente'];

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, onAdd, addLabel = 'Aggiungi' }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="cr-section-header">
      <span className="cr-section-title">{title}</span>
      {onAdd && (
        <button className="btn-primary btn-sm" onClick={onAdd}>
          <IcoPlus /> {addLabel}
        </button>
      )}
    </div>
  );
}

// ── Inline form wrapper ────────────────────────────────────────────────────────

function InlineForm({ onSave, onCancel, children }: { onSave: () => void; onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="cr-inline-form">
      {children}
      <div className="cr-inline-form__actions">
        <button className="btn-secondary btn-sm" onClick={onCancel}>Annulla</button>
        <button className="btn-primary btn-sm" onClick={onSave}><IcoCheck /> Salva</button>
      </div>
    </div>
  );
}

// ── Item row ───────────────────────────────────────────────────────────────────

function ItemRow({ onEdit, onDelete, children }: { onEdit: () => void; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="cr-item-row">
      <div className="cr-item-row__content">{children}</div>
      <div className="cr-item-row__actions">
        <button className="icon-btn icon-btn--sm" onClick={onEdit} title="Modifica"><IcoEdit /></button>
        <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={onDelete} title="Elimina"><IcoX /></button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PatientDetail({
  paziente, cartella, consegne, operatori, camere,
  onBack, onAddConsegna, onUpdateConsegnaStato,
  onUpdateCartella, onUpdatePaziente,
  operatoreNome,
}: PatientDetailProps) {
  const [tab, setTab] = useState<TabId>('riepilogo');
  const [tabGroup, setTabGroup] = useState<TabGroup>('panoramica');

  function switchTab(tabId: TabId) {
    setTab(tabId);
    setTabGroup(findGroupForTab(tabId));
  }

  function switchGroup(groupId: TabGroup) {
    setTabGroup(groupId);
    const group = TAB_GROUPS.find(g => g.id === groupId);
    if (!group) return;
    // Keep current tab if it's in the group, else go to first tab
    if (!group.tabs.some(t => t.id === tab)) {
      setTab(group.tabs[0].id);
    }
  }

  // ── Per-section CRUD state ─────────────────────────────────────────────────

  // Profilo edit
  const [editProfilo, setEditProfilo] = useState(false);
  const [profiloForm, setProfiloForm] = useState<Partial<CartellaPaziente & Pick<Paziente, 'email' | 'phone'>>>({});
  const [editAnamnesi, setEditAnamnesi] = useState(false);
  const [anamnesiForm, setAnamnesiForm] = useState(cartella.anamnesi);

  // Diagnosi
  const [showAddDiag, setShowAddDiag] = useState(false);
  const [editDiagId, setEditDiagId] = useState<string | null>(null);
  const [diagForm, setDiagForm] = useState<Partial<Diagnosi>>({});

  // Rischi
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [editRiskId, setEditRiskId] = useState<string | null>(null);
  const [riskForm, setRiskForm] = useState<Partial<IndicatoreRischio>>({});

  // Note cliniche
  const [showAddNota, setShowAddNota] = useState(false);
  const [editNotaId, setEditNotaId] = useState<string | null>(null);
  const [notaForm, setNotaForm] = useState<Partial<NotaClinica>>({});

  // Visite
  const [showAddVisita, setShowAddVisita] = useState(false);
  const [editVisitaId, setEditVisitaId] = useState<string | null>(null);
  const [visitaForm, setVisitaForm] = useState<Partial<VisitaRecord>>({});

  // Consegne
  const [showAddConsegna, setShowAddConsegna] = useState(false);
  const [consegnaForm, setConsegnaForm] = useState({ tipo: 'Monitoraggio', priorita: 'normale' as PrioritaConsegna, note: '', oraScadenza: '' });

  // ── Card modals ─────────────────────────────────────────────────────────────
  type CardModalType = 'diagnosi' | 'farmaci' | 'parametri' | 'consegne' | 'allergie' | 'camera' | null;
  const [cardModal, setCardModal] = useState<CardModalType>(null);

  // Diagnosi modal quick-add
  const [modalDiagShow, setModalDiagShow] = useState(false);
  const [modalDiagForm, setModalDiagForm] = useState<Partial<Diagnosi>>({});

  // Allergie CRUD
  const [modalAllergiaShow, setModalAllergiaShow] = useState(false);
  const [allergiaForm, setAllergiaForm] = useState<Partial<AllergiaItem>>({});

  // Parametri modal quick-add
  const [modalVitaleShow, setModalVitaleShow] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<Partial<VitaleItem>>({});

  // Consegne modal quick-add
  const [modalConsegnaShow, setModalConsegnaShow] = useState(false);
  const [modalConsegnaForm, setModalConsegnaForm] = useState({ tipo: 'Monitoraggio', priorita: 'normale' as PrioritaConsegna, note: '', oraScadenza: '' });

  // Camera modal
  const [cameraEditing, setCameraEditing] = useState(false);
  const [cameraModalForm, setCameraModalForm] = useState<Partial<CartellaPaziente>>({});

  // ── Computed ───────────────────────────────────────────────────────────────

  const mieConsegne = consegne.filter(c => c.pazienteId === paziente.id);
  const allergieGravi = cartella.allergie.filter(a => a.gravita === 'grave');
  const hasAllergie = allergieGravi.length > 0;
  const diagnosiAttive = cartella.diagnosi.filter(d => d.stato === 'attiva');
  const farmaciAttivi = cartella.farmaci.filter(f => f.stato === 'attivo');
  const rischioAlto = cartella.indicatoriRischio.filter(r => r.livello === 'alto' || r.livello === 'critico');

  // ── Update helpers ─────────────────────────────────────────────────────────

  function upd(updates: Partial<CartellaPaziente>) {
    onUpdateCartella(cartella.pazienteId, updates);
  }

  // Diagnosi
  function saveDiagnosi(list: Diagnosi[]) { upd({ diagnosi: list }); }
  function addDiagnosi() {
    if (!diagForm.descrizione) return;
    saveDiagnosi([{ id: uid(), descrizione: '', tipo: 'principale', stato: 'attiva', dataInsorgenza: todayStr(), operatore: operatoreNome, note: '', createdAt: nowISO(), ...diagForm } as Diagnosi, ...cartella.diagnosi]);
    setShowAddDiag(false); setDiagForm({});
  }
  function updateDiagnosi(id: string) {
    saveDiagnosi(cartella.diagnosi.map(d => d.id === id ? { ...d, ...diagForm } : d));
    setEditDiagId(null); setDiagForm({});
  }
  function deleteDiagnosi(id: string) { saveDiagnosi(cartella.diagnosi.filter(d => d.id !== id)); }

  // Rischi
  function saveRischi(list: IndicatoreRischio[]) { upd({ indicatoriRischio: list }); }
  function addRischio() {
    if (!riskForm.descrizione) return;
    saveRischi([{ id: uid(), tipo: 'altro', livello: 'basso', descrizione: '', dataValutazione: todayStr(), operatore: operatoreNome, ...riskForm } as IndicatoreRischio, ...cartella.indicatoriRischio]);
    setShowAddRisk(false); setRiskForm({});
  }
  function updateRischio(id: string) {
    saveRischi(cartella.indicatoriRischio.map(r => r.id === id ? { ...r, ...riskForm } : r));
    setEditRiskId(null); setRiskForm({});
  }
  function deleteRischio(id: string) { saveRischi(cartella.indicatoriRischio.filter(r => r.id !== id)); }

  // Note cliniche
  function saveNoteClinica(list: NotaClinica[]) { upd({ noteClinica: list }); }
  function addNota() {
    if (!notaForm.contenuto) return;
    saveNoteClinica([{ id: uid(), tipo: 'clinica', contenuto: '', operatore: operatoreNome, createdAt: nowISO(), ...notaForm } as NotaClinica, ...cartella.noteClinica]);
    setShowAddNota(false); setNotaForm({});
  }
  function updateNota(id: string) {
    saveNoteClinica(cartella.noteClinica.map(n => n.id === id ? { ...n, ...notaForm, updatedAt: nowISO() } : n));
    setEditNotaId(null); setNotaForm({});
  }
  function deleteNota(id: string) { saveNoteClinica(cartella.noteClinica.filter(n => n.id !== id)); }

  // Visite
  function saveVisite(list: VisitaRecord[]) { upd({ visite: list }); }
  function addVisita() {
    if (!visitaForm.descrizione) return;
    saveVisite([{ id: uid(), tipo: 'Visita', data: todayStr(), operatore: operatoreNome, descrizione: '', esito: '', createdAt: nowISO(), ...visitaForm } as VisitaRecord, ...cartella.visite]);
    setShowAddVisita(false); setVisitaForm({});
  }
  function updateVisita(id: string) {
    saveVisite(cartella.visite.map(v => v.id === id ? { ...v, ...visitaForm } : v));
    setEditVisitaId(null); setVisitaForm({});
  }
  function deleteVisita(id: string) { saveVisite(cartella.visite.filter(v => v.id !== id)); }

  // Profilo
  function saveProfiloHandler() {
    const { email, phone, ...cartellaUpdates } = profiloForm;
    if (email !== undefined || phone !== undefined) onUpdatePaziente(paziente.id, { email, phone });
    upd(cartellaUpdates);
    setEditProfilo(false);
  }

  // Consegna
  function salvaConsegna() {
    if (!consegnaForm.note.trim()) return;
    onAddConsegna({
      pazienteId: paziente.id,
      pazienteNome: `${paziente.lastName}, ${paziente.firstName}`,
      priorita: consegnaForm.priorita,
      stato: 'aperta',
      tipo: consegnaForm.tipo,
      note: consegnaForm.note,
      scadenza: todayStr(),
      oraScadenza: consegnaForm.oraScadenza || undefined,
      operatoreAssegnato: operatoreNome,
      creatoDA: operatoreNome,
    });
    setShowAddConsegna(false);
    setConsegnaForm({ tipo: 'Monitoraggio', priorita: 'normale', note: '', oraScadenza: '' });
  }

  // ── Card modal CRUD helpers ────────────────────────────────────────────────

  // Diagnosi quick-add from modal
  function addDiagnosiFromModal() {
    if (!modalDiagForm.descrizione) return;
    saveDiagnosi([{ id: uid(), descrizione: '', tipo: 'principale', stato: 'attiva', dataInsorgenza: todayStr(), operatore: operatoreNome, note: '', createdAt: nowISO(), ...modalDiagForm } as Diagnosi, ...cartella.diagnosi]);
    setModalDiagShow(false); setModalDiagForm({});
  }

  // Allergie CRUD
  function saveAllergie(list: AllergiaItem[]) { upd({ allergie: list }); }
  function addAllergia() {
    if (!allergiaForm.allergene) return;
    saveAllergie([{ id: uid(), allergene: '', gravita: 'lieve', reazione: '', documentato: todayStr(), documentatoDa: operatoreNome, ...allergiaForm } as AllergiaItem, ...cartella.allergie]);
    setModalAllergiaShow(false); setAllergiaForm({});
  }
  function deleteAllergia(id: string) { saveAllergie(cartella.allergie.filter(a => a.id !== id)); }

  // Parametri quick-add from modal
  function addVitaleFromModal() {
    if (!vitaleForm.etichetta || !vitaleForm.valore) return;
    const newV: VitaleItem = { id: uid(), etichetta: '', valore: '', unita: '', stato: 'normale', rilevato: nowISO(), rilevatoDa: operatoreNome, ...vitaleForm } as VitaleItem;
    upd({ parametriVitali: [newV, ...cartella.parametriVitali] });
    setModalVitaleShow(false); setVitaleForm({});
  }

  // Consegna quick-add from modal
  function salvaConsegnaDaModal() {
    if (!modalConsegnaForm.note.trim()) return;
    onAddConsegna({
      pazienteId: paziente.id,
      pazienteNome: `${paziente.lastName}, ${paziente.firstName}`,
      priorita: modalConsegnaForm.priorita,
      stato: 'aperta',
      tipo: modalConsegnaForm.tipo,
      note: modalConsegnaForm.note,
      scadenza: todayStr(),
      oraScadenza: modalConsegnaForm.oraScadenza || undefined,
      operatoreAssegnato: operatoreNome,
      creatoDA: operatoreNome,
    });
    setModalConsegnaShow(false);
    setModalConsegnaForm({ tipo: 'Monitoraggio', priorita: 'normale', note: '', oraScadenza: '' });
  }

  // Camera save from modal
  function saveCameraFromModal() {
    upd(cameraModalForm);
    setCameraEditing(false);
    setCameraModalForm({});
  }

  // ── Card modals rendering ──────────────────────────────────────────────────

  const patientLabel = `${paziente.lastName}, ${paziente.firstName}`;

  function renderDiagnosiModal() {
    return (
      <div className="modal-overlay" onClick={() => setCardModal(null)}>
        <div className="modal-box modal-box--edit-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Diagnosi e Problemi</h3>
              <p className="modal-subtitle">{patientLabel}</p>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => setCardModal(null)}><IcoX /></button>
          </div>
          <div className="modal-body">
            <div className="ec-modal-list">
              {cartella.diagnosi.length === 0 && <p className="cr-empty">Nessuna diagnosi registrata.</p>}
              {cartella.diagnosi.map(d => (
                <div key={d.id} className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">{d.descrizione}</span>
                    {d.codiceICD && <span className="cr-mono cr-mono--sm">{d.codiceICD}</span>}
                    <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.stato}</span>
                    <span className="badge badge--gray">{d.tipo}</span>
                  </div>
                  <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => deleteDiagnosi(d.id)} title="Elimina"><IcoX /></button>
                </div>
              ))}
            </div>
            {modalDiagShow ? (
              <div className="ec-modal-add-form">
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Descrizione *</label>
                    <input className="form-input" value={modalDiagForm.descrizione ?? ''} onChange={e => setModalDiagForm(p => ({...p, descrizione: e.target.value}))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={modalDiagForm.tipo ?? 'principale'} onChange={e => setModalDiagForm(p => ({...p, tipo: e.target.value as Diagnosi['tipo']}))}>
                      <option value="principale">Principale</option><option value="secondaria">Secondaria</option>
                      <option value="comorbidita">Comorbidità</option><option value="differenziale">Differenziale</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Stato</label>
                    <select className="form-select" value={modalDiagForm.stato ?? 'attiva'} onChange={e => setModalDiagForm(p => ({...p, stato: e.target.value as Diagnosi['stato']}))}>
                      <option value="attiva">Attiva</option><option value="monitoraggio">Monitoraggio</option>
                      <option value="sospetta">Sospetta</option><option value="risolta">Risolta</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Codice ICD</label>
                    <input className="form-input" value={modalDiagForm.codiceICD ?? ''} placeholder="I10, E11…" onChange={e => setModalDiagForm(p => ({...p, codiceICD: e.target.value}))} />
                  </div>
                </div>
                <div className="form-field" style={{marginTop: 4}}>
                  <label className="form-label">Note</label>
                  <textarea className="form-input" rows={2} value={modalDiagForm.note ?? ''} onChange={e => setModalDiagForm(p => ({...p, note: e.target.value}))} />
                </div>
                <div className="ec-modal-add-form__actions">
                  <button className="btn-secondary btn-sm" onClick={() => {setModalDiagShow(false); setModalDiagForm({});}}>Annulla</button>
                  <button className="btn-primary btn-sm" onClick={addDiagnosiFromModal}><IcoCheck /> Salva</button>
                </div>
              </div>
            ) : (
              <button className="btn-secondary btn-sm" onClick={() => setModalDiagShow(true)}><IcoPlus /> Aggiungi diagnosi</button>
            )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer__left">
              <button className="btn-secondary" onClick={() => { setCardModal(null); switchGroup('clinica'); switchTab('diagnosi'); }}>Apri sezione completa</button>
            </div>
            <div className="modal-footer__right">
              <button className="btn-primary" onClick={() => setCardModal(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderFarmaciModal() {
    return (
      <div className="modal-overlay" onClick={() => setCardModal(null)}>
        <div className="modal-box modal-box--edit-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Farmaci Attivi</h3>
              <p className="modal-subtitle">{patientLabel}</p>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => setCardModal(null)}><IcoX /></button>
          </div>
          <div className="modal-body">
            <div className="ec-modal-list">
              {farmaciAttivi.length === 0 && <p className="cr-empty">Nessun farmaco attivo.</p>}
              {farmaciAttivi.map(f => (
                <div key={f.id} className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">{f.nome}</span>
                    <span className="ec-modal-item__sub">{f.dose}</span>
                    <span className="ec-modal-item__sub">{f.frequenza}</span>
                    {f.via && <span className="badge badge--gray">{f.via}</span>}
                  </div>
                </div>
              ))}
            </div>
            <p className="cr-empty" style={{marginTop: 4}}>Per aggiungere o modificare farmaci usa la sezione completa.</p>
          </div>
          <div className="modal-footer">
            <div className="modal-footer__left">
              <button className="btn-secondary" onClick={() => { setCardModal(null); switchGroup('clinica'); switchTab('terapie'); }}>Apri Terapia Medica</button>
            </div>
            <div className="modal-footer__right">
              <button className="btn-primary" onClick={() => setCardModal(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderParametriModal() {
    const vitali = cartella.parametriVitali.slice(0, 8);
    return (
      <div className="modal-overlay" onClick={() => setCardModal(null)}>
        <div className="modal-box modal-box--edit-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Parametri Vitali</h3>
              <p className="modal-subtitle">{patientLabel}</p>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => setCardModal(null)}><IcoX /></button>
          </div>
          <div className="modal-body">
            <div className="ec-modal-list">
              {vitali.length === 0 && <p className="cr-empty">Nessun parametro rilevato.</p>}
              {vitali.map(v => (
                <div key={v.id} className={`ec-modal-item`}>
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">{v.etichetta}</span>
                    <span className="ec-modal-item__sub">{v.valore} {v.unita}</span>
                    <span className={`badge ${STATO_VITALE_CLASS[v.stato]?.replace('vital-card--', 'badge--') ?? 'badge--gray'}`}>{v.stato}</span>
                    <span className="ec-modal-item__sub">{fmtDate(v.rilevato)}</span>
                  </div>
                </div>
              ))}
            </div>
            {modalVitaleShow ? (
              <div className="ec-modal-add-form">
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Parametro *</label>
                    <input className="form-input" placeholder="es. Pressione sistolica" value={vitaleForm.etichetta ?? ''} onChange={e => setVitaleForm(p => ({...p, etichetta: e.target.value}))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Valore *</label>
                    <input className="form-input" value={vitaleForm.valore ?? ''} onChange={e => setVitaleForm(p => ({...p, valore: e.target.value}))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Unità</label>
                    <input className="form-input" placeholder="mmHg, bpm…" value={vitaleForm.unita ?? ''} onChange={e => setVitaleForm(p => ({...p, unita: e.target.value}))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Stato</label>
                    <select className="form-select" value={vitaleForm.stato ?? 'normale'} onChange={e => setVitaleForm(p => ({...p, stato: e.target.value as VitaleItem['stato']}))}>
                      <option value="normale">Normale</option><option value="attenzione">Attenzione</option><option value="critico">Critico</option>
                    </select>
                  </div>
                </div>
                <div className="ec-modal-add-form__actions">
                  <button className="btn-secondary btn-sm" onClick={() => {setModalVitaleShow(false); setVitaleForm({});}}>Annulla</button>
                  <button className="btn-primary btn-sm" onClick={addVitaleFromModal}><IcoCheck /> Salva</button>
                </div>
              </div>
            ) : (
              <button className="btn-secondary btn-sm" onClick={() => setModalVitaleShow(true)}><IcoPlus /> Aggiungi rilevazione</button>
            )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer__left">
              <button className="btn-secondary" onClick={() => { setCardModal(null); switchGroup('clinica'); switchTab('parametri'); }}>Apri sezione completa</button>
            </div>
            <div className="modal-footer__right">
              <button className="btn-primary" onClick={() => setCardModal(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderConsegneModal() {
    return (
      <div className="modal-overlay" onClick={() => setCardModal(null)}>
        <div className="modal-box modal-box--edit-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Consegne Paziente</h3>
              <p className="modal-subtitle">{patientLabel}</p>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => setCardModal(null)}><IcoX /></button>
          </div>
          <div className="modal-body">
            <div className="ec-modal-list">
              {mieConsegne.length === 0 && <p className="cr-empty">Nessuna consegna.</p>}
              {mieConsegne.slice(0, 8).map(c => (
                <div key={c.id} className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}>{c.priorita}</span>
                    <span className="ec-modal-item__title">{c.note}</span>
                    <span className={`stato-pill stato-pill--consegna-${c.stato}`}>{c.stato.replace('_', ' ')}</span>
                  </div>
                  {c.stato !== 'completata' && (
                    <button className="btn-secondary btn-sm" onClick={() => onUpdateConsegnaStato(c.id, c.stato === 'aperta' ? 'in_corso' : 'completata')}>
                      {c.stato === 'aperta' ? 'Prendi' : 'Chiudi'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {modalConsegnaShow ? (
              <div className="ec-modal-add-form">
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={modalConsegnaForm.tipo} onChange={e => setModalConsegnaForm(p => ({...p, tipo: e.target.value}))}>
                      {TIPO_CONSEGNA_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Priorità</label>
                    <select className="form-select" value={modalConsegnaForm.priorita} onChange={e => setModalConsegnaForm(p => ({...p, priorita: e.target.value as PrioritaConsegna}))}>
                      {PRIORITA_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-field" style={{marginTop: 4}}>
                  <label className="form-label">Note *</label>
                  <textarea className="form-input" rows={2} value={modalConsegnaForm.note} onChange={e => setModalConsegnaForm(p => ({...p, note: e.target.value}))} />
                </div>
                <div className="ec-modal-add-form__actions">
                  <button className="btn-secondary btn-sm" onClick={() => {setModalConsegnaShow(false); setModalConsegnaForm({tipo:'Monitoraggio',priorita:'normale',note:'',oraScadenza:''});}}>Annulla</button>
                  <button className="btn-primary btn-sm" onClick={salvaConsegnaDaModal}><IcoCheck /> Salva</button>
                </div>
              </div>
            ) : (
              <button className="btn-secondary btn-sm" onClick={() => setModalConsegnaShow(true)}><IcoPlus /> Aggiungi consegna</button>
            )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer__left">
              <button className="btn-secondary" onClick={() => { setCardModal(null); switchGroup('panoramica'); switchTab('consegne'); }}>Apri sezione completa</button>
            </div>
            <div className="modal-footer__right">
              <button className="btn-primary" onClick={() => setCardModal(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAllergieModal() {
    return (
      <div className="modal-overlay" onClick={() => setCardModal(null)}>
        <div className="modal-box modal-box--edit-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Allergie e Intolleranze</h3>
              <p className="modal-subtitle">{patientLabel}</p>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => setCardModal(null)}><IcoX /></button>
          </div>
          <div className="modal-body">
            <div className="ec-modal-list">
              {cartella.allergie.length === 0 && <p className="cr-empty">Nessuna allergia registrata.</p>}
              {cartella.allergie.map(a => (
                <div key={a.id} className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">{a.allergene}</span>
                    {a.reazione && <span className="ec-modal-item__sub">{a.reazione}</span>}
                    <span className={`badge ${a.gravita === 'grave' ? 'badge--red' : a.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}>{a.gravita}</span>
                  </div>
                  <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => deleteAllergia(a.id)} title="Elimina"><IcoX /></button>
                </div>
              ))}
            </div>
            {modalAllergiaShow ? (
              <div className="ec-modal-add-form">
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Allergene *</label>
                    <input className="form-input" value={allergiaForm.allergene ?? ''} onChange={e => setAllergiaForm(p => ({...p, allergene: e.target.value}))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Gravità</label>
                    <select className="form-select" value={allergiaForm.gravita ?? 'lieve'} onChange={e => setAllergiaForm(p => ({...p, gravita: e.target.value as AllergiaItem['gravita']}))}>
                      <option value="lieve">Lieve</option><option value="moderata">Moderata</option><option value="grave">Grave</option>
                    </select>
                  </div>
                </div>
                <div className="form-field" style={{marginTop: 4}}>
                  <label className="form-label">Reazione</label>
                  <input className="form-input" value={allergiaForm.reazione ?? ''} onChange={e => setAllergiaForm(p => ({...p, reazione: e.target.value}))} />
                </div>
                <div className="ec-modal-add-form__actions">
                  <button className="btn-secondary btn-sm" onClick={() => {setModalAllergiaShow(false); setAllergiaForm({});}}>Annulla</button>
                  <button className="btn-primary btn-sm" onClick={addAllergia}><IcoCheck /> Salva</button>
                </div>
              </div>
            ) : (
              <button className="btn-secondary btn-sm" onClick={() => setModalAllergiaShow(true)}><IcoPlus /> Aggiungi allergia</button>
            )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer__right">
              <button className="btn-primary" onClick={() => setCardModal(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderCameraModal() {
    const form = cameraEditing ? cameraModalForm : cartella;
    return (
      <div className="modal-overlay" onClick={() => { setCardModal(null); setCameraEditing(false); }}>
        <div className="modal-box modal-box--edit-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Camera e Assegnazione</h3>
              <p className="modal-subtitle">{patientLabel}</p>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => { setCardModal(null); setCameraEditing(false); }}><IcoX /></button>
          </div>
          <div className="modal-body">
            {!cameraEditing ? (
              <div className="ec-modal-list">
                <div className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">Camera</span>
                    <span className="ec-modal-item__sub">{cartella.cameraNumero ?? '—'}</span>
                  </div>
                </div>
                <div className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">Letto</span>
                    <span className="ec-modal-item__sub">{cartella.lettoNumero ?? '—'}</span>
                  </div>
                </div>
                <div className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">Reparto</span>
                    <span className="ec-modal-item__sub">{cartella.repartoRicovero ?? '—'}</span>
                  </div>
                </div>
                <div className="ec-modal-item">
                  <div className="ec-modal-item__main">
                    <span className="ec-modal-item__title">Stato ricovero</span>
                    <span className="ec-modal-item__sub">{cartella.statoRicovero.replace('_', ' ')}</span>
                  </div>
                </div>
                <button className="btn-secondary btn-sm" style={{marginTop: 4}} onClick={() => { setCameraModalForm({ cameraNumero: cartella.cameraNumero, lettoNumero: cartella.lettoNumero, repartoRicovero: cartella.repartoRicovero, statoRicovero: cartella.statoRicovero }); setCameraEditing(true); }}>
                  <IcoEdit /> Modifica assegnazione
                </button>
              </div>
            ) : (
              <div className="op-form-grid">
                <div className="form-field">
                  <label className="form-label">Camera</label>
                  <select className="form-select" value={form.cameraNumero ?? ''} onChange={e => { const cam = camere.find(c => c.numero === e.target.value); setCameraModalForm(p => ({...p, cameraNumero: e.target.value, repartoRicovero: cam?.reparto ?? p.repartoRicovero})); }}>
                    <option value="">— Nessuna —</option>
                    {camere.filter(c => c.stato === 'attiva').map(c => <option key={c.id} value={c.numero}>{c.numero} — {c.reparto}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Letto</label>
                  <input className="form-input" value={cameraModalForm.lettoNumero ?? ''} onChange={e => setCameraModalForm(p => ({...p, lettoNumero: e.target.value}))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Stato ricovero</label>
                  <select className="form-select" value={cameraModalForm.statoRicovero ?? 'ambulatoriale'} onChange={e => setCameraModalForm(p => ({...p, statoRicovero: e.target.value as CartellaPaziente['statoRicovero']}))}>
                    <option value="ricoverato">Ricoverato</option><option value="ambulatoriale">Ambulatoriale</option>
                    <option value="day_hospital">Day Hospital</option><option value="dimesso">Dimesso</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer__left" />
            <div className="modal-footer__right">
              {cameraEditing ? (
                <>
                  <button className="btn-secondary" onClick={() => setCameraEditing(false)}>Annulla</button>
                  <button className="btn-primary" onClick={saveCameraFromModal}><IcoCheck /> Salva</button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => setCardModal(null)}>Chiudi</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Tab rendering ──────────────────────────────────────────────────────────

  function renderRiepilogo() {
    const lastVitali = cartella.parametriVitali.slice(0, 4);
    const diagnosiMostrate = diagnosiAttive.slice(0, 3);
    const farmaciMostrati = farmaciAttivi.slice(0, 4);

    return (
      <div className="cr-tab-content">

        {/* ── Alert allergie gravi ── */}
        {hasAllergie && (
          <button
            className="cr-alert-strip cr-alert-strip--allergie"
            onClick={() => setCardModal('allergie')}
          >
            <span className="cr-alert-strip__ico"><IcoWarning /></span>
            <span><strong>ALLERGIE GRAVI:</strong> {allergieGravi.map(a => a.allergene).join(', ')}</span>
            <span className="cr-alert-strip__link">Gestisci →</span>
          </button>
        )}

        {/* ── Alert rischi ── */}
        {rischioAlto.length > 0 && (
          <div className="cr-alert-strip cr-alert-strip--rischi">
            <span className="cr-alert-strip__ico"><IcoWarning /></span>
            <span>
              <strong>Rischi attivi:</strong>{' '}
              {rischioAlto.map(r => `${r.tipo.replace('_', ' ')} (${r.livello})`).join(' · ')}
            </span>
          </div>
        )}

        {/* ── Quick stats row ── */}
        <div className="cr-quick-stats">
          <button className="cr-quick-stat cr-quick-stat--clickable" onClick={() => setCardModal('diagnosi')}>
            <span className="cr-quick-stat__val">{diagnosiAttive.length}</span>
            <span className="cr-quick-stat__lbl">Diagnosi attive</span>
          </button>
          <button className="cr-quick-stat cr-quick-stat--clickable" onClick={() => setCardModal('farmaci')}>
            <span className="cr-quick-stat__val">{farmaciAttivi.length}</span>
            <span className="cr-quick-stat__lbl">Farmaci attivi</span>
          </button>
          <button className="cr-quick-stat cr-quick-stat--clickable" onClick={() => setCardModal('allergie')}>
            <span className="cr-quick-stat__val">{cartella.allergie.length}</span>
            <span className="cr-quick-stat__lbl">Allergie</span>
          </button>
          <button className="cr-quick-stat cr-quick-stat--clickable" onClick={() => setCardModal('consegne')}>
            <span className="cr-quick-stat__val">{mieConsegne.filter(c => c.stato !== 'completata').length}</span>
            <span className="cr-quick-stat__lbl">Consegne aperte</span>
          </button>
          <button className="cr-quick-stat cr-quick-stat--clickable cr-quick-stat--camera" onClick={() => setCardModal('camera')}>
            <span className="cr-quick-stat__val">{cartella.cameraNumero ?? '—'}</span>
            <span className="cr-quick-stat__lbl">Camera{cartella.lettoNumero ? ` / L.${cartella.lettoNumero}` : ''}</span>
          </button>
        </div>

        {/* ── Main grid ── */}
        <div className="cr-riepilogo-grid">

          {/* Diagnosi attive */}
          <button className="cr-riepilogo-card cr-riepilogo-card--nav" onClick={() => setCardModal('diagnosi')}>
            <div className="cr-riepilogo-card__title">
              <IcoCartelle /> Diagnosi attive
              <span className="cr-card-edit-icon"><IcoEdit /></span>
            </div>
            {diagnosiMostrate.length === 0
              ? <p className="cr-empty">Nessuna diagnosi attiva.</p>
              : (
                <ul className="cr-compact-list">
                  {diagnosiMostrate.map(d => (
                    <li key={d.id} className="cr-compact-item">
                      <span className="cr-compact-item__main">{d.descrizione}</span>
                      {d.codiceICD && <span className="cr-mono cr-mono--sm">{d.codiceICD}</span>}
                      <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.tipo}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </button>

          {/* Farmaci attivi */}
          <button className="cr-riepilogo-card cr-riepilogo-card--nav" onClick={() => setCardModal('farmaci')}>
            <div className="cr-riepilogo-card__title">
              <IcoPill /> Farmaci attivi
              <span className="cr-card-edit-icon"><IcoEdit /></span>
            </div>
            {farmaciMostrati.length === 0
              ? <p className="cr-empty">Nessun farmaco attivo.</p>
              : (
                <ul className="cr-compact-list">
                  {farmaciMostrati.map(f => (
                    <li key={f.id} className="cr-compact-item cr-compact-item--farmaco">
                      <span className="cr-compact-item__main">{f.nome}</span>
                      <span className="cr-compact-item__dose">{f.dose}</span>
                      <span className="cr-compact-item__sub">{f.frequenza}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </button>

          {/* Ultimi parametri */}
          <button className="cr-riepilogo-card cr-riepilogo-card--nav" onClick={() => setCardModal('parametri')}>
            <div className="cr-riepilogo-card__title">
              <IcoActivity /> Ultimi parametri
              <span className="cr-card-edit-icon"><IcoEdit /></span>
            </div>
            {lastVitali.length === 0
              ? <p className="cr-empty">Nessun parametro rilevato.</p>
              : (
                <div className="vitals-grid vitals-grid--mini">
                  {lastVitali.map(v => (
                    <div key={v.id} className={`vital-card vital-card--mini ${STATO_VITALE_CLASS[v.stato]}`}>
                      <span className="vital-label">{v.etichetta}</span>
                      <span className="vital-value vital-value--mini">{v.valore} <span className="vital-unit">{v.unita}</span></span>
                      <span className="vital-date">{fmtDate(v.rilevato)}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </button>

          {/* Consegne */}
          <button className="cr-riepilogo-card cr-riepilogo-card--nav" onClick={() => setCardModal('consegne')}>
            <div className="cr-riepilogo-card__title">
              <IcoConsegne /> Consegne
              <span className="cr-card-edit-icon"><IcoEdit /></span>
            </div>
            {mieConsegne.filter(c => c.stato !== 'completata').length === 0
              ? <p className="cr-empty">Nessuna consegna aperta.</p>
              : (
                <div className="consegne-list consegne-list--mini">
                  {mieConsegne.filter(c => c.stato !== 'completata').slice(0, 3).map(c => (
                    <div key={c.id} className={`consegna-card consegna-card--mini consegna-card--${c.priorita}`}>
                      <div className="consegna-card__top">
                        <span className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}>{c.priorita}</span>
                        <span className="consegna-tipo">{c.tipo}</span>
                      </div>
                      <p className="consegna-note consegna-note--clamp">{c.note}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </button>

          {/* Allergie */}
          <button className="cr-riepilogo-card cr-riepilogo-card--nav" onClick={() => setCardModal('allergie')}>
            <div className="cr-riepilogo-card__title">
              <IcoWarning /> Allergie
              <span className="cr-card-edit-icon"><IcoEdit /></span>
            </div>
            {cartella.allergie.length === 0
              ? <p className="cr-empty">Nessuna allergia registrata.</p>
              : (
                <ul className="cr-compact-list">
                  {cartella.allergie.slice(0, 3).map(a => (
                    <li key={a.id} className="cr-compact-item">
                      <span className="cr-compact-item__main">{a.allergene}</span>
                      {a.reazione && <span className="cr-compact-item__sub">{a.reazione}</span>}
                      <span className={`badge ${a.gravita === 'grave' ? 'badge--red' : a.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}>{a.gravita}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </button>

          {/* Camera */}
          <button className="cr-riepilogo-card cr-riepilogo-card--nav" onClick={() => setCardModal('camera')}>
            <div className="cr-riepilogo-card__title">
              <IcoBed /> Camera
              <span className="cr-card-edit-icon"><IcoEdit /></span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <div className="cr-compact-item">
                <span className="cr-compact-item__main">Camera</span>
                <span className="cr-compact-item__sub">{cartella.cameraNumero ?? '—'}</span>
              </div>
              <div className="cr-compact-item">
                <span className="cr-compact-item__main">Letto</span>
                <span className="cr-compact-item__sub">{cartella.lettoNumero ?? '—'}</span>
              </div>
              <div className="cr-compact-item">
                <span className="cr-compact-item__main">Stato</span>
                <span className="cr-compact-item__sub">{cartella.statoRicovero.replace('_', ' ')}</span>
              </div>
            </div>
          </button>

        </div>
      </div>
    );
  }

  function renderProfilo() {
    const op = operatori.find(o => o.id === cartella.operatoreId);
    return (
      <div className="cr-tab-content">
        <SectionHeader title="Dati e Contatti"
          onAdd={editProfilo ? undefined : () => {
            setProfiloForm({
              indirizzo: cartella.indirizzo, codiceFiscale: cartella.codiceFiscale,
              contattoEmergenzaNome: cartella.contattoEmergenzaNome,
              contattoEmergenzaTel: cartella.contattoEmergenzaTel,
              contattoEmergenzaRel: cartella.contattoEmergenzaRel,
              medicoCurante: cartella.medicoCurante,
              operatoreId: cartella.operatoreId,
              cameraNumero: cartella.cameraNumero, lettoNumero: cartella.lettoNumero,
              repartoRicovero: cartella.repartoRicovero,
              statoRicovero: cartella.statoRicovero,
              dataRicovero: cartella.dataRicovero,
              noteGenerali: cartella.noteGenerali,
              email: paziente.email ?? '', phone: paziente.phone ?? '',
            });
            setEditProfilo(true);
          }}
          addLabel="Modifica"
        />

        {editProfilo ? (
          <InlineForm onSave={saveProfiloHandler} onCancel={() => setEditProfilo(false)}>
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={profiloForm.email ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Telefono</label>
                <input className="form-input" value={profiloForm.phone ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Indirizzo</label>
                <input className="form-input" value={profiloForm.indirizzo ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, indirizzo: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Codice Fiscale</label>
                <input className="form-input" value={profiloForm.codiceFiscale ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, codiceFiscale: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Contatto emergenza (nome)</label>
                <input className="form-input" value={profiloForm.contattoEmergenzaNome ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, contattoEmergenzaNome: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Contatto emergenza (tel)</label>
                <input className="form-input" value={profiloForm.contattoEmergenzaTel ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, contattoEmergenzaTel: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Relazione</label>
                <input className="form-input" value={profiloForm.contattoEmergenzaRel ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, contattoEmergenzaRel: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Medico curante</label>
                <input className="form-input" value={profiloForm.medicoCurante ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, medicoCurante: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Operatore assegnato</label>
                <select className="form-select" value={profiloForm.operatoreId ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, operatoreId: e.target.value }))}>
                  <option value="">— Nessuno —</option>
                  {operatori.filter(o => o.stato === 'attivo').map(o => (
                    <option key={o.id} value={o.id}>{o.cognome} {o.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Camera</label>
                <select className="form-select" value={profiloForm.cameraNumero ?? ''}
                  onChange={e => {
                    const cam = camere.find(c => c.numero === e.target.value);
                    setProfiloForm(p => ({ ...p, cameraNumero: e.target.value, repartoRicovero: cam?.reparto ?? p.repartoRicovero }));
                  }}>
                  <option value="">— Nessuna —</option>
                  {camere.filter(c => c.stato === 'attiva').map(c => (
                    <option key={c.id} value={c.numero}>{c.numero} — {c.reparto}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Stato ricovero</label>
                <select className="form-select" value={profiloForm.statoRicovero ?? 'ambulatoriale'}
                  onChange={e => setProfiloForm(p => ({ ...p, statoRicovero: e.target.value as CartellaPaziente['statoRicovero'] }))}>
                  <option value="ricoverato">Ricoverato</option>
                  <option value="ambulatoriale">Ambulatoriale</option>
                  <option value="day_hospital">Day Hospital</option>
                  <option value="dimesso">Dimesso</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Data ricovero</label>
                <input className="form-input" type="date" value={profiloForm.dataRicovero ?? ''}
                  onChange={e => setProfiloForm(p => ({ ...p, dataRicovero: e.target.value }))} />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}>
              <label className="form-label">Note generali</label>
              <textarea className="form-input" rows={3} value={profiloForm.noteGenerali ?? ''}
                onChange={e => setProfiloForm(p => ({ ...p, noteGenerali: e.target.value }))} />
            </div>
          </InlineForm>
        ) : (
          <div className="cr-profilo-grid">
            <div className="cr-profilo-group">
              <div className="cr-profilo-group__title">Dati anagrafici</div>
              <div className="cr-profilo-row"><span>Nome</span><strong>{paziente.firstName} {paziente.lastName}</strong></div>
              <div className="cr-profilo-row"><span>Data nascita</span><strong>{fmtDate(paziente.dateOfBirth)} · {calcAge(paziente.dateOfBirth)} anni</strong></div>
              <div className="cr-profilo-row"><span>Sesso</span><strong>{paziente.sex ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>Codice Fiscale</span><strong className="cr-mono">{cartella.codiceFiscale ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>MRN</span><strong className="cr-mono">{paziente.medicalRecordNumber}</strong></div>
            </div>
            <div className="cr-profilo-group">
              <div className="cr-profilo-group__title">Contatti</div>
              <div className="cr-profilo-row"><span>Email</span><strong>{paziente.email ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>Telefono</span><strong>{paziente.phone ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>Indirizzo</span><strong>{cartella.indirizzo ?? '—'}</strong></div>
            </div>
            <div className="cr-profilo-group">
              <div className="cr-profilo-group__title">Contatto emergenza</div>
              <div className="cr-profilo-row"><span>Nome</span><strong>{cartella.contattoEmergenzaNome ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>Telefono</span><strong>{cartella.contattoEmergenzaTel ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>Relazione</span><strong>{cartella.contattoEmergenzaRel ?? '—'}</strong></div>
            </div>
            <div className="cr-profilo-group">
              <div className="cr-profilo-group__title">Assegnazione clinica</div>
              <div className="cr-profilo-row"><span>Stato</span><span className={`stato-pill stato-pill--${cartella.statoRicovero === 'ricoverato' ? 'attivo' : 'inattivo'}`}>{cartella.statoRicovero.replace('_', ' ')}</span></div>
              <div className="cr-profilo-row"><span>Reparto</span><strong>{cartella.repartoRicovero ?? '—'}</strong></div>
              <div className="cr-profilo-row"><span>Camera / Letto</span><strong>{cartella.cameraNumero ?? '—'} {cartella.lettoNumero ? `/ L.${cartella.lettoNumero}` : ''}</strong></div>
              <div className="cr-profilo-row"><span>Operatore</span><strong>{op ? `${op.cognome} ${op.nome}` : '—'}</strong></div>
              <div className="cr-profilo-row"><span>Medico curante</span><strong>{cartella.medicoCurante ?? '—'}</strong></div>
              {cartella.dataRicovero && <div className="cr-profilo-row"><span>Data ricovero</span><strong>{fmtDate(cartella.dataRicovero)}</strong></div>}
            </div>
            {cartella.noteGenerali && (
              <div className="cr-profilo-group cr-profilo-group--full">
                <div className="cr-profilo-group__title">Note generali</div>
                <p className="cr-note-text">{cartella.noteGenerali}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderAnamnesi() {
    const a = editAnamnesi ? anamnesiForm : cartella.anamnesi;

    type ASection = { key: keyof typeof a; label: string; rows?: number; placeholder?: string };
    const sections: ASection[] = [
      { key: 'patologicaProssima', label: 'Anamnesi generale', rows: 5, placeholder: 'Motivo del ricovero, storia recente della malattia…' },
      { key: 'patologicaRemota',   label: 'Patologie note e interventi pregressi', rows: 4, placeholder: 'Patologie croniche, interventi chirurgici, ricoveri precedenti…' },
      { key: 'familiare',          label: 'Anamnesi familiare', rows: 3, placeholder: 'Patologie familiari rilevanti…' },
      { key: 'fisiologica',        label: 'Stato funzionale', rows: 3, placeholder: 'Condizioni basali, autonomia, funzioni vitali di base…' },
      { key: 'lavorativa',         label: 'Contesto lavorativo e sociale', rows: 3, placeholder: 'Professione, situazione familiare, rete di supporto…' },
      { key: 'abitudini',          label: 'Abitudini e stile di vita', rows: 3, placeholder: 'Fumo, alcol, attività fisica, alimentazione…' },
      { key: 'note',               label: 'Note aggiuntive', rows: 3, placeholder: 'Informazioni aggiuntive non categorizzate…' },
    ];

    const hasAllergie = cartella.allergie.length > 0;
    const allergieGravi = cartella.allergie.filter(al => al.gravita === 'grave');

    return (
      <div className="cr-tab-content">
        <div className="cr-section-header">
          <span className="cr-section-title">Anamnesi</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editAnamnesi && (
              <button className="btn-secondary btn-sm" onClick={() => { setAnamnesiForm({ ...cartella.anamnesi }); setEditAnamnesi(true); }}>
                <IcoEdit /> Modifica
              </button>
            )}
            {editAnamnesi && (
              <>
                <button className="btn-secondary btn-sm" onClick={() => setEditAnamnesi(false)}>Annulla</button>
                <button className="btn-primary btn-sm" onClick={() => {
                  upd({ anamnesi: { ...anamnesiForm, updatedAt: nowISO(), operatore: operatoreNome } });
                  setEditAnamnesi(false);
                }}><IcoCheck /> Salva</button>
              </>
            )}
          </div>
        </div>

        <div className="cr-anamnesi-cards">
          {/* Allergie — read-only, sempre visibile */}
          <div className={`cr-anamnesi-card${allergieGravi.length > 0 ? ' cr-anamnesi-card--allergie-grave' : hasAllergie ? ' cr-anamnesi-card--allergie' : ''}`}>
            <div className="cr-anamnesi-card__label">Allergie</div>
            {hasAllergie ? (
              <div className="cr-anamnesi-allergie-list">
                {cartella.allergie.map((al, i) => (
                  <div key={i} className="cr-anamnesi-allergia">
                    <span className="cr-anamnesi-allergia__nome">{al.allergene}</span>
                    {al.reazione && <span className="cr-anamnesi-allergia__reazione">{al.reazione}</span>}
                    <span className={`badge ${al.gravita === 'grave' ? 'badge--red' : al.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}>{al.gravita}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="cr-anamnesi-card__text muted">Nessuna allergia registrata. Gestisci dal tab Diagnosi.</p>
            )}
          </div>

          {/* Sezioni anamnesi modificabili */}
          {sections.map(({ key, label, rows = 4, placeholder }) => {
            const val = String(a[key] ?? '');
            const isEmpty = !val;
            return (
              <div key={key} className={`cr-anamnesi-card${editAnamnesi ? ' editing' : ''}${isEmpty && !editAnamnesi ? ' empty' : ''}`}>
                <div className="cr-anamnesi-card__label">{label}</div>
                {editAnamnesi ? (
                  <textarea
                    className="form-input cr-anamnesi-card__textarea"
                    rows={rows}
                    value={val}
                    onChange={e => setAnamnesiForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder ?? `Inserire ${label.toLowerCase()}…`}
                  />
                ) : (
                  <p className={`cr-anamnesi-card__text${isEmpty ? ' muted' : ''}`}>
                    {isEmpty ? 'Non compilato' : val}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {cartella.anamnesi.updatedAt && !editAnamnesi && (
          <p className="cr-update-info">Aggiornato: {fmtDateTime(cartella.anamnesi.updatedAt)} — {cartella.anamnesi.operatore}</p>
        )}
      </div>
    );
  }

  function renderDiagnosi() {
    return (
      <div className="cr-tab-content">
        {/* Diagnosi */}
        <SectionHeader title="Diagnosi / Lista Problemi" onAdd={() => { setDiagForm({}); setShowAddDiag(true); }} />
        {showAddDiag && (
          <InlineForm onSave={addDiagnosi} onCancel={() => { setShowAddDiag(false); setDiagForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Descrizione *</label>
                <input className="form-input" value={diagForm.descrizione ?? ''} onChange={e => setDiagForm(p => ({ ...p, descrizione: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Codice ICD</label>
                <input className="form-input" value={diagForm.codiceICD ?? ''} placeholder="I10, E11…" onChange={e => setDiagForm(p => ({ ...p, codiceICD: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={diagForm.tipo ?? 'principale'} onChange={e => setDiagForm(p => ({ ...p, tipo: e.target.value as Diagnosi['tipo'] }))}>
                  <option value="principale">Principale</option><option value="secondaria">Secondaria</option>
                  <option value="comorbidita">Comorbidità</option><option value="differenziale">Differenziale</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Stato</label>
                <select className="form-select" value={diagForm.stato ?? 'attiva'} onChange={e => setDiagForm(p => ({ ...p, stato: e.target.value as Diagnosi['stato'] }))}>
                  <option value="attiva">Attiva</option><option value="monitoraggio">Monitoraggio</option>
                  <option value="sospetta">Sospetta</option><option value="risolta">Risolta</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Data insorgenza</label>
                <input className="form-input" type="date" value={diagForm.dataInsorgenza ?? todayStr()} onChange={e => setDiagForm(p => ({ ...p, dataInsorgenza: e.target.value }))} />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}>
              <label className="form-label">Note</label>
              <textarea className="form-input" rows={2} value={diagForm.note ?? ''} onChange={e => setDiagForm(p => ({ ...p, note: e.target.value }))} />
            </div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.diagnosi.length === 0 && <p className="cr-empty">Nessuna diagnosi registrata.</p>}
          {cartella.diagnosi.map(d => editDiagId === d.id ? (
            <InlineForm key={d.id} onSave={() => updateDiagnosi(d.id)} onCancel={() => { setEditDiagId(null); setDiagForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Descrizione</label>
                  <input className="form-input" value={diagForm.descrizione ?? ''} onChange={e => setDiagForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Codice ICD</label>
                  <input className="form-input" value={diagForm.codiceICD ?? ''} onChange={e => setDiagForm(p => ({ ...p, codiceICD: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Tipo</label>
                  <select className="form-select" value={diagForm.tipo ?? d.tipo} onChange={e => setDiagForm(p => ({ ...p, tipo: e.target.value as Diagnosi['tipo'] }))}>
                    <option value="principale">Principale</option><option value="secondaria">Secondaria</option>
                    <option value="comorbidita">Comorbidità</option><option value="differenziale">Differenziale</option>
                  </select></div>
                <div className="form-field"><label className="form-label">Stato</label>
                  <select className="form-select" value={diagForm.stato ?? d.stato} onChange={e => setDiagForm(p => ({ ...p, stato: e.target.value as Diagnosi['stato'] }))}>
                    <option value="attiva">Attiva</option><option value="monitoraggio">Monitoraggio</option>
                    <option value="sospetta">Sospetta</option><option value="risolta">Risolta</option>
                  </select></div>
                <div className="form-field"><label className="form-label">Data risoluzione</label>
                  <input className="form-input" type="date" value={diagForm.dataRisoluzione ?? ''} onChange={e => setDiagForm(p => ({ ...p, dataRisoluzione: e.target.value }))} /></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note</label>
                <textarea className="form-input" rows={2} value={diagForm.note ?? ''} onChange={e => setDiagForm(p => ({ ...p, note: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={d.id} onEdit={() => { setEditDiagId(d.id); setDiagForm({ ...d }); }} onDelete={() => deleteDiagnosi(d.id)}>
              <div className="cr-diag-row">
                <div className="cr-diag-main">
                  <span className="cr-diag-desc">{d.descrizione}</span>
                  {d.codiceICD && <span className="cr-mono cr-icd">{d.codiceICD}</span>}
                  <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.stato}</span>
                  <span className="badge badge--gray">{d.tipo}</span>
                </div>
                {d.note && <p className="cr-diag-note">{d.note}</p>}
                <span className="cr-diag-meta">{fmtDate(d.dataInsorgenza)} · {d.operatore}{d.dataRisoluzione ? ` → risolta ${fmtDate(d.dataRisoluzione)}` : ''}</span>
              </div>
            </ItemRow>
          ))}
        </div>

        {/* Rischi */}
        <SectionHeader title="Indicatori di Rischio" onAdd={() => { setRiskForm({}); setShowAddRisk(true); }} />
        {showAddRisk && (
          <InlineForm onSave={addRischio} onCancel={() => { setShowAddRisk(false); setRiskForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Tipo</label>
                <select className="form-select" value={riskForm.tipo ?? 'altro'} onChange={e => setRiskForm(p => ({ ...p, tipo: e.target.value as IndicatoreRischio['tipo'] }))}>
                  <option value="caduta">Caduta</option><option value="lesioni_pressione">Lesioni pressione</option>
                  <option value="nutrizione">Nutrizione</option><option value="sepsi">Sepsi</option>
                  <option value="trombosi">Trombosi</option><option value="dolore">Dolore</option><option value="altro">Altro</option>
                </select></div>
              <div className="form-field"><label className="form-label">Livello</label>
                <select className="form-select" value={riskForm.livello ?? 'basso'} onChange={e => setRiskForm(p => ({ ...p, livello: e.target.value as IndicatoreRischio['livello'] }))}>
                  <option value="basso">Basso</option><option value="medio">Medio</option>
                  <option value="alto">Alto</option><option value="critico">Critico</option>
                </select></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione *</label>
              <textarea className="form-input" rows={2} value={riskForm.descrizione ?? ''} onChange={e => setRiskForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.indicatoriRischio.length === 0 && <p className="cr-empty">Nessun indicatore di rischio.</p>}
          {cartella.indicatoriRischio.map(r => editRiskId === r.id ? (
            <InlineForm key={r.id} onSave={() => updateRischio(r.id)} onCancel={() => { setEditRiskId(null); setRiskForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Tipo</label>
                  <select className="form-select" value={riskForm.tipo ?? r.tipo} onChange={e => setRiskForm(p => ({ ...p, tipo: e.target.value as IndicatoreRischio['tipo'] }))}>
                    <option value="caduta">Caduta</option><option value="lesioni_pressione">Lesioni pressione</option>
                    <option value="nutrizione">Nutrizione</option><option value="sepsi">Sepsi</option>
                    <option value="trombosi">Trombosi</option><option value="dolore">Dolore</option><option value="altro">Altro</option>
                  </select></div>
                <div className="form-field"><label className="form-label">Livello</label>
                  <select className="form-select" value={riskForm.livello ?? r.livello} onChange={e => setRiskForm(p => ({ ...p, livello: e.target.value as IndicatoreRischio['livello'] }))}>
                    <option value="basso">Basso</option><option value="medio">Medio</option>
                    <option value="alto">Alto</option><option value="critico">Critico</option>
                  </select></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione</label>
                <textarea className="form-input" rows={2} value={riskForm.descrizione ?? ''} onChange={e => setRiskForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={r.id} onEdit={() => { setEditRiskId(r.id); setRiskForm({ ...r }); }} onDelete={() => deleteRischio(r.id)}>
              <div className="cr-risk-row">
                <span className={`badge ${RISCHIO_CLASS[r.livello]}`}>{r.livello.toUpperCase()}</span>
                <span className="cr-risk-tipo">{r.tipo.replace('_', ' ')}</span>
                <span className="cr-risk-desc">{r.descrizione}</span>
                <span className="cr-diag-meta">{fmtDate(r.dataValutazione)} · {r.operatore}</span>
              </div>
            </ItemRow>
          ))}
        </div>
      </div>
    );
  }

  // renderTerapie replaced by TerapiaMedicaTab component

  function renderNote() {
    return (
      <div className="cr-tab-content">
        {/* Note cliniche */}
        <SectionHeader title="Note Cliniche" onAdd={() => { setNotaForm({}); setShowAddNota(true); }} />
        {showAddNota && (
          <InlineForm onSave={addNota} onCancel={() => { setShowAddNota(false); setNotaForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Tipo</label>
                <select className="form-select" value={notaForm.tipo ?? 'clinica'} onChange={e => setNotaForm(p => ({ ...p, tipo: e.target.value as NotaClinica['tipo'] }))}>
                  <option value="clinica">Clinica</option><option value="nursing">Nursing</option>
                  <option value="dietetica">Dietetica</option><option value="psicologica">Psicologica</option>
                  <option value="fisioterapia">Fisioterapia</option><option value="altra">Altra</option>
                </select></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Contenuto *</label>
              <textarea className="form-input" rows={4} value={notaForm.contenuto ?? ''} onChange={e => setNotaForm(p => ({ ...p, contenuto: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.noteClinica.length === 0 && <p className="cr-empty">Nessuna nota clinica.</p>}
          {cartella.noteClinica.map(n => editNotaId === n.id ? (
            <InlineForm key={n.id} onSave={() => updateNota(n.id)} onCancel={() => { setEditNotaId(null); setNotaForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Tipo</label>
                  <select className="form-select" value={notaForm.tipo ?? n.tipo} onChange={e => setNotaForm(p => ({ ...p, tipo: e.target.value as NotaClinica['tipo'] }))}>
                    <option value="clinica">Clinica</option><option value="nursing">Nursing</option>
                    <option value="dietetica">Dietetica</option><option value="psicologica">Psicologica</option>
                    <option value="fisioterapia">Fisioterapia</option><option value="altra">Altra</option>
                  </select></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Contenuto</label>
                <textarea className="form-input" rows={4} value={notaForm.contenuto ?? n.contenuto} onChange={e => setNotaForm(p => ({ ...p, contenuto: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={n.id} onEdit={() => { setEditNotaId(n.id); setNotaForm({ ...n }); }} onDelete={() => deleteNota(n.id)}>
              <div className="cr-nota-row">
                <div className="cr-nota-header">
                  <span className="badge badge--gray">{n.tipo}</span>
                  <span className="cr-diag-meta">{fmtDateTime(n.createdAt)} · {n.operatore}</span>
                </div>
                <p className="cr-nota-text">{n.contenuto}</p>
              </div>
            </ItemRow>
          ))}
        </div>

        {/* Visite */}
        <SectionHeader title="Storico Visite" onAdd={() => { setVisitaForm({}); setShowAddVisita(true); }} />
        {showAddVisita && (
          <InlineForm onSave={addVisita} onCancel={() => { setShowAddVisita(false); setVisitaForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Tipo visita</label>
                <input className="form-input" value={visitaForm.tipo ?? ''} placeholder="Visita cardiologica…" onChange={e => setVisitaForm(p => ({ ...p, tipo: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Data</label>
                <input className="form-input" type="date" value={visitaForm.data ?? todayStr()} onChange={e => setVisitaForm(p => ({ ...p, data: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Ora</label>
                <input className="form-input" type="time" value={visitaForm.ora ?? ''} onChange={e => setVisitaForm(p => ({ ...p, ora: e.target.value }))} /></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione *</label>
              <textarea className="form-input" rows={3} value={visitaForm.descrizione ?? ''} onChange={e => setVisitaForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Esito</label>
              <textarea className="form-input" rows={2} value={visitaForm.esito ?? ''} onChange={e => setVisitaForm(p => ({ ...p, esito: e.target.value }))} /></div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Follow-up</label>
              <input className="form-input" value={visitaForm.followUp ?? ''} onChange={e => setVisitaForm(p => ({ ...p, followUp: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.visite.length === 0 && <p className="cr-empty">Nessuna visita registrata.</p>}
          {cartella.visite.map(v => editVisitaId === v.id ? (
            <InlineForm key={v.id} onSave={() => updateVisita(v.id)} onCancel={() => { setEditVisitaId(null); setVisitaForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Tipo</label><input className="form-input" value={visitaForm.tipo ?? v.tipo} onChange={e => setVisitaForm(p => ({ ...p, tipo: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Data</label><input className="form-input" type="date" value={visitaForm.data ?? v.data} onChange={e => setVisitaForm(p => ({ ...p, data: e.target.value }))} /></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione</label>
                <textarea className="form-input" rows={3} value={visitaForm.descrizione ?? v.descrizione} onChange={e => setVisitaForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Esito</label>
                <textarea className="form-input" rows={2} value={visitaForm.esito ?? v.esito} onChange={e => setVisitaForm(p => ({ ...p, esito: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={v.id} onEdit={() => { setEditVisitaId(v.id); setVisitaForm({ ...v }); }} onDelete={() => deleteVisita(v.id)}>
              <div className="cr-visita-row">
                <div className="cr-visita-header">
                  <span className="cr-visita-tipo">{v.tipo}</span>
                  <span className="cr-diag-meta">{fmtDate(v.data)}{v.ora ? ` ${v.ora}` : ''} · {v.operatore}</span>
                </div>
                <p className="cr-nota-text">{v.descrizione}</p>
                {v.esito && <p className="cr-visita-esito">{v.esito}</p>}
                {v.followUp && <p className="cr-diag-note">Follow-up: {v.followUp}</p>}
              </div>
            </ItemRow>
          ))}
        </div>
      </div>
    );
  }

  // renderParametri replaced by ParametriTab component

  function renderConsegne() {
    return (
      <div className="cr-tab-content">
        <SectionHeader title="Consegne" onAdd={() => setShowAddConsegna(v => !v)} />
        {showAddConsegna && (
          <InlineForm onSave={salvaConsegna} onCancel={() => setShowAddConsegna(false)}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Tipo</label>
                <select className="form-select" value={consegnaForm.tipo} onChange={e => setConsegnaForm(p => ({ ...p, tipo: e.target.value }))}>
                  {TIPO_CONSEGNA_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="form-field"><label className="form-label">Priorità</label>
                <select className="form-select" value={consegnaForm.priorita} onChange={e => setConsegnaForm(p => ({ ...p, priorita: e.target.value as PrioritaConsegna }))}>
                  {PRIORITA_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select></div>
              <div className="form-field"><label className="form-label">Ora scadenza</label>
                <input className="form-input" type="time" value={consegnaForm.oraScadenza} onChange={e => setConsegnaForm(p => ({ ...p, oraScadenza: e.target.value }))} /></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note *</label>
              <textarea className="form-input" rows={3} value={consegnaForm.note} onChange={e => setConsegnaForm(p => ({ ...p, note: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="consegne-list">
          {mieConsegne.length === 0 ? (
            <p className="cr-empty">Nessuna consegna per questo paziente.</p>
          ) : mieConsegne.map(c => (
            <div key={c.id} className={`consegna-card consegna-card--${c.priorita}`}>
              <div className="consegna-card__top">
                <span className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}>{c.priorita}</span>
                <span className="consegna-tipo">{c.tipo}</span>
                {c.oraScadenza && <span className="consegna-scadenza">⏰ {c.oraScadenza}</span>}
                <span className={`stato-pill stato-pill--consegna-${c.stato}`}>{c.stato.replace('_', ' ')}</span>
              </div>
              <p className="consegna-note">{c.note}</p>
              <div className="consegna-card__footer">
                <span className="consegna-assegnato">→ {c.operatoreAssegnato}</span>
                {c.stato !== 'completata' && (
                  <div className="table-actions">
                    {c.stato === 'aperta' && (
                      <button className="btn-secondary btn-sm" onClick={() => onUpdateConsegnaStato(c.id, 'in_corso')}>Prendi in carico</button>
                    )}
                    <button className="icon-btn icon-btn--sm icon-btn--success" onClick={() => onUpdateConsegnaStato(c.id, 'completata')}><IcoCheck /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Tab badges ─────────────────────────────────────────────────────────────

  const TAB_BADGES: Partial<Record<TabId, number>> = {
    diagnosi:    diagnosiAttive.length,
    terapie:     farmaciAttivi.length,
    'diario-inf': (cartella.diarioInfermieristico ?? []).length || 0,
    'diario-med': (cartella.diarioMedico ?? []).length || 0,
    medicazioni: (cartella.medicazioniFerite ?? []).length || 0,
    contenzioni: (cartella.contenzioni ?? []).filter(c => c.attiva).length || 0,
    documenti:   (cartella.documentiConsegnati ?? []).length || 0,
    consegne:    mieConsegne.filter(c => c.stato !== 'completata').length,
  };

  // Group badges: sum of badges within group
  function groupBadge(gId: TabGroup): number {
    const g = TAB_GROUPS.find(x => x.id === gId);
    if (!g) return 0;
    return g.tabs.reduce((sum, t) => sum + (TAB_BADGES[t.id] ?? 0), 0);
  }

  const activeGroup = TAB_GROUPS.find(g => g.id === tabGroup) ?? TAB_GROUPS[0];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="patient-record-view">
      {/* Breadcrumb */}
      <div className="cr-breadcrumb">
        <button className="btn-back cr-breadcrumb-btn" onClick={onBack}><IcoChevronLeft /> Pazienti</button>
      </div>

      {/* Patient Header Card */}
      <div className="cr-header">
        <div className="cr-header__patient">
          <div className="cr-pt-avatar" aria-hidden="true">
            {paziente.firstName[0]}{paziente.lastName[0]}
          </div>
          <div className="cr-header__info">
            <div className="cr-header__name-row">
              <h2 className="cr-header__name">{paziente.lastName}, {paziente.firstName}</h2>
              <span className={`stato-pill stato-pill--${cartella.statoRicovero === 'ricoverato' ? 'attivo' : 'inattivo'}`}>
                {cartella.statoRicovero.replace('_', ' ')}
              </span>
              {mieConsegne.some(c => c.stato !== 'completata' && c.priorita === 'urgente') && (
                <span className="badge badge--red cr-badge-sm">Urgente</span>
              )}
            </div>
            <div className="cr-header__meta">
              <span className="mrn-tag">{paziente.medicalRecordNumber}</span>
              <span className="cr-meta-sep">·</span>
              <span>{calcAge(paziente.dateOfBirth)} anni · {paziente.sex ?? '—'}</span>
              {cartella.cameraNumero && (
                <>
                  <span className="cr-meta-sep">·</span>
                  <span className="cr-room-tag"><IcoBed /> Cam. {cartella.cameraNumero}{cartella.lettoNumero ? ` / L.${cartella.lettoNumero}` : ''}</span>
                </>
              )}
              {hasAllergie && (
                <>
                  <span className="cr-meta-sep">·</span>
                  <span className="cr-header__allergy-inline">
                    <IcoShield />
                    {allergieGravi.map(a => (
                      <span key={a.id} className="badge badge--red cr-badge-sm">{a.allergene}</span>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grouped nav (L1 — page tabs) */}
      <PageTabs
        groups={TAB_GROUPS.map((g): PageTabGroup => ({
          id: g.id,
          label: g.label,
          badge: groupBadge(g.id) || undefined,
        }))}
        activeId={tabGroup}
        onChange={(id) => switchGroup(id as TabGroup)}
        className="no-print"
      />

      {/* Sub-tab bar (L2 — section tabs) */}
      <SectionTabs
        tabs={activeGroup.tabs.map((t): SectionTab => ({
          id: t.id,
          label: t.label,
          badge: TAB_BADGES[t.id] || undefined,
          urgent: t.id === 'consegne' && mieConsegne.some(c => c.priorita === 'urgente' && c.stato !== 'completata'),
        }))}
        activeId={tab}
        onChange={(id) => switchTab(id as TabId)}
        className="no-print"
      />

      {/* Tab content */}
      {tab === 'riepilogo'       && renderRiepilogo()}
      {tab === 'profilo'         && renderProfilo()}
      {tab === 'anamnesi'        && renderAnamnesi()}
      {tab === 'diagnosi'        && renderDiagnosi()}
      {tab === 'terapie'         && (
        <TerapiaMedicaTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'note'            && renderNote()}
      {tab === 'parametri'       && (
        <ParametriTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'consegne'        && renderConsegne()}
      {tab === 'presa-in-carico' && (
        <PresaInCaricoTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'documenti' && (
        <DocumentiTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'diario-inf' && (
        <DiarioTab cartella={cartella} paziente={paziente} tipo="infermieristico" onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'diario-med' && (
        <DiarioTab cartella={cartella} paziente={paziente} tipo="medico" onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'medicazioni' && (
        <MedicazioniTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'contenzioni' && (
        <ContenzioniTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'braden' && (
        <ScalaBradenTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}
      {tab === 'dimissione' && (
        <DimissioneTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
      )}

      {cardModal === 'diagnosi'  && renderDiagnosiModal()}
      {cardModal === 'farmaci'   && renderFarmaciModal()}
      {cardModal === 'parametri' && renderParametriModal()}
      {cardModal === 'consegne'  && renderConsegneModal()}
      {cardModal === 'allergie'  && renderAllergieModal()}
      {cardModal === 'camera'    && renderCameraModal()}
    </div>
  );
}

