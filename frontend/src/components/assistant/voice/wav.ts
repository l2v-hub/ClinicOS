// Phase 5 — utterance encoding (pure). The browser captures Float32 PCM at the device rate; the
// STT contract takes 16 kHz mono PCM16 WAV (small, lossless, accepted by every provider, and the
// same format a clip-on / wearable microphone can produce). No compression codecs, no MediaRecorder.

export const STT_SAMPLE_RATE = 16_000;

/** Linear-interpolation resampler with a box pre-filter (enough for speech at 16 kHz). */
export function resample(
  samples: Float32Array,
  fromRate: number,
  toRate = STT_SAMPLE_RATE,
): Float32Array {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const length = Math.max(0, Math.floor(samples.length / ratio));
  const out = new Float32Array(length);
  const window = Math.max(1, Math.floor(ratio));
  for (let i = 0; i < length; i += 1) {
    const center = i * ratio;
    const start = Math.floor(center);
    let sum = 0;
    let count = 0;
    for (let k = start; k < start + window && k < samples.length; k += 1) {
      sum += samples[k];
      count += 1;
    }
    out[i] = count ? sum / count : 0;
  }
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate = STT_SAMPLE_RATE): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}

export function utteranceToWav(samples: Float32Array, deviceRate: number): Uint8Array {
  return encodeWav(resample(samples, deviceRate), STT_SAMPLE_RATE);
}
