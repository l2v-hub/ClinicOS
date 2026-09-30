// Amministrazione → Ruoli e permessi (policy Identity → Role → Capability, fase 2).
//
// Tutte le modifiche vanno su una bozza LOCALE del documento attivo. Niente viene salvato finché
// l'amministratore non sceglie "Salva bozza" o "Salva e applica" (con conferma e anteprima impatto).

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyPolicyVersion,
  fetchPolicy,
  fetchPolicyVersions,
  previewPolicyImpact,
  savePolicyVersion,
  type Effect,
  type PolicyDocument,
  type PolicyImpactResponse,
  type PolicyResponse,
  type PolicyVersion,
} from '../../lib/authzPolicyApi';
import { PageHeader } from '../shared/PageHeader';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { PageSecondaryNavigation } from '../navigation/PageSecondaryNavigation';
import type { TopNavItem } from '../navigation/TopNav';
import { FilterBar } from './role-permissions/FilterBar';
import { MatrixView } from './role-permissions/MatrixView';
import { RoleView } from './role-permissions/RoleView';
import { CapabilityView } from './role-permissions/CapabilityView';
import { IdentitiesView } from './role-permissions/IdentitiesView';
import { HistoryView } from './role-permissions/HistoryView';
import { ImpactPanel, ImpactSummaryInline } from './role-permissions/ImpactPanel';
import { ChangeBar } from './role-permissions/ChangeBar';
import {
  EMPTY_FILTERS,
  cloneDocument,
  describePolicyError,
  diffDraft,
  doubtfulCapabilities,
  filterCapabilities,
  filtersActive,
  groupByDomain,
  withAssignment,
  withGrant,
} from './role-permissions/rolePermissionsModel';
import './RolePermissionsPage.css';

export interface RolePermissionsPageProps {
  /** Chiamata dopo che una nuova versione è diventata attiva (es. per ricaricare /auth/me). */
  onPolicyApplied?: () => void;
}

type View = 'matrix' | 'role' | 'capability' | 'identities' | 'history';

type Notice = { tone: 'success' | 'warning' | 'error'; text: string; reload?: boolean };

type Pending =
  { kind: 'save-apply' } | { kind: 'apply-draft'; version: PolicyVersion } | { kind: 'discard' };

const EMPTY_REVIEW: Record<string, string> = {};
const PANEL_ID = 'rp-panel';

export function RolePermissionsPage({ onPolicyApplied }: RolePermissionsPageProps) {
  const [policy, setPolicy] = useState<PolicyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PolicyDocument | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [view, setView] = useState<View>('matrix');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [roleId, setRoleId] = useState('');
  const [capabilityId, setCapabilityId] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [impact, setImpact] = useState<{
    draft: PolicyDocument;
    data: PolicyImpactResponse;
  } | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      fetchPolicy(controller.signal),
      fetchPolicyVersions(controller.signal),
    ]).then(([policyResult, versionsResult]) => {
      if (controller.signal.aborted) return;
      if (policyResult.status === 'fulfilled') {
        setPolicy(policyResult.value);
        setDraft(cloneDocument(policyResult.value.active.document));
        setLoadError(null);
      } else {
        setLoadError(describePolicyError(policyResult.reason).message);
      }
      if (versionsResult.status === 'fulfilled') {
        setVersions(versionsResult.value);
        setVersionsError(null);
      } else {
        setVersionsError(
          `Storico non disponibile: ${describePolicyError(versionsResult.reason).message}`,
        );
      }
      setImpact(null);
      setLoading(false);
    });
    return () => controller.abort();
  }, [reloadTick]);

  const reload = useCallback(() => {
    setLoading(true);
    setNote('');
    setPending(null);
    setReloadTick((tick) => tick + 1);
  }, []);

  const base = policy?.active.document ?? null;
  const capabilities = useMemo(() => policy?.capabilities ?? [], [policy]);
  const review = base?.review ?? EMPTY_REVIEW;

  const diff = useMemo(
    () => (base && draft ? diffDraft(base, draft, capabilities) : null),
    [base, draft, capabilities],
  );
  const doubtful = useMemo(() => doubtfulCapabilities(review), [review]);
  const modified = diff?.changedCapabilities;
  const filtered = useMemo(
    () =>
      filterCapabilities(capabilities, filters, {
        doubtful,
        modified: modified ?? new Set<string>(),
      }),
    [capabilities, filters, doubtful, modified],
  );
  const groups = useMemo(() => groupByDomain(filtered), [filtered]);
  const filtering = filtersActive(filters);

  const capabilityNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const cap of capabilities) names.set(cap.id, cap.name);
    for (const cap of policy?.derived ?? []) names.set(cap.id, cap.name);
    return names;
  }, [capabilities, policy]);
  const identityNames = useMemo(
    () => new Map((policy?.identities ?? []).map((identity) => [identity.id, identity.name])),
    [policy],
  );
  const capabilityName = useCallback(
    (id: string) => capabilityNames.get(id) ?? id,
    [capabilityNames],
  );
  const identityName = useCallback((id: string) => identityNames.get(id) ?? id, [identityNames]);

  const onGrantChange = useCallback((role: string, capability: string, effect: Effect) => {
    setDraft((current) => (current ? withGrant(current, role, capability, effect) : current));
  }, []);
  const onAssign = useCallback((operatorId: string, role: string | null) => {
    setDraft((current) => (current ? withAssignment(current, operatorId, role) : current));
  }, []);

  const currentImpact = impact && impact.draft === draft ? impact.data : null;
  const pendingChanges = diff?.total ?? 0;

  function fail(error: unknown) {
    const described = describePolicyError(error);
    setNotice({ tone: 'error', text: described.message, reload: described.needsReload });
  }

  async function loadImpact(): Promise<PolicyImpactResponse | null> {
    if (!draft) return null;
    if (currentImpact) return currentImpact;
    const requested = draft;
    setImpactLoading(true);
    try {
      const data = await previewPolicyImpact(requested);
      setImpact({ draft: requested, data });
      return data;
    } catch (error) {
      fail(error);
      return null;
    } finally {
      setImpactLoading(false);
    }
  }

  async function saveDraft() {
    if (!draft || !policy) return;
    setBusy(true);
    try {
      const saved = await savePolicyVersion({
        document: draft,
        basedOnVersion: policy.active.version,
        note: note.trim() || undefined,
        apply: false,
      });
      setNotice({
        tone: 'success',
        text: `Bozza v${saved.version} salvata. La trovi nello Storico, pronta da applicare.`,
      });
      reload();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  async function requestSaveApply() {
    setNotice(null);
    // Senza anteprima (errore già mostrato nel banner) non si chiede conferma alla cieca.
    if (await loadImpact()) setPending({ kind: 'save-apply' });
  }

  async function confirmPending() {
    if (!pending || !policy) return;
    if (pending.kind === 'discard') {
      setDraft(cloneDocument(policy.active.document));
      setNote('');
      setImpact(null);
      setPending(null);
      return;
    }
    setBusy(true);
    try {
      const applied =
        pending.kind === 'save-apply'
          ? draft &&
            (await savePolicyVersion({
              document: draft,
              basedOnVersion: policy.active.version,
              note: note.trim() || undefined,
              apply: true,
            }))
          : await applyPolicyVersion(pending.version.version);
      if (!applied) return;
      setNotice({ tone: 'success', text: `Versione v${applied.version} applicata e attiva.` });
      reload();
      onPolicyApplied?.();
    } catch (error) {
      setPending(null);
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  const views: TopNavItem[] = [
    { key: 'matrix', label: 'Matrice' },
    { key: 'role', label: 'Per ruolo' },
    { key: 'capability', label: 'Per capability' },
    { key: 'identities', label: 'Identità', badge: diff?.assignments.length },
    {
      key: 'history',
      label: 'Storico',
      badge: versions.filter((version) => version.status === 'draft').length,
    },
  ];

  const subtitle = policy
    ? `Policy attiva v${policy.active.version}${
        policy.active.source === 'baseline'
          ? ' (configurazione iniziale)'
          : policy.active.appliedAt
            ? ` · applicata il ${new Date(policy.active.appliedAt).toLocaleString('it-IT', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}`
            : ''
      } · ${capabilities.length} capability · ${policy.active.document.roles.length} ruoli`
    : 'Identità, ruoli e capability';

  return (
    <div className="rp-page">
      <PageHeader
        breadcrumb={[
          { label: 'ClinicOS' },
          { label: 'Amministrazione' },
          { label: 'Ruoli e permessi' },
        ]}
        title="Ruoli e permessi"
        subtitle={subtitle}
        tabs={
          <div className="rp-tabs-row">
            <PageSecondaryNavigation
              items={views}
              activeKey={view}
              onChange={(key) => setView(key as View)}
              ariaLabel="Viste ruoli e permessi"
              idPrefix="rp-view"
              panelId={PANEL_ID}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || busy}
              onClick={() => {
                setNotice(null);
                reload();
              }}
            >
              Ricarica
            </button>
          </div>
        }
      />

      {notice && (
        <div
          className={`rp-banner rp-banner--${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          <span>{notice.text}</span>
          <span className="rp-banner__actions">
            {notice.reload && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setNotice(null);
                  reload();
                }}
              >
                Ricarica policy (scarta modifiche locali)
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => setNotice(null)}>
              Chiudi
            </button>
          </span>
        </div>
      )}

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`rp-view-${view}`} className="rp-body">
        {loading && !policy ? (
          <p className="cr-empty">Caricamento della policy…</p>
        ) : loadError || !policy || !draft || !diff ? (
          <div className="rp-banner rp-banner--error" role="alert">
            <span>{loadError ?? 'Policy non disponibile.'}</span>
            <button type="button" className="btn-secondary" onClick={reload}>
              Riprova
            </button>
          </div>
        ) : (
          <>
            {(view === 'matrix' || view === 'role' || view === 'capability') && (
              <FilterBar
                value={filters}
                onChange={setFilters}
                shown={filtered.length}
                total={capabilities.length}
              />
            )}
            {view === 'matrix' && (
              <MatrixView
                groups={groups}
                roles={draft.roles}
                draft={draft}
                review={review}
                changedCells={diff.changedCells}
                filtering={filtering}
                onChange={onGrantChange}
              />
            )}
            {view === 'role' && (
              <RoleView
                roleId={roleId || draft.roles[0]?.id || ''}
                onRoleChange={setRoleId}
                draft={draft}
                groups={groups}
                allCapabilities={capabilities}
                identities={policy.identities}
                review={review}
                changedCells={diff.changedCells}
                filtering={filtering}
                onChange={onGrantChange}
              />
            )}
            {view === 'capability' && (
              <CapabilityView
                capabilityId={capabilityId}
                onCapabilityChange={setCapabilityId}
                groups={groups}
                capabilities={capabilities}
                derived={policy.derived}
                draft={draft}
                review={review}
                changedCells={diff.changedCells}
                onChange={onGrantChange}
              />
            )}
            {view === 'identities' && (
              <IdentitiesView
                identities={policy.identities}
                draft={draft}
                changedIdentities={diff.changedIdentities}
                onAssign={onAssign}
              />
            )}
            {view === 'history' && (
              <HistoryView
                versions={versions}
                error={versionsError}
                activeVersion={policy.active.version}
                roles={draft.roles}
                capabilityName={capabilityName}
                identityName={identityName}
                busy={busy}
                onApplyDraft={(version) => {
                  setNotice(null);
                  setPending({ kind: 'apply-draft', version });
                }}
              />
            )}

            {currentImpact && pendingChanges > 0 && (
              <ImpactPanel
                impact={currentImpact}
                roles={draft.roles}
                capabilityName={capabilityName}
                identityName={identityName}
              />
            )}
          </>
        )}
      </div>

      {policy && pendingChanges > 0 && diff && (
        <ChangeBar
          grants={diff.grants.length}
          assignments={diff.assignments.length}
          note={note}
          onNoteChange={setNote}
          busy={busy}
          impactLoading={impactLoading}
          onPreview={() => {
            setNotice(null);
            void loadImpact();
          }}
          onDiscard={() => setPending({ kind: 'discard' })}
          onSaveDraft={() => {
            setNotice(null);
            void saveDraft();
          }}
          onSaveApply={() => void requestSaveApply()}
        />
      )}

      <ConfirmDialog
        open={pending?.kind === 'save-apply'}
        title="Salvare e applicare la nuova policy?"
        tone="primary"
        confirmLabel="Salva e applica"
        busy={busy}
        message={
          <ImpactSummaryInline
            impact={currentImpact}
            roles={draft?.roles ?? []}
            changes={{
              grants: diff?.grants.length ?? 0,
              assignments: diff?.assignments.length ?? 0,
            }}
          />
        }
        onConfirm={() => void confirmPending()}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'apply-draft'}
        title={
          pending?.kind === 'apply-draft'
            ? `Applicare la bozza v${pending.version.version}?`
            : 'Applicare la bozza?'
        }
        tone="primary"
        confirmLabel="Applica bozza"
        busy={busy}
        message={
          pending?.kind === 'apply-draft'
            ? `La bozza v${pending.version.version} (${pending.version.changeSummary?.counts.grants ?? 0} permessi, ${pending.version.changeSummary?.counts.assignments ?? 0} assegnazioni) diventa la policy attiva.${
                pendingChanges > 0
                  ? ` Le ${pendingChanges} modifiche locali non salvate verranno scartate.`
                  : ''
              }`
            : ''
        }
        onConfirm={() => void confirmPending()}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'discard'}
        title="Annullare le modifiche?"
        confirmLabel="Annulla modifiche"
        cancelLabel="Continua a modificare"
        message={`Le ${pendingChanges} modifiche non salvate verranno perse.`}
        onConfirm={() => void confirmPending()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

export default RolePermissionsPage;
