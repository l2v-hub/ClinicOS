import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { fetchParameterReadings, PARAMETER_READING_SAVED_EVENT } from './patientParameterReadings';
import { previousValues, type previousText } from './parameterPad';

type PreviousState = Parameters<typeof previousText>[0];
/** A bounded, read-only history caption, never a source of current input values. */
export function usePreviousParameterValues(patientId: string): PreviousState {
  const [previous, setPrevious] = useState<{ id: string; state: PreviousState }>({
    id: patientId,
    state: { status: 'loading' },
  });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPrevious({ id: patientId, state: { status: 'loading' } });
    fetchParameterReadings(
      API_URL,
      patientId,
      {},
      {
        headers: operatorHeaders(),
        signal: controller.signal,
      },
    )
      .then((page) => {
        if (!controller.signal.aborted)
          setPrevious({
            id: patientId,
            state: {
              status: 'ready',
              values: previousValues(page.readings),
              hasMore: page.hasMore,
              count: page.readings.length,
            },
          });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPrevious({ id: patientId, state: { status: 'error' } });
      });
    return () => controller.abort();
  }, [patientId, reload]);
  useEffect(() => {
    const onSaved = (event: Event) => {
      if ((event as CustomEvent<{ patientId?: string }>).detail?.patientId === patientId)
        setReload((value) => value + 1);
    };
    window.addEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
  }, [patientId]);
  return previous.id === patientId ? previous.state : { status: 'loading' };
}
