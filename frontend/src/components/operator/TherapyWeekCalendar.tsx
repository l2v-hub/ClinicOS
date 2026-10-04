import { useEffect, useRef, useState } from 'react';
import type { TherapySlot, TherapySlotPageInfo } from '../../types';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { buildTherapySlotPageUrl, mergeTherapySlotPages, parseTherapySlotPage } from '../../lib/therapySlotPage';
import { weekDays } from '../../lib/therapyWeek';
import { giroTimes } from '../../lib/therapyGiro';
import { doseStatus } from '../../lib/therapyDoseStatus';
import { patientIdentityName } from '../../lib/patientIdentity';
import { TherapyCalendarGrid, type TherapyCalendarCell } from '../shared/TherapyCalendarGrid';
import { TherapyCalendarDialog } from './TherapyCalendarDialog';
import './TherapyWeekCalendar.css';

type DayState = { status: 'error' } | { status: 'ready'; slots: TherapySlot[]; pageInfo: TherapySlotPageInfo };
interface Props {
  date: string;
  open: { date: string; time: string } | null;
  onOpen: (date: string, time: string) => void;
  onClose: () => void;
  onOpenPatient: (patientId: string, date: string, time: string) => void;
  scrollTop?: number;
  onScroll?: (scrollTop: number) => void;
}

/** Compact exact-time calendar. Band totals are never presented as exact hour totals. */
export function TherapyWeekCalendar({ date, open, onOpen, onClose, onOpenPatient, scrollTop = 0, onScroll }: Props) {
  const days = weekDays(date);
  const key = days[0];
  const [state, setState] = useState<{ key: string; days: Record<string, DayState> }>({ key, days: {} });
  const [retry, setRetry] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const keyRef = useRef(key); keyRef.current = key;

  useEffect(() => {
    const controller = new AbortController();
    for (const day of weekDays(key)) {
      fetch(buildTherapySlotPageUrl(API_URL, day), { headers: operatorHeaders(), signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          const page = parseTherapySlotPage(await response.json());
          if (!controller.signal.aborted) setState((current) => ({ key, days: {
            ...(current.key === key ? current.days : {}), [day]: { status: 'ready', slots: page.slots, pageInfo: page.pageInfo },
          } }));
        }).catch(() => {
          if (!controller.signal.aborted) setState((current) => ({ key, days: { ...(current.key === key ? current.days : {}), [day]: { status: 'error' } } }));
        });
    }
    return () => controller.abort();
  }, [key, retry]);
  const byDay = state.key === key ? state.days : {};
  const loadingDays = days.filter((day) => !byDay[day]);
  const errorDays = days.filter((day) => byDay[day]?.status === 'error');
  const cells: TherapyCalendarCell[] = days.flatMap((day) => {
    const loaded = byDay[day];
    if (loaded?.status !== 'ready') return [];
    return giroTimes(loaded.slots).map((time) => {
      const statuses = time.patients.flatMap((patient) => patient.items.map(({ a }) => doseStatus({ ...a, scheduledTime: time.ora }, day)));
      const late = statuses.filter((status) => status.tone === 'late').length;
      const names = time.patients.map((patient) => patientIdentityName({ ...patient.patient, id: patient.patient.patientId }));
      return { date: day, time: time.ora, title: names.slice(0, 2).join(' · ') + (names.length > 2 ? ` · +${names.length - 2} pazienti` : ''),
        detail: `${time.patients.length} pazienti · ${late ? `${late} in ritardo` : `${time.administered + time.notAdministered}/${time.total} registrate`}`,
        count: time.total, tone: late ? 'late' : time.pending === 0 ? 'done' : 'due',
        partial: loaded.pageInfo.hasMore || !loaded.pageInfo.summaryExact };
    });
  });
  useEffect(() => {
    const grid = root.current?.querySelector<HTMLElement>('.therapy-calendar-grid');
    if (!grid || loadingDays.length || restored.current) return;
    grid.scrollTop = scrollTop;
    restored.current = true;
  }, [loadingDays.length, scrollTop]);
  async function loadMore(day = open?.date) {
    const target = day ? byDay[day] : undefined;
    if (!day || target?.status !== 'ready' || !target.pageInfo.nextCursor || loadingMore) return;
    const requestKey = key;
    setLoadingMore(true); setMoreError(null);
    try {
      const response = await fetch(buildTherapySlotPageUrl(API_URL, day, target.pageInfo.nextCursor), { headers: operatorHeaders() });
      if (!response.ok) throw new Error(String(response.status));
      const page = parseTherapySlotPage(await response.json());
      if (keyRef.current !== requestKey) return;
      setState((current) => ({ ...current, days: { ...current.days, [day]: {
        status: 'ready', slots: mergeTherapySlotPages(target.slots, page.slots), pageInfo: page.pageInfo,
      } } }));
    } catch { if (keyRef.current === requestKey) setMoreError('Altri dettagli non disponibili. Riprova.'); }
    finally { setLoadingMore(false); }
  }
  const selected = open && byDay[open.date];
  const selectedTime = open && selected?.status === 'ready' ? giroTimes(selected.slots).find((time) => time.ora === open.time) : undefined;
  return <section className="tcal" aria-label="Calendario della settimana">
    {errorDays.length > 0 && <p role="alert">Alcuni giorni non sono disponibili. <button className="btn-secondary btn-sm" onClick={() => { setState({ key, days: {} }); setRetry((value) => value + 1); }}>Riprova</button></p>}
    {days.some((day) => { const loaded = byDay[day]; return loaded?.status === 'ready' && loaded.pageInfo.hasMore; }) && <p role="status">Elenco parziale: apri uno slot e carica gli altri dettagli.</p>}
    {days.map((day) => { const loaded = byDay[day]; return loaded?.status === 'ready' && loaded.pageInfo.hasMore ? <button key={day} type="button" className="btn-secondary btn-sm" disabled={loadingMore} onClick={() => void loadMore(day)}>Altri dettagli · {day}</button> : null; })}
    {!loadingDays.length && !errorDays.length && !cells.length && <p>Nessuna dose programmata questa settimana.</p>}
    <div ref={root} onScrollCapture={(event) => onScroll?.((event.target as HTMLElement).scrollTop)}>
      <TherapyCalendarGrid days={days} cells={cells} onOpen={onOpen} selected={open} loadingDays={loadingDays} errorDays={errorDays} />
    </div>
    {open && selected?.status === 'ready' && <TherapyCalendarDialog date={open.date} time={selectedTime} onClose={onClose}
      onOpenPatient={onOpenPatient} partial={selected.pageInfo.hasMore || !selected.pageInfo.summaryExact}
      onLoadMore={() => void loadMore()} loadingMore={loadingMore} error={moreError} />}
  </section>;
}
