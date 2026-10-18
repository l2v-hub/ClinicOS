/** Server-owned derivation provenance remains visible until an explicit operator action. */
export function pendingDerivedSex(data: Record<string, unknown>): boolean {
  const fields = data._derivedFields as
    | { anagrafica?: { sex?: { source?: string; reviewRequired?: boolean; value?: unknown } } }
    | undefined;
  const sex = fields?.anagrafica?.sex;
  const anagrafica = data.anagrafica as { sex?: unknown } | undefined;
  return (
    sex?.source === 'codiceFiscale' && sex.reviewRequired === true && sex.value === anagrafica?.sex
  );
}

export function acknowledgeDerivedSex(data: Record<string, unknown>): Record<string, unknown> {
  const fields = data._derivedFields as Record<string, unknown> | undefined;
  const demographic = fields?.anagrafica as Record<string, unknown> | undefined;
  const sex = demographic?.sex as Record<string, unknown> | undefined;
  if (!sex || sex.source !== 'codiceFiscale' || sex.reviewRequired !== true) return data;
  return {
    ...data,
    _derivedFields: {
      ...fields,
      anagrafica: { ...demographic, sex: { ...sex, reviewRequired: false } },
    },
  };
}
