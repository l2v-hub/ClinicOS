import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { API_URL } from '../../config';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useAnomalieReparto } from './cartella/useAnomalieReparto';
import type { Paziente } from '../../types';
import { IcoSearch, IcoX, IcoPlus, IcoUser } from '../../icons';
import { usePatientListPage } from './usePatientListPage';
import { PageHeader } from '../shared/PageHeader';
import { AIImportStatus } from '../shared/AIImportStatus';
import { NewPatientFlow } from './NewPatientFlow';
import { NewPatientStart } from './NewPatientStart';
import type { NewPatientPath } from './NewPatientChooser';
import {
  LIST_VIEW_LABEL,
  countListViews,
  matchesListView,
  unknownStateCount,
  type ListView,
} from '../../lib/patientListView';
import { cachedGetJson } from '../../lib/cachedFetch';
import { operatorHeaders } from '../../lib/operatorSession';
import { useCan } from '../../lib/capabilities';
import { PatientRoster } from './PatientRoster';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { useRosterOrderContext } from '../shared/RosterOrderContext';
import { sortPatientRoster, type PatientRosterSort } from '../../lib/patientRosterSort';
import './PatientList.css';

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
  /** Richiesta anticipata della cartella al passaggio del mouse/focus su una riga. */
  onPrefetch?: (p: Paziente) => void;
  /** REQ-018: refresh the list after an imported patient is created.
   * #243: also carries the id of the just-created patient and (optionally) the "Moduli" tab
   * the operator selected in the intake wizard, so the caller can navigate straight there. */
  onImported?: (patientId?: string, moduleTabId?: string) => void;
  onDeleted?: (patientId: string) => void;
  /** REQ-019: operator identity for import authorization. */
  operatorId?: string;
  operatorRole?: string;
  /** Pagina "Nuovo ingresso" (voce di navigazione #/nuovo-ingresso) al posto dell'elenco. */
  newIntake?: boolean;
  onOpenNewIntake?: () => void;
  onCloseNewIntake?: () => void;
}

export function PatientList({
  totalPatients,
  ricerca,
  onRicercaChange: setRicerca,
  filtroSesso,
  onFiltroSessoChange: setFiltroSesso,
  onSelect,
  onPrefetch,
  onImported,
  onDeleted,
  operatorId,
  operatorRole,
  newIntake = false,
  onOpenNewIntake,
  onCloseNewIntake,
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
  // Prompt 10 AT-13: l'ingresso si offre solo a chi può aprirne la bozza (es. non OSS, non admin).
  const canIntake = useCan('intake.create_draft');
  // Nuovo ingresso: pagina di scelta (HMI 1), poi il flusso scelto nella sua finestra di sempre.
  // Tornando all'elenco il fuoco torna su "Nuovo ingresso" (la card che lo aveva non c'è più).
  const [newPatientPath, setNewPatientPath] = useState<NewPatientPath | null>(null);
  const newIntakeButtonRef = useRef<HTMLButtonElement>(null);
  const focusNewIntakeRef = useRef(false);
  useEffect(() => {
    // Qualunque uscita dalla pagina (link, freccia, sidebar, flusso chiuso) torna qui.
    if (newIntake) focusNewIntakeRef.current = true;
    if (!focusNewIntakeRef.current || newIntake || newPatientPath) return;
    focusNewIntakeRef.current = false;
    newIntakeButtonRef.current?.focus();
  });
  // Vista come il prototipo: "Ricoverati" (in carico) predefinita, "Dimessi e archivio", "Tutti".
  const [vista, setVista] = useState<ListView>('in_carico');
  const [showFilters, setShowFilters] = useState(false);
  // Vista scelta prima di iniziare una ricerca: cancellata la ricerca, si torna lì.
  const [vistaPrimaDellaRicerca, setVistaPrimaDellaRicerca] = useState<ListView | null>(null);
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

  // Conteggi sulle pagine già caricate: il backend non espone ancora un aggregato per stato.
  const contiVista = useMemo(
    () =>
      countListViews(
        filtratiBase.map((p) => p.id),
        (id) => summaryMap.get(id)?.statoRicovero,
      ),
    [filtratiBase, summaryMap],
  );
  const statiNonNoti = useMemo(
    () =>
      unknownStateCount(
        filtratiBase.map((p) => p.id),
        (id) => summaryMap.get(id)?.statoRicovero,
      ),
    [filtratiBase, summaryMap],
  );
  const filtrati = useMemo(
    () => filtratiBase.filter((p) => matchesListView(summaryMap.get(p.id)?.statoRicovero, vista)),
    [filtratiBase, vista, summaryMap],
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

  // Fine import dal pulsante "Importa dimissione": ricarica la lista e apre
  // il paziente creato o aggiornato, sul modulo scelto.
  const handleImported = (patientId?: string, moduleTabId?: string) => {
    void loadPage(undefined, false);
    onImported?.(patientId, moduleTabId);
  };

  if (newIntake && canIntake)
    return (
      <NewPatientStart
        onBack={() => onCloseNewIntake?.()}
        onChoose={(path) => {
          setNewPatientPath(path);
          onCloseNewIntake?.();
        }}
      />
    );

  return (
    <div className="patient-list-view">
      <PageHeader
        title="Pazienti"
        subtitle={
          ricerca || filtroSesso !== 'tutti'
            ? `${pazienti.length} risultati caricati`
            : `${pazienti.length} caricati su ${Math.max(totalPatients, pazienti.length)}`
        }
      />

      {/* HMI 1: card "Nuovo ingresso", come il prototipo */}
      {canIntake && (
        <section className="plist-card plist-new" aria-labelledby="plist-new-title">
          <span className="plist-new__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6" />
            </svg>
          </span>
          <div className="plist-new__text">
            <h2 id="plist-new-title">Nuovo ingresso</h2>
            <p>Da lettera di dimissione, foto o a mano: l’AI compila i dati, tu li verifichi.</p>
          </div>
          <div className="plist-new__actions">
            <AIImportStatus
              onImported={handleImported}
              operatorId={operatorId}
              operatorRole={operatorRole}
            />
            <button
              ref={newIntakeButtonRef}
              type="button"
              className="ds-btn ds-btn--primary"
              onClick={onOpenNewIntake}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6" />
              </svg>
              Nuovo ingresso
            </button>
          </div>
        </section>
      )}

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

      <section className="plist-card plist-list" aria-label="Elenco pazienti">
        <div className="plist-toolbar">
          <div className="search-wrap plist-search">
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
                // la ricerca guarda tutti i pazienti, anche i dimessi; cancellata, si torna
                // alla vista di prima
                const value = e.target.value;
                if (value && !ricerca) {
                  setVistaPrimaDellaRicerca(vista);
                  setVista('tutti');
                } else if (!value && ricerca) {
                  setVista(vistaPrimaDellaRicerca ?? 'in_carico');
                  setVistaPrimaDellaRicerca(null);
                }
                setRicerca(value);
              }}
            />
            {ricerca && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setVista(vistaPrimaDellaRicerca ?? 'in_carico');
                  setVistaPrimaDellaRicerca(null);
                  setRicerca('');
                }}
                aria-label="Cancella"
              >
                <IcoX />
              </button>
            )}
          </div>
          <div className="plist-views" role="group" aria-label="Vista dei pazienti caricati">
            {(['in_carico', 'dimessi', 'tutti'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className="ds-chip"
                aria-pressed={vista === v}
                onClick={() => setVista(v)}
              >
                {LIST_VIEW_LABEL[v]}
                {contiVista[v] !== null && <span className="ds-chip__count">{contiVista[v]}</span>}
              </button>
            ))}
            <button
              type="button"
              className="ds-chip"
              aria-expanded={showFilters}
              aria-controls="plist-filters"
              onClick={() => setShowFilters((v) => !v)}
            >
              Filtri e ordine
              {/* un filtro attivo si vede anche a pannello chiuso */}
              {filtroSesso !== 'tutti' && (
                <span className="ds-chip__count">{filtroSesso === 'M' ? 'Maschi' : 'Femmine'}</span>
              )}
            </button>
          </div>
        </div>
        {statiNonNoti > 0 && vista !== 'tutti' && (
          <p className="plist-note" role="status">
            {statiNonNoti === 1 ? '1 paziente ha' : `${statiNonNoti} pazienti hanno`} lo stato di
            ricovero non ancora disponibile:{' '}
            {vista === 'dimessi'
              ? 'i dimessi non si possono ancora distinguere.'
              : statiNonNoti === 1
                ? 'resta fra i ricoverati finché il dato non arriva.'
                : 'restano fra i ricoverati finché il dato non arriva.'}
          </p>
        )}
        {filtroSesso !== 'tutti' && !showFilters && (
          <p className="plist-note" role="status">
            Filtro attivo: solo {filtroSesso === 'M' ? 'maschi' : 'femmine'}.{' '}
            <button type="button" className="link-btn" onClick={() => setFiltroSesso('tutti')}>
              Mostra tutti
            </button>
          </p>
        )}
        {showFilters && (
          <div className="plist-filters" id="plist-filters">
            <div className="filter-chips" role="group" aria-label="Filtra pazienti per sesso">
              {(['tutti', 'M', 'F'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`filter-chip${filtroSesso === s ? ' active' : ''}`}
                  aria-pressed={filtroSesso === s}
                  onClick={() => {
                    setFiltroSesso(s);
                  }}
                >
                  {s === 'tutti' ? 'Tutti' : s === 'M' ? 'Maschio' : 'Femmina'}
                </button>
              ))}
            </div>
            <RosterOrderControl onSelect={() => setLocalSort(null)} />
          </div>
        )}

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
              <button className="btn-success" onClick={onOpenNewIntake}>
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
              onPrefetch={onPrefetch}
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
      </section>

      {newPatientPath && (
        <NewPatientFlow
          initialPath={newPatientPath}
          onClose={() => {
            focusNewIntakeRef.current = true;
            setNewPatientPath(null);
          }}
          onDone={(patientId, moduleTabId, path) => {
            setNewPatientPath(null);
            // l'import può aggiornare un paziente esistente: la lista si ricarica sempre
            if (path === 'documenti' || !patientId) void loadPage(undefined, false);
            onImported?.(patientId, moduleTabId);
          }}
          operatorId={operatorId}
          operatorRole={operatorRole}
        />
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
