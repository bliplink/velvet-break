(() => {
  if (window.__sdrBattlefieldSquadWaiting || window.__sdrBattlefieldSquadApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof updateRaid === 'undefined' ||
      typeof createEnemyVisual === 'undefined' ||
      typeof BABYLON === 'undefined' ||
      typeof distance2D === 'undefined' ||
      typeof applyDamageToPlayer === 'undefined' ||
      typeof clearRaid === 'undefined' ||
      typeof disposeVisual === 'undefined'
    ) {
      window.__sdrBattlefieldSquadWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrBattlefieldSquadWaiting = false;
    if (window.__sdrBattlefieldSquadApplied) return;
    window.__sdrBattlefieldSquadApplied = true;

    const BATTLEFIELD_ID = 'battlefield';
    const ALLY_REVIVE_TIME = 3.5;
    const ALLY_MAX_COUNT = 6;
    const operatorIds = ['assault', 'assault', 'medic', 'medic', 'engineer', 'engineer'];
    const operatorNames = {
      assault: '凯',
      medic: '本杰明',
      engineer: '彦飞',
    };
    const operatorTypes = {
      assault: 'bruiser',
      medic: 'hunter',
      engineer: 'scout',
    };
    const operatorColors = {
      assault: '#c98e74',
      medic: '#75b99f',
      engineer: '#6e9fd0',
    };

    const makeAlly = (raid, operatorId, index) => {
      const player = raid.player;
      const angle = (index / ALLY_MAX_COUNT) * Math.PI * 2;
      const actor = {
        id: `battlefield-ally-${index}`,
        name: operatorNames[operatorId],
        type: operatorTypes[operatorId],
        visualColor: operatorColors[operatorId],
        x: player.x + Math.cos(angle) * (4.5 + (index % 2) * 1.4),
        z: player.z + Math.sin(angle) * (4.5 + (index % 2) * 1.4),
        heading: player.yaw ?? 0,
        radius: 0.72,
        health: player.maxHealth,
        maxHealth: player.maxHealth,
        damage: 24,
        speed: 3.2,
        preferredRange: 18,
        detectRange: 36,
        weapon: player.weapon,
        currentAmmoId: player.currentAmmoId,
        ammoInMag: player.ammoInMag,
        magSize: player.magSize,
        ammoInventory: { ...(player.ammoInventory ?? {}) },
        operatorId,
        abilityCharges: 4,
        downed: false,
        dead: false,
        reviveProgress: 0,
        reviveTargetId: null,
        healTimer: 5,
        shootTimer: 0.6 + index * 0.12,
        followOffset: { x: Math.cos(angle) * 3.4, z: Math.sin(angle) * 3.4 },
        visual: null,
      };
      actor.visual = createEnemyVisual(actor);
      actor.visual.root.scaling.setAll(0.96);
      actor.visual.classLabelMaterial.alpha = 0.9;
      actor.visual.classLabelText = operatorNames[operatorId];
      actor.visual.body.material.diffuseColor = BABYLON.Color3.FromHexString(operatorColors[operatorId]);
      return actor;
    };

    const createSquad = (raid) => {
      raid.allies = operatorIds.map((operatorId, index) => makeAlly(raid, operatorId, index));
      raid.playerReviveUsed = false;
      raid.playerDowned = false;
      raid.squadBrief = '6 名队友已部署：2 凯、2 本杰明、2 彦飞。';
      notify(L(raid.squadBrief, 'Squad deployed: 2 Kai, 2 Benjamin, and 2 Yanfei.'), 'success');
    };

    const livingAllies = (raid) => (raid.allies ?? []).filter((ally) => !ally.downed && !ally.dead);
    const nearestTarget = (raid, x, z, maxRange = 36) => (raid.enemies ?? [])
      .filter((enemy) => !enemy.dead && !enemy.despawned && !enemy.isRangeTarget)
      .map((enemy) => ({ enemy, distance: distance2D(x, z, enemy.x, enemy.z) }))
      .filter((entry) => entry.distance <= maxRange)
      .sort((left, right) => left.distance - right.distance)[0]?.enemy ?? null;

    const reviveActor = (actor) => {
      actor.downed = false;
      actor.dead = false;
      actor.health = Math.max(1, Math.round(actor.maxHealth * 0.4));
      actor.reviveProgress = 0;
      actor.reviveTargetId = null;
      if (actor.visual) {
        actor.visual.root.rotation.x = 0;
        actor.visual.root.position.y = 0;
      }
    };

    const updateAllyVisual = (ally, dt) => {
      if (!ally.visual) return;
      const root = ally.visual.root;
      root.position.x = ally.x;
      root.position.z = ally.z;
      root.rotation.y = ally.heading;
      if (ally.downed) {
        root.position.y = -0.5;
        root.rotation.x = Math.PI / 2;
      } else {
        root.position.y = Math.sin(performance.now() * 0.005 + ally.x) * 0.035;
        root.rotation.x *= 0.86;
      }
      ally.visual.flash.material.alpha = ally.shootTimer < 0.08 ? 0.72 : 0;
      ally.visual.body.material.emissiveColor = BABYLON.Color3.FromHexString(operatorColors[ally.operatorId]).scale(ally.downed ? 0.04 : 0.14);
    };

    const moveAlly = (ally, targetX, targetZ, dt) => {
      const dx = targetX - ally.x;
      const dz = targetZ - ally.z;
      const length = Math.hypot(dx, dz);
      if (length < 2.4 || ally.downed) return;
      const speed = ally.speed * (ally.health < ally.maxHealth * 0.25 ? 0.85 : 1);
      ally.heading = Math.atan2(dx, dz);
      if (typeof moveEntityWithCollision === 'function') {
        moveEntityWithCollision(ally, (dx / length) * speed * dt, (dz / length) * speed * dt, ally.radius);
      } else {
        ally.x += (dx / length) * speed * dt;
        ally.z += (dz / length) * speed * dt;
      }
    };

    const updateEnemyRevives = (raid, dt) => {
      const living = raid.enemies.filter((enemy) => !enemy.dead && !enemy.despawned && !enemy.isRangeTarget);
      for (const enemy of raid.enemies) {
        if (!enemy.dead || enemy.despawned || enemy.isNamelessBoss || enemy.battlefieldRevived) continue;
        enemy.battlefieldReviveWindow = Math.max(0, (enemy.battlefieldReviveWindow ?? 5) - dt);
        if (enemy.battlefieldReviveWindow <= 0) continue;
        const rescuer = living.find((ally) => distance2D(ally.x, ally.z, enemy.x, enemy.z) <= 7);
        if (!rescuer) continue;
        enemy.battlefieldReviveProgress = (enemy.battlefieldReviveProgress ?? 0) + dt;
        if (enemy.battlefieldReviveProgress < ALLY_REVIVE_TIME) continue;
        enemy.dead = false;
        enemy.despawned = false;
        enemy.health = Math.max(1, Math.round(enemy.maxHealth * 0.35));
        enemy.corpseTimer = 4;
        enemy.battlefieldRevived = true;
        enemy.battlefieldReviveProgress = 0;
        if (enemy.visual) {
          enemy.visual.root.rotation.x = 0;
          enemy.visual.root.position.y = 0;
        }
        notify(L('敌方队友完成救援。', 'An enemy teammate completed a revive.'), 'warning');
      }
    };

    const updateSquad = (raid, dt) => {
      if (!raid.allies?.length) return;
      const allies = raid.allies;
      const living = livingAllies(raid);
      const downedAlly = allies.find((ally) => ally.downed && !ally.dead);

      if (raid.playerDowned) {
        raid.player.reviveProgress = (raid.player.reviveProgress ?? 0);
        const rescuer = living.find((ally) => distance2D(ally.x, ally.z, raid.player.x, raid.player.z) <= 5.5);
        if (rescuer) {
          rescuer.reviveTargetId = 'player';
          raid.player.reviveProgress += dt;
          if (raid.player.reviveProgress >= ALLY_REVIVE_TIME) {
            raid.player.health = Math.max(1, Math.round(raid.player.maxHealth * 0.4));
            raid.playerDowned = false;
            raid.playerReviveUsed = true;
            raid.player.reviveProgress = 0;
            notify(L('队友已将你救起。', 'Your teammate revived you.'), 'success');
          }
        }
      }

      for (const ally of allies) {
        if (ally.downed) {
          const rescuer = living.find((candidate) => candidate !== ally && distance2D(candidate.x, candidate.z, ally.x, ally.z) <= 5.5);
          if (rescuer) {
            rescuer.reviveTargetId = ally.id;
            ally.reviveProgress = (ally.reviveProgress ?? 0) + dt;
            if (ally.reviveProgress >= ALLY_REVIVE_TIME) reviveActor(ally);
          } else {
            const follower = raid.playerDowned ? raid.player : raid.player;
            moveAlly(ally, follower.x, follower.z, dt);
          }
          updateAllyVisual(ally, dt);
          continue;
        }

        ally.healTimer -= dt;
        if (ally.healTimer <= 0) {
          ally.healTimer = 5;
          ally.health = Math.min(ally.maxHealth, ally.health + 100);
          ally.healPulse = 0.6;
        }
        ally.healPulse = Math.max(0, (ally.healPulse ?? 0) - dt);

        const target = nearestTarget(raid, ally.x, ally.z);
        if (target) {
          const targetDistance = distance2D(ally.x, ally.z, target.x, target.z);
          ally.heading = Math.atan2(target.x - ally.x, target.z - ally.z);
          if (targetDistance > ally.preferredRange) moveAlly(ally, target.x, target.z, dt);
          ally.shootTimer -= dt;
          if (ally.shootTimer <= 0 && typeof damageEnemy === 'function') {
            ally.shootTimer = 1.05 + Math.random() * 0.28;
            damageEnemy(target, 24, { source: 'ally', utilityKind: 'squad-fire' });
            ally.visual.flash.material.alpha = 0.9;
          }
        } else {
          moveAlly(ally, raid.player.x + ally.followOffset.x, raid.player.z + ally.followOffset.z, dt);
          ally.shootTimer = Math.min(ally.shootTimer, 0.4);
        }
        updateAllyVisual(ally, dt);
      }

      if (downedAlly && living.length === 0 && !raid.playerDowned) {
        downedAlly.dead = true;
      }
    };

    const originalStartRaid = window.__sdrPatchedStartRaid;
    if (typeof originalStartRaid === 'function') {
      window.__sdrPatchedStartRaid = function startBattlefieldSquad() {
        const result = originalStartRaid();
        if (state.raid?.modeId === BATTLEFIELD_ID) createSquad(state.raid);
        return result;
      };
      startRaid = window.__sdrPatchedStartRaid;
    }

    const originalApplyDamage = applyDamageToPlayer;
    applyDamageToPlayer = function battlefieldSquadDamage(amount) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || raid.modeId !== BATTLEFIELD_ID || !player || player.health <= 0 || player.downed || player.reviveUsed) {
        return originalApplyDamage(amount);
      }
      if (amount >= player.health && !raid.playerReviveUsed) {
        player.health = 1;
        raid.playerDowned = true;
        player.reviveProgress = 0;
        state.input.keys.clear();
        state.input.fireHeld = false;
        notify(L('你已倒地，等待队友救援。', 'You are downed. Hold on for a teammate revive.'), 'danger');
        return;
      }
      return originalApplyDamage(amount);
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function updateBattlefieldSquad(dt) {
      const result = originalUpdateRaid(dt);
      const raid = state.raid;
      if (raid?.modeId === BATTLEFIELD_ID) {
        updateEnemyRevives(raid, dt);
        updateSquad(raid, dt);
      }
      return result;
    };

    const originalClearRaid = clearRaid;
    clearRaid = function clearBattlefieldSquad() {
      const allies = state.raid?.allies ?? [];
      const result = originalClearRaid();
      for (const ally of allies) disposeVisual(ally.visual);
      return result;
    };

    const originalSyncHud = syncHud;
    syncHud = function syncBattlefieldSquadHud() {
      originalSyncHud();
      const raid = state.raid;
      if (!raid || raid.modeId !== BATTLEFIELD_ID) return;
      const alive = (raid.allies ?? []).filter((ally) => !ally.downed && !ally.dead).length;
      const downed = (raid.allies ?? []).filter((ally) => ally.downed && !ally.dead).length;
      if (refs.objectiveDetail) {
        refs.objectiveDetail.textContent = L(
          `队友 ${alive}/6${downed ? ` · 倒地 ${downed}` : ''} · 敌人 ${raid.enemies.filter((enemy) => !enemy.dead && !enemy.despawned).length}`,
          `Squad ${alive}/6${downed ? ` · Down ${downed}` : ''} · Hostiles ${raid.enemies.filter((enemy) => !enemy.dead && !enemy.despawned).length}`,
        );
      }
      if (raid.playerDowned && refs.interactionPrompt) {
        refs.interactionPrompt.textContent = L('倒地中：等待队友救援', 'Downed: waiting for a teammate revive');
      }
    };
  };

  boot();
})();
