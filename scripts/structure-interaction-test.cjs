const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/structure-interaction-patch.js'), 'utf8');
const start = source.indexOf('    const getNearestCustomInteraction = (player) => {');
const end = source.indexOf('    const originalGetCurrentInteraction = getCurrentInteraction;', start);
assert.ok(start >= 0 && end > start);
const stair = { obstacleId: 'building', x: 8, z: 0 };
const context = {
  Number,
  registry: { doors: [], windows: [], ladders: [], stairs: [stair] },
  DOOR_INTERACT_RADIUS: 2.1,
  WINDOW_INTERACT_RADIUS: 2.3,
  LADDER_INTERACT_RADIUS: 2.1,
  STAIRS_INTERACT_RADIUS: 2.4,
  distance2D: (x, z, a, b) => Math.hypot(x - a, z - b),
  getLadderTraverseTarget: () => ({ x: 0, z: 0 }),
  getStairRoofTarget: () => ({ x: 3, z: 0 }),
};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}\nthis.findStair = getNearestCustomInteraction;`, context);
assert.equal(context.findStair({ x: 8, z: 0 })?.type, 'stairs', 'ground player can use stair base');
assert.equal(context.findStair({ x: 3, z: 0, onRoofBuildingId: 'building' })?.type, 'stairs',
  'rooftop player can descend at the roof exit, not the ground base');
assert.equal(context.findStair({ x: 3, z: 0, onRoofBuildingId: 'other' }), null,
  'stairs on another building must not be available from the roof');
console.log('PASS: stair interaction works at both ground base and rooftop exit.');
