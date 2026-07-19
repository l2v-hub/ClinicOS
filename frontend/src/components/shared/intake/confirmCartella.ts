// confirmCartella — pure mapper from the intake draft data to the confirmed
// cartella payload sent to POST /intake/drafts/:id/confirm.
// Extracted from IntakeWorkspace.handleConfirm (#265) so the draft→cartella
// mapping is unit-testable without mounting the wizard.

/** Draft data shape (top-level keys of PatientIntakeDraft.data). */
export type ConfirmDraftData = Record<string, unknown>;

export function buildConfirmCartella(data: ConfirmDraftData): Record<string, unknown> {
  const ingressoObj = (data.ingresso ?? {}) as Record<string, unknown>;
  const cartella: Record<string, unknown> = {
    statoRicovero: 'ricoverato',
    ...ingressoObj,
  };
  if (data.allergie !== undefined) cartella.allergie = data.allergie;
  // #265: the explicit allergy status chosen in the wizard (presenti/assenti/paziente_nega)
  // must persist — dropping it turns "verified absent" back into "undocumented".
  if (data.allergieStatus !== undefined) cartella.allergieStatus = data.allergieStatus;
  if (data.diagnosi !== undefined) cartella.diagnosi = data.diagnosi;
  if (data.anamnesi !== undefined) cartella.anamnesi = data.anamnesi;
  // Vitals: data.parametri is an OBJECT { parametriMensili?, parametriVitali? } (Task 5 shape)
  if (data.parametri != null) {
    const parametriObj = data.parametri as {
      parametriMensili?: unknown[];
      parametriVitali?: unknown[];
    };
    cartella.parametriMensili = parametriObj.parametriMensili ?? [];
    cartella.parametriVitali = parametriObj.parametriVitali ?? [];
  }
  // Pain assessments
  if (Array.isArray(data.dolore) && data.dolore.length) {
    cartella.valutazioniNRS = data.dolore;
  }
  // Carry imported therapy text (TherapyEditor intake mode is still a placeholder)
  // so it is persisted instead of dropped on confirm.
  if (typeof data._terapiaText === 'string' && data._terapiaText.trim()) {
    cartella.terapiaImportText = data._terapiaText;
  }
  return cartella;
}
