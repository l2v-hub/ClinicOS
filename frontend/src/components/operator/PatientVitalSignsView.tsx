import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartellaPaziente, Paziente } from '../../types';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { facilityLocalMinute } from '../../lib/facilityTime';
import { loadPatientParameterTrends } from '../../lib/loadPatientParameterTrends';
import type { PatientParameterReading } from '../../lib/patientParameterReadings';
import { parameterPeriod, type ParameterPeriodPreset } from '../../lib/patientParameterWorkspace';
import type { TrendPeriod } from '../../lib/patientParameterTrends';
import { VitalSignsEditor } from './PatientDetailLazyTabs';
import { PatientParameterHistory } from './PatientParameterHistory';
import { PatientParameterTrends } from './PatientParameterTrends';
import { PatientParameterPeriodFilter } from './PatientParameterPeriodFilter';
import { PatientParameterEntry } from './PatientParameterEntry';
import './PatientParameterWorkspace.css';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  operatoreNome: string;
  operatoreId: string;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
}
export function PatientVitalSignsView(props: Props) {
  return <PatientParameterWorkspace key={`${props.paziente.id}:${props.operatoreId}`} {...props} />;
}
function PatientParameterWorkspace({
  cartella,
  paziente,
  operatoreNome,
  operatoreId,
  onUpdate,
}: Props) {
  const [today, setToday] = useState(() => facilityLocalMinute().slice(0, 10));
  const [preset, setPreset] = useState<ParameterPeriodPreset | 'custom'>('today');
  const [custom, setCustom] = useState<TrendPeriod>(() => parameterPeriod('today'));
  const period = useMemo(
    () => (preset === 'custom' ? custom : parameterPeriod(preset, today)),
    [preset, custom, today],
  );
  const [showGraph, setShowGraph] = useState(false);
  const [editLegacy, setEditLegacy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    readings?: PatientParameterReading[];
    error?: string;
  } | null>(null);
  const generation = useRef(0);
  const requestKey = `${paziente.id}:${operatoreId}:${period.start}:${period.end}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    const version = ++generation.current;
    setResult(null);
    setProgress(0);
    void loadPatientParameterTrends(API_URL, paziente.id, period, {
      headers: operatorHeaders(),
      signal: controller.signal,
      onProgress: (count) => {
        if (!controller.signal.aborted && version === generation.current) setProgress(count);
      },
    })
      .then((readings) => {
        if (!controller.signal.aborted && version === generation.current)
          setResult({ key: requestKey, readings });
      })
      .catch(() => {
        if (!controller.signal.aborted && version === generation.current)
          setResult({
            key: requestKey,
            error:
              'Impossibile caricare tutte le rilevazioni del periodo. Riprova o scegli un intervallo più breve.',
          });
      });
    return () => controller.abort();
  }, [paziente.id, period, requestKey]);
  const current = result?.key === requestKey ? result : null;
  const readings = current?.readings;
  const refresh = () => setRevision((value) => value + 1);
  const showToday = () => {
    setToday(facilityLocalMinute().slice(0, 10));
    setPreset('today');
  };
  return (
    <div className="patient-vital-signs parameter-workspace" id="vital-panel">
      <PatientParameterEntry
        patientId={paziente.id}
        operatorId={operatoreId}
        onSaved={refresh}
        onDayChange={setToday}
        onShowToday={showToday}
      />
      <section className="parameter-workspace-records" aria-label="Consultazione parametri vitali">
        <div className="parameter-workspace-records__heading">
          <h3>Valori e andamento</h3>
          <button type="button" className="btn-secondary btn-sm" onClick={refresh}>
            Aggiorna
          </button>
        </div>
        <PatientParameterPeriodFilter
          preset={preset}
          period={period}
          onPreset={setPreset}
          onCustom={(value) => {
            setCustom(value);
            setPreset('custom');
          }}
        />
        <div className="parameter-workspace-summary">
          <div>
            <strong>
              {period.start.split('-').reverse().join('/')} –{' '}
              {period.end.split('-').reverse().join('/')}
            </strong>
            {readings && (
              <span>
                {readings.length} {readings.length === 1 ? 'rilevazione' : 'rilevazioni'} nel
                periodo
              </span>
            )}
          </div>
          <button
            type="button"
            className={`btn-secondary btn-sm${showGraph ? ' parameter-workspace-graph-active' : ''}`}
            aria-expanded={showGraph}
            aria-controls="parameter-inline-graph"
            onClick={() => setShowGraph((value) => !value)}
          >
            {showGraph ? 'Nascondi andamento' : 'Mostra andamento'}
          </button>
        </div>
        {!current && (
          <p role="status">
            Caricamento delle rilevazioni del periodo…{progress > 0 ? ` ${progress} lette` : ''}
          </p>
        )}
        {current?.error && (
          <div role="alert" className="parameter-trends-error">
            <p>{current.error}</p>
            <button type="button" className="btn-secondary btn-sm" onClick={refresh}>
              Riprova
            </button>
          </div>
        )}
        <div id="parameter-inline-graph" hidden={!showGraph}>
          {showGraph && readings && (
            <PatientParameterTrends readings={readings} period={period} sourceKey={requestKey} />
          )}
        </div>
        {readings && (
          <PatientParameterHistory
            key={requestKey}
            readings={readings}
            period={period}
            cartella={cartella}
          >
            <details onToggle={(event) => setEditLegacy(event.currentTarget.open)}>
              <summary>Modifica griglia di origine</summary>
              {editLegacy && (
                <VitalSignsEditor
                  mode="patient-chart"
                  cartella={cartella}
                  paziente={paziente}
                  onUpdate={onUpdate}
                  operatoreNome={operatoreNome}
                  value={undefined as never}
                  onChange={() => {}}
                />
              )}
            </details>
          </PatientParameterHistory>
        )}
      </section>
    </div>
  );
}
