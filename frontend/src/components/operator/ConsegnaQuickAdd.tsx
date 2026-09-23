import { useEffect, useRef, useState } from 'react';
import type { Operatore, Paziente } from '../../types';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import {
  createConsegnaDraftStore,
  submitConsegna,
  type ConsegnaDraftStore,
} from '../../lib/consegnaDrafts';
import { ConsegnaComposer } from './ConsegnaComposer';
import './ConsegneRounds.css';
export function ConsegnaQuickAdd({
  patient,
  operatori,
  onAdd,
  onClose,
  draftStore,
}: {
  patient: Paziente;
  operatori: Operatore[];
  onAdd: ConsegnaCreate;
  onClose: () => void;
  draftStore?: ConsegnaDraftStore;
}) {
  const [store] = useState(() => draftStore ?? createConsegnaDraftStore());
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    return () => {
      generation.current = version + 1;
    };
  }, [patient.id]);
  useEffect(
    () => () => {
      if (!draftStore) store.clear();
    },
    [store, draftStore],
  );
  async function save() {
    const token = store.begin(patient.id);
    if (!token) return;
    const version = generation.current;
    if ((await submitConsegna(store, token, onAdd)) && version === generation.current) onClose();
  }
  return (
    <div className="handover-workspace">
      <ConsegnaComposer
        patient={patient}
        store={store}
        operatori={operatori}
        onSave={() => void save()}
      />
      <button type="button" className="link-btn" onClick={onClose}>
        Chiudi · conserva bozza
      </button>
    </div>
  );
}
