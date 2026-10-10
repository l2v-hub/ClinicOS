import type { DischargeTherapyRow } from './dischargeTherapy';
import './TherapyImportSource.css';

export type TherapyImportEvidence = Pick<
  DischargeTherapyRow,
  'originalText' | 'sourceKind' | 'structuredSource'
>;

/** React-escaped evidence; extraction objects are never presented as verbatim document text. */
export function TherapyImportSource({ row }: { row: TherapyImportEvidence }) {
  return (
    <>
      {row.originalText && (
        <blockquote
          className="discharge-therapy-review__original"
          data-testid="discharge-original-text"
        >
          <span className="discharge-therapy-review__original-label">Dal documento:</span>{' '}
          {row.originalText}
        </blockquote>
      )}
      {row.structuredSource !== undefined && (
        <div
          className="discharge-therapy-review__original therapy-import-source"
          data-testid="structured-therapy-source"
        >
          <strong>Dati estratti automaticamente — confronta il documento</strong>
          <p>
            Questa voce può coincidere con una riga già rilevata. Verifica farmaco, dose, frequenza
            e stato; lascia in bozza i duplicati o i dati non confermati.
          </p>
          <pre>{JSON.stringify(row.structuredSource, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
