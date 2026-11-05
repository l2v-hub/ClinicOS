// In-process outcome brands cannot be recreated by copying error text or JSON.
const failures = new WeakSet();
export function cleanupFailure() {
  const error = new Error('native-session-cleanup-failed');
  failures.add(error);
  return error;
}
export const isCleanupFailure = (error) =>
  error !== null && typeof error === 'object' && failures.has(error);

// A timeout is an unknown outcome, never proof that owned resources were removed.
// Concurrent callers share the original operation, including a sanitized failure.
export function boundedCleanup(cleanup, timeoutMs = 10000) {
  if (
    typeof cleanup !== 'function' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 10000
  )
    throw new TypeError('native-cleanup-configuration-invalid');
  let operation;
  return () => {
    if (operation) return operation;
    let resolveOperation, rejectOperation;
    operation = new Promise((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    const timer = setTimeout(() => rejectOperation(cleanupFailure()), timeoutMs);
    const finish = (ok) => {
      clearTimeout(timer);
      if (ok) resolveOperation();
      else rejectOperation(cleanupFailure());
    };
    try {
      Promise.resolve(cleanup()).then(
        () => finish(true),
        () => finish(false),
      );
    } catch {
      finish(false);
    }
    return operation;
  };
}
