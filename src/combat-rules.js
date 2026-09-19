(function (root) {
  const config = Object.freeze({ executionRange: 2.2, executionHeight: 1.1, bossExecutionFraction: 0.2, fireRadius: 20, fireInsideDamage: 100, fireOutsideDamage: 50, fireAfterburn: 3, fireFlames: 48 });
  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let n = Math.imul(value ^ value >>> 15, value | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  class SpatialGrid {
    constructor(size = 40) { this.size = size; this.cells = new Map(); }
    add(item, radius = config.fireRadius) {
      for (let x = Math.floor((item.x - radius) / this.size); x <= Math.floor((item.x + radius) / this.size); x++) {
        for (let z = Math.floor((item.z - radius) / this.size); z <= Math.floor((item.z + radius) / this.size); z++) {
          const key = `${x}:${z}`;
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(item);
        }
      }
    }
    at(x, z) { return this.cells.get(`${Math.floor(x / this.size)}:${Math.floor(z / this.size)}`) ?? []; }
  }
  function executionEligible(player, enemy, feet, blocked) {
    if (!player || !enemy || player.health <= 0 || enemy.dead || enemy.despawned || enemy.isRangeTarget) return false;
    if (player.utilityAction || player.incendiaryThrow || player.useAction || player.mobilityAction || player.reloadTimer > 0 || player.dropTimer > 0) return false;
    if (Math.hypot(player.x - enemy.x, player.z - enemy.z) > config.executionRange || Math.abs(feet(player) - feet(enemy)) > config.executionHeight) return false;
    if (enemy.isNamelessBoss && (enemy.enrageTimer > 0 || enemy.health > enemy.maxHealth * config.bossExecutionFraction)) return false;
    return !blocked({ x: player.x, y: feet(player) + 0.9, z: player.z }, { x: enemy.x, y: feet(enemy) + 0.9, z: enemy.z });
  }
  function fireContains(field, enemy, feet, blocked) {
    if (Math.abs(feet(enemy) - field.y) > 1.2 || Math.hypot(field.x - enemy.x, field.z - enemy.z) > config.fireRadius) return false;
    return !blocked({ x: field.x, y: field.y + 0.4, z: field.z }, { x: enemy.x, y: feet(enemy) + 0.4, z: enemy.z });
  }
  function eventSchedule(random, loadRatio = 0) {
    const order = ['airdrop', 'cache', 'patrol'];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let time = 30 + random() * 25 + Math.min(1, loadRatio) * 15;
    return order.map(type => { const event = { type, at: time }; time += 40 + random() * 35; return event; });
  }
  function segmentRectEntry(from, to, rect, padding = 0) {
    const minX = rect.x - rect.w / 2 - padding;
    const maxX = rect.x + rect.w / 2 + padding;
    const minZ = rect.z - rect.d / 2 - padding;
    const maxZ = rect.z + rect.d / 2 + padding;
    let near = 0;
    let far = 1;
    for (const [origin, delta, min, max] of [[from.x, to.x - from.x, minX, maxX], [from.z, to.z - from.z, minZ, maxZ]]) {
      if (Math.abs(delta) < 1e-7) {
        if (origin < min || origin > max) return null;
        continue;
      }
      const first = (min - origin) / delta;
      const second = (max - origin) / delta;
      near = Math.max(near, Math.min(first, second));
      far = Math.min(far, Math.max(first, second));
      if (near > far) return null;
    }
    return far > 0 && near < 1 ? Math.max(0, near) : null;
  }
  function segmentRectHeightBlocked(from, to, rect, startY, endY, padding = 0) {
    let near = 0;
    let far = 1;
    for (const [origin, delta, min, max] of [
      [from.x, to.x - from.x, rect.x - rect.w / 2 - padding, rect.x + rect.w / 2 + padding],
      [from.z, to.z - from.z, rect.z - rect.d / 2 - padding, rect.z + rect.d / 2 + padding],
    ]) {
      if (Math.abs(delta) < 1e-7) {
        if (origin < min || origin > max) return false;
        continue;
      }
      const first = (min - origin) / delta;
      const second = (max - origin) / delta;
      near = Math.max(near, Math.min(first, second));
      far = Math.min(far, Math.max(first, second));
      if (near > far) return false;
    }
    if (far <= 0 || near >= 1) return false;
    const lowestY = startY + (endY - startY) * (endY < startY ? far : near);
    return lowestY <= (rect.h ?? 3) + 0.12;
  }
  function chooseObstacleDetour(from, to, obstacles, padding = 1, pointBlocked = () => false, segmentBlocked = () => false) {
    const hit = obstacles
      .map(rect => ({ rect, entry: segmentRectEntry(from, to, rect, padding) }))
      .filter(candidate => candidate.entry != null)
      .sort((left, right) => left.entry - right.entry)[0];
    if (!hit) return null;
    const margin = padding + 0.75;
    const rect = hit.rect;
    const corners = [
      { x: rect.x - rect.w / 2 - margin, z: rect.z - rect.d / 2 - margin },
      { x: rect.x - rect.w / 2 - margin, z: rect.z + rect.d / 2 + margin },
      { x: rect.x + rect.w / 2 + margin, z: rect.z - rect.d / 2 - margin },
      { x: rect.x + rect.w / 2 + margin, z: rect.z + rect.d / 2 + margin },
    ].filter(point => !pointBlocked(point.x, point.z, padding * 0.45));
    corners.sort((left, right) => {
      const leftCost = Math.hypot(left.x - from.x, left.z - from.z) + Math.hypot(to.x - left.x, to.z - left.z) + (segmentBlocked(from.x, from.z, left.x, left.z) ? 1000 : 0);
      const rightCost = Math.hypot(right.x - from.x, right.z - from.z) + Math.hypot(to.x - right.x, to.z - right.z) + (segmentBlocked(from.x, from.z, right.x, right.z) ? 1000 : 0);
      return leftCost - rightCost;
    });
    return corners[0] ? { ...corners[0], obstacleId: rect.id ?? '' } : null;
  }
  function findGroundPath(from, to, obstacles, worldHalf, padding = 1, cellSize = 4, maxNodes = 2600) {
    const blockedSegment = (a, b) => obstacles.some((rect) => segmentRectEntry(a, b, rect, padding) != null);
    if (!blockedSegment(from, to)) return [to];
    const cell = (value) => Math.round(value / cellSize);
    const start = { x: cell(from.x), z: cell(from.z) };
    const goal = { x: cell(to.x), z: cell(to.z) };
    const bound = Math.floor((worldHalf - padding) / cellSize);
    const key = (x, z) => `${x}:${z}`;
    const blockedCache = new Map();
    const blockedCell = (x, z) => {
      const id = key(x, z);
      if (blockedCache.has(id)) return blockedCache.get(id);
      const blocked = Math.abs(x) > bound || Math.abs(z) > bound || obstacles.some((rect) =>
        x * cellSize > rect.x - rect.w / 2 - padding && x * cellSize < rect.x + rect.w / 2 + padding &&
        z * cellSize > rect.z - rect.d / 2 - padding && z * cellSize < rect.z + rect.d / 2 + padding);
      blockedCache.set(id, blocked);
      return blocked;
    };
    let reachableGoal = goal;
    if (blockedCell(goal.x, goal.z)) {
      const candidates = [];
      for (let radius = 1; radius <= 5; radius++) {
        for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius || blockedCell(goal.x + dx, goal.z + dz)) continue;
          candidates.push({ x: goal.x + dx, z: goal.z + dz });
        }
        if (candidates.length) break;
      }
      if (!candidates.length) return null;
      candidates.sort((a, b) => Math.hypot(a.x - start.x, a.z - start.z) - Math.hypot(b.x - start.x, b.z - start.z));
      reachableGoal = candidates[0];
    }
    const nodes = new Map();
    const open = [];
    const startNode = { ...start, g: 0, f: Math.hypot(start.x - reachableGoal.x, start.z - reachableGoal.z), parent: null, closed: false };
    nodes.set(key(start.x, start.z), startNode);
    open.push(startNode);
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let explored = 0;
    while (open.length && explored++ < maxNodes) {
      let best = 0;
      for (let index = 1; index < open.length; index++) if (open[index].f < open[best].f) best = index;
      const current = open.splice(best, 1)[0];
      if (current.closed) continue;
      current.closed = true;
      if (current.x === reachableGoal.x && current.z === reachableGoal.z) {
        const cells = [];
        for (let node = current; node?.parent; node = node.parent) cells.push({ x: node.x * cellSize, z: node.z * cellSize });
        cells.reverse();
        const result = [];
        let anchor = from;
        for (let index = 0; index < cells.length;) {
          let furthest = index;
          for (let lookahead = index + 1; lookahead < cells.length; lookahead++) {
            if (blockedSegment(anchor, cells[lookahead])) break;
            furthest = lookahead;
          }
          result.push(cells[furthest]);
          anchor = cells[furthest];
          index = furthest + 1;
        }
        if (reachableGoal === goal && !blockedSegment(anchor, to)) result.push(to);
        return result;
      }
      for (const [dx, dz] of directions) {
        const x = current.x + dx;
        const z = current.z + dz;
        if (blockedCell(x, z) || (dx && dz && (blockedCell(current.x + dx, current.z) || blockedCell(current.x, current.z + dz)))) continue;
        const id = key(x, z);
        const distance = current.g + Math.hypot(dx, dz);
        const existing = nodes.get(id);
        if (existing && distance >= existing.g) continue;
        const node = { x, z, g: distance, f: distance + Math.hypot(x - reachableGoal.x, z - reachableGoal.z), parent: current, closed: false };
        nodes.set(id, node);
        open.push(node);
      }
    }
    return null;
  }
  function classifyWarpSurface(hit, obstacles, hasRoofMesh) {
    const point = hit?.pickedPoint;
    const mesh = hit?.pickedMesh;
    if (!hit?.hit || !point || !mesh) return null;
    if (mesh.name === 'ground') return { obstacle: null, x: point.x, z: point.z };
    const roof = obstacles.find((entry) => mesh.name === `roof-${entry.id}`);
    if (roof && hasRoofMesh(roof.id) && (hit.getNormal?.(true)?.y ?? 0) > 0.45) {
      return { obstacle: roof, x: point.x, z: point.z };
    }
    const wall = obstacles.find((entry) => entry.id === mesh.metadata?.obstacleId);
    if (wall && hasRoofMesh(wall.id) && point.y >= wall.h - 0.55 && point.y <= wall.h + 0.15) {
      return { obstacle: wall, x: point.x, z: point.z };
    }
    return null;
  }
  const api = { config, seededRandom, SpatialGrid, executionEligible, fireContains, eventSchedule, segmentRectEntry, segmentRectHeightBlocked, chooseObstacleDetour, findGroundPath, classifyWarpSurface };
  root.SDRCombat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
