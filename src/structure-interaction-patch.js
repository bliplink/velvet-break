(() => {
  if (window.__sdrStructureInteractionPatchApplied || window.__sdrStructureInteractionPatchWaiting) {
    return;
  }

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof obstacleDefs === 'undefined' ||
      typeof refs === 'undefined' ||
      typeof pointInsideObstacle === 'undefined' ||
      typeof pointInsideObstaclePadding === 'undefined' ||
      typeof resolveObstacleCollisions === 'undefined' ||
      typeof lineOfSightBlocked === 'undefined' ||
      typeof getCurrentInteraction === 'undefined' ||
      typeof triggerRaidInteract === 'undefined' ||
      typeof updatePlayer === 'undefined' ||
      typeof finishPlayerUseAction === 'undefined' ||
      typeof animateRaidEntities === 'undefined' ||
      typeof startRaid === 'undefined' ||
      typeof getPlayerViewHeight === 'undefined' ||
      typeof getPlayerMoveSpeed === 'undefined' ||
      typeof getAssaultAutoAimTarget === 'undefined' ||
      typeof getEnemyAimPoint === 'undefined' ||
      typeof useOperatorAbility === 'undefined' ||
      typeof killEnemy === 'undefined' ||
      typeof tryEnemyMobilityAction === 'undefined' ||
      !window.__sdrStructureRegistry
    ) {
      window.__sdrStructureInteractionPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }

    window.__sdrStructureInteractionPatchWaiting = false;
    if (window.__sdrStructureInteractionPatchApplied) {
      return;
    }
    window.__sdrStructureInteractionPatchApplied = true;

    const registry = window.__sdrStructureRegistry;

    const DOOR_INTERACT_RADIUS = 2.1;
    const WINDOW_INTERACT_RADIUS = 2.3;
    const LADDER_INTERACT_RADIUS = 2.1;
    const STAIRS_INTERACT_RADIUS = 2.4;
    const DOOR_SWING_ANGLE = 1.54;
    const DOOR_CORRIDOR_HALF = 0.72;
    const WINDOW_CORRIDOR_HALF = 0.84;
    const ROOF_VIEW_HEIGHT_BONUS = 1.28;
    const FALL_STUN_DURATION = 0.5;
    const FALL_DAMAGE_AMOUNT = 22;
    const PLAYER_MAX_HEALTH_OVERRIDE = 1500;
    const MEDKIT_HEAL_OVERRIDE = 150;
    const finishPlayerUseActionBeforeHeal = finishPlayerUseAction;
    finishPlayerUseAction = function finishWithMedkitHeal(player = state.raid?.player) {
      const medkitUsed = player?.useAction?.flavor === 'medkit';
      const healthBefore = player?.health ?? 0;
      const result = finishPlayerUseActionBeforeHeal(player);
      if (medkitUsed && player?.health > healthBefore) {
        player.health = Math.min(player.maxHealth, healthBefore + MEDKIT_HEAL_OVERRIDE);
      }
      return result;
    };
    const STAMINA_MAX = 100;
    const STAMINA_DRAIN_MOVING = 10;
    const STAMINA_DRAIN_SPRINT = 16;
    const STAMINA_REGEN_IDLE = 18;
    const STAMINA_SPEED_MULT = 0.52;
    const MOVE_KEY_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
    let staminaUi = null;

    const safeL = (zh, en) => (typeof L === 'function' ? L(zh, en) : zh);
    const hasMoveInput = () => MOVE_KEY_CODES.some((code) => state.input.keys.has(code));

    const getObstacleById = (id) => obstacleDefs.find((entry) => entry.id === id) ?? null;

    const getFaceNormal = (face) => {
      if (face === 'north') {
        return { x: 0, z: -1 };
      }
      if (face === 'south') {
        return { x: 0, z: 1 };
      }
      if (face === 'east') {
        return { x: 1, z: 0 };
      }
      return { x: -1, z: 0 };
    };

    const getFaceTangent = (face) => {
      if (face === 'north' || face === 'south') {
        return { x: 1, z: 0 };
      }
      return { x: 0, z: 1 };
    };

    const getFeatureWallSide = (feature, obstacle) => {
      if (!feature || !obstacle) {
        return feature?.face ?? 'south';
      }
      const localX = feature.localX ?? feature.x - obstacle.x;
      const localZ = feature.localZ ?? feature.z - obstacle.z;
      if (Math.abs(localX + obstacle.w / 2) < 0.7) {
        return 'west';
      }
      if (Math.abs(localX - obstacle.w / 2) < 0.7) {
        return 'east';
      }
      if (Math.abs(localZ + obstacle.d / 2) < 0.7) {
        return 'north';
      }
      if (Math.abs(localZ - obstacle.d / 2) < 0.7) {
        return 'south';
      }
      return feature.face ?? (Math.abs(localX) > Math.abs(localZ) ? (localX >= 0 ? 'east' : 'west') : (localZ >= 0 ? 'south' : 'north'));
    };

    const ensureDoorPivot = (door) => {
      if (!door?.panel || door.__pivotReady) {
        return;
      }
      door.panel.setPivotPoint(new BABYLON.Vector3(-door.width / 2, 0, 0));
      door.__pivotReady = true;
    };

    const applyStatusLampVisual = (feature, active) => {
      if (!feature?.statusLamp?.material) {
        return;
      }
      const closedDiffuse = feature.type === 'window' ? '#79d9ff' : '#f7b36d';
      const closedEmissive = feature.type === 'window' ? '#2e8eb6' : '#8d5529';
      const openDiffuse = '#9dffb6';
      const openEmissive = '#3d925b';
      feature.statusLamp.material.diffuseColor = BABYLON.Color3.FromHexString(active ? openDiffuse : closedDiffuse);
      feature.statusLamp.material.emissiveColor = BABYLON.Color3.FromHexString(active ? openEmissive : closedEmissive);
    };

    const applyDoorVisualState = (door) => {
      applyStatusLampVisual(door, Boolean(door?.open));
      if (door?.panel?.material) {
        door.panel.material.diffuseColor = BABYLON.Color3.FromHexString(door.open ? '#7d947f' : '#6d4e37');
        door.panel.material.emissiveColor = BABYLON.Color3.FromHexString(door.open ? '#47634c' : '#2b2018');
      }
      if (door?.lintel?.material) {
        door.lintel.material.diffuseColor = BABYLON.Color3.FromHexString(door.open ? '#7a9180' : '#465861');
      }
    };

    const applyWindowVisualState = (windowFeature) => {
      applyStatusLampVisual(windowFeature, Boolean(windowFeature?.broken));
      if (windowFeature?.frame?.material) {
        windowFeature.frame.material.emissiveColor = BABYLON.Color3.FromHexString(windowFeature.broken ? '#21443a' : '#142028');
      }
    };

    const actorInsideObstacle = (actor, obstacle, inset = 0) => {
      if (!actor || !obstacle) {
        return false;
      }
      return (
        actor.x > obstacle.x - obstacle.w / 2 + inset &&
        actor.x < obstacle.x + obstacle.w / 2 - inset &&
        actor.z > obstacle.z - obstacle.d / 2 + inset &&
        actor.z < obstacle.z + obstacle.d / 2 - inset
      );
    };

    const getPassableFeaturesForObstacle = () => [];

    const ensureStaminaUi = () => {
      if (staminaUi?.panel?.isConnected) {
        return staminaUi;
      }
      const tacticalStrip = document.querySelector('.tactical-strip');
      if (!tacticalStrip) {
        return null;
      }
      let panel = document.getElementById('staminaPanel') || document.querySelector('.stamina-stat');
      if (panel && !panel.id) panel.id = 'staminaPanel';
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'staminaPanel';
        panel.className = 'hud-stat compact-stat stamina-panel';
        panel.innerHTML = `
          <span>${safeL('体力', 'Stamina')}</span>
          <strong id="staminaValue">100 / 100</strong>
          <small id="staminaDetail">${safeL('移动消耗，静止恢复', 'Drains while moving, recovers while idle')}</small>
          <div class="mini-progress" aria-hidden="true"><span id="staminaMeterFill"></span></div>
        `;
        tacticalStrip.appendChild(panel);
      }
      staminaUi = {
        panel,
        value: panel.querySelector('#staminaValue'),
        detail: panel.querySelector('#staminaDetail'),
        fill: panel.querySelector('#staminaMeterFill'),
      };
      return staminaUi;
    };

    const syncStaminaUi = (player) => {
      const ui = ensureStaminaUi();
      if (!ui || !player) {
        return;
      }
      const stamina = Math.round(player.stamina ?? STAMINA_MAX);
      const ratio = clamp((player.stamina ?? STAMINA_MAX) / STAMINA_MAX, 0, 1);
      ui.value.textContent = `${stamina} / ${STAMINA_MAX}`;
      ui.detail.textContent = ratio <= 0.01
        ? safeL('体力耗尽，移速降低', 'Exhausted, movement slowed')
        : ratio < 0.3
          ? safeL('体力偏低', 'Low stamina')
          : safeL('移动消耗，静止恢复', 'Drains while moving, recovers while idle');
      if (ui.fill) {
        ui.fill.style.width = `${ratio * 100}%`;
        ui.fill.style.background = ratio <= 0.01 ? '#d97568' : ratio < 0.3 ? '#d8c17a' : '#7ed0be';
      }
    };

    const ensurePlayerStaminaState = (player) => {
      if (!player) {
        return;
      }
      if (!Number.isFinite(player.stamina)) {
        player.stamina = STAMINA_MAX;
      }
      if (!Number.isFinite(player.maxStamina)) {
        player.maxStamina = STAMINA_MAX;
      }
      player.stamina = clamp(player.stamina, 0, STAMINA_MAX);
      player.maxStamina = STAMINA_MAX;
    };

    const resetStructureStates = () => {
      for (const door of registry.doors) {
        door.open = false;
        door.openAmount = 0;
        if (door.panel) {
          ensureDoorPivot(door);
          door.panel.rotation.y = door.rotY;
        }
        applyDoorVisualState(door);
      }
      for (const windowFeature of registry.windows) {
        windowFeature.broken = false;
        windowFeature.breakTimer = 0;
        if (windowFeature.pane) {
          windowFeature.pane.setEnabled(true);
          windowFeature.pane.scaling.setAll(1);
          if (windowFeature.pane.material) {
            windowFeature.pane.material.alpha = 0.22;
          }
        }
        applyWindowVisualState(windowFeature);
      }
    };

    const syncActorStructureState = (actor) => {
      if (!actor) {
        return;
      }

      if (actor.onRoofBuildingId) {
        actor.insideBuildingId = actor.onRoofBuildingId;
        const roofObstacle = getObstacleById(actor.onRoofBuildingId);
        if (!roofObstacle || !actorInsideObstacle(actor, roofObstacle, -0.24)) {
          actor.onRoofBuildingId = null;
          actor.insideBuildingId = null;
        }
        return;
      }

      if (actor.insideBuildingId) {
        const currentObstacle = getObstacleById(actor.insideBuildingId);
        if (!currentObstacle || !actorInsideObstacle(actor, currentObstacle, -0.18)) {
          actor.insideBuildingId = null;
        }
      }

      if (actor.insideBuildingId) {
        return;
      }

      for (const obstacle of obstacleDefs) {
        if (!actorInsideObstacle(actor, obstacle, -0.12)) {
          continue;
        }
        if (getPassableFeaturesForObstacle(obstacle.id).length) {
          actor.insideBuildingId = obstacle.id;
          return;
        }
      }
    };

    const beginStructureTraverse = (player, type, endX, endZ, duration, messages, options = {}) => {
      const raid = state.raid;
      if (!raid || !player || player.structureAction || player.reloadTimer > 0 || player.healTimer > 0 || raid.switchSequence) {
        return false;
      }
      player.structureAction = {
        type,
        startX: player.x,
        startZ: player.z,
        endX,
        endZ,
        path: options.path ?? null,
        stairEyeLift: options.stairEyeLift ?? 0,
        timer: duration,
        duration,
        statusZh: messages.statusZh,
        statusEn: messages.statusEn,
        finalize: {
          insideBuildingId: options.insideBuildingId,
          onRoofBuildingId: options.onRoofBuildingId,
          clearInsideBuilding: Boolean(options.clearInsideBuilding),
          clearRoofBuilding: Boolean(options.clearRoofBuilding),
        },
      };
      state.input.fireHeld = false;
      state.input.interactHeld = false;
      raid.statusText = safeL(messages.statusZh, messages.statusEn);
      notify(safeL(messages.labelZh, messages.labelEn), 'success');
      return true;
    };

    const updateStructureTraverse = (dt, raid, player) => {
      const action = player?.structureAction;
      if (!action) {
        return false;
      }
      action.timer = Math.max(0, action.timer - dt);
      const progress = clamp(1 - action.timer / Math.max(action.duration, 0.001), 0, 1);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      if (action.path?.length > 1) {
        const segments = [];
        let total = 0;
        for (let index = 1; index < action.path.length; index++) {
          const from = action.path[index - 1];
          const to = action.path[index];
          const length = Math.hypot(to.x - from.x, to.z - from.z, (to.y - from.y) * 0.45);
          segments.push({ from, to, start: total, length });
          total += length;
        }
        const travel = eased * total;
        const segment = segments.find((entry) => travel <= entry.start + entry.length) ?? segments[segments.length - 1];
        const section = clamp((travel - segment.start) / Math.max(0.001, segment.length), 0, 1);
        player.x = lerp(segment.from.x, segment.to.x, section);
        player.z = lerp(segment.from.z, segment.to.z, section);
        action.stairEyeLift = lerp(segment.from.y, segment.to.y, section);
        player.velocityBob += dt * 21;
      } else {
        player.x = lerp(action.startX, action.endX, eased);
        player.z = lerp(action.startZ, action.endZ, eased);
        player.velocityBob += dt * 12;
      }
      raid.interactionText = safeL(action.statusZh, action.statusEn);
      if (action.timer <= 0) {
        player.x = action.endX;
        player.z = action.endZ;
        if (action.finalize.clearRoofBuilding) {
          player.onRoofBuildingId = null;
        }
        if (action.finalize.clearInsideBuilding) {
          player.insideBuildingId = null;
        }
        if (action.finalize.insideBuildingId !== undefined) {
          player.insideBuildingId = action.finalize.insideBuildingId;
        }
        if (action.finalize.onRoofBuildingId !== undefined) {
          player.onRoofBuildingId = action.finalize.onRoofBuildingId;
        }
        player.structureAction = null;
        syncActorStructureState(player);
        spawnPulse(new BABYLON.Vector3(player.x, 0.82, player.z), '#b9ebff', 0.08, 0.12);
      }
      return true;
    };

    const isStructurePassable = () => false;

    const isPointInsideFeaturePassage = (x, z, feature, padding = 0) => {
      if (!isStructurePassable(feature)) {
        return false;
      }
      const obstacle = getObstacleById(feature.obstacleId);
      if (!obstacle) {
        return false;
      }
      const halfBand = (
        feature.type === 'door'
          ? Math.max(DOOR_CORRIDOR_HALF, feature.width * 0.55)
          : Math.max(WINDOW_CORRIDOR_HALF, feature.width * 0.58)
      ) + padding;
      if (feature.face === 'north' || feature.face === 'south') {
        return (
          x >= feature.x - halfBand &&
          x <= feature.x + halfBand &&
          z >= obstacle.z - obstacle.d / 2 - padding &&
          z <= obstacle.z + obstacle.d / 2 + padding
        );
      }
      return (
        z >= feature.z - halfBand &&
        z <= feature.z + halfBand &&
        x >= obstacle.x - obstacle.w / 2 - padding &&
        x <= obstacle.x + obstacle.w / 2 + padding
      );
    };

    const obstacleBlocksPoint = (obstacle, x, z, padding = 0) => {
      if (
        x <= obstacle.x - obstacle.w / 2 - padding ||
        x >= obstacle.x + obstacle.w / 2 + padding ||
        z <= obstacle.z - obstacle.d / 2 - padding ||
        z >= obstacle.z + obstacle.d / 2 + padding
      ) {
        return false;
      }
      return true;
    };

    pointInsideObstacle = function patchedPointInsideObstacle(x, z) {
      for (const obstacle of obstacleDefs) {
        if (obstacleBlocksPoint(obstacle, x, z, 0)) {
          return true;
        }
      }
      return false;
    };

    pointInsideObstaclePadding = function patchedPointInsideObstaclePadding(x, z, padding = 0) {
      for (const obstacle of obstacleDefs) {
        if (obstacleBlocksPoint(obstacle, x, z, padding)) {
          return true;
        }
      }
      return false;
    };

    const resolveStairCollision = (entity, stair, radius) => {
      if (!entity || !stair || entity.onRoofBuildingId === stair.obstacleId || entity.structureAction?.type === 'stairs') {
        return;
      }
      const run = stair.run ?? Math.max(1.1, ((stair.stepCount ?? 4) - 1) * 0.38 + 0.68);
      const centerX = stair.x + stair.dirX * run * 0.5;
      const centerZ = stair.z + stair.dirZ * run * 0.5;
      const halfX = Math.abs(stair.dirX) > 0 ? run * 0.5 + 0.1 : Math.max(0.78, (stair.width ?? 1.5) * 0.5);
      const halfZ = Math.abs(stair.dirZ) > 0 ? run * 0.5 + 0.1 : Math.max(0.78, (stair.depth ?? 1.5) * 0.5);
      const nearestX = clamp(entity.x, centerX - halfX, centerX + halfX);
      const nearestZ = clamp(entity.z, centerZ - halfZ, centerZ + halfZ);
      const dx = entity.x - nearestX;
      const dz = entity.z - nearestZ;
      const distance = Math.hypot(dx, dz);
      if (distance > 0 && distance < radius) {
        const push = radius - distance + 0.001;
        entity.x += (dx / distance) * push;
        entity.z += (dz / distance) * push;
        return;
      }
      if (distance === 0) {
        const escapeX = halfX - Math.abs(entity.x - centerX);
        const escapeZ = halfZ - Math.abs(entity.z - centerZ);
        if (escapeX < escapeZ) {
          entity.x += entity.x < centerX ? -(escapeX + radius) : escapeX + radius;
        } else {
          entity.z += entity.z < centerZ ? -(escapeZ + radius) : escapeZ + radius;
        }
      }
    };

    resolveObstacleCollisions = function patchedResolveObstacleCollisions(entity, radius) {
      for (const obstacle of obstacleDefs) {
        if (entity?.onRoofBuildingId === obstacle.id || entity?.insideBuildingId === obstacle.id) {
          continue;
        }
        if (actorInsideObstacle(entity, obstacle, -0.08) && getPassableFeaturesForObstacle(obstacle.id).length) {
          entity.insideBuildingId = obstacle.id;
          continue;
        }
        if (!obstacleBlocksPoint(obstacle, entity.x, entity.z, radius * 0.2)) {
          continue;
        }

        const closestX = clamp(entity.x, obstacle.x - obstacle.w / 2, obstacle.x + obstacle.w / 2);
        const closestZ = clamp(entity.z, obstacle.z - obstacle.d / 2, obstacle.z + obstacle.d / 2);
        const dx = entity.x - closestX;
        const dz = entity.z - closestZ;
        const distance = Math.hypot(dx, dz);

        if (distance > 0 && distance < radius) {
          const push = (radius - distance) + 0.001;
          entity.x += (dx / distance) * push;
          entity.z += (dz / distance) * push;
        } else if (distance === 0) {
          const overlapX = Math.min(
            Math.abs(entity.x - (obstacle.x - obstacle.w / 2)),
            Math.abs(entity.x - (obstacle.x + obstacle.w / 2)),
          );
          const overlapZ = Math.min(
            Math.abs(entity.z - (obstacle.z - obstacle.d / 2)),
            Math.abs(entity.z - (obstacle.z + obstacle.d / 2)),
          );
          if (overlapX < overlapZ) {
            entity.x += entity.x < obstacle.x ? -(overlapX + radius + 0.001) : overlapX + radius + 0.001;
          } else {
            entity.z += entity.z < obstacle.z ? -(overlapZ + radius + 0.001) : overlapZ + radius + 0.001;
          }
        }
      }
      for (const stair of registry.stairs) {
        resolveStairCollision(entity, stair, radius);
      }
      if (entity?.onRoofBuildingId) {
        for (const prop of registry.roofProps ?? []) {
          if (prop.obstacleId !== entity.onRoofBuildingId || !obstacleBlocksPoint(prop, entity.x, entity.z, radius)) continue;
          const closestX = clamp(entity.x, prop.x - prop.w / 2, prop.x + prop.w / 2);
          const closestZ = clamp(entity.z, prop.z - prop.d / 2, prop.z + prop.d / 2);
          const dx = entity.x - closestX;
          const dz = entity.z - closestZ;
          const distance = Math.hypot(dx, dz);
          if (distance > 0 && distance < radius) {
            entity.x += dx / distance * (radius - distance + 0.001);
            entity.z += dz / distance * (radius - distance + 0.001);
          } else if (distance === 0) {
            const escapeX = prop.w / 2 - Math.abs(entity.x - prop.x);
            const escapeZ = prop.d / 2 - Math.abs(entity.z - prop.z);
            if (escapeX < escapeZ) entity.x += entity.x < prop.x ? -(escapeX + radius + 0.001) : escapeX + radius + 0.001;
            else entity.z += entity.z < prop.z ? -(escapeZ + radius + 0.001) : escapeZ + radius + 0.001;
          }
        }
      }
    };

    lineOfSightBlocked = function patchedLineOfSightBlocked(ax, az, bx, bz) {
      const steps = Math.ceil(distance2D(ax, az, bx, bz) / 1.2);
      for (let step = 1; step < steps; step += 1) {
        const t = step / steps;
        const x = lerp(ax, bx, t);
        const z = lerp(az, bz, t);
        if (pointInsideObstacle(x, z)) {
          return true;
        }
      }
      return false;
    };

    const getBaseInteractionDistance = (interaction, player) => {
      if (!interaction || !player) {
        return Infinity;
      }
      if (interaction.type === 'container') {
        return distance2D(player.x, player.z, interaction.container.x, interaction.container.z);
      }
      if (interaction.type === 'switch') {
        return distance2D(player.x, player.z, interaction.point.x, interaction.point.z);
      }
      if (interaction.type === 'extract') {
        return distance2D(player.x, player.z, interaction.zone.x, interaction.zone.z);
      }
      return Infinity;
    };

    const getNearestCustomInteraction = (player) => {
      let best = null;

      const consider = (candidate, distance) => {
        if (!candidate || !Number.isFinite(distance)) {
          return;
        }
        if (!best || distance < best.distance) {
          best = { ...candidate, distance };
        }
      };

      for (const door of registry.doors) {
        if (player.onRoofBuildingId) continue;
        const dist = distance2D(player.x, player.z, door.x, door.z);
        if (dist <= DOOR_INTERACT_RADIUS) {
          consider({ type: 'door', door }, dist);
        }
      }
      for (const windowFeature of registry.windows) {
        if (player.onRoofBuildingId) continue;
        const dist = distance2D(player.x, player.z, windowFeature.x, windowFeature.z);
        if (dist <= WINDOW_INTERACT_RADIUS) {
          consider({ type: 'window', windowFeature }, dist);
        }
      }
      for (const ladder of registry.ladders) {
        if (player.onRoofBuildingId && player.onRoofBuildingId !== ladder.obstacleId) continue;
        const ladderPoint = player.onRoofBuildingId === ladder.obstacleId
          ? getLadderTraverseTarget(ladder, true) : ladder;
        const dist = distance2D(player.x, player.z, ladderPoint.x, ladderPoint.z);
        if (dist <= LADDER_INTERACT_RADIUS) {
          consider({ type: 'ladder', ladder }, dist);
        }
      }
      for (const stair of registry.stairs) {
        if (player.onRoofBuildingId && player.onRoofBuildingId !== stair.obstacleId) continue;
        const stairPoint = player.onRoofBuildingId === stair.obstacleId
          ? getStairRoofTarget(stair) : stair;
        const dist = distance2D(player.x, player.z, stairPoint.x, stairPoint.z);
        if (dist <= STAIRS_INTERACT_RADIUS) {
          consider({ type: 'stairs', stair }, dist);
        }
      }
      for (const easterEgg of registry.easterEggs ?? []) {
        if (player.onRoofBuildingId) continue;
        const dist = distance2D(player.x, player.z, easterEgg.x, easterEgg.z);
        if (dist <= 2.1) consider({ type: 'easterEgg', easterEgg }, dist);
      }
      return best;
    };

    const originalGetCurrentInteraction = getCurrentInteraction;
    getCurrentInteraction = function patchedGetCurrentInteraction() {
      const raid = state.raid;
      const player = raid?.player;
      const base = originalGetCurrentInteraction();
      if (!raid || !player) {
        return base;
      }
      const custom = getNearestCustomInteraction(player);
      if (!custom) {
        return base;
      }
      const baseDistance = getBaseInteractionDistance(base, player);
      return custom.distance <= baseDistance - 0.08 ? custom : base;
    };

    const toggleDoor = (door) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!door || !player) {
        return false;
      }
      if (
        door.open &&
        player.insideBuildingId !== door.obstacleId &&
        player.onRoofBuildingId !== door.obstacleId &&
        distance2D(player.x, player.z, door.x, door.z) < 1.1
      ) {
        notify(safeL('门边太近，先后退一点。', 'Step back before closing the door.'), 'warning');
        return false;
      }
      door.open = !door.open;
      applyDoorVisualState(door);
      playSwitchAudio({ x: door.x, z: door.z }, door.open);
      notify(safeL(door.open ? '已开门。' : '已关门。', door.open ? 'Door opened.' : 'Door closed.'), 'success');
      return true;
    };

    const breakWindow = (windowFeature) => {
      if (!windowFeature || windowFeature.broken) {
        return false;
      }
      windowFeature.broken = true;
      windowFeature.breakTimer = 0.18;
      applyWindowVisualState(windowFeature);
      const impactPoint = new BABYLON.Vector3(windowFeature.x, Math.max(0.9, windowFeature.y), windowFeature.z);
      spawnImpactBurst(impactPoint, '#b7efff', 1.15, 'hard');
      playImpactAudio(impactPoint, 'hard');
      notify(safeL('窗户已打碎。', 'Window shattered.'), 'warning');
      return true;
    };

    const notifyWindowAlreadyBroken = () => {
      notify(safeL('窗户已经打碎。', 'Window is already broken.'), 'warning');
      return true;
    };

    const getTraverseTargetForWallFeature = (feature, player) => {
      const obstacle = getObstacleById(feature.obstacleId);
      if (!obstacle) {
        return null;
      }
      const outward = getFaceNormal(feature.face);
      const tangent = getFaceTangent(feature.face);
      const along = (player.x - feature.x) * tangent.x + (player.z - feature.z) * tangent.z;
      const clampedAlong = clamp(along, -0.22, 0.22);
      const currentSide = (player.x - feature.x) * outward.x + (player.z - feature.z) * outward.z;
      const targetSide = currentSide >= 0 ? -1 : 1;
      const corridorDepth = feature.face === 'north' || feature.face === 'south' ? obstacle.d : obstacle.w;
      return {
        x: feature.x + tangent.x * clampedAlong + outward.x * (corridorDepth / 2 + 1.05) * targetSide,
        z: feature.z + tangent.z * clampedAlong + outward.z * (corridorDepth / 2 + 1.05) * targetSide,
      };
    };

    const getInteriorTargetForFeature = (feature, player) => {
      const obstacle = getObstacleById(feature.obstacleId);
      if (!obstacle) {
        return null;
      }
      const outward = getFaceNormal(feature.face);
      const tangent = getFaceTangent(feature.face);
      const along = (player.x - feature.x) * tangent.x + (player.z - feature.z) * tangent.z;
      const clampedAlong = clamp(along, -0.42, 0.42);
      const inwardOffset = feature.type === 'window' ? 1.18 : 1.36;
      return {
        x: feature.x + tangent.x * clampedAlong - outward.x * inwardOffset,
        z: feature.z + tangent.z * clampedAlong - outward.z * inwardOffset,
      };
    };

    const getLadderTraverseTarget = (ladder, toRoof) => {
      const obstacle = getObstacleById(ladder?.obstacleId);
      if (!obstacle) {
        return null;
      }
      const side = getFeatureWallSide(ladder, obstacle);
      const roofInset = Math.max(3.05, Math.min(obstacle.w, obstacle.d) * 0.34);
      const groundOffset = 1.06;
      const climbLane = clamp(
        side === 'west' || side === 'east'
          ? (ladder.localZ ?? ladder.z - obstacle.z)
          : (ladder.localX ?? ladder.x - obstacle.x),
        -Math.max(0.4, (side === 'west' || side === 'east' ? obstacle.d : obstacle.w) * 0.28),
        Math.max(0.4, (side === 'west' || side === 'east' ? obstacle.d : obstacle.w) * 0.28),
      );

      if (side === 'west') {
        return {
          x: toRoof ? obstacle.x - obstacle.w / 2 + roofInset : obstacle.x - obstacle.w / 2 - groundOffset,
          z: obstacle.z + climbLane,
        };
      }
      if (side === 'east') {
        return {
          x: toRoof ? obstacle.x + obstacle.w / 2 - roofInset : obstacle.x + obstacle.w / 2 + groundOffset,
          z: obstacle.z + climbLane,
        };
      }
      if (side === 'north') {
        return {
          x: obstacle.x + climbLane,
          z: toRoof ? obstacle.z - obstacle.d / 2 + roofInset : obstacle.z - obstacle.d / 2 - groundOffset,
        };
      }
      return {
        x: obstacle.x + climbLane,
        z: toRoof ? obstacle.z + obstacle.d / 2 - roofInset : obstacle.z + obstacle.d / 2 + groundOffset,
      };
    };

    const getStairGroundTarget = (stair) => ({
      x: stair.x - stair.dirX * 0.9,
      z: stair.z - stair.dirZ * 0.9,
    });

    const getStairTopTarget = (stair) => ({
      x: stair.x + stair.dirX * (stair.run ?? stair.stepCount * 0.38),
      z: stair.z + stair.dirZ * (stair.run ?? stair.stepCount * 0.38),
    });

    const getStairRoofTarget = (stair) => {
      const obstacle = getObstacleById(stair.obstacleId);
      const top = getStairTopTarget(stair);
      if (!obstacle) return top;
      return {
        x: clamp(top.x, obstacle.x - obstacle.w / 2 + 0.65, obstacle.x + obstacle.w / 2 - 0.65),
        z: clamp(top.z, obstacle.z - obstacle.d / 2 + 0.65, obstacle.z + obstacle.d / 2 - 0.65),
      };
    };

    const traverseWindow = (windowFeature) => {
      const player = state.raid?.player;
      if (!windowFeature || !player) return false;
      if (!windowFeature.broken) return breakWindow(windowFeature);
      const target = getTraverseTargetForWallFeature(windowFeature, player);
      if (!target) return false;
      const leaving = player.insideBuildingId === windowFeature.obstacleId;
      return beginStructureTraverse(player, 'window', target.x, target.z, 0.5, {
        labelZh: leaving ? '翻窗离开建筑。' : '翻窗进入建筑。',
        labelEn: leaving ? 'Vaulted out through the window.' : 'Vaulted in through the window.',
        statusZh: '翻窗中...',
        statusEn: 'Vaulting...',
      }, {
        insideBuildingId: leaving ? null : windowFeature.obstacleId,
        clearInsideBuilding: leaving,
      });
    };

    const activateEasterEgg = (easterEgg) => {
      if (!easterEgg) return false;
      const first = !state.save.easterEggSignalFound;
      easterEgg.used = true;
      if (easterEgg.screen?.material) {
        easterEgg.screen.material.emissiveColor = BABYLON.Color3.FromHexString('#ffd36f');
      }
      if (first) {
        state.save.easterEggSignalFound = true;
        state.save.money = Math.max(0, Number(state.save.money ?? 0)) + 2025;
        persistSave();
        notify(safeL('彩蛋：隐藏信号 2025-10-01 已解码。奖励 2,025。', 'Easter egg: hidden signal 2025-10-01 decoded. Reward: 2,025.'), 'success');
      } else {
        notify(safeL('隐藏终端：信号已经解码。', 'Hidden terminal: signal already decoded.'), 'success');
      }
      return true;
    };

    const traverseLadder = (ladder) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!ladder || !player) {
        return false;
      }
      const onRoof = player.onRoofBuildingId === ladder.obstacleId;
      const target = getLadderTraverseTarget(ladder, !onRoof);
      if (!target) {
        return false;
      }
      player.safeRoofExitTimer = 0.9;
      beginMobilityAction(player, 'jump', target.x - player.x, target.z - player.z, {
        duration: 0.76,
        speed: 5.8,
        height: 0.48,
        cooldown: 0.5,
      });
      playSwitchAudio({ x: ladder.x, z: ladder.z }, false);
      return beginStructureTraverse(player, 'ladder', target.x, target.z, 0.82, {
        labelZh: onRoof ? '沿梯子下地。' : '沿梯子上屋顶。',
        labelEn: onRoof ? 'Climbing down.' : 'Climbing to rooftop.',
        statusZh: '爬梯中...',
        statusEn: 'Climbing ladder...',
      }, {
        insideBuildingId: onRoof ? null : ladder.obstacleId,
        onRoofBuildingId: onRoof ? null : ladder.obstacleId,
        clearInsideBuilding: onRoof,
        clearRoofBuilding: onRoof,
      });
    };

    const traverseStairs = (stair) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!stair || !player) {
        return false;
      }
      const onRoof = player.onRoofBuildingId === stair.obstacleId;
      const target = onRoof ? getStairGroundTarget(stair) : getStairRoofTarget(stair);
      const roof = getObstacleById(stair.obstacleId);
      if (!roof) return false;
      const top = getStairTopTarget(stair);
      const ground = getStairGroundTarget(stair);
      const path = onRoof
        ? [{ x: player.x, z: player.z, y: roof.h }, { ...top, y: roof.h }, { x: stair.x, z: stair.z, y: 0.18 }, { ...ground, y: 0 }]
        : [{ x: player.x, z: player.z, y: 0 }, { x: stair.x, z: stair.z, y: 0.18 }, { ...top, y: roof.h }, { ...target, y: roof.h }];
      player.safeRoofExitTimer = 0.9;
      playSwitchAudio({ x: stair.x, z: stair.z }, false);
      return beginStructureTraverse(player, 'stairs', target.x, target.z, Math.max(2.2, roof.h * 0.54), {
        labelZh: onRoof ? '开始下楼。' : '开始上楼。',
        labelEn: onRoof ? 'Descending stairs.' : 'Ascending stairs.',
        statusZh: onRoof ? '下楼中' : '上楼中',
        statusEn: onRoof ? 'Descending' : 'Ascending',
      }, {
        path,
        stairEyeLift: onRoof ? roof.h : 0,
        insideBuildingId: onRoof ? null : stair.obstacleId,
        onRoofBuildingId: onRoof ? null : stair.obstacleId,
        clearInsideBuilding: onRoof,
        clearRoofBuilding: onRoof,
      });
    };

    const originalTriggerRaidInteract = triggerRaidInteract;
    triggerRaidInteract = function patchedTriggerRaidInteract() {
      if (state.mode !== 'raid' || !state.raid || state.overlay) {
        return;
      }
      unlockAudioContext();
      const interaction = getCurrentInteraction();
      if (interaction?.type === 'door') {
        toggleDoor(interaction.door);
        return;
      }
      if (interaction?.type === 'window') {
        traverseWindow(interaction.windowFeature);
        return;
      }
      if (interaction?.type === 'ladder') {
        traverseLadder(interaction.ladder);
        return;
      }
      if (interaction?.type === 'stairs') {
        traverseStairs(interaction.stair);
        return;
      }
      if (interaction?.type === 'easterEgg') {
        activateEasterEgg(interaction.easterEgg);
        return;
      }
      originalTriggerRaidInteract();
    };

    const originalUseOperatorAbility = useOperatorAbility;
    useOperatorAbility = function patchedUseOperatorAbility() {
      const raid = state.raid;
      const player = raid?.player;
      const abilityBefore = player?.abilityActiveTimer ?? 0;
      const chargesBefore = player?.abilityCharges ?? 0;
      originalUseOperatorAbility();
      if (!raid || !player) {
        return;
      }
      if (player.operatorId === 'recon' && chargesBefore > (player.abilityCharges ?? 0) && (player.abilityActiveTimer ?? 0) > abilityBefore) {
        const targets = [...raid.enemies]
          .filter((enemy) => !enemy.dead)
          .sort((a, b) => distance2D(player.x, player.z, a.x, a.z) - distance2D(player.x, player.z, b.x, b.z))
          .slice(0, 6);
        for (const enemy of targets) {
          killEnemy(enemy);
        }
        if (targets.length > 0) {
          notify(
            safeL(`侦察兵已清除最近的 ${targets.length} 名敌人。`, `Recon eliminated the nearest ${targets.length} enemies.`),
            'success',
          );
        }
      }
    };

    const originalGetPlayerMoveSpeed = getPlayerMoveSpeed;
    getPlayerMoveSpeed = function patchedGetPlayerMoveSpeed(player, sprinting = false) {
      const speed = originalGetPlayerMoveSpeed(player, sprinting);
      if (!player) {
        return speed;
      }
      ensurePlayerStaminaState(player);
      if ((hasMoveInput() || player.mobilityAction) && (player.stamina ?? 0) <= 0.01) {
        return speed * STAMINA_SPEED_MULT;
      }
      return speed;
    };

    const originalUpdatePlayer = updatePlayer;
    updatePlayer = function patchedUpdatePlayer(dt) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player) {
        return originalUpdatePlayer(dt);
      }

      const previousRoofBuildingId = player.onRoofBuildingId ?? null;
      const previousHealth = player.health;
      const previousHealTimer = player.healTimer ?? 0;
      const previousUseActionFlavor = player.useAction?.flavor ?? null;
      ensurePlayerStaminaState(player);
      player.safeRoofExitTimer = Math.max(0, (player.safeRoofExitTimer ?? 0) - dt);
      player.fallStunTimer = Math.max(0, (player.fallStunTimer ?? 0) - dt);
      if ((player.maxHealth ?? 0) !== PLAYER_MAX_HEALTH_OVERRIDE) {
        const ratio = (player.maxHealth ?? 0) > 0 ? (player.health ?? 0) / player.maxHealth : 1;
        player.maxHealth = PLAYER_MAX_HEALTH_OVERRIDE;
        player.health = Math.min(player.maxHealth, Math.max(player.health ?? player.maxHealth, Math.round(player.maxHealth * ratio)));
      }
      const movementLocked = Boolean(raid.switchSequence || (player.dropTimer ?? 0) > 0 || player.structureAction);
      const movingNow = (hasMoveInput() || Boolean(player.mobilityAction)) && !movementLocked;
      if (movingNow) {
        const sprinting = state.input.keys.has('ShiftLeft') || state.input.keys.has('ShiftRight');
        const drain = player.operatorId === 'assault' ? 5 : (sprinting ? STAMINA_DRAIN_SPRINT : STAMINA_DRAIN_MOVING);
        player.stamina = Math.max(0, player.stamina - dt * drain);
      } else {
        player.stamina = Math.min(STAMINA_MAX, player.stamina + dt * STAMINA_REGEN_IDLE);
      }
      syncActorStructureState(player);
      if (updateStructureTraverse(dt, raid, player)) {
        syncStaminaUi(player);
        if (player.health <= 0) {
          finishRaid(false, 'player_killed', false);
        }
        return;
      }

      let savedMovementKeys = null;
      if ((player.fallStunTimer ?? 0) > 0) {
        savedMovementKeys = [];
        for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
          if (state.input.keys.has(code)) {
            savedMovementKeys.push(code);
            state.input.keys.delete(code);
          }
        }
      }
      originalUpdatePlayer(dt);
      if (
        previousUseActionFlavor === 'medkit' &&
        previousHealTimer > 0 &&
        (player.healTimer ?? 0) <= 0 &&
        player.health > previousHealth
      ) {
        player.health = Math.min(player.maxHealth, previousHealth + MEDKIT_HEAL_OVERRIDE);
      }
      if (savedMovementKeys?.length) {
        for (const code of savedMovementKeys) {
          state.input.keys.add(code);
        }
      }
      syncActorStructureState(player);
      syncStaminaUi(player);

      if (player.operatorId === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
        const targetEnemy = getAssaultAutoAimTarget(player);
        if (targetEnemy) {
          const aimPoint = getEnemyAimPoint(targetEnemy);
          const targetYaw = Math.atan2(targetEnemy.x - player.x, targetEnemy.z - player.z);
          const targetPitch = Math.atan2(getPlayerViewHeight(player) - aimPoint.y, distance2D(player.x, player.z, targetEnemy.x, targetEnemy.z));
          player.yaw = lerpAngle(player.yaw, targetYaw, Math.min(1, dt * 8.5));
          player.pitch = lerp(player.pitch, targetPitch, Math.min(1, dt * 7.5));
        }
      }

      if (
        previousRoofBuildingId &&
        !player.onRoofBuildingId &&
        !player.structureAction &&
        (player.safeRoofExitTimer ?? 0) <= 0
      ) {
        applyDamageToPlayer(FALL_DAMAGE_AMOUNT);
        player.fallStunTimer = FALL_STUN_DURATION;
        player.velocityBob = 0;
        raid.statusText = safeL('高处坠落，短暂失衡。', 'Hard landing. Movement briefly disabled.');
        playImpactAudio(new BABYLON.Vector3(player.x, 0.1, player.z), 'hard');
        spawnImpactBurst(new BABYLON.Vector3(player.x, 0.08, player.z), '#cfd8dc', 1, 'hard');
      }

      const interaction = getCurrentInteraction();
      if (!interaction || raid.switchSequence || player.structureAction) {
        return;
      }
      if (interaction.type === 'door') {
        raid.interactionText = safeL(
          interaction.door.open ? '按 E 关门' : '按 E 开门',
          interaction.door.open ? 'Press E to close door' : 'Press E to open door',
        );
      } else if (interaction.type === 'window') {
        raid.interactionText = safeL(
          interaction.windowFeature.broken ? '按 E 翻窗' : '按 E 破窗',
          interaction.windowFeature.broken ? 'Press E to vault window' : 'Press E to break window',
        );
      } else if (interaction.type === 'ladder') {
        raid.interactionText = safeL(
          player.onRoofBuildingId === interaction.ladder.obstacleId ? '按 E 下梯' : '按 E 上梯',
          player.onRoofBuildingId === interaction.ladder.obstacleId ? 'Press E to climb down' : 'Press E to climb up',
        );
      } else if (interaction.type === 'stairs') {
        raid.interactionText = safeL(
          player.onRoofBuildingId === interaction.stair.obstacleId ? '按 E 下楼梯' : '按 E 上楼梯',
          player.onRoofBuildingId === interaction.stair.obstacleId ? 'Press E to go downstairs' : 'Press E to go upstairs',
        );
      } else if (interaction.type === 'easterEgg') {
        raid.interactionText = safeL('按 E 调查异常信号', 'Press E to inspect strange signal');
      }
    };

    const originalUpdateEnemies = updateEnemies;
    updateEnemies = function patchedUpdateEnemies(dt) {
      originalUpdateEnemies(dt);
      const player = state.raid?.player ?? null;
      const findClosestObstacle = (entity) => {
        let best = null;
        for (const obstacle of obstacleDefs) {
          const closestX = clamp(entity.x, obstacle.x - obstacle.w / 2, obstacle.x + obstacle.w / 2);
          const closestZ = clamp(entity.z, obstacle.z - obstacle.d / 2, obstacle.z + obstacle.d / 2);
          const dx = entity.x - closestX;
          const dz = entity.z - closestZ;
          const distSq = dx * dx + dz * dz;
          if (!best || distSq < best.distSq) {
            best = { obstacle, dx, dz, distSq };
          }
        }
        return best;
      };
      for (const enemy of state.raid?.enemies ?? []) {
        syncActorStructureState(enemy);
        if (enemy.dead || enemy.despawned) {
          continue;
        }
        const moved = distance2D(enemy.x, enemy.z, enemy.lastNavX ?? enemy.x, enemy.lastNavZ ?? enemy.z);
        const activeCombat = (enemy.combatState ?? 'patrol') !== 'patrol';
        if (activeCombat && !enemy.mobilityAction && moved < 0.02) {
          enemy.wallStuckTimer = Math.max(0, (enemy.wallStuckTimer ?? 0) + dt);
        } else {
          enemy.wallStuckTimer = 0;
        }
        if ((enemy.wallStuckTimer ?? 0) > 0.55) {
          const facing = getFacingVectors(enemy.heading ?? 0);
          const side = enemy.strafeDirection ?? (Math.random() < 0.5 ? -1 : 1);
          const nearbyObstacle = findClosestObstacle(enemy);
          enemy.strafeDirection = -side;
          enemy.heading += side * 1.12;
          moveEntityWithCollision(enemy, facing.right.x * side * 0.9, facing.right.z * side * 0.9, enemy.radius);
          if (nearbyObstacle && nearbyObstacle.distSq < 3.24) {
            const dist = Math.max(0.001, Math.sqrt(nearbyObstacle.distSq));
            enemy.x += (nearbyObstacle.dx / dist) * 0.7;
            enemy.z += (nearbyObstacle.dz / dist) * 0.7;
          }
          enemy.wallStuckTimer = 0;
        }
        enemy.lastNavX = enemy.x;
        enemy.lastNavZ = enemy.z;
      }
    };

    const originalAnimateRaidEntities = animateRaidEntities;
    animateRaidEntities = function patchedAnimateRaidEntities(dt) {
      originalAnimateRaidEntities(dt);
      for (const mesh of world?.obstacleMeshes ?? []) {
        if (!mesh?.material) {
          continue;
        }
        mesh.material.alpha = 1;
      }
      for (const door of registry.doors) {
        ensureDoorPivot(door);
        door.openAmount = lerp(door.openAmount ?? 0, door.open ? 1 : 0, 0.16);
        if (door.panel) {
          const swingSign = door.face === 'north' || door.face === 'east' ? -1 : 1;
          door.panel.rotation.y = door.rotY + door.openAmount * DOOR_SWING_ANGLE * swingSign;
        }
      }
      for (const windowFeature of registry.windows) {
        if (!windowFeature.pane) {
          continue;
        }
        if ((windowFeature.breakTimer ?? 0) > 0) {
          windowFeature.breakTimer = Math.max(0, windowFeature.breakTimer - dt);
          const progress = 1 - windowFeature.breakTimer / 0.18;
          windowFeature.pane.scaling.x = 1 + progress * 0.18;
          windowFeature.pane.scaling.y = 1 - progress * 0.52;
          if (windowFeature.pane.material) {
            windowFeature.pane.material.alpha = Math.max(0, 0.22 * (1 - progress));
          }
          if (windowFeature.breakTimer <= 0) {
            windowFeature.pane.setEnabled(false);
          }
        }
      }
    };

    const originalGetPlayerViewHeight = getPlayerViewHeight;
    getPlayerViewHeight = function patchedGetPlayerViewHeight(player = state.raid?.player) {
      const base = originalGetPlayerViewHeight(player);
      if (player?.structureAction?.type === 'stairs') {
        const step = Math.sin(player.structureAction.stairEyeLift * Math.PI / 0.22) * 0.018;
        return base + player.structureAction.stairEyeLift + step;
      }
      if (!player?.onRoofBuildingId) return base;
      const roof = scene.getMeshByName(`roof-${player.onRoofBuildingId}`);
      if (!roof) return base + ROOF_VIEW_HEIGHT_BONUS;
      roof.computeWorldMatrix(true);
      return base + roof.getBoundingInfo().boundingBox.maximumWorld.y;
    };

    const originalTryEnemyMobilityAction = tryEnemyMobilityAction;
    tryEnemyMobilityAction = function patchedTryEnemyMobilityAction(enemy, pursuitDirection, lateral, distanceToPlayer, hasLineOfSight, wantsReposition) {
      if (
        enemy &&
        !enemy.dead &&
        !enemy.despawned &&
        !enemy.mobilityAction &&
        (enemy.mobilityCooldown ?? 0) <= 0 &&
        !enemy.isProne &&
        hasLineOfSight &&
        distanceToPlayer < enemy.preferredRange * 1.04 &&
        Math.random() < (enemy.type === 'scout' ? 0.34 : enemy.type === 'hunter' ? 0.24 : 0.16)
      ) {
        const side = enemy.strafeDirection ?? (Math.random() < 0.5 ? -1 : 1);
        if (beginMobilityAction(enemy, 'dodge', lateral.x * side, lateral.z * side, {
          duration: 0.4,
          speed: enemy.type === 'scout' ? 10.2 : enemy.type === 'hunter' ? 9.4 : 8.6,
          cooldown: 0.82,
        })) {
          return true;
        }
      }
      return originalTryEnemyMobilityAction(enemy, pursuitDirection, lateral, distanceToPlayer, hasLineOfSight, wantsReposition);
    };

    const findShotWindowHit = (origin, yaw, pitch, range) => {
      let best = null;
      const direction = new BABYLON.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(-pitch),
        Math.cos(yaw) * Math.cos(pitch),
      ).normalize();

      for (const windowFeature of registry.windows) {
        if (windowFeature.broken) {
          continue;
        }
        const normal = getFaceNormal(windowFeature.face);
        const denom = direction.x * normal.x + direction.z * normal.z;
        if (Math.abs(denom) < 0.0001) {
          continue;
        }
        const t = ((windowFeature.x - origin.x) * normal.x + (windowFeature.z - origin.z) * normal.z) / denom;
        if (t <= 0 || t > range) {
          continue;
        }
        const hitX = origin.x + direction.x * t;
        const hitY = origin.y + direction.y * t;
        const hitZ = origin.z + direction.z * t;
        if (hitY < windowFeature.y - windowFeature.height / 2 || hitY > windowFeature.y + windowFeature.height / 2) {
          continue;
        }
        if (windowFeature.face === 'north' || windowFeature.face === 'south') {
          if (Math.abs(hitX - windowFeature.x) > windowFeature.width * 0.5) {
            continue;
          }
        } else if (Math.abs(hitZ - windowFeature.z) > windowFeature.width * 0.5) {
          continue;
        }
        if (!best || t < best.t) {
          best = { windowFeature, hitX, hitY, hitZ, t };
        }
      }
      return best;
    };

    const originalAttemptShoot = attemptShoot;
    attemptShoot = function patchedAttemptShoot() {
      const player = state.raid?.player;
      if (!player) {
        return originalAttemptShoot();
      }
      const weaponBefore = getCurrentPlayerWeaponStats(player);
      const ammoBefore = player.ammoInMag;
      const yawBefore = player.yaw;
      const pitchBefore = player.pitch;
      const origin = new BABYLON.Vector3(player.x, getPlayerViewHeight(player), player.z);
      const result = originalAttemptShoot();
      if (player.ammoInMag < ammoBefore) {
        const shotWindow = findShotWindowHit(origin, yawBefore, pitchBefore, weaponBefore.range);
        if (shotWindow) {
          breakWindow(shotWindow.windowFeature);
        }
      }
      return result;
    };

    const originalStartRaidWrapper = window.__sdrPatchedStartRaid || startRaid;
    window.__sdrPatchedStartRaid = function patchedStartRaidWithStructures() {
      const result = originalStartRaidWrapper();
      resetStructureStates();
      if (state.raid?.player) {
        state.raid.player.structureAction = null;
        state.raid.player.insideBuildingId = null;
        state.raid.player.onRoofBuildingId = null;
        state.raid.player.maxHealth = PLAYER_MAX_HEALTH_OVERRIDE;
        state.raid.player.health = PLAYER_MAX_HEALTH_OVERRIDE;
        state.raid.player.maxStamina = STAMINA_MAX;
        state.raid.player.stamina = STAMINA_MAX;
        syncStaminaUi(state.raid.player);
      }
      for (const enemy of state.raid?.enemies ?? []) {
        enemy.insideBuildingId = null;
        enemy.onRoofBuildingId = null;
      }
      return result;
    };
    startRaid = window.__sdrPatchedStartRaid;

    resetStructureStates();
  };

  boot();
})();


