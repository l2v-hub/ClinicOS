// #156: "Terapie rilevate dalla lettera di dimissioni" — editable review table of the therapy rows
// parsed from the discharge letter (draft.data.terapiaImport). ONE row per drug; incomplete rows are
// flagged "da verificare" (never dropped); the operator edits before the therapy is saved on confirm.

import { useCallback } from 'react';
import type { DischargeTherapyRow } from './dischargeTherapy';

interface Props {
  rows: DischargeTherapyRow[];
  onChange: (rows: DischargeTherapyRow[]) => void;
}

export function DischargeTherapyReview({ rows, onChange }: Props) {
  const update = useCallback(
    (i: number, patch: Partial<DischargeTherapyRow>) => {
      onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    },
    [rows, onChange],
  );

  if (!Array.isArray(rows) || rows.length === 0) return null;
  const daVerificare = rows.filter((r) => r.stato === 'da_verificare').length;

  return (
    <section
      className="discharge-therapy-review"
      data-testid="discharge-therapy-review"
      aria-label="Terapie rilevate dalla lettera di dimissioni"
    >
      <div className="discharge-therapy-review__title">
        Terapie rilevate dalla lettera di dimissioni
      </div>
      {daVerificare > 0 && (
        <p
          className="discharge-therapy-review__alert"
          role="alert"
          data-testid="discharge-therapy-alert"
        >
          {daVerificare} {daVerificare > 1 ? 'righe' : 'riga'} da verificare: dati incompleti,
          controlla prima di salvare.
        </p>
      )}
      <div className="discharge-therapy-review__scroll" style={{ overflowX: 'auto' }}>
        <table className="discharge-therapy-review__table">
          <thead>
            <tr>
              <th>Farmaco</th>
              <th>Dosaggio</th>
              <th>Via</th>
              <th>Quantità</th>
              <th>Orari</th>
              <th>Giorni</th>
              <th>Data inizio</th>
              <th>Classe</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                data-testid="discharge-therapy-row"
                data-stato={r.stato}
                data-farmaco={r.farmacoNome}
                className={r.stato === 'da_verificare' ? 'is-da-verificare' : ''}
              >
                <td>
                  <input
                    aria-label="Farmaco"
                    value={r.farmacoNome}
                    onChange={(e) => update(i, { farmacoNome: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label="Dosaggio"
                    value={r.dosaggio}
                    onChange={(e) => update(i, { dosaggio: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label="Via"
                    value={r.viaSomministrazione}
                    onChange={(e) => update(i, { viaSomministrazione: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label="Quantità"
                    value={r.quantita}
                    onChange={(e) => update(i, { quantita: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label="Orari"
                    value={r.orari.join(', ')}
                    onChange={(e) =>
                      update(i, {
                        orari: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label="Giorni"
                    value={r.giorni.join(' ')}
                    onChange={(e) =>
                      update(i, { giorni: e.target.value.split(/\s+/).filter(Boolean) })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label="Data inizio"
                    value={r.dataInizio}
                    onChange={(e) => update(i, { dataInizio: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label="Classe"
                    value={r.classe}
                    onChange={(e) => update(i, { classe: e.target.value })}
                  />
                </td>
                <td>
                  {r.stato === 'da_verificare' ? (
                    <span className="discharge-therapy-review__badge is-verify">da verificare</span>
                  ) : (
                    <span className="discharge-therapy-review__badge is-ok">ok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="discharge-therapy-review__hint">
        Le righe verranno salvate nella terapia del paziente alla conferma.
      </p>
    </section>
  );
}
