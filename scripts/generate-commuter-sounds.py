"""Generate the two short PCM cues used by the commuter dashboard."""

import math
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 22050
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "sounds"


def envelope(elapsed: float, duration: float, attack: float = 0.015) -> float:
    return min(1.0, elapsed / attack) * min(1.0, (duration - elapsed) / 0.015)


def write_cue(name: str, tones: list[tuple[float, float, float, str, float]]) -> None:
    duration = max(start + length for _, start, length, _, _ in tones) + 0.02
    frames = bytearray()
    for index in range(math.ceil(duration * SAMPLE_RATE)):
        at = index / SAMPLE_RATE
        value = 0.0
        for frequency, start, length, waveform, gain in tones:
            elapsed = at - start
            if 0 <= elapsed < length:
                phase = 2 * math.pi * frequency * elapsed
                tone = math.sin(phase) if waveform == "sine" else (1.0 if math.sin(phase) >= 0 else -1.0)
                value += gain * envelope(elapsed, length) * tone
        frames.extend(struct.pack("<h", round(max(-1.0, min(1.0, value)) * 32767)))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT / f"{name}.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(frames)


# Web hail beep: three square notes at 880, 1175, then 880 Hz.
write_cue("hail-reminder", [
    (880, 0.0, 0.15, "square", 0.28),
    (1175, 0.18, 0.15, "square", 0.28),
    (880, 0.36, 0.15, "square", 0.28),
])

# Web proximity alert: two sine notes at 880 and 660 Hz.
write_cue("jeep-nearby", [
    (880, 0.0, 0.15, "sine", 0.3),
    (660, 0.2, 0.15, "sine", 0.3),
])
