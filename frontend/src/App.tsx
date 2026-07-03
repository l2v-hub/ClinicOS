import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { API_URL } from './config';

import type {
  UtenteApp, Paziente, Operatore, Consegna, NavKey,
  Appuntamento, Camera, ScheduleOperatore, Nota, StatoNota,
  CartellaPaziente, NuovoPaziente, TherapySlot, MotivoNonErogazione,
  TherapySlotPatient, TherapyAdministration,
} from './types';
import { OPERATOR_COLOR_PALETTE } from './types';
import {
  MOCK_OPERATORI, MOCK_AGENDA,
  MOCK_APPUNTAMENTI, MOCK_SCHEDULES,
  createDefaultCartella, createMockTherapySlots,
} from './mockData';

import { Login } from './components/Login';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OperatorManagement } from './components/admin/OperatorManagement';
import { AdminAgenda } from './components/admin/AdminAgenda';
import { RoomsManagement } from './components/admin/RoomsManagement';
import { OperatorSchedule } from './components/admin/OperatorSchedule';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { PatientList } from './components/operator/PatientList';
import { PatientDetail } from './components/operator/PatientDetail';
import { ConsegnePage } from './components/operator/ConsegnePage';
import { OperatorAgenda } from './components/operator/OperatorAgenda';
import { NotesPage } from './components/shared/NotesPage';
import { MultiPatientParametri } from './components/operator/MultiPatientParametri';
import TeamsLikeSidebar from './components/shared/TeamsLikeSidebar';
import { AgnosPanel } from './components/shared/AgnosPanel';

import { IcoSearch, IcoX } from './icons';

// ── Navigation helpers ─────────────────────────────────────────────────────────

const NAV_LABELS: Record<NavKey, string> = {
  'login': 'Login',
  'admin-dashboard': 'Dashboard',
  'gestione-operatori': 'Operatori',
  'agenda-admin': 'Agenda',
  'posti-letto': 'Posti Letto',
  'orari-operatori': 'Orari',
  'note': 'Note',
  'operator-dashboard': 'Dashboard',
  'pazienti': 'Pazienti',
  'dettaglio-paziente': 'Scheda Paziente',
  'consegne': 'Consegne',
  'agenda-operatore': 'Agenda',
  'parametri-multipaziente': 'Parametri',
  'ai-assistant': 'Assistente ClinicOS',
};

const NAV_FALLBACK: Partial<Record<NavKey, NavKey>> = {
  'dettaglio-paziente': 'pazienti',
  'parametri-multipaziente': 'operator-dashboard',
  'gestione-operatori': 'admin-dashboard',
  'posti-letto': 'admin-dashboard',
  'orari-operatori': 'admin-dashboard',
  'agenda-admin': 'admin-dashboard',
  'agenda-operatore': 'operator-dashboard',
};

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [utente, setUtente] = useState<UtenteApp | null>(null);
  const [navKey, setNavKey] = useState<NavKey>('admin-dashboard');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOpenTrigger, setAiOpenTrigger] = useState(0);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Navigation history tracking
  const prevNavKeyRef = useRef<NavKey | null>(null);
  const historyDepth = useRef(0);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Patients (API)
  const [pazienti, setPazienti] = useState<Paziente[]>([]);
  const [loadingPazienti, setLoadingPazienti] = useState(false);
  const [pazienteSelezionato, setPazienteSelezionato] = useState<Paziente | null>(null);

  // Mock state
  const [operatori, setOperatori] = useState<Operatore[]>(MOCK_OPERATORI);
  const [consegne, setConsegne] = useState<Consegna[]>([]);
  const [cartelle, setCartelle] = useState<CartellaPaziente[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>(MOCK_APPUNTAMENTI);
  const [camere, setCamere] = useState<Camera[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOperatore[]>(MOCK_SCHEDULES);
  const [note, setNote] = useState<Nota[]>([]);
  const [therapySlots, setTherapySlots] = useState<TherapySlot[]>([]);

  // ── History API navigation ─────────────────────────────────────────────────

  function pushNav(key: NavKey, paziente?: Paziente) {
    prevNavKeyRef.current = navKey;
    historyDepth.current += 1;
    const hash = `#/${key}`;
    window.history.pushState({ navKey: key, pazienteId: paziente?.id, prevNavKey: navKey }, '', hash);
    setNavKey(key);
    if (paziente) {
      setPazienteSelezionato(paziente);
    } else if (key !== 'dettaglio-paziente') {
      setPazienteSelezionato(null);
    }
  }

  function navigate(key: NavKey) {
    if (key === 'ai-assistant') {
      setAiOpen(true);
      setAiOpenTrigger(t => t + 1);
      return;
    }
    pushNav(key);
    if (key === 'agenda-operatore') loadTherapySlots();
  }

  function selectPaziente(p: Paziente) {
    pushNav('dettaglio-paziente', p);
    loadCartella(p.id);
  }

  const goBack = useCallback((fallbackKey?: NavKey) => {
    if (historyDepth.current > 0) {
      window.history.back();
    } else {
      const target = fallbackKey ?? NAV_FALLBACK[navKey] ?? (utente?.ruolo === 'admin' ? 'admin-dashboard' : 'operator-dashboard');
      navigate(target);
    }
  }, [navKey, utente?.ruolo]);

  // Restore nav from hash on mount + listen to popstate
  useEffect(() => {
    const hash = window.location.hash.replace('#/', '');
    // Don't restore dettaglio-paziente from hash: patient data is in-memory only
    if (hash && hash !== 'dettaglio-paziente' && hash !== 'login') {
      const k = hash as NavKey;
      setNavKey(k);
    }

    function onPopState(e: PopStateEvent) {
      if (historyDepth.current > 0) historyDepth.current -= 1;
      if (e.state?.navKey) {
        prevNavKeyRef.current = e.state.prevNavKey ?? null;
        setNavKey(e.state.navKey as NavKey);
        if (e.state.navKey !== 'dettaglio-paziente') {
          setPazienteSelezionato(null);
        }
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Load therapy slots (API with mock fallback) ─────────────────────────────

  const loadTherapySlots = useCallback(async (date?: string) => {
    const d = date || new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(`${API_URL}/therapy-slots?date=${d}`);
      if (res.ok) {
        const raw = await res.json();
        const slots = Array.isArray(raw) ? raw : [];
        const data: TherapySlot[] = slots.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          fascia: s.fascia as TherapySlot['fascia'],
          label: s.label as string,
          ora: s.ora as string,
          summary: (s.summary as TherapySlot['summary']) ?? { total: 0, administered: 0, notAdministered: 0, pending: 0 },
          patients: Array.isArray(s.patients) ? (s.patients as TherapySlotPatient[]) : [],
        }));
        setTherapySlots(data);
      } else {
        setTherapySlots(createMockTherapySlots(d));
      }
    } catch {
      setTherapySlots(createMockTherapySlots(d));
    }
  }, []);

  // ── Fetch patients ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!utente) return;
    setLoadingPazienti(true);
    fetch(`${API_URL}/patients`)
      .then(r => r.json())
      .then((data: Paziente[]) => setPazienti(data))
      .catch(() => setPazienti([]))
      .finally(() => setLoadingPazienti(false));
    loadTherapySlots();
    // Load rooms from API for AdminDashboard
    fetch(`${API_URL}/admin/rooms`)
      .then(r => r.ok ? r.json() : [])
      .then((rooms: Array<{ id: string; numero: string; tipo: string; piano: string; reparto: string; stato: string; note: string; beds: Array<{ id: string; label: string; stato: string; assignments: Array<{ patient: { firstName: string; lastName: string } }> }> }>) => {
        setCamere(rooms.map(r => ({
          id: r.id,
          numero: r.numero,
          tipo: r.tipo as Camera['tipo'],
          piano: r.piano,
          reparto: r.reparto,
          stato: r.stato as Camera['stato'],
          note: r.note,
          letti: r.beds.map(b => ({
            id: b.id,
            numero: b.label === 'A' ? 1 : b.label === 'B' ? 2 : 3,
            stato: (b.assignments.length > 0 ? 'occupato' : b.stato === 'manutenzione' ? 'manutenzione' : 'libero') as Camera['letti'][0]['stato'],
            pazienteNome: b.assignments[0]?.patient ? `${b.assignments[0].patient.lastName}, ${b.assignments[0].patient.firstName}` : undefined,
          })),
        })));
      })
      .catch(() => { /* keep empty array */ });
    // Load consegne from API (persisted handover cards)
    fetch(`${API_URL}/consegne`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Consegna[]) => setConsegne(data.map(c => ({ ...c, oraScadenza: c.oraScadenza ?? undefined }))))
      .catch(() => { /* keep empty array */ });
    // Load note/messaggi from API (persisted)
    fetch(`${API_URL}/notes`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Nota[]) => setNote(data.map(n => ({ ...n, pazienteId: n.pazienteId ?? undefined, pazienteNome: n.pazienteNome ?? undefined }))))
      .catch(() => { /* keep empty array */ });
  }, [utente, loadTherapySlots]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v); }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  // ── Auth ────────────────────────────────────────────────────────────────────

  function handleLogin(u: UtenteApp) {
    setUtente(u);
    const key: NavKey = u.ruolo === 'admin' ? 'admin-dashboard' : 'operator-dashboard';
    window.history.replaceState({ navKey: key }, '', `#/${key}`);
    setNavKey(key);
  }

  function handleLogout() {
    setUtente(null);
    setPazienti([]);
    setPazienteSelezionato(null);
    window.history.replaceState({}, '', '#/login');
    setNavKey('login');
  }

  // ── Operatori CRUD ──────────────────────────────────────────────────────────

  function addOperatore(op: Omit<Operatore, 'id' | 'pazientiAssegnati' | 'appuntamentiOggi' | 'iniziali'>) {
    const usedColors = operatori.map(o => o.colore);
    const colore = op.colore || (OPERATOR_COLOR_PALETTE.find(c => !usedColors.includes(c)) ?? OPERATOR_COLOR_PALETTE[0]);
    setOperatori(prev => [...prev, {
      ...op, colore,
      id: crypto.randomUUID(),
      pazientiAssegnati: 0,
      appuntamentiOggi: 0,
      iniziali: `${op.nome[0]}${op.cognome[0]}`.toUpperCase(),
    }]);
  }

  function updateOperatore(id: string, updates: Partial<Operatore>) {
    setOperatori(prev => prev.map(o => {
      if (o.id !== id) return o;
      const updated = { ...o, ...updates };
      if (updates.nome || updates.cognome) {
        updated.iniziali = `${updated.nome[0]}${updated.cognome[0]}`.toUpperCase();
      }
      return updated;
    }));
  }

  function toggleStatoOperatore(id: string) {
    setOperatori(prev => prev.map(o =>
      o.id === id ? { ...o, stato: o.stato === 'attivo' ? 'inattivo' : 'attivo' } : o
    ));
  }

  // ── Consegne CRUD ───────────────────────────────────────────────────────────

  // ── Consegne CRUD (API-persisted) ─────────────────────────────────────────

  async function addConsegna(c: Omit<Consegna, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/consegne`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
      if (!res.ok) { showToast('Impossibile creare la consegna'); return false; }
      const created = await res.json() as Consegna;
      setConsegne(prev => [{ ...created, oraScadenza: created.oraScadenza ?? undefined }, ...prev]);
      showToast('Consegna creata');
      return true;
    } catch {
      showToast('Impossibile creare la consegna');
      return false;
    }
  }

  async function updateConsegna(id: string, patch: Partial<Consegna>): Promise<boolean> {
    const snapshot = consegne;
    // Optimistic update
    setConsegne(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      const res = await fetch(`${API_URL}/consegne/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { setConsegne(snapshot); showToast('Impossibile salvare la consegna'); return false; }
      const updated = await res.json() as Consegna;
      setConsegne(prev => prev.map(c => c.id === id ? { ...updated, oraScadenza: updated.oraScadenza ?? undefined } : c));
      showToast('Consegna aggiornata');
      return true;
    } catch {
      setConsegne(snapshot);
      showToast('Impossibile salvare la consegna');
      return false;
    }
  }

  function updateConsegnaStato(id: string, stato: Consegna['stato']): Promise<boolean> {
    return updateConsegna(id, { stato });
  }

  async function deleteConsegna(id: string): Promise<void> {
    const snapshot = consegne;
    setConsegne(prev => prev.filter(c => c.id !== id));
    try {
      const res = await fetch(`${API_URL}/consegne/${id}`, { method: 'DELETE' });
      if (!res.ok) { setConsegne(snapshot); showToast('Impossibile eliminare la consegna'); }
    } catch {
      setConsegne(snapshot);
      showToast('Impossibile eliminare la consegna');
    }
  }

  // ── Appuntamenti CRUD ───────────────────────────────────────────────────────

  function addAppuntamento(apt: Omit<Appuntamento, 'id'>) {
    setAppuntamenti(prev => [...prev, { ...apt, id: crypto.randomUUID() }]);
  }

  // ── Camere CRUD ─────────────────────────────────────────────────────────────

  // Room CRUD now handled by RoomsManagement component directly via API

  // ── Schedules ───────────────────────────────────────────────────────────────

  function saveSchedule(s: ScheduleOperatore) {
    setSchedules(prev => {
      const idx = prev.findIndex(x => x.operatoreId === s.operatoreId);
      if (idx >= 0) return prev.map((x, i) => i === idx ? s : x);
      return [...prev, s];
    });
  }

  // ── Cartella CRUD (API-persisted) ─────────────────────────────────────────

  function getCartella(pazienteId: string): CartellaPaziente {
    return cartelle.find(c => c.pazienteId === pazienteId) ?? createDefaultCartella(pazienteId);
  }

  async function loadCartella(pazienteId: string): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/cartella`);
      if (!res.ok) return;
      const json = await res.json() as { patientId: string; data: CartellaPaziente | null };
      if (json.data) {
        setCartelle(prev => {
          const idx = prev.findIndex(c => c.pazienteId === pazienteId);
          const base = createDefaultCartella(pazienteId);
          const baseRec = base as unknown as Record<string, unknown>;
          const merged = { ...base, ...json.data, pazienteId } as unknown as Record<string, unknown>;
          // Defensive: a clinical-list field stored as a non-array (e.g. an object written by an
          // older import) must never reach the UI — coerce it back to the default array so
          // `.filter`/`.map` never crash the patient record.
          for (const k of Object.keys(baseRec)) {
            if (Array.isArray(baseRec[k]) && !Array.isArray(merged[k])) merged[k] = baseRec[k];
          }
          const safe = merged as unknown as CartellaPaziente;
          if (idx >= 0) return prev.map((c, i) => i === idx ? safe : c);
          return [...prev, safe];
        });
      }
    } catch {
      showToast('Impossibile caricare la cartella clinica');
    }
  }

  async function updateCartella(pazienteId: string, updates: Partial<CartellaPaziente>): Promise<boolean> {
    const existing = cartelle.find(c => c.pazienteId === pazienteId) ?? createDefaultCartella(pazienteId);
    const updated = { ...existing, ...updates };

    // Optimistic update
    setCartelle(prev => {
      const idx = prev.findIndex(c => c.pazienteId === pazienteId);
      return idx >= 0 ? prev.map((c, i) => i === idx ? updated : c) : [...prev, updated];
    });

    // Persist to backend; return success so callers (e.g. inline edit) can react to failure.
    const { pazienteId: _pid, ...dataToSave } = updated;
    try {
      const r = await fetch(`${API_URL}/patients/${pazienteId}/cartella`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSave }),
      });
      if (r.ok) { showToast('Dati salvati correttamente'); return true; }
      showToast('Impossibile salvare i dati');
      return false;
    } catch {
      showToast('Impossibile salvare i dati');
      return false;
    }
  }

  async function updatePaziente(id: string, updates: Partial<Pick<Paziente, 'email' | 'phone'>>) {
    setPazienti(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) showToast('Dati paziente aggiornati');
      else showToast('Impossibile aggiornare il paziente');
    } catch {
      showToast('Impossibile aggiornare il paziente');
    }
  }

  // ── Add patient (backend-persisted) ────────────────────────────────────────

  async function addPaziente(np: NuovoPaziente) {
    const addressParts = [np.address, np.comune, np.provincia, np.cap].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;

    const payload: Record<string, string> = {
      firstName: np.firstName.trim(),
      lastName: np.lastName.trim(),
      dateOfBirth: np.dateOfBirth,
    };
    if (np.sex)                      payload.sex                  = np.sex;
    if (np.email.trim())             payload.email                = np.email.trim();
    if (np.phone.trim())             payload.phone                = np.phone.trim();
    if (address)                     payload.address              = address;
    if (np.referenteNome.trim())     payload.emergencyContactName = np.referenteNome.trim();
    if (np.referenteTelefono.trim()) payload.emergencyContactPhone = np.referenteTelefono.trim();

    const res = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      throw new Error((data.error as string) || 'Errore durante la creazione del paziente');
    }

    const newP = data as unknown as Paziente;
    setPazienti(prev => [...prev, newP]);

    // Seed cartella from form fields not persisted in backend
    const cartellaInit: Partial<CartellaPaziente> = {};
    if (np.camera) cartellaInit.cameraNumero = np.camera;
    if (np.letto)  cartellaInit.lettoNumero  = np.letto;
    if (np.condizioniIniziali || np.motivoIngresso || np.notaClinicaIniziale || np.allergie || np.farmaci || np.alertClinici) {
      cartellaInit.anamnesi = {
        fisiologica: np.condizioniIniziali || '',
        patologicaRemota: '',
        patologicaProssima: np.motivoIngresso || '',
        familiare: '',
        lavorativa: '',
        abitudini: '',
        note: [np.alertClinici, np.notaClinicaIniziale, np.noteIniziali, np.allergie ? `Allergie: ${np.allergie}` : '', np.farmaci ? `Farmaci: ${np.farmaci}` : ''].filter(Boolean).join('\n'),
        updatedAt: new Date().toISOString(),
        operatore: np.operatoreId,
      };
    }
    if (Object.keys(cartellaInit).length > 0) {
      updateCartella(newP.id, cartellaInit);
    }
    showToast('Paziente creato correttamente');
    selectPaziente(newP);
  }

  // ── Navigate to patient by name ─────────────────────────────────────────────

  function goToPazienteByNome(nome: string) {
    if (!nome) return;
    const q = nome.toLowerCase().trim();
    const found = pazienti.find(p =>
      `${p.lastName}, ${p.firstName}`.toLowerCase() === q ||
      `${p.firstName} ${p.lastName}`.toLowerCase() === q ||
      `${p.lastName} ${p.firstName}`.toLowerCase() === q
    );
    if (found) selectPaziente(found);
  }

  // ── Note CRUD ───────────────────────────────────────────────────────────────

  // ── Note / Messaggi CRUD (API-persisted) ──────────────────────────────────

  async function addNota(n: Omit<Nota, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n),
      });
      if (!res.ok) { showToast('Impossibile inviare la nota'); return false; }
      const created = await res.json() as Nota;
      setNote(prev => [{ ...created, pazienteId: created.pazienteId ?? undefined, pazienteNome: created.pazienteNome ?? undefined }, ...prev]);
      showToast('Nota inviata');
      return true;
    } catch {
      showToast('Impossibile inviare la nota');
      return false;
    }
  }

  async function updateNota(id: string, patch: Partial<Nota>): Promise<boolean> {
    const snapshot = note;
    setNote(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
    try {
      const res = await fetch(`${API_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { setNote(snapshot); showToast('Impossibile salvare la nota'); return false; }
      const updated = await res.json() as Nota;
      setNote(prev => prev.map(n => n.id === id ? { ...updated, pazienteId: updated.pazienteId ?? undefined, pazienteNome: updated.pazienteNome ?? undefined } : n));
      return true;
    } catch {
      setNote(snapshot);
      showToast('Impossibile salvare la nota');
      return false;
    }
  }

  function updateNotaStato(id: string, stato: StatoNota): Promise<boolean> {
    return updateNota(id, { stato });
  }

  // ── Therapy CRUD (API-persisted with optimistic update) ─────────────────────

  async function confirmTherapy(info: {
    patientId: string;
    therapyId: string;
    drugName: string;
    dosage: string;
    route: string;
    fascia: string;
    ora: string;
  }) {
    const now = new Date();
    setTherapySlots(prev => prev.map(slot => {
      if (slot.fascia !== info.fascia) return slot;
      return {
        ...slot,
        summary: {
          ...slot.summary,
          administered: slot.summary.administered + 1,
          pending: Math.max(0, slot.summary.pending - 1),
        },
        patients: slot.patients.map((p: TherapySlotPatient) => {
          if (p.patientId !== info.patientId) return p;
          return {
            ...p,
            administrations: p.administrations.map((a: TherapyAdministration) =>
              a.therapyId === info.therapyId
                ? { ...a, status: 'administered' as const, administeredAt: now.toISOString(), administeredBy: utente?.nome ?? '' }
                : a
            ),
          };
        }),
      };
    }));

    try {
      const res = await fetch(`${API_URL}/therapy-slots/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: info.patientId,
          farmacoNome: info.drugName,
          farmacoDose: info.dosage,
          farmacoVia: info.route,
          date: now.toISOString().slice(0, 10),
          fascia: info.fascia,
          ora: info.ora,
          operatoreId: utente?.id ?? '',
          operatoreNome: utente?.nome ?? '',
          therapyId: info.therapyId,
        }),
      });

      if (res.status === 409) {
        showToast('Terapia già erogata');
        loadTherapySlots();
        return;
      }
      if (res.ok) {
        showToast('Somministrazione confermata');
        loadTherapySlots();
      } else {
        showToast('Errore durante conferma');
        loadTherapySlots();
      }
    } catch {
      showToast('Errore di rete');
      loadTherapySlots();
    }
  }

  async function notAdministeredTherapy(
    info: {
      patientId: string;
      therapyId: string;
      drugName: string;
      dosage: string;
      route: string;
      fascia: string;
      ora: string;
    },
    motivo: MotivoNonErogazione,
    noteText: string,
  ) {
    const now = new Date();
    setTherapySlots(prev => prev.map(slot => {
      if (slot.fascia !== info.fascia) return slot;
      return {
        ...slot,
        summary: {
          ...slot.summary,
          notAdministered: slot.summary.notAdministered + 1,
          pending: Math.max(0, slot.summary.pending - 1),
        },
        patients: slot.patients.map((p: TherapySlotPatient) => {
          if (p.patientId !== info.patientId) return p;
          return {
            ...p,
            administrations: p.administrations.map((a: TherapyAdministration) =>
              a.therapyId === info.therapyId
                ? { ...a, status: 'not_administered' as const, notAdministeredReason: motivo }
                : a
            ),
          };
        }),
      };
    }));

    try {
      const res = await fetch(`${API_URL}/therapy-slots/not-administered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: info.patientId,
          farmacoNome: info.drugName,
          farmacoDose: info.dosage,
          farmacoVia: info.route,
          date: now.toISOString().slice(0, 10),
          fascia: info.fascia,
          ora: info.ora,
          operatoreId: utente?.id ?? '',
          operatoreNome: utente?.nome ?? '',
          therapyId: info.therapyId,
          motivo,
          note: noteText,
        }),
      });

      if (res.ok) {
        showToast('Non somministrazione registrata');
        loadTherapySlots();
      } else {
        showToast('Errore durante registrazione');
        loadTherapySlots();
      }
    } catch {
      showToast('Errore di rete');
      loadTherapySlots();
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  const searchResults = searchQuery.length > 1
    ? pazienti.filter(p => {
        const q = searchQuery.toLowerCase();
        return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.medicalRecordNumber.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  // ── Unread notes count ──────────────────────────────────────────────────────

  const utenteId = utente?.id ?? '';
  const isAdmin = utente?.ruolo === 'admin';

  const unreadNotes = note.filter(n =>
    n.stato === 'non_letta' &&
    (n.destinatarioId === utenteId || n.destinatarioId === 'tutti' ||
    (isAdmin && n.destinatarioId === 'admin'))
  ).length;

  // ── Login gate ──────────────────────────────────────────────────────────────

  if (!utente) return <Login onLogin={handleLogin} />;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      {toastMsg && (
        <div className="app-toast app-toast--success" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{toastMsg}</span>
          <button className="app-toast__close" onClick={() => setToastMsg(null)} aria-label="Chiudi">×</button>
        </div>
      )}

      {/* Teams-style sidebar */}
      <TeamsLikeSidebar
        activeKey={navKey}
        utente={utente}
        onNavigate={(k) => navigate(k)}
        onLogout={handleLogout}
        unreadNotes={unreadNotes}
      />

      {/* Main */}
      <div className="main-area-clean">
        {/* Compact Topbar */}
        <div className="compact-topbar">
          <button
            className="icon-btn"
            onClick={() => setSearchOpen(v => !v)}
            title="Cerca (Ctrl+K)"
          >
            <IcoSearch />
          </button>
        </div>

        {/* Search overlay */}
        {searchOpen && (
          <div className="search-overlay" onClick={() => setSearchOpen(false)}>
            <div className="search-modal" onClick={e => e.stopPropagation()}>
              <div className="search-modal__input-wrap">
                <IcoSearch />
                <input ref={searchRef} className="search-modal__input" type="search"
                  placeholder="Cerca paziente per nome o MRN…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <button className="icon-btn" onClick={() => setSearchOpen(false)}><IcoX /></button>
              </div>
              {searchResults.length > 0 && (
                <ul className="search-modal__results">
                  {searchResults.map(p => (
                    <li key={p.id}>
                      <button className="search-modal__result-item"
                        onClick={() => { selectPaziente(p); setSearchOpen(false); setSearchQuery(''); }}>
                        <span className="op-avatar-sm" style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden="true">
                          {p.firstName[0]}{p.lastName[0]}
                        </span>
                        <div>
                          <span className="search-result__name">{p.lastName}, {p.firstName}</span>
                          <span className="search-result__mrn">{p.medicalRecordNumber}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchQuery.length > 1 && searchResults.length === 0 && (
                <p className="search-modal__empty">Nessun paziente trovato.</p>
              )}
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="page-content content-panel">

          {/* ── ADMIN ── */}
          {isAdmin && navKey === 'admin-dashboard' && (
            <AdminDashboard
              operatori={operatori}
              consegne={consegne}
              camere={camere}
              totalePazienti={pazienti.length}
              loadingPazienti={loadingPazienti}
              onNavigate={navigate}
              onSelectPaziente={goToPazienteByNome}
              cartelle={cartelle}
            />
          )}
          {isAdmin && navKey === 'gestione-operatori' && (
            <OperatorManagement
              operatori={operatori}
              onAdd={addOperatore}
              onUpdate={updateOperatore}
              onToggleStato={toggleStatoOperatore}
            />
          )}
          {isAdmin && navKey === 'agenda-admin' && (
            <AdminAgenda
              operatori={operatori}
              appuntamenti={appuntamenti}
              pazienti={pazienti}
              onAddAppuntamento={addAppuntamento}
              onAddPaziente={() => {}}
              onSelectPaziente={goToPazienteByNome}
            />
          )}
          {isAdmin && navKey === 'posti-letto' && (
            <RoomsManagement />
          )}
          {isAdmin && navKey === 'orari-operatori' && (
            <OperatorSchedule
              operatori={operatori}
              schedules={schedules}
              onSave={saveSchedule}
            />
          )}

          {/* ── SHARED ── */}
          {navKey === 'consegne' && (
            <ConsegnePage
              consegne={consegne}
              operatoreNome={utente.nome}
              isAdmin={isAdmin}
              onAdd={addConsegna}
              onUpdate={updateConsegna}
              onUpdateStato={updateConsegnaStato}
              onDelete={deleteConsegna}
              onSelectPaziente={goToPazienteByNome}
            />
          )}
          {navKey === 'note' && (
            <NotesPage
              note={note}
              utenteId={utenteId}
              utenteNome={utente.nome}
              isAdmin={isAdmin}
              operatori={operatori}
              onAdd={addNota}
              onUpdate={updateNota}
              onUpdateStato={updateNotaStato}
            />
          )}

          {/* ── OPERATOR ── */}
          {!isAdmin && navKey === 'operator-dashboard' && (
            <OperatorDashboard
              utente={utente}
              consegne={consegne}
              agenda={MOCK_AGENDA}
              totalePazienti={pazienti.length}
              loadingPazienti={loadingPazienti}
              onNavigate={navigate}
              onSelectPaziente={goToPazienteByNome}
              cartelle={cartelle}
              pazienti={pazienti}
            />
          )}
          {!isAdmin && navKey === 'pazienti' && (
            <PatientList
              pazienti={pazienti}
              consegne={consegne}
              operatori={operatori}
              camere={camere}
              loading={loadingPazienti}
              onSelect={selectPaziente}
              onAddPaziente={addPaziente}
              operatorId={utente?.id}
              operatorRole={utente?.ruolo}
              onImported={() => {
                // REQ-018: refresh the patient list after an imported patient is created.
                setLoadingPazienti(true);
                fetch(`${API_URL}/patients`)
                  .then(r => r.json())
                  .then((data: Paziente[]) => setPazienti(data))
                  .catch(() => { /* keep current list */ })
                  .finally(() => setLoadingPazienti(false));
              }}
            />
          )}
          {navKey === 'dettaglio-paziente' && !pazienteSelezionato && (
            <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 16, marginBottom: 16 }}>Nessun paziente selezionato.</p>
              <button className="btn-primary" onClick={() => goBack('pazienti')}>Vai alla lista pazienti</button>
            </div>
          )}
          {navKey === 'dettaglio-paziente' && pazienteSelezionato && (
            <PatientDetail
              paziente={pazienteSelezionato}
              cartella={getCartella(pazienteSelezionato.id)}
              consegne={consegne}
              operatori={operatori}
              camere={camere}
              onBack={() => goBack('pazienti')}
              backLabel={NAV_LABELS[prevNavKeyRef.current ?? 'pazienti']}
              onAddConsegna={addConsegna}
              onUpdateConsegnaStato={updateConsegnaStato}
              onUpdateCartella={updateCartella}
              onUpdatePaziente={updatePaziente}
              operatoreNome={utente.nome}
              operatoreId={utenteId}
            />
          )}
          {!isAdmin && navKey === 'parametri-multipaziente' && (
            <MultiPatientParametri
              pazienti={pazienti}
              cartelle={cartelle}
              operatoreNome={utente.nome}
              loading={loadingPazienti}
              onSelectPaziente={selectPaziente}
              onUpdateCartella={updateCartella}
            />
          )}
          {!isAdmin && navKey === 'agenda-operatore' && (
            <OperatorAgenda
              operatoreId={utenteId}
              nomeOperatore={utente.nome}
              operatori={operatori}
              appuntamenti={appuntamenti}
              pazienti={pazienti}
              onAddAppuntamento={addAppuntamento}
              onSelectPaziente={goToPazienteByNome}
              therapySlots={therapySlots}
              onConfirmTherapy={confirmTherapy}
              onNotAdministeredTherapy={notAdministeredTherapy}
              onLoadTherapySlots={loadTherapySlots}
            />
          )}
        </main>
      </div>

      <AgnosPanel
        key={aiOpenTrigger}
        forceOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        operatorId={utente?.id}
        operatorRole={utente?.ruolo}
        operatorName={utente?.nome}
        currentPatientId={navKey === 'dettaglio-paziente' ? pazienteSelezionato?.id : undefined}
        currentPatientName={navKey === 'dettaglio-paziente' && pazienteSelezionato ? `${pazienteSelezionato.lastName ?? ''} ${pazienteSelezionato.firstName ?? ''}`.trim() : undefined}
        onExecuted={() => { if (pazienteSelezionato) loadCartella(pazienteSelezionato.id); }}
        onNavigate={(n) => { if (n.patientId) { const p = pazienti.find((x) => x.id === n.patientId); if (p) selectPaziente(p); } }}
      />
    </div>
  );
}
