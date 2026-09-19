(() => {
  if (window.__sdrRaidCompanionWaiting || window.__sdrRaidCompanionApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof startRaid === 'undefined' ||
      typeof updateRaid === 'undefined' ||
      typeof createEnemyVisual === 'undefined' ||
      typeof distance2D === 'undefined' ||
      typeof damageEnemy === 'undefined' ||
      typeof moveEntityWithCollision === 'undefined' ||
      typeof syncPlayerCamera === 'undefined' ||
      typeof updatePlayer === 'undefined' ||
      typeof attemptShoot === 'undefined' ||
      typeof stepTouchMove === 'undefined' ||
      typeof camera === 'undefined' ||
      typeof syncHud === 'undefined' ||
      typeof refs === 'undefined' ||
      typeof obstacleDefs === 'undefined' ||
      !window.SDRCombat
    ) {
      window.__sdrRaidCompanionWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrRaidCompanionWaiting = false;
    if (window.__sdrRaidCompanionApplied) return;
    window.__sdrRaidCompanionApplied = true;

    const RAID_ID = 'raid';
    const REVIVE_TIME = 6;
    const RESCUE_RANGE = 3.25;
    const DOWNED_TIME = 20;
    const rules = window.SDRCombat;
    const isInteractHeld = () => Boolean(
      state.input?.interactHeld || state.input?.keys?.has('KeyE') || state.input?.keys?.has('e'),
    );

    const createCompanion = (raid) => {
      if (!raid || raid.modeId !== RAID_ID || raid.training || raid.companion) return;
      const player = raid.player;
      const companion = {
        id: 'raid-companion-clone',
        name: '克隆',
        type: 'bruiser',
        visualColor: '#268bd2',
        x: player.x - Math.sin(player.yaw ?? 0) * 4.5,
        z: player.z - Math.cos(player.yaw ?? 0) * 4.5,
        heading: player.yaw ?? 0,
        radius: 0.72,
        health: player.maxHealth,
        maxHealth: player.maxHealth,
        damage: 28,
        speed: 6.2,
        preferredRange: 16,
        detectRange: 34,
        shootTimer: 0.9,
        reviveUsed: false,
        damageTimer: 2,
        mobilityCooldown: 1.2,
        lastHitTimer: 0,
        companionAlertTimer: 0,
        medkits: 0,
        visual: null,
      };
      companion.visual = createEnemyVisual(companion);
      companion.visual.root.scaling.setAll(0.96);
      companion.visual.classLabelMaterial.alpha = 0.9;
      companion.visual.classLabelText = '克隆';
      companion.visual.body.material.diffuseColor = BABYLON.Color3.FromHexString(companion.visualColor);
      companion.visual.chestRig.material.diffuseColor = BABYLON.Color3.FromHexString('#1267a8');
      companion.visual.helmet.material.diffuseColor = BABYLON.Color3.FromHexString('#174d78');
      companion.visual.backpack.material.diffuseColor = BABYLON.Color3.FromHexString('#0c466f');
      companion.visual.leftArm.material.diffuseColor = BABYLON.Color3.FromHexString('#1b5f91');
      companion.visual.rightArm.material.diffuseColor = BABYLON.Color3.FromHexString('#1b5f91');
      companion.visual.leftLeg.material.diffuseColor = BABYLON.Color3.FromHexString('#174d78');
      companion.visual.rightLeg.material.diffuseColor = BABYLON.Color3.FromHexString('#174d78');
      raid.companion = companion;
      raid.companionBrief = '克隆已加入封锁区行动。';
      if (typeof notify === 'function') notify(L('克隆已加入封锁区行动。', 'Clone joined the lockdown operation.'), 'success');
    };

    const enterPlayerDowned = (raid) => {
      const player = raid?.player;
      if (!raid || !player || raid.playerDowned) return;
      if (raid.playerReviveUsed) {
        player.health = 0;
        player.downed = true;
        raid.playerDowned = true;
        state.input.keys.clear();
        state.input.fireHeld = false;
        state.input.aimHeld = false;
        state.input.interactHeld = false;
        raid.skipDeathReplay = true;
        if (typeof notify === 'function') notify(L('再次倒地，行动失败。', 'Downed again. Operation failed.'), 'danger');
        if (typeof finishRaid === 'function') {
          window.setTimeout(() => {
            if (state.raid === raid && raid.modeId === RAID_ID) finishRaid(false, 'player_killed', false);
          }, 0);
        }
        return;
      }
      player.health = Math.max(1, player.health);
      player.downed = true;
      player.downedReviveProgress = 0;
      raid.playerDowned = true;
      raid.playerDownedTimer = DOWNED_TIME;
      raid.playerReviveUsed = Boolean(raid.playerReviveUsed);
      if (raid.companion) raid.companion.reviveProgress = 0;
      state.input.keys.clear();
      state.input.fireHeld = false;
      state.input.aimHeld = false;
      state.input.interactHeld = false;
      if (typeof notify === 'function') notify(L('你已倒地，克隆正在赶来救援。', 'You are downed. Clone is moving in to revive you.'), 'danger');
    };

    const roofHeight = (id) => obstacleDefs.find((obstacle) => obstacle.id === id)?.h ?? 0;

    const hasClearShot = (companion, enemy) => {
      const from = { x: companion.x, z: companion.z };
      const to = { x: enemy.x, z: enemy.z };
      const fromY = roofHeight(companion.onRoofBuildingId) + 1.45;
      const toY = roofHeight(enemy.onRoofBuildingId) + (enemy.isProne ? 0.55 : 1.45);
      if (obstacleDefs.some((obstacle) => rules.segmentRectHeightBlocked(from, to, obstacle, fromY, toY))) return false;
      for (const barrier of state.raid?.engineerBarriers ?? []) {
        const cosine = Math.cos(barrier.heading);
        const sine = Math.sin(barrier.heading);
        const local = (point) => ({
          x: cosine * (point.x - barrier.x) - sine * (point.z - barrier.z),
          z: sine * (point.x - barrier.x) + cosine * (point.z - barrier.z),
        });
        if (rules.segmentRectHeightBlocked(local(from), local(to),
          { x: 0, z: 0, w: barrier.length, d: barrier.depth, h: 3 }, fromY, toY, 0.02)) return false;
      }
      return true;
    };

    const nearestTarget = (raid, companion, maxDistance = 34) => {
      let best = null;
      let bestDistance = maxDistance;
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget) continue;
        const distance = distance2D(companion.x, companion.z, enemy.x, enemy.z);
        if (distance >= bestDistance) continue;
        best = enemy;
        bestDistance = distance;
      }
      return best;
    };

    const companionTargetPoint = (actor) => new BABYLON.Vector3(
      actor.x,
      roofHeight(actor.onRoofBuildingId) + (actor.isProne ? 0.62 : 1.45),
      actor.z,
    );

    const alertEnemiesToCompanion = (raid, companion) => {
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget) continue;
        const distance = distance2D(enemy.x, enemy.z, companion.x, companion.z);
        if (distance > Math.max(42, enemy.detectRange ?? 35)) continue;
        enemy.companionAlertTimer = Math.max(enemy.companionAlertTimer ?? 0, 5);
        enemy.lastKnownCompanionX = companion.x;
        enemy.lastKnownCompanionZ = companion.z;
      }
    };

    const shootCompanionAt = (companion, target, dt) => {
      if (!target || target.dead || target.despawned || target.isRangeTarget) return false;
      const targetDistance = distance2D(companion.x, companion.z, target.x, target.z);
      const clearShot = hasClearShot(companion, target);
      companion.heading = Math.atan2(target.x - companion.x, target.z - companion.z);
      if (targetDistance > companion.preferredRange || !clearShot) moveCompanion(companion, target.x, target.z, dt);
      companion.shootTimer -= dt;
      if (companion.shootTimer > 0) return true;
      companion.shootTimer = 0.86;
      if (!clearShot) return true;
      const from = companionTargetPoint(companion);
      const to = companionTargetPoint(target);
      if (typeof spawnTracer === 'function') spawnTracer(from, to, '#91d8ff', 0.12);
      if (typeof playGunshotAudio === 'function') {
        playGunshotAudio({ caliber: '5.56', pellets: 1 }, { world: { x: companion.x, z: companion.z }, gain: 0.72 });
      }
      if (typeof spawnImpactBurst === 'function') spawnImpactBurst(to, '#9adfff', 0.32, 'flesh');
      alertEnemiesToCompanion(state.raid, companion);
      damageEnemy(target, companion.damage, { source: 'ally', utilityKind: 'raid-companion' });
      if (companion.visual?.flash) companion.visual.flash.material.alpha = 0.86;
      return true;
    };

    const maybeCompanionMobility = (companion, target, dt) => {
      companion.mobilityCooldown = Math.max(0, (companion.mobilityCooldown ?? 0) - dt);
      companion.lastHitTimer = Math.max(0, (companion.lastHitTimer ?? 0) - dt);
      if (companion.mobilityAction) {
        if (typeof updateMobilityActionMotion === 'function') updateMobilityActionMotion(companion, dt, companion.radius);
        return true;
      }
      if (companion.mobilityCooldown > 0 || !target || typeof beginMobilityAction !== 'function') return false;
      const targetDistance = distance2D(companion.x, companion.z, target.x, target.z);
      if (targetDistance > 30 && companion.lastHitTimer <= 0) return false;
      const side = companion.strafeDirection ?? 1;
      const toward = normalize2D(target.x - companion.x, target.z - companion.z);
      const roll = Math.random() < 0.2;
      const type = roll ? 'roll' : (Math.random() < 0.45 ? 'slide' : 'dodge');
      const started = beginMobilityAction(
        companion,
        type,
        -toward.z * side + (roll ? toward.x * 0.18 : 0),
        toward.x * side + (roll ? toward.z * 0.18 : 0),
        roll
          ? { duration: 0.58, speed: 10.5, cooldown: 3.1 }
          : type === 'slide'
            ? { duration: 0.52, speed: 9.8, cooldown: 2.35 }
            : { duration: 0.36, speed: 10.2, cooldown: 1.9 },
      );
      if (started) companion.strafeDirection = -side;
      return started;
    };

    const fireAtCompanion = (enemy, companion) => {
      const from = companionTargetPoint(enemy);
      const to = companionTargetPoint(companion);
      if (typeof spawnTracer === 'function') spawnTracer(from, to, '#ffbd82', 0.1);
      if (typeof playGunshotAudio === 'function') {
        playGunshotAudio({ caliber: enemy.type === 'scout' ? '5.56' : '7.62', pellets: 1 }, { world: { x: enemy.x, z: enemy.z }, gain: 0.65 });
      }
      enemy.visual?.flash && (enemy.visual.flash.material.alpha = 0.86);
      const distance = distance2D(enemy.x, enemy.z, companion.x, companion.z);
      const accuracy = clamp(0.82 - distance * 0.006 + (enemy.isNamelessBoss ? 0.08 : 0), 0.54, 0.96);
      if (Math.random() > accuracy) return;
      const damage = Math.max(1, Math.round((enemy.damage ?? 20) * (enemy.isNamelessBoss ? 0.92 : 0.72)));
      companion.health = Math.max(0, companion.health - damage);
      companion.lastHitTimer = 1.2;
      if (typeof spawnImpactBurst === 'function') spawnImpactBurst(to, '#ff806e', 0.42, 'flesh');
      if (companion.health <= 0 && !companion.downed) {
        companion.health = 1;
        companion.downed = true;
        companion.reviveProgress = 0;
        companion.downedEliminationTimer = 0;
        if (typeof notify === 'function') notify(L('克隆已倒地，靠近后按住 E 救援。', 'Clone is down. Hold E nearby to revive.'), 'danger');
      }
    };

    const updateCompanionIncomingFire = (raid, dt) => {
      const companion = raid?.companion;
      if (!companion || companion.dead || companion.downed) return;
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget) continue;
        enemy.companionAlertTimer = Math.max(0, (enemy.companionAlertTimer ?? 0) - dt);
        const distance = distance2D(enemy.x, enemy.z, companion.x, companion.z);
        const aware = enemy.companionAlertTimer > 0 || distance <= Math.min(enemy.detectRange ?? 35, 26);
        if (!aware || !hasClearShot(enemy, companion)) continue;
        enemy.companionShootTimer = Math.max(0, (enemy.companionShootTimer ?? (0.35 + Math.random() * 0.55)) - dt);
        if (enemy.companionShootTimer <= 0) {
          enemy.companionShootTimer = enemy.isNamelessBoss ? 0.62 : (enemy.type === 'scout' ? 1.05 : 1.28);
          fireAtCompanion(enemy, companion);
        }
      }
    };

    const engageCompanionTarget = (raid, companion, target, dt) => {
      if (!target) return false;
      const mobilityActive = maybeCompanionMobility(companion, target, dt);
      if (mobilityActive && companion.mobilityAction?.type === 'roll') {
        updateCompanionVisual(companion, dt);
        return true;
      }
      shootCompanionAt(companion, target, dt);
      return true;
    };

    const stairGoalFor = (companion, player) => {
      if (companion.onRoofBuildingId === (player.onRoofBuildingId ?? null)) return null;
      const buildingId = companion.onRoofBuildingId || player.onRoofBuildingId;
      const roof = obstacleDefs.find((entry) => entry.id === buildingId);
      const stairs = window.__sdrStructureRegistry?.stairs?.filter((entry) => entry.obstacleId === buildingId) ?? [];
      if (!roof || !stairs.length) return null;
      return stairs.map((stair) => {
        const top = { x: stair.x + stair.dirX * stair.run, z: stair.z + stair.dirZ * stair.run };
        const roofPoint = {
          x: Math.max(roof.x - roof.w / 2 + 1.25, Math.min(roof.x + roof.w / 2 - 1.25, top.x)),
          z: Math.max(roof.z - roof.d / 2 + 1.25, Math.min(roof.z + roof.d / 2 - 1.25, top.z)),
        };
        const groundPoint = { x: stair.x - stair.dirX * 0.9, z: stair.z - stair.dirZ * 0.9 };
        const ascending = !companion.onRoofBuildingId;
        const access = ascending ? groundPoint : roofPoint;
        return { stair, roof, top, roofPoint, groundPoint, ascending, access };
      }).sort((left, right) =>
        distance2D(companion.x, companion.z, left.access.x, left.access.z) -
        distance2D(companion.x, companion.z, right.access.x, right.access.z))[0];
    };

    const beginStairs = (companion, goal) => {
      const { stair, roof, top, roofPoint, groundPoint, ascending } = goal;
      const path = ascending
        ? [{ x: companion.x, z: companion.z, y: 0 }, { ...groundPoint, y: 0 }, { x: stair.x, z: stair.z, y: 0.18 }, { ...top, y: roof.h }, { ...roofPoint, y: roof.h }]
        : [{ x: companion.x, z: companion.z, y: roof.h }, { ...roofPoint, y: roof.h }, { ...top, y: roof.h }, { x: stair.x, z: stair.z, y: 0.18 }, { ...groundPoint, y: 0 }];
      const segments = [];
      let length = 0;
      for (let index = 1; index < path.length; index++) {
        const from = path[index - 1];
        const to = path[index];
        const distance = Math.hypot(to.x - from.x, to.z - from.z, (to.y - from.y) * 0.45);
        segments.push({ from, to, start: length, length: distance });
        length += distance;
      }
      companion.stairAction = {
        segments, length, roofId: roof.id, ascending,
        end: ascending ? roofPoint : groundPoint,
        duration: Math.max(2.2, roof.h * 0.54),
        timer: Math.max(2.2, roof.h * 0.54),
      };
      companion.navPath = [];
    };

    const advanceStairs = (companion, dt) => {
      const action = companion.stairAction;
      action.timer = Math.max(0, action.timer - dt);
      const progress = 1 - action.timer / action.duration;
      const travel = progress * action.length;
      const segment = action.segments.find((entry) => travel <= entry.start + entry.length) ?? action.segments.at(-1);
      if (segment) {
        const fraction = Math.max(0, Math.min(1, (travel - segment.start) / Math.max(0.001, segment.length)));
        companion.x = segment.from.x + (segment.to.x - segment.from.x) * fraction;
        companion.z = segment.from.z + (segment.to.z - segment.from.z) * fraction;
        companion.stairVisualY = segment.from.y + (segment.to.y - segment.from.y) * fraction;
        companion.heading = Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z);
      }
      if (action.timer <= 0) {
        companion.x = action.end.x;
        companion.z = action.end.z;
        companion.onRoofBuildingId = action.ascending ? action.roofId : null;
        companion.insideBuildingId = companion.onRoofBuildingId;
        companion.stairVisualY = 0;
        companion.stairAction = null;
        companion.navPath = [];
      }
    };

    const moveCompanion = (companion, targetX, targetZ, dt) => {
      const from = { x: companion.x, z: companion.z };
      const target = { x: targetX, z: targetZ };
      const blocked = !companion.onRoofBuildingId && obstacleDefs.some((obstacle) =>
        rules.segmentRectEntry(from, target, obstacle, companion.radius + 0.18) != null);
      companion.navRepathTimer = Math.max(0, (companion.navRepathTimer ?? 0) - dt);
      const changed = !companion.navGoal || distance2D(targetX, targetZ, companion.navGoal.x, companion.navGoal.z) > 4;
      if (blocked && (changed || companion.navRepathTimer <= 0)) {
        companion.navPath = rules.findGroundPath(from, target, obstacleDefs,
          typeof PLAYABLE_HALF === 'undefined' ? 128 : PLAYABLE_HALF, companion.radius + 0.2, 4, 900) ?? [];
        companion.navGoal = target;
        companion.navRepathTimer = 1.25;
      } else if (!blocked) {
        companion.navPath = [];
        companion.navGoal = null;
      }
      while (companion.navPath?.length && distance2D(companion.x, companion.z, companion.navPath[0].x, companion.navPath[0].z) < 1.15) {
        companion.navPath.shift();
      }
      const waypoint = companion.navPath?.[0] ?? target;
      const dx = waypoint.x - companion.x;
      const dz = waypoint.z - companion.z;
      const length = Math.hypot(dx, dz);
      if (length < (companion.navPath?.length ? 0.3 : 2.2)) return;
      companion.heading = Math.atan2(dx, dz);
      const beforeX = companion.x;
      const beforeZ = companion.z;
      const player = state.raid?.player;
      const catchUp = player && distance2D(companion.x, companion.z, player.x, player.z) > 9;
      const speed = catchUp ? 9.6 : companion.speed;
      moveEntityWithCollision(companion, (dx / length) * speed * dt, (dz / length) * speed * dt, companion.radius);
      const moved = distance2D(beforeX, beforeZ, companion.x, companion.z);
      companion.navStuckTimer = moved < 0.01 ? (companion.navStuckTimer ?? 0) + dt : 0;
      if (companion.navStuckTimer > 0.6) {
        companion.navRepathTimer = 0;
        companion.navPath = [];
        companion.navStuckTimer = 0;
      }
    };

    const updateCompanion = (raid, dt) => {
      const companion = raid?.companion;
      const player = raid?.player;
      if (!companion || !player || companion.dead) return;

      if (raid.playerDowned && companion.downed) {
        raid.skipDeathReplay = true;
        if (typeof notify === 'function') notify(L('玩家与克隆均已倒地，行动失败。', 'Both the player and Clone are down. Operation failed.'), 'danger');
        if (state.mode === 'raid' && typeof finishRaid === 'function') finishRaid(false, 'player_killed', false);
        return;
      }

      if (companion.stairAction) {
        advanceStairs(companion, dt);
        updateCompanionVisual(companion, dt);
        return;
      }

      const stairGoal = stairGoalFor(companion, player);
      if (stairGoal && distance2D(companion.x, companion.z, stairGoal.access.x, stairGoal.access.z) < 1.6) {
        beginStairs(companion, stairGoal);
        updateCompanionVisual(companion, dt);
        return;
      }

      if (raid.playerDowned) {
        raid.playerDownedTimer = Math.max(0, (raid.playerDownedTimer ?? DOWNED_TIME) - dt);
        if (raid.playerDownedTimer <= 0) {
          if (typeof notify === 'function') notify(L('救援超时，行动失败。', 'Revive window expired. Operation failed.'), 'danger');
          finishRaid(false, 'player_killed', false);
          updateCompanionVisual(companion, dt);
          return;
        }
        const rescueThreat = nearestTarget(raid, companion, 24);
        if (rescueThreat) {
          engageCompanionTarget(raid, companion, rescueThreat, dt);
          updateCompanionVisual(companion, dt);
          return;
        }
        const rescueDistance = distance2D(companion.x, companion.z, player.x, player.z);
        if (rescueDistance > RESCUE_RANGE) {
          moveCompanion(companion, player.x, player.z, dt);
        } else {
          companion.heading = Math.atan2(player.x - companion.x, player.z - companion.z);
          companion.reviveProgress = (companion.reviveProgress ?? 0) + dt;
          raid.interactionText = L(
            `克隆已进入救援范围，救援中 ${Math.min(companion.reviveProgress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`,
            `Clone is in rescue range and reviving ${Math.min(companion.reviveProgress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`,
          );
          if (companion.reviveProgress >= REVIVE_TIME && !raid.playerReviveUsed) {
            player.health = Math.max(1, Math.round(player.maxHealth * 0.4));
            player.downed = false;
            raid.playerDowned = false;
            raid.playerDownedTimer = 0;
            raid.playerReviveUsed = true;
            companion.reviveProgress = 0;
            if (typeof notify === 'function') notify(L('克隆已将你救起。', 'Clone revived you.'), 'success');
          }
        }
        updateCompanionVisual(companion, dt);
        return;
      }

      if (companion.downed) {
        const rescueDistance = distance2D(companion.x, companion.z, player.x, player.z);
        if (rescueDistance <= RESCUE_RANGE) {
          if (isInteractHeld()) {
            companion.reviveProgress = (companion.reviveProgress ?? 0) + dt;
            raid.interactionText = L(
              `正在救援克隆 ${Math.min(companion.reviveProgress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`,
              `Reviving Clone ${Math.min(companion.reviveProgress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`,
            );
            if (companion.reviveProgress >= REVIVE_TIME) {
              companion.downed = false;
              companion.reviveUsed = true;
              companion.reviveCount = (companion.reviveCount ?? 0) + 1;
              companion.health = Math.max(1, Math.round(companion.maxHealth * 0.45));
              companion.reviveProgress = 0;
              companion.downedEliminationTimer = 0;
              if (typeof notify === 'function') notify(L('你已将克隆救起。', 'You revived Clone.'), 'success');
            }
          } else {
            companion.reviveProgress = Math.max(0, (companion.reviveProgress ?? 0) - dt * 0.35);
            raid.interactionText = L('克隆在 3.25 米救援范围内，按住 E 开始救援。', 'Clone is within the 3.25 m rescue range. Hold E to revive.');
          }
        } else {
          companion.reviveProgress = Math.max(0, (companion.reviveProgress ?? 0) - dt * 0.6);
          raid.interactionText = L(`克隆倒地，需在 3.25 米内救援（当前 ${rescueDistance.toFixed(1)} 米）。`, `Clone is down. Move within 3.25 m to revive (currently ${rescueDistance.toFixed(1)} m).`);
        }
        updateCompanionVisual(companion, dt);
        return;
      }

      const target = stairGoal ? null : nearestTarget(raid, companion);
      if (target) {
        engageCompanionTarget(raid, companion, target, dt);
      } else {
        const followX = player.x - Math.sin(player.yaw ?? 0) * 3.6;
        const followZ = player.z - Math.cos(player.yaw ?? 0) * 3.6;
        moveCompanion(companion, stairGoal?.access.x ?? followX, stairGoal?.access.z ?? followZ, dt);
        companion.shootTimer = Math.min(companion.shootTimer, 0.35);
      }
      updateCompanionVisual(companion, dt);
    };

    const updateCompanionVisual = (companion, dt) => {
      if (!companion.visual) return;
      const root = companion.visual.root;
      root.setEnabled(true);
      for (const mesh of companion.visual.overlayMeshes ?? []) mesh.setEnabled(true);
      companion.visual.classLabel?.setEnabled(true);
      root.position.x = companion.x;
      root.position.z = companion.z;
      root.rotation.y = companion.heading;
      if (companion.downed) {
        root.position.y = roofHeight(companion.onRoofBuildingId) + 0.02;
        root.rotation.x = 1.18;
        root.rotation.z = 0;
      } else {
        const pose = typeof getActorMobilityPose === 'function' ? getActorMobilityPose(companion, true) : null;
        if (typeof advanceProneBlend === 'function') advanceProneBlend(companion, dt);
        root.position.y = (companion.stairAction ? companion.stairVisualY : roofHeight(companion.onRoofBuildingId)) +
          (pose?.visualYOffset ?? 0) + Math.sin(performance.now() * 0.005 + companion.x) * 0.035;
        root.rotation.x = pose?.rootPitch ?? 0;
        root.rotation.z = pose?.rootRoll ?? 0;
      }
      if (companion.visual.flash) companion.visual.flash.material.alpha = Math.max(0, companion.visual.flash.material.alpha - dt * 6);
    };

    const originalStartRaid = startRaid;
    startRaid = window.__sdrPatchedStartRaid = function startRaidWithCompanion(...args) {
      const result = originalStartRaid.apply(this, args);
      createCompanion(state.raid);
      return result;
    };

    const originalApplyDamage = applyDamageToPlayer;
    applyDamageToPlayer = function applyRaidDownedState(amount) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || raid.modeId !== RAID_ID || raid.training || !player) return originalApplyDamage(amount);
      if (raid.playerDowned) return;
      if (player.health <= 1 || amount >= player.health) {
        if (player.health > 1) originalApplyDamage(Math.max(1, player.health - 1));
        enterPlayerDowned(raid);
        return;
      }
      return originalApplyDamage(amount);
    };

    const originalUpdatePlayer = updatePlayer;
    updatePlayer = function updatePlayerWithDownedLock(dt, ...args) {
      if (state.raid?.playerDowned) return;
      return originalUpdatePlayer.call(this, dt, ...args);
    };

    const originalAttemptShoot = attemptShoot;
    attemptShoot = function attemptShootWithDownedLock(...args) {
      if (state.raid?.playerDowned) return;
      return originalAttemptShoot.apply(this, args);
    };

    const originalStepTouchMove = stepTouchMove;
    stepTouchMove = function stepTouchMoveWithDownedLock(...args) {
      if (state.raid?.playerDowned) return;
      return originalStepTouchMove.apply(this, args);
    };

    const originalSyncPlayerCamera = syncPlayerCamera;
    syncPlayerCamera = function syncDownedCamera(...args) {
      const result = originalSyncPlayerCamera.apply(this, args);
      const raid = state.raid;
      const companion = raid?.companion;
      if (raid?.playerDowned && companion && !companion.dead) {
        camera.rotationQuaternion = null;
        camera.position.x = companion.x;
        camera.position.y = 1.62 + (companion.stairAction ? companion.stairVisualY : roofHeight(companion.onRoofBuildingId));
        camera.position.z = companion.z;
        camera.rotation.x = 0;
        camera.rotation.y = companion.heading;
        camera.rotation.z = 0;
        if (viewModel?.root) viewModel.root.setEnabled(false);
      } else if (viewModel?.root) {
        viewModel.root.setEnabled(true);
      }
      return result;
    };

    const renderCompanionStatus = (raid) => {
      const hud = refs.hud;
      if (!hud) return;
      let panel = document.getElementById('companionStatusPanel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'companionStatusPanel';
        panel.className = 'companion-status-panel';
        const anchor = hud.querySelector('.hud-left') ?? hud;
        anchor.appendChild(panel);
      }
      const companion = raid?.companion;
      const visible = Boolean(raid && raid.modeId === RAID_ID && companion && !companion.dead);
      panel.classList.toggle('hidden', !visible);
      if (!visible) return;
      const health = Math.max(0, Math.round(companion.health ?? 0));
      const maxHealth = Math.max(1, Math.round(companion.maxHealth ?? 1));
      const stateLabel = companion.downed
        ? L('倒地', 'Downed')
        : L('作战中', 'Combat ready');
      const key = `${health}/${maxHealth}|${stateLabel}|${companion.mobilityAction?.type ?? ''}`;
      if (panel.dataset.key === key) return;
      panel.dataset.key = key;
      panel.innerHTML = `<div class="companion-status-head"><span class="companion-dot"></span><strong>${L('克隆', 'Clone')}</strong><span>${stateLabel}</span></div><div class="companion-status-bar"><i style="width:${Math.min(100, (health / maxHealth) * 100)}%"></i></div><div class="companion-status-meta">${health} / ${maxHealth} HP</div>`;
    };

    const originalSyncHud = syncHud;
    syncHud = function syncRaidDownedHud(...args) {
      const result = originalSyncHud.apply(this, args);
      const raid = state.raid;
      if (!raid || raid.modeId !== RAID_ID) return result;
      renderCompanionStatus(raid);
      if (raid.playerDowned && refs.interactionPrompt) {
        const remaining = Math.max(0, raid.playerDownedTimer ?? DOWNED_TIME).toFixed(1);
        refs.interactionPrompt.textContent = raid.companion?.downed
          ? L('玩家与克隆均已倒地，行动失败。', 'Both the player and Clone are down. Operation failed.')
          : raid.interactionText || L(`倒地：克隆将先清敌再救援 · ${remaining}s`, `Downed: Clone clears nearby threats before reviving · ${remaining}s`);
      } else if (raid.companion?.downed && refs.interactionPrompt) {
        refs.interactionPrompt.textContent = raid.interactionText || L('克隆倒地：进入 2.5 米内后按住 E 救援（10 秒）', 'Clone down: enter the 2.5 m range and hold E to revive (10s)');
      }
      return result;
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function updateRaidWithCompanion(dt, ...args) {
      const result = originalUpdateRaid.call(this, dt, ...args);
      if (state.raid?.modeId === RAID_ID && !state.raid.training) {
        updateCompanionIncomingFire(state.raid, dt);
        updateCompanion(state.raid, dt);
      }
      return result;
    };

    const originalClearRaid = clearRaid;
    clearRaid = function clearRaidCompanion(...args) {
      const companion = state.raid?.companion;
      const result = originalClearRaid.apply(this, args);
      if (companion?.visual && typeof disposeVisual === 'function') disposeVisual(companion.visual);
      return result;
    };
  };

  boot();
})();
