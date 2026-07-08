import { useState, useEffect, useRef } from 'react';
import type {
  Paziente, Consegna, Operatore, Camera, CartellaPaziente,
  NotaClinica,
  VisitaRecord, IndicatoreRischio,
  PrioritaConsegna, VitaleItem,
} from '../../types';
import {
  IcoEdit, IcoCheck, IcoX, IcoPlus,
  IcoWarning, IcoActivity, IcoPill, IcoConsegne, IcoBed,
  IcoCartelle,
} from '../../icons';
import { PresaInCaricoTab } from './cartella/PresaInCaricoTab';
import { DocumentiTab } from './cartella/DocumentiTab';
import { NarrativeSectionsTab } from './cartella/NarrativeSectionsTab';
import { DiarioPazienteTab, DIARIO_AUTHOR_FILTERS } from './cartella/DiarioPazienteTab';
import { MedicazioniTab } from './cartella/MedicazioniTab';
import { ContenzioniTab } from './cartella/ContenzioniTab';
import { ScalaBradenTab } from './cartella/ScalaBradenTab';
import { ScalaTinettiTab } from './cartella/ScalaTinettiTab';
import { DimissioneTab } from './cartella/DimissioneTab';
import { EsamiConsulenzeTab } from './cartella/EsamiConsulenzeTab';
import { TopNav } from '../navigation/TopNav';
import PatientCompactHeader from './PatientCompactHeader';
import InvioPSModal from './InvioPSModal';
import { ClinicalTableSection } from './cartella/shared';
import { AllergiesEditor } from './sections/AllergiesEditor';
import { DiagnosisEditor } from './sections/DiagnosisEditor';
import { TherapyEditor } from './sections/TherapyEditor';
import { VitalSignsEditor } from './sections/VitalSignsEditor';
import { PainAssessmentEditor } from './sections/PainAssessmentEditor';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | 'riepilogo' | 'profilo' | 'diagnosi' | 'terapia-farmacologica'
  | 'note' | 'parametri' | 'consegne'
  | 'presa-in-carico' | 'documenti' | 'diario' | 'sezioni-narrative'
  | 'medicazioni' | 'contenzioni' | 'braden' | 'tinetti' | 'nrs' | 'dimissione'
  | 'esami-consulenze';

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
      { id: 'sezioni-narrative', label: 'Sezioni Cliniche (testo)' },
      { id: 'diagnosi',        label: 'Diagnosi' },
      { id: 'terapia-farmacologica', label: 'Terapia Farmacologica' },
      { id: 'parametri',       label: 'Parametri Vitali' },
      { id: 'note',            label: 'Note & Visite' },
      { id: 'esami-consulenze', label: 'Esami & Consulenze' },
    ],
  },
  {
    id: 'diario', label: 'Diario',
    tabs: [
      { id: 'diario', label: 'Diario Paziente' },
    ],
  },
  {
    id: 'moduli', label: 'Moduli',
    tabs: [
      { id: 'medicazioni', label: 'Medicazioni' },
      { id: 'contenzioni', label: 'Contenzioni' },
      { id: 'braden',      label: 'Scala Braden' },
      { id: 'tinetti',     label: 'Scala Tinetti' },
      { id: 'nrs',         label: 'Scala NRS' },
      { id: 'dimissione',  label: 'Dimissione' },
    ],
  },
  {
    id: 'documenti', label: 'Documenti',
    tabs: [{ id: 'documenti', label: 'Documenti' }],
  },
];

// findGroupForTab removed — sidebar nav doesn't need group tracking

interface PatientDetailProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  consegne: Consegna[];
  operatori: Operatore[];
  camere: Camera[];
  onBack: () => void;
  backLabel?: string;
  onAddConsegna: (c: Omit<Consegna, 'id' | 'createdAt'>) => void;
  onUpdateConsegnaStato: (id: string, stato: Consegna['stato']) => void;
  onUpdateCartella: (pazienteId: string, updates: Partial<CartellaPaziente>) => void | Promise<boolean>;
  onUpdatePaziente: (id: string, updates: Partial<Pick<Paziente, 'email' | 'phone'>>) => void;
  onAssignCamera: (pazienteId: string, cameraNumero?: string, lettoNumero?: string) => Promise<{ ok: boolean; lettoLabel?: string }>;
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

// SectionHeader removed — all sections now use ClinicalTableSection

// ── Inline form wrapper ────────────────────────────────────────────────────────

function InlineForm({ onSave, onCancel, saving = false, children }: { onSave: () => void; onCancel: () => void; saving?: boolean; children: React.ReactNode }) {
  return (
    <div className="cr-inline-form">
      {children}
      <div className="cr-inline-form__actions">
        <button className="btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Annulla</button>
        <button className="btn-primary btn-sm" onClick={onSave} disabled={saving}><IcoCheck /> {saving ? 'Salvataggio…' : 'Salva'}</button>
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
  onUpdateCartella, onUpdatePaziente, onAssignCamera,
  operatoreNome,
}: PatientDetailProps) {
  const [tab, setTab] = useState<TabId>('riepilogo');
  const [activeGroup, setActiveGroup] = useState<TabGroup>(
    () => TAB_GROUPS.find(g => g.tabs.some(t => t.id === 'riepilogo'))?.id ?? 'panoramica'
  );
  const [diarioFilter, setDiarioFilter] = useState<string>('tutti');

  useEffect(() => {
    setTab('riepilogo');
    setActiveGroup(TAB_GROUPS.find(g => g.tabs.some(t => t.id === 'riepilogo'))?.id ?? 'panoramica');
    setDiarioFilter('tutti');
  }, [paziente.id]);

  function switchTab(tabId: TabId) {
    setTab(tabId);
  }

  function switchGroup(groupId: TabGroup) {
    const group = TAB_GROUPS.find(g => g.id === groupId);
    if (!group) return;
    setActiveGroup(groupId);
    if (!group.tabs.some(t => t.id === tab)) {
      setTab(group.tabs[0].id);
    }
  }

  // ── Per-section CRUD state ─────────────────────────────────────────────────

  // Profilo edit
  const [editProfilo, setEditProfilo] = useState(false);
  const [profiloForm, setProfiloForm] = useState<Partial<CartellaPaziente & Pick<Paziente, 'email' | 'phone'>>>({});
  // Feature 010: L3 sub-tabs for Profilo (FR-005)
  const [profiloL3, setProfiloL3] = useState<'anagrafica' | 'contatti' | 'emergenza' | 'assegnazione'>('anagrafica');

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

  // Allergie CRUD — managed by AllergiesEditor (controlled)
  // Diagnosi CRUD — managed by DiagnosisEditor (controlled)

  // Parametri modal quick-add
  const [modalVitaleShow, setModalVitaleShow] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<Partial<VitaleItem>>({});

  // Consegne modal quick-add
  const [modalConsegnaShow, setModalConsegnaShow] = useState(false);
  const [modalConsegnaForm, setModalConsegnaForm] = useState({ tipo: 'Monitoraggio', priorita: 'normale' as PrioritaConsegna, note: '', oraScadenza: '' });

  // Camera modal
  const [cameraEditing, setCameraEditing] = useState(false);
  const [cameraModalForm, setCameraModalForm] = useState<Partial<CartellaPaziente>>({});

  // Invio in PS modal
  const [showInvioPS, setShowInvioPS] = useState(false);

  // ── Computed ───────────────────────────────────────────────────────────────

  const mieConsegne = consegne.filter(c => c.pazienteId === paziente.id);
  const allergieGravi = cartella.allergie.filter(a => a.gravita === 'grave');
  const hasAllergie = allergieGravi.length > 0;
  const diagnosiAttive = cartella.diagnosi.filter(d => d.stato === 'attiva');
  const farmaciAttivi = cartella.farmaci.filter(f => f.stato === 'attivo');
  const rischioAlto = cartella.indicatoriRischio.filter(r => r.livello === 'alto' || r.livello === 'critico');
  // Issue #128: proponi solo camere con almeno un letto libero (o già occupate da questo paziente)
  const camereAssegnabili = camere.filter(c =>
    c.stato === 'attiva' && c.letti.some(l => l.stato === 'libero' || l.pazienteId === paziente.id)
  );

  // ── Update helpers ─────────────────────────────────────────────────────────

  // T030 (SPEC-015 US5 / FR-018): stato di salvataggio condiviso — disabilita i
  // pulsanti Salva durante la richiesta ed evita il doppio submit. L'esito è
  // visibile tramite il toast di App (successo/errore); in caso di errore i form
  // restano aperti per riprovare.
  const [saving, setSaving] = useState(false);

  function upd(updates: Partial<CartellaPaziente>): void | Promise<boolean> {
    return onUpdateCartella(cartella.pazienteId, updates);
  }

  async function updConEsito(updates: Partial<CartellaPaziente>): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      const res = await Promise.resolve(upd(updates));
      return res !== false;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Rischi
  function saveRischi(list: IndicatoreRischio[]) { return updConEsito({ indicatoriRischio: list }); }
  async function addRischio() {
    if (!riskForm.descrizione) return;
    const ok = await saveRischi([{ id: uid(), tipo: 'altro', livello: 'basso', descrizione: '', dataValutazione: todayStr(), operatore: operatoreNome, ...riskForm } as IndicatoreRischio, ...cartella.indicatoriRischio]);
    if (ok) { setShowAddRisk(false); setRiskForm({}); }
  }
  async function updateRischio(id: string) {
    const ok = await saveRischi(cartella.indicatoriRischio.map(r => r.id === id ? { ...r, ...riskForm } : r));
    if (ok) { setEditRiskId(null); setRiskForm({}); }
  }
  function deleteRischio(id: string) { saveRischi(cartella.indicatoriRischio.filter(r => r.id !== id)); }

  // Note cliniche
  function saveNoteClinica(list: NotaClinica[]) { return updConEsito({ noteClinica: list }); }
  async function addNota() {
    if (!notaForm.contenuto) return;
    const ok = await saveNoteClinica([{ id: uid(), tipo: 'clinica', contenuto: '', operatore: operatoreNome, createdAt: nowISO(), ...notaForm } as NotaClinica, ...cartella.noteClinica]);
    if (ok) { setShowAddNota(false); setNotaForm({}); }
  }
  async function updateNota(id: string) {
    const ok = await saveNoteClinica(cartella.noteClinica.map(n => n.id === id ? { ...n, ...notaForm, updatedAt: nowISO() } : n));
    if (ok) { setEditNotaId(null); setNotaForm({}); }
  }
  function deleteNota(id: string) { saveNoteClinica(cartella.noteClinica.filter(n => n.id !== id)); }

  // Visite
  function saveVisite(list: VisitaRecord[]) { return updConEsito({ visite: list }); }
  async function addVisita() {
    if (!visitaForm.descrizione) return;
    const ok = await saveVisite([{ id: uid(), tipo: 'Visita', data: todayStr(), operatore: operatoreNome, descrizione: '', esito: '', createdAt: nowISO(), ...visitaForm } as VisitaRecord, ...cartella.visite]);
    if (ok) { setShowAddVisita(false); setVisitaForm({}); }
  }
  async function updateVisita(id: string) {
    const ok = await saveVisite(cartella.visite.map(v => v.id === id ? { ...v, ...visitaForm } : v));
    if (ok) { setEditVisitaId(null); setVisitaForm({}); }
  }
  function deleteVisita(id: string) { saveVisite(cartella.visite.filter(v => v.id !== id)); }

  // Profilo
  async function saveProfiloHandler() {
    const { email, phone, ...cartellaUpdates } = profiloForm;
    // Issue #128: se la camera cambia, crea/chiude l'assegnazione letto reale
    const cam = cartellaUpdates.cameraNumero || undefined;
    if (cam !== (cartella.cameraNumero || undefined)) {
      const res = await onAssignCamera(paziente.id, cam, cartellaUpdates.lettoNumero);
      if (!res.ok) return;
      cartellaUpdates.cameraNumero = cam;
      cartellaUpdates.lettoNumero = cam ? (res.lettoLabel ?? cartellaUpdates.lettoNumero) : undefined;
    }
    if (email !== undefined || phone !== undefined) onUpdatePaziente(paziente.id, { email, phone });
    const ok = await updConEsito(cartellaUpdates);
    if (ok) setEditProfilo(false);
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

  // Allergie CRUD — delegated to AllergiesEditor
  // Diagnosi CRUD — delegated to DiagnosisEditor

  // Parametri quick-add from modal
  async function addVitaleFromModal() {
    if (!vitaleForm.etichetta || !vitaleForm.valore) return;
    const newV: VitaleItem = { id: uid(), etichetta: '', valore: '', unita: '', stato: 'normale', rilevato: nowISO(), rilevatoDa: operatoreNome, ...vitaleForm } as VitaleItem;
    const ok = await updConEsito({ parametriVitali: [newV, ...cartella.parametriVitali] });
    if (ok) { setModalVitaleShow(false); setVitaleForm({}); }
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
  // Issue #128: prima crea/chiude l'assegnazione letto reale (occupazione), poi salva la cartella
  async function saveCameraFromModal() {
    const cam = cameraModalForm.cameraNumero || undefined;
    const res = await onAssignCamera(paziente.id, cam, cameraModalForm.lettoNumero);
    if (!res.ok) return;
    const ok = await updConEsito({
      ...cameraModalForm,
      cameraNumero: cam,
      lettoNumero: cam ? (res.lettoLabel ?? cameraModalForm.lettoNumero) : undefined,
    });
    if (ok) {
      setCameraEditing(false);
      setCameraModalForm({});
    }
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
            <DiagnosisEditor
              mode="patient-chart"
              value={cartella.diagnosi ?? []}
              onChange={list => upd({ diagnosi: list })}
              operatoreNome={operatoreNome}
            />
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
              <button className="btn-secondary" onClick={() => { setCardModal(null); switchGroup('clinica'); switchTab('terapia-farmacologica'); }}>Apri Terapia Farmacologica</button>
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
                  <button className="btn-secondary btn-sm" onClick={() => {setModalVitaleShow(false); setVitaleForm({});}} disabled={saving}>Annulla</button>
                  <button className="btn-primary btn-sm" onClick={addVitaleFromModal} disabled={saving}><IcoCheck /> {saving ? 'Salvataggio…' : 'Salva'}</button>
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
            <AllergiesEditor
              mode="patient-chart"
              value={cartella.allergie ?? []}
              onChange={list => upd({ allergie: list })}
              operatoreNome={operatoreNome}
            />
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
                    {camereAssegnabili.map(c => <option key={c.id} value={c.numero}>{c.numero} — {c.reparto}</option>)}
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
                  <button className="btn-secondary" onClick={() => setCameraEditing(false)} disabled={saving}>Annulla</button>
                  <button className="btn-primary" onClick={saveCameraFromModal} disabled={saving}><IcoCheck /> {saving ? 'Salvataggio…' : 'Salva'}</button>
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
    // "Ultimi parametri" = i più recenti per data di rilevazione (l'array è in ordine di inserimento)
    const lastVitali = [...cartella.parametriVitali]
      .sort((a, b) => (b.rilevato ?? '').localeCompare(a.rilevato ?? ''))
      .slice(0, 4);
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
        <ClinicalTableSection
          title="Dati e Contatti"
          actions={editProfilo ? (
            <>
              <button className="btn-sm" onClick={() => setEditProfilo(false)} disabled={saving}>Annulla</button>
              <button className="btn-sm" onClick={saveProfiloHandler} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
            </>
          ) : (
            <button className="btn-sm" onClick={() => {
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
            }}>Modifica</button>
          )}
        >
        <div className="cts__body--padded">
        {editProfilo ? (
          <InlineForm onSave={saveProfiloHandler} onCancel={() => setEditProfilo(false)} saving={saving}>
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
                  {camereAssegnabili.map(c => (
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
          <>
            {/* Feature 010: L3 sub-tabs (FR-005) */}
            <TopNav
              variant="level3"
              items={[
                { key: 'anagrafica',   label: 'Anagrafica' },
                { key: 'contatti',     label: 'Contatti' },
                { key: 'emergenza',    label: 'Contatto emergenza' },
                { key: 'assegnazione', label: 'Assegnazione clinica' },
              ]}
              activeKey={profiloL3}
              onChange={(id) => setProfiloL3(id as typeof profiloL3)}
            />
            <div className="cr-profilo-grid" style={{ marginTop: 12 }}>
              {profiloL3 === 'anagrafica' && (
                <div className="cr-profilo-group">
                  <div className="cr-profilo-group__title">Anagrafica</div>
                  <div className="cr-profilo-row"><span>Nome</span><strong>{paziente.firstName} {paziente.lastName}</strong></div>
                  <div className="cr-profilo-row"><span>Data nascita</span><strong>{fmtDate(paziente.dateOfBirth)} · {calcAge(paziente.dateOfBirth)} anni</strong></div>
                  <div className="cr-profilo-row"><span>Sesso</span><strong>{paziente.sex ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Codice Fiscale</span><strong className="cr-mono">{cartella.codiceFiscale ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>MRN</span><strong className="cr-mono">{paziente.medicalRecordNumber}</strong></div>
                </div>
              )}
              {profiloL3 === 'contatti' && (
                <div className="cr-profilo-group">
                  <div className="cr-profilo-group__title">Contatti</div>
                  <div className="cr-profilo-row"><span>Email</span><strong>{paziente.email ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Telefono</span><strong>{paziente.phone ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Indirizzo</span><strong>{cartella.indirizzo ?? '—'}</strong></div>
                </div>
              )}
              {profiloL3 === 'emergenza' && (
                <div className="cr-profilo-group">
                  <div className="cr-profilo-group__title">Contatto emergenza</div>
                  <div className="cr-profilo-row"><span>Nome</span><strong>{cartella.contattoEmergenzaNome ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Telefono</span><strong>{cartella.contattoEmergenzaTel ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Relazione</span><strong>{cartella.contattoEmergenzaRel ?? '—'}</strong></div>
                </div>
              )}
              {profiloL3 === 'assegnazione' && (
                <div className="cr-profilo-group">
                  <div className="cr-profilo-group__title">Assegnazione clinica</div>
                  <div className="cr-profilo-row"><span>Stato</span><span className={`stato-pill stato-pill--${cartella.statoRicovero === 'ricoverato' ? 'attivo' : 'inattivo'}`}>{cartella.statoRicovero.replace('_', ' ')}</span></div>
                  <div className="cr-profilo-row"><span>Reparto</span><strong>{cartella.repartoRicovero ?? '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Camera / Letto</span><strong>{cartella.cameraNumero ?? '—'} {cartella.lettoNumero ? `/ L.${cartella.lettoNumero}` : ''}</strong></div>
                  <div className="cr-profilo-row"><span>Operatore</span><strong>{op ? `${op.cognome} ${op.nome}` : '—'}</strong></div>
                  <div className="cr-profilo-row"><span>Medico curante</span><strong>{cartella.medicoCurante ?? '—'}</strong></div>
                  {cartella.dataRicovero && <div className="cr-profilo-row"><span>Data ricovero</span><strong>{fmtDate(cartella.dataRicovero)}</strong></div>}
                </div>
              )}
              {cartella.noteGenerali && (
                <div className="cr-profilo-group cr-profilo-group--full">
                  <div className="cr-profilo-group__title">Note generali</div>
                  <p className="cr-note-text">{cartella.noteGenerali}</p>
                </div>
              )}
            </div>
          </>
        )}
        </div>
        </ClinicalTableSection>
      </div>
    );
  }

  function renderDiagnosi() {
    return (
      <div className="cr-tab-content">
        <DiagnosisEditor
          mode="patient-chart"
          value={cartella.diagnosi ?? []}
          onChange={list => upd({ diagnosi: list })}
          operatoreNome={operatoreNome}
        />

        <ClinicalTableSection
          title="Indicatori di Rischio"
          count={cartella.indicatoriRischio.length}
          countLabel="indicatori"
          actions={<button className="btn-sm" onClick={() => { setRiskForm({}); setShowAddRisk(true); }}>+ Aggiungi</button>}
        >
          <div className="cts__body--padded">
            {showAddRisk && (
              <InlineForm onSave={addRischio} onCancel={() => { setShowAddRisk(false); setRiskForm({}); }} saving={saving}>
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
                <InlineForm key={r.id} onSave={() => updateRischio(r.id)} onCancel={() => { setEditRiskId(null); setRiskForm({}); }} saving={saving}>
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
        </ClinicalTableSection>
      </div>
    );
  }

  // renderTerapie replaced by TerapiaMedicaTab component

  function renderNote() {
    return (
      <div className="cr-tab-content">
        <ClinicalTableSection
          title="Note Cliniche"
          count={cartella.noteClinica.length}
          countLabel="note"
          actions={<button className="btn-sm" onClick={() => { setNotaForm({}); setShowAddNota(true); }}>+ Aggiungi</button>}
        >
          <div className="cts__body--padded">
            {showAddNota && (
              <InlineForm onSave={addNota} onCancel={() => { setShowAddNota(false); setNotaForm({}); }} saving={saving}>
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
                <InlineForm key={n.id} onSave={() => updateNota(n.id)} onCancel={() => { setEditNotaId(null); setNotaForm({}); }} saving={saving}>
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
          </div>
        </ClinicalTableSection>

        <ClinicalTableSection
          title="Storico Visite"
          count={cartella.visite.length}
          countLabel="visite"
          actions={<button className="btn-sm" onClick={() => { setVisitaForm({}); setShowAddVisita(true); }}>+ Aggiungi</button>}
        >
          <div className="cts__body--padded">
            {showAddVisita && (
              <InlineForm onSave={addVisita} onCancel={() => { setShowAddVisita(false); setVisitaForm({}); }} saving={saving}>
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
                <InlineForm key={v.id} onSave={() => updateVisita(v.id)} onCancel={() => { setEditVisitaId(null); setVisitaForm({}); }} saving={saving}>
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
        </ClinicalTableSection>
      </div>
    );
  }

  // renderParametri replaced by ParametriTab component

  function renderConsegne() {
    return (
      <div className="cr-tab-content">
        <ClinicalTableSection
          title="Consegne"
          count={mieConsegne.filter(c => c.stato !== 'completata').length}
          countLabel="aperte"
          actions={<button className="btn-sm" onClick={() => setShowAddConsegna(v => !v)}>+ Aggiungi</button>}
        >
        <div className="cts__body--padded">
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
        </ClinicalTableSection>
      </div>
    );
  }

  // ── Tab badges ─────────────────────────────────────────────────────────────

  // Feature 010 (FR-014/015): each badge documented; counts match in-tab views.
  const TAB_BADGES: Partial<Record<TabId, number>> = {
    // badge = active diagnoses
    diagnosi:    diagnosiAttive.length,
    // badge = active drugs (farmaciAttivi)
    'terapia-farmacologica': farmaciAttivi.length,
    // diario: badge removed (FR-015) — legacy sum does not match DiarioPazienteTab visible count
    // badge = active medications (matches MedicazioniTab in-page filter: !dataFine)
    medicazioni: (cartella.medicazioniFerite ?? []).filter(m => !m.dataFine).length || 0,
    // badge = active contentions
    contenzioni: (cartella.contenzioni ?? []).filter(c => c.attiva).length || 0,
    // badge = documents delivered (documentiConsegnati)
    documenti:   (cartella.documentiConsegnati ?? []).length || 0,
    // badge = mie consegne non completate
    consegne:    mieConsegne.filter(c => c.stato !== 'completata').length,
  };

  function groupBadgeSum(gId: TabGroup): number {
    const g = TAB_GROUPS.find(x => x.id === gId);
    if (!g) return 0;
    return g.tabs.reduce((sum, t) => sum + (TAB_BADGES[t.id] ?? 0), 0);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.classList.remove('tab-panel-transition');
    void el.offsetWidth;
    el.classList.add('tab-panel-transition');
  }, [activeGroup, tab]);

  return (
    <div className="patient-record-view">
      {/* Patient Compact Header */}
      <PatientCompactHeader
        paziente={paziente}
        cartella={cartella}
        onBack={onBack}
        onInvioPS={() => setShowInvioPS(true)}
      />

      {/* L2 — Navigazione orizzontale principale della pagina */}
      <TopNav
        variant="level2"
        items={TAB_GROUPS.map(g => ({ key: g.id, label: g.label, badge: groupBadgeSum(g.id) || undefined }))}
        activeKey={activeGroup}
        onChange={id => switchGroup(id as TabGroup)}
      />
      {/* L3 — Sotto-navigazione contestuale del gruppo attivo */}
      {(() => {
        if (activeGroup === 'diario') {
          return (
            <TopNav
              variant="level3"
              items={DIARIO_AUTHOR_FILTERS.map(f => ({ key: f.id, label: f.label }))}
              activeKey={diarioFilter}
              onChange={id => setDiarioFilter(id)}
            />
          );
        }
        const grp = TAB_GROUPS.find(g => g.id === activeGroup);
        if (!grp || grp.tabs.length <= 1) return null;
        return (
          <TopNav
            variant="level3"
            items={grp.tabs.map(t => ({ key: t.id, label: t.label, badge: TAB_BADGES[t.id] || undefined }))}
            activeKey={tab}
            onChange={id => switchTab(id as TabId)}
          />
        );
      })()}

      {/* Content layout */}
      <div className="cr-detail-layout cr-detail-layout--no-sidebar">
        {/* Content area */}
        <div ref={contentRef} className="cr-detail-content tab-panel-transition">
          {tab === 'riepilogo'       && renderRiepilogo()}
          {tab === 'profilo'         && renderProfilo()}
          {tab === 'diagnosi'        && renderDiagnosi()}
          {tab === 'terapia-farmacologica' && (
            <TherapyEditor mode="patient-chart" paziente={paziente} operatoreNome={operatoreNome} value={undefined as never} onChange={() => {}} />
          )}
          {tab === 'note'            && renderNote()}
          {tab === 'parametri'       && (
            <VitalSignsEditor mode="patient-chart" cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} value={undefined as never} onChange={() => {}} />
          )}
          {tab === 'consegne'        && renderConsegne()}
          {tab === 'presa-in-carico' && (
            <PresaInCaricoTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'documenti' && (
            <DocumentiTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'sezioni-narrative' && (
            <NarrativeSectionsTab patientId={paziente.id} />
          )}
          {tab === 'diario' && (
            <DiarioPazienteTab
              pazienteId={paziente.id}
              operatoreNome={operatoreNome}
              legacyInfermieristico={cartella.diarioInfermieristico}
              legacyMedico={cartella.diarioMedico}
              filterBy={diarioFilter}
            />
          )}
          {tab === 'medicazioni' && (
            <MedicazioniTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'contenzioni' && (
            <ContenzioniTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'esami-consulenze' && (
            <EsamiConsulenzeTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'braden' && (
            <ScalaBradenTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'tinetti' && (
            <ScalaTinettiTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
          {tab === 'nrs' && (
            <PainAssessmentEditor mode="patient-chart" cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} value={undefined as never} onChange={() => {}} />
          )}
          {tab === 'dimissione' && (
            <DimissioneTab cartella={cartella} paziente={paziente} onUpdate={upd} operatoreNome={operatoreNome} />
          )}
        </div>
      </div>

      {cardModal === 'diagnosi'  && renderDiagnosiModal()}
      {cardModal === 'farmaci'   && renderFarmaciModal()}
      {cardModal === 'parametri' && renderParametriModal()}
      {cardModal === 'consegne'  && renderConsegneModal()}
      {cardModal === 'allergie'  && renderAllergieModal()}
      {cardModal === 'camera'    && renderCameraModal()}
      {showInvioPS && (
        <InvioPSModal
          paziente={paziente}
          cartella={cartella}
          onClose={() => setShowInvioPS(false)}
        />
      )}
    </div>
  );
}

