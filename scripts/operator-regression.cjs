const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const BABYLON = require('../vendor/babylon.js');

const noop = () => {};
const canvasContext = {
  clearRect: noop, fillRect: noop, beginPath: noop, moveTo: noop, bezierCurveTo: noop, fill: noop,
  createRadialGradient: () => ({ addColorStop: noop }),
};
global.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return canvasContext; } };
const engine = new BABYLON.NullEngine();
const scene = new BABYLON.Scene(engine);
scene.activeCamera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 2, 0), scene);
const listeners = [];
const elements = new Map();
function element() {
  return { style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, appendChild: noop, addEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 }), querySelector: () => element() };
}
const context = {
  BABYLON, scene, console, performance, Math, Map, Set,
  state: { mode: 'raid', overlay: null, save: { selectedOperatorId: 'assault', engineerUnlocked: true }, input: { keys: new Set() } },
  window: { addEventListener: (name, callback) => { if (name === 'keydown') listeners.push(callback); }, setTimeout: () => { throw Error('Patch failed to initialize'); } },
  document: { getElementById: (id) => elements.get(id), createElement: element, addEventListener: noop, head: { appendChild: noop }, body: { appendChild: noop }, exitPointerLock: noop },
  refs: { canvas: element() }, viewModel: { recoil: 0 },
  L: (zh, en) => en, getOperatorDefs: () => ({ assault: { id: 'assault' }, medic: { id: 'medic' } }), getOperatorOrder: () => [], renderOperatorPanel: noop,
  setSelectedOperator: noop, renderBasePanel: noop, useOperatorAbility: noop, useOperatorUtility: noop,
  notify: noop, persistSave: noop, syncHud: noop, clearRaid: noop,
  moveEntityWithCollision: (entity, dx, dz) => { entity.x += dx; entity.z += dz; },
  lineOfSightBlocked: () => false, pointInsideObstaclePadding: () => false,
  resolveStaticPlacement: (x, z) => ({ x, z }),
  distance2D: (x, z, a, b) => Math.hypot(x - a, z - b),
  clamp: (x, a, b) => Math.max(a, Math.min(x, b)), lerp: (a, b, t) => a + (b - a) * t,
  spawnPulse: noop, spawnImpactBurst: noop, playImpactAudio: noop,
  obstacleDefs: [], PLAYABLE_HALF: 200,
  enemyShoot: (enemy) => { enemy.shots = (enemy.shots ?? 0) + 1; },
  beginMobilityAction: (enemy) => { enemy.mobilityAction = {}; return true; },
};
context.getPlayerOperatorDef = (p) => context.getOperatorDefs()[p.operatorId];
context.applyDamageToPlayer = (amount) => { context.state.raid.player.health -= amount; };
context.killEnemy = (enemy) => { if (enemy.dead) return; enemy.dead = true; enemy.health = 0; };
context.damageEnemy = (enemy, damage) => { enemy.health -= damage * (1 - (enemy.damageReduction ?? 0)); if (enemy.health <= 0) context.killEnemy(enemy); };
context.attemptShoot = () => { const p = context.state.raid.player; p.ammoInMag--; p.pitch -= 0.01; p.recoilKick += 1; context.viewModel.recoil += 1; };
context.updateEnemies = (dt) => { for (const enemy of context.state.raid.enemies) if (!enemy.dead) enemy.x += dt; };
context.updateRaid = (dt) => { const p = context.state.raid.player; p.abilityActiveTimer = Math.max(0, p.abilityActiveTimer - dt); context.updateEnemies(dt); };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/combat-rules.js'), 'utf8'), context);
const bossSource = fs.readFileSync(path.join(__dirname, '../src/boss-patch.js'), 'utf8');
context.triggerNamelessEnrage = noop;
context.BOSS_REGEN_INTERVAL = 5;
vm.runInContext(bossSource.slice(bossSource.indexOf('    const originalDamageEnemy = damageEnemy;'), bossSource.indexOf('    const originalKillEnemy = killEnemy;')), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/engineer-patch.js'), 'utf8'), context);
function raid(operatorId = 'engineer') {
  context.state.raid = { player: { operatorId, x: 0, z: 0, yaw: 0, pitch: 0, radius: 0.5, health: 1000, maxHealth: 1000, stamina: 100, maxStamina: 100, skillUses: 4, abilityActiveTimer: 0, utilityItems: 1, ammoInMag: 30, recoilKick: 0 }, enemies: [] };
  return context.state.raid;
}
function key(code) { for (const callback of listeners) callback({ code, preventDefault: noop, stopImmediatePropagation: noop }); }
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
let r = raid();
assert.equal(context.getOperatorDefs().assault.abilityDuration, 30);
assert.equal(context.getOperatorDefs().assault.killHeal, 60);
context.useOperatorUtility();
assert.equal(r.engineerBarriers.length, 1);
assert.ok(r.engineerBarriers[0].visual.root.getChildMeshes().length >= 12);
assert.ok(r.player.barrierDeployAction?.visual);
context.updateRaid(0.72);
assert.equal(r.player.barrierDeployAction, null);
close(r.engineerBarriers[0].visual.root.scaling.y, 1);
r.engineerBarriers = [];
context.attemptShoot();
close(r.player.recoilKick, 0.2);
close(r.player.pitch, -0.002);
close(context.viewModel.recoil, 0.2);
const enemy = { id: 'enemy', x: 10, z: 0, health: 1000 };
const boss = { id: 'boss', x: 15, z: 0, health: 1500, isNamelessBoss: true };
r.enemies.push(enemy, boss);
context.useOperatorAbility();
assert.equal(r.player.skillUses, 3);
assert.equal(r.player.abilityActiveTimer, 25);
assert.equal(boss.engineerStunTimer, 7);
context.useOperatorAbility();
assert.equal(r.player.skillUses, 3);
context.applyDamageToPlayer(300);
assert.equal(r.player.health, 800);
context.enemyShoot(boss);
assert.equal(boss.shots, undefined);
assert.equal(context.beginMobilityAction(boss), false);
context.updateRaid(7);
assert.equal(enemy.x, 10);
assert.equal(boss.x, 15);
context.updateRaid(0.1);
assert.ok(enemy.x > 10);
context.enemyShoot(boss);
assert.equal(boss.shots, 1);
boss.damageReduction = 0.18;
for (const utilityKind of ['grenade', 'support-smoke', 'incendiary']) {
  const before = boss.health;
  context.damageEnemy(boss, 500, { utilityKind });
  assert.equal(boss.health, before - 250);
  assert.equal(boss.damageReduction, 0.18);
}
assert.equal(boss.health, 750);
boss.enrageTimer = 10;
context.damageEnemy(boss, 500, { utilityKind: 'grenade' });
assert.equal(boss.health, 750);
boss.enrageTimer = 0;
context.damageEnemy(boss, 100);
assert.equal(boss.health, 668);
r.engineerBarriers = [{ x: 1, z: 0, heading: 0, length: 15, depth: 1 }];
context.moveEntityWithCollision(r.player, 1, 0, 0.5);
assert.equal(r.player.x, 1);
const blocked = { x: 0, z: -3 };
context.moveEntityWithCollision(blocked, 1, 3, 0.5);
assert.equal(blocked.z, -3);

r = raid('medic');
const target = { id: 'instant', x: 0.5, z: 0, health: 1000 };
r.enemies.push(target);
key('KeyB');
assert.equal(target.dead, true);
assert.equal(r.engineerExecution, undefined);
context.killEnemy(target);
assert.equal(r.player.benjaminKillCount, 1);
for (let i = 0; i < 4; i++) context.killEnemy({ health: 100 });
assert.equal(r.player.benjaminKillShieldTimer, 5);
context.applyDamageToPlayer(999);
assert.equal(r.player.health, 1000);
context.updateRaid(5);
context.applyDamageToPlayer(100);
assert.equal(r.player.health, 900);
for (let i = 0; i < 5; i++) context.killEnemy({ health: 100 });
assert.equal(r.player.benjaminKillShieldTimer, 5);

r = raid();
r.mouseWorldPointer = { clientX: 400, clientY: 600 };
scene.pick = () => ({ hit: true, pickedPoint: new BABYLON.Vector3(25, 0, 30), pickedMesh: { name: 'ground' } });
key('KeyI');
assert.ok(r.incendiaryTargeting);
assert.equal(r.player.incendiaryItems, 1);
key('KeyI');
assert.equal(r.player.incendiaryItems, 0);
assert.ok(r.player.incendiaryThrow.held.getChildMeshes().length >= 6);
context.updateRaid(0.5);
assert.ok(r.player.incendiaryThrow.projectile);
scene.pick = () => ({ hit: true, pickedPoint: new BABYLON.Vector3(-30, 0, -30), pickedMesh: { name: 'ground' } });
context.updateRaid(3);
assert.equal(r.player.incendiaryThrow, null);
assert.equal(r.incendiaryFields.length, 1);
const field = r.incendiaryFields[0];
assert.equal(field.x, 25);
assert.equal(field.z, 30);
assert.equal(field.systems.length, 2);
assert.ok(field.systems.every((system) => system.particleTexture && system.emitRate > 0));
assert.ok(field.light && field.light.intensity > 0);
const burning = { id: 'burning', x: 25, z: 30, health: 1000, damageReduction: 0.5 };
const burningBoss = { id: 'burning-boss', isNamelessBoss: true, x: 25, z: 30, health: 1500, damageReduction: 0.18 };
r.enemies.push(burning, burningBoss);
context.updateRaid(1);
assert.equal(burning.health, 900);
assert.equal(burningBoss.health, 1450);
assert.equal(burning.damageReduction, 0.5);
burning.x = 100;
burningBoss.x = 100;
context.updateRaid(3);
assert.equal(burning.health, 750);
assert.equal(burningBoss.health, 1375);
context.updateRaid(1);
assert.equal(burning.health, 750);
assert.equal(burningBoss.health, 1375);
assert.equal(r.incendiaryFields.length, 1);
context.updateRaid(60);
assert.equal(r.player.incendiaryItems, 2);
assert.equal(r.incendiaryFields.length, 1);
context.clearRaid();
assert.equal(field.root.isDisposed(), true);
assert.equal(scene.meshes.filter((mesh) => /incendiary|burning/.test(mesh.name)).length, 0);
r = raid('medic');
assert.equal(r.player.benjaminKillCount, undefined);
assert.equal(r.incendiaryFields, undefined);
engine.dispose();
console.log('PASS: profiles, recoil, skill cap, stun/recovery, protection, boss 50% utility resistance/enrage immunity, barriers, instant executions, kill rewards, throw geometry/locked target, burn ticks, persistence, resupply, cleanup.');
