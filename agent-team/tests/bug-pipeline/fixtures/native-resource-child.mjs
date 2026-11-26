import {
  boundedCleanup,
  stopNativeResources,
} from '../../../src/bug-pipeline/native-guard-session.mjs';

let proxyCalls = 0,
  containerCalls = 0,
  removed = 0;
const cleanup = boundedCleanup(async () => {
  await stopNativeResources(
    {
      close: () => {
        proxyCalls++;
        return new Promise(() => {});
      },
    },
    {
      close: () => {
        containerCalls++;
        return { removed: true };
      },
    },
  );
  removed++;
}, 60);
try {
  await cleanup();
  process.exitCode = 1;
} catch (error) {
  console.log(
    `${error.message} proxy=${proxyCalls} container=${containerCalls} removed=${removed}`,
  );
}
