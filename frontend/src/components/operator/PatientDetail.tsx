import { useState } from 'react';
import type {
  Paziente, Consegna, Operatore, Camera, CartellaPaziente,
  Diagnosi, TerapiaItem, FarmacoItem, AllergiaItem, NotaClinica,
  VisitaRecord, VitaleItem, Intervento, IndicatoreRischio,
  PrioritaConsegna,
} from '../../types';
import {
  IcoChevronLeft, IcoEdit, IcoCheck, IcoX, IcoPlus,
  IcoWarning, IcoActivity, IcoPill, IcoShield, IcoConsegne, IcoBed,
  IcoCartelle,
} from '../../icons';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'riepilogo' | 'profilo' | 'anamnesi' | 'diagnosi' | 'terapie' | 'note' | 'parametri' | 'consegne';

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
  return new Date(iso).toLocaleDateString('it-IT');
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function uid(): string { return crypto.randomUUID(); }
function nowISO(): string { return new Date().toISOString(); }
function todayStr(): string { return new Date().toISOString().slice(0, 10); }

const GRAVITA_CLASS: Record<string, string> = {
  grave: 'badge--red', moderata: 'badge--amber', lieve: 'badge--gray',
};
const RISCHIO_CLASS: Record<string, string> = {
  critico: 'badge--red', alto: 'badge--amber', medio: 'badge--blue', basso: 'badge--gray',
};
const STATO_DIAG_CLASS: Record<string, string> = {
  attiva: 'badge--blue', risolta: 'badge--green', monitoraggio: 'badge--amber', sospetta: 'badge--gray',
};
const STATO_FARMACO_CLASS: Record<string, string> = {
  attivo: 'badge--green', sospeso: 'badge--amber', completato: 'badge--gray',
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

  // Terapie
  const [showAddTer, setShowAddTer] = useState(false);
  const [editTerId, setEditTerId] = useState<string | null>(null);
  const [terForm, setTerForm] = useState<Partial<TerapiaItem>>({});

  // Farmaci
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [editFarmId, setEditFarmId] = useState<string | null>(null);
  const [farmForm, setFarmForm] = useState<Partial<FarmacoItem>>({});

  // Allergie
  const [showAddAll, setShowAddAll] = useState(false);
  const [editAllId, setEditAllId] = useState<string | null>(null);
  const [allForm, setAllForm] = useState<Partial<AllergiaItem>>({});

  // Note cliniche
  const [showAddNota, setShowAddNota] = useState(false);
  const [editNotaId, setEditNotaId] = useState<string | null>(null);
  const [notaForm, setNotaForm] = useState<Partial<NotaClinica>>({});

  // Visite
  const [showAddVisita, setShowAddVisita] = useState(false);
  const [editVisitaId, setEditVisitaId] = useState<string | null>(null);
  const [visitaForm, setVisitaForm] = useState<Partial<VisitaRecord>>({});

  // Vitali
  const [showAddVitale, setShowAddVitale] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<Partial<VitaleItem>>({});

  // Interventi
  const [showAddInt, setShowAddInt] = useState(false);
  const [editIntId, setEditIntId] = useState<string | null>(null);
  const [intForm, setIntForm] = useState<Partial<Intervento>>({});

  // Piano cura
  const [editPiano, setEditPiano] = useState(false);
  const [pianoForm, setPianoForm] = useState(cartella.pianoCura);

  // Consegne
  const [showAddConsegna, setShowAddConsegna] = useState(false);
  const [consegnaForm, setConsegnaForm] = useState({ tipo: 'Monitoraggio', priorita: 'normale' as PrioritaConsegna, note: '', oraScadenza: '' });

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

  // Terapie
  function saveTerapie(list: TerapiaItem[]) { upd({ terapie: list }); }
  function addTerapia() {
    if (!terForm.descrizione) return;
    saveTerapie([{ id: uid(), tipo: 'altra', descrizione: '', dataInizio: todayStr(), stato: 'attiva', operatore: operatoreNome, note: '', createdAt: nowISO(), ...terForm } as TerapiaItem, ...cartella.terapie]);
    setShowAddTer(false); setTerForm({});
  }
  function updateTerapia(id: string) {
    saveTerapie(cartella.terapie.map(t => t.id === id ? { ...t, ...terForm } : t));
    setEditTerId(null); setTerForm({});
  }
  function deleteTerapia(id: string) { saveTerapie(cartella.terapie.filter(t => t.id !== id)); }

  // Farmaci
  function saveFarmaci(list: FarmacoItem[]) { upd({ farmaci: list }); }
  function addFarmaco() {
    if (!farmForm.nome) return;
    saveFarmaci([{ id: uid(), nome: '', dose: '', frequenza: '', inizio: todayStr(), stato: 'attivo', prescrittoDA: operatoreNome, ...farmForm } as FarmacoItem, ...cartella.farmaci]);
    setShowAddFarm(false); setFarmForm({});
  }
  function updateFarmaco(id: string) {
    saveFarmaci(cartella.farmaci.map(f => f.id === id ? { ...f, ...farmForm } : f));
    setEditFarmId(null); setFarmForm({});
  }
  function deleteFarmaco(id: string) { saveFarmaci(cartella.farmaci.filter(f => f.id !== id)); }

  // Allergie
  function saveAllergie(list: AllergiaItem[]) { upd({ allergie: list }); }
  function addAllergia() {
    if (!allForm.allergene) return;
    saveAllergie([{ id: uid(), allergene: '', reazione: '', gravita: 'lieve', documentato: todayStr(), documentatoDa: operatoreNome, ...allForm } as AllergiaItem, ...cartella.allergie]);
    setShowAddAll(false); setAllForm({});
  }
  function updateAllergia(id: string) {
    saveAllergie(cartella.allergie.map(a => a.id === id ? { ...a, ...allForm } : a));
    setEditAllId(null); setAllForm({});
  }
  function deleteAllergia(id: string) { saveAllergie(cartella.allergie.filter(a => a.id !== id)); }

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

  // Vitali
  function addVitale() {
    if (!vitaleForm.etichetta || !vitaleForm.valore) return;
    const newV: VitaleItem = { id: uid(), etichetta: '', valore: '', unita: '', stato: 'normale', rilevato: todayStr(), rilevatoDa: operatoreNome, ...vitaleForm } as VitaleItem;
    upd({ parametriVitali: [newV, ...cartella.parametriVitali] });
    setShowAddVitale(false); setVitaleForm({});
  }

  // Interventi
  function saveInterventi(list: Intervento[]) { upd({ interventi: list }); }
  function addIntervento() {
    if (!intForm.descrizione) return;
    saveInterventi([{ id: uid(), tipo: 'Procedura', data: todayStr(), operatore: operatoreNome, descrizione: '', esito: '', note: '', createdAt: nowISO(), ...intForm } as Intervento, ...cartella.interventi]);
    setShowAddInt(false); setIntForm({});
  }
  function updateIntervento(id: string) {
    saveInterventi(cartella.interventi.map(i => i.id === id ? { ...i, ...intForm } : i));
    setEditIntId(null); setIntForm({});
  }
  function deleteIntervento(id: string) { saveInterventi(cartella.interventi.filter(i => i.id !== id)); }

  // Piano cura
  function savePiano() {
    upd({ pianoCura: { ...pianoForm, dataAggiornamento: todayStr(), operatore: operatoreNome } });
    setEditPiano(false);
  }

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

  // ── Tab rendering ──────────────────────────────────────────────────────────

  function renderRiepilogo() {
    const lastVitali = cartella.parametriVitali.slice(0, 4);
    return (
      <div className="cr-tab-content">
        {/* Alerts */}
        {hasAllergie && (
          <div className="allergy-alert-strip">
            <IcoWarning />
            <strong>ALLERGIE GRAVI:</strong>{' '}
            {allergieGravi.map(a => a.allergene).join(', ')}
          </div>
        )}
        {rischioAlto.length > 0 && (
          <div className="coverage-alert" style={{ borderColor: 'var(--amber)' }}>
            <IcoWarning />
            <span>
              <strong>Rischi attivi:</strong>{' '}
              {rischioAlto.map(r => `${r.tipo.replace('_', ' ')} (${r.livello})`).join(' · ')}
            </span>
          </div>
        )}

        {/* Quick stats row */}
        <div className="cr-quick-stats">
          <div className="cr-quick-stat">
            <span className="cr-quick-stat__val">{diagnosiAttive.length}</span>
            <span className="cr-quick-stat__lbl">Diagnosi attive</span>
          </div>
          <div className="cr-quick-stat">
            <span className="cr-quick-stat__val">{farmaciAttivi.length}</span>
            <span className="cr-quick-stat__lbl">Farmaci attivi</span>
          </div>
          <div className="cr-quick-stat">
            <span className="cr-quick-stat__val">{cartella.allergie.length}</span>
            <span className="cr-quick-stat__lbl">Allergie</span>
          </div>
          <div className="cr-quick-stat">
            <span className="cr-quick-stat__val">{mieConsegne.filter(c => c.stato !== 'completata').length}</span>
            <span className="cr-quick-stat__lbl">Consegne aperte</span>
          </div>
          {cartella.cameraNumero && (
            <div className="cr-quick-stat">
              <span className="cr-quick-stat__val">{cartella.cameraNumero}</span>
              <span className="cr-quick-stat__lbl">Camera / L.{cartella.lettoNumero}</span>
            </div>
          )}
        </div>

        <div className="cr-riepilogo-grid">
          {/* Active diagnoses */}
          <div className="cr-riepilogo-card">
            <div className="cr-riepilogo-card__title"><IcoCartelle /> Diagnosi attive</div>
            {diagnosiAttive.length === 0 ? <p className="cr-empty">Nessuna diagnosi attiva.</p> : (
              <ul className="cr-compact-list">
                {diagnosiAttive.map(d => (
                  <li key={d.id} className="cr-compact-item">
                    <span className="cr-compact-item__main">{d.descrizione}</span>
                    {d.codiceICD && <span className="cr-mono">{d.codiceICD}</span>}
                    <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.tipo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Active meds */}
          <div className="cr-riepilogo-card">
            <div className="cr-riepilogo-card__title"><IcoPill /> Farmaci attivi</div>
            {farmaciAttivi.length === 0 ? <p className="cr-empty">Nessun farmaco attivo.</p> : (
              <ul className="cr-compact-list">
                {farmaciAttivi.map(f => (
                  <li key={f.id} className="cr-compact-item">
                    <span className="cr-compact-item__main">{f.nome} {f.dose}</span>
                    <span className="cr-compact-item__sub">{f.frequenza}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Vitals */}
          <div className="cr-riepilogo-card">
            <div className="cr-riepilogo-card__title"><IcoActivity /> Ultimi parametri</div>
            <div className="vitals-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {lastVitali.map(v => (
                <div key={v.id} className={`vital-card ${STATO_VITALE_CLASS[v.stato]}`}>
                  <span className="vital-label">{v.etichetta}</span>
                  <span className="vital-value">{v.valore} <span className="vital-unit">{v.unita}</span></span>
                  <span className="vital-date">{fmtDate(v.rilevato)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Open consegne */}
          {mieConsegne.filter(c => c.stato !== 'completata').length > 0 && (
            <div className="cr-riepilogo-card">
              <div className="cr-riepilogo-card__title"><IcoConsegne /> Consegne aperte</div>
              <div className="consegne-list">
                {mieConsegne.filter(c => c.stato !== 'completata').slice(0, 3).map(c => (
                  <div key={c.id} className={`consegna-card consegna-card--${c.priorita}`}>
                    <div className="consegna-card__top">
                      <span className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}>{c.priorita}</span>
                      <span className="consegna-tipo">{c.tipo}</span>
                    </div>
                    <p className="consegna-note">{c.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
    const sections: { key: keyof typeof a; label: string }[] = [
      { key: 'patologicaProssima', label: 'Anamnesi patologica prossima (motivo ricovero)' },
      { key: 'patologicaRemota',   label: 'Anamnesi patologica remota' },
      { key: 'familiare',          label: 'Anamnesi familiare' },
      { key: 'fisiologica',        label: 'Anamnesi fisiologica' },
      { key: 'lavorativa',         label: 'Anamnesi lavorativa / sociale' },
      { key: 'abitudini',          label: 'Abitudini e stile di vita' },
      { key: 'note',               label: 'Note aggiuntive' },
    ];
    return (
      <div className="cr-tab-content">
        <div className="cr-section-header">
          <span className="cr-section-title">Anamnesi</span>
          {!editAnamnesi && (
            <button className="btn-secondary btn-sm" onClick={() => { setAnamnesiForm({ ...cartella.anamnesi }); setEditAnamnesi(true); }}>
              <IcoEdit /> Modifica
            </button>
          )}
          {editAnamnesi && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary btn-sm" onClick={() => setEditAnamnesi(false)}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={() => {
                upd({ anamnesi: { ...anamnesiForm, updatedAt: nowISO(), operatore: operatoreNome } });
                setEditAnamnesi(false);
              }}><IcoCheck /> Salva</button>
            </div>
          )}
        </div>
        <div className="cr-anamnesi-sections">
          {sections.map(({ key, label }) => (
            <div key={key} className="cr-anamnesi-section">
              <label className="cr-anamnesi-label">{label}</label>
              {editAnamnesi ? (
                <textarea className="form-input" rows={4} value={String(a[key] ?? '')}
                  onChange={e => setAnamnesiForm(prev => ({ ...prev, [key]: e.target.value }))} />
              ) : (
                <p className="cr-anamnesi-text">{String(a[key] ?? '') || <em className="cr-empty-inline">Non compilato</em>}</p>
              )}
            </div>
          ))}
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

  function renderTerapie() {
    return (
      <div className="cr-tab-content">
        {/* Terapie */}
        <SectionHeader title="Terapie e Trattamenti" onAdd={() => { setTerForm({}); setShowAddTer(true); }} />
        {showAddTer && (
          <InlineForm onSave={addTerapia} onCancel={() => { setShowAddTer(false); setTerForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Tipo</label>
                <select className="form-select" value={terForm.tipo ?? 'altra'} onChange={e => setTerForm(p => ({ ...p, tipo: e.target.value as TerapiaItem['tipo'] }))}>
                  <option value="farmacologica">Farmacologica</option><option value="chirurgica">Chirurgica</option>
                  <option value="riabilitativa">Riabilitativa</option><option value="palliativa">Palliativa</option><option value="altra">Altra</option>
                </select></div>
              <div className="form-field"><label className="form-label">Stato</label>
                <select className="form-select" value={terForm.stato ?? 'attiva'} onChange={e => setTerForm(p => ({ ...p, stato: e.target.value as TerapiaItem['stato'] }))}>
                  <option value="attiva">Attiva</option><option value="completata">Completata</option><option value="sospesa">Sospesa</option>
                </select></div>
              <div className="form-field"><label className="form-label">Data inizio</label>
                <input className="form-input" type="date" value={terForm.dataInizio ?? todayStr()} onChange={e => setTerForm(p => ({ ...p, dataInizio: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Data fine</label>
                <input className="form-input" type="date" value={terForm.dataFine ?? ''} onChange={e => setTerForm(p => ({ ...p, dataFine: e.target.value }))} /></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione *</label>
              <input className="form-input" value={terForm.descrizione ?? ''} onChange={e => setTerForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note</label>
              <textarea className="form-input" rows={2} value={terForm.note ?? ''} onChange={e => setTerForm(p => ({ ...p, note: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.terapie.length === 0 && <p className="cr-empty">Nessuna terapia registrata.</p>}
          {cartella.terapie.map(t => editTerId === t.id ? (
            <InlineForm key={t.id} onSave={() => updateTerapia(t.id)} onCancel={() => { setEditTerId(null); setTerForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Tipo</label>
                  <select className="form-select" value={terForm.tipo ?? t.tipo} onChange={e => setTerForm(p => ({ ...p, tipo: e.target.value as TerapiaItem['tipo'] }))}>
                    <option value="farmacologica">Farmacologica</option><option value="chirurgica">Chirurgica</option>
                    <option value="riabilitativa">Riabilitativa</option><option value="palliativa">Palliativa</option><option value="altra">Altra</option>
                  </select></div>
                <div className="form-field"><label className="form-label">Stato</label>
                  <select className="form-select" value={terForm.stato ?? t.stato} onChange={e => setTerForm(p => ({ ...p, stato: e.target.value as TerapiaItem['stato'] }))}>
                    <option value="attiva">Attiva</option><option value="completata">Completata</option><option value="sospesa">Sospesa</option>
                  </select></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione</label>
                <input className="form-input" value={terForm.descrizione ?? t.descrizione} onChange={e => setTerForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note</label>
                <textarea className="form-input" rows={2} value={terForm.note ?? t.note} onChange={e => setTerForm(p => ({ ...p, note: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={t.id} onEdit={() => { setEditTerId(t.id); setTerForm({ ...t }); }} onDelete={() => deleteTerapia(t.id)}>
              <div className="cr-terapia-row">
                <div className="cr-terapia-main">
                  <span className="badge badge--gray">{t.tipo}</span>
                  <span className="cr-terapia-desc">{t.descrizione}</span>
                  <span className={`badge ${t.stato === 'attiva' ? 'badge--green' : t.stato === 'sospesa' ? 'badge--amber' : 'badge--gray'}`}>{t.stato}</span>
                </div>
                {t.note && <p className="cr-diag-note">{t.note}</p>}
                <span className="cr-diag-meta">{fmtDate(t.dataInizio)}{t.dataFine ? ` → ${fmtDate(t.dataFine)}` : ''} · {t.operatore}</span>
              </div>
            </ItemRow>
          ))}
        </div>

        {/* Farmaci */}
        <SectionHeader title="Farmaci" onAdd={() => { setFarmForm({}); setShowAddFarm(true); }} />
        {showAddFarm && (
          <InlineForm onSave={addFarmaco} onCancel={() => { setShowAddFarm(false); setFarmForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Nome *</label>
                <input className="form-input" value={farmForm.nome ?? ''} onChange={e => setFarmForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Dose</label>
                <input className="form-input" value={farmForm.dose ?? ''} placeholder="50 mg" onChange={e => setFarmForm(p => ({ ...p, dose: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Frequenza</label>
                <input className="form-input" value={farmForm.frequenza ?? ''} placeholder="1×/die" onChange={e => setFarmForm(p => ({ ...p, frequenza: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Via</label>
                <input className="form-input" value={farmForm.via ?? ''} placeholder="orale, ev…" onChange={e => setFarmForm(p => ({ ...p, via: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Stato</label>
                <select className="form-select" value={farmForm.stato ?? 'attivo'} onChange={e => setFarmForm(p => ({ ...p, stato: e.target.value as FarmacoItem['stato'] }))}>
                  <option value="attivo">Attivo</option><option value="sospeso">Sospeso</option><option value="completato">Completato</option>
                </select></div>
              <div className="form-field"><label className="form-label">Data inizio</label>
                <input className="form-input" type="date" value={farmForm.inizio ?? todayStr()} onChange={e => setFarmForm(p => ({ ...p, inizio: e.target.value }))} /></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Indicazione</label>
              <input className="form-input" value={farmForm.indicazione ?? ''} onChange={e => setFarmForm(p => ({ ...p, indicazione: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.farmaci.length === 0 && <p className="cr-empty">Nessun farmaco registrato.</p>}
          {cartella.farmaci.map(f => editFarmId === f.id ? (
            <InlineForm key={f.id} onSave={() => updateFarmaco(f.id)} onCancel={() => { setEditFarmId(null); setFarmForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Nome</label><input className="form-input" value={farmForm.nome ?? f.nome} onChange={e => setFarmForm(p => ({ ...p, nome: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Dose</label><input className="form-input" value={farmForm.dose ?? f.dose} onChange={e => setFarmForm(p => ({ ...p, dose: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Frequenza</label><input className="form-input" value={farmForm.frequenza ?? f.frequenza} onChange={e => setFarmForm(p => ({ ...p, frequenza: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Stato</label>
                  <select className="form-select" value={farmForm.stato ?? f.stato} onChange={e => setFarmForm(p => ({ ...p, stato: e.target.value as FarmacoItem['stato'] }))}>
                    <option value="attivo">Attivo</option><option value="sospeso">Sospeso</option><option value="completato">Completato</option>
                  </select></div>
                <div className="form-field"><label className="form-label">Fine</label><input className="form-input" type="date" value={farmForm.fine ?? ''} onChange={e => setFarmForm(p => ({ ...p, fine: e.target.value }))} /></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note</label>
                <input className="form-input" value={farmForm.note ?? ''} onChange={e => setFarmForm(p => ({ ...p, note: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={f.id} onEdit={() => { setEditFarmId(f.id); setFarmForm({ ...f }); }} onDelete={() => deleteFarmaco(f.id)}>
              <div className="cr-farmaco-row">
                <div className="cr-farmaco-main">
                  <span className="cr-farmaco-nome">{f.nome}</span>
                  <span className="cr-farmaco-dose">{f.dose}</span>
                  <span className="cr-farmaco-freq">{f.frequenza}</span>
                  {f.via && <span className="cr-farmaco-via">{f.via}</span>}
                  <span className={`badge ${STATO_FARMACO_CLASS[f.stato]}`}>{f.stato}</span>
                </div>
                {f.indicazione && <p className="cr-diag-note">{f.indicazione}</p>}
                <span className="cr-diag-meta">Dal {fmtDate(f.inizio)}{f.fine ? ` al ${fmtDate(f.fine)}` : ''} · {f.prescrittoDA}</span>
              </div>
            </ItemRow>
          ))}
        </div>

        {/* Allergie */}
        <SectionHeader title="Allergie" onAdd={() => { setAllForm({}); setShowAddAll(true); }} />
        {showAddAll && (
          <InlineForm onSave={addAllergia} onCancel={() => { setShowAddAll(false); setAllForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Allergene *</label>
                <input className="form-input" value={allForm.allergene ?? ''} onChange={e => setAllForm(p => ({ ...p, allergene: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Reazione</label>
                <input className="form-input" value={allForm.reazione ?? ''} onChange={e => setAllForm(p => ({ ...p, reazione: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Gravità</label>
                <select className="form-select" value={allForm.gravita ?? 'lieve'} onChange={e => setAllForm(p => ({ ...p, gravita: e.target.value as AllergiaItem['gravita'] }))}>
                  <option value="lieve">Lieve</option><option value="moderata">Moderata</option><option value="grave">Grave</option>
                </select></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note</label>
              <input className="form-input" value={allForm.note ?? ''} onChange={e => setAllForm(p => ({ ...p, note: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.allergie.length === 0 && <p className="cr-empty">Nessuna allergia registrata.</p>}
          {cartella.allergie.map(a => editAllId === a.id ? (
            <InlineForm key={a.id} onSave={() => updateAllergia(a.id)} onCancel={() => { setEditAllId(null); setAllForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Allergene</label><input className="form-input" value={allForm.allergene ?? a.allergene} onChange={e => setAllForm(p => ({ ...p, allergene: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Reazione</label><input className="form-input" value={allForm.reazione ?? a.reazione} onChange={e => setAllForm(p => ({ ...p, reazione: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Gravità</label>
                  <select className="form-select" value={allForm.gravita ?? a.gravita} onChange={e => setAllForm(p => ({ ...p, gravita: e.target.value as AllergiaItem['gravita'] }))}>
                    <option value="lieve">Lieve</option><option value="moderata">Moderata</option><option value="grave">Grave</option>
                  </select></div>
              </div>
            </InlineForm>
          ) : (
            <ItemRow key={a.id} onEdit={() => { setEditAllId(a.id); setAllForm({ ...a }); }} onDelete={() => deleteAllergia(a.id)}>
              <div className="cr-allergia-row">
                <span className={`badge ${GRAVITA_CLASS[a.gravita]}`}>{a.gravita}</span>
                <span className="cr-allergia-nome">{a.allergene}</span>
                <span className="cr-allergia-reaz">{a.reazione}</span>
                {a.note && <span className="cr-diag-note">{a.note}</span>}
                <span className="cr-diag-meta">Doc. {fmtDate(a.documentato)} · {a.documentatoDa}</span>
              </div>
            </ItemRow>
          ))}
        </div>
      </div>
    );
  }

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

  function renderParametri() {
    return (
      <div className="cr-tab-content">
        {/* Add vital */}
        <SectionHeader title="Parametri Vitali" onAdd={() => { setVitaleForm({}); setShowAddVitale(true); }} />
        {showAddVitale && (
          <InlineForm onSave={addVitale} onCancel={() => { setShowAddVitale(false); setVitaleForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Parametro *</label>
                <input className="form-input" value={vitaleForm.etichetta ?? ''} placeholder="Pressione Arteriosa" onChange={e => setVitaleForm(p => ({ ...p, etichetta: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Valore *</label>
                <input className="form-input" value={vitaleForm.valore ?? ''} placeholder="120/80" onChange={e => setVitaleForm(p => ({ ...p, valore: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Unità</label>
                <input className="form-input" value={vitaleForm.unita ?? ''} placeholder="mmHg" onChange={e => setVitaleForm(p => ({ ...p, unita: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Stato</label>
                <select className="form-select" value={vitaleForm.stato ?? 'normale'} onChange={e => setVitaleForm(p => ({ ...p, stato: e.target.value as VitaleItem['stato'] }))}>
                  <option value="normale">Normale</option><option value="attenzione">Attenzione</option><option value="critico">Critico</option>
                </select></div>
              <div className="form-field"><label className="form-label">Data</label>
                <input className="form-input" type="date" value={vitaleForm.rilevato ?? todayStr()} onChange={e => setVitaleForm(p => ({ ...p, rilevato: e.target.value }))} /></div>
            </div>
          </InlineForm>
        )}
        <div className="vitals-grid">
          {cartella.parametriVitali.length === 0 && <p className="cr-empty">Nessun parametro vitale.</p>}
          {cartella.parametriVitali.map(v => (
            <div key={v.id} className={`vital-card ${STATO_VITALE_CLASS[v.stato]}`}>
              <span className="vital-label">{v.etichetta}</span>
              <span className="vital-value">{v.valore} <span className="vital-unit">{v.unita}</span></span>
              <span className="vital-date">{fmtDate(v.rilevato)} · {v.rilevatoDa}</span>
              {v.note && <span className="vital-date">{v.note}</span>}
            </div>
          ))}
        </div>

        {/* Piano di cura */}
        <SectionHeader title="Piano di Cura"
          onAdd={editPiano ? undefined : () => { setPianoForm({ ...cartella.pianoCura }); setEditPiano(true); }}
          addLabel="Modifica"
        />
        {editPiano ? (
          <InlineForm onSave={savePiano} onCancel={() => setEditPiano(false)}>
            <div className="form-field"><label className="form-label">Obiettivi</label>
              <textarea className="form-input" rows={3} value={pianoForm.obiettivi ?? ''} onChange={e => setPianoForm(p => ({ ...p, obiettivi: e.target.value }))} /></div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Interventi previsti</label>
              <textarea className="form-input" rows={3} value={pianoForm.interventiPrevisti ?? ''} onChange={e => setPianoForm(p => ({ ...p, interventiPrevisti: e.target.value }))} /></div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Note pianificazione</label>
              <textarea className="form-input" rows={2} value={pianoForm.notePianificazione ?? ''} onChange={e => setPianoForm(p => ({ ...p, notePianificazione: e.target.value }))} /></div>
          </InlineForm>
        ) : (
          <div className="cr-piano-view">
            <div className="cr-piano-section"><span className="cr-piano-label">Obiettivi</span><p>{cartella.pianoCura.obiettivi || '—'}</p></div>
            <div className="cr-piano-section"><span className="cr-piano-label">Interventi previsti</span><p>{cartella.pianoCura.interventiPrevisti || '—'}</p></div>
            {cartella.pianoCura.notePianificazione && <div className="cr-piano-section"><span className="cr-piano-label">Note</span><p>{cartella.pianoCura.notePianificazione}</p></div>}
            {cartella.pianoCura.dataAggiornamento && <p className="cr-update-info">Aggiornato: {fmtDate(cartella.pianoCura.dataAggiornamento)} · {cartella.pianoCura.operatore}</p>}
          </div>
        )}

        {/* Interventi */}
        <SectionHeader title="Storico Interventi" onAdd={() => { setIntForm({}); setShowAddInt(true); }} />
        {showAddInt && (
          <InlineForm onSave={addIntervento} onCancel={() => { setShowAddInt(false); setIntForm({}); }}>
            <div className="op-form-grid">
              <div className="form-field"><label className="form-label">Tipo</label>
                <input className="form-input" value={intForm.tipo ?? ''} placeholder="Ecografia, Biopsia…" onChange={e => setIntForm(p => ({ ...p, tipo: e.target.value }))} /></div>
              <div className="form-field"><label className="form-label">Data</label>
                <input className="form-input" type="date" value={intForm.data ?? todayStr()} onChange={e => setIntForm(p => ({ ...p, data: e.target.value }))} /></div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione *</label>
              <textarea className="form-input" rows={3} value={intForm.descrizione ?? ''} onChange={e => setIntForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
            <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Esito</label>
              <textarea className="form-input" rows={2} value={intForm.esito ?? ''} onChange={e => setIntForm(p => ({ ...p, esito: e.target.value }))} /></div>
          </InlineForm>
        )}
        <div className="cr-list">
          {cartella.interventi.length === 0 && <p className="cr-empty">Nessun intervento registrato.</p>}
          {cartella.interventi.map(i => editIntId === i.id ? (
            <InlineForm key={i.id} onSave={() => updateIntervento(i.id)} onCancel={() => { setEditIntId(null); setIntForm({}); }}>
              <div className="op-form-grid">
                <div className="form-field"><label className="form-label">Tipo</label><input className="form-input" value={intForm.tipo ?? i.tipo} onChange={e => setIntForm(p => ({ ...p, tipo: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Data</label><input className="form-input" type="date" value={intForm.data ?? i.data} onChange={e => setIntForm(p => ({ ...p, data: e.target.value }))} /></div>
              </div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Descrizione</label>
                <textarea className="form-input" rows={3} value={intForm.descrizione ?? i.descrizione} onChange={e => setIntForm(p => ({ ...p, descrizione: e.target.value }))} /></div>
              <div className="form-field" style={{ marginTop: 8 }}><label className="form-label">Esito</label>
                <textarea className="form-input" rows={2} value={intForm.esito ?? i.esito} onChange={e => setIntForm(p => ({ ...p, esito: e.target.value }))} /></div>
            </InlineForm>
          ) : (
            <ItemRow key={i.id} onEdit={() => { setEditIntId(i.id); setIntForm({ ...i }); }} onDelete={() => deleteIntervento(i.id)}>
              <div className="cr-visita-row">
                <div className="cr-visita-header">
                  <span className="cr-visita-tipo">{i.tipo}</span>
                  <span className="cr-diag-meta">{fmtDate(i.data)} · {i.operatore}</span>
                </div>
                <p className="cr-nota-text">{i.descrizione}</p>
                {i.esito && <p className="cr-visita-esito">{i.esito}</p>}
              </div>
            </ItemRow>
          ))}
        </div>
      </div>
    );
  }

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

  // ── Tab config ─────────────────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; icon?: React.ReactNode; badge?: number }[] = [
    { id: 'riepilogo', label: 'Riepilogo', icon: <IcoDashboard /> },
    { id: 'profilo',   label: 'Profilo' },
    { id: 'anamnesi',  label: 'Anamnesi' },
    { id: 'diagnosi',  label: 'Diagnosi', badge: diagnosiAttive.length },
    { id: 'terapie',   label: 'Terapie & Farmaci', badge: farmaciAttivi.length },
    { id: 'note',      label: 'Note & Visite' },
    { id: 'parametri', label: 'Parametri & Piano' },
    { id: 'consegne',  label: 'Consegne', badge: mieConsegne.filter(c => c.stato !== 'completata').length, icon: <IcoConsegne /> },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="patient-record-view">
      {/* Header */}
      <div className="cr-header">
        <button className="btn-back" onClick={onBack}><IcoChevronLeft /> Pazienti</button>
        <div className="cr-header__patient">
          <div className="op-avatar-lg" style={{ flexShrink: 0 }}>
            {paziente.firstName[0]}{paziente.lastName[0]}
          </div>
          <div className="cr-header__info">
            <h2 className="cr-header__name">{paziente.lastName}, {paziente.firstName}</h2>
            <div className="cr-header__meta">
              <span className="mrn-tag">{paziente.medicalRecordNumber}</span>
              <span>{calcAge(paziente.dateOfBirth)} anni · {paziente.sex ?? '—'}</span>
              {cartella.cameraNumero && (
                <span className="cr-room-tag"><IcoBed /> Camera {cartella.cameraNumero}{cartella.lettoNumero ? `/L.${cartella.lettoNumero}` : ''}</span>
              )}
              <span className={`stato-pill stato-pill--${cartella.statoRicovero === 'ricoverato' ? 'attivo' : 'inattivo'}`}>
                {cartella.statoRicovero.replace('_', ' ')}
              </span>
            </div>
            {hasAllergie && (
              <div className="cr-header__allergy-chips">
                <IcoShield />
                {allergieGravi.map(a => (
                  <span key={a.id} className="badge badge--red">{a.allergene}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cr-tab-bar">
        {TABS.map(t => (
          <button key={t.id}
            className={`cr-tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`cr-tab-badge${t.id === 'consegne' && mieConsegne.some(c => c.priorita === 'urgente' && c.stato !== 'completata') ? ' urgent' : ''}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'riepilogo'  && renderRiepilogo()}
      {tab === 'profilo'    && renderProfilo()}
      {tab === 'anamnesi'   && renderAnamnesi()}
      {tab === 'diagnosi'   && renderDiagnosi()}
      {tab === 'terapie'    && renderTerapie()}
      {tab === 'note'       && renderNote()}
      {tab === 'parametri'  && renderParametri()}
      {tab === 'consegne'   && renderConsegne()}
    </div>
  );
}

// dummy icon for riepilogo tab (reuse IcoDashboard-like)
function IcoDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
