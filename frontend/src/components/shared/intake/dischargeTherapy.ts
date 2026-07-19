// #156: shared types + mapping for therapies detected in a discharge letter (draft.data.terapiaImport).
// The backend parser (parse-discharge-therapy.ts) produces these rows; the intake review table edits
// them; on confirm they are mapped to the same TherapyCreateInput shape the manual editor sends.

export interface DischargeTherapyRow {
  farmacoNome: string;
  forma: string;
  dosaggio: string;
  viaSomministrazione: string;
  quantita: string;
  orari: string[];
  giorni: string[];
  dataInizio: string;
  classe: string;
  note: string;
  originalText: string;
  stato: 'ok' | 'da_verificare';
}

const VIA_MAP: Record<string, string> = {
  OS: 'orale',
  IM: 'intramuscolo',
  EV: 'endovena',
  SC: 'sottocute',
  SL: 'sublinguale',
  TD: 'transdermica',
  INAL: 'inalatoria',
  TOP: 'topica',
  RETT: 'rettale',
  OFT: 'oftalmica',
  OTO: 'otologica',
  NAS: 'nasale',
  VAG: 'vaginale',
};

function mapVia(v: string): string {
  return VIA_MAP[(v || '').toUpperCase()] ?? 'orale';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Map one detected discharge-therapy row → TherapyCreateInput-compatible object for confirmDraft.
 *  orari → schedules; forma → pharmaceuticalForm; classe/giorni/quantità/originalText/verify-flag
 *  are preserved in `note` (the schema has no weekday field). dataInizio falls back to today. */
export function dischargeRowToTherapyInput(
  r: DischargeTherapyRow,
  operatoreNome?: string,
): Record<string, unknown> {
  const orari = Array.isArray(r.orari) ? r.orari.filter((t) => /^\d{1,2}:\d{2}$/.test(t)) : [];
  const giorni = Array.isArray(r.giorni) ? r.giorni : [];
  const note = [
    r.note?.trim() || '',
    r.classe ? `Classe ${r.classe}` : '',
    giorni.length ? `Giorni: ${giorni.join(' ')}` : '',
    r.quantita ? `Quantità: ${r.quantita}` : '',
    r.stato === 'da_verificare' ? '[DA VERIFICARE]' : '',
    r.originalText ? `Origine: ${r.originalText}` : '',
  ]
    .filter(Boolean)
    .join(' — ');
  return {
    farmacoNome: (r.farmacoNome || '').trim(),
    dataInizio: r.dataInizio && r.dataInizio.trim() ? r.dataInizio : todayIso(),
    viaSomministrazione: mapVia(r.viaSomministrazione),
    tipo: 'periodica',
    stato: 'attiva',
    ...(r.forma ? { pharmaceuticalForm: r.forma } : {}),
    allowedFractions: '1',
    schedules: orari.map((time) => ({
      time,
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: '',
    })),
    ...(operatoreNome ? { operatoreInseritore: operatoreNome } : {}),
    ...(note ? { note } : {}),
  };
}
