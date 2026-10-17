// Actual scoped helper and existing/new adversarial lifecycle tests; synthetic Promises only.
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
    await bounded(Promise.resolve().then(run), "Confirmation callback did not complete");
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
test(
  "QA H1 confirmation timeout and late rejection always release and settle",
  { timeout: 1e3 },
  async () => {
    function heldFixture(cleanupError2) {
      let release;
      let released = false;
      let settled = false;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      return {
        correction: held.then(() => {
          settled = true;
          if (cleanupError2) throw cleanupError2;
        }),
        release: () => {
          released = true;
          release();
        },
        assertReleased: () => {
          assert.equal(released, true);
          assert.equal(settled, true);
        }
      };
    }
    const stalled = heldFixture();
    await assert.rejects(
      withHeldCorrection(
        stalled.correction,
        Promise.resolve(),
        stalled.release,
        () => new Promise(() => {
        }),
        10
      ),
      /Confirmation callback did not complete/
    );
    stalled.assertReleased();
    const late = heldFixture();
    let rejectLate;
    const lateRun = new Promise((_, reject) => {
      rejectLate = reject;
    });
    await assert.rejects(
      withHeldCorrection(late.correction, Promise.resolve(), late.release, () => lateRun, 10),
      /Confirmation callback did not complete/
    );
    late.assertReleased();
    rejectLate(new Error("callback rejected after its timeout"));
    await new Promise((resolve) => setImmediate(resolve));
    const rejected = heldFixture();
    const primary = new Error("callback rejection before timeout");
    await assert.rejects(
      withHeldCorrection(
        rejected.correction,
        Promise.resolve(),
        rejected.release,
        () => new Promise((_, reject) => {
          queueMicrotask(() => reject(primary));
        }),
        50
      ),
      (error) => error === primary
    );
    rejected.assertReleased();
    const cleanupError = new Error("correction cleanup rejected after callback timeout");
    const failedCleanup = heldFixture(cleanupError);
    await assert.rejects(
      withHeldCorrection(
        failedCleanup.correction,
        Promise.resolve(),
        failedCleanup.release,
        () => new Promise(() => {
        }),
        10
      ),
      (error) => error instanceof AggregateError && error.cause instanceof Error && error.cause.message === "Confirmation callback did not complete" && error.errors[0] === error.cause && error.errors[1] === cleanupError
    );
    failedCleanup.assertReleased();
    let releasedNeverSettling = false;
    await assert.rejects(
      withHeldCorrection(
        new Promise(() => {
        }),
        Promise.resolve(),
        () => {
          releasedNeverSettling = true;
        },
        async () => {
          throw primary;
        },
        10
      ),
      (error) => error instanceof AggregateError && error.cause === primary && error.errors[0] === primary && error.errors[1] instanceof Error && error.errors[1].message === "Correction did not settle after barrier release"
    );
    assert.equal(releasedNeverSettling, true);
  }
);
export {
  withHeldCorrection
};
