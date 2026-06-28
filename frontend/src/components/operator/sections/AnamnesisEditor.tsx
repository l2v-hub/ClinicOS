import { useState } from 'react';
import type { SectionProps } from './types';
import { nowISO, fmtDateTime, ClinicalTableSection } from '../cartella/shared';
import { IcoCheck } from '../../../icons';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { InlineEditableField } from '../../shared/InlineEditableField';

type ASection = { id: string; key: string; label: string; rows?: number; placeholder?: string };
const SECTIONS: ASection[] = [
  { id: 'patologicaProssima', key: 'patologicaProssima', label: 'Anamnesi generale',                        rows: 5, placeholder: 'Motivo del ricovero, storia recente della malattia…' },
  { id: 'patologicaRemota',   key: 'patologicaRemota',   label: 'Patologie note e interventi pregressi',    rows: 4, placeholder: 'Patologie croniche, interventi chirurgici, ricoveri precedenti…' },
  // BUG-054 (#92): "Anamnesi familiare" and "Contesto lavorativo e sociale" removed from intake.
  { id: 'fisiologica',        key: 'fisiologica',        label: 'Stato funzionale',                        rows: 3, placeholder: 'Condizioni basali, autonomia, funzioni vitali di base…' },
  { id: 'abitudini',          key: 'abitudini',          label: 'Abitudini e stile di vita',               rows: 3, placeholder: 'Fumo, alcol, attività fisica, alimentazione…' },
  { id: 'note',               key: 'note',               label: 'Note aggiuntive',                         rows: 3, placeholder: 'Informazioni aggiuntive non categorizzate…' },
];

export function AnamnesisEditor({ value, onChange, readOnly, operatoreNome }: SectionProps<Record<string, unknown>>) {
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  function startCardEdit(cardId: string) {
    setDraft({ ...value });
    setEditingCard(cardId);
  }

  function saveCard() {
    onChange({ ...draft, updatedAt: nowISO(), operatore: operatoreNome ?? '' });
    setEditingCard(null);
  }

  function cancelCard() {
    setEditingCard(null);
  }

  // NOTE: The original renderAnamnesi() used `cartella.allergie` to render an allergie
  // read-only card. This data is NOT in `value` (which is just cartella.anamnesi).
  // OMIT the allergie ClinicalCard entirely — it is already rendered by AllergiesEditor
  // and is not part of `anamnesi` data.

  // Global fallback actions (legacy FR-008 comment retained):
  const anamnesiActions = (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* no global edit button: each card has its own Modifica via onEdit */}
    </div>
  );

  return (
    <div className="cr-tab-content">
      <ClinicalTableSection title="Anamnesi" actions={anamnesiActions}>
        <div className="cts__body--padded">
          {/* Sezioni anamnesi modificabili — ognuna in una ClinicalCard */}
          {SECTIONS.map(({ id, key, label, rows = 4, placeholder }) => {
            const val = String(value[key] ?? '');
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
                      onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder ?? `Inserire ${label.toLowerCase()}…`}
                    />
                    <div className="cr-form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className="btn-secondary btn-sm" onClick={cancelCard}>Annulla</button>
                      <button className="btn-primary btn-sm" onClick={saveCard}><IcoCheck /> Salva</button>
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
                    onSave={v => onChange({ ...value, [key]: v, updatedAt: nowISO(), operatore: operatoreNome ?? '' })}
                  />
                )}
              </ClinicalCard>
            );
          })}

          {value.updatedAt && !editingCard && (
            <p className="cr-update-info">Aggiornato: {fmtDateTime(String(value.updatedAt))} — {String(value.operatore ?? '')}</p>
          )}
        </div>
      </ClinicalTableSection>
    </div>
  );
}
