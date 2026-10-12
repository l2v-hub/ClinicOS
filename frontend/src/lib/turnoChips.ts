// Chip d'azione in cima al Turno (#445): solo ciò su cui si agisce, mai contatori a zero.
export interface TurnoActionChip {
  id: string;
  label: string;
  tone: 'crit' | 'warn' | 'muted';
  onOpen?: () => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface TurnoChipInput {
  urgentToTakeCharge: number | undefined;
  urgentState: 'loading' | 'ready' | 'error';
  critici: number;
  clinicalState: 'loading' | 'ready' | 'error';
  /** Pazienti con farmaci fuori anagrafica e quanti farmaci in tutto. */
  anomalie: { pazienti: number; farmaci: number; fallito: boolean };
  onOpenUrgent: () => void;
  onOpenCritici: () => void;
  onRetryClinical: () => void;
  onOpenAnomalie: () => void;
}

export function buildTurnoChips(input: TurnoChipInput): TurnoActionChip[] {
  const chips: TurnoActionChip[] = [];
  if (input.urgentState === 'error')
    chips.push({ id: 'urgenze', label: 'Urgenze non disponibili', tone: 'warn' });
  else if ((input.urgentToTakeCharge ?? 0) > 0)
    chips.push({
      id: 'urgenze',
      label: `${plural(input.urgentToTakeCharge ?? 0, 'urgenza', 'urgenze')} da prendere in carico`,
      tone: 'crit',
      onOpen: input.onOpenUrgent,
    });
  if (input.clinicalState === 'error')
    chips.push({
      id: 'parametri',
      label: 'Parametri critici non disponibili · Riprova',
      tone: 'warn',
      onOpen: input.onRetryClinical,
    });
  else if (input.clinicalState === 'ready' && input.critici > 0)
    chips.push({
      id: 'parametri',
      label: plural(input.critici, 'parametro critico', 'parametri critici'),
      tone: 'crit',
      onOpen: input.onOpenCritici,
    });
  if (input.anomalie.fallito)
    chips.push({ id: 'farmaci', label: 'Verifica farmaci non riuscita', tone: 'warn' });
  else if (input.anomalie.farmaci > 0)
    chips.push({
      id: 'farmaci',
      label: `${plural(input.anomalie.farmaci, 'farmaco', 'farmaci')} da far verificare al medico`,
      tone: 'warn',
      onOpen: input.onOpenAnomalie,
    });
  return chips;
}
