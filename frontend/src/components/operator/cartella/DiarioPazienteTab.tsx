import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { createSubmissionKey } from '../../../lib/submissionKey';
import type { DiarioPazienteEntry, DiarioAuthorType, DiarioEntry } from '../../../types';
import { ClinicalTableSection, LoadingState, EmptyState } from './shared';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { API_URL } from '../../../config';
import { facilityLocalMinute, formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { operatorHeaders } from '../../../lib/operatorSession';
import {
  pendingSessionCache,
  readSessionCache,
  writeSessionCache,
} from '../../../lib/sessionCache';
import { diaryCacheKey, type DiarySnapshot } from '../../../lib/patientTabSnapshots';
import {
  THERAPY_STATO_LABELS,
  linkedTherapyState,
  therapyStatoTone,
  type DiaryEntryTherapyRef,
} from './diaryTherapyLink';
import type { DiaryEntryWithTherapy } from './DiaryTherapyPanel';
import './DiaryTherapyPanel.css';
import './DiaryAck.css';
import { corePriorityOptions } from '../../../lib/corePriority';
import { diaryCreatePayload, diaryWriteErrorMessage } from './diaryEntryPayload';
import { useCan } from '../../../lib/capabilities';
import { countToSee, needsMyAck, postDiaryAck } from './diaryAck';
import { UrgencyNotice } from '../../shared/UrgencyNotice';
import { isActiveUrgency, postUrgencyAck, URGENCY_ACKNOWLEDGED_EVENT } from '../../../lib/urgency';

// Diario terapia: il pannello (form Terapia completo) si carica solo quando serve.
const DiaryTherapyPanel = lazy(() =>
  import('./DiaryTherapyPanel').then((m) => ({ default: m.DiaryTherapyPanel })),
);

type DiaryFeedEntry = DiarioPazienteEntry & {
  sourceType?: 'diary' | 'consegna';
  sourceId?: string;
  /** Diario terapia: terapia collegata (null se cancellata o assente). */
  therapy?: DiaryEntryTherapyRef | null;
  therapyId?: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const AUTHOR_TYPE_LABELS: Record<DiarioAuthorType, string> = {
  medico: 'Medico',
  infermiere: 'Infermiere',
  oss: 'OSS',
  fisioterapista: 'Fisioterapista',
  operatore: 'Operatore',
  altro: 'Altro',
};

const AUTHOR_TYPE_BADGE: Record<DiarioAuthorType, string> = {
  medico: 'badge--indigo',
  infermiere: 'badge--blue',
  oss: 'badge--teal',
  fisioterapista: 'badge--amber',
  operatore: 'badge--gray',
  altro: 'badge--gray',
};

const PRIORITY_BADGE: Record<string, string> = {
  normale: 'badge--gray',
  importante: 'badge--amber',
  urgente: 'badge--red',
};

const PRIORITY_LABELS: Record<string, string> = {
  normale: 'Normale',
  importante: 'Importante',
  urgente: 'Urgente',
};

// UX2 W8: the stored status is never an open/closed concept in the UX; only «da rivedere» shows.
const STATUS_BADGE: Record<string, string> = {
  da_rivedere: 'badge--amber',
};

const STATUS_LABELS: Record<string, string> = {
  da_rivedere: 'Da rivedere',
};

const DIARY_PAGE_SIZE = 50;

function fmtDT(iso: string): string {
  try {
    return formatFacilityLocalMinute(iso);
  } catch {
    return iso;
  }
}

// ── Legacy conversion ──────────────────────────────────────────────────────────

function convertLegacyEntries(inf?: DiarioEntry[], med?: DiarioEntry[]): DiarioPazienteEntry[] {
  const infEntries: DiarioPazienteEntry[] = (inf ?? []).map((e) => ({
    id: e.id,
    patientId: '',
    authorType: 'infermiere' as DiarioAuthorType,
    authorName: e.operatore,
    title: null,
    content: e.testo,
    priority:
      e.priorita === 'alta' ? 'importante' : e.priorita === 'urgente' ? 'urgente' : 'normale',
    status: e.stato === 'completata' ? 'completata' : 'aperta',
    entryDateTime: `${e.data}T${e.ora}`,
    category: null,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));

  const medEntries: DiarioPazienteEntry[] = (med ?? []).map((e) => ({
    id: e.id,
    patientId: '',
    authorType: 'medico' as DiarioAuthorType,
    authorName: e.operatore,
    title: e.prescrizione ? 'Con prescrizione' : null,
    content: [
      e.testo,
      e.prescrizione ? `Prescrizione: ${e.prescrizione}` : '',
      e.evoluzione ? `Evoluzione: ${e.evoluzione}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    priority: 'normale',
    status: 'aperta',
    entryDateTime: `${e.data}T${e.ora}`,
    category: null,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));

  return [...infEntries, ...medEntries].sort((a, b) =>
    b.entryDateTime.localeCompare(a.entryDateTime),
  );
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface DiarioForm {
  title: string;
  content: string;
  priority: 'normale' | 'importante' | 'urgente';
  status: 'aperta' | 'completata' | 'da_rivedere';
  entryDateTime: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  pazienteId: string;
  operatoreNome: string;
  legacyInfermieristico?: DiarioEntry[];
  legacyMedico?: DiarioEntry[];
  filterBy?: string;
  /** Diario terapia: apre la scheda Terapia con la riga di questa terapia in evidenza. */
  onOpenTherapy?: (therapyId: string) => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DiarioPazienteTab({
  pazienteId,
  legacyInfermieristico,
  legacyMedico,
  filterBy,
  onOpenTherapy,
}: Props) {
  // Ultima pagina gia' mostrata in sessione per questo paziente/filtro: il diario compare subito
  // e si rivalida in background invece di ripartire da "Caricamento…".
  const initialSnapshot = readSessionCache<DiarySnapshot>(
    diaryCacheKey(pazienteId, filterBy ?? 'tutti'),
  );
  const [entries, setEntries] = useState<DiarioPazienteEntry[]>(
    () => initialSnapshot?.entries ?? [],
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialSnapshot?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialSnapshot?.nextCursor ?? null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<DiarioPazienteEntry | null>(null);
  const [saving, setSaving] = useState(false);
  // Diario terapia: anteprima aperta (numero = apertura, rimonta il pannello a ogni "Valida").
  const [therapyPanel, setTherapyPanel] = useState<number | null>(null);
  const readSequenceRef = useRef(0);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  // F8: le azioni compaiono solo con la capability che il backend applica (niente 403 dalla GUI).
  const canEditEntry = useCan('diary.update_entry');
  const canDeleteEntry = useCan('diary.delete_entry');
  // «Ho capito» su un'urgenza: voce in corso di registrazione (blocca il doppio tocco).
  const [acking, setAcking] = useState<string | null>(null);
  const [ackError, setAckError] = useState('');

  function emptyForm(): DiarioForm {
    return {
      title: '',
      content: '',
      priority: 'normale',
      status: 'aperta',
      entryDateTime: facilityLocalMinute(),
    };
  }

  const [form, setForm] = useState<DiarioForm>(emptyForm);
  const [editForm, setEditForm] = useState<DiarioForm>(emptyForm);

  const fetchEntries = useCallback(
    async (
      signal: AbortSignal,
      request: number,
      options: { cursor?: string; append?: boolean; silent?: boolean } = {},
    ) => {
      const resolvedFilter = (filterBy ?? 'tutti') as DiarioAuthorType | 'tutti';
      const cacheKey = diaryCacheKey(pazienteId, resolvedFilter);
      if (options.append) setLoadingMore(true);
      else {
        setLoadingMore(false);
        // Con una pagina gia' in cache la rivalidazione non svuota l'elenco.
        if (!options.silent && readSessionCache(cacheKey) === undefined) setLoading(true);
      }
      setError('');
      if (!options.append) setNotice('');
      // Lettura anticipata gia' in volo (apertura scheda): si aspetta quella, niente doppia richiesta.
      const pendingRead = options.append ? undefined : pendingSessionCache(cacheKey);
      if (pendingRead) {
        await pendingRead;
        const cached = readSessionCache<DiarySnapshot>(cacheKey);
        if (cached && !signal.aborted && request === readSequenceRef.current) {
          setEntries(cached.entries);
          setHasMore(cached.hasMore);
          setNextCursor(cached.nextCursor);
          setLoading(false);
          return;
        }
      }
      try {
        const params = new URLSearchParams();
        if (resolvedFilter !== 'tutti') params.set('authorType', resolvedFilter);
        params.set('limit', String(DIARY_PAGE_SIZE));
        if (options.cursor) params.set('cursor', options.cursor);
        const res = await fetch(`${API_URL}/patients/${pazienteId}/diary?${params}`, {
          headers: operatorHeaders(),
          signal,
        });
        if (!res.ok) throw new Error('Risposta non valida');
        const data = (await res.json()) as {
          entries: DiarioPazienteEntry[];
          hasMore?: boolean;
          nextCursor?: string | null;
        };
        let allEntries = data.entries ?? [];
        let pageHasMore = Boolean(data.hasMore);
        let pageNextCursor = data.nextCursor ?? null;
        let legacyPageTruncated = false;

        // Backward compat: use legacy data only for an empty first page with no active filter.
        if (!options.append && allEntries.length === 0 && resolvedFilter === 'tutti') {
          const legacyEntries = convertLegacyEntries(legacyInfermieristico, legacyMedico);
          allEntries = legacyEntries.slice(0, DIARY_PAGE_SIZE);
          pageHasMore = false;
          pageNextCursor = null;
          legacyPageTruncated = legacyEntries.length > DIARY_PAGE_SIZE;
        }

        if (!signal.aborted && request === readSequenceRef.current) {
          setEntries((previous) => {
            if (!options.append) return allEntries;
            const seen = new Set(previous.map((entry) => entry.id));
            return [...previous, ...allEntries.filter((entry) => !seen.has(entry.id))];
          });
          setHasMore(pageHasMore);
          setNextCursor(pageNextCursor);
          if (!options.append) {
            writeSessionCache<DiarySnapshot>(cacheKey, {
              entries: allEntries,
              hasMore: pageHasMore,
              nextCursor: pageNextCursor,
            });
          }
          if (!options.append && legacyPageTruncated) {
            setNotice(
              'Sono visibili le 50 voci legacy più recenti. Contatta l’amministratore per completare la migrazione dello storico.',
            );
          }
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        if (request === readSequenceRef.current) {
          setError(
            options.append
              ? 'Impossibile caricare altre voci. Riprova.'
              : 'Errore nel caricamento del diario.',
          );
        }
      } finally {
        if (!signal.aborted && request === readSequenceRef.current) {
          if (options.append) setLoadingMore(false);
          else if (!options.silent) setLoading(false);
        }
      }
    },
    [pazienteId, filterBy, legacyInfermieristico, legacyMedico],
  );

  useEffect(() => {
    const controller = new AbortController();
    const request = ++readSequenceRef.current;
    const timer = window.setTimeout(() => void fetchEntries(controller.signal, request), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      loadMoreControllerRef.current?.abort();
    };
  }, [fetchEntries, refreshVersion]);

  function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    const request = ++readSequenceRef.current;
    void fetchEntries(controller.signal, request, { cursor: nextCursor, append: true });
  }

  // ── Save new entry ───────────────────────────────────────────────────────────

  const [saveKey] = useState(createSubmissionKey);
  async function handleSave() {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      // Prompt 10 §6–§7: time, author and state come from the server, never from the form.
      const entryPayload = diaryCreatePayload(form);
      // Phase 6: same content → same requestId on retry (no duplicate entry after a lost response).
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ ...entryPayload, requestId: saveKey.for(entryPayload) }),
      });
      if (!res.ok)
        throw new Error(await diaryWriteErrorMessage(res, 'Errore nel salvataggio della voce.'));
      saveKey.reset();
      const data = (await res.json()) as { entry: DiarioPazienteEntry };
      const resolvedFilter = (filterBy ?? 'tutti') as DiarioAuthorType | 'tutti';
      if (resolvedFilter === 'tutti' || resolvedFilter === data.entry.authorType) {
        setEntries((prev) =>
          [data.entry, ...prev.filter((entry) => entry.id !== data.entry.id)].slice(
            0,
            DIARY_PAGE_SIZE,
          ),
        );
      }
      setForm(emptyForm());
      setShowAdd(false);
      setTherapyPanel(null);
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setError(
        error instanceof Error && error.message
          ? error.message
          : 'Errore nel salvataggio della voce.',
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Diario terapia: voce + terapia create insieme ─────────────────────────────

  // Dopo la conferma il pannello si chiude: il focus va sul link "apri" della voce appena creata.
  const focusTherapyLinkRef = useRef<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const focusTherapyLink = focusTherapyLinkRef.current;
    if (!focusTherapyLink) return;
    const link = document.querySelector<HTMLButtonElement>(
      `.diario-card__therapy[data-therapy-id="${CSS.escape(focusTherapyLink)}"] button`,
    );
    if (!link) return;
    link.focus();
    focusTherapyLinkRef.current = null;
  }, [entries]);

  function handleTherapyCreated(entry: DiaryEntryWithTherapy) {
    const resolvedFilter = (filterBy ?? 'tutti') as DiarioAuthorType | 'tutti';
    const visible = resolvedFilter === 'tutti' || resolvedFilter === entry.authorType;
    // Voce fuori dal filtro autore: niente link da mettere a fuoco, il focus torna su "Aggiungi voce".
    focusTherapyLinkRef.current = visible ? (entry.therapy?.id ?? null) : null;
    if (!visible) window.requestAnimationFrame(() => addButtonRef.current?.focus());
    if (visible) {
      setEntries((prev) =>
        [entry, ...prev.filter((current) => current.id !== entry.id)].slice(0, DIARY_PAGE_SIZE),
      );
    }
    setTherapyPanel(null);
    setForm(emptyForm());
    setShowAdd(false);
    setRefreshVersion((version) => version + 1);
  }

  // ── Save edited entry ────────────────────────────────────────────────────────

  async function handleEditSave() {
    if (!editEntry || !editForm.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary/${editEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          title: editForm.title.trim() || null,
          content: editForm.content.trim(),
          priority: editForm.priority,
          entryDateTime: editForm.entryDateTime,
        }),
      });
      if (!res.ok)
        throw new Error(
          await diaryWriteErrorMessage(res, 'Errore nel salvataggio della modifica.'),
        );
      const data = (await res.json()) as { entry: DiarioPazienteEntry };
      // La PUT restituisce la riga senza il riferimento alla terapia: si conserva quello letto.
      setEntries((prev) =>
        prev.map((e) =>
          e.id === data.entry.id
            ? {
                ...data.entry,
                therapy: (data.entry as DiaryFeedEntry).therapy ?? (e as DiaryFeedEntry).therapy,
              }
            : e,
        ),
      );
      setEditEntry(null);
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setError(
        error instanceof Error && error.message
          ? error.message
          : 'Errore nel salvataggio della modifica.',
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Delete entry ─────────────────────────────────────────────────────────────

  const [pendingDelete, setPendingDelete] = useState<DiarioPazienteEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleDelete(entry: DiarioPazienteEntry) {
    setPendingDelete(entry);
  }

  async function confirmDelete() {
    const entry = pendingDelete;
    if (!entry) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary/${entry.id}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setPendingDelete(null);
      setRefreshVersion((version) => version + 1);
    } catch {
      setError('Errore nella eliminazione della voce.');
    } finally {
      setDeleting(false);
    }
  }

  // ── «Ho capito» (UX2 W8: il primo non-autore prende in carico l'urgenza per tutti) ──────────

  async function handleAck(entry: DiaryFeedEntry) {
    if (acking) return;
    setAckError('');
    setAcking(entry.id);
    try {
      // Una consegna nel diario si prende in carico sulla consegna stessa (stessa regola).
      const result =
        entry.sourceType === 'consegna' && entry.sourceId
          ? await postUrgencyAck(
              `${API_URL}/consegne/${encodeURIComponent(entry.sourceId)}/ack`,
              operatorHeaders(),
            )
          : await postDiaryAck(pazienteId, entry.id);
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, urgency: result.urgency } : e)),
      );
      window.dispatchEvent(new CustomEvent(URGENCY_ACKNOWLEDGED_EVENT, { detail: { patientId: pazienteId } }));
      // Rivalida in background (la pagina in cache resta visibile): stato condiviso con gli altri.
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setAckError(
        error instanceof Error && error.message
          ? error.message
          : 'Presa in carico non registrata. Riprova.',
      );
    } finally {
      setAcking(null);
    }
  }

  function startEdit(entry: DiarioPazienteEntry) {
    setEditEntry(entry);
    setEditForm({
      title: entry.title ?? '',
      content: entry.content,
      priority: entry.priority,
      status: entry.status,
      entryDateTime: entry.entryDateTime.slice(0, 16),
    });
    setShowAdd(false);
  }

  // Detect legacy entries (patientId is empty string)
  function isLegacy(entry: DiarioPazienteEntry): boolean {
    return entry.patientId === '';
  }
  // A newly visible handover must not hide the older Cartella diary records.
  const additionalLegacy = entries.some((entry) => !isLegacy(entry))
    ? convertLegacyEntries(legacyInfermieristico, legacyMedico).filter(
        (entry) =>
          (!filterBy || filterBy === 'tutti' || entry.authorType === filterBy) &&
          !entries.some((current) => current.id === entry.id),
      )
    : [];
  const [legacyVisible, setLegacyVisible] = useState(50);

  // ── Diario a card: render helper per una voce ────────────────────────────────

  function renderDiarioCard(row: DiaryFeedEntry) {
    const toSee = needsMyAck(row);
    // UX2 W8: «Urgente» solo finché l'urgenza è attiva; presa in carico → non più segnalata.
    const urgentActive =
      row.priority === 'urgente' && (!row.urgency || isActiveUrgency(row.urgency));
    const priorityLabel =
      row.priority === 'urgente' && !urgentActive
        ? 'Presa in carico'
        : row.priority === 'importante'
          ? 'Importante (valore precedente)'
          : PRIORITY_LABELS[row.priority];
    const priorityBadge =
      row.priority === 'urgente' && !urgentActive ? 'badge--gray' : PRIORITY_BADGE[row.priority];
    const showEdit = canEditEntry;
    const showDelete = canDeleteEntry;
    return (
      <div
        key={row.id}
        className={`diario-card diario-card--${row.authorType}${toSee ? ' diario-card--to-see' : ''}${urgentActive ? ' diario-card--urgent' : row.urgency?.state === 'taken' ? ' diario-card--taken' : ''}`}
        data-entry-id={row.id}
        data-diary-entry-id={row.id}
      >
        <div className="diario-card__head">
          <span className={`badge ${AUTHOR_TYPE_BADGE[row.authorType]}`}>
            {AUTHOR_TYPE_LABELS[row.authorType]}
          </span>
          <span className={`badge ${priorityBadge}`}>{priorityLabel}</span>
          {/* UX2 W8: no open/closed concept in the diary; only «da rivedere» stays visible. */}
          {row.status === 'da_rivedere' && (
            <span className={`badge ${STATUS_BADGE[row.status]}`}>{STATUS_LABELS[row.status]}</span>
          )}
          <span className="diario-card__time">{fmtDT(row.entryDateTime)}</span>
          {!isLegacy(row) && row.sourceType !== 'consegna' && (showEdit || showDelete) && (
            <div className="diario-card__actions">
              {showEdit && (
                <button
                  className="icon-btn icon-btn--sm icon-btn--edit"
                  title="Modifica"
                  onClick={() => startEdit(row)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              {showDelete && (
                <button
                  className="icon-btn icon-btn--sm icon-btn--danger"
                  title="Elimina"
                  onClick={() => handleDelete(row)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="diario-card__author">{row.authorName}</div>
        {row.title && <div className="diario-card__title">{row.title}</div>}
        <div className="diario-card__content">{row.content}</div>
        {renderTherapyLink(row)}
        <UrgencyNotice
          urgency={row.urgency}
          onAcknowledge={() => void handleAck(row)}
          busy={acking === row.id}
          disabled={acking !== null}
          subject={`della voce${row.title ? ` «${row.title}»` : ''} del ${fmtDT(row.entryDateTime)}`}
        />
        {row.sourceType === 'consegna' && (
          <small className="form-hint">
            Consegna registrata · gestibile dalla sezione Consegne
          </small>
        )}
      </div>
    );
  }

  function renderTherapyLink(row: DiaryFeedEntry) {
    const state = linkedTherapyState(row);
    if (state === 'none') return null;
    if (state === 'removed' || !row.therapy) {
      return (
        <div className="diario-card__therapy">
          <span className="ds-badge ds-badge--stale">Terapia non più presente</span>
        </div>
      );
    }
    const therapy = row.therapy;
    return (
      <div className="diario-card__therapy" data-therapy-id={therapy.id}>
        <span>
          Terapia aggiunta: <strong>{therapy.farmacoNome}</strong>
          {onOpenTherapy ? ' —' : ''}
        </span>
        {onOpenTherapy && (
          <button
            type="button"
            className="ds-link"
            aria-label={`apri la terapia ${therapy.farmacoNome} nella scheda Terapia`}
            onClick={() => onOpenTherapy(therapy.id)}
          >
            apri
          </button>
        )}
        <span className={`ds-badge ${therapyStatoTone(therapy.stato)}`.trim()}>
          {THERAPY_STATO_LABELS[therapy.stato] ?? therapy.stato}
        </span>
      </div>
    );
  }

  // ── Form render helper ───────────────────────────────────────────────────────

  function renderForm(
    f: DiarioForm,
    setF: (fn: (prev: DiarioForm) => DiarioForm) => void,
    onSave: () => void,
    onCancel: () => void,
    title: string,
    therapy?: { onValidate: () => void; open: boolean },
  ) {
    const locked = Boolean(therapy?.open);
    // Etichette collegate ai campi (accessibilità e test): un prefisso per form (nuova / modifica).
    const fid = `diario-${therapy ? 'new' : 'edit'}`;
    return (
      <div className="cr-inline-form" style={{ marginBottom: 16 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9rem',
            marginBottom: 10,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </div>
        <div className="form-hint">Autore registrato automaticamente dall’account autenticato.</div>
        <div className="form-row">
          <label className="form-label" htmlFor={`${fid}-title`}>
            Titolo (opzionale)
          </label>
          <input
            id={`${fid}-title`}
            className="form-input"
            type="text"
            value={f.title}
            onChange={(e) => setF((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Titolo voce…"
          />
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor={`${fid}-content`}>
            Contenuto *
          </label>
          <textarea
            id={`${fid}-content`}
            className="form-input"
            rows={4}
            value={f.content}
            onChange={(e) => setF((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Descrizione, note cliniche…"
            style={{ resize: 'vertical' }}
            readOnly={locked}
            aria-describedby={locked ? 'diario-therapy-locked' : undefined}
          />
          {locked && (
            <small id="diario-therapy-locked" className="form-hint">
              Testo bloccato durante l’anteprima della terapia: chiudi l’anteprima per modificarlo.
            </small>
          )}
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor={`${fid}-priority`}>
            Priorità
          </label>
          <select
            id={`${fid}-priority`}
            className="form-input"
            value={f.priority}
            onChange={(e) =>
              setF((prev) => ({ ...prev, priority: e.target.value as DiarioForm['priority'] }))
            }
          >
            {corePriorityOptions(f.priority, 'importante', 'Importante').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {therapy ? (
          <div className="form-hint" data-testid="diary-auto-time">
            Data e ora registrate automaticamente al salvataggio.
          </div>
        ) : (
          <div className="form-row">
            <label className="form-label" htmlFor={`${fid}-when`}>
              Data e ora
            </label>
            <input
              id={`${fid}-when`}
              className="form-input"
              type="datetime-local"
              value={f.entryDateTime}
              onChange={(e) => setF((prev) => ({ ...prev, entryDateTime: e.target.value }))}
            />
          </div>
        )}
        <div className="cr-inline-form__actions diario-form__actions">
          <button className="btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
            Annulla
          </button>
          {therapy && (
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={therapy.onValidate}
              disabled={saving || therapy.open || !f.content.trim()}
            >
              Valida terapia
            </button>
          )}
          <button
            className="btn-success btn-sm"
            onClick={onSave}
            disabled={saving || !f.content.trim()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
        {therapy?.open && therapyPanel !== null && (
          <Suspense fallback={<LoadingState msg="Apertura dell’anteprima…" />}>
            <DiaryTherapyPanel
              key={therapyPanel}
              pazienteId={pazienteId}
              entry={{
                title: f.title.trim() || null,
                content: f.content.trim(),
                priority: f.priority,
                status: f.status,
                entryDateTime: f.entryDateTime,
              }}
              onCreated={handleTherapyCreated}
              onClose={() => setTherapyPanel(null)}
              onConflict={() => setRefreshVersion((version) => version + 1)}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // ── Actions for section header ───────────────────────────────────────────────

  const sectionActions = (
    <button
      ref={addButtonRef}
      className="btn-success btn-sm"
      onClick={() => {
        setShowAdd((v) => !v);
        setEditEntry(null);
        setTherapyPanel(null);
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Aggiungi voce
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="cr-tab-content">
      {ackError && <p className="diario-ack-error" role="alert">{ackError}</p>}
      {/* Error message */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'var(--red-bg)',
            color: 'var(--red)',
            fontSize: '0.85rem',
            marginBottom: 12,
          }}
        >
          {error}
          <button
            className="btn-secondary btn-sm"
            onClick={() => setRefreshVersion((version) => version + 1)}
          >
            Riprova caricamento
          </button>
        </div>
      )}
      {notice && (
        <div className="empty-state-card" role="status" style={{ marginBottom: 12 }}>
          {notice}
        </div>
      )}

      <ClinicalTableSection
        title="Diario Paziente"
        count={entries.length}
        countLabel={hasMore ? 'voci caricate' : entries.length === 1 ? 'voce' : 'voci'}
        defaultOpen
        actions={sectionActions}
      >
        {/* Add form */}
        {showAdd &&
          renderForm(
            form,
            setForm as (fn: (prev: DiarioForm) => DiarioForm) => void,
            handleSave,
            () => {
              setShowAdd(false);
              setTherapyPanel(null);
              setForm(emptyForm());
            },
            'Nuova voce diario',
            {
              open: therapyPanel !== null,
              onValidate: () => {
                // The prescription is dated when it is validated, not when the form was opened.
                setForm((prev) => ({ ...prev, entryDateTime: facilityLocalMinute() }));
                setTherapyPanel((opened) => (opened ?? 0) + 1);
              },
            },
          )}

        {/* Edit form */}
        {editEntry &&
          renderForm(
            editForm,
            setEditForm as (fn: (prev: DiarioForm) => DiarioForm) => void,
            handleEditSave,
            () => setEditEntry(null),
            `Modifica voce — ${fmtDT(editEntry.entryDateTime)}`,
          )}

        {!loading && countToSee(entries) > 0 && (
          <p className="diario-to-see" role="status">
            {countToSee(entries) === 1
              ? '1 urgenza da prendere in carico'
              : `${countToSee(entries)} urgenze da prendere in carico`}
          </p>
        )}

        {/* Diario a card (una card per voce, border-left colore ruolo) */}
        {loading ? (
          <LoadingState />
        ) : error ? null : entries.length === 0 ? (
          <EmptyState msg="Nessuna voce nel diario." />
        ) : (
          <>
            <div className="diario-cards">
              {[...entries]
                .sort((a, b) => {
                  const byTime = (b.entryDateTime || '').localeCompare(a.entryDateTime || '');
                  return byTime || b.id.localeCompare(a.id);
                })
                .map(renderDiarioCard)}
            </div>
            {hasMore && nextCursor && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Caricamento…' : 'Carica altre voci'}
                </button>
              </div>
            )}
          </>
        )}
        {!loading && additionalLegacy.length > 0 && (
          <details>
            <summary>Registrazioni precedenti ({additionalLegacy.length})</summary>
            {additionalLegacy.slice(0, legacyVisible).map(renderDiarioCard)}
            {additionalLegacy.length > legacyVisible && (
              <button
                className="btn-secondary btn-sm"
                onClick={() => setLegacyVisible((count) => count + 50)}
              >
                Mostra altre registrazioni precedenti
              </button>
            )}
          </details>
        )}
      </ClinicalTableSection>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminare la voce del diario?"
        message="La voce verrà rimossa dal diario del paziente. L'azione non è reversibile."
        confirmLabel="Elimina voce"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
