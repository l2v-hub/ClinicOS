import { useMemo, useState } from 'react';

// Full review editor (REQ-015): renders EVERY extraction field — anagrafica, all
// cartella scalars, nested groups (anamnesi/pianoCura/presaInCarico) and clinical
// lists (diagnosi/allergie/farmaci/…) — driven by the extraction SCHEMA so empty
// fields show too and the operator can integrate missing data. Includes the integral
// OCR transcription (rawText). Nothing persists until "Crea paziente".

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

/** deep clone + set value at a path */
function setAt(obj: Json, path: (string | number)[], value: unknown): Json {
  const next: Json = Array.isArray(obj) ? ([...(obj as unknown[])] as unknown as Json) : { ...obj };
  let cur: Json | unknown[] = next as Json;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i] as keyof typeof cur;
    const child = (cur as Json)[k as string];
    const clone = Array.isArray(child) ? [...(child as unknown[])] : { ...(child as Json) };
    (cur as Json)[k as string] = clone;
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

export function ImportReviewFull({ schema, full, rawText, documents, busy, onConfirm, onBack }: Props) {
  const anagSchema = (schema.anagrafica ?? {}) as Json;
  const cartSchema = (schema.cartella ?? {}) as Json;

  // Seed editable state from the raw extraction (lossless flat values).
  const [data, setData] = useState<{ anagrafica: Json; cartella: Json }>(() => ({
    anagrafica: { ...(full?.anagrafica ?? {}) },
    cartella: { ...(full?.cartella ?? {}) },
  }));
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawQuery, setRawQuery] = useState('');

  const update = (path: (string | number)[], value: unknown) => setData((d) => setAt(d as Json, path, value) as { anagrafica: Json; cartella: Json });

  function renderLeaf(node: SchemaLeaf, key: string, path: (string | number)[]) {
    const raw = getAt(data, path);
    const opts = options(node);
    const isBool = typeof node.valore === 'boolean';
    const isNum = typeof node.valore === 'number';
    const longText = (node.descrizione?.length ?? 0) > 48 || ['note', 'noteGenerali', 'contenuto', 'testo', 'descrizione', 'obiettivi', 'interventiPrevisti'].includes(key);
    return (
      <div className="irf-field" key={path.join('.')}>
        <label className="irf-field__label">{label(node, key)}</label>
        {isBool ? (
          <label className="irf-check">
            <input type="checkbox" checked={raw === true} onChange={(e) => update(path, e.target.checked)} /> Sì
          </label>
        ) : opts ? (
          <select className="irf-input" value={String(raw ?? '')} onChange={(e) => update(path, e.target.value)}>
            <option value="">—</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : longText ? (
          <textarea className="irf-input irf-textarea" value={String(raw ?? '')} onChange={(e) => update(path, e.target.value)} rows={2} />
        ) : (
          <input className="irf-input" type={isNum ? 'number' : 'text'} value={String(raw ?? '')}
            onChange={(e) => update(path, isNum ? Number(e.target.value) : e.target.value)} />
        )}
      </div>
    );
  }

  function renderList(node: SchemaList, key: string, path: (string | number)[]) {
    const items = (getAt(data, path) as Json[] | undefined) ?? [];
    const tmplKeys = Object.keys(node._template).filter((k) => !k.startsWith('_'));
    const blank = () => Object.fromEntries(tmplKeys.map((k) => [k, typeof node._template[k].valore === 'boolean' ? false : '']));
    return (
      <div className="irf-list" key={path.join('.')}>
        <div className="irf-list__head">
          <strong>{node._descrizione?.split('.')[0] || key}</strong>
          <span className="irf-count">{items.length}</span>
          <button type="button" className="irf-add" disabled={busy} onClick={() => update(path, [...items, blank()])}>+ Aggiungi</button>
        </div>
        {items.length === 0 && <p className="irf-empty">Nessuna voce — usa “Aggiungi” per inserirla.</p>}
        {items.map((_, idx) => (
          <div className="irf-item" key={idx}>
            <div className="irf-item__head">
              <span>{key} #{idx + 1}</span>
              <button type="button" className="irf-del" disabled={busy}
                onClick={() => update(path, items.filter((_, i) => i !== idx))}>Rimuovi</button>
            </div>
            <div className="irf-grid">
              {tmplKeys.map((tk) => renderLeaf(node._template[tk], tk, [...path, idx, tk]))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderNode(node: SchemaNode, key: string, path: (string | number)[]) {
    if (isList(node)) return renderList(node, key, path);
    if (isLeaf(node)) return renderLeaf(node, key, path);
    if (isGroup(node)) {
      const childKeys = Object.keys(node).filter((k) => !k.startsWith('_'));
      return (
        <details className="irf-group" key={path.join('.')} open>
          <summary>{(node._descrizione as string)?.split('.')[0] || key}</summary>
          <div className="irf-grid">
            {childKeys.map((ck) => renderNode((node as Json)[ck] as SchemaNode, ck, [...path, ck]))}
          </div>
        </details>
      );
    }
    return null;
  }

  const cartKeys = Object.keys(cartSchema).filter((k) => !k.startsWith('_'));
  const anagKeys = Object.keys(anagSchema).filter((k) => !k.startsWith('_'));

  function submit() {
    setError(null);
    const a = data.anagrafica;
    const c = data.cartella;
    const firstName = String(a.nome ?? '').trim();
    const lastName = String(a.cognome ?? '').trim();
    const dateOfBirth = String(a.dataNascita ?? '').trim();
    if (!firstName || !lastName || !dateOfBirth) { setError('Nome, cognome e data di nascita sono obbligatori.'); return; }
    onConfirm(
      {
        firstName, lastName, dateOfBirth,
        sex: String(a.sesso ?? '').trim(),
        email: String(a.email ?? '').trim(),
        phone: String(a.telefono ?? '').trim(),
        address: String(a.indirizzo ?? '').trim(),
        emergencyContactName: String(a.contattoEmergenzaNome ?? '').trim(),
        emergencyContactPhone: String(a.contattoEmergenzaTel ?? '').trim(),
        codiceFiscale: String(c.codiceFiscale ?? '').trim(),
      },
      c,
    );
  }

  const rawLines = useMemo(() => {
    const t = rawText ?? '';
    if (!rawQuery.trim()) return t;
    return t.split('\n').filter((l) => l.toLowerCase().includes(rawQuery.toLowerCase())).join('\n');
  }, [rawText, rawQuery]);

  return (
    <div className="import-review irf">
      <p className="irf-hint">Controlla e integra <strong>tutti</strong> i dati estratti. Niente viene salvato finché non premi “Crea paziente”.</p>

      <h3 className="import-review__sec">Anagrafica</h3>
      <div className="irf-grid">
        {anagKeys.map((k) => renderNode(anagSchema[k] as SchemaNode, k, ['anagrafica', k]))}
      </div>

      <h3 className="import-review__sec">Cartella clinica</h3>
      {cartKeys.map((k) => renderNode(cartSchema[k] as SchemaNode, k, ['cartella', k]))}

      <h3 className="import-review__sec">Testo riconosciuto (OCR)</h3>
      {rawText ? (
        <div className="irf-raw">
          <div className="irf-raw__bar">
            <input className="irf-input" placeholder="Cerca nel testo…" value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} />
            <button type="button" className="irf-add" onClick={() => setShowRaw((s) => !s)}>{showRaw ? 'Nascondi' : 'Mostra'}</button>
          </div>
          {showRaw && <pre className="irf-raw__text">{rawLines || '(nessuna riga corrisponde)'}</pre>}
        </div>
      ) : (
        <p className="irf-empty">Trascrizione integrale non disponibile per questo import.</p>
      )}

      <h3 className="import-review__sec">Documenti ({documents.length})</h3>
      <ul className="ir-docs">{documents.map((d) => <li key={d.id}>{d.filename}</li>)}</ul>

      {error && <p className="import-modal__error">{error}</p>}
      <footer className="import-modal__foot">
        <button className="btn-ghost" disabled={busy} onClick={onBack}>Indietro</button>
        <button className="btn-primary" disabled={busy} onClick={submit}>Crea paziente</button>
      </footer>
    </div>
  );
}
