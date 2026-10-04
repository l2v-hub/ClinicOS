import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { getCurrentOperator } from './operatorSession';
export const LEGACY_DRAFT_CHANGED = 'clinicos:legacy-draft-changed';
const prefix = 'clinicos:module-draft:v1:';
type Saved<T> = { form: T; editId: string | null; show: boolean };
function key(patientId: string, module: string) {
  const op = getCurrentOperator();
  return op
    ? `${prefix}${encodeURIComponent(`${op.id}:${op.role}`)}:${encodeURIComponent(patientId)}:${module}`
    : null;
}
export function readLegacyDraft<T extends object>(
  patientId: string,
  module: string,
  defaults: T,
): Saved<T> | null {
  try {
    const k = key(patientId, module);
    const raw = k ? sessionStorage.getItem(k) : null;
    if (!raw || raw.length > 100_000) return null;
    const v = JSON.parse(raw);
    if (
      !v?.form ||
      typeof v.form !== 'object' ||
      Array.isArray(v.form) ||
      typeof v.show !== 'boolean' ||
      (v.editId !== null && typeof v.editId !== 'string')
    )
      return null;
    for (const [field, expected] of Object.entries(defaults)) {
      if (typeof v.form[field] !== typeof expected) return null;
    }
    return { form: v.form, editId: v.editId, show: v.show };
  } catch {
    return null;
  }
}
export function hasLegacyDraft(patientId: string, module: string) {
  try {
    const k = key(patientId, module);
    return !!k && !!sessionStorage.getItem(k);
  } catch {
    return false;
  }
}
export function deleteLegacyDraft(patientId: string, module: string) {
  const k = key(patientId, module);
  try {
    if (k) sessionStorage.removeItem(k);
    window.dispatchEvent(new CustomEvent(LEGACY_DRAFT_CHANGED, { detail: { deleted: k } }));
    return true;
  } catch {
    return false;
  }
}
export function clearLegacyModuleDrafts() {
  try {
    const op = getCurrentOperator();
    if (!op) return;
    const scoped = `${prefix}${encodeURIComponent(`${op.id}:${op.role}`)}:`;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(scoped)) sessionStorage.removeItem(k);
    }
  } catch {
    /* In-memory forms remain available. */
  }
}
export function useLegacyModuleDraft<T extends object>(
  patientId: string,
  module: string,
  defaults: T,
  initialShow = false,
) {
  const [saved] = useState(() => readLegacyDraft(patientId, module, defaults));
  const [form, setForm] = useState<T>(() => saved?.form ?? { ...defaults });
  const [show, setShow] = useState(saved?.show ?? initialShow);
  const [editId, setEditId] = useState<string | null>(saved?.editId ?? null);
  const [dirty, setDirty] = useState(!!saved);
  const [error, setError] = useState(false);
  const update: Dispatch<SetStateAction<T>> = useCallback((value) => {
    setForm(value);
    setDirty(true);
  }, []);
  const remove = useCallback(() => {
    if (!deleteLegacyDraft(patientId, module)) {
      setError(true);
      return;
    }
    setDirty(false);
    setForm({ ...defaults });
    setEditId(null);
    setShow(false);
  }, [patientId, module]);
  useEffect(() => {
    const deleted = (event: Event) => {
      if ((event as CustomEvent).detail?.deleted === key(patientId, module)) {
        setDirty(false);
        setForm({ ...defaults });
        setEditId(null);
        setShow(false);
      }
    };
    window.addEventListener(LEGACY_DRAFT_CHANGED, deleted);
    return () => window.removeEventListener(LEGACY_DRAFT_CHANGED, deleted);
  }, [patientId, module]);
  useEffect(() => {
    if (!dirty) return;
    try {
      const k = key(patientId, module);
      if (k) {
        const data = JSON.stringify({ form, editId, show });
        if (data.length > 100_000) throw new Error();
        sessionStorage.setItem(k, data);
        setError(false);
        window.dispatchEvent(new Event(LEGACY_DRAFT_CHANGED));
      }
    } catch {
      setError(true);
    }
  }, [form, editId, show, dirty, patientId, module]);
  return { form, setForm: update, show, setShow, editId, setEditId, dirty, error, remove };
}
