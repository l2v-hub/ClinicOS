import assert from 'node:assert/strict';

export const QUALIFIED_CONTEXT_TOKENS = 1_000_000;
export const NATIVE_OVERHEAD_TOKENS = 64 * 1024;
// Transport assembly is finite. Admission still requires the actual serialized
// prompt/schema and observed output allowance to fit before any review claim.
export const MAX_REVIEW_PACKET_BYTES = QUALIFIED_CONTEXT_TOKENS - NATIVE_OVERHEAD_TOKENS;

// Derive only the remaining serialized JSON allowance from an already exact
// minimal preparation; prefix/schema/output/native overhead are counted once.
export function optionalEvidencePacketBudget({ packetBytes, capacity }) {
  assert.ok(Number.isSafeInteger(packetBytes) && packetBytes >= 0);
  const checked = reviewCapacity({
    inputBytes: capacity?.inputBytes,
    schemaBytes: capacity?.schemaBytes,
    profile: capacity,
  });
  return Math.min(
    MAX_REVIEW_PACKET_BYTES,
    packetBytes + checked.contextWindow - checked.requiredTokensUpperBound,
  );
}

export function reviewCapacity({ inputBytes, schemaBytes, profile }) {
  for (const value of [inputBytes, schemaBytes]) {
    assert.ok(Number.isSafeInteger(value) && value >= 0, 'Invalid serialized review size');
  }
  assert.ok(
    Number.isSafeInteger(profile?.contextWindow) &&
      profile.contextWindow === QUALIFIED_CONTEXT_TOKENS,
    'Explicit qualified context capacity is required',
  );
  assert.ok(
    Number.isSafeInteger(profile.maxOutputTokens) &&
      profile.maxOutputTokens > 0 &&
      profile.maxOutputTokens < profile.contextWindow,
    'Qualified output capacity is required',
  );
  // One token per UTF-8 byte is deliberately conservative. Neither schema nor
  // native overhead nor the observed model output allowance may be discounted.
  const requiredTokensUpperBound =
    inputBytes + schemaBytes + NATIVE_OVERHEAD_TOKENS + profile.maxOutputTokens;
  assert.ok(
    Number.isSafeInteger(requiredTokensUpperBound) &&
      requiredTokensUpperBound <= profile.contextWindow,
    'Review exceeds qualified context capacity',
  );
  return {
    ...profile,
    inputBytes,
    schemaBytes,
    nativeOverheadTokens: NATIVE_OVERHEAD_TOKENS,
    requiredTokensUpperBound,
  };
}
