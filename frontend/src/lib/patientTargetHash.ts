// URL hash of a patient chart landing: `#/dettaglio-paziente/<id>[/<tab>][?<item>]`. Reload and a
// shared link reopen the same section and item. Only opaque ids go in the URL — never names or
// clinical text. `#/dettaglio-paziente/<id>` (no tab) stays valid and opens the overview.
import { TAB_GROUPS, type TabId } from '../components/operator/tabGroups';
import type { PatientTarget, TherapySubView } from './patientTarget';

const PREFIX = '#/dettaglio-paziente/';

const EXTRA_TABS: TabId[] = ['panoramica', 'moduli', 'riepilogo', 'sezioni-narrative'];
// New views first; the cycle-1 values stay valid so links already shared keep opening.
const THERAPY_VIEWS: TherapySubView[] = [
  'calendario',
  'storico',
  'nuova',
  'attivi',
  'programmazione',
  'giornaliere',
  'sospese',
];

export function isTabId(value: string): value is TabId {
  return (
    (EXTRA_TABS as string[]).includes(value) ||
    TAB_GROUPS.some((group) => group.tabs.some((tab) => tab.id === value))
  );
}

// Short query keys keep the URL readable; the order is fixed so equal targets give equal hashes.
const KEYS = {
  subView: 'sv',
  therapyId: 't',
  date: 'd',
  fascia: 'f',
  consegnaId: 'c',
  diaryEntryId: 'e',
  documentId: 'doc',
  pageNumber: 'p',
  assessmentId: 'a',
  anchor: 'an',
} as const;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function patientTargetHash(target: PatientTarget): string {
  let hash = `${PREFIX}${encodeURIComponent(target.patientId)}`;
  if (target.tab && target.tab !== 'panoramica') hash += `/${target.tab}`;
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  };
  put(KEYS.subView, target.therapy?.subView);
  put(KEYS.therapyId, target.therapy?.therapyId);
  put(KEYS.date, target.therapy?.date);
  put(KEYS.fascia, target.therapy?.fascia);
  put(KEYS.consegnaId, target.consegnaId);
  put(KEYS.diaryEntryId, target.diaryEntryId);
  put(KEYS.documentId, target.documentId);
  put(KEYS.pageNumber, target.pageNumber);
  put(KEYS.assessmentId, target.assessmentId);
  put(KEYS.anchor, target.anchor);
  const query = params.toString();
  return query ? `${hash}?${query}` : hash;
}

/** Parses a chart hash; null when the hash is not a patient chart link. Unknown or malformed
 *  parts are dropped (the chart still opens), never guessed. */
export function parsePatientTargetHash(hash: string): PatientTarget | null {
  if (!hash.startsWith(PREFIX)) return null;
  const rest = hash.slice(PREFIX.length);
  const [path, query = ''] = rest.split('?', 2);
  const [rawId, rawTab] = path.split('/');
  if (!rawId) return null;
  let patientId: string;
  try {
    patientId = decodeURIComponent(rawId);
  } catch {
    return null;
  }
  const target: PatientTarget = { patientId };
  if (rawTab && isTabId(rawTab)) target.tab = rawTab;
  const params = new URLSearchParams(query);
  const get = (key: string) => {
    const value = params.get(key);
    return value && value.trim() ? value : undefined;
  };
  const subView = get(KEYS.subView);
  const therapyId = get(KEYS.therapyId);
  const date = get(KEYS.date);
  const fascia = get(KEYS.fascia);
  if (target.tab === 'terapia-farmacologica' && (subView || therapyId || date || fascia)) {
    target.therapy = {
      ...(subView && (THERAPY_VIEWS as string[]).includes(subView)
        ? { subView: subView as TherapySubView }
        : {}),
      ...(therapyId ? { therapyId } : {}),
      ...(date && ISO_DAY.test(date) ? { date } : {}),
      ...(fascia ? { fascia } : {}),
    };
  }
  const consegnaId = get(KEYS.consegnaId);
  if (consegnaId) target.consegnaId = consegnaId;
  const diaryEntryId = get(KEYS.diaryEntryId);
  if (diaryEntryId) target.diaryEntryId = diaryEntryId;
  const documentId = get(KEYS.documentId);
  if (documentId) target.documentId = documentId;
  const page = Number(get(KEYS.pageNumber));
  if (target.documentId && Number.isInteger(page) && page > 0) target.pageNumber = page;
  const assessmentId = get(KEYS.assessmentId);
  if (assessmentId) target.assessmentId = assessmentId;
  if (get(KEYS.anchor) === 'allergie') target.anchor = 'allergie';
  return target;
}

/** Target without the patient id, as stored in history.state. */
export type StoredPatientTarget = Omit<PatientTarget, 'patientId'>;

export function storedTarget(target: PatientTarget): StoredPatientTarget | undefined {
  const { patientId: _id, tab: _tab, ...rest } = target;
  void _id;
  void _tab;
  return Object.keys(rest).length ? rest : undefined;
}

/**
 * QA F2: the Terapia view chosen by the operator is part of the current history entry (hash and
 * history.state), so reload and Back reopen it. Replaces the entry (a view switch is not a new
 * page); a no-op unless the URL is this patient's chart.
 */
export function rememberTherapyView(patientId: string, subView: TherapySubView): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const linked = parsePatientTargetHash(window.location.hash);
  if (!linked || linked.patientId !== patientId) return;
  const therapy = { subView };
  const hash = patientTargetHash({ patientId, tab: 'terapia-farmacologica', therapy });
  if (hash === window.location.hash) return;
  const current: unknown = window.history.state;
  const state = current && typeof current === 'object' ? (current as Record<string, unknown>) : {};
  window.history.replaceState(
    { ...state, patientTab: 'terapia-farmacologica', patientTarget: { therapy } },
    '',
    hash,
  );
}
