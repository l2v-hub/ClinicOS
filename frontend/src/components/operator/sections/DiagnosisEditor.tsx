import { useState } from 'react';
import type { Diagnosi } from '../../../types';
import type { SectionProps } from './types';
import { IcoEdit, IcoX } from '../../../icons';
import {
  uid,
  todayStr,
  nowISO,
  fmtDate,
  ClinicalTableSection,
  InlineForm,
} from '../cartella/shared';

const STATO_DIAG_CLASS: Record<string, string> = {
  attiva: 'badge--blue',
  risolta: 'badge--green',
  monitoraggio: 'badge--amber',
  sospetta: 'badge--gray',
};

function ItemRow({
  onEdit,
  onDelete,
  children,
}: {
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="cr-item-row">
      <div className="cr-item-row__content">{children}</div>
      <div className="cr-item-row__actions">
        <button className="icon-btn icon-btn--sm" onClick={onEdit} title="Modifica">
          <IcoEdit />
        </button>
        <button
          className="icon-btn icon-btn--sm icon-btn--danger"
          onClick={onDelete}
          title="Elimina"
        >
          <IcoX />
        </button>
      </div>
    </div>
  );
}

export function DiagnosisEditor({
  value,
  onChange,
  readOnly,
  operatoreNome,
}: SectionProps<Diagnosi[]>) {
  const list = value ?? [];

  const [showAddDiag, setShowAddDiag] = useState(false);
  const [editDiagId, setEditDiagId] = useState<string | null>(null);
  const [diagForm, setDiagForm] = useState<Partial<Diagnosi>>({});

  function saveDiagnosi(next: Diagnosi[]) {
    onChange(next);
  }

  function addDiagnosi() {
    if (!diagForm.descrizione) return;
    saveDiagnosi([
      {
        id: uid(),
        descrizione: '',
        tipo: 'principale',
        stato: 'attiva',
        dataInsorgenza: todayStr(),
        operatore: operatoreNome ?? '',
        note: '',
        createdAt: nowISO(),
        ...diagForm,
      } as Diagnosi,
      ...list,
    ]);
    setShowAddDiag(false);
    setDiagForm({});
  }

  function updateDiagnosi(id: string) {
    saveDiagnosi(list.map((d) => (d.id === id ? { ...d, ...diagForm } : d)));
    setEditDiagId(null);
    setDiagForm({});
  }

  function deleteDiagnosi(id: string) {
    saveDiagnosi(list.filter((d) => d.id !== id));
  }

  return (
    <ClinicalTableSection
      title="Diagnosi / Lista Problemi"
      count={list.length}
      countLabel="diagnosi"
      actions={
        !readOnly ? (
          <button
            className="btn-sm"
            onClick={() => {
              setDiagForm({});
              setShowAddDiag(true);
            }}
          >
            + Aggiungi
          </button>
        ) : undefined
      }
    >
      <div className="cts__body--padded">
        {!readOnly && showAddDiag && (
          <InlineForm
            onSave={addDiagnosi}
            onCancel={() => {
              setShowAddDiag(false);
              setDiagForm({});
            }}
          >
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Descrizione *</label>
                <input
                  className="form-input"
                  value={diagForm.descrizione ?? ''}
                  onChange={(e) => setDiagForm((p) => ({ ...p, descrizione: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Codice ICD</label>
                <input
                  className="form-input"
                  value={diagForm.codiceICD ?? ''}
                  placeholder="I10, E11…"
                  onChange={(e) => setDiagForm((p) => ({ ...p, codiceICD: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={diagForm.tipo ?? 'principale'}
                  onChange={(e) =>
                    setDiagForm((p) => ({ ...p, tipo: e.target.value as Diagnosi['tipo'] }))
                  }
                >
                  <option value="principale">Principale</option>
                  <option value="secondaria">Secondaria</option>
                  <option value="comorbidita">Comorbidità</option>
                  <option value="differenziale">Differenziale</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Stato</label>
                <select
                  className="form-select"
                  value={diagForm.stato ?? 'attiva'}
                  onChange={(e) =>
                    setDiagForm((p) => ({ ...p, stato: e.target.value as Diagnosi['stato'] }))
                  }
                >
                  <option value="attiva">Attiva</option>
                  <option value="monitoraggio">Monitoraggio</option>
                  <option value="sospetta">Sospetta</option>
                  <option value="risolta">Risolta</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Data insorgenza</label>
                <input
                  className="form-input"
                  type="date"
                  value={diagForm.dataInsorgenza ?? todayStr()}
                  onChange={(e) => setDiagForm((p) => ({ ...p, dataInsorgenza: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 8 }}>
              <label className="form-label">Note</label>
              <textarea
                className="form-input"
                rows={2}
                value={diagForm.note ?? ''}
                onChange={(e) => setDiagForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
          </InlineForm>
        )}
        <div className="cr-list">
          {list.length === 0 && <p className="cr-empty">Nessuna diagnosi registrata.</p>}
          {list.map((d) =>
            editDiagId === d.id ? (
              <InlineForm
                key={d.id}
                onSave={() => updateDiagnosi(d.id)}
                onCancel={() => {
                  setEditDiagId(null);
                  setDiagForm({});
                }}
              >
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Descrizione</label>
                    <input
                      className="form-input"
                      value={diagForm.descrizione ?? ''}
                      onChange={(e) => setDiagForm((p) => ({ ...p, descrizione: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Codice ICD</label>
                    <input
                      className="form-input"
                      value={diagForm.codiceICD ?? ''}
                      onChange={(e) => setDiagForm((p) => ({ ...p, codiceICD: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={diagForm.tipo ?? d.tipo}
                      onChange={(e) =>
                        setDiagForm((p) => ({ ...p, tipo: e.target.value as Diagnosi['tipo'] }))
                      }
                    >
                      <option value="principale">Principale</option>
                      <option value="secondaria">Secondaria</option>
                      <option value="comorbidita">Comorbidità</option>
                      <option value="differenziale">Differenziale</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Stato</label>
                    <select
                      className="form-select"
                      value={diagForm.stato ?? d.stato}
                      onChange={(e) =>
                        setDiagForm((p) => ({ ...p, stato: e.target.value as Diagnosi['stato'] }))
                      }
                    >
                      <option value="attiva">Attiva</option>
                      <option value="monitoraggio">Monitoraggio</option>
                      <option value="sospetta">Sospetta</option>
                      <option value="risolta">Risolta</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Data risoluzione</label>
                    <input
                      className="form-input"
                      type="date"
                      value={diagForm.dataRisoluzione ?? ''}
                      onChange={(e) =>
                        setDiagForm((p) => ({ ...p, dataRisoluzione: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Note</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={diagForm.note ?? ''}
                    onChange={(e) => setDiagForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>
              </InlineForm>
            ) : (
              <ItemRow
                key={d.id}
                onEdit={() => {
                  setEditDiagId(d.id);
                  setDiagForm({ ...d });
                }}
                onDelete={() => deleteDiagnosi(d.id)}
              >
                <div className="cr-diag-row">
                  <div className="cr-diag-main">
                    <span className="cr-diag-desc">{d.descrizione}</span>
                    {d.codiceICD && <span className="cr-mono cr-icd">{d.codiceICD}</span>}
                    <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.stato}</span>
                    <span className="badge badge--gray">{d.tipo}</span>
                  </div>
                  {d.note && <p className="cr-diag-note">{d.note}</p>}
                  <span className="cr-diag-meta">
                    {fmtDate(d.dataInsorgenza)} · {d.operatore}
                    {d.dataRisoluzione ? ` → risolta ${fmtDate(d.dataRisoluzione)}` : ''}
                  </span>
                </div>
              </ItemRow>
            ),
          )}
        </div>
      </div>
    </ClinicalTableSection>
  );
}
