export const AGNOS_TURN_WINDOW = 80;

export interface IndexedTurn<T> {
  index: number;
  turn: T;
}

export interface AgnosHistoryWindow<T> {
  hiddenCount: number;
  items: IndexedTurn<T>[];
}

/** Keeps original turn indexes so pending preview actions remain bound to the correct turn. */
export function agnosHistoryWindow<T>(turns: T[], visibleCount: number): AgnosHistoryWindow<T> {
  const boundedVisibleCount = Math.max(AGNOS_TURN_WINDOW, Math.floor(visibleCount));
  const startIndex = Math.max(0, turns.length - boundedVisibleCount);
  return {
    hiddenCount: startIndex,
    items: turns.slice(startIndex).map((turn, offset) => ({
      index: startIndex + offset,
      turn,
    })),
  };
}

export function revealPreviousAgnosTurns(visibleCount: number): number {
  return Math.max(AGNOS_TURN_WINDOW, Math.floor(visibleCount)) + AGNOS_TURN_WINDOW;
}
