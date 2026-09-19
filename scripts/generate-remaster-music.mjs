import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const DURATION = 16;
const CHANNELS = 2;
const TAU = Math.PI * 2;

function midi(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function makeBuffer() {
  return {
    left: new Float64Array(RATE * DURATION),
    right: new Float64Array(RATE * DURATION),
  };
}

function panGains(pan = 0) {
  return [Math.sqrt((1 - pan) * 0.5), Math.sqrt((1 + pan) * 0.5)];
}

function addTone(buf, start, duration, note, gain, options = {}) {
  const f = midi(note);
  const first = Math.max(0, Math.floor(start * RATE));
  const last = Math.min(buf.left.length, Math.ceil((start + duration) * RATE));
  const [lg, rg] = panGains(options.pan ?? 0);
  const attack = options.attack ?? 0.03;
  const release = options.release ?? 0.28;
  const brightness = options.brightness ?? 0.12;
  const detune = options.detune ?? 0;
  for (let i = first; i < last; i++) {
    const t = i / RATE - start;
    const remain = duration - t;
    const env = Math.min(1, t / attack, remain / release) * Math.exp(-t * (options.decay ?? 0.22));
    if (env <= 0) continue;
    const phase = TAU * f * t;
    const value = (
      Math.sin(phase) +
      Math.sin(phase * 2.001 + detune) * brightness +
      Math.sin(phase * 3.003 + 0.7) * brightness * 0.32
    ) * env * gain;
    buf.left[i] += value * lg;
    buf.right[i] += value * rg;
  }
}

function addPad(buf, start, duration, notes, gain = 0.03) {
  notes.forEach((note, index) => {
    addTone(buf, start, duration, note, gain, {
      attack: 0.55,
      release: 0.9,
      decay: 0.025,
      brightness: 0.07,
      pan: (index - (notes.length - 1) / 2) * 0.24,
      detune: index * 0.13,
    });
  });
}

function addKick(buf, start, gain = 0.09) {
  const first = Math.floor(start * RATE);
  const length = Math.floor(0.42 * RATE);
  for (let j = 0; j < length && first + j < buf.left.length; j++) {
    const t = j / RATE;
    const phase = TAU * (70 * t - 28 * t * t);
    const env = Math.exp(-t * 13);
    const v = Math.sin(phase) * env * gain;
    buf.left[first + j] += v * 0.72;
    buf.right[first + j] += v * 0.72;
  }
}

function addNoiseHit(buf, start, gain = 0.025, seed = 1) {
  let x = seed >>> 0;
  const first = Math.floor(start * RATE);
  const length = Math.floor(0.26 * RATE);
  for (let j = 0; j < length && first + j < buf.left.length; j++) {
    x = (1664525 * x + 1013904223) >>> 0;
    const n = ((x / 0xffffffff) * 2 - 1);
    const t = j / RATE;
    const env = Math.exp(-t * 24);
    const v = n * env * gain;
    buf.left[first + j] += v;
    buf.right[first + j] += v * 0.9;
  }
}

function normalizeAndWrite(name, buf, peakTarget = 0.44) {
  let peak = 0;
  for (let i = 0; i < buf.left.length; i++) {
    peak = Math.max(peak, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
  }
  const scale = peak > 0 ? peakTarget / peak : 1;
  const pcm = Buffer.alloc(buf.left.length * CHANNELS * 2);
  for (let i = 0; i < buf.left.length; i++) {
    const l = Math.max(-1, Math.min(1, Math.tanh(buf.left[i] * scale * 1.06)));
    const r = Math.max(-1, Math.min(1, Math.tanh(buf.right[i] * scale * 1.06)));
    pcm.writeInt16LE(Math.round(l * 32767), i * 4);
    pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * CHANNELS * 2, 28);
  header.writeUInt16LE(CHANNELS * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  writeFileSync(`assets/${name}`, Buffer.concat([header, pcm]));
}

function ambientTrack() {
  const b = makeBuffer();
  const chords = [
    [50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52],
  ];
  const motif = [
    [62, 65, 69, 67], [58, 62, 65, 62], [60, 64, 67, 64], [57, 60, 64, 62],
  ];
  for (let bar = 0; bar < 8; bar++) {
    const start = bar * 2;
    const chord = chords[bar % chords.length];
    addPad(b, start, 2.35, chord, 0.032);
    addTone(b, start, 1.7, chord[0] - 12, 0.032, { attack: 0.16, release: 0.5, decay: 0.12, brightness: 0.04, pan: -0.1 });
    motif[bar % motif.length].forEach((note, step) => {
      addTone(b, start + step * 0.5 + 0.08, 0.34, note, 0.036, {
        attack: 0.018, release: 0.22, decay: 0.85, brightness: 0.16, pan: step % 2 ? 0.18 : -0.14,
      });
    });
  }
  return b;
}

function combatTrack() {
  const b = makeBuffer();
  const beat = 60 / 122;
  const roots = [38, 38, 34, 36, 38, 41, 34, 36];
  for (let bar = 0; bar < 8; bar++) {
    const start = bar * beat * 4;
    const root = roots[bar];
    addPad(b, start, beat * 4.4, [root + 12, root + 15, root + 19], 0.022);
    for (let step = 0; step < 8; step++) {
      const t = start + step * beat * 0.5;
      addTone(b, t, beat * 0.38, root + (step % 4 === 3 ? 7 : 0), 0.047, {
        attack: 0.008, release: 0.16, decay: 1.4, brightness: 0.14, pan: step % 2 ? 0.08 : -0.08,
      });
      if (step % 2 === 0) addKick(b, t, 0.105);
      if (step === 3 || step === 7) addNoiseHit(b, t, 0.028, 8128 + bar * 13 + step);
    }
    const lead = [root + 24, root + 27, root + 31, root + 29];
    lead.forEach((note, step) => {
      addTone(b, start + step * beat + beat * 0.12, beat * 0.58, note, 0.046, {
        attack: 0.015, release: 0.24, decay: 0.72, brightness: 0.18, pan: step % 2 ? 0.2 : -0.16,
      });
    });
  }
  return b;
}

function undergroundTrack() {
  const b = makeBuffer();
  const chords = [
    [41, 48, 53], [39, 46, 51], [36, 43, 48], [38, 45, 50],
  ];
  for (let bar = 0; bar < 4; bar++) {
    const start = bar * 4;
    addPad(b, start, 4.6, chords[bar], 0.035);
    addTone(b, start + 0.25, 3.2, chords[bar][0] - 12, 0.042, {
      attack: 0.3, release: 0.8, decay: 0.04, brightness: 0.03, pan: -0.06,
    });
    [0.7, 1.8, 2.75, 3.45].forEach((offset, step) => {
      addTone(b, start + offset, 0.8, chords[bar][2] + (step % 2 ? 2 : 0), 0.025, {
        attack: 0.06, release: 0.4, decay: 0.5, brightness: 0.08, pan: step % 2 ? 0.24 : -0.22,
      });
    });
  }
  return b;
}

mkdirSync('assets', { recursive: true });
normalizeAndWrite('raid-ambient.wav', ambientTrack(), 0.38);
normalizeAndWrite('raid-combat.wav', combatTrack(), 0.46);
normalizeAndWrite('underground.wav', undergroundTrack(), 0.36);
console.log('Generated remastered lobby, combat and underground music. Sound effects were not modified.');
