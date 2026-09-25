(() => {
  if (window.__sdrAiCombatPatchApplied || window.__sdrAiCombatPatchWaiting) return;

  const boot = () => {
    if (
      typeof state === 'undefined' || typeof createEnemy === 'undefined' ||
      typeof updateEnemies === 'undefined' || typeof updateRaid === 'undefined' ||
      typeof moveEntityWithCollision === 'undefined' || typeof beginMobilityAction === 'undefined' ||
      typeof enemyShoot === 'undefined' || typeof damageEnemy === 'undefined' ||
      typeof animateRaidEntities === 'undefined' || typeof getEnemyAimPoint === 'undefined' ||
      typeof obstacleDefs === 'undefined' || typeof pointInsideObstaclePadding === 'undefined' ||
      typeof lineOfSightBlocked === 'undefined' || typeof resolveStaticPlacement === 'undefined' ||
      typeof distance2D === 'undefined' || typeof normalize2D === 'undefined' || !window.SDRCombat
    ) {
      window.__sdrAiCombatPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrAiCombatPatchWaiting = false;
    if (window.__sdrAiCombatPatchApplied) return;
    window.__sdrAiCombatPatchApplied = true;

    const rules = window.SDRCombat;
    const isEnemyActor = (actor) => Boolean(actor && actor !== state.raid?.player && !actor.isRangeTarget);

    const actorAtPoint = (x, z) => {
      const raid = state.raid;
      if (!raid) return null;
      if (raid.player && distance2D(x, z, raid.player.x, raid.player.z) < 0.2) return raid.player;
      return raid.enemies?.find((enemy) => !enemy.dead && distance2D(x, z, enemy.x, enemy.z) < 0.2) ?? null;
    };

    const actorEyeHeight = (actor) => {
      if (!actor) return 1.25;
      const roof = actor.onRoofBuildingId
        ? obstacleDefs.find((obstacle) => obstacle.id === actor.onRoofBuildingId)
        : null;
      const stance = actor.isProne ? 0.42 : actor.isCrouching ? 0.88 : 1.42;
      return (roof?.h ?? 0) + stance;
    };

    const sightBeforeRoofCombat = lineOfSightBlocked;
    lineOfSightBlocked = function roofAwareLineOfSight(ax, az, bx, bz) {
      const fromActor = actorAtPoint(ax, az);
      const toActor = actorAtPoint(bx, bz);
      if (!fromActor?.onRoofBuildingId && !toActor?.onRoofBuildingId) {
        return sightBeforeRoofCombat(ax, az, bx, bz);
      }
      const startY = actorEyeHeight(fromActor);
      const endY = actorEyeHeight(toActor);
      const from = { x: ax, z: az };
      const to = { x: bx, z: bz };
      for (const obstacle of obstacleDefs) {
        if (rules.segmentRectHeightBlocked(from, to, obstacle, startY, endY)) return true;
      }
      for (const barrier of state.raid?.engineerBarriers ?? []) {
        const cosine = Math.cos(barrier.heading);
        const sine = Math.sin(barrier.heading);
        const local = (x, z) => ({ x: cosine * (x - barrier.x) - sine * (z - barrier.z), z: sine * (x - barrier.x) + cosine * (z - barrier.z) });
        if (rules.segmentRectHeightBlocked(local(ax, az), local(bx, bz),
          { x: 0, z: 0, w: barrier.length, d: barrier.depth, h: 3 }, startY, endY, 0.02)) return true;
      }
      return false;
    };

    const strengthenEnemy = (enemy) => {
      if (!enemy || enemy.isRangeTarget) return enemy;
      if (enemy.isNamelessBoss) {
        if (enemy.aiStrengthProfile === 'boss') return enemy;
        enemy.aiStrengthProfile = 'boss';
        // Boss health deliberately remains operator-dependent (2,000 for Kai, 1,500 otherwise).
        enemy.damage = Math.max(36, enemy.damage ?? 0);
        enemy.speed = Math.max(6.4, enemy.speed ?? 0);
        enemy.preferredRange = Math.max(35, enemy.preferredRange ?? 0);
        enemy.longFireRange = Math.max(46, enemy.longFireRange ?? 0);
        enemy.detectRange = Math.max(50, enemy.detectRange ?? 0);
        enemy.fireInterval = Math.min(0.32, enemy.fireInterval ?? 0.32);
        enemy.shotBurst = Math.max(5, enemy.shotBurst ?? 1);
        enemy.accuracyBonus = Math.max(0.36, enemy.accuracyBonus ?? 0);
        enemy.combatSpeedMult = Math.max(1.32, enemy.combatSpeedMult ?? 1);
        return enemy;
      }
      if (enemy.isNamelessMinion) {
        if (enemy.aiStrengthProfile !== 'minion') {
          enemy.aiStrengthProfile = 'minion';
          enemy.maxHealth = 180;
          enemy.health = Math.min(enemy.health ?? 180, 180);
          enemy.damage = 12;
          enemy.speed = 4.25;
          enemy.detectRange = 30;
          enemy.preferredRange = 16;
          enemy.longFireRange = 24;
          enemy.fireInterval = 1.25;
          enemy.shotBurst = 1;
          enemy.accuracyBonus = 0.02;
        }
        return enemy;
      }
      if (enemy.aiStrengthProfile === 'normal') return enemy;
      enemy.aiStrengthProfile = 'normal';
      const ratio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
      enemy.maxHealth = Math.round((enemy.maxHealth ?? enemy.health ?? 100) * 1.35);
      enemy.health = Math.round(enemy.maxHealth * ratio);
      enemy.damage = Math.round((enemy.damage ?? 10) * 1.18);
      enemy.speed = (enemy.speed ?? 2.5) * 1.28;
      enemy.preferredRange = (enemy.preferredRange ?? 16) * 1.18;
      enemy.longFireRange = Math.max((enemy.longFireRange ?? enemy.preferredRange) * 1.3, enemy.preferredRange * 1.42);
      enemy.detectRange = (enemy.detectRange ?? 28) * 1.2;
      enemy.fireInterval = (enemy.fireInterval ?? 1) * 0.86;
      enemy.accuracyBonus = (enemy.accuracyBonus ?? 0) + 0.1;
      enemy.combatSpeedMult = (enemy.combatSpeedMult ?? 1) * 1.18;
      enemy.shotBurst = Math.max(enemy.shotBurst ?? 1, enemy.type === 'hunter' ? 3 : 2);
      return enemy;
    };

    const createEnemyBeforeReview = createEnemy;
    createEnemy = function createStrengthenedEnemy(spawn, index) {
      return strengthenEnemy(createEnemyBeforeReview(spawn, index));
    };

    const moveBeforeNavigation = moveEntityWithCollision;
    moveEntityWithCollision = function moveWithCollisionSteering(entity, dx, dz, radius) {
      if (!isEnemyActor(entity) || (entity.engineerStunTimer ?? 0) > 0) {
        return moveBeforeNavigation(entity, dx, dz, radius);
      }
      const requested = Math.hypot(dx, dz);
      if (requested < 1e-6) return moveBeforeNavigation(entity, dx, dz, radius);
      let moveX = dx;
      let moveZ = dz;
      if ((entity.navAvoidFrames ?? 0) > 0 && !entity.mobilityAction) {
        entity.navAvoidFrames--;
        const angle = (entity.navAvoidSide ?? 1) * 0.88;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        moveX = dx * cosine - dz * sine;
        moveZ = dx * sine + dz * cosine;
      }
      const beforeX = entity.x;
      const beforeZ = entity.z;
      moveBeforeNavigation(entity, moveX, moveZ, radius);
      const moved = Math.hypot(entity.x - beforeX, entity.z - beforeZ);
      if (moved >= requested * 0.28 || entity.mobilityAction) return;

      const candidates = [entity.navAvoidSide ?? 1, -(entity.navAvoidSide ?? 1)];
      let best = { x: entity.x, z: entity.z, moved };
      let bestSide = candidates[0];
      for (const side of candidates) {
        entity.x = beforeX;
        entity.z = beforeZ;
        const tangentX = -dz / requested * requested * side;
        const tangentZ = dx / requested * requested * side;
        moveBeforeNavigation(entity, tangentX, tangentZ, radius);
        const tangentMoved = Math.hypot(entity.x - beforeX, entity.z - beforeZ);
        if (tangentMoved > best.moved) {
          best = { x: entity.x, z: entity.z, moved: tangentMoved };
          bestSide = side;
        }
      }
      entity.x = best.x;
      entity.z = best.z;
      entity.navAvoidSide = bestSide;
      entity.navAvoidFrames = best.moved > 0.01 ? 18 : 6;
      if (best.moved <= 0.01 && entity.mobilityAction) entity.mobilityAction = null;
    };

    const mobilityBeforeReview = beginMobilityAction;
    beginMobilityAction = function beginStrengthenedEnemyMobility(actor, ...args) {
      const started = mobilityBeforeReview(actor, ...args);
      if (started && isEnemyActor(actor) && actor.mobilityAction) {
        actor.mobilityAction.speed *= actor.isNamelessBoss ? 1.24 : 1.14;
        actor.mobilityCooldown *= actor.isNamelessBoss ? 0.62 : 0.74;
      }
      return started;
    };

    const shootBeforeReview = enemyShoot;
    enemyShoot = function strengthenedEnemyShot(enemy, options = {}) {
      const boss = Boolean(enemy?.isNamelessBoss);
      const minion = Boolean(enemy?.isNamelessMinion);
      const hitCap = boss ? 0.96 : minion ? 0.72 : 0.94;
      return shootBeforeReview(enemy, {
        ...options,
        accuracyMult: (options.accuracyMult ?? 1) * (boss ? 1.18 : minion ? 0.88 : 1.1),
        missSpread: (options.missSpread ?? 1.8) * (boss ? 0.62 : minion ? 1.12 : 0.76),
        minHitChance: Math.min(hitCap, Math.max(options.minHitChance ?? 0, boss ? 0.5 : minion ? 0.25 : 0.41)),
        maxHitChance: Math.min(hitCap, options.maxHitChance ?? hitCap),
      });
    };

    const ensurePatrolRoute = (enemy) => {
      if ((enemy.route?.length ?? 0) > 1 || enemy.dead || enemy.isRangeTarget) return;
      const centerX = enemy.isNamelessBoss ? enemy.territoryX : enemy.x;
      const centerZ = enemy.isNamelessBoss ? enemy.territoryZ : enemy.z;
      const radius = enemy.isNamelessBoss ? 16 : enemy.isNamelessMinion ? 12 : 14;
      const route = [];
      for (let index = 0; index < 12 && route.length < 5; index++) {
        const angle = index * Math.PI / 4 + (enemy.heading ?? 0) * 0.15;
        const point = resolveStaticPlacement(centerX + Math.cos(angle) * radius, centerZ + Math.sin(angle) * radius, (enemy.radius ?? 0.7) + 0.35);
        const boss = state.raid?.enemies?.find((entry) => entry.isNamelessBoss && !entry.dead);
        const insideBossArea = boss && distance2D(point.x, point.z, boss.territoryX, boss.territoryZ) < boss.territoryRadius - 1.5;
        if (!pointInsideObstaclePadding(point.x, point.z, (enemy.radius ?? 0.7) * 0.5)
          && (!boss || enemy.isNamelessBoss || enemy.isNamelessMinion || !insideBossArea)
          && (!enemy.isNamelessMinion || insideBossArea)) route.push(point);
      }
      if (route.length > 1) {
        enemy.route = route;
        enemy.routeIndex = 0;
      }
    };

    const findCoverTarget = (enemy, player = state.raid?.player) => {
      if (!enemy || !player || enemy.isNamelessBoss || enemy.isRangeTarget) return null;
      const padding = (enemy.radius ?? 0.7) + 0.7;
      const candidates = [];
      for (const obstacle of obstacleDefs) {
        const nearDistance = distance2D(enemy.x, enemy.z, obstacle.x, obstacle.z);
        if (nearDistance > 22) continue;
        const halfW = obstacle.w / 2 + padding;
        const halfD = obstacle.d / 2 + padding;
        for (const point of [
          { x: obstacle.x - halfW, z: obstacle.z - halfD },
          { x: obstacle.x - halfW, z: obstacle.z + halfD },
          { x: obstacle.x + halfW, z: obstacle.z - halfD },
          { x: obstacle.x + halfW, z: obstacle.z + halfD },
        ]) {
          if (pointInsideObstaclePadding(point.x, point.z, enemy.radius ?? 0.7)) continue;
          if (lineOfSightBlocked(enemy.x, enemy.z, point.x, point.z)) continue;
          if (!lineOfSightBlocked(player.x, player.z, point.x, point.z)) continue;
          const travel = distance2D(enemy.x, enemy.z, point.x, point.z);
          const playerDistance = distance2D(player.x, player.z, point.x, point.z);
          candidates.push({ ...point, score: travel - Math.min(8, playerDistance * 0.12) });
        }
      }
      candidates.sort((left, right) => left.score - right.score);
      return candidates[0] ? { x: candidates[0].x, z: candidates[0].z, timer: 3.6 } : null;
    };

    const updateEnemiesBeforeNavigation = updateEnemies;
    const groundBlocked = (from, to, padding = 0.8) => obstacleDefs.some((obstacle) =>
      rules.segmentRectEntry(from, to, obstacle, padding) != null);
    const getGroundTarget = (enemy, target, player) => {
      let goal = target;
      if (player?.onRoofBuildingId && target.x === player.x && target.z === player.z) {
        const roof = obstacleDefs.find((obstacle) => obstacle.id === player.onRoofBuildingId);
        if (roof) {
          const margin = (enemy.radius ?? 0.7) + 1.2;
          const points = [
            { x: roof.x - roof.w / 2 - margin, z: player.z },
            { x: roof.x + roof.w / 2 + margin, z: player.z },
            { x: player.x, z: roof.z - roof.d / 2 - margin },
            { x: player.x, z: roof.z + roof.d / 2 + margin },
          ];
          points.sort((a, b) => distance2D(enemy.x, enemy.z, a.x, a.z) - distance2D(enemy.x, enemy.z, b.x, b.z));
          goal = points.find((point) => !pointInsideObstaclePadding(point.x, point.z, enemy.radius ?? 0.7)) ?? points[0];
        }
      }
      if ((enemy.isNamelessBoss || enemy.isNamelessMinion) && Number.isFinite(enemy.territoryX)) {
        const dx = goal.x - enemy.territoryX;
        const dz = goal.z - enemy.territoryZ;
        const distance = Math.hypot(dx, dz);
        const limit = (enemy.territoryRadius ?? 68) - (enemy.radius ?? 0.7) - 2;
        if (distance > limit) goal = { x: enemy.territoryX + dx / distance * limit, z: enemy.territoryZ + dz / distance * limit };
      }
      return goal;
    };
    const getEnemyStairGoal = (enemy, player) => {
      const buildingId = enemy.onRoofBuildingId || player.onRoofBuildingId;
      if (!buildingId || enemy.onRoofBuildingId === player.onRoofBuildingId) return null;
      const roof = obstacleDefs.find((entry) => entry.id === buildingId);
      const stairs = window.__sdrStructureRegistry?.stairs?.filter((entry) => entry.obstacleId === buildingId) ?? [];
      if (!roof || !stairs.length) return null;
      let choice = null;
      for (const stair of stairs) {
        const run = stair.run ?? stair.stepCount * 0.38;
        const top = { x: stair.x + stair.dirX * run, z: stair.z + stair.dirZ * run };
        const roofPoint = {
          x: Math.max(roof.x - roof.w / 2 + 1.25, Math.min(roof.x + roof.w / 2 - 1.25, top.x)),
          z: Math.max(roof.z - roof.d / 2 + 1.25, Math.min(roof.z + roof.d / 2 - 1.25, top.z)),
        };
        const groundPoint = { x: stair.x - stair.dirX * 0.9, z: stair.z - stair.dirZ * 0.9 };
        const ascending = !enemy.onRoofBuildingId;
        const access = ascending ? groundPoint : roofPoint;
        const score = distance2D(enemy.x, enemy.z, access.x, access.z);
        if (!choice || score < choice.score) choice = { stair, roof, top, roofPoint, groundPoint, access, ascending, score };
      }
      return choice;
    };
    const beginEnemyStairs = (enemy, goal) => {
      const { stair, roof, top, roofPoint, groundPoint, ascending } = goal;
      const path = ascending
        ? [{ x: enemy.x, z: enemy.z, y: 0 }, { ...groundPoint, y: 0 }, { x: stair.x, z: stair.z, y: 0.18 }, { ...top, y: roof.h }, { ...roofPoint, y: roof.h }]
        : [{ x: enemy.x, z: enemy.z, y: roof.h }, { ...roofPoint, y: roof.h }, { ...top, y: roof.h }, { x: stair.x, z: stair.z, y: 0.18 }, { ...groundPoint, y: 0 }];
      let length = 0;
      const segments = [];
      for (let index = 1; index < path.length; index++) {
        const from = path[index - 1];
        const to = path[index];
        const distance = Math.hypot(to.x - from.x, to.z - from.z, (to.y - from.y) * 0.45);
        segments.push({ from, to, start: length, length: distance });
        length += distance;
      }
      enemy.stairAction = { segments, length, timer: Math.max(2.2, roof.h * 0.54), duration: Math.max(2.2, roof.h * 0.54), roofId: roof.id, ascending, end: ascending ? roofPoint : groundPoint, roofHeight: roof.h };
      enemy.mobilityAction = null;
      enemy.isProne = false;
      enemy.navPath = [];
    };
    const advanceEnemyStairs = (enemy, dt) => {
      const action = enemy.stairAction;
      if (!action) return;
      action.timer = Math.max(0, action.timer - dt);
      const progress = 1 - action.timer / action.duration;
      const travel = (progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2) * action.length;
      const segment = action.segments.find((entry) => travel <= entry.start + entry.length) ?? action.segments.at(-1);
      if (segment) {
        const section = Math.max(0, Math.min(1, (travel - segment.start) / Math.max(0.001, segment.length)));
        enemy.x = segment.from.x + (segment.to.x - segment.from.x) * section;
        enemy.z = segment.from.z + (segment.to.z - segment.from.z) * section;
        enemy.stairVisualY = segment.from.y + (segment.to.y - segment.from.y) * section;
        enemy.heading = Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z);
      }
      if (action.timer <= 0) {
        enemy.x = action.end.x;
        enemy.z = action.end.z;
        enemy.onRoofBuildingId = action.ascending ? action.roofId : null;
        enemy.insideBuildingId = enemy.onRoofBuildingId;
        enemy.stairVisualY = action.ascending ? action.roofHeight : 0;
        enemy.stairAction = null;
        enemy.navPath = [];
        enemy.navRepathTimer = 0;
        enemy.mobilityCooldown = Math.max(enemy.mobilityCooldown ?? 0, 0.45);
      }
    };
    updateEnemies = function updateStrengthenedEnemyNavigation(dt) {
      const raid = state.raid;
      const before = new Map();
      let pathBudget = 1;
      const boss = raid?.enemies?.find((entry) => entry.isNamelessBoss && !entry.dead);
      for (const enemy of raid?.enemies ?? []) {
        strengthenEnemy(enemy);
        ensurePatrolRoute(enemy);
        before.set(enemy, { x: enemy.x, z: enemy.z });
      }
      const climbing = new Set(raid?.enemies?.filter((enemy) => enemy.stairAction) ?? []);
      const allEnemies = raid?.enemies;
      let result;
      if (climbing.size) raid.enemies = allEnemies.filter((enemy) => !climbing.has(enemy));
      try { result = updateEnemiesBeforeNavigation(dt); }
      finally { if (climbing.size) raid.enemies = allEnemies; }
      for (const enemy of climbing) advanceEnemyStairs(enemy, dt);
      const player = raid?.player;
      const navigationOrder = [...(raid?.enemies ?? [])].sort((left, right) => {
        const priority = (enemy) => (enemy.isNamelessBoss ? 100 : 0) +
          ((enemy.alertTimer ?? 0) > 0 ? 40 : 0) -
          Math.min(35, distance2D(enemy.x, enemy.z, raid.player.x, raid.player.z) * 0.2);
        return priority(right) - priority(left);
      });
      for (const enemy of navigationOrder) {
        strengthenEnemy(enemy);
        if (!player || enemy.dead || enemy.despawned || enemy.isRangeTarget || climbing.has(enemy) || enemy.stairAction) continue;
        const origin = before.get(enemy) ?? { x: enemy.x, z: enemy.z };
        if (enemy.mobilityAction || (enemy.engineerStunTimer ?? 0) > 0) continue;
        const playerInBossArea = boss && distance2D(player.x, player.z, boss.territoryX, boss.territoryZ) < boss.territoryRadius;
        const enemyTerritoryActive = (enemy.isNamelessBoss || enemy.isNamelessMinion)
          ? (!boss || playerInBossArea) : !playerInBossArea;
        const roofPursuit = Boolean(player.onRoofBuildingId &&
          distance2D(enemy.x, enemy.z, player.x, player.z) <= Math.min(enemy.detectRange ?? 35, 40));
        const active = ((enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0 || roofPursuit) && enemyTerritoryActive;
        const searching = enemy.combatState === 'search';
        if (enemy.coverTarget) {
          enemy.coverTarget.timer -= dt;
          if (enemy.coverTarget.timer <= 0 || distance2D(enemy.x, enemy.z, enemy.coverTarget.x, enemy.coverTarget.z) < 1.05) {
            enemy.coverTarget = null;
          }
        }
        const stairGoal = active ? getEnemyStairGoal(enemy, player) : null;
        if (stairGoal && distance2D(enemy.x, enemy.z, stairGoal.access.x, stairGoal.access.z) < 1.6) {
          enemy.x = origin.x;
          enemy.z = origin.z;
          beginEnemyStairs(enemy, stairGoal);
          continue;
        }
        const rawTarget = stairGoal?.access ?? enemy.coverTarget ?? (active
          ? { x: searching ? (enemy.lastKnownPlayerX ?? enemy.x) : player.x, z: searching ? (enemy.lastKnownPlayerZ ?? enemy.z) : player.z }
          : enemy.route?.[enemy.routeIndex ?? 0]);
        const target = stairGoal?.access ?? (rawTarget ? getGroundTarget(enemy, rawTarget, player) : null);
        if (!target) continue;
        if (stairGoal) {
          enemy.x = origin.x;
          enemy.z = origin.z;
        }
        const blocked = (enemy.onRoofBuildingId && player.onRoofBuildingId === enemy.onRoofBuildingId) ||
          (stairGoal && enemy.onRoofBuildingId === stairGoal.roof.id)
          ? false : groundBlocked(origin, target, (enemy.radius ?? 0.7) + 0.18);
        enemy.navRepathTimer = Math.max(0, (enemy.navRepathTimer ?? 0) - dt);
        const changedTarget = !enemy.navGoal || distance2D(target.x, target.z, enemy.navGoal.x, enemy.navGoal.z) > 5;
        if (blocked && (changedTarget || enemy.navRepathTimer <= 0)) {
          if (pathBudget > 0) {
            const minX = Math.min(origin.x, target.x) - 22;
            const maxX = Math.max(origin.x, target.x) + 22;
            const minZ = Math.min(origin.z, target.z) - 22;
            const maxZ = Math.max(origin.z, target.z) + 22;
            const nearbyObstacles = obstacleDefs.filter((obstacle) =>
              obstacle.x + obstacle.w / 2 >= minX && obstacle.x - obstacle.w / 2 <= maxX &&
              obstacle.z + obstacle.d / 2 >= minZ && obstacle.z - obstacle.d / 2 <= maxZ);
            enemy.navPath = rules.findGroundPath(origin, target, nearbyObstacles, PLAYABLE_HALF, (enemy.radius ?? 0.7) + 0.2, 4, 900) ?? [];
            enemy.navGoal = { x: target.x, z: target.z };
            enemy.navRepathTimer = 1.6 + (enemy.id?.length ?? 0) * 0.019;
            pathBudget--;
          }
        }
        if (!blocked) {
          enemy.navPath = [];
          enemy.navGoal = null;
          enemy.navDetour = null;
          enemy.navAvoidFrames = 0;
        } else {
          while (enemy.navPath?.length && distance2D(origin.x, origin.z, enemy.navPath[0].x, enemy.navPath[0].z) < 1.1) enemy.navPath.shift();
          const waypoint = enemy.navPath?.[0];
          if (waypoint) {
            enemy.x = origin.x;
            enemy.z = origin.z;
            const direction = normalize2D(waypoint.x - origin.x, waypoint.z - origin.z);
            const speed = enemy.speed * (enemy.combatSpeedMult ?? 1) * dt;
            moveEntityWithCollision(enemy, direction.x * speed, direction.z * speed, enemy.radius ?? 0.7);
            enemy.heading = Math.atan2(direction.x, direction.z);
          }
        }
        if ((enemy.coverTarget || stairGoal) && !blocked) {
          enemy.x = origin.x;
          enemy.z = origin.z;
          const direction = normalize2D(target.x - origin.x, target.z - origin.z);
          moveEntityWithCollision(enemy, direction.x * enemy.speed * dt, direction.z * enemy.speed * dt, enemy.radius ?? 0.7);
          enemy.heading = Math.atan2(direction.x, direction.z);
        }
        const moved = distance2D(origin.x, origin.z, enemy.x, enemy.z);
        const remaining = distance2D(enemy.x, enemy.z, target.x, target.z);
        if (remaining > 1.4 && moved < Math.min(0.012, enemy.speed * dt * 0.2)) enemy.navStuckTimer = (enemy.navStuckTimer ?? 0) + dt;
        else enemy.navStuckTimer = 0;
        if ((enemy.navStuckTimer ?? 0) > 0.7) {
          enemy.navPath = [];
          enemy.navRepathTimer = 0;
          enemy.navAvoidFrames = 0;
          enemy.navStuckTimer = 0;
          if (!active) {
            enemy.route = [];
            ensurePatrolRoute(enemy);
          }
        }
        if (active && !enemy.isProne && (enemy.mobilityCooldown ?? 0) <= 0 &&
          (player.fireCooldown ?? 0) > 0.04 && remaining < 52 &&
          !lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) {
          const toward = normalize2D(enemy.x - player.x, enemy.z - player.z);
          const aimX = Math.sin(player.yaw ?? 0);
          const aimZ = Math.cos(player.yaw ?? 0);
          if (toward.x * aimX + toward.z * aimZ > 0.96 && Math.random() < (enemy.isNamelessBoss ? 0.72 : 0.38)) {
            const side = enemy.strafeDirection ?? 1;
            if (beginMobilityAction(enemy, 'dodge', -toward.z * side, toward.x * side, {
              duration: 0.3,
              speed: enemy.isNamelessBoss ? 12.4 : 9.4,
              cooldown: enemy.isNamelessBoss ? 0.62 : 1.08,
            })) enemy.strafeDirection = -side;
          }
        }
      }
      return result;
    };

    const animateBeforeStairs = animateRaidEntities;
    animateRaidEntities = function animateEnemyStairs(dt) {
      const result = animateBeforeStairs(dt);
      for (const enemy of state.raid?.enemies ?? []) {
        if (!enemy.visual?.root || enemy.despawned) continue;
        const roofHeight = enemy.onRoofBuildingId
          ? (obstacleDefs.find((roof) => roof.id === enemy.onRoofBuildingId)?.h ?? 0) : 0;
        enemy.visual.root.position.y = enemy.dead
          ? roofHeight + 0.06
          : enemy.visual.root.position.y + (enemy.stairAction ? (enemy.stairVisualY ?? 0) : roofHeight);
        if (enemy.stairAction && enemy.visual.leftLeg && enemy.visual.rightLeg) {
          const stride = Math.sin((1 - enemy.stairAction.timer / enemy.stairAction.duration) * 24) * 0.38;
          enemy.visual.leftLeg.rotation.x = stride;
          enemy.visual.rightLeg.rotation.x = -stride;
        }
      }
      return result;
    };

    const enemyAimBeforeStairs = getEnemyAimPoint;
    getEnemyAimPoint = function roofAwareEnemyAim(enemy) {
      const point = enemyAimBeforeStairs(enemy);
      const roofHeight = enemy.onRoofBuildingId
        ? (obstacleDefs.find((roof) => roof.id === enemy.onRoofBuildingId)?.h ?? 0) : 0;
      point.y += enemy.stairAction ? (enemy.stairVisualY ?? 0) : roofHeight;
      return point;
    };

    const damageBeforeYanfeiReward = damageEnemy;
    damageEnemy = function damageWithYanfeiGunReward(enemy, damage, options = {}) {
      const wasAlive = Boolean(enemy && !enemy.dead && enemy.health > 0);
      const result = damageBeforeYanfeiReward(enemy, damage, options);
      const player = state.raid?.player;
      if (wasAlive && enemy && !enemy.dead && !enemy.isRangeTarget && player &&
        !options.utilityKind && !options.execution && damage > 0 && !enemy.isProne &&
        !enemy.mobilityAction && (enemy.mobilityCooldown ?? 0) <= 0 &&
        Math.random() < (enemy.isNamelessBoss ? 0.58 : 0.34)) {
        const away = normalize2D(enemy.x - player.x, enemy.z - player.z);
        const side = enemy.strafeDirection ?? (Math.random() < 0.5 ? -1 : 1);
        const dodged = beginMobilityAction(enemy, 'dodge', -away.z * side + away.x * 0.15,
          away.x * side + away.z * 0.15, {
            duration: enemy.isNamelessBoss ? 0.34 : 0.28,
            speed: enemy.isNamelessBoss ? 12.4 : 9.4,
            cooldown: enemy.isNamelessBoss ? 0.62 : 1.08,
          });
        if (dodged) enemy.strafeDirection = -side;
      }
      if (
        wasAlive && enemy && !enemy.dead && !enemy.isNamelessBoss && !enemy.isRangeTarget &&
        !options.utilityKind && !options.execution && damage > 0 && !enemy.coverTarget
      ) {
        const healthRatio = enemy.health / Math.max(1, enemy.maxHealth ?? enemy.health);
        if (healthRatio <= 0.68 || Math.random() < 0.42) enemy.coverTarget = findCoverTarget(enemy, player);
      }
      if (
        wasAlive && enemy?.dead && !enemy.yanfeiGunHealAwarded && player?.operatorId === 'engineer' &&
        !options.utilityKind && !options.execution && damage > 0
      ) {
        enemy.yanfeiGunHealAwarded = true;
        const beforeHealth = player.health;
        player.health = Math.min(player.maxHealth, player.health + 30);
        const restored = Math.max(0, Math.round(player.health - beforeHealth));
        if (restored > 0) notify(L(`彦飞枪械击败恢复 ${restored} 生命。`, `Yanfei gun kill restored ${restored} HP.`), 'success');
      }
      return result;
    };

    const updateRaidBeforeReview = updateRaid;
    updateRaid = function updateStrengthenedRaid(dt) {
      const result = updateRaidBeforeReview(dt);
      const boss = state.raid?.enemies?.find(enemy => enemy.isNamelessBoss && !enemy.dead);
      if (boss) {
        strengthenEnemy(boss);
        boss.evasionTimer = Math.min(boss.evasionTimer ?? 0.8, 0.82);
        boss.tacticalTimer = Math.min(boss.tacticalTimer ?? 1.1, 1.35);
      }
      return result;
    };

    window.__sdrAiCombatDebug = { strengthenEnemy, ensurePatrolRoute, findCoverTarget, actorEyeHeight, getEnemyStairGoal };
  };

  boot();
})();
