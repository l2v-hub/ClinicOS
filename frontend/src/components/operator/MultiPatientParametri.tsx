import { useState } from 'react';
import type {
  Paziente, CartellaPaziente,
  ParametriMensili, ParametroGiorno,
} from '../../types';
import { IcoCheck, IcoX } from '../../icons';

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

function todayStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function meseCorrente(): { mese: number; anno: number; giorno: number } {
  const d = new Date();
  return { mese: d.getMonth() + 1, anno: d.getFullYear(), giorno: d.getDate() };
}

function getParametroOggi(cartella: CartellaPaziente): ParametroGiorno | null {
  const { mese, anno, giorno } = meseCorrente();
  const mensile = cartella.parametriMensili?.find(m => m.mese === mese && m.anno === anno);
  return mensile?.giorni.find(g => g.giorno === giorno) ?? null;
}

function emptyRow(giorno: number): RigaEditabile {
  return {
    giorno,
    pa: '', fc: '', spo2: '', temperatura: '',
    dtx: '', evacuazione: '', note: '',
    ora: todayStr(),
    operatore: '',
  };
}

interface RigaEditabile {
  giorno: number;
  pa: string;
  fc: string;
  spo2: string;
  temperatura: string;
  dtx: string;
  evacuazione: string;
  note: string;
  ora: string;
  operatore: string;
}

function parametroToRiga(p: ParametroGiorno, giorno: number): RigaEditabile {
  return {
    giorno,
    pa: p.pa ?? '',
    fc: p.fc ?? '',
    spo2: p.spo2 ?? '',
    temperatura: p.temperatura ?? '',
    dtx: p.dtx08 ?? '',
    evacuazione: p.evacuazione ?? '',
    note: p.note ?? '',
    ora: todayStr(),
    operatore: p.firmaIpM ?? '',
  };
}

function rigaToParametroGiorno(r: RigaEditabile): ParametroGiorno {
  return {
    giorno: r.giorno,
    pa: r.pa || undefined,
    fc: r.fc || undefined,
    spo2: r.spo2 || undefined,
    temperatura: r.temperatura || undefined,
    dtx08: r.dtx || undefined,
    evacuazione: r.evacuazione || undefined,
    note: r.note || undefined,
    firmaIpM: r.operatore || undefined,
  };
}

function rigaHasData(r: RigaEditabile): boolean {
  return !!(r.pa || r.fc || r.spo2 || r.temperatura || r.dtx || r.evacuazione || r.note);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  pazienti: Paziente[];
  cartelle: CartellaPaziente[];
  operatoreNome: string;
  loading: boolean;
  onSelectPaziente: (p: Paziente) => void;
  onUpdateCartella: (pazienteId: string, updates: Partial<CartellaPaziente>) => void;
}

// ── Singola riga paziente (sub-component) ─────────────────────────────────────

interface RigaProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  operatoreNome: string;
  onClickPaziente: () => void;
  onSalva: (pazienteId: string, riga: RigaEditabile) => void;
}

function RigaPaziente({ paziente, cartella, operatoreNome, onClickPaziente, onSalva }: RigaProps) {
  const { giorno } = meseCorrente();
  const existing = getParametroOggi(cartella);
  const initialRiga = existing
    ? parametroToRiga(existing, giorno)
    : { ...emptyRow(giorno), operatore: operatoreNome };

  const [riga, setRiga] = useState<RigaEditabile>(initialRiga);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ricava camera/letto dalla cartella
  const cameraInfo = (() => {
    const cam = cartella.cameraNumero || '';
    const let_ = cartella.lettoNumero || '';
    if (cam && let_) return `Cam ${cam} - L${let_}`;
    if (cam) return `Cam ${cam}`;
    return '—';
  })();

  function set(field: keyof RigaEditabile, value: string) {
    setRiga(prev => ({ ...prev, [field]: value }));
    setDirty(true);
    setSaved(false);
  }

  function handleSalva() {
    onSalva(paziente.id, riga);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleAnnulla() {
    setRiga(initialRiga);
    setDirty(false);
    setSaved(false);
  }

  const rowClass = `mpp-row${dirty ? ' mpp-row--dirty' : ''}${saved ? ' mpp-row--saved' : ''}`;

  return (
    <div className={rowClass}>
      {/* Intestazione paziente */}
      <div className="mpp-row__head">
        <button className="mpp-paziente-link" onClick={onClickPaziente} title="Apri scheda paziente">
          <span className="mpp-avatar">{paziente.firstName[0]}{paziente.lastName[0]}</span>
          <div className="mpp-paziente-info">
            <span className="mpp-paziente-nome">{paziente.lastName}, {paziente.firstName}</span>
            <span className="mpp-paziente-sub">{cameraInfo}</span>
          </div>
        </button>
        <div className="mpp-row__status">
          {saved && <span className="mpp-badge mpp-badge--saved"><IcoCheck /> Salvato</span>}
          {dirty && <span className="mpp-badge mpp-badge--dirty">Modificato</span>}
        </div>
      </div>

      {/* Griglia parametri */}
      <div className="mpp-fields">
        <label className="mpp-field">
          <span className="mpp-field__label">PA <span className="mpp-field__unit">mmHg</span></span>
          <input
            className="mpp-input"
            type="text"
            placeholder="es. 120/80"
            value={riga.pa}
            onChange={e => set('pa', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">SpO₂ <span className="mpp-field__unit">%</span></span>
          <input
            className="mpp-input"
            type="text"
            placeholder="es. 98"
            value={riga.spo2}
            onChange={e => set('spo2', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">FC <span className="mpp-field__unit">bpm</span></span>
          <input
            className="mpp-input"
            type="text"
            placeholder="es. 72"
            value={riga.fc}
            onChange={e => set('fc', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">TC <span className="mpp-field__unit">°C</span></span>
          <input
            className="mpp-input"
            type="text"
            placeholder="es. 36.5"
            value={riga.temperatura}
            onChange={e => set('temperatura', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">DTX/Gli <span className="mpp-field__unit">mg/dl</span></span>
          <input
            className="mpp-input"
            type="text"
            placeholder="es. 110"
            value={riga.dtx}
            onChange={e => set('dtx', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">Evacuazione</span>
          <input
            className="mpp-input"
            type="text"
            placeholder="es. Sì / No"
            value={riga.evacuazione}
            onChange={e => set('evacuazione', e.target.value)}
          />
        </label>

        <label className="mpp-field mpp-field--wide">
          <span className="mpp-field__label">Note rapide</span>
          <input
            className="mpp-input"
            type="text"
            placeholder="Osservazioni veloci…"
            value={riga.note}
            onChange={e => set('note', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">Ora rilevazione</span>
          <input
            className="mpp-input"
            type="time"
            value={riga.ora}
            onChange={e => set('ora', e.target.value)}
          />
        </label>

        <label className="mpp-field">
          <span className="mpp-field__label">Operatore</span>
          <input
            className="mpp-input"
            type="text"
            placeholder="Sigla / Nome"
            value={riga.operatore}
            onChange={e => set('operatore', e.target.value)}
          />
        </label>
      </div>

      {/* Azioni riga */}
      <div className="mpp-row__actions">
        <button
          className="btn-primary mpp-btn-salva"
          onClick={handleSalva}
          disabled={!dirty && !rigaHasData(riga)}
          title="Salva questa riga"
        >
          <IcoCheck /> Salva riga
        </button>
        <button
          className="btn-secondary mpp-btn-annulla"
          onClick={handleAnnulla}
          disabled={!dirty}
          title="Annulla modifiche"
        >
          <IcoX /> Annulla
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MultiPatientParametri({
  pazienti, cartelle,
  operatoreNome, loading,
  onSelectPaziente, onUpdateCartella,
}: Props) {

  function getCartella(pazienteId: string): CartellaPaziente {
    return cartelle.find(c => c.pazienteId === pazienteId) ?? createEmptyCartella(pazienteId);
  }

  function salvaRiga(pazienteId: string, riga: RigaEditabile) {
    const cartella = getCartella(pazienteId);
    const { mese, anno } = meseCorrente();
    const parametroGiorno = rigaToParametroGiorno(riga);

    const mensili: ParametriMensili[] = [...(cartella.parametriMensili ?? [])];
    const idxMensile = mensili.findIndex(m => m.mese === mese && m.anno === anno);

    if (idxMensile >= 0) {
      const giorni = [...mensili[idxMensile].giorni];
      const idxGiorno = giorni.findIndex(g => g.giorno === riga.giorno);
      if (idxGiorno >= 0) {
        giorni[idxGiorno] = parametroGiorno;
      } else {
        giorni.push(parametroGiorno);
      }
      mensili[idxMensile] = { ...mensili[idxMensile], giorni };
    } else {
      mensili.push({
        id: uid(),
        mese,
        anno,
        giorni: [parametroGiorno],
        createdAt: new Date().toISOString(),
      });
    }

    onUpdateCartella(pazienteId, { parametriMensili: mensili });
  }

  const oggi = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <div className="mpp-empty">
        <p>Caricamento pazienti…</p>
      </div>
    );
  }

  if (pazienti.length === 0) {
    return (
      <div className="mpp-empty">
        <p>Nessun paziente in elenco.</p>
      </div>
    );
  }

  return (
    <div className="mpp-page">
      {/* Intestazione */}
      <div className="mpp-header">
        <div className="mpp-header__left">
          <h1 className="mpp-header__title">Parametri pazienti</h1>
          <span className="mpp-header__date">{oggi}</span>
        </div>
        <div className="mpp-header__actions">
          <span className="mpp-header__count">{pazienti.length} pazienti</span>
        </div>
      </div>

      {/* Istruzione */}
      <p className="mpp-hint">
        Compila i parametri vitali per ogni paziente. Clicca sul nome per aprire la scheda. Salva ogni riga individualmente.
      </p>

      {/* Lista righe pazienti */}
      <div className="mpp-list">
        {pazienti.map(paziente => (
          <RigaPaziente
            key={paziente.id}
            paziente={paziente}
            cartella={getCartella(paziente.id)}
            operatoreNome={operatoreNome}
            onClickPaziente={() => onSelectPaziente(paziente)}
            onSalva={salvaRiga}
          />
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function createEmptyCartella(pazienteId: string): CartellaPaziente {
  return {
    pazienteId,
    statoRicovero: 'ricoverato',
    anamnesi: {
      fisiologica: '', patologicaRemota: '', patologicaProssima: '',
      familiare: '', lavorativa: '', abitudini: '', note: '',
      updatedAt: new Date().toISOString(), operatore: '',
    },
    diagnosi: [],
    terapie: [],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: { obiettivi: '', interventiPrevisti: '', notePianificazione: '', dataAggiornamento: '', operatore: '' },
    indicatoriRischio: [],
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    parametriMensili: [],
  };
}
