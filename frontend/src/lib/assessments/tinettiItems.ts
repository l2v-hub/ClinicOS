import type { TinettiItemId } from './tinettiTypes';
export interface TinettiItem {
  id: TinettiItemId;
  label: string;
  group: 'balance' | 'gait';
  options: readonly string[];
}
export const TINETTI_ITEMS: readonly TinettiItem[] = [
  {
    id: 'equilibrioSeduto',
    label: 'Equilibrio seduto',
    group: 'balance',
    options: ['Instabile', 'Stabile, sicuro'],
  },
  {
    id: 'alzarsi',
    label: 'Alzarsi dalla sedia',
    group: 'balance',
    options: [
      'Incapace senza aiuto',
      'Capace, usa braccia / non sicuro',
      'Capace, senza usare le braccia',
    ],
  },
  {
    id: 'tentativiAlzarsi',
    label: 'Tentativi per alzarsi',
    group: 'balance',
    options: ['Incapace', 'Richiede > 1 tentativo', 'Riesce al 1° tentativo'],
  },
  {
    id: 'equilibrioImmediato',
    label: 'Equilibrio in piedi (primi 5 s)',
    group: 'balance',
    options: [
      'Instabile (vacilla, sposta i piedi)',
      'Stabile con appoggio',
      'Stabile senza appoggio',
    ],
  },
  {
    id: 'equilibrioProlungato',
    label: 'Equilibrio prolungato',
    group: 'balance',
    options: ['Instabile', 'Base allargata o appoggio', 'Stabile senza appoggio, base stretta'],
  },
  {
    id: 'rombergSpinta',
    label: 'Romberg con spinta sternale',
    group: 'balance',
    options: ['Cade', 'Vacilla, si aggrappa', 'Stabile'],
  },
  {
    id: 'occhiChiusi',
    label: 'Equilibrio occhi chiusi',
    group: 'balance',
    options: ['Instabile', 'Stabile'],
  },
  {
    id: 'girarsi360Passi',
    label: 'Girarsi 360° — continuità dei passi',
    group: 'balance',
    options: ['Passi discontinui', 'Passi continui'],
  },
  {
    id: 'girarsi360Stabilita',
    label: 'Girarsi 360° — stabilità',
    group: 'balance',
    options: ['Instabile (si aggrappa)', 'Stabile'],
  },
  {
    id: 'sedersi',
    label: 'Sedersi',
    group: 'balance',
    options: [
      'Insicuro (caduta nella sedia)',
      'Usa le braccia o movimenti bruschi',
      'Sicuro, movimenti fluidi',
    ],
  },
  {
    id: 'iniziazione',
    label: 'Inizio della deambulazione',
    group: 'gait',
    options: ['Esitazione / passi multipli', 'Nessuna esitazione'],
  },
  {
    id: 'lunghezzaPassoDx',
    label: 'Lunghezza passo destro',
    group: 'gait',
    options: ['Piede dx non supera il sx', 'Piede dx supera il sx'],
  },
  {
    id: 'altezzaPassoDx',
    label: 'Altezza passo destro',
    group: 'gait',
    options: ['Piede dx striscia', 'Piede dx si solleva'],
  },
  {
    id: 'lunghezzaPassoSx',
    label: 'Lunghezza passo sinistro',
    group: 'gait',
    options: ['Piede sx non supera il dx', 'Piede sx supera il dx'],
  },
  {
    id: 'altezzaPassoSx',
    label: 'Altezza passo sinistro',
    group: 'gait',
    options: ['Piede sx striscia', 'Piede sx si solleva'],
  },
  {
    id: 'simmetria',
    label: 'Simmetria del passo',
    group: 'gait',
    options: ['Asimmetrico', 'Simmetrico'],
  },
  {
    id: 'continuita',
    label: 'Continuità del passo',
    group: 'gait',
    options: ['Interruzioni / fermate', 'Continuo'],
  },
  {
    id: 'traiettoria',
    label: 'Traiettoria',
    group: 'gait',
    options: ['Deviazione marcata', 'Deviazione lieve / usa ausilio', 'Rettilinea senza ausilio'],
  },
  {
    id: 'tronco',
    label: 'Stabilità del tronco',
    group: 'gait',
    options: [
      'Oscillazione marcata / usa ausilio',
      'Flette ginocchia o allarga le braccia',
      'Stabile, nessuna oscillazione',
    ],
  },
  {
    id: 'cammino',
    label: "Base d'appoggio nel cammino",
    group: 'gait',
    options: ['Talloni distanti', 'Talloni vicini'],
  },
];
export const TINETTI_PROVENANCE =
  'Modello a 20 voci già in uso in ClinicOS: equilibrio 16 punti, andatura 12 punti, totale 28. Conservate quattro risposte distinte per lunghezza e altezza del passo destro e sinistro. Allegato del 22/09/2026 come riferimento; non costituisce trascrizione letterale o convalida clinica indipendente.';
