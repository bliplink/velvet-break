import { mkdirSync, writeFileSync } from 'node:fs';

const sampleRate = 16000;
const seconds = 16;
const total = sampleRate * seconds;
const samples = new Float32Array(total);
const bpm = 120;
const beat = 60 / bpm;

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function addTone(start, duration, midi, gain, { attack = 0.018, release = 0.3, pad = false } = {}) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(total, Math.ceil((start + duration + release) * sampleRate));
  const frequency = midiToHz(midi);
  for (let index = startIndex; index < endIndex; index += 1) {
    const t = index / sampleRate - start;
    if (t < 0) continue;
    const envelope = t < attack
      ? t / attack
      : t < duration
        ? Math.exp(-(t - attack) * 1.1)
        : Math.max(0, 1 - (t - duration) / release) * Math.exp(-duration * 1.1);
    const fundamental = Math.sin(Math.PI * 2 * frequency * t);
    const warmOvertone = Math.sin(Math.PI * 2 * frequency * 2 * t) * (pad ? 0.045 : 0.1);
    const bellOvertone = Math.sin(Math.PI * 2 * frequency * 3 * t) * (pad ? 0.018 : 0.035);
    samples[index] += (fundamental + warmOvertone + bellOvertone) * envelope * gain;
  }
}

const barSeconds = beat * 4;
const chords = [
  [48, 52, 55],
  [45, 48, 52],
  [41, 45, 48],
  [43, 47, 50],
  [48, 52, 55],
  [45, 48, 52],
  [41, 45, 48],
  [43, 47, 50],
];
const melody = [
  [64, 67, 72, 67],
  [69, 67, 64, 60],
  [65, 69, 72, 69],
  [67, 71, 74, 71],
  [72, 76, 74, 72],
  [69, 72, 67, 64],
  [65, 69, 72, 77],
  [74, 71, 67, 72],
];

chords.forEach((chord, bar) => {
  const barStart = bar * barSeconds;
  chord.forEach((note) => addTone(barStart, barSeconds * 0.96, note, 0.036, { attack: 0.12, release: 0.5, pad: true }));
  melody[bar].forEach((note, step) => {
    const accent = step === 0 ? 0.09 : 0.068;
    addTone(barStart + step * beat, beat * 0.62, note, accent, { attack: 0.018, release: 0.34 });
  });
  addTone(barStart, beat * 0.46, chord[0] - 12, 0.045, { attack: 0.025, release: 0.18, pad: true });
  addTone(barStart + beat * 2, beat * 0.42, chord[0] - 12, 0.035, { attack: 0.025, release: 0.18, pad: true });
});

let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
const pcm = Buffer.alloc(total * 2);
for (let index = 0; index < total; index += 1) {
  const normalized = Math.max(-1, Math.min(1, samples[index] / Math.max(peak, 0.001) * 0.75));
  pcm.writeInt16LE(Math.round(normalized * 32767), index * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

mkdirSync('assets', { recursive: true });
writeFileSync('assets/raid-ambient.wav', Buffer.concat([header, pcm]));
