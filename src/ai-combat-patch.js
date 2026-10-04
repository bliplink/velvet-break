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
        enemy.damage = Math.max(48, enemy.damage ?? 0);
        enemy.speed = Math.max(7.2, enemy.speed ?? 0);
        enemy.preferredRange = Math.max(36, enemy.preferredRange ?? 0);
        enemy.longFireRange = Math.max(54, enemy.longFireRange ?? 0);
        enemy.detectRange = Math.max(60, enemy.detectRange ?? 0);
        enemy.fireInterval = Math.min(0.24, enemy.fireInterval ?? 0.24);
        enemy.shotBurst = Math.max(7, enemy.shotBurst ?? 1);
        enemy.accuracyBonus = Math.max(0.46, enemy.accuracyBonus ?? 0);
        enemy.combatSpeedMult = Math.max(1.5, enemy.combatSpeedMult ?? 1);
        return enemy;
      }
      if (enemy.isNamelessMinion) {
        if (enemy.aiStrengthProfile !== 'minion') {
          enemy.aiStrengthProfile = 'minion';
          enemy.maxHealth = Math.max(320, enemy.maxHealth ?? 0);
          enemy.health = Math.min(enemy.health ?? enemy.maxHealth, enemy.maxHealth);
          enemy.damage = Math.max(28, enemy.damage ?? 0);
          enemy.speed = Math.max(6.1, enemy.speed ?? 0);
          enemy.detectRange = Math.max(48, enemy.detectRange ?? 0);
          enemy.preferredRange = Math.max(20, enemy.preferredRange ?? 0);
          enemy.longFireRange = Math.max(34, enemy.longFireRange ?? 0);
          enemy.fireInterval = Math.min(0.58, enemy.fireInterval ?? 0.58);
          enemy.shotBurst = Math.max(3, enemy.shotBurst ?? 1);
          enemy.accuracyBonus = Math.max(0.18, enemy.accuracyBonus ?? 0);
          enemy.combatSpeedMult = Math.max(1.28, enemy.combatSpeedMult ?? 1);
        }
        return enemy;
      }
      if (enemy.aiStrengthProfile === 'normal') return enemy;
      enemy.aiStrengthProfile = 'normal';
      const ratio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
      const baseHealth = enemy.maxHealth ?? enemy.health ?? 100;
      const healthMult = enemy.type === 'bruiser' ? 1.36 : enemy.type === 'hunter' ? 1.30 : 1.24;
      enemy.maxHealth = Math.max(160, Math.round(baseHealth * healthMult));
      enemy.health = Math.max(1, Math.round(enemy.maxHealth * ratio));
      enemy.damage = Math.round((enemy.damage ?? 10) * 1.22);
      enemy.speed = (enemy.speed ?? 2.5) * 1.35;
      enemy.preferredRange = (enemy.preferredRange ?? 16) * 1.22;
      enemy.longFireRange = Math.max((enemy.longFireRange ?? enemy.preferredRange) * 1.3, enemy.preferredRange * 1.42);
      enemy.detectRange = (enemy.detectRange ?? 28) * 1.2;
      enemy.fireInterval = (enemy.fireInterval ?? 1) * 0.82;
      enemy.accuracyBonus = (enemy.accuracyBonus ?? 0) + 0.12;
      enemy.combatSpeedMult = (enemy.combatSpeedMult ?? 1) * 1.22;
      enemy.shotBurst = Math.max(enemy.shotBurst ?? 1, enemy.type === 'hunter' ? 3 : 2);
      return enemy;
    };

    const resetEnemyRuntimeState = (enemy) => {
      if (!enemy || enemy.isRangeTarget) return enemy;
      enemy.aiStrengthProfile = null;
      enemy.navPath = [];
      enemy.navPathIndex = 0;
      enemy.navRepathTimer = 0;
      enemy.navAvoidFrames = 0;
      enemy.navAvoidSide = 1;
      enemy.coverTarget = null;
      enemy.stairAction = null;
      enemy.stairVisualY = 0;
      enemy.mobilityAction = null;
      enemy.mobilityCooldown = 0;
      enemy.engineerStunTimer = 0;
      enemy.engineerSlowTimer = 0;
      enemy.echoRevealTimer = 0;
      enemy.revealedTimer = 0;
      enemy.alertTimer = 0;
      enemy.investigateTimer = 0;
      enemy.combatState = 'patrol';
      enemy.strafeDirection = 1;
      enemy.routeIndex = 0;
      enemy.despawned = false;
      enemy.utilityCooldown = 2.5 + Math.random() * 3.5;
      enemy.utilityThrowTimer = 0;
      enemy.utilityType = null;
      enemy.utilityTargetX = 0;
      enemy.utilityTargetZ = 0;
      enemy.utilityThrows = 0;
      enemy.utilityThrowAction = null;
      return enemy;
    };


    const enemyUtilityDebug = window.__sdrEnemyUtilityDebug ?? {
      version: '2026-10-04-ai-utility-v4-smoke-feedback',
      throws: 0,
      grenades: 0,
      smokes: 0,
      stuns: 0,
    };
    window.__sdrEnemyUtilityDebug = enemyUtilityDebug;
    window.__sdrEnemyUtilityConfig = Object.freeze({
      version: '2026-10-04-ai-utility-config-v1',
      smokeRadius: 10,
      smokeDuration: 6.5,
      stunRadius: 3.8,
      stunSlowDuration: 5,
      stunMobilityLockDuration: 2.5,
      impactSphereEnabled: false,
      projectileVisible: true,
      throwWindup: 0.45,
    });


    const createEnemyUtilityProjectile = (type, enemy) => {
      const color = type === 'smoke' ? '#9aa7ad' : type === 'stun' ? '#dfefff' : '#c95b39';
      const root = new BABYLON.TransformNode(`enemy-${type}-projectile-${enemy.id}`, scene);
      const body = BABYLON.MeshBuilder.CreateCylinder(`enemy-${type}-body-${enemy.id}`, {
        height: 0.22,
        diameter: 0.11,
        tessellation: 12,
      }, scene);
      body.parent = root;
      body.rotation.z = Math.PI / 2;
      const mat = new BABYLON.StandardMaterial(`enemy-${type}-projectile-mat-${enemy.id}`, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(color);
      mat.emissiveColor = mat.diffuseColor.scale(type === 'stun' ? 0.65 : 0.24);
      mat.specularColor = BABYLON.Color3.Black();
      body.material = mat;
      body.isPickable = false;
      return root;
    };

    const resolveEnemyUtilityImpact = (enemy, player, type, targetX, targetZ) => {
      const raid = state.raid;
      if (!raid || !player) return;
      if (type === 'smoke') {
        enemyUtilityDebug.smokes += 1;
        raid.enemySmokeFields ??= [];
        const smokeRadius = 10;
        raid.enemySmokeFields.push({ x: targetX, z: targetZ, radius: smokeRadius, timer: 6.5 });
        enemy.smokeScreenTimer = 6.5;
        enemy.accuracyBonus = Math.max(-0.1, (enemy.accuracyBonus ?? 0) - 0.05);
        if (typeof spawnSmokePuff === 'function') {
          for (let i = 0; i < 18; i += 1) {
            const angle = Math.PI * 2 * i / 18 + Math.random() * 0.2;
            const radius = Math.sqrt(Math.random()) * smokeRadius;
            spawnSmokePuff(
              new BABYLON.Vector3(targetX + Math.cos(angle) * radius, 0.45 + Math.random() * 1.2, targetZ + Math.sin(angle) * radius),
              '#8d989d',
              0.55 + Math.random() * 0.45,
              1.8 + Math.random() * 1.3,
              new BABYLON.Vector3((Math.random() - 0.5) * 0.12, 0.08 + Math.random() * 0.12, (Math.random() - 0.5) * 0.12),
            );
          }
        }
        if (Math.hypot(player.x - targetX, player.z - targetZ) <= smokeRadius) {
          notify(L('敌方烟雾已覆盖当前位置。', 'Enemy smoke is covering your position.'), 'warning');
        }
        return;
      }

      if (type === 'stun') {
        enemyUtilityDebug.stuns += 1;
        if (typeof playImpactAudio === 'function') playImpactAudio(new BABYLON.Vector3(targetX, 0.7, targetZ), 'hard');
        if (typeof spawnSmokePuff === 'function') {
          for (let i = 0; i < 7; i++) {
            const angle = i / 7 * Math.PI * 2;
            spawnSmokePuff(new BABYLON.Vector3(targetX + Math.cos(angle) * 0.7, 0.35 + (i % 2) * 0.18, targetZ + Math.sin(angle) * 0.7), '#e7edf0', 0.18, 0.28);
          }
        }
        if ((player.aiStunSlowTimer ?? 0) <= 0 && Math.hypot(player.x - targetX, player.z - targetZ) <= 3.8) {
          player.aiStunSlowTimer = Math.max(player.aiStunSlowTimer ?? 0, 5);
          player.aiStunMobilityLockTimer = Math.max(player.aiStunMobilityLockTimer ?? 0, 2.5);
          player.mobilityAction = null;
          player.fallStunTimer = Math.max(player.fallStunTimer ?? 0, 0.2);
          player.suppressionTimer = Math.max(player.suppressionTimer ?? 0, 1.4);
          notify(L('被敌方震撼弹命中：移速降低，短时间无法机动。', 'Hit by enemy stun: movement slowed and mobility briefly disabled.'), 'danger');
        }
        return;
      }

      enemyUtilityDebug.grenades += 1;
      if (typeof playImpactAudio === 'function') playImpactAudio(new BABYLON.Vector3(targetX, 0.55, targetZ), 'hard');
      if (typeof spawnSmokePuff === 'function') {
        for (let i = 0; i < 10; i++) {
          const angle = i / 10 * Math.PI * 2;
          const radius = 0.45 + (i % 3) * 0.28;
          spawnSmokePuff(new BABYLON.Vector3(targetX + Math.cos(angle) * radius, 0.28 + (i % 2) * 0.22, targetZ + Math.sin(angle) * radius), '#9c6b58', 0.24, 0.42);
        }
      }
      if (Math.hypot(player.x - targetX, player.z - targetZ) <= 4.2) {
        const damage = enemy.type === 'bruiser' ? 42 : enemy.type === 'hunter' ? 34 : 28;
        applyDamageToPlayer(damage);
        notify(L(`被敌方爆炸物命中：-${damage} 基础伤害。`, `Hit by enemy explosive: -${damage} base damage.`), 'danger');
      }
    };

    const beginEnemyUtilityThrow = (enemy, player, type) => {
      const raid = state.raid;
      if (!raid || !enemy || !player || enemy.dead || enemy.despawned || enemy.utilityThrowAction) return false;
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4 || dist > 34) return false;
      if (lineOfSightBlocked(enemy.x, enemy.z, player.x, player.z) && type !== 'grenade') return false;

      enemy.utilityCooldown = type === 'smoke'
        ? 14 + Math.random() * 5
        : type === 'stun'
          ? 18 + Math.random() * 4
          : 16 + Math.random() * 5;
      enemy.utilityThrows = (enemy.utilityThrows ?? 0) + 1;
      enemyUtilityDebug.throws += 1;

      const targetX = type === 'smoke' ? enemy.x : player.x + (player.lastMoveX ?? 0) * 0.25;
      const targetZ = type === 'smoke' ? enemy.z : player.z + (player.lastMoveZ ?? 0) * 0.25;
      enemy.utilityThrowAction = {
        type,
        phase: 'windup',
        timer: 0,
        windup: 0.45,
        flight: Math.max(0.48, Math.min(1.25, dist / 22)),
        targetX,
        targetZ,
        startX: enemy.x,
        startZ: enemy.z,
        projectile: null,
      };
      enemy.mobilityAction = null;
      enemy.shootCooldown = Math.max(enemy.shootCooldown ?? 0, 0.7);
      enemy.heading = Math.atan2(dx, dz);
      return true;
    };

    window.__sdrBeginEnemyUtilityThrow = beginEnemyUtilityThrow;

    const updateEnemyUtilityThrows = (dt) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player) return;
      for (const enemy of raid.enemies ?? []) {
        const action = enemy.utilityThrowAction;
        if (!action) continue;
        if (enemy.dead || enemy.despawned) {
          action.projectile?.dispose?.(false, true);
          enemy.utilityThrowAction = null;
          continue;
        }
        action.timer += dt;
        enemy.shootCooldown = Math.max(enemy.shootCooldown ?? 0, 0.15);

        if (action.phase === 'windup' && action.timer >= action.windup) {
          action.phase = 'flight';
          action.timer = 0;
          const projectile = createEnemyUtilityProjectile(action.type, enemy);
          projectile.position.set(enemy.x, enemy.type === 'bruiser' ? 1.55 : 1.38, enemy.z);
          action.projectile = projectile;
          action.startX = enemy.x;
          action.startZ = enemy.z;
        } else if (action.phase === 'flight' && action.projectile) {
          const p = Math.min(1, action.timer / Math.max(0.001, action.flight));
          const arc = Math.sin(p * Math.PI) * Math.min(5.2, 1.6 + Math.hypot(action.targetX - action.startX, action.targetZ - action.startZ) * 0.12);
          action.projectile.position.set(
            action.startX + (action.targetX - action.startX) * p,
            0.18 + arc,
            action.startZ + (action.targetZ - action.startZ) * p,
          );
          action.projectile.rotation.x += dt * 10;
          action.projectile.rotation.z += dt * 7;
          if (p >= 1) {
            action.projectile.dispose(false, true);
            resolveEnemyUtilityImpact(enemy, player, action.type, action.targetX, action.targetZ);
            enemy.utilityThrowAction = null;
          }
        }
      }
    };

    const updateEnemyUtilities = (dt) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player) return;
      raid.enemyUtilityGlobalCooldown = Math.max(0, (raid.enemyUtilityGlobalCooldown ?? 0) - dt);
      for (let i = (raid.enemySmokeFields?.length ?? 0) - 1; i >= 0; i--) {
        const field = raid.enemySmokeFields[i];
        field.timer -= dt;
        if (field.timer <= 0) raid.enemySmokeFields.splice(i, 1);
      }
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget || enemy.isNamelessBoss) continue;
        enemy.utilityCooldown = Math.max(0, (enemy.utilityCooldown ?? 0) - dt);
        enemy.smokeScreenTimer = Math.max(0, (enemy.smokeScreenTimer ?? 0) - dt);
        if (enemy.utilityThrowAction || (enemy.utilityCooldown ?? 0) > 0 || (raid.enemyUtilityGlobalCooldown ?? 0) > 0) continue;

        const dist = distance2D(enemy.x, enemy.z, player.x, player.z);
        const active = (enemy.alertTimer ?? 0) > 0 || enemy.combatState === 'combat' || enemy.combatState === 'search';
        if (!active || dist < 4 || dist > 34) continue;

        const healthRatio = (enemy.health ?? 1) / Math.max(1, enemy.maxHealth ?? 1);
        let type = null;
        if (healthRatio < 0.38 && dist < 24 && Math.random() < 0.72) type = 'smoke';
        else if ((player.aiStunSlowTimer ?? 0) <= 0 && dist >= 10 && dist <= 18 && Math.random() < 0.18) type = 'stun';
        else if (dist >= 14 && dist <= 28 && Math.random() < 0.16) type = 'grenade';
        if (!type) {
          enemy.utilityCooldown = 2.5 + Math.random() * 3.5;
          continue;
        }
        if (beginEnemyUtilityThrow(enemy, player, type)) {
          raid.enemyUtilityGlobalCooldown = 5 + Math.random() * 2;
        }
      }
    };

    const playerSpeedBeforeAiStun = typeof getPlayerMoveSpeed === 'function' ? getPlayerMoveSpeed : null;
    if (playerSpeedBeforeAiStun) {
      getPlayerMoveSpeed = function getPlayerMoveSpeedWithAiStun(player, sprinting = false) {
        const speed = playerSpeedBeforeAiStun.call(this, player, sprinting);
        return player && (player.aiStunSlowTimer ?? 0) > 0 ? speed * 0.45 : speed;
      };
    }

    const createEnemyBeforeReview = createEnemy;
    createEnemy = function createStrengthenedEnemy(spawn, index) {
      return strengthenEnemy(resetEnemyRuntimeState(createEnemyBeforeReview(spawn, index)));
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
      if ((actor?.engineerSlowTimer ?? 0) > 0 || (actor?.aiStunMobilityLockTimer ?? 0) > 0) return false;
      const started = mobilityBeforeReview(actor, ...args);
      if (started && isEnemyActor(actor) && actor.mobilityAction) {
        actor.mobilityAction.speed *= actor.isNamelessBoss ? 1.32 : 1.26;
        actor.mobilityCooldown *= actor.isNamelessBoss ? 0.52 : 0.56;
      }
      return started;
    };

    const shootBeforeReview = enemyShoot;
    enemyShoot = function strengthenedEnemyShot(enemy, options = {}) {
      if (enemy?.utilityThrowAction) return false;
      const boss = Boolean(enemy?.isNamelessBoss);
      const minion = Boolean(enemy?.isNamelessMinion);
      const hitCap = boss ? 0.97 : minion ? 0.88 : 0.94;
      return shootBeforeReview(enemy, {
        ...options,
        accuracyMult: (options.accuracyMult ?? 1) * (boss ? 1.3 : minion ? 1.12 : 1.16),
        missSpread: (options.missSpread ?? 1.8) * (boss ? 0.48 : minion ? 0.72 : 0.68),
        minHitChance: Math.min(hitCap, Math.max(options.minHitChance ?? 0, boss ? 0.62 : minion ? 0.42 : 0.46)),
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
        if ((enemy.navStuckTimer ?? 0) > 0.55) {
          enemy.navPath = [];
          enemy.navRepathTimer = 0;
          enemy.navAvoidFrames = 0;
          const towardTarget = normalize2D(target.x - enemy.x, target.z - enemy.z);
          const side = enemy.navAvoidSide ?? (Math.random() < 0.5 ? -1 : 1);
          moveEntityWithCollision(
            enemy,
            (-towardTarget.z * side + towardTarget.x * 0.18) * 0.9,
            (towardTarget.x * side + towardTarget.z * 0.18) * 0.9,
            enemy.radius ?? 0.7,
          );
          enemy.navAvoidSide = -side;
          enemy.navStuckTimer = 0;
          if (!active) {
            enemy.route = [];
            ensurePatrolRoute(enemy);
          }
        }
        enemy.tacticalStrafeTimer = Math.max(0, (enemy.tacticalStrafeTimer ?? 0) - dt);
        if (active && !enemy.isProne && !enemy.mobilityAction && (enemy.engineerStunTimer ?? 0) <= 0 &&
          (enemy.tacticalStrafeTimer ?? 0) <= 0 && remaining > 7 && remaining < 30 &&
          !lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) {
          const towardPlayer = normalize2D(player.x - enemy.x, player.z - enemy.z);
          const side = enemy.strafeDirection ?? 1;
          const strafeSpeed = enemy.speed * (enemy.isNamelessBoss ? 0.82 : 0.68) * dt;
          const beforeStrafeX = enemy.x;
          const beforeStrafeZ = enemy.z;
          moveEntityWithCollision(enemy, -towardPlayer.z * side * strafeSpeed, towardPlayer.x * side * strafeSpeed, enemy.radius ?? 0.7);
          if (distance2D(beforeStrafeX, beforeStrafeZ, enemy.x, enemy.z) < 0.01) enemy.strafeDirection = -side;
          enemy.heading = Math.atan2(towardPlayer.x, towardPlayer.z);
          if (Math.random() < 0.34) enemy.strafeDirection = -enemy.strafeDirection;
          enemy.tacticalStrafeTimer = enemy.isNamelessBoss ? 0.10 : 0.12 + Math.random() * 0.10;
        }

        if (active && !enemy.isProne && !enemy.mobilityAction && (enemy.mobilityCooldown ?? 0) <= 0 &&
          remaining >= 2.8 && remaining < 7 &&
          !lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) {
          const away = normalize2D(enemy.x - player.x, enemy.z - player.z);
          const side = enemy.strafeDirection ?? 1;
          const retreatX = away.x * 0.74 - away.z * side * 0.66;
          const retreatZ = away.z * 0.74 + away.x * side * 0.66;
          if (beginMobilityAction(enemy, Math.random() < 0.55 ? 'slide' : 'dodge', retreatX, retreatZ, {
            duration: enemy.isNamelessBoss ? 0.34 : 0.30,
            speed: enemy.isNamelessBoss ? 13.6 : 10.8,
            cooldown: enemy.isNamelessBoss ? 0.46 : 0.72,
          })) enemy.strafeDirection = -side;
        }

        if (active && !enemy.isProne && (enemy.mobilityCooldown ?? 0) <= 0 &&
          (player.fireCooldown ?? 0) > 0.04 && remaining < 52 &&
          !lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) {
          const toward = normalize2D(enemy.x - player.x, enemy.z - player.z);
          const aimX = Math.sin(player.yaw ?? 0);
          const aimZ = Math.cos(player.yaw ?? 0);
          if (toward.x * aimX + toward.z * aimZ > 0.96 && Math.random() < (enemy.isNamelessBoss ? 0.82 : 0.58)) {
            const side = enemy.strafeDirection ?? 1;
            if (beginMobilityAction(enemy, 'dodge', -toward.z * side, toward.x * side, {
              duration: 0.3,
              speed: enemy.isNamelessBoss ? 13.8 : 11.0,
              cooldown: enemy.isNamelessBoss ? 0.48 : 0.76,
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
        const throwAction = enemy.utilityThrowAction;
        if (throwAction && enemy.visual.rightArm) {
          const p = throwAction.phase === 'windup'
            ? Math.min(1, throwAction.timer / Math.max(0.001, throwAction.windup))
            : 1;
          const swing = Math.sin(p * Math.PI);
          enemy.visual.rightArm.rotation.x = -1.15 - swing * 0.85;
          enemy.visual.rightArm.rotation.z = -0.42 - swing * 0.18;
          if (enemy.visual.gun) {
            enemy.visual.gun.rotation.x = -0.55 * p;
            enemy.visual.gun.position.y -= 0.08 * p;
          }
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
        Math.random() < (enemy.isNamelessBoss ? 0.68 : 0.52)) {
        const away = normalize2D(enemy.x - player.x, enemy.z - player.z);
        const side = enemy.strafeDirection ?? (Math.random() < 0.5 ? -1 : 1);
        const dodged = beginMobilityAction(enemy, 'dodge', -away.z * side + away.x * 0.15,
          away.x * side + away.z * 0.15, {
            duration: enemy.isNamelessBoss ? 0.34 : 0.28,
            speed: enemy.isNamelessBoss ? 13.8 : 11.0,
            cooldown: enemy.isNamelessBoss ? 0.48 : 0.76,
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

    const startRaidBeforeAiReset = startRaid;
    startRaid = function startRaidWithFreshAiState(...args) {
      const result = startRaidBeforeAiReset.apply(this, args);
      const raid = state.raid;
      if (raid?.enemies) {
        const seen = new Set();
        raid.enemies = raid.enemies.filter((enemy) => {
          if (!enemy || seen.has(enemy.id)) {
            enemy?.visual?.root?.dispose?.(false, true);
            return false;
          }
          seen.add(enemy.id);
          resetEnemyRuntimeState(enemy);
          strengthenEnemy(enemy);
          return true;
        });
        raid.initialEnemyCount = raid.enemies.length;
        raid.enemyCount = raid.enemies.length;
      }
      return result;
    };

    const updateRaidBeforeReview = updateRaid;
    updateRaid = function updateStrengthenedRaid(dt) {
      const player = state.raid?.player;
      if (player) {
        player.engineerSlowTimer = Math.max(0, (player.engineerSlowTimer ?? 0) - dt);
        player.aiStunSlowTimer = Math.max(0, (player.aiStunSlowTimer ?? 0) - dt);
        player.aiStunMobilityLockTimer = Math.max(0, (player.aiStunMobilityLockTimer ?? 0) - dt);
      }
      const result = updateRaidBeforeReview(dt);
      updateEnemyUtilities(dt);
      updateEnemyUtilityThrows(dt);
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
