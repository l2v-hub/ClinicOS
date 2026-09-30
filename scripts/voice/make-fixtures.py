"""Phase 5 — finalises the voice fixtures (stdlib only).

* speech: raw TTS files (make-fixtures.ps1) padded with 0.8 s leading and 1.5 s trailing silence at a
  low noise floor, so the client VAD can calibrate and detect the end of turn like with a real mic;
* silence.wav: 8 s of low room noise (VAD must send nothing);
* steady-noise.wav: 8 s of constant broadband noise (VAD must learn it as the floor);
* noise-burst.wav: 0.8 s quiet, 1.2 s loud broadband burst, 1.5 s quiet (reaches STT; it must not
  invent a command).

    python scripts/voice/make-fixtures.py
"""
import math
import os
import random
import struct
import wave

RATE = 16_000
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
RAW = os.path.join(HERE, "raw")
rng = random.Random(20260930)


def floor_noise(seconds, amplitude=30):
    return [int(rng.uniform(-amplitude, amplitude)) for _ in range(int(RATE * seconds))]


def write(name, samples):
    with wave.open(os.path.join(HERE, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", max(-32768, min(32767, s))) for s in samples))


def read(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2, path
        data = w.readframes(w.getnframes())
    return list(struct.unpack(f"<{len(data) // 2}h", data))


for file in sorted(os.listdir(RAW)):
    if file.endswith(".wav"):
        speech = read(os.path.join(RAW, file))
        write(file, floor_noise(0.8) + speech + floor_noise(1.5))

# Speech right at the tap (no leading silence): the VAD must not learn it as noise (QA M4).
write("vitals-120-80-nolead.wav", read(os.path.join(RAW, "vitals-120-80.wav")) + floor_noise(1.5))
write("silence.wav", floor_noise(8.0))
write("steady-noise.wav", [int(rng.uniform(-2500, 2500)) for _ in range(RATE * 8)])
burst = [int(rng.uniform(-9000, 9000) * (0.6 + 0.4 * math.sin(i / 90))) for i in range(int(RATE * 1.2))]
write("noise-burst.wav", floor_noise(0.8) + burst + floor_noise(1.5))
print("fixtures ->", HERE)
