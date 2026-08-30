export const MAX_OPERATOR_DIRECTORY = 500;

export function boundOperatorDirectory<T>(rows: readonly T[]): {
  items: T[];
  overflow: boolean;
} {
  return {
    items: rows.slice(0, MAX_OPERATOR_DIRECTORY),
    overflow: rows.length > MAX_OPERATOR_DIRECTORY,
  };
}
