import { useState } from 'react';
import type { CartellaPaziente, Paziente } from '../../../types';
import { legacyTinetti, legacyTinettiText } from '../../../lib/assessments/tinettiLegacy';
import { TINETTI_GROUPS } from '../../../lib/assessments/tinettiDefinition';
import { PatientIdentity } from '../../shared/PatientIdentity';
import '../assessments/Tinetti.css';

export function LegacyTinettiDetail({ record, paziente }: { record: unknown; paziente: Paziente }) {
  const view = legacyTinetti(record);
  const source = view.source;
  return (
    <article>
      <h3>Tinetti · storico precedente</h3>
      <PatientIdentity patient={paziente} />
      <dl className="assessment-metadata">
        <div>
          <dt>ID originale</dt>
          <dd>{legacyTinettiText(source.id)}</dd>
        </div>
        <div>
          <dt>Data riportata</dt>
          <dd>{legacyTinettiText(source.data)}</dd>
        </div>
        <div>
          <dt>Registrazione riportata</dt>
          <dd>{legacyTinettiText(source.createdAt)}</dd>
        </div>
        <div>
          <dt>Operatore riportato</dt>
          <dd>{legacyTinettiText(source.operatore)}</dd>
        </div>
      </dl>
      <p className="assessment-hint">
        Scheda precedente al modulo versionato. Operatore e date sono quelli registrati nel
        documento; non attestano una finalizzazione o un autore autenticato. L’identità mostrata è
        quella attuale della cartella.
      </p>
      {!view.complete && (
        <p role="status">
          Scheda incompleta o con dati non validi: nessun risultato o fascia di rischio.
        </p>
      )}
      {TINETTI_GROUPS.map((group) => (
        <section key={group.id}>
          <h4>{group.label}</h4>
          <table>
            <thead>
              <tr>
                <th scope="col">Voce</th>
                <th scope="col">Risposta registrata</th>
              </tr>
            </thead>
            <tbody>
              {view.items
                .filter((item) => item.group === group.id)
                .map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.label}</th>
                    <td>
                      {legacyTinettiText(item.raw)} · {item.description}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
      {view.result && (
        <p className="assessment-result">
          Equilibrio {view.result.balance}/16 · Andatura {view.result.gait}/12 ·{' '}
          <strong>
            {view.result.total}/28 · {view.result.label}
          </strong>
        </p>
      )}
      <h4>Note riportate</h4>
      <p className="tinetti-note-text">{legacyTinettiText(source.note)}</p>
    </article>
  );
}
export function ScalaTinettiTab({
  cartella,
  paziente,
}: {
  cartella: CartellaPaziente;
  paziente: Paziente;
}) {
  const branch: unknown = cartella.valutazioniTinetti;
  const list: unknown[] = Array.isArray(branch) ? branch : [];
  const [printIndex, setPrintIndex] = useState<number | null>(null);
  return (
    <section
      className="tinetti-legacy"
      aria-label="Storico Tinetti precedente"
      data-print-id={printIndex ?? undefined}
    >
      <h3>Storico precedente · sola lettura</h3>
      <p>
        Le nuove valutazioni si compilano nel modulo versionato sopra. Le schede precedenti restano
        disponibili per dettaglio e stampa.
      </p>
      {!list.length && (
        <p>
          {branch != null && !Array.isArray(branch)
            ? 'Dati dello storico non validi. Il contenuto originale è conservato.'
            : 'Nessuna scheda precedente.'}
        </p>
      )}
      {list.map((record, index) => {
        const view = legacyTinetti(record);
        return (
          <details key={index} data-print-selected={printIndex === index || undefined}>
            <summary>
              {legacyTinettiText(view.source.data)} · {legacyTinettiText(view.source.operatore)} ·{' '}
              {view.result
                ? `${view.result.total}/28 · ${view.result.label}`
                : 'Incompleta o dati non validi'}
            </summary>
            <button
              type="button"
              className="btn-secondary no-print"
              onClick={() => {
                setPrintIndex(index);
                window.setTimeout(() => {
                  window.print();
                  setPrintIndex(null);
                }, 0);
              }}
            >
              Stampa scheda precedente
            </button>
            <LegacyTinettiDetail record={record} paziente={paziente} />
          </details>
        );
      })}
    </section>
  );
}
