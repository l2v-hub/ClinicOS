import { useId, useState } from 'react';
import type { Diagnosi } from '../../../types';
import type { SectionProps } from './types';
import { IcoEdit, IcoX } from '../../../icons';
import { DiagnosisText } from './DiagnosisText';
import './DiagnosisEditor.css';
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

function DescriptionField({ value, onChange, invalid }: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const id = useId();
  return (
    <div className="form-field diagnosis-description">
      <label className="form-label" htmlFor={id}>Descrizione *</label>
      <textarea
        id={id}
        className="form-input diagnosis-description__input"
        rows={8}
        required
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {invalid && <p id={`${id}-error`} className="diagnosis-error" role="alert">Inserisci la descrizione della diagnosi.</p>}
      {value.trim() && (
        <details className="diagnosis-preview">
          <summary>Anteprima formattata</summary>
          <DiagnosisText text={value} />
        </details>
      )}
    </div>
  );
}

function ItemRow({
  onEdit,
  onDelete,
  children,
  readOnly,
}: {
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
  readOnly?: boolean;
}) {
  return (
    <div className="cr-item-row diagnosis-item">
      <div className="cr-item-row__content">{children}</div>
      {!readOnly && <div className="cr-item-row__actions">
        <button className="icon-btn icon-btn--sm icon-btn--edit" onClick={onEdit} title="Modifica">
          <IcoEdit />
        </button>
        <button
          className="icon-btn icon-btn--sm icon-btn--danger"
          onClick={onDelete}
          title="Elimina"
        >
          <IcoX />
        </button>
      </div>}
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
  const [invalidDescription, setInvalidDescription] = useState(false);

  function saveDiagnosi(next: Diagnosi[]) {
    if (!readOnly) onChange(next);
  }

  function addDiagnosi() {
    if (!diagForm.descrizione?.trim()) { setInvalidDescription(true); return; }
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
    if (!diagForm.descrizione?.trim()) { setInvalidDescription(true); return; }
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
              setInvalidDescription(false);
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
            <DescriptionField
              value={diagForm.descrizione ?? ''}
              invalid={invalidDescription}
              onChange={(descrizione) => { setDiagForm((p) => ({ ...p, descrizione })); setInvalidDescription(false); }}
            />
            <div className="op-form-grid">
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
            <label className="form-field">
              <span className="form-label">Note aggiuntive (facoltative)</span>
              <textarea
                className="form-input"
                rows={2}
                value={diagForm.note ?? ''}
                onChange={(e) => setDiagForm((p) => ({ ...p, note: e.target.value }))}
              />
            </label>
          </InlineForm>
        )}
        <div className="cr-list">
          {list.length === 0 && <p className="cr-empty">Nessuna diagnosi registrata.</p>}
          {list.map((d) =>
            !readOnly && editDiagId === d.id ? (
              <InlineForm
                key={d.id}
                onSave={() => updateDiagnosi(d.id)}
                onCancel={() => {
                  setEditDiagId(null);
                  setDiagForm({});
                }}
              >
                <DescriptionField
                  value={diagForm.descrizione ?? ''}
                  invalid={invalidDescription}
                  onChange={(descrizione) => { setDiagForm((p) => ({ ...p, descrizione })); setInvalidDescription(false); }}
                />
                <div className="op-form-grid">
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
                <label className="form-field">
                  <span className="form-label">Note aggiuntive (facoltative)</span>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={diagForm.note ?? ''}
                    onChange={(e) => setDiagForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </label>
              </InlineForm>
            ) : (
              <ItemRow
                key={d.id}
                readOnly={readOnly}
                onEdit={() => {
                  setEditDiagId(d.id);
                  setDiagForm({ ...d });
                  setInvalidDescription(false);
                }}
                onDelete={() => deleteDiagnosi(d.id)}
              >
                <div className="cr-diag-row">
                  <div className="cr-diag-main">
                    {d.codiceICD && <span className="cr-mono cr-icd">{d.codiceICD}</span>}
                    <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.stato}</span>
                    <span className="badge badge--gray">{d.tipo}</span>
                  </div>
                  <DiagnosisText text={d.descrizione} />
                  {d.note && <div className="diagnosis-notes"><span className="form-label">Note aggiuntive</span><DiagnosisText text={d.note} /></div>}
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
