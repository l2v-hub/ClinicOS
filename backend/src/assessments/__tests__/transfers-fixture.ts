import { randomUUID } from 'node:crypto';
import { AID_KEYS, OWNED_AID_KEYS, TRANSFERS_VERSION, type TransfersAnswers } from '../types.js';
export function emptyTransfers(): TransfersAnswers {
  return {
    context: {
      admissionDate: { status: null, value: null },
      diagnosis: { status: null, text: '', unavailableReason: '' },
    },
    operatedLegLoad: { applicable: null, side: null, level: null },
    walking: null,
    transfers: { bedToWheelchair: null, wheelchairToBed: null, toilet: null },
    hygiene: null,
    painOnMovement: null,
    cognitiveDeterioration: null,
    aids: Object.fromEntries(
      AID_KEYS.map((key) => [
        key,
        (OWNED_AID_KEYS as readonly string[]).includes(key)
          ? { selected: null, ownership: null }
          : { selected: null },
      ]),
    ) as TransfersAnswers['aids'],
    notes: '',
  };
}
export function completeTransfers(): TransfersAnswers {
  const a = emptyTransfers();
  a.context = {
    admissionDate: { status: 'known', value: '2026-03-28' },
    diagnosis: {
      status: 'provided',
      text: 'Diagnosi documentata sintetica',
      unavailableReason: '',
    },
  };
  a.operatedLegLoad.applicable = false;
  a.walking = 'independent';
  a.transfers = {
    bedToWheelchair: 'independent',
    wheelchairToBed: 'independent',
    toilet: 'independent',
  };
  a.hygiene = 'shower';
  a.painOnMovement = false;
  a.cognitiveDeterioration = 'none';
  for (const aid of Object.values(a.aids)) aid.selected = false;
  return a;
}
export const transfersInput = (extra: Record<string, unknown> = {}) => ({
  requestId: randomUUID(),
  type: 'postural_transfers',
  formVersion: TRANSFERS_VERSION,
  assessedAt: '2026-03-28T23:30:00.000Z',
  answers: completeTransfers(),
  ...extra,
});
