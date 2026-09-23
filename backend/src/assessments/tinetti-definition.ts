import type { TinettiItemId } from './tinetti-types.js';

// Preserved PO12 source definition; source/reference hashes are pinned in tinetti-types.ts.
export const TINETTI_PROVENANCE =
  'Modello a 20 voci già in uso in ClinicOS: equilibrio 16 punti, andatura 12 punti, totale 28. Conservate quattro risposte distinte per lunghezza e altezza del passo destro e sinistro. Allegato del 22/09/2026 come riferimento; non costituisce trascrizione letterale o convalida clinica indipendente.';
export const TINETTI_ITEMS: ReadonlyArray<{
  id: TinettiItemId;
  group: 'balance' | 'gait';
  label: string;
  options: readonly string[];
}> = [
  {
    id: 'equilibrioSeduto',
    group: 'balance',
    label: 'Equilibrio seduto',
    options: ['Instabile', 'Stabile, sicuro'],
  },
  {
    id: 'alzarsi',
    group: 'balance',
    label: 'Alzarsi dalla sedia',
    options: [
      'Incapace senza aiuto',
      'Capace, usa braccia / non sicuro',
      'Capace, senza usare le braccia',
    ],
  },
  {
    id: 'tentativiAlzarsi',
    group: 'balance',
    label: 'Tentativi per alzarsi',
    options: ['Incapace', 'Richiede > 1 tentativo', 'Riesce al 1° tentativo'],
  },
  {
    id: 'equilibrioImmediato',
    group: 'balance',
    label: 'Equilibrio in piedi (primi 5 s)',
    options: [
      'Instabile (vacilla, sposta i piedi)',
      'Stabile con appoggio',
      'Stabile senza appoggio',
    ],
  },
  {
    id: 'equilibrioProlungato',
    group: 'balance',
    label: 'Equilibrio prolungato',
    options: ['Instabile', 'Base allargata o appoggio', 'Stabile senza appoggio, base stretta'],
  },
  {
    id: 'rombergSpinta',
    group: 'balance',
    label: 'Romberg con spinta sternale',
    options: ['Cade', 'Vacilla, si aggrappa', 'Stabile'],
  },
  {
    id: 'occhiChiusi',
    group: 'balance',
    label: 'Equilibrio occhi chiusi',
    options: ['Instabile', 'Stabile'],
  },
  {
    id: 'girarsi360Passi',
    group: 'balance',
    label: 'Girarsi 360° — continuità dei passi',
    options: ['Passi discontinui', 'Passi continui'],
  },
  {
    id: 'girarsi360Stabilita',
    group: 'balance',
    label: 'Girarsi 360° — stabilità',
    options: ['Instabile (si aggrappa)', 'Stabile'],
  },
  {
    id: 'sedersi',
    group: 'balance',
    label: 'Sedersi',
    options: [
      'Insicuro (caduta nella sedia)',
      'Usa le braccia o movimenti bruschi',
      'Sicuro, movimenti fluidi',
    ],
  },
  {
    id: 'iniziazione',
    group: 'gait',
    label: 'Inizio della deambulazione',
    options: ['Esitazione / passi multipli', 'Nessuna esitazione'],
  },
  {
    id: 'lunghezzaPassoDx',
    group: 'gait',
    label: 'Lunghezza passo destro',
    options: ['Piede dx non supera il sx', 'Piede dx supera il sx'],
  },
  {
    id: 'altezzaPassoDx',
    group: 'gait',
    label: 'Altezza passo destro',
    options: ['Piede dx striscia', 'Piede dx si solleva'],
  },
  {
    id: 'lunghezzaPassoSx',
    group: 'gait',
    label: 'Lunghezza passo sinistro',
    options: ['Piede sx non supera il dx', 'Piede sx supera il dx'],
  },
  {
    id: 'altezzaPassoSx',
    group: 'gait',
    label: 'Altezza passo sinistro',
    options: ['Piede sx striscia', 'Piede sx si solleva'],
  },
  {
    id: 'simmetria',
    group: 'gait',
    label: 'Simmetria del passo',
    options: ['Asimmetrico', 'Simmetrico'],
  },
  {
    id: 'continuita',
    group: 'gait',
    label: 'Continuità del passo',
    options: ['Interruzioni / fermate', 'Continuo'],
  },
  {
    id: 'traiettoria',
    group: 'gait',
    label: 'Traiettoria',
    options: ['Deviazione marcata', 'Deviazione lieve / usa ausilio', 'Rettilinea senza ausilio'],
  },
  {
    id: 'tronco',
    group: 'gait',
    label: 'Stabilità del tronco',
    options: [
      'Oscillazione marcata / usa ausilio',
      'Flette ginocchia o allarga le braccia',
      'Stabile, nessuna oscillazione',
    ],
  },
  {
    id: 'cammino',
    group: 'gait',
    label: "Base d'appoggio nel cammino",
    options: ['Talloni distanti', 'Talloni vicini'],
  },
];
