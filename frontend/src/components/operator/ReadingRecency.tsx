import { readingRecency } from '../../lib/readingRecency';
import './ReadingRecency.css';

export function ReadingRecency({ measuredAt, now }: { measuredAt: string; now: Date }) {
  const recency = readingRecency(measuredAt, now);
  return (
    <span className="reading-recency">
      <span>{recency.valid ? <>Misurato il <time dateTime={measuredAt}>{recency.absolute}</time></> : recency.absolute}</span>
      {recency.elapsed && <span>{recency.elapsed}</span>}
    </span>
  );
}
