import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './WidgetGroup.css';
type Entry = { open: boolean; setOpen: (open: boolean) => void };
type Registry = { register: (id: string, entry: Entry | null) => void };
const Widgets = createContext<Registry | null>(null);

/** One page control; widgets keep their own state and mounted editors when hidden. */
export function WidgetGroup({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Map<string, Entry>>(() => new Map());
  const register = useCallback((id: string, entry: Entry | null) => {
    setEntries((old) => {
      const next = new Map(old);
      if (entry) next.set(id, entry);
      else next.delete(id);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ register }), [register]);
  const expanded = [...entries.values()].some((e) => e.open);
  return (
    <Widgets.Provider value={value}>
      {entries.size > 1 && (
        <div className="widget-group-controls no-print">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              entries.forEach((entry) => entry.setOpen(!expanded));
            }}
          >
            {expanded ? '▴ Chiudi tutte le sezioni' : '▾ Apri tutte le sezioni'}
          </button>
        </div>
      )}
      {children}
    </Widgets.Provider>
  );
}
export function useWidgetOpen(
  defaultOpen = true,
  controlled?: boolean,
  onToggle?: (open: boolean) => void,
) {
  const [internal, setInternal] = useState(defaultOpen);
  const open = controlled ?? internal;
  const setOpen = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(open) : value;
      if (controlled === undefined) setInternal(next);
      onToggle?.(next);
    },
    [open, controlled, onToggle],
  );
  const id = useId();
  const registry = useContext(Widgets);
  const register = registry?.register;
  const setter = useRef(setOpen);
  setter.current = setOpen;
  useEffect(() => {
    register?.(id, { open, setOpen: (next) => setter.current(next) });
  }, [register, id, open]);
  useEffect(() => () => register?.(id, null), [register, id]);
  return { open, setOpen, bodyId: `widget-${id}` };
}
