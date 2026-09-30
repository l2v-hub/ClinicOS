// Phase 5 — client-side voice activity detection (energy based, pure, no browser APIs).
//
// Runs on every audio frame IN THE BROWSER. Only a finished utterance (speech + a short pre-roll)
// ever leaves the device; silence, background noise and too-short sounds are discarded here and
// never reach the network, the STT provider or the LLM. Parameters come from the backend
// (`GET /skills/voice/status` → vad) so they can be tuned per environment.

export interface VadConfig {
  speechMarginDb: number;
  minSpeechDb: number;
  minSpeechMs: number;
  endSilenceMs: number;
  maxUtteranceMs: number;
  noSpeechTimeoutMs: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  speechMarginDb: 12,
  minSpeechDb: -50,
  minSpeechMs: 300,
  endSilenceMs: 900,
  maxUtteranceMs: 15_000,
  noSpeechTimeoutMs: 6_000,
};

export type VadEvent =
  | { type: 'speech_start' }
  | { type: 'utterance'; samples: Float32Array; speechMs: number; capped: boolean }
  | { type: 'discarded'; reason: 'no_speech' | 'too_short' };

/** Frames above the threshold needed to declare speech (debounce of clicks). */
const ONSET_MS = 60;
/** Audio kept before the detected onset so the first syllable is not clipped. */
const PRE_ROLL_MS = 300;
/** Initial calibration window of the noise floor. */
const CALIBRATION_MS = 250;
/** Audio kept from the very start while the floor settles: speech right after the tap is kept. */
const EARLY_KEEP_MS = 1500;
/** Lowest floor the adaptation may reach (digital silence at stream start is not a floor). */
const FLOOR_MIN_DB = -75;

export function rmsDb(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  const rms = Math.sqrt(sum / Math.max(1, frame.length));
  return rms > 0 ? 20 * Math.log10(rms) : -120;
}

function concat(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export interface Vad {
  /** Feed one frame; returns an event when the utterance state changes. */
  push(frame: Float32Array): VadEvent | null;
  /** User pressed «Fine»: close the utterance now (speech so far) or discard. */
  flush(): VadEvent;
  /** Current level (dBFS) and noise floor, for the mic meter. */
  level(): { db: number; floorDb: number; speaking: boolean };
}

export function createVad(sampleRate: number, config: VadConfig = DEFAULT_VAD_CONFIG): Vad {
  const msPer = (samples: number) => (samples / sampleRate) * 1000;
  let elapsedMs = 0;
  let floorDb = -60;
  let calibrated = 0;
  const calibration: number[] = [];
  let lastDb = -120;
  let speaking = false;
  let onsetMs = 0;
  let speechMs = 0;
  let silenceMs = 0;
  let done = false;
  const preRoll: Float32Array[] = [];
  const preRollDb: number[] = [];
  let preRollMs = 0;
  let chunks: Float32Array[] = [];

  function close(capped: boolean): VadEvent {
    done = true;
    // Voiced time only (trailing silence excluded) decides whether it was a real utterance.
    if (speechMs < config.minSpeechMs) return { type: 'discarded', reason: 'too_short' };
    return { type: 'utterance', samples: concat(chunks), speechMs: Math.round(speechMs), capped };
  }

  return {
    push(frame) {
      if (done) return null;
      const frameMs = msPer(frame.length);
      elapsedMs += frameMs;
      const db = rmsDb(frame);
      lastDb = db;
      const threshold = Math.max(floorDb + config.speechMarginDb, config.minSpeechDb);
      const loud = db >= threshold;

      if (!speaking) {
        // Adaptive noise floor: learn quickly during calibration, slowly afterwards, only while
        // it is quiet (so speech does not raise the floor).
        if (calibrated < CALIBRATION_MS) {
          // Low percentile of the window (not the mean): speech that starts right after the tap
          // must not be learned as «noise» (QA M4); its gaps set the floor instead.
          if (db > -100) calibration.push(db);
          calibrated += frameMs;
          if (calibrated >= CALIBRATION_MS && calibration.length) {
            const sorted = [...calibration].sort((x, y) => x - y);
            floorDb = Math.max(FLOOR_MIN_DB, sorted[Math.floor(sorted.length * 0.2)]);
          }
        } else if (!loud) {
          // Quiet frames: fall fast (gaps between words reveal the real floor), rise slowly.
          floorDb =
            db < floorDb
              ? Math.max(FLOOR_MIN_DB, floorDb * 0.6 + db * 0.4)
              : floorDb * 0.95 + db * 0.05;
        }
        preRoll.push(frame);
        preRollDb.push(db);
        preRollMs += frameMs;
        if (elapsedMs > EARLY_KEEP_MS)
          while (preRollMs - msPer(preRoll[0].length) >= PRE_ROLL_MS) {
            preRollDb.shift();
            preRollMs -= msPer(preRoll.shift()!.length);
          }
        onsetMs = loud && calibrated >= CALIBRATION_MS ? onsetMs + frameMs : 0;
        if (onsetMs >= ONSET_MS) {
          speaking = true;
          speechMs = onsetMs;
          silenceMs = 0;
          // Keep PRE_ROLL_MS before the first frame that is speech for the settled threshold.
          const first = Math.max(
            0,
            preRollDb.findIndex((v) => v >= threshold),
          );
          let from = first;
          for (let kept = 0; from > 0 && kept < PRE_ROLL_MS; from -= 1)
            kept += msPer(preRoll[from - 1].length);
          chunks = preRoll.slice(from);
          return { type: 'speech_start' };
        }
        if (elapsedMs >= config.noSpeechTimeoutMs) {
          done = true;
          return { type: 'discarded', reason: 'no_speech' };
        }
        return null;
      }

      chunks.push(frame);
      if (loud) {
        speechMs += frameMs + silenceMs;
        silenceMs = 0;
      } else {
        silenceMs += frameMs;
        // A floor calibrated on speech (talking right at the tap) is too high: the gaps between
        // words pull it down, so softer syllables later in the sentence still count as speech.
        if (db < floorDb) floorDb = Math.max(FLOOR_MIN_DB, floorDb * 0.6 + db * 0.4);
      }
      if (silenceMs >= config.endSilenceMs) return close(false);
      if (speechMs + silenceMs >= config.maxUtteranceMs) return close(true);
      return null;
    },
    flush() {
      if (done) return { type: 'discarded', reason: 'no_speech' };
      if (!speaking) {
        done = true;
        return { type: 'discarded', reason: 'no_speech' };
      }
      return close(false);
    },
    level() {
      return { db: lastDb, floorDb, speaking };
    },
  };
}
