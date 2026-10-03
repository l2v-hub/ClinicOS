// Prompt 10 §6.1: diary, handovers and notes offer only Normale / Urgente. The intermediate level
// ('alta' for handovers and notes, 'importante' for the patient diary) is still a valid stored value:
// a record that already has it keeps it selectable while edited, so it is never silently converted.

export interface CorePriorityOption {
  value: string;
  label: string;
}

export function corePriorityOptions(
  current: string | undefined,
  intermediate: string,
  intermediateLabel: string,
): CorePriorityOption[] {
  return [
    { value: 'normale', label: 'Normale' },
    ...(current === intermediate
      ? [{ value: intermediate, label: `${intermediateLabel} (valore precedente)` }]
      : []),
    { value: 'urgente', label: 'Urgente' },
  ];
}
