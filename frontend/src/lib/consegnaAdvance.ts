export interface ConsegnaAdvanceToken {
  patientId: string;
  successorId: string | null;
  selection: number;
  roster: number;
  requestKey: string;
}
export function canAdvanceConsegna(
  token: ConsegnaAdvanceToken,
  current: Omit<ConsegnaAdvanceToken, 'successorId'>,
  saved: boolean,
) {
  return (
    saved &&
    token.patientId === current.patientId &&
    token.selection === current.selection &&
    token.roster === current.roster &&
    token.requestKey === current.requestKey
  );
}
