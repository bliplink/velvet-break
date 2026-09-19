const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/boss-patch.js'), 'utf8');
const start = source.indexOf('    const updateBoss = (raid, dt) => {');
const end = source.indexOf('    const originalUpdateRaid = updateRaid;', start);
assert.ok(start >= 0 && end > start);

let shots = 0;
const boss = {
  isNamelessBoss: true, x: 0, z: 0, territoryX: 0, territoryZ: 0,
  health: 1500, maxHealth: 1500, regenTimer: 5, enrageTimer: 0,
  flashTimer: 10, tacticalTimer: 10, evasionTimer: 10, elbowTimer: 10,
  longFireRange: 46, directFireTimer: 0, shootCooldown: 0,
};
const raid = { player: { x: 12, z: 0, health: 1000 }, enemies: [boss] };
const context = {
  Math,
  ensureRaidAudio: () => null,
  syncNamelessBlackout: () => {},
  syncNativeMusicTheme: () => {},
  triggerNamelessEnrage: () => {},
  inBossTerritory: (enemy, x, z) => Math.hypot(x - enemy.territoryX, z - enemy.territoryZ) < 68,
  distance2D: (x, z, a, b) => Math.hypot(x - a, z - b),
  lineOfSightBlocked: () => false,
  enemyShoot: () => { shots++; },
  BOSS_REGEN_INTERVAL: 5,
  BOSS_REGEN_AMOUNT: 150,
  BOSS_DETECT_RANGE: 40,
  BOSS_RADIUS: 68,
  clamp: (value, low, high) => Math.max(low, Math.min(high, value)),
};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}\nthis.testUpdateBoss = updateBoss;`, context);

context.testUpdateBoss(raid, 0.1);
assert.equal(shots, 1, 'boss must shoot when the player is visible in his territory');
context.testUpdateBoss(raid, 0.1);
assert.equal(shots, 1, 'boss direct fire must obey cooldown');
boss.engineerStunTimer = 1;
boss.directFireTimer = 0;
context.testUpdateBoss(raid, 0.1);
assert.equal(shots, 1, 'stunned boss must not shoot');

console.log('PASS: Nameless fires in range, respects cooldown, and cannot fire while stunned.');
