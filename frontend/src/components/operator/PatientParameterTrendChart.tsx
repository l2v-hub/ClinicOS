import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatientParameterReading } from '../../lib/patientParameterReadings';
import { FACILITY_TIME_ZONE } from '../../lib/facilityTime';
import {
  TREND_PARAMETERS,
  buildTrendSeries,
  trendPointTime,
  trendTimeDomain,
  trendValueDomain,
  type TrendParameter,
  type TrendPeriod,
  type TrendPoint,
} from '../../lib/patientParameterTrends';

interface Props {
  readings: PatientParameterReading[];
  selected: TrendParameter[];
  period: TrendPeriod;
}
const valueLabel = (value: number) => value.toLocaleString('it-IT', { maximumFractionDigits: 2 });

function TrendLane({
  readings,
  parameter,
  width,
  domain,
}: {
  readings: PatientParameterReading[];
  parameter: TrendParameter;
  width: number;
  domain: [number, number];
}) {
  const [selectedPoint, setSelectedPoint] = useState<TrendPoint | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const definition = TREND_PARAMETERS.find((item) => item.key === parameter)!;
  const { series, invalid } = useMemo(
    () => buildTrendSeries(readings, parameter),
    [readings, parameter],
  );
  const points = series.flatMap((item) =>
    item.points.filter((point): point is TrendPoint => point !== null),
  );
  const [min, max] = points.length ? trendValueDomain(points) : [0, 1];
  const x = (timestamp: number) =>
    48 + ((timestamp - domain[0]) / (domain[1] - domain[0])) * (width - 68);
  const y = (value: number) => 104 - ((value - min) / (max - min)) * 86;
  const ticks = Array.from({ length: width < 500 ? 3 : 5 }, (_, i) => i);
  const pointReadingIds = new Set(points.map((point) => point.reading.id));
  const coincident = selectedPoint
    ? readings.filter(
        (reading) =>
          Date.parse(reading.measuredAt) === selectedPoint.timestamp &&
          pointReadingIds.has(reading.id),
      )
    : [];
  let pointIndex = -1;
  return (
    <div
      className="parameter-trend-lane"
      style={{ '--trend-color': definition.color } as React.CSSProperties}
    >
      <div className="parameter-trend-lane__heading">
        <h4>
          <span aria-hidden="true" />
          {definition.label} <small>{definition.unit}</small>
        </h4>
        {parameter === 'pa' && (
          <span className="parameter-trend-legend">
            <span>Sistolica</span>
            <span>Diastolica</span>
          </span>
        )}
      </div>
      {!points.length ? (
        <p className="parameter-trend-lane__empty">Nessun valore disponibile nel periodo.</p>
      ) : (
        <svg
          className="parameter-trend-plot"
          viewBox={`0 0 ${width} 120`}
          width={width}
          height={120}
          role="group"
          aria-label={`Andamento ${definition.label}, ${definition.unit}`}
        >
          {[min, (min + max) / 2, max].map((value, i) => (
            <g key={i} aria-hidden="true">
              <line
                x1={48}
                x2={width - 20}
                y1={y(value)}
                y2={y(value)}
                className="parameter-trend-grid"
              />
              <text x={40} y={y(value) + 4} textAnchor="end">
                {valueLabel(value)}
              </text>
            </g>
          ))}
          {ticks.map((i) => {
            const time =
              domain[0] +
              (i / (ticks.length - 1)) * (domain[1] - domain[0]) -
              (i === ticks.length - 1 ? 1 : 0);
            return (
              <g key={i} aria-hidden="true">
                <line
                  x1={x(time)}
                  x2={x(time)}
                  y1={12}
                  y2={110}
                  className="parameter-trend-grid parameter-trend-grid--time"
                />
              </g>
            );
          })}
          {series.map((item) => {
            let connected = false;
            const path = item.points
              .map((point) => {
                if (!point) {
                  connected = false;
                  return '';
                }
                const command = connected ? 'L' : 'M';
                connected = true;
                return `${command}${x(point.timestamp)},${y(point.value)}`;
              })
              .join(' ');
            return (
              <g key={item.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={definition.color}
                  strokeWidth={1.8}
                  strokeDasharray={item.dashed ? '5 4' : undefined}
                  aria-hidden="true"
                />
                {item.points
                  .filter((point): point is TrendPoint => point !== null)
                  .map((point) => {
                    const index = ++pointIndex;
                    const active = selectedPoint?.id === point.id;
                    return (
                      <g
                        key={point.id}
                        data-trend-point
                        role="button"
                        tabIndex={index === focusIndex ? 0 : -1}
                        aria-label={`${point.series}: ${valueLabel(point.value)} ${definition.unit}, ${trendPointTime(point.reading.measuredAt)}, ${point.reading.authorName}`}
                        aria-pressed={active}
                        className={`parameter-trend-point${active ? ' is-selected' : ''}`}
                        onFocus={() => setFocusIndex(index)}
                        onClick={() => {
                          setFocusIndex(index);
                          setSelectedPoint(point);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedPoint(point);
                          }
                          if (event.key === 'Escape') setSelectedPoint(null);
                          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                            event.preventDefault();
                            const next =
                              event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? points.length - 1
                                  : Math.max(
                                      0,
                                      Math.min(
                                        points.length - 1,
                                        index + (event.key === 'ArrowRight' ? 1 : -1),
                                      ),
                                    );
                            const targets = event.currentTarget
                              .closest('svg')
                              ?.querySelectorAll<SVGGElement>('[data-trend-point]');
                            targets?.[next]?.focus();
                          }
                        }}
                      >
                        <title>{`${point.series}: ${valueLabel(point.value)} ${definition.unit} · ${trendPointTime(point.reading.measuredAt)}`}</title>
                        <circle
                          cx={x(point.timestamp)}
                          cy={y(point.value)}
                          r={12}
                          fill="transparent"
                          className="parameter-trend-hit"
                        />
                      </g>
                    );
                  })}
              </g>
            );
          })}
          {/* Visible dots sit above every enlarged touch target, so a nearby target cannot
              intercept a tap directly on another measurement's dot. Keyboard targets stay unique. */}
          <g aria-hidden="true">
            {points.map((point, index) => (
              <circle
                key={point.id}
                cx={x(point.timestamp)}
                cy={y(point.value)}
                r={4.5}
                fill={
                  parameter === 'pa' && point.series === 'Diastolica' ? 'white' : definition.color
                }
                stroke={definition.color}
                strokeWidth={2}
                className="parameter-trend-dot"
                onClick={(event) => {
                  setFocusIndex(index);
                  setSelectedPoint(point);
                  event.currentTarget.ownerSVGElement
                    ?.querySelectorAll<SVGGElement>('[data-trend-point]')
                    [index]?.focus();
                }}
              >
                <title>{`${point.series}: ${valueLabel(point.value)} ${definition.unit} · ${trendPointTime(point.reading.measuredAt)}`}</title>
              </circle>
            ))}
          </g>
        </svg>
      )}
      {invalid > 0 && (
        <p className="parameter-trend-note">
          {invalid}{' '}
          {invalid === 1
            ? 'valore non numerico o non valido, consultabile'
            : 'valori non numerici o non validi, consultabili'}{' '}
          nello storico.
        </p>
      )}
      {selectedPoint && (
        <div className="parameter-trend-detail" role="status" aria-live="polite">
          <div className="parameter-trend-detail__title">
            <strong>{definition.label} · dettaglio rilevazione</strong>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setSelectedPoint(null)}
              aria-label={`Chiudi dettaglio ${definition.label}`}
            >
              Chiudi
            </button>
          </div>
          {coincident.length > 1 && (
            <p>{coincident.length} rilevazioni nello stesso istante, mostrate separatamente.</p>
          )}
          <ul>
            {coincident.map((reading) => (
              <li key={reading.id}>
                <strong>
                  {reading.values[parameter]} <small>{definition.unit}</small>
                </strong>
                <time dateTime={reading.measuredAt}>{trendPointTime(reading.measuredAt)}</time>
                <span>{reading.authorName || 'Operatore non disponibile'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PatientParameterTrendChart({ readings, selected, period }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.floor(entry.contentRect.width))),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const domain = trendTimeDomain(period);
  const parameters = TREND_PARAMETERS.filter((item) => selected.includes(item.key));
  return (
    <div
      className="parameter-trend-chart"
      ref={container}
      aria-label="Grafico dei parametri nel tempo"
    >
      {parameters.map((item) => (
        <TrendLane
          key={item.key}
          readings={readings}
          parameter={item.key}
          width={width}
          domain={domain}
        />
      ))}
      <svg
        className="parameter-trend-plot"
        width={width}
        height={30}
        viewBox={`0 0 ${width} 30`}
        aria-label="Asse temporale condiviso"
      >
        {Array.from({ length: width < 500 ? 3 : 5 }, (_, i) => {
          const count = width < 500 ? 3 : 5;
          const time =
            domain[0] + (i / (count - 1)) * (domain[1] - domain[0]) - (i === count - 1 ? 1 : 0);
          const label = new Intl.DateTimeFormat('it-IT', {
            timeZone: FACILITY_TIME_ZONE,
            ...(domain[1] - domain[0] <= 90_000_000
              ? { hour: '2-digit' as const, minute: '2-digit' as const }
              : { day: '2-digit' as const, month: '2-digit' as const }),
          }).format(time);
          return (
            <text
              key={i}
              x={48 + (i / (count - 1)) * (width - 68)}
              y={18}
              textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'}
            >
              {label}
            </text>
          );
        })}
      </svg>
      <p className="parameter-trend-axis-label">Data e ora · Europe/Rome</p>
    </div>
  );
}
