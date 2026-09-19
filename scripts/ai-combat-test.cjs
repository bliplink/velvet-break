const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const wall = { id: 'wall', x: 2, z: 0, w: 1, d: 6, h: 4 };
const notices = [];
const context = {
  console,
  Math,
  Map,
  Set,
  window: { setTimeout: () => { throw new Error('AI patch failed to boot'); } },
  state: { raid: { player: { operatorId: 'engineer', x: 8, z: 0, health: 900, maxHealth: 1000 }, enemies: [] } },
  PLAYABLE_HALF: 130,
  obstacleDefs: [wall],
  L: (zh, en) => en,
  notify: (message) => notices.push(message),
  distance2D: (x, z, a, b) => Math.hypot(x - a, z - b),
  normalize2D: (x, z) => { const length = Math.hypot(x, z); return length ? { x: x / length, z: z / length } : { x: 0, z: 0 }; },
  pointInsideObstaclePadding: (x, z, padding = 0) => Math.abs(x - wall.x) < wall.w / 2 + padding && Math.abs(z - wall.z) < wall.d / 2 + padding,
  resolveStaticPlacement: (x, z) => ({ x, z }),
};
context.createEnemy = (spawn, index) => ({
  id: `enemy-${index}`, type: 'scout', x: spawn.x, z: spawn.z, radius: 0.7,
  health: 100, maxHealth: 100, damage: 10, speed: 3, preferredRange: 15,
  longFireRange: 24, detectRange: 25, fireInterval: 1, shotBurst: 1,
  accuracyBonus: 0, combatSpeedMult: 1, route: spawn.route ?? [{ x: spawn.x, z: spawn.z }], routeIndex: 0,
});
context.lineOfSightBlocked = (ax, az, bx, bz) => context.window.SDRCombat.segmentRectEntry({ x: ax, z: az }, { x: bx, z: bz }, wall, 0) != null;
context.moveEntityWithCollision = (entity, dx, dz) => {
  const x = entity.x + dx;
  const z = entity.z + dz;
  if (!context.pointInsideObstaclePadding(x, z, entity.radius ?? 0)) { entity.x = x; entity.z = z; }
};
context.beginMobilityAction = (actor, type, dx, dz, options = {}) => {
  actor.mobilityAction = { type, speed: options.speed ?? 8 };
  actor.mobilityCooldown = options.cooldown ?? 1;
  return true;
};
context.lastShotOptions = null;
context.enemyShoot = (_enemy, options) => { context.lastShotOptions = options; };
context.animateRaidEntities = () => {};
context.getEnemyAimPoint = (enemy) => ({ x: enemy.x, y: 1.78, z: enemy.z });
context.damageEnemy = (enemy, damage) => { enemy.health -= damage; if (enemy.health <= 0) enemy.dead = true; };
context.updateEnemies = () => {};
context.updateRaid = (dt) => context.updateEnemies(dt);

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/combat-rules.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/ai-combat-patch.js'), 'utf8'), context);

const normal = context.createEnemy({ x: 0, z: 0, route: [{ x: 0, z: 0 }] }, 1);
assert.equal(normal.maxHealth, 135);
assert.ok(normal.detectRange >= 30 && normal.longFireRange > 30 && normal.accuracyBonus >= 0.1);

const boss = context.createEnemy({ x: -5, z: 0, route: [{ x: -5, z: 0 }] }, 2);
Object.assign(boss, { isNamelessBoss: true, health: 1500, maxHealth: 1500, damage: 30, speed: 5, fireInterval: 0.42, shotBurst: 4, accuracyBonus: 0.23, territoryX: -5, territoryZ: 0 });
context.state.raid.enemies.push(normal, boss);
context.updateRaid(0.016);
assert.equal(boss.maxHealth, 1500, 'Nameless health must not be increased');
assert.ok(boss.damage >= 36 && boss.detectRange >= 50 && boss.shotBurst >= 5);

const minion = context.createEnemy({ x: -4, z: 8, route: [{ x: -4, z: 8 }] }, 3);
Object.assign(minion, { isNamelessMinion: true, health: 180, maxHealth: 180, damage: 18 });
context.window.__sdrAiCombatDebug.strengthenEnemy(minion);
context.window.__sdrAiCombatDebug.strengthenEnemy(minion);
assert.equal(minion.maxHealth, 180, 'minion health must not stack normal and guard buffs');
assert.equal(minion.damage, 12);
assert.equal(minion.shotBurst, 1);

context.enemyShoot(boss, {});
assert.ok(context.lastShotOptions.accuracyMult > 1 && context.lastShotOptions.missSpread < 1.8);
context.enemyShoot(boss, { maxHitChance: 0.82 });
assert.equal(context.lastShotOptions.maxHitChance, 0.82, 'boss shot cap must respect tactical fire limit');
context.enemyShoot(minion, {});
assert.equal(context.lastShotOptions.maxHitChance, 0.72, 'guards must not inherit elite accuracy');

const blocked = { id: 'enemy-blocked', x: 1.15, z: 0, radius: 0.3 };
context.moveEntityWithCollision(blocked, 0.8, 0, blocked.radius);
assert.ok(Math.abs(blocked.z) > 0.1, 'blocked enemy should take a tangent route instead of freezing');

const cover = context.window.__sdrAiCombatDebug.findCoverTarget({ x: 0, z: 0, radius: 0.3, health: 50, maxHealth: 100 }, context.state.raid.player);
assert.ok(cover && context.lineOfSightBlocked(context.state.raid.player.x, context.state.raid.player.z, cover.x, cover.z), 'enemy should choose reachable cover outside player line of sight');

const groundPlayer = context.state.raid.player;
const rooftopPlayer = { operatorId: 'engineer', x: 2, z: 0, health: 900, maxHealth: 1000, onRoofBuildingId: 'wall' };
const rooftopShooter = { id: 'roof-shooter', x: -2, z: 0, health: 100 };
context.state.raid.player = rooftopPlayer;
context.state.raid.enemies.push(rooftopShooter);
assert.equal(context.lineOfSightBlocked(rooftopShooter.x, rooftopShooter.z, rooftopPlayer.x, rooftopPlayer.z), false, 'an enemy must have elevated line of sight to a player on a roof');
context.state.raid.player = groundPlayer;

const target = { id: 'target', health: 20, maxHealth: 20, dead: false };
context.damageEnemy(target, 30, {});
assert.equal(context.state.raid.player.health, 930);
const utilityTarget = { id: 'utility-target', health: 20, maxHealth: 20, dead: false };
context.damageEnemy(utilityTarget, 30, { utilityKind: 'incendiary' });
assert.equal(context.state.raid.player.health, 930, 'utility kills must not trigger Yanfei gun healing');

const roof = { id: 'test-roof', x: 20, z: 0, w: 10, d: 10, h: 5 };
context.obstacleDefs.push(roof);
context.window.__sdrStructureRegistry = { stairs: [{ obstacleId: roof.id, x: 14, z: 0, dirX: 1, dirZ: 0, run: 2, stepCount: 6 }] };
const climber = context.createEnemy({ x: 13.1, z: 0, route: [{ x: 13.1, z: 0 }] }, 4);
Object.assign(climber, { alertTimer: 10, investigateTimer: 10, combatState: 'engage', visual: { root: { position: { y: 0 } } } });
context.state.raid.enemies = [climber];
context.state.raid.player = { x: 20, z: 0, onRoofBuildingId: roof.id, health: 1000, maxHealth: 1000 };
context.updateEnemies(0.1);
assert.ok(climber.stairAction?.ascending, 'ground enemy should start climbing toward a rooftop player');
for (let step = 0; step < 50; step++) context.updateEnemies(0.1);
assert.equal(climber.onRoofBuildingId, roof.id);
context.animateRaidEntities(0.1);
assert.ok(climber.visual.root.position.y >= roof.h, 'enemy model should render on the rooftop');
assert.ok(context.getEnemyAimPoint(climber).y > roof.h, 'enemy shots should originate on the rooftop');
context.state.raid.player = { x: 13, z: 0, onRoofBuildingId: null, health: 1000, maxHealth: 1000 };
context.updateEnemies(0.1);
assert.ok(climber.stairAction && !climber.stairAction.ascending, 'rooftop enemy should start descending toward a ground player');
for (let step = 0; step < 50; step++) context.updateEnemies(0.1);
assert.equal(climber.onRoofBuildingId, null);

console.log('PASS: enemy combat, steering, cover, rooftop sight, Yanfei heal, and NPC stair ascent/descent.');
