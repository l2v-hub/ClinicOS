import type { Anamnesi } from '../../../types';
import { hasLegacyAnamnesis, legacyAnamnesisRows } from '../../../lib/legacyAnamnesis';
import { ClinicalTableSection, fmtDateTime } from '../cartella/shared';

// Issue #245 remediation — read-only view of pre-existing structured anamnesi data
// (Cartella.data.anamnesi) so it stays reachable after the duplicate editable "Anamnesi"
// chart tab was removed (dedup vs "Sezioni Cliniche (testo)"). Renders nothing when the
// legacy object has no populated field — no dead panel for patients intaken after the change.

export function LegacyAnamnesisView({
  anamnesi,
}: {
  anamnesi: Partial<Anamnesi> | null | undefined;
}) {
  if (!hasLegacyAnamnesis(anamnesi)) return null;

  const rows = legacyAnamnesisRows(anamnesi);

  return (
    <ClinicalTableSection title="Anamnesi (dati strutturati — sola lettura)" defaultOpen={true}>
      <div className="cts__body--padded" data-testid="legacy-anamnesis">
        {rows.map(({ label, value }) => (
          <div key={label} className="cr-legacy-anamnesi-row">
            <span className="cr-legacy-anamnesi-row__label">{label}</span>
            <p className="cr-legacy-anamnesi-row__value">{value}</p>
          </div>
        ))}
        {!!anamnesi?.updatedAt && (
          <p className="cr-update-info">
            Compilata in presa in carico: {fmtDateTime(String(anamnesi.updatedAt))}
            {anamnesi.operatore ? ` — ${anamnesi.operatore}` : ''}
          </p>
        )}
        <p className="cr-legacy-anamnesi-note">
          Compilata in presa in carico; per aggiornamenti usare le Sezioni Cliniche (testo).
        </p>
      </div>
    </ClinicalTableSection>
  );
}
