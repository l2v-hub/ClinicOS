import { useEffect, useState } from 'react';
import { API_URL } from '../../../config';
import { DocumentSourcePanel, type PatientDocMeta } from '../../shared/DocumentSourcePanel';

// REQ-035 v2: imported source documents permanently linked to the patient, shown in the
// Documenti tab. Files are served by the authenticated backend (not public URLs).
// #246 remediation: the backend now requires operator identity on every /documents call — list
// and "Apri" both carry X-Operator-Id/X-Operator-Role; "Apri" fetches the bytes as an
// authenticated blob (a plain <a href> cannot attach custom headers).

function fmtMB(b: number): string { return `${(b / (1024 * 1024)).toFixed(1)} MB`; }
function fmtDate(iso: string): string { try { return new Date(iso).toLocaleDateString('it-IT'); } catch { return iso; } }

interface Props {
  patientId: string;
  operatorId?: string;
  operatorRole?: string;
}

export function ImportedDocumentsList({ patientId, operatorId, operatorRole }: Props) {
  const [docs, setDocs] = useState<PatientDocMeta[]>([]);
  const [open, setOpen] = useState<{ fileName: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const headers: Record<string, string> = {};
    if (operatorId) headers['X-Operator-Id'] = operatorId;
    if (operatorRole) headers['X-Operator-Role'] = operatorRole;
    fetch(`${API_URL}/patients/${patientId}/documents`, { headers })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d) => { if (alive) setDocs(Array.isArray(d.documents) ? d.documents : []); })
      .catch(() => { /* none */ });
    return () => { alive = false; };
  }, [patientId, operatorId, operatorRole]);

  async function openDoc(d: PatientDocMeta) {
    try {
      const headers: Record<string, string> = {};
      if (operatorId) headers['X-Operator-Id'] = operatorId;
      if (operatorRole) headers['X-Operator-Role'] = operatorRole;
      const r = await fetch(`${API_URL}/patients/${patientId}/documents/${d.id}/content`, { headers });
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch { setErr('Apertura documento non riuscita'); }
  }

  if (docs.length === 0) return null;

  return (
    <section className="imported-docs" data-testid="imported-documents">
      <header className="srev-card__head">
        <h3>Documenti importati</h3>
        <span className="srev-area">Importazione lettera di dimissione</span>
      </header>
      {err && <p role="alert" className="cr-empty">{err}</p>}
      <ul className="imported-docs__list">
        {docs.map((d) => (
          <li key={d.id} className="imported-docs__item">
            <span className="imported-docs__icon" aria-hidden="true">{d.mimeType.includes('pdf') ? '📄' : '🖼️'}</span>
            <span className="imported-docs__name" title={d.originalName}>{d.originalName}</span>
            <span className="imported-docs__meta">{d.mimeType.split('/')[1]?.toUpperCase() || 'FILE'} · {fmtMB(d.sizeBytes)} · {fmtDate(d.createdAt)}</span>
            <span className="imported-docs__actions">
              <button className="srev-chip" onClick={() => setOpen({ fileName: d.originalName })}>Anteprima</button>
              <button className="srev-chip" onClick={() => openDoc(d)}>Apri</button>
            </span>
          </li>
        ))}
      </ul>
      {open && (
        <DocumentSourcePanel
          patientId={patientId}
          sourceTarget={{ fileName: open.fileName }}
          title="Documento importato"
          onClose={() => setOpen(null)}
          operatorId={operatorId}
          operatorRole={operatorRole}
        />
      )}
    </section>
  );
}
