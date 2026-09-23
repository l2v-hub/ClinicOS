import type { TransfersAnswers } from '../assessments/transfersTypes';
import { TRANSFERS_SOURCE_SHA256, TRANSFERS_VERSION } from '../assessments/transfersTypes';
import type { TransfersAssessmentDto } from '../assessments/assessmentTypes';
import type {
  AssessmentAttestation,
  AssessmentAttestationPage,
} from '../assessments/assessmentAttestations';
import {
  emptyTransfersAnswers,
  transfersCompletion,
  transfersSnapshotSections,
  AID_KEYS,
} from '../assessments/transfersDefinition';
import { finalAssessment } from './assessments.fixtures';
export function completeTransfers(): TransfersAnswers {
  const a = emptyTransfersAnswers();
  a.context = {
    admissionDate: { status: 'known', value: '2026-09-20' },
    diagnosis: {
      status: 'provided',
      text: 'Diagnosi sintetica\nSeconda riga',
      unavailableReason: '',
    },
  };
  a.operatedLegLoad.applicable = false;
  a.walking = 'assisted';
  a.transfers = {
    bedToWheelchair: 'one_operator_desk',
    wheelchairToBed: 'two_operators',
    toilet: 'one_operator',
  };
  a.hygiene = 'shower';
  a.painOnMovement = false;
  a.cognitiveDeterioration = 'none';
  for (const key of AID_KEYS) a.aids[key].selected = false;
  a.notes = 'Prima riga sintetica\nSeconda riga conservata';
  return a;
}
export function transfersAssessment(
  patch: Partial<TransfersAssessmentDto> = {},
): TransfersAssessmentDto {
  const answers = patch.answers ?? completeTransfers();
  const row: TransfersAssessmentDto = {
    id: 'transfers-a',
    patientId: 'patient-a',
    type: 'postural_transfers',
    formVersion: TRANSFERS_VERSION,
    status: 'draft',
    version: 1,
    assessedAt: '2026-10-25T01:30:25.123Z',
    createdAt: '2026-10-25T03:00:00.000Z',
    updatedAt: '2026-10-25T03:00:00.000Z',
    author: { operatorId: 'operator-a', name: 'Autore sintetico' },
    finalizedAt: null,
    predecessorId: null,
    correctedById: null,
    correctionReason: null,
    result: null,
    completion: transfersCompletion(answers),
    answers,
    finalSnapshot: null,
    snapshotSha256: null,
    pdf: null,
    ...patch,
  };
  if (row.status === 'final') {
    row.finalizedAt = '2026-10-25T04:00:00.000Z';
    row.snapshotSha256 = 'a'.repeat(64);
    row.pdf = patch.pdf ?? {
      status: 'pending',
      documentId: null,
      errorCode: null,
      retryAvailable: false,
    };
    row.finalSnapshot = {
      snapshotVersion: 1,
      patient: finalAssessment().finalSnapshot!.patient,
      author: row.author,
      form: {
        type: 'postural_transfers',
        version: TRANSFERS_VERSION,
        sourceSha256: TRANSFERS_SOURCE_SHA256,
      },
      assessedAt: row.assessedAt,
      createdAt: row.createdAt,
      finalizedAt: row.finalizedAt,
      result: null,
      predecessorId: row.predecessorId,
      correctionReason: row.correctionReason,
      predecessor: row.predecessorId
        ? {
            id: row.predecessorId,
            assessedAt: row.assessedAt,
            authorName: 'Predecessore sintetico',
          }
        : null,
      sections: transfersSnapshotSections(row.answers),
      signatureLabels: ['Firma Fisioterapista', 'Firma Operatori'],
    };
  }
  return row;
}
export function attestation(patch: Partial<AssessmentAttestation> = {}): AssessmentAttestation {
  return {
    id: 'event-a',
    assessmentId: 'transfers-a',
    snapshotSha256: 'a'.repeat(64),
    kind: 'physiotherapist_confirmation',
    actor: {
      operatorId: 'operator-a',
      name: 'Autore sintetico',
      registeredQualification: ' Fisioterapista ',
    },
    createdAt: '2026-10-25T04:05:00.000Z',
    ...patch,
  };
}
export function attestationsPage(
  patch: Partial<AssessmentAttestationPage> = {},
): AssessmentAttestationPage {
  return {
    assessmentId: 'transfers-a',
    snapshotSha256: 'a'.repeat(64),
    correctedById: null,
    items: [attestation()],
    counts: { physiotherapist_confirmation: 1, operator_acknowledgement: 0 },
    me: {
      registeredQualification: ' Fisioterapista ',
      allowedKinds: ['physiotherapist_confirmation', 'operator_acknowledgement'],
      attestedKinds: ['physiotherapist_confirmation'],
    },
    pageInfo: { loadedCount: 1, hasMore: false, nextCursor: null },
    ...patch,
  };
}
