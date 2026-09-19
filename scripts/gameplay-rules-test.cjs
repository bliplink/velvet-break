const assert = require('node:assert/strict');
const rules = require('../src/combat-rules.js');

const player = { x: 0, z: 0, radius: 0.42 };
const normalEnemy = { x: 1.8, z: 0, radius: 0.38, health: 100, maxHealth: 100 };
const groundFeet = () => 0;

assert.equal(rules.executionEligible(player, normalEnemy, groundFeet, () => false), true, 'nearby enemy should be executable');
assert.equal(rules.executionEligible(player, normalEnemy, groundFeet, () => true), false, 'walls must block executions');
assert.equal(rules.executionEligible(player, normalEnemy, (actor) => actor === player ? 0 : 1.25, () => false), false, 'different floors must block executions');

const boss = { ...normalEnemy, isNamelessBoss: true, health: 210, maxHealth: 1000 };
assert.equal(rules.executionEligible(player, boss, groundFeet, () => false), false, 'boss above 20% health must resist execution');
boss.health = 200;
assert.equal(rules.executionEligible(player, boss, groundFeet, () => false), true, 'boss at 20% health should be executable');
boss.enrageTimer = 1;
assert.equal(rules.executionEligible(player, boss, groundFeet, () => false), false, 'rage immunity must block boss execution');

const field = { x: 0, z: 0, y: 0, radius: rules.config.fireRadius };
const fireTarget = { x: 8, z: 0 };
assert.equal(rules.fireContains(field, fireTarget, groundFeet, () => false), true, 'target inside fire radius should burn');
assert.equal(rules.fireContains(field, fireTarget, groundFeet, () => true), false, 'walls must block fire damage');
assert.equal(rules.fireContains(field, fireTarget, () => 1.5, () => false), false, 'fire must not cross floors');

const scheduleA = rules.eventSchedule(rules.seededRandom(90210), 0.25);
const scheduleB = rules.eventSchedule(rules.seededRandom(90210), 0.25);
assert.deepEqual(scheduleA, scheduleB, 'same raid seed must produce the same event schedule');
assert.equal(scheduleA.length, 3, 'raid should schedule each event type once');
assert.equal(new Set(scheduleA.map((event) => event.type)).size, 3, 'event types should not repeat');
for (let index = 1; index < scheduleA.length; index += 1) {
  assert.ok(scheduleA[index].at - scheduleA[index - 1].at >= 40, 'events must be staggered');
}

const grid = new rules.SpatialGrid(20);
const itemA = { x: 2, z: 2 };
const itemB = { x: 70, z: 70 };
grid.add(itemA, 0);
grid.add(itemB, 0);
assert.deepEqual(grid.at(2, 2), [itemA], 'spatial lookup should ignore distant hazards');

const wall = { id: 'test-wall', x: 5, z: 0, w: 2, d: 6 };
assert.ok(rules.segmentRectEntry({ x: 0, z: 0 }, { x: 10, z: 0 }, wall, 0.5) != null, 'wall should intersect the direct route');
const elevatedWall = { ...wall, h: 5 };
assert.equal(rules.segmentRectHeightBlocked({ x: 0, z: 0 }, { x: 10, z: 0 }, elevatedWall, 1.5, 7.5), true,
  'a wall should block a rising sight line while it intersects the wall below its height');
assert.equal(rules.segmentRectHeightBlocked({ x: 0, z: 0 }, { x: 10, z: 0 }, elevatedWall, 7.5, 7.5), false,
  'a sight line passing above the wall should be clear');
assert.equal(rules.segmentRectHeightBlocked({ x: 0, z: 0 }, { x: 10, z: 0 }, elevatedWall, 7.5, 1.5), true,
  'a descending sight line should be blocked near its exit from the wall');
const detour = rules.chooseObstacleDetour(
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  [wall],
  0.7,
  (x, z, padding) => Math.abs(x - wall.x) < wall.w / 2 + padding && Math.abs(z - wall.z) < wall.d / 2 + padding,
  () => false,
);
assert.ok(detour && Math.abs(detour.z) > wall.d / 2, 'detour should route around a wall corner');

const maze = [
  { x: -3, z: -1, w: 2, d: 12 },
  { x: 5, z: 2, w: 2, d: 12 },
];
const start = { x: -12, z: 0 };
const destination = { x: 14, z: 0 };
const path = rules.findGroundPath(start, destination, maze, 30, 0.7, 2);
assert.ok(path?.length >= 2, 'multi-obstacle pathfinding should return waypoints');
for (let index = 0; index < path.length; index++) {
  const previous = index === 0 ? start : path[index - 1];
  assert.ok(maze.every((obstacle) => rules.segmentRectEntry(previous, path[index], obstacle, 0.7) == null),
    'every path segment must clear obstacle geometry');
}
assert.ok(Math.hypot(path.at(-1).x - destination.x, path.at(-1).z - destination.z) < 2,
  'path should reach the destination');

const building = { id: 'test-building', x: 0, z: 0, w: 10, d: 8, h: 6 };
const roofMesh = { name: 'roof-test-building' };
const wallMesh = { name: 'test-building', metadata: { obstacleId: building.id } };
const pick = (mesh, y, normalY = 0) => ({ hit: true, pickedMesh: mesh, pickedPoint: { x: 2, y, z: 1 }, getNormal: () => ({ y: normalY }) });
assert.equal(rules.classifyWarpSurface(pick(roofMesh, 6.3, 1), [building], () => true)?.obstacle, building,
  'visible roof surface should accept warp');
assert.equal(rules.classifyWarpSurface(pick(wallMesh, 5.7), [building], () => true)?.obstacle, building,
  'visible upper wall edge should resolve to roof');
assert.equal(rules.classifyWarpSurface(pick(wallMesh, 2), [building], () => true), null,
  'mid-wall hit must not teleport into the building');
assert.equal(rules.classifyWarpSurface(pick(roofMesh, 6.1, -1), [building], () => true), null,
  'roof underside must not count as a visible rooftop');
assert.equal(rules.classifyWarpSurface(pick(wallMesh, 5.9), [building], () => false), null,
  'buildings without roof geometry must reject rooftop warp');

console.log('PASS: execution geometry, boss threshold, fire occlusion, deterministic events, paths, rooftop warp surfaces.');
