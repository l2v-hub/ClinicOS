import { useEffect, useId, useState } from 'react';
import type { Operatore, Paziente } from '../../types';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import { submitConsegna, type ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { fetchPatientById } from '../../lib/patientPage';
import { patientLocationLabel } from '../../lib/patientIdentity';
import { useCan } from '../../lib/capabilities';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { useConsegneRoster } from './useConsegneRoster';
import { ConsegnaComposer } from './ConsegnaComposer';

/** «Scrivi una consegna» in cima alla pagina Consegne (#449): paziente, testo, Invia — senza
 *  cambiare vista. Stesso modulo e stesso salvataggio della vista per paziente (bozze, esiti
 *  incerti, terapia dal diario). Il paziente è preimpostato quando si arriva da una cartella. */
export function ConsegnaQuickWrite({
  store,
  operatori,
  onAdd,
  initialPatientId,
  onSaved,
}: {
  store: ConsegnaDraftStore;
  operatori: Operatore[];
  onAdd: ConsegnaCreate;
  initialPatientId?: string;
  onSaved?: () => void;
}) {
  const id = useId();
  const canCreate = useCan('consegne.create');
  const [query, setQuery] = useState('');
  const roster = useConsegneRoster(query, '', canCreate);
  const [selected, setSelected] = useState<Paziente | null>(null);
  // Arrivo da una cartella: il paziente è già scelto, anche se non è nella prima pagina.
  useEffect(() => {
    if (!initialPatientId || !canCreate) return;
    const controller = new AbortController();
    void fetchPatientById(API_URL, initialPatientId, {
      headers: operatorHeaders(),
      signal: controller.signal,
    })
      .then((patient) => {
        if (!controller.signal.aborted && patient) setSelected(patient);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initialPatientId, canCreate]);
  if (!canCreate) return null;
  const options =
    selected && !roster.items.some((p) => p.id === selected.id)
      ? [selected, ...roster.items]
      : roster.items;
  async function save() {
    if (!selected) return;
    const token = store.begin(selected.id);
    if (!token) return;
    const ok = await submitConsegna(store, token, onAdd);
    if (ok) {
      onSaved?.();
    }
  }
  return (
    <section className="consegna-quick" aria-label="Scrivi una consegna">
      <div className="consegna-quick__patient">
        <label htmlFor={`${id}-patient`}>Paziente</label>
        <select
          id={`${id}-patient`}
          className="form-select"
          value={selected?.id ?? ''}
          onChange={(event) => {
            setSelected(options.find((p) => p.id === event.target.value) ?? null);
          }}
        >
          <option value="">Scegli il paziente</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.lastName} {p.firstName}
              {p.location !== undefined ? ` · ${patientLocationLabel(p.location)}` : ''}
            </option>
          ))}
        </select>
        {(roster.nextCursor || query) && (
          <input
            className="form-input consegna-quick__search"
            type="search"
            aria-label="Cerca il paziente"
            placeholder="Cerca per nome"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {roster.error && <p role="alert">{roster.error}</p>}
      </div>
      {selected ? (
        <ConsegnaComposer
          key={selected.id}
          embedded
          patient={selected}
          store={store}
          operatori={operatori}
          showNext={false}
          onSave={() => void save()}
        />
      ) : (
        <p className="consegna-quick__hint">Scegli il paziente per scrivere la consegna.</p>
      )}
    </section>
  );
}
