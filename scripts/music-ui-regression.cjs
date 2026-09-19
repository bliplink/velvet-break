const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function wavInfo(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF');
  assert.equal(data.toString('ascii', 8, 12), 'WAVE');
  const channels = data.readUInt16LE(22);
  const sampleRate = data.readUInt32LE(24);
  const bits = data.readUInt16LE(34);
  let offset = 12;
  let pcm = null;
  while (offset + 8 <= data.length) {
    const id = data.toString('ascii', offset, offset + 4);
    const length = data.readUInt32LE(offset + 4);
    if (id === 'data') {
      pcm = data.subarray(offset + 8, offset + 8 + length);
      break;
    }
    offset += 8 + length + (length % 2);
  }
  assert.ok(pcm, `${file} must contain PCM data`);
  let peak = 0;
  for (let index = 0; index + 1 < pcm.length; index += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(index)));
  return { duration: pcm.length / (sampleRate * channels * (bits / 8)), peak };
}

const root = path.join(__dirname, '..');
const lobby = wavInfo(path.join(root, 'assets/raid-ambient.wav'));
const combat = wavInfo(path.join(root, 'assets/raid-combat.wav'));
assert.ok(lobby.duration <= 16.01, 'lobby theme should remain the previous short track');
assert.ok(combat.duration >= 15.9 && combat.duration <= 16.1, 'combat theme should be a short 16-second loop');
assert.ok(combat.peak <= 16000, 'combat theme master should remain restrained');

const bossSource = fs.readFileSync(path.join(root, 'src/boss-patch.js'), 'utf8');
assert.match(bossSource, /nativeMusic\.lobby.*raid-ambient\.wav/s);
assert.match(bossSource, /nativeMusic\.raid.*raid-combat\.wav/s);
assert.match(bossSource, /state\.mode === 'raid'.*namelessBlackoutTimer/s);
assert.match(bossSource, /player\.namelessBlackoutTimer = 0/);

const css = fs.readFileSync(path.join(root, 'styles/main.css'), 'utf8');
assert.match(css, /#resultOverlay\s*\{\s*z-index:\s*120/s);

console.log('PASS: short lobby/combat tracks, restrained combat volume, blackout cleanup, visible raid result.');
