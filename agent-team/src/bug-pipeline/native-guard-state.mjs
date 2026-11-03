import { freezeGuardValue } from './native-guard-json.mjs';

// One closure per native source process, shared by every proxy connection.
// Only the parent receives `parent`; no child/egress RPC exposes its release.
export function createNativeGuardState({ validateClaim } = {}) {
  if (typeof validateClaim !== 'function') throw new Error('native-state-rejected');
  let phase = 'CLOSED',
    forwardAttempts = 0,
    forwarded = false;
  let ownedHandle, seal, send, resolve, reject, completion;
  const error = () => new Error('native-state-rejected');
  function fail() {
    phase = 'FAILED';
    reject?.(error());
  }
  const data = Object.freeze({
    stage(candidate) {
      if (phase !== 'CLOSED' || typeof candidate?.forward !== 'function') {
        fail();
        throw error();
      }
      try {
        seal = freezeGuardValue(structuredClone(candidate.seal));
        if (!seal || typeof seal !== 'object' || Array.isArray(seal)) throw error();
        send = candidate.forward;
        ownedHandle = Object.freeze(Object.create(null));
        completion = new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        });
        // Proxy may not yet be awaiting the held HTTP response when failure arrives.
        completion.catch(() => {});
        phase = 'STAGED';
        return Object.freeze({ handle: ownedHandle, seal, completion });
      } catch {
        fail();
        throw error();
      }
    },
    fail,
    status: () => Object.freeze({ phase, forwardAttempts, forwarded }),
  });
  const parent = Object.freeze({
    async release(handle, claim) {
      if (phase !== 'STAGED' || handle !== ownedHandle || !claim || typeof claim !== 'object') {
        fail();
        throw error();
      }
      // Irreversible BEFORE any asynchronous callback, including claim checking.
      phase = 'RELEASED';
      forwardAttempts++;
      try {
        const claimSnapshot = freezeGuardValue(structuredClone(claim));
        if ((await validateClaim(claimSnapshot, seal)) !== true || phase !== 'RELEASED')
          throw error();
        forwarded = true;
        const result = await send();
        if (phase !== 'RELEASED') throw error();
        resolve(result);
        return result;
      } catch {
        fail();
        throw error();
      }
    },
  });
  return Object.freeze({ data, parent });
}
