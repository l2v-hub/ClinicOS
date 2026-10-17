// Actual lifecycle helper and its failure tests extracted/transpiled from the scoped test file; synthetic Promise control flow only, no application/DB verdict.
import assert from "node:assert/strict";
import { test } from "node:test";
async function withHeldCorrection(correction, entered, release, run, timeoutMs = 5e3) {
  const settled = correction.then(
    (value) => ({ ok: true, value }),
    (error) => ({ ok: false, error })
  );
  async function bounded(operation, message) {
    let timer;
    try {
      return await Promise.race([
        operation,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  let failed = false;
  let primary;
  try {
    await bounded(
      Promise.race([
        entered,
        settled.then((result) => {
          if (!result.ok) throw result.error;
          throw new Error("Correction settled before interpreter entry");
        })
      ]),
      "Correction did not reach interpreter entry"
    );
    await run();
  } catch (error) {
    failed = true;
    primary = error;
    throw error;
  } finally {
    release();
    try {
      const result = await bounded(settled, "Correction did not settle after barrier release");
      if (!result.ok) throw result.error;
    } catch (cleanupError) {
      if (!failed) throw cleanupError;
      if (cleanupError !== primary)
        throw new AggregateError([primary, cleanupError], "Correction and cleanup failed", {
          cause: primary
        });
    }
  }
}
test("QA H1 barrier failure paths release and settle while preserving the primary error", async () => {
  const neverEntered = new Promise(() => {
  });
  let releases = 0;
  const primary = new Error("correction rejected before entry");
  await assert.rejects(
    withHeldCorrection(
      Promise.reject(primary),
      neverEntered,
      () => {
        releases++;
      },
      async () => {
        assert.fail("entry required");
      },
      50
    ),
    (error) => error === primary
  );
  assert.equal(releases, 1);
  await assert.rejects(
    withHeldCorrection(
      Promise.resolve("DENIED"),
      neverEntered,
      () => {
        releases++;
      },
      async () => {
        assert.fail("entry required");
      },
      50
    ),
    /settled before interpreter entry/
  );
  assert.equal(releases, 2);
  let releaseHeld;
  let correctionSettled = false;
  const held = new Promise((resolve) => {
    releaseHeld = resolve;
  });
  await assert.rejects(
    withHeldCorrection(
      held.then(() => {
        correctionSettled = true;
      }),
      neverEntered,
      releaseHeld,
      async () => {
        assert.fail("entry required");
      },
      20
    ),
    /did not reach interpreter entry/
  );
  assert.equal(correctionSettled, true);
  const assertion = new Error("confirmation assertion failed");
  const cleanup = new Error("correction rejected after release");
  const heldFailure = new Promise((resolve) => {
    releaseHeld = resolve;
  });
  await assert.rejects(
    withHeldCorrection(
      heldFailure.then(() => {
        throw cleanup;
      }),
      Promise.resolve(),
      releaseHeld,
      async () => {
        throw assertion;
      },
      50
    ),
    (error) => error instanceof AggregateError && error.cause === assertion && error.errors[0] === assertion && error.errors[1] === cleanup
  );
});
