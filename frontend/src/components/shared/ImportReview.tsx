import { useMemo, useState } from 'react';
import type { NuovoPaziente } from '../../types';

// REQ-017: review + prefill of the Nuovo Paziente form from the merged extraction
// proposal (REQ-016). Nothing is persisted until "Crea paziente" — and full
// clinical persistence (cartella/diagnosi/…) is REQ-018; here we map the reviewed
// anagrafica/ingresso into the existing patient-create payload.

interface Provenance { docId: string; filename: string; docDate?: string; model: string; snippet?: string }
interface Candidate { value: unknown; sources: Provenance[] }
interface MergedField { status: string; value: unknown; candidates?: Candidate[]; sources: Provenance[] }
interface MergedItem { key: string; value: Record<string, unknown>; status: string; candidates?: Candidate[]; sources: Provenance[] }
interface MergedList { status: string; items: MergedItem[]; duplicatesRemoved: number }
interface MergedProposal {
  _merge: { version: string; report: { filled: number; missing: number; conflict: number; duplicate: number }; documents: Provenance[] };
  anagrafica: Record<string, MergedField>;
  cartella: Record<string, MergedField | MergedList>;
}

interface JobDoc { id: string; filename: string; sizeBytes: number }

interface Props {
  proposal: MergedProposal;
  documents: JobDoc[];
  busy?: boolean;
  onCreate: (np: NuovoPaziente) => void;
  onBack: () => void;
}

function isList(v: MergedField | MergedList | undefined): v is MergedList {
  return !!v && 'items' in v;
}
function asField(v: MergedField | MergedList | undefined): MergedField | undefined {
  return v && !isList(v) ? v : undefined;
}
function fieldValue(f?: MergedField): string {
  if (!f) return '';
  if (f.status === 'conflict') return '';
  return f.value == null ? '' : String(f.value);
}

const STATUS_LABEL: Record<string, string> = {
  extracted: 'estratto', missing: 'mancante', conflict: 'conflitto',
  low_confidence: 'incerto', manually_confirmed: 'confermato', modified: 'modificato',
};

export function ImportReview({ proposal, documents, busy, onCreate, onBack }: Props) {
  // Seed editable form from the proposal (conflicts start empty -> user must choose).
  const seed = useMemo(() => {
    const a = proposal.anagrafica;
    const c = proposal.cartella;
    return {
      firstName: fieldValue(a.nome), lastName: fieldValue(a.cognome),
      dateOfBirth: fieldValue(a.dataNascita), sex: fieldValue(a.sesso),
      phone: fieldValue(a.telefono), email: fieldValue(a.email), address: fieldValue(a.indirizzo),
      referenteNome: fieldValue(a.contattoEmergenzaNome), referenteTelefono: fieldValue(a.contattoEmergenzaTel),
      codiceFiscale: fieldValue(asField(c.codiceFiscale)), dataIngresso: fieldValue(asField(c.dataRicovero)),
      motivoIngresso: fieldValue(asField(c.patologiaIngresso)), noteIniziali: fieldValue(asField(c.noteGenerali)),
      statoPaziente: fieldValue(asField(c.statoRicovero)),
    };
  }, [proposal]);

  const [form, setForm] = useState<Record<string, string>>(seed);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [openProv, setOpenProv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setTouched((t) => ({ ...t, [key]: true }));
  }

  const report = proposal._merge.report;

  // Map editable anagrafica/ingresso + clinical lists into NuovoPaziente.
  function buildPayload(): NuovoPaziente | null {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth.trim()) {
      setError('Nome, cognome e data di nascita sono obbligatori.');
      return null;
    }
    const allergie = listText(proposal.cartella.allergie, (i) => `${i.allergene ?? ''}${i.gravita ? ` (${i.gravita})` : ''}`);
    const farmaci = listText(proposal.cartella.farmaci, (i) => `${i.nome ?? ''}${i.dose ? ` ${i.dose}` : ''}`);
    const diagnosi = listText(proposal.cartella.diagnosi, (i) => `${i.descrizione ?? ''}${i.codiceICD ? ` [${i.codiceICD}]` : ''}`);
    return {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth.trim(), sex: form.sex.trim(), codiceFiscale: form.codiceFiscale.trim(),
      phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(),
      comune: '', provincia: '', cap: '',
      referenteNome: form.referenteNome.trim(), referenteTelefono: form.referenteTelefono.trim(),
      referenteRelazione: '', emergencyContact: [form.referenteNome, form.referenteTelefono].filter(Boolean).join(' '),
      provenienza: '', centroInviante: '', dataIngresso: form.dataIngresso.trim(),
      motivoIngresso: form.motivoIngresso.trim(), condizioniIniziali: '',
      operatoreId: '', camera: '', letto: '',
      statoPaziente: form.statoPaziente === 'ricoverato' ? 'ricoverato' : '',
      priorita: '', alertOperativi: '',
      notaClinicaIniziale: diagnosi, noteIniziali: form.noteIniziali.trim(),
      allergie, farmaci, alertClinici: '', osservazioniLibere: '',
    };
  }

  function submit() {
    setError(null);
    const np = buildPayload();
    if (np) onCreate(np);
  }

  const anagFields: { key: string; label: string; field?: MergedField; required?: boolean }[] = [
    { key: 'firstName', label: 'Nome', field: proposal.anagrafica.nome, required: true },
    { key: 'lastName', label: 'Cognome', field: proposal.anagrafica.cognome, required: true },
    { key: 'dateOfBirth', label: 'Data di nascita', field: proposal.anagrafica.dataNascita, required: true },
    { key: 'sex', label: 'Sesso', field: proposal.anagrafica.sesso },
    { key: 'phone', label: 'Telefono', field: proposal.anagrafica.telefono },
    { key: 'email', label: 'Email', field: proposal.anagrafica.email },
    { key: 'address', label: 'Indirizzo', field: proposal.anagrafica.indirizzo },
    { key: 'codiceFiscale', label: 'Codice fiscale', field: asField(proposal.cartella.codiceFiscale) },
    { key: 'dataIngresso', label: 'Data ingresso', field: asField(proposal.cartella.dataRicovero) },
    { key: 'motivoIngresso', label: 'Motivo ingresso', field: asField(proposal.cartella.patologiaIngresso) },
  ];

  return (
    <div className="import-review">
      <div className="import-review__summary">
        <span className="ir-pill ir-pill--ok">{report.filled} compilati</span>
        <span className="ir-pill ir-pill--warn">{report.missing} mancanti</span>
        <span className="ir-pill ir-pill--conflict">{report.conflict} conflitti</span>
        <span className="ir-pill">{report.duplicate} duplicati rimossi</span>
        <span className="ir-pill">{proposal._merge.documents.length} documenti</span>
      </div>

      <h3 className="import-review__sec">Anagrafica e ingresso</h3>
      <div className="import-review__grid">
        {anagFields.map((f) => {
          const status = touched[f.key] ? 'modified' : (f.field?.status ?? 'missing');
          const hasConflict = f.field?.status === 'conflict';
          return (
            <div className="ir-field" key={f.key}>
              <label className="ir-field__label">
                {f.label}{f.required && <span className="ir-req">*</span>}
                <span className={`ir-badge ir-badge--${status}`}>{STATUS_LABEL[status] ?? status}</span>
                {(f.field?.sources?.length ?? 0) > 0 && (
                  <button type="button" className="ir-src-btn" onClick={() => setOpenProv(openProv === f.key ? null : f.key)}>
                    fonte
                  </button>
                )}
              </label>
              {hasConflict && (
                <div className="ir-conflict">
                  <span className="ir-conflict__hint">Scegli un valore:</span>
                  {f.field!.candidates!.map((c, i) => (
                    <button type="button" key={i}
                      className={`ir-cand${form[f.key] === String(c.value) ? ' is-sel' : ''}`}
                      onClick={() => set(f.key, String(c.value))}>
                      {String(c.value)} <em>({c.sources.map((s) => s.filename).join(', ')})</em>
                    </button>
                  ))}
                </div>
              )}
              <input className="ir-field__input" value={form[f.key] ?? ''}
                placeholder={hasConflict ? 'Seleziona o digita…' : '—'}
                onChange={(e) => set(f.key, e.target.value)} />
              {openProv === f.key && (
                <ul className="ir-prov">
                  {f.field!.sources.map((s, i) => (
                    <li key={i}>{s.filename}{s.docDate ? ` · ${s.docDate}` : ''} · {s.model}{s.snippet ? ` · “${s.snippet}”` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="import-review__sec">Dati clinici (riepilogo)</h3>
      {(['diagnosi', 'allergie', 'farmaci', 'terapie'] as const).map((key) => {
        const list = proposal.cartella[key];
        if (!isList(list) || list.items.length === 0) return null;
        return (
          <div className="ir-clinic" key={key}>
            <div className="ir-clinic__head">
              <strong>{key}</strong> <span className={`ir-badge ir-badge--${list.status}`}>{list.items.length}</span>
              {list.status === 'conflict' && <span className="ir-badge ir-badge--conflict">conflitti</span>}
            </div>
            <ul className="ir-clinic__list">
              {list.items.map((it) => (
                <li key={it.key} className={it.status === 'conflict' ? 'is-conflict' : ''}>
                  {summarizeItem(key, it.value)}
                  {it.status === 'conflict' && <span className="ir-badge ir-badge--conflict">conflitto</span>}
                  <span className="ir-src-inline">{it.sources.map((s) => s.filename).join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <h3 className="import-review__sec">Documenti ({documents.length})</h3>
      <ul className="ir-docs">
        {documents.map((d) => <li key={d.id}>{d.filename}</li>)}
      </ul>

      {error && <p className="import-modal__error">{error}</p>}
      <footer className="import-modal__foot">
        <button className="btn-ghost" disabled={busy} onClick={onBack}>Indietro</button>
        <button className="btn-primary" disabled={busy} onClick={submit}>Crea paziente</button>
      </footer>
    </div>
  );
}

function listText(list: MergedField | MergedList | undefined, fmt: (i: Record<string, unknown>) => string): string {
  if (!list || !isList(list)) return '';
  return list.items.map((it) => fmt(it.value as Record<string, unknown>)).filter((s) => s.trim()).join('; ');
}

function summarizeItem(key: string, v: Record<string, unknown>): string {
  const s = (k: string) => (v[k] == null ? '' : String(v[k]));
  switch (key) {
    case 'diagnosi': return `${s('descrizione')}${s('codiceICD') ? ` [${s('codiceICD')}]` : ''}`;
    case 'allergie': return `${s('allergene')}${s('gravita') ? ` (${s('gravita')})` : ''}`;
    case 'farmaci': return `${s('nome')}${s('dose') ? ` ${s('dose')}` : ''}`;
    case 'terapie': return `${s('tipo')}: ${s('descrizione')}`;
    default: return JSON.stringify(v).slice(0, 80);
  }
}
