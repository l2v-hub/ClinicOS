export function createAgnosRequestGate() {
  let generation = 0;
  let active: { token: number; controller: AbortController; timer: ReturnType<typeof setTimeout> } | null = null;
  return {
    begin(timeoutMs = 90_000) {
      if (active) return null;
      const token = ++generation;
      const controller = new AbortController();
      active = { token, controller, timer: setTimeout(() => controller.abort(), timeoutMs) };
      return { token, signal: controller.signal };
    },
    current(token: number) { return active?.token === token; },
    finish(token: number) {
      if (active?.token !== token) return;
      clearTimeout(active.timer);
      active = null;
    },
    cancel() {
      if (active) { clearTimeout(active.timer); active.controller.abort(); }
      active = null;
      generation++;
    },
    get busy() { return active !== null; },
  };
}
