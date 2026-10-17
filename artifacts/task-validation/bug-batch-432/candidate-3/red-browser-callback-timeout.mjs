import assert from "node:assert/strict";
import { test } from "node:test";
import { writeFileSync } from "node:fs";
async function withHeldCorrection(correction, entered, release, run, timeoutMs = 5e3) {
  const settled2 = correction.then(
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
        settled2.then((result) => {
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
      const result = await bounded(settled2, "Correction did not settle after barrier release");
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
let released = false, settled = false;
test("actual browser helper must bound a never-settling callback after entry", { timeout: 150 }, async () => {
  let release;
  const held = new Promise((resolve) => release = resolve);
  const correction = held.then(() => {
    settled = true;
  });
  await assert.rejects(withHeldCorrection(correction, Promise.resolve(), () => {
    released = true;
    release();
  }, () => new Promise(() => {
  }), 10), /Confirmation callback did not complete/);
  assert.equal(released, true);
  assert.equal(settled, true);
});
setTimeout(() => {
  const measured = { sourceFile: "e2e/qa-bug-batch-432-browser.mjs", sourceSha256: "1193384be31c008857faea4850e2d1dee69b55ed58279cea93fef1c7e253dfba", syntheticActualHelperOnly: true, released, settled };
  writeFileSync("artifacts/task-validation/bug-batch-432/candidate-3/red-browser-observation.json", JSON.stringify(measured, null, 2));
  console.log(JSON.stringify(measured));
}, 200);
export {
  withHeldCorrection
};
