// Diario terapia (PR 2): collegamento voce → terapia nella card del diario. Modulo leggero (nessun
// componente del form Terapia), cosi' il diario non carica il pannello finche' non serve.

/** Riferimento alla terapia collegata esposto dal read model del diario. */
export interface DiaryEntryTherapyRef {
  id: string;
  farmacoNome: string;
  stato: string;
}

export const THERAPY_STATO_LABELS: Record<string, string> = {
  attiva: 'Attiva',
  sospesa: 'Sospesa',
  conclusa: 'Conclusa',
};

export function therapyStatoTone(stato: string): string {
  if (stato === 'attiva') return 'ds-badge--ok';
  if (stato === 'sospesa') return 'ds-badge--warning';
  return '';
}

/** Stato del collegamento di una voce: terapia presente, cancellata o nessuna. */
export function linkedTherapyState(entry: {
  therapy?: DiaryEntryTherapyRef | null;
  therapyId?: string | null;
  category?: string | null;
}): 'linked' | 'removed' | 'none' {
  if (entry.therapy && entry.therapy.id) return 'linked';
  // Il read model azzera il riferimento quando la terapia viene cancellata; la voce creata con la
  // terapia resta riconoscibile dalla categoria 'terapia'.
  if (entry.therapyId || entry.category === 'terapia') return 'removed';
  return 'none';
}
