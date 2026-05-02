import { useState, useEffect, useRef } from 'react';
import './App.css';
import { API_URL } from './config';

import type {
  UtenteApp, Paziente, Operatore, Consegna, NavKey,
  Appuntamento, Camera, Letto, ScheduleOperatore, Nota, StatoNota,
  CartellaPaziente,
} from './types';
import { OPERATOR_COLOR_PALETTE } from './types';
import {
  MOCK_OPERATORI, MOCK_CONSEGNE, MOCK_AGENDA,
  MOCK_APPUNTAMENTI, MOCK_CAMERE, MOCK_SCHEDULES, MOCK_NOTE,
  createDefaultCartella,
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

import {
  IcoDashboard, IcoPazienti, IcoCalendar, IcoConsegne, IcoOperatori,
  IcoBed, IcoClock, IcoMessage, IcoLogout, IcoSearch, IcoX,
} from './icons';

// ── Navigation helpers ─────────────────────────────────────────────────────────

interface NavItem { key: NavKey; label: string; icon: React.ReactNode; }

const ADMIN_NAV: NavItem[] = [
  { key: 'admin-dashboard',    label: 'Dashboard',        icon: <IcoDashboard /> },
  { key: 'gestione-operatori', label: 'Operatori',        icon: <IcoOperatori /> },
  { key: 'agenda-admin',       label: 'Agenda',           icon: <IcoCalendar /> },
  { key: 'posti-letto',        label: 'Posti Letto',      icon: <IcoBed /> },
  { key: 'orari-operatori',    label: 'Orari',            icon: <IcoClock /> },
  { key: 'consegne',           label: 'Consegne',         icon: <IcoConsegne /> },
  { key: 'note',               label: 'Note',             icon: <IcoMessage /> },
];

const OPERATOR_NAV: NavItem[] = [
  { key: 'operator-dashboard', label: 'Dashboard',        icon: <IcoDashboard /> },
  { key: 'pazienti',           label: 'Pazienti',         icon: <IcoPazienti /> },
  { key: 'consegne',           label: 'Consegne',         icon: <IcoConsegne /> },
  { key: 'agenda-operatore',   label: 'Agenda',           icon: <IcoCalendar /> },
  { key: 'note',               label: 'Note',             icon: <IcoMessage /> },
];

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [utente, setUtente] = useState<UtenteApp | null>(null);
  const [navKey, setNavKey] = useState<NavKey>('admin-dashboard');

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
  const [consegne, setConsegne] = useState<Consegna[]>(MOCK_CONSEGNE);
  const [cartelle, setCartelle] = useState<CartellaPaziente[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>(MOCK_APPUNTAMENTI);
  const [camere, setCamere] = useState<Camera[]>(MOCK_CAMERE);
  const [schedules, setSchedules] = useState<ScheduleOperatore[]>(MOCK_SCHEDULES);
  const [note, setNote] = useState<Nota[]>(MOCK_NOTE);

  // ── History API navigation ─────────────────────────────────────────────────

  function pushNav(key: NavKey, paziente?: Paziente) {
    const hash = `#/${key}`;
    window.history.pushState({ navKey: key, pazienteId: paziente?.id }, '', hash);
    setNavKey(key);
    if (paziente) {
      setPazienteSelezionato(paziente);
    } else if (key !== 'dettaglio-paziente') {
      setPazienteSelezionato(null);
    }
  }

  function navigate(key: NavKey) { pushNav(key); }

  function selectPaziente(p: Paziente) { pushNav('dettaglio-paziente', p); }

  // Restore nav from hash on mount + listen to popstate
  useEffect(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash) {
      const k = hash as NavKey;
      setNavKey(k);
    }

    function onPopState(e: PopStateEvent) {
      if (e.state?.navKey) {
        setNavKey(e.state.navKey as NavKey);
        if (e.state.navKey !== 'dettaglio-paziente') {
          setPazienteSelezionato(null);
        }
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
  }, [utente]);

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

  function addConsegna(c: Omit<Consegna, 'id' | 'createdAt'>) {
    setConsegne(prev => [{ ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev]);
  }

  function updateConsegnaStato(id: string, stato: Consegna['stato']) {
    setConsegne(prev => prev.map(c => c.id === id ? { ...c, stato } : c));
  }

  function deleteConsegna(id: string) {
    setConsegne(prev => prev.filter(c => c.id !== id));
  }

  // ── Appuntamenti CRUD ───────────────────────────────────────────────────────

  function addAppuntamento(apt: Omit<Appuntamento, 'id'>) {
    setAppuntamenti(prev => [...prev, { ...apt, id: crypto.randomUUID() }]);
  }

  // ── Camere CRUD ─────────────────────────────────────────────────────────────

  function addCamera(c: Omit<Camera, 'id'>) {
    setCamere(prev => [...prev, { ...c, id: crypto.randomUUID() }]);
  }

  function updateCamera(id: string, updates: Partial<Camera>) {
    setCamere(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function updateLetto(cameraId: string, lettoId: string, updates: Partial<Letto>) {
    setCamere(prev => prev.map(c =>
      c.id === cameraId
        ? { ...c, letti: c.letti.map(l => l.id === lettoId ? { ...l, ...updates } : l) }
        : c
    ));
  }

  // ── Schedules ───────────────────────────────────────────────────────────────

  function saveSchedule(s: ScheduleOperatore) {
    setSchedules(prev => {
      const idx = prev.findIndex(x => x.operatoreId === s.operatoreId);
      if (idx >= 0) return prev.map((x, i) => i === idx ? s : x);
      return [...prev, s];
    });
  }

  // ── Cartella CRUD ────────────────────────────────────────────────────────────

  function getCartella(pazienteId: string): CartellaPaziente {
    return cartelle.find(c => c.pazienteId === pazienteId) ?? createDefaultCartella(pazienteId);
  }

  function updateCartella(pazienteId: string, updates: Partial<CartellaPaziente>) {
    setCartelle(prev => {
      const idx = prev.findIndex(c => c.pazienteId === pazienteId);
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, ...updates } : c);
      return [...prev, { ...createDefaultCartella(pazienteId), ...updates }];
    });
  }

  function updatePaziente(id: string, updates: Partial<Pick<Paziente, 'email' | 'phone'>>) {
    setPazienti(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  // ── Note CRUD ───────────────────────────────────────────────────────────────

  function addNota(n: Omit<Nota, 'id' | 'createdAt'>) {
    setNote(prev => [{ ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev]);
  }

  function updateNotaStato(id: string, stato: StatoNota) {
    setNote(prev => prev.map(n => n.id === id ? { ...n, stato } : n));
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

  const navItems = isAdmin ? ADMIN_NAV : OPERATOR_NAV;
  const activeNav = navItems.find(n => n.key === navKey) ?? navItems[0];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      {/* Navigation Rail */}
      <aside className="nav-rail">
        <div className="nav-rail__brand">
          <span className="nav-rail__brand-icon">✚</span>
          <span className="nav-rail__brand-abbr">OS</span>
        </div>

        <nav className="nav-rail__nav">
          {navItems.map(item => {
            const isActive = navKey === item.key ||
              (navKey === 'dettaglio-paziente' && item.key === 'pazienti');
            const badge = item.key === 'note' && unreadNotes > 0 ? unreadNotes : 0;
            return (
              <button
                key={item.key}
                className={`nav-rail__item${isActive ? ' active' : ''}`}
                onClick={() => navigate(item.key)}
                title={item.label}
              >
                <span className="nav-rail__icon">{item.icon}</span>
                <span className="nav-rail__label">{item.label}</span>
                {badge > 0 && <span className="nav-rail__badge">{badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="nav-rail__footer">
          <div className="nav-rail__avatar" title={`${utente.nome} — ${utente.reparto}`}>
            {utente.iniziali}
          </div>
          <button className="nav-rail__logout" onClick={handleLogout} title="Esci">
            <IcoLogout />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar__breadcrumb">
            {navKey === 'dettaglio-paziente' && pazienteSelezionato ? (
              <>
                <button className="link-btn" onClick={() => navigate('pazienti')}>Pazienti</button>
                <span className="topbar__sep">›</span>
                <span>{pazienteSelezionato.lastName}, {pazienteSelezionato.firstName}</span>
              </>
            ) : (
              <span>{activeNav.label}</span>
            )}
          </div>

          <div className="topbar__right">
            <button
              className={`topbar__search-btn${searchOpen ? ' active' : ''}`}
              onClick={() => setSearchOpen(v => !v)} title="Cerca (Ctrl+K)">
              <IcoSearch />
              <span className="topbar__search-hint">Ctrl+K</span>
            </button>
          </div>
        </header>

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
                        <span className="op-avatar-sm" style={{ width: 32, height: 32, fontSize: 12 }}>
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
        <main className="page-content">

          {/* ── ADMIN ── */}
          {isAdmin && navKey === 'admin-dashboard' && (
            <AdminDashboard
              operatori={operatori}
              consegne={consegne}
              camere={camere}
              totalePazienti={pazienti.length}
              loadingPazienti={loadingPazienti}
              onNavigate={navigate}
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
            />
          )}
          {isAdmin && navKey === 'posti-letto' && (
            <RoomsManagement
              camere={camere}
              onAddCamera={addCamera}
              onUpdateCamera={updateCamera}
              onUpdateLetto={updateLetto}
            />
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
              onUpdateStato={updateConsegnaStato}
              onDelete={deleteConsegna}
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
            />
          )}
          {!isAdmin && navKey === 'pazienti' && (
            <PatientList
              pazienti={pazienti}
              consegne={consegne}
              loading={loadingPazienti}
              onSelect={selectPaziente}
            />
          )}
          {navKey === 'dettaglio-paziente' && pazienteSelezionato && (
            <PatientDetail
              paziente={pazienteSelezionato}
              cartella={getCartella(pazienteSelezionato.id)}
              consegne={consegne}
              operatori={operatori}
              camere={camere}
              onBack={() => navigate('pazienti')}
              onAddConsegna={addConsegna}
              onUpdateConsegnaStato={updateConsegnaStato}
              onUpdateCartella={updateCartella}
              onUpdatePaziente={updatePaziente}
              operatoreNome={utente.nome}
              operatoreId={utenteId}
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
            />
          )}
        </main>
      </div>
    </div>
  );
}
