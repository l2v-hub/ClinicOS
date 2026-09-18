import { useState } from 'react';
import type { SectionProps } from './types';
import type { AllergiaItem } from '../../../types';
import { nowISO, fmtDateTime, ClinicalTableSection } from '../cartella/shared';
import { IcoCheck } from '../../../icons';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { InlineEditableField } from '../../shared/InlineEditableField';
import { legacyPastHistoryProposal, previousClinicalText } from '../../../lib/clinicalHistory';

type ASection = { id: string; key: string; label: string; rows?: number; placeholder?: string };
const SECTIONS: ASection[] = [
  {
    id: 'patologicaRemota',
    key: 'patologicaRemota',
    label: 'Patologie note e interventi pregressi',
    rows: 4,
    placeholder: 'Patologie croniche, interventi chirurgici, ricoveri precedenti…',
  },
  {
    id: 'note',
    key: 'note',
    label: 'Note aggiuntive',
    rows: 3,
    placeholder: 'Informazioni aggiuntive non categorizzate…',
  },
];

type AnamnesisEditorProps = SectionProps<Record<string, unknown>> & { allergie?: AllergiaItem[] };

export function AnamnesisEditor({
  value,
  onChange,
  readOnly,
  operatoreNome,
  allergie = [],
}: AnamnesisEditorProps) {
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  // I draft intake possono non avere la chiave anamnesi (manuale: sempre; import: quando il
  // documento non contiene anamnesi) — l'editor deve tollerare value assente (#127).
  const anamnesi = value ?? {};
  const previous = previousClinicalText(anamnesi);
  const historyProposal = legacyPastHistoryProposal(anamnesi);

  function startCardEdit(cardId: string) {
    setDraft({ ...anamnesi });
    setEditingCard(cardId);
  }

  function saveCard() {
    onChange({ ...draft, updatedAt: nowISO(), operatore: operatoreNome ?? '' });
    setEditingCard(null);
  }

  function cancelCard() {
    setEditingCard(null);
  }

  const hasAllergie = allergie.length > 0;
  const allergieGravi = allergie.filter((al) => al.gravita === 'grave');

  return (
    <div className="cr-tab-content">
      <ClinicalTableSection title="Anamnesi">
        <div className="cts__body--padded">
          {/* Allergie — read-only ClinicalCard (no onEdit: allergies are managed via the dedicated modal flow elsewhere in the app, not inline) */}
          <ClinicalCard title="Allergie" defaultExpanded={true}>
            <div
              className={
                hasAllergie
                  ? allergieGravi.length > 0
                    ? 'cr-anamnesi-card cr-anamnesi-card--allergie-grave'
                    : 'cr-anamnesi-card cr-anamnesi-card--allergie'
                  : 'cr-anamnesi-card'
              }
            >
              {hasAllergie ? (
                <div className="cr-anamnesi-allergie-list">
                  {allergie.map((al, i) => (
                    <div key={i} className="cr-anamnesi-allergia">
                      <span className="cr-anamnesi-allergia__nome">{al.allergene}</span>
                      {al.reazione && (
                        <span className="cr-anamnesi-allergia__reazione">{al.reazione}</span>
                      )}
                      <span
                        className={`badge ${al.gravita === 'grave' ? 'badge--red' : al.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}
                      >
                        {al.gravita}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cr-anamnesi-card__text muted">
                  Nessuna allergia registrata. Gestisci dal tab Diagnosi.
                </p>
              )}
            </div>
          </ClinicalCard>

          {/* Sezioni anamnesi modificabili — ognuna in una ClinicalCard */}
          {SECTIONS.map(({ id, key, label, rows = 4, placeholder }) => {
            const val = String(anamnesi[key] ?? '');
            const isEditing = editingCard === id;
            return (
              <ClinicalCard
                key={id}
                title={label}
                defaultExpanded={true}
                onEdit={readOnly ? undefined : () => startCardEdit(id)}
              >
                {isEditing ? (
                  <>
                    <textarea
                      className="form-input cr-anamnesi-card__textarea"
                      rows={rows}
                      value={String(draft[key] ?? '')}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder ?? `Inserire ${label.toLowerCase()}…`}
                    />
                    <div
                      className="cr-form-actions"
                      style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}
                    >
                      <button className="btn-secondary btn-sm" onClick={cancelCard}>
                        Annulla
                      </button>
                      <button className="btn-success btn-sm" onClick={saveCard}>
                        <IcoCheck /> Salva
                      </button>
                    </div>
                  </>
                ) : (
                  <InlineEditableField
                    variant="block"
                    label={label}
                    type="textarea"
                    value={val}
                    emptyText="Non compilato"
                    placeholder={placeholder ?? `Inserire ${label.toLowerCase()}…`}
                    disabled={!!readOnly}
                    onSave={(v) =>
                      onChange({
                        ...anamnesi,
                        [key]: v,
                        updatedAt: nowISO(),
                        operatore: operatoreNome ?? '',
                      })
                    }
                  />
                )}
                {key === 'patologicaRemota' && historyProposal && !isEditing && (
                  <details className="cr-legacy-anamnesi-row">
                    <summary>Estratto dalla fonte da verificare</summary>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{historyProposal}</p>
                    {!readOnly && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setDraft({ ...anamnesi, patologicaRemota: historyProposal });
                          setEditingCard('patologicaRemota');
                        }}
                      >
                        Rivedi e salva nelle patologie pregresse
                      </button>
                    )}
                  </details>
                )}
              </ClinicalCard>
            );
          })}

          {previous.length > 0 && (
            <details className="cr-legacy-anamnesi-row" data-testid="previous-clinical-text">
              <summary>Testo clinico precedente e fonte</summary>
              {previous.map(({ label, value: text }) => (
                <div key={label}>
                  <strong>{label}</strong>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
                </div>
              ))}
            </details>
          )}

          {!!anamnesi.updatedAt && !editingCard && (
            <p className="cr-update-info">
              Aggiornato: {fmtDateTime(String(anamnesi.updatedAt))} —{' '}
              {String(anamnesi.operatore ?? '')}
            </p>
          )}
        </div>
      </ClinicalTableSection>
    </div>
  );
}
