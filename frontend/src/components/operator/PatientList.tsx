import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { API_URL } from '../../config';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useAnomalieReparto } from './cartella/useAnomalieReparto';
import type { Paziente, ClinicalSummaryEntry } from '../../types';
import { IcoSearch, IcoX, IcoPlus, IcoUser } from '../../icons';
import { IntakeWorkspace } from '../shared/intake/IntakeWorkspace';
import { PageHeader } from '../shared/PageHeader';
import { AIImportStatus } from '../shared/AIImportStatus';
import { cachedGetJson } from '../../lib/cachedFetch';
import { operatorHeaders } from '../../lib/operatorSession';
import { fetchPatientPageWithSummary, mergePatientPage } from '../../lib/patientPage';
import { PatientRoster } from './PatientRoster';
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
  /** REQ-018: refresh the list after an imported patient is created.
   * #243: also carries the id of the just-created patient and (optionally) the "Moduli" tab
   * the operator selected in the intake wizard, so the caller can navigate straight there. */
  onImported?: (patientId?: string, moduleTabId?: string) => void;
  onDeleted?: (patientId: string) => void;
  /** REQ-019: operator identity for import authorization. */
  operatorId?: string;
  operatorRole?: string;
}

const STATO_RICOVERO_LABEL: Record<string, string> = {
  ricoverato: 'Ricoverato',
  ambulatoriale: 'Ambulatoriale',
  day_hospital: 'Day Hospital',
  dimesso: 'Dimesso',
};

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
  const [pazienti, setPazienti] = useState<Paziente[]>([]);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const requestSequence = useRef(0);

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

  const loadPage = useCallback(
    async (cursor?: string, append = false, signal?: AbortSignal) => {
      const requestId = ++requestSequence.current;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setPageError('');
        setPazienti([]);
        setClinicalSummary([]);
      }

      try {
        const { page, summary } = await fetchPatientPageWithSummary(
          API_URL,
          {
            q: ricerca,
            sex: filtroSesso === 'tutti' ? undefined : filtroSesso,
            cursor,
            limit: 50,
          },
          { headers: operatorHeaders(), signal },
        );

        if (signal?.aborted || requestId !== requestSequence.current) return;
        setPazienti((current) => mergePatientPage(current, page.items, append));
        setClinicalSummary((current) => {
          if (!append) return summary;
          const byPatient = new Map(current.map((entry) => [entry.patientId, entry]));
          summary.forEach((entry) => byPatient.set(entry.patientId, entry));
          return [...byPatient.values()];
        });
        setHasMore(page.hasMore);
        setNextCursor(page.nextCursor);
      } catch (error) {
        if (
          (error as { name?: string }).name !== 'AbortError' &&
          requestId === requestSequence.current
        ) {
          setPageError((error as Error).message || 'Errore nel caricamento dei pazienti');
          if (!append) {
            setHasMore(false);
            setNextCursor(null);
          }
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [ricerca, filtroSesso],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadPage(undefined, false, controller.signal);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      requestSequence.current += 1;
    };
  }, [loadPage]);

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
            patients={loading ? [] : filtrati}
            loading={loading}
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
