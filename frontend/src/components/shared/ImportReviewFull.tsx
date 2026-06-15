import { useMemo, useState } from 'react';

// Full review editor (REQ-015): mirrors the patient record layout. Shows EVERY field
// the OCR recovered, grouped like the cartella — allergies as a prominent banner,
// diagnoses + therapy as tables (therapy with morning/lunch/evening slots), the rest
// in a wide grid, plus the integral OCR text. Nothing persists until "Crea paziente".

type Json = Record<string, unknown>;
interface SchemaLeaf { valore: unknown; descrizione?: string }
interface SchemaList { _template: Record<string, SchemaLeaf>; valori?: unknown[]; _descrizione?: string }
type SchemaNode = SchemaLeaf | SchemaList | Json;

export interface ConfirmPatient {
  firstName: string; lastName: string; dateOfBirth: string; sex?: string;
  email?: string; phone?: string; address?: string;
  emergencyContactName?: string; emergencyContactPhone?: string; codiceFiscale?: string;
}

interface Props {
  schema: Json;
  full: { anagrafica?: Json; cartella?: Json } | null;
  rawText?: string;
  documents: { id: string; filename: string }[];
  busy?: boolean;
  onConfirm: (patient: ConfirmPatient, cartella: Json) => void;
  onBack: () => void;
}

const isLeaf = (n: unknown): n is SchemaLeaf => !!n && typeof n === 'object' && 'valore' in (n as Json) && !('_template' in (n as Json));
const isList = (n: unknown): n is SchemaList => !!n && typeof n === 'object' && '_template' in (n as Json);
const isGroup = (n: unknown): n is Json => !!n && typeof n === 'object' && !isLeaf(n) && !isList(n);
const label = (n: SchemaLeaf, key: string) => n.descrizione || key;
const options = (n: SchemaLeaf): string[] | null =>
  typeof n.valore === 'string' && n.valore.includes('|') ? n.valore.split('|').map((s) => s.trim()).filter(Boolean) : null;

// gg/mm/aaaa -> aaaa-mm-gg for the date input; leave anything else untouched.
function toIsoDate(v: string): string {
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec((v || '').trim());
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return v;
}

function setAt(obj: Json, path: (string | number)[], value: unknown): Json {
  const next: Json = Array.isArray(obj) ? ([...(obj as unknown[])] as unknown as Json) : { ...obj };
  let cur: Json = next;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i] as string;
    const child = (cur as Json)[k];
    const clone = Array.isArray(child) ? [...(child as unknown[])] : { ...(child as Json) };
    (cur as Json)[k] = clone;
    cur = clone as Json;
  }
  (cur as Json)[path[path.length - 1] as string] = value;
  return next;
}
function getAt(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of path) { if (cur == null) return undefined; cur = (cur as Json)[k as string]; }
  return cur;
}

// Therapy administration slots map to the schema's hour flags.
const SLOTS: { key: string; label: string }[] = [
  { key: 'h08', label: 'Mattina' }, { key: 'h12', label: 'Pranzo' },
  { key: 'h16', label: 'Pomerig.' }, { key: 'h20', label: 'Sera' }, { key: 'h22', label: 'Notte' },
];

// Keys rendered by dedicated sections (so the generic grid skips them).
const SPECIAL = new Set(['allergie', 'diagnosi', 'farmaci', 'parametriVitali', 'anamnesi', 'presaInCarico', 'diarioMedico', 'pianoCura', 'terapie', 'indicatoriRischio', 'noteClinica']);
const VITALE_STATI = ['normale', 'attenzione', 'critico'];
// Free-text fields rendered as textareas (so they read like the patient record).
const LONG_FIELDS = new Set([
  'note', 'noteGenerali', 'contenuto', 'testo', 'descrizione', 'obiettivi', 'interventiPrevisti',
  'notePianificazione', 'fisiologica', 'patologicaRemota', 'patologicaProssima', 'familiare',
  'lavorativa', 'abitudini', 'condizioniIniziali', 'noteIniziali', 'motivoIngresso',
]);

export function ImportReviewFull({ schema, full, rawText, documents, busy, onConfirm, onBack }: Props) {
  const anagSchema = (schema.anagrafica ?? {}) as Json;
  const cartSchema = (schema.cartella ?? {}) as Json;

  const [data, setData] = useState<{ anagrafica: Json; cartella: Json }>(() => ({
    anagrafica: { ...(full?.anagrafica ?? {}) },
    cartella: { ...(full?.cartella ?? {}) },
  }));
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawQuery, setRawQuery] = useState('');

  const update = (path: (string | number)[], value: unknown) =>
    setData((d) => setAt(d as Json, path, value) as { anagrafica: Json; cartella: Json });

  const cart = (k: string) => (data.cartella[k] as Json[] | undefined) ?? [];

  // ---- generic leaf renderer (used by the wide grid + groups) ----
  function renderLeaf(node: SchemaLeaf, key: string, path: (string | number)[]) {
    const raw = getAt(data, path);
    const opts = options(node);
    const isBool = typeof node.valore === 'boolean';
    const isNum = typeof node.valore === 'number';
    const longText = (node.descrizione?.length ?? 0) > 60 || LONG_FIELDS.has(key);
    return (
      <div className={`irf-field${longText ? ' irf-field--wide' : ''}`} key={path.join('.')}>
        <label className="irf-field__label">{label(node, key)}</label>
        {isBool ? (
          <label className="irf-check"><input type="checkbox" checked={raw === true} onChange={(e) => update(path, e.target.checked)} /> Sì</label>
        ) : opts ? (
          <select className="irf-input" value={String(raw ?? '')} onChange={(e) => update(path, e.target.value)}>
            <option value="">—</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : longText ? (
          <textarea className="irf-input irf-textarea" value={String(raw ?? '')} onChange={(e) => update(path, e.target.value)} rows={2} />
        ) : (
          <input className="irf-input" type={isNum ? 'number' : 'text'} value={String(raw ?? '')} onChange={(e) => update(path, isNum ? Number(e.target.value) : e.target.value)} />
        )}
      </div>
    );
  }

  function renderNode(node: SchemaNode, key: string, path: (string | number)[]) {
    if (isList(node)) return renderGenericList(node, key, path);
    if (isLeaf(node)) return renderLeaf(node, key, path);
    if (isGroup(node)) {
      const childKeys = Object.keys(node).filter((k) => !k.startsWith('_'));
      return (
        <details className="irf-group" key={path.join('.')}>
          <summary>{(node._descrizione as string)?.split('.')[0] || key}</summary>
          <div className="irf-grid">{childKeys.map((ck) => renderNode((node as Json)[ck] as SchemaNode, ck, [...path, ck]))}</div>
        </details>
      );
    }
    return null;
  }

  function renderGenericList(node: SchemaList, key: string, path: (string | number)[]) {
    const items = (getAt(data, path) as Json[] | undefined) ?? [];
    const tmplKeys = Object.keys(node._template).filter((k) => !k.startsWith('_'));
    const blank = () => Object.fromEntries(tmplKeys.map((k) => [k, typeof node._template[k].valore === 'boolean' ? false : '']));
    return (
      <details className="irf-group" key={path.join('.')}>
        <summary>{node._descrizione?.split('.')[0] || key} ({items.length})</summary>
        <button type="button" className="irf-add" disabled={busy} onClick={() => update(path, [...items, blank()])}>+ Aggiungi</button>
        {items.map((_, idx) => (
          <div className="irf-item" key={idx}>
            <div className="irf-item__head"><span>#{idx + 1}</span>
              <button type="button" className="irf-del" disabled={busy} onClick={() => update(path, items.filter((_, i) => i !== idx))}>Rimuovi</button></div>
            <div className="irf-grid">{tmplKeys.map((tk) => renderLeaf(node._template[tk], tk, [...path, idx, tk]))}</div>
          </div>
        ))}
      </details>
    );
  }

  // ---- specialized clinical tables ----
  function cellInput(list: string, idx: number, field: string, placeholder = '') {
    return <input className="irf-cell" value={String((cart(list)[idx]?.[field] as string) ?? '')} placeholder={placeholder}
      onChange={(e) => update(['cartella', list, idx, field], e.target.value)} />;
  }
  function addRow(list: string, blank: Json) { update(['cartella', list], [...cart(list), blank]); }
  function delRow(list: string, idx: number) { update(['cartella', list], cart(list).filter((_, i) => i !== idx)); }
  function tmplOptions(list: string, field: string): string[] {
    const leaf = ((cartSchema[list] as SchemaList)?._template ?? {})[field] as SchemaLeaf | undefined;
    return leaf ? (options(leaf) ?? []) : [];
  }
  function cellSelect(list: string, idx: number, field: string) {
    const opts = tmplOptions(list, field);
    return (
      <select className="irf-cell" value={String((cart(list)[idx]?.[field] as string) ?? '')}
        onChange={(e) => update(['cartella', list, idx, field], e.target.value)}>
        <option value="">—</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  function cellArea(list: string, idx: number, field: string, placeholder = '') {
    return <textarea className="irf-cell irf-textarea" rows={2} placeholder={placeholder}
      value={String((cart(list)[idx]?.[field] as string) ?? '')}
      onChange={(e) => update(['cartella', list, idx, field], e.target.value)} />;
  }

  const allergie = cart('allergie');
  const diagnosi = cart('diagnosi');
  const farmaci = cart('farmaci');
  const parametri = cart('parametriVitali');
  const terapie = cart('terapie');
  const rischi = cart('indicatoriRischio');
  const noteCliniche = cart('noteClinica');

  // Diario medico — timeline-style entry cards like the patient record.
  function renderDiario() {
    const tmpl = ((cartSchema.diarioMedico as SchemaList)?._template ?? {}) as Record<string, SchemaLeaf>;
    const items = cart('diarioMedico');
    const blank = () => Object.fromEntries(Object.keys(tmpl).filter((k) => !k.startsWith('_')).map((k) => [k, '']));
    const rl = (k: string, i: number) => (tmpl[k] ? renderLeaf(tmpl[k], k, ['cartella', 'diarioMedico', i, k]) : null);
    return (
      <section className="irf-sec" key="diarioMedico">
        <div className="irf-sec__head"><h3>Diario medico ({items.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => update(['cartella', 'diarioMedico'], [...items, blank()])}>+ Voce</button></div>
        {items.length === 0 && <p className="irf-empty">Nessuna voce di diario</p>}
        {items.map((_, i) => (
          <div className="irf-diary" key={i}>
            <div className="irf-diary__head">
              {rl('data', i)}{rl('ora', i)}{rl('turno', i)}{rl('tipo', i)}
              <button type="button" className="irf-del" disabled={busy} onClick={() => delRow('diarioMedico', i)}>✕</button>
            </div>
            {rl('testo', i)}
            <div className="irf-grid irf-grid--3">{rl('operatore', i)}{rl('prescrizione', i)}{rl('evoluzione', i)}</div>
          </div>
        ))}
      </section>
    );
  }

  // Render a nested object (anamnesi / presaInCarico) as an open, labeled section
  // like the patient record — selects for enum fields, textareas for free text.
  function renderOpenGroup(title: string, groupKey: string, cols: 2 | 3) {
    const group = cartSchema[groupKey] as Json | undefined;
    if (!group || typeof group !== 'object') return null;
    const keys = Object.keys(group).filter((k) => !k.startsWith('_'));
    return (
      <section className="irf-sec" key={groupKey}>
        <h3>{title}</h3>
        <div className={`irf-grid irf-grid--${cols}`}>
          {keys.map((k) => renderNode((group as Json)[k] as SchemaNode, k, ['cartella', groupKey, k]))}
        </div>
      </section>
    );
  }

  function submit() {
    setError(null);
    const a = data.anagrafica, c = data.cartella;
    const firstName = String(a.nome ?? '').trim(), lastName = String(a.cognome ?? '').trim();
    const dateOfBirth = toIsoDate(String(a.dataNascita ?? '').trim());
    if (!firstName || !lastName || !dateOfBirth) { setError('Nome, cognome e data di nascita sono obbligatori.'); return; }
    onConfirm({
      firstName, lastName, dateOfBirth,
      sex: String(a.sesso ?? '').trim(), email: String(a.email ?? '').trim(),
      phone: String(a.telefono ?? '').trim(), address: String(a.indirizzo ?? '').trim(),
      emergencyContactName: String(a.contattoEmergenzaNome ?? '').trim(),
      emergencyContactPhone: String(a.contattoEmergenzaTel ?? '').trim(),
      codiceFiscale: String(c.codiceFiscale ?? '').trim(),
    }, { ...c, dataNascita: dateOfBirth });
  }

  const rawShown = useMemo(() => {
    const t = rawText ?? '';
    if (!rawQuery.trim()) return t;
    return t.split('\n').filter((l) => l.toLowerCase().includes(rawQuery.toLowerCase())).join('\n');
  }, [rawText, rawQuery]);

  const anagKeys = Object.keys(anagSchema).filter((k) => !k.startsWith('_'));
  const otherCartKeys = Object.keys(cartSchema).filter((k) => !k.startsWith('_') && !SPECIAL.has(k));

  return (
    <div className="irf2">
      <p className="irf-hint">Controlla e integra <strong>tutti</strong> i dati estratti dal documento. Niente viene salvato finché non premi “Crea paziente”.</p>

      {/* Allergie — banner prominente */}
      <section className={`irf-alg ${allergie.length ? 'irf-alg--present' : 'irf-alg--none'}`}>
        <div className="irf-alg__head">
          <strong>{allergie.length ? '⚠ ALLERGIE RILEVATE' : 'ALLERGIE NON DOCUMENTATE'}</strong>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('allergie', { allergene: '', reazione: '', gravita: '' })}>+ Allergia</button>
        </div>
        {allergie.map((_, i) => (
          <div className="irf-alg__row" key={i}>
            {cellInput('allergie', i, 'allergene', 'Allergene')}
            {cellInput('allergie', i, 'reazione', 'Reazione')}
            {cellInput('allergie', i, 'gravita', 'Gravità')}
            <button type="button" className="irf-del" disabled={busy} onClick={() => delRow('allergie', i)}>✕</button>
          </div>
        ))}
      </section>

      {/* Anagrafica — griglia larga */}
      <section className="irf-sec">
        <h3>Anagrafica</h3>
        <div className="irf-grid irf-grid--3">{anagKeys.map((k) => renderNode(anagSchema[k] as SchemaNode, k, ['anagrafica', k]))}</div>
      </section>

      {/* Diagnosi — tabella */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Diagnosi ({diagnosi.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('diagnosi', { codiceICD: '', descrizione: '', tipo: '', stato: '' })}>+ Diagnosi</button></div>
        <table className="irf-table"><thead><tr><th>ICD</th><th>Descrizione</th><th>Tipo</th><th>Stato</th><th></th></tr></thead>
          <tbody>{diagnosi.map((_, i) => (<tr key={i}>
            <td>{cellInput('diagnosi', i, 'codiceICD', 'ICD')}</td><td>{cellInput('diagnosi', i, 'descrizione', 'Descrizione')}</td>
            <td>{cellInput('diagnosi', i, 'tipo')}</td><td>{cellInput('diagnosi', i, 'stato')}</td>
            <td><button type="button" className="irf-del" disabled={busy} onClick={() => delRow('diagnosi', i)}>✕</button></td></tr>))}
          {diagnosi.length === 0 && <tr><td colSpan={5} className="irf-empty">Nessuna diagnosi</td></tr>}</tbody></table>
      </section>

      {/* Farmaci / Terapia — tabella con fasce orarie */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Terapia farmacologica ({farmaci.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('farmaci', { nome: '', dose: '', via: '', frequenza: '' })}>+ Farmaco</button></div>
        <table className="irf-table"><thead><tr><th>Farmaco</th><th>Dose</th><th>Via</th>{SLOTS.map((s) => <th key={s.key} className="irf-slot">{s.label}</th>)}<th></th></tr></thead>
          <tbody>{farmaci.map((row, i) => (<tr key={i}>
            <td>{cellInput('farmaci', i, 'nome', 'Nome')}</td><td>{cellInput('farmaci', i, 'dose', 'Dose')}</td><td>{cellInput('farmaci', i, 'via')}</td>
            {SLOTS.map((s) => <td key={s.key} className="irf-slot">
              <input type="checkbox" checked={!!(row[s.key]) && row[s.key] !== ''} onChange={(e) => update(['cartella', 'farmaci', i, s.key], e.target.checked ? '✓' : '')} /></td>)}
            <td><button type="button" className="irf-del" disabled={busy} onClick={() => delRow('farmaci', i)}>✕</button></td></tr>))}
          {farmaci.length === 0 && <tr><td colSpan={SLOTS.length + 4} className="irf-empty">Nessun farmaco</td></tr>}</tbody></table>
        <p className="irf-note">Le fasce orarie (Mattina/Pranzo/Pomeriggio/Sera/Notte) diventano la terapia somministrabile del paziente.</p>
      </section>

      {/* Parametri vitali — come nella scheda paziente (Parametro · Valore · Unità · Stato) */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Parametri vitali ({parametri.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('parametriVitali', { etichetta: '', valore: '', unita: '', stato: 'normale' })}>+ Parametro</button></div>
        <table className="irf-table"><thead><tr><th>Parametro</th><th>Valore</th><th>Unità</th><th>Stato</th><th></th></tr></thead>
          <tbody>{parametri.map((row, i) => (<tr key={i} className={`irf-vit irf-vit--${String(row.stato || 'normale')}`}>
            <td>{cellInput('parametriVitali', i, 'etichetta', 'es. PA, FC, SpO2')}</td>
            <td>{cellInput('parametriVitali', i, 'valore', 'es. 130/85')}</td>
            <td>{cellInput('parametriVitali', i, 'unita', 'mmHg')}</td>
            <td>
              <select className="irf-cell" value={String(row.stato || 'normale')} onChange={(e) => update(['cartella', 'parametriVitali', i, 'stato'], e.target.value)}>
                {VITALE_STATI.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </td>
            <td><button type="button" className="irf-del" disabled={busy} onClick={() => delRow('parametriVitali', i)}>✕</button></td></tr>))}
          {parametri.length === 0 && <tr><td colSpan={5} className="irf-empty">Nessun parametro rilevato</td></tr>}</tbody></table>
      </section>

      {/* Anamnesi — come nella scheda paziente */}
      {renderOpenGroup('Anamnesi', 'anamnesi', 2)}

      {/* Presa in carico — come nella scheda paziente */}
      {renderOpenGroup('Presa in carico', 'presaInCarico', 3)}

      {/* Diario medico — come nella scheda paziente */}
      {renderDiario()}

      {/* Terapie (non farmacologiche / schemi) — tabella */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Terapie ({terapie.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('terapie', { tipo: '', descrizione: '', stato: '' })}>+ Terapia</button></div>
        <table className="irf-table"><thead><tr><th>Tipo</th><th>Descrizione</th><th>Stato</th><th></th></tr></thead>
          <tbody>{terapie.map((_, i) => (<tr key={i}>
            <td>{cellSelect('terapie', i, 'tipo')}</td><td>{cellInput('terapie', i, 'descrizione', 'Descrizione/schema')}</td>
            <td>{cellSelect('terapie', i, 'stato')}</td>
            <td><button type="button" className="irf-del" disabled={busy} onClick={() => delRow('terapie', i)}>✕</button></td></tr>))}
          {terapie.length === 0 && <tr><td colSpan={4} className="irf-empty">Nessuna terapia</td></tr>}</tbody></table>
      </section>

      {/* Indicatori di rischio — tabella con livello colorato */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Indicatori di rischio ({rischi.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('indicatoriRischio', { tipo: '', livello: '', descrizione: '' })}>+ Rischio</button></div>
        <table className="irf-table"><thead><tr><th>Tipo</th><th>Livello</th><th>Descrizione</th><th></th></tr></thead>
          <tbody>{rischi.map((row, i) => (<tr key={i} className={`irf-lvl irf-lvl--${String(row.livello || '')}`}>
            <td>{cellSelect('indicatoriRischio', i, 'tipo')}</td><td>{cellSelect('indicatoriRischio', i, 'livello')}</td>
            <td>{cellInput('indicatoriRischio', i, 'descrizione', 'Descrizione')}</td>
            <td><button type="button" className="irf-del" disabled={busy} onClick={() => delRow('indicatoriRischio', i)}>✕</button></td></tr>))}
          {rischi.length === 0 && <tr><td colSpan={4} className="irf-empty">Nessun indicatore</td></tr>}</tbody></table>
      </section>

      {/* Note cliniche / nursing — card con contenuto */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Note cliniche ({noteCliniche.length})</h3>
          <button type="button" className="irf-add" disabled={busy} onClick={() => addRow('noteClinica', { tipo: '', contenuto: '', operatore: '' })}>+ Nota</button></div>
        {noteCliniche.length === 0 && <p className="irf-empty">Nessuna nota</p>}
        {noteCliniche.map((_, i) => (
          <div className="irf-note-card" key={i}>
            <div className="irf-note-card__head">
              {cellSelect('noteClinica', i, 'tipo')}
              {cellInput('noteClinica', i, 'operatore', 'Operatore')}
              <button type="button" className="irf-del" disabled={busy} onClick={() => delRow('noteClinica', i)}>✕</button>
            </div>
            {cellArea('noteClinica', i, 'contenuto', 'Contenuto della nota')}
          </div>
        ))}
      </section>

      {/* Piano di cura — come nella scheda paziente */}
      {renderOpenGroup('Piano di cura', 'pianoCura', 2)}

      {/* Resto della cartella — sezioni espandibili */}
      <section className="irf-sec">
        <h3>Altri dati clinici</h3>
        <div className="irf-grid">{otherCartKeys.map((k) => renderNode(cartSchema[k] as SchemaNode, k, ['cartella', k]))}</div>
      </section>

      {/* Testo OCR */}
      <section className="irf-sec">
        <div className="irf-sec__head"><h3>Testo riconosciuto (OCR)</h3>
          {rawText && <button type="button" className="irf-add" onClick={() => setShowRaw((s) => !s)}>{showRaw ? 'Nascondi' : 'Mostra'}</button>}</div>
        {rawText ? (showRaw && (<>
          <input className="irf-input" placeholder="Cerca nel testo…" value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} />
          <pre className="irf-raw__text">{rawShown || '(nessuna riga corrisponde)'}</pre></>))
          : <p className="irf-empty">Trascrizione non disponibile.</p>}
      </section>

      <section className="irf-sec"><h3>Documenti ({documents.length})</h3>
        <ul className="ir-docs">{documents.map((d) => <li key={d.id}>{d.filename}</li>)}</ul></section>

      {error && <p className="import-modal__error">{error}</p>}
      <footer className="import-modal__foot">
        <button className="btn-ghost" disabled={busy} onClick={onBack}>Indietro</button>
        <button className="btn-primary" disabled={busy} onClick={submit}>Crea paziente</button>
      </footer>
    </div>
  );
}
