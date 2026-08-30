export function createVoiceStartGate() {
  let generation = 0;
  let starting = false;
  return {
    begin(): number | null {
      if (starting) return null;
      starting = true;
      generation += 1;
      return generation;
    },
    cancel(): void {
      generation += 1;
      starting = false;
    },
    isCurrent(token: number): boolean {
      return starting && token === generation;
    },
    complete(token: number): boolean {
      if (!this.isCurrent(token)) return false;
      starting = false;
      return true;
    },
  };
}
