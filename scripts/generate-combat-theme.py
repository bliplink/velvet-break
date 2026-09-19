"""Build the original chamber-suspense raid loop from synthesized instruments."""

import math
import wave
from pathlib import Path

import numpy as np


RATE = 24000
DURATION = 16
COUNT = RATE * DURATION
RNG = np.random.default_rng(20260912)
mix = np.zeros((COUNT, 2), dtype=np.float64)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def place(start, signal, pan=0):
    first = round(start * RATE)
    length = min(len(signal), COUNT - first)
    if length <= 0:
        return
    mix[first:first + length, 0] += signal[:length] * math.sqrt((1 - pan) / 2)
    mix[first:first + length, 1] += signal[:length] * math.sqrt((1 + pan) / 2)


def piano(start, note, strength=0.055, duration=1.7, pan=0):
    count = round(duration * RATE)
    t = np.arange(count) / RATE
    freq = hz(note)
    tone = sum(
        gain * np.sin(2 * np.pi * freq * harmonic * t + phase)
        * np.exp(-t * decay)
        for harmonic, gain, decay, phase in [
            (1, 1, 1.7, 0), (2, 0.24, 3.1, 0.5),
            (3, 0.095, 4.6, 0.2), (4, 0.035, 6.2, 1.1),
        ]
    )
    hammer = RNG.standard_normal(count) * np.exp(-t * 120) * 0.055
    attack = np.minimum(1, t / 0.009)
    place(start, (tone + hammer) * attack * strength, pan)


def strings(start, duration, notes, strength=0.031):
    count = min(round(duration * RATE), COUNT - round(start * RATE))
    t = np.arange(count) / RATE
    attack = np.minimum(1, t / 0.64)
    release = np.minimum(1, np.maximum(0, duration - t) / 0.62)
    swell = attack * release * (0.84 + 0.16 * np.sin(2 * np.pi * 0.21 * t))
    for index, note in enumerate(notes):
        f = hz(note)
        phase = 2 * np.pi * f * t + 0.34 * np.sin(2 * np.pi * 4.1 * t + index)
        body = (np.sin(phase) + 0.17 * np.sin(2 * phase) + 0.075 * np.sin(3 * phase))
        bow = np.sin(2 * np.pi * (46 + index * 7) * t) * 0.009
        place(start, (body + bow) * swell * strength, (-0.28, 0, 0.28)[index])


def cello(start, note, duration=2.5, strength=0.047):
    count = min(round(duration * RATE), COUNT - round(start * RATE))
    t = np.arange(count) / RATE
    phase = 2 * np.pi * hz(note) * t + 0.18 * np.sin(2 * np.pi * 4.2 * t)
    body = np.sin(phase) + 0.2 * np.sin(2 * phase) + 0.08 * np.sin(3 * phase)
    env = np.minimum(1, t / 0.2) * np.minimum(1, np.maximum(0, duration - t) / 0.55)
    place(start, body * env * strength, -0.18)


def drum(start, strength=0.07, pan=-0.08):
    count = round(0.65 * RATE)
    t = np.arange(count) / RATE
    phase = 2 * np.pi * (72 * t - 18 * t * t)
    skin = np.sin(phase) * np.exp(-t * 9)
    noise = RNG.standard_normal(count)
    low_noise = np.convolve(noise, np.ones(40) / 40, mode="same")
    place(start, (skin + low_noise * 0.18) * strength, pan)


room_t = np.arange(COUNT) / RATE
bed = (np.sin(2 * np.pi * 880 * room_t / DURATION) * 0.0026
       + np.sin(2 * np.pi * 1320 * room_t / DURATION + 1.1) * 0.0014)
mix[:, 0] += bed
mix[:, 1] += bed

for start, notes, bass in [
    (0.0, (52, 55, 59), 40),
    (4.0, (48, 52, 55), 36),
    (8.0, (45, 48, 52), 33),
    (12.0, (47, 52, 56), 35),
]:
    strings(start, 4.7, notes)
    cello(start + 0.16, bass, 3.75)

for start, note, strength in [
    (0.48, 71, 0.051), (1.37, 67, 0.047), (2.31, 66, 0.044), (3.12, 64, 0.045),
    (4.34, 67, 0.048), (5.26, 64, 0.046), (6.55, 62, 0.046),
    (8.46, 64, 0.048), (9.35, 60, 0.046), (10.21, 59, 0.05), (11.32, 57, 0.049),
    (12.34, 66, 0.047), (13.23, 64, 0.046), (14.16, 62, 0.047),
]:
    piano(start, note, strength, pan=(-0.12 if start < 8 else 0.13))

for start, note in [
    (1.86, 52), (3.37, 55), (4.94, 48), (7.2, 52),
    (8.9, 45), (10.75, 52), (12.92, 47), (14.72, 52),
]:
    piano(start, note, 0.03, 2.2, 0.22)

for start, strength in [(2.02, 0.065), (4.18, 0.071), (7.35, 0.062),
                        (8.06, 0.076), (11.38, 0.06), (12.13, 0.077), (14.38, 0.068)]:
    drum(start, strength)

dry = mix.copy()
for delay, amount in [(0.19, 0.085), (0.37, 0.054), (0.61, 0.026)]:
    shift = round(delay * RATE)
    mix[shift:, 0] += dry[:-shift, 1] * amount
    mix[shift:, 1] += dry[:-shift, 0] * amount

seam = round(0.9 * RATE)
shape = np.sin(np.linspace(0, np.pi / 2, seam)) ** 2
transient = mix - bed[:, None]
transient[:seam] *= shape[:, None]
transient[-seam:] *= shape[::-1, None]
mix = bed[:, None] + transient
mix = np.tanh(mix * 1.1)
mix *= 0.27 / max(np.max(np.abs(mix)), 1e-6)

output = Path(__file__).resolve().parents[1] / "assets" / "raid-combat.wav"
with wave.open(str(output), "wb") as wav_file:
    wav_file.setnchannels(2)
    wav_file.setsampwidth(2)
    wav_file.setframerate(RATE)
    wav_file.writeframes(np.int16(np.clip(mix, -1, 1) * 32767).tobytes())
print(output)
