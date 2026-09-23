import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../../config';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useAnomalieReparto } from './cartella/useAnomalieReparto';
import type { Paziente } from '../../types';
import { IcoSearch, IcoX, IcoPlus, IcoUser } from '../../icons';
import { DialogLoading } from '../shared/DialogLoading';
import { usePatientListPage } from './usePatientListPage';
import { PageHeader } from '../shared/PageHeader';
import { AIImportStatus } from '../shared/AIImportStatus';
import { cachedGetJson } from '../../lib/cachedFetch';
import { operatorHeaders } from '../../lib/operatorSession';
import { PatientRoster } from './PatientRoster';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { useRosterOrderContext } from '../shared/RosterOrderContext';
import {
  ADMISSION_LABELS as STATO_RICOVERO_LABEL,
  sortPatientRoster,
  type PatientRosterSort,
} from '../../lib/patientRosterSort';
import './PatientList.css';

const IntakeWorkspace = lazy(() =>
  import('../shared/intake/IntakeWorkspace').then((module) => ({
    default: module.IntakeWorkspace,
  })),
);

interface PatientListProps {
  totalPatients: number;
  /** Sollevati in App.tsx: PatientList si smonta ad ogni apertura cartella (renderizzato solo
   * mentre navKey === 'pazienti'), quindi lo stato locale andrebbe perso ad ogni riapertura se
   * non vivesse nel parent, sempre montato. */
  ricerca: string;
  onRicercaChange: (v: string) => void;
  filtroSesso: 'tutti' | 'M' | 'F';
  onFiltroSessoChange: (v: 'tutti' | 'M' | 'F') => void;
  onSelect: (p: Paziente) => void;
  /** REQ-018: refresh the list after an imported patient is created.
   * #243: also carries the id of the just-created patient and (optionally) the "Moduli" tab
   * the operator selected in the intake wizard, so the caller can navigate straight there. */
  onImported?: (patientId?: string, moduleTabId?: string) => void;
  onDeleted?: (patientId: string) => void;
  /** REQ-019: operator identity for import authorization. */
  operatorId?: string;
  operatorRole?: string;
}

export function PatientList({
  totalPatients,
  ricerca,
  onRicercaChange: setRicerca,
  filtroSesso,
  onFiltroSessoChange: setFiltroSesso,
  onSelect,
  onImported,
  onDeleted,
  operatorId,
  operatorRole,
}: PatientListProps) {
  const {
    patients: pazienti,
    summary: clinicalSummary,
    loading,
    loadingMore,
    hasMore,
    nextCursor,
    pageError,
    summaryLoading,
    summaryError,
    loadPage,
    retrySummary,
  } = usePatientListPage(ricerca, filtroSesso);
  const rosterOrder = useRosterOrderContext();
  const [localSort, setLocalSort] = useState<PatientRosterSort | null>(null);
  const sort: PatientRosterSort = localSort ?? {
    field: 'patient',
    direction: rosterOrder.order.direction,
  };
  function setSort(next: PatientRosterSort) {
    if (next.field === 'patient') {
      setLocalSort(null);
      void rosterOrder.choose({ criterion: 'name', direction: next.direction });
    } else setLocalSort(next);
  }

  const summaryMap = useMemo(
    () => new Map(clinicalSummary.map((c) => [c.patientId, c])),
    [clinicalSummary],
  );
  // AC6/AC11: anomalie di tutto il reparto da UNA richiesta, non una per paziente.
  const anomalie = useAnomalieReparto();
  const [showModal, setShowModal] = useState(false);
  const [filtroStatoRicovero, setFiltroStatoRicovero] = useState<string>('tutti');
  // TEST-ONLY: patient deletion. Backend gates it via ALLOW_PATIENT_DELETE; we hide the
  // button when disabled so production simply never shows it.
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    cachedGetJson<{ deleteEnabled?: boolean } | null>(`${API_URL}/patients/settings`)
      .then((s) => {
        if (s) setDeleteEnabled(!!s.deleteEnabled);
      })
      .catch(() => {
        setSettingsError(
          'Impossibile verificare le impostazioni della lista pazienti: alcune funzioni potrebbero non essere disponibili.',
        );
      });
  }, []);

  const [pendingDelete, setPendingDelete] = useState<Paziente | null>(null);

  const handleDelete = useCallback(
    (p: Paziente, e: React.MouseEvent) => {
      e.stopPropagation();
      if (deletingId) return;
      setPendingDelete(p);
    },
    [deletingId],
  );

  const confirmDelete = useCallback(async () => {
    const p = pendingDelete;
    if (!p) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`${API_URL}/patients/${p.id}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Eliminazione non riuscita');
        return;
      }
      setPendingDelete(null);
      await loadPage(undefined, false);
      onDeleted?.(p.id);
    } catch {
      alert('Errore di rete durante l’eliminazione');
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, onDeleted, loadPage]);

  const consegneAperteMap = useMemo(() => {
    const map = new Map(
      clinicalSummary
        .filter((entry) => entry.consegneAperte > 0)
        .map((entry) => [entry.patientId, entry.consegneAperte]),
    );
    return map;
  }, [clinicalSummary]);

  const filtratiBase = pazienti;

  // Chip mostrate solo per gli stati presenti nelle pagine gia' caricate. Il backend non espone
  // ancora un filtro aggregato per stato clinico, quindi questi conteggi non sono facility-wide.
  const statiPresenti = useMemo(() => {
    const presenti = new Set<string>();
    pazienti.forEach((p) => {
      const s = summaryMap.get(p.id)?.statoRicovero;
      if (s) presenti.add(s);
    });
    return Object.keys(STATO_RICOVERO_LABEL).filter((s) => presenti.has(s));
  }, [pazienti, summaryMap]);

  const contiStato = useMemo(() => {
    const conti: Record<string, number> = {};
    filtratiBase.forEach((p) => {
      const s = summaryMap.get(p.id)?.statoRicovero;
      if (s) conti[s] = (conti[s] ?? 0) + 1;
    });
    return conti;
  }, [filtratiBase, summaryMap]);

  const filtrati = useMemo(
    () =>
      filtroStatoRicovero === 'tutti'
        ? filtratiBase
        : filtratiBase.filter((p) => summaryMap.get(p.id)?.statoRicovero === filtroStatoRicovero),
    [filtratiBase, filtroStatoRicovero, summaryMap],
  );
  const ordinati = useMemo(
    () =>
      localSort
        ? sortPatientRoster(filtrati, localSort, {
            summaryMap,
            consegneAperteMap,
            anomalies: anomalie.perPaziente,
          })
        : filtrati,
    [filtrati, localSort, summaryMap, consegneAperteMap, anomalie.perPaziente],
  );

  return (
    <div className="patient-list-view">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Pazienti' }]}
        title="Pazienti"
        subtitle={
          ricerca || filtroSesso !== 'tutti'
            ? `${pazienti.length} risultati caricati`
            : `${pazienti.length} caricati su ${Math.max(totalPatients, pazienti.length)}`
        }
        actions={
          <>
            <AIImportStatus
              onImported={() => {
                void loadPage(undefined, false);
                onImported?.();
              }}
              operatorId={operatorId}
              operatorRole={operatorRole}
            />
            <button className="btn-success" onClick={() => setShowModal(true)}>
              <IcoPlus /> Nuovo paziente
            </button>
          </>
        }
      />

      {/* Errore verifica impostazioni (niente fallimenti silenziosi — FR-018) */}
      {(settingsError || pageError) && (
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
          {settingsError || pageError}
          {pageError && (
            <button
              type="button"
              className="link-btn"
              style={{ marginLeft: 12 }}
              onClick={() => void loadPage(undefined, false)}
            >
              Riprova
            </button>
          )}
        </div>
      )}

      {summaryError && (
        <div className="patient-roster-status patient-roster-status--warning" role="status">
          {summaryError}{' '}
          <button type="button" className="link-btn" onClick={retrySummary}>
            Riprova segnalazioni
          </button>
        </div>
      )}
      {summaryLoading && pazienti.length > 0 && (
        <p className="patient-roster-status" role="status">
          Aggiornamento ricoveri e segnalazioni…
        </p>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico">
            <IcoSearch />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Cerca per nome o codice fiscale…"
            aria-label="Cerca paziente per nome o codice fiscale"
            maxLength={80}
            value={ricerca}
            onChange={(e) => {
              setFiltroStatoRicovero('tutti');
              setRicerca(e.target.value);
            }}
          />
          {ricerca && (
            <button
              className="search-clear-btn"
              onClick={() => {
                setFiltroStatoRicovero('tutti');
                setRicerca('');
              }}
              aria-label="Cancella"
            >
              <IcoX />
            </button>
          )}
        </div>
        <div className="filter-chips" role="group" aria-label="Filtra pazienti per sesso">
          {(['tutti', 'M', 'F'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-chip${filtroSesso === s ? ' active' : ''}`}
              aria-pressed={filtroSesso === s}
              onClick={() => {
                setFiltroStatoRicovero('tutti');
                setFiltroSesso(s);
              }}
            >
              {s === 'tutti' ? 'Tutti' : s === 'M' ? 'Maschio' : 'Femmina'}
            </button>
          ))}
        </div>
        {statiPresenti.length > 0 && (
          <div
            className="filter-chips"
            role="group"
            aria-label="Filtra per stato di ricovero nei risultati caricati"
          >
            <button
              type="button"
              className={`filter-chip${filtroStatoRicovero === 'tutti' ? ' active' : ''}`}
              aria-pressed={filtroStatoRicovero === 'tutti'}
              onClick={() => setFiltroStatoRicovero('tutti')}
            >
              Tutti gli stati caricati
            </button>
            {statiPresenti.map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-chip${filtroStatoRicovero === s ? ' active' : ''}`}
                aria-pressed={filtroStatoRicovero === s}
                onClick={() => setFiltroStatoRicovero(s)}
              >
                {STATO_RICOVERO_LABEL[s]}
                {contiStato[s] ? ` (${contiStato[s]})` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <RosterOrderControl onSelect={() => setLocalSort(null)} />

      {/* Empty state */}
      {!loading && !pageError && pazienti.length === 0 && (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div className="empty-state-card__ico" aria-hidden="true">
            <IcoUser />
          </div>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>
            {ricerca || filtroSesso !== 'tutti'
              ? 'Nessun paziente trovato'
              : 'Nessun paziente presente'}
          </h3>
          <p
            style={{
              color: 'var(--text-muted)',
              marginBottom: 24,
              maxWidth: 360,
              margin: '0 auto 24px',
            }}
          >
            {ricerca || filtroSesso !== 'tutti'
              ? 'Prova a modificare la ricerca o i filtri.'
              : 'Non ci sono ancora pazienti registrati. Aggiungi il primo paziente per iniziare.'}
          </p>
          {!ricerca && filtroSesso === 'tutti' && (
            <button className="btn-success" onClick={() => setShowModal(true)}>
              <IcoPlus /> Aggiungi primo paziente
            </button>
          )}
        </div>
      )}

      {/* Tabella + card, sempre aperte (niente sezione collassabile) */}
      {(loading || pazienti.length > 0) && (
        <>
          <PatientRoster
            localSortActive={Boolean(localSort)}
            serverCriterion={rosterOrder.order.criterion}
            patients={ordinati}
            sort={sort}
            onSortChange={setSort}
            hasMore={hasMore}
            loading={loading}
            summaryLoading={summaryLoading}
            summaryMap={summaryMap}
            consegneAperteMap={consegneAperteMap}
            anomalie={anomalie}
            deleteEnabled={deleteEnabled}
            deletingId={deletingId}
            onSelect={onSelect}
            onDelete={handleDelete}
          />
          {hasMore && nextCursor && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button
                type="button"
                className="btn-ghost-outline"
                disabled={loadingMore}
                onClick={() => void loadPage(nextCursor, true)}
              >
                {loadingMore ? 'Caricamento…' : 'Carica altri pazienti'}
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <Suspense fallback={<DialogLoading onClose={() => setShowModal(false)} />}>
          <IntakeWorkspace
            open={showModal}
            onClose={() => setShowModal(false)}
            onCreated={(patientId, moduleTabId) => {
              setShowModal(false);
              if (!patientId) void loadPage(undefined, false);
              onImported?.(patientId, moduleTabId);
            }}
            operatorId={operatorId}
            operatorRole={operatorRole}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminare definitivamente il paziente?"
        message={
          pendingDelete ? (
            <>
              Verranno rimossi anche <strong>cartella e dati clinici</strong> di{' '}
              {pendingDelete.lastName}, {pendingDelete.firstName} (codice fiscale:{' '}
              {pendingDelete.codiceFiscale ?? 'non disponibile'}). Azione di test, non reversibile.
            </>
          ) : null
        }
        confirmLabel="Elimina paziente"
        busy={deletingId !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
