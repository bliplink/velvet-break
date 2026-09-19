(() => {
  if (window.__sdrTacticalLoopWaiting || window.__sdrTacticalLoopApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof updateRaid !== 'function' ||
      typeof updateEnemies !== 'function' ||
      typeof beginExtractionSequence !== 'function' ||
      typeof finishSwitchSequence !== 'function' ||
      typeof getCurrentInteraction !== 'function' ||
      typeof isExtractionCurrentlyAvailable !== 'function' ||
      typeof getExtractionStatusLabel !== 'function' ||
      typeof distance2D !== 'function'
    ) {
      window.__sdrTacticalLoopWaiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrTacticalLoopWaiting = false;
    if (window.__sdrTacticalLoopApplied) return;
    window.__sdrTacticalLoopApplied = true;

    const HOLD_BY_KIND = {
      standard: 4.5,
      task: 3.4,
      switch: 2.2,
    };
    const debug = {
      version: '2026-09-19-tactical-loop-v1',
      extractionProfiles: { ...HOLD_BY_KIND },
      switchAlerts: 0,
      taskExtractionBonuses: 0,
      archetypeTuned: 0,
      lastSwitchAlert: null,
      lastTaskBonus: null,
      getHoldTime: null,
      applyArchetypeIdentity: null,
    };
    window.__sdrTacticalLoopDebug = debug;

    const getHoldTime = (zone) => HOLD_BY_KIND[zone?.kind] ?? HOLD_BY_KIND.standard;
    debug.getHoldTime = getHoldTime;

    const applyArchetypeIdentity = (enemy) => {
      if (!enemy || enemy.tacticalIdentityApplied || enemy.dead || enemy.despawned) return enemy;
      if (enemy.isNamelessBoss || enemy.isNamelessMinion || enemy.isRangeTarget) return enemy;

      enemy.tacticalIdentityApplied = true;
      if (enemy.type === 'scout') {
        enemy.tacticalRole = 'flanker';
        enemy.strafeRadius = Math.max(enemy.strafeRadius ?? 4.6, 5.4);
        enemy.flankDistance = Math.max(enemy.flankDistance ?? 1.9, 2.8);
        enemy.retreatBias = Math.max(enemy.retreatBias ?? 4.2, 4.8);
        enemy.repositionTimer = Math.min(enemy.repositionTimer ?? 0.5, 0.38);
      } else if (enemy.type === 'hunter') {
        enemy.tacticalRole = 'marksman';
        enemy.preferredRange = Math.max(enemy.preferredRange ?? 20, 24);
        enemy.longFireRange = Math.max(enemy.longFireRange ?? 38, 44);
        enemy.retreatBias = Math.max(enemy.retreatBias ?? 5.2, 6.2);
        enemy.strafeRadius = Math.max(enemy.strafeRadius ?? 3.4, 3.8);
      } else if (enemy.type === 'bruiser') {
        enemy.tacticalRole = 'breacher';
        enemy.preferredRange = Math.min(enemy.preferredRange ?? 14, 12.5);
        enemy.retreatBias = Math.min(enemy.retreatBias ?? 2.8, 1.8);
        enemy.combatSpeedMult = Math.max(enemy.combatSpeedMult ?? 1, 1.12);
        enemy.damageReduction = Math.max(enemy.damageReduction ?? 0, 0.22);
      } else {
        enemy.tacticalRole = 'rifleman';
      }
      debug.archetypeTuned += 1;
      return enemy;
    };
    debug.applyArchetypeIdentity = applyArchetypeIdentity;

    const updateEnemiesBeforeTactical = updateEnemies;
    updateEnemies = function updateTacticalEnemyRoles(dt, ...args) {
      const raid = state.raid;
      for (const enemy of raid?.enemies ?? []) {
        applyArchetypeIdentity(enemy);
        enemy.tacticalDirectiveTimer = Math.max(0, (enemy.tacticalDirectiveTimer ?? 0) - dt);
      }

      const result = updateEnemiesBeforeTactical.call(this, dt, ...args);

      const player = raid?.player;
      if (!player) return result;

      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget || !enemy.tacticalRole) continue;
        const alert = (enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0;
        if (!alert) continue;

        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        const hasSight = !lineOfSightBlocked(enemy.x, enemy.z, player.x, player.z);

        if (enemy.tacticalRole === 'flanker') {
          if ((enemy.tacticalDirectiveTimer ?? 0) <= 0 && distance > 7 && distance < 32) {
            enemy.tacticalDirectiveTimer = 2.2 + Math.random() * 1.3;
            enemy.strafeDirection = Math.random() < 0.5 ? -1 : 1;
            enemy.repositionTimer = 0;
            enemy.burstMoveTimer = Math.max(enemy.burstMoveTimer ?? 0, 0.34);
            if (!hasSight) {
              const dx = player.x - enemy.x;
              const dz = player.z - enemy.z;
              const length = Math.max(0.001, Math.hypot(dx, dz));
              const lateralX = -dz / length;
              const lateralZ = dx / length;
              enemy.lastKnownPlayerX = player.x + lateralX * enemy.strafeDirection * 5.5;
              enemy.lastKnownPlayerZ = player.z + lateralZ * enemy.strafeDirection * 5.5;
              enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 4.8);
            }
          }
        } else if (enemy.tacticalRole === 'marksman') {
          if (distance < 18) {
            enemy.repositionTimer = 0;
            enemy.strafeDirection = enemy.strafeDirection || (Math.random() < 0.5 ? -1 : 1);
            enemy.burstMoveTimer = Math.max(enemy.burstMoveTimer ?? 0, 0.28);
          }
          if (hasSight && distance >= 18 && distance <= 48) {
            enemy.holdTimer = Math.max(enemy.holdTimer ?? 0, 0.22);
          }
        } else if (enemy.tacticalRole === 'breacher') {
          if (distance > 8 && distance < 28) {
            enemy.repositionTimer = 0;
            enemy.burstMoveTimer = Math.max(enemy.burstMoveTimer ?? 0, 0.2);
          }
          enemy.strafeDirection = enemy.strafeDirection || 1;
        }
      }
      return result;
    };

    const beginExtractionBeforeTactical = beginExtractionSequence;
    beginExtractionSequence = function beginProfiledExtraction(zone, ...args) {
      const player = state.raid?.player;
      const required = getHoldTime(zone);
      if ((player?.tacticalExtractionProgress ?? 0) + 0.001 < required) {
        return false;
      }

      if (zone?.kind === 'task' && state.raid && !zone.tacticalTaskBonusAwarded) {
        const bonus = Math.min(3200, Math.max(600, Math.round((state.raid.bagValue ?? 0) * 0.08)));
        state.raid.bonusReward = Math.max(0, Number(state.raid.bonusReward ?? 0)) + bonus;
        zone.tacticalTaskBonusAwarded = true;
        debug.taskExtractionBonuses += 1;
        debug.lastTaskBonus = { zoneId: zone.id, bonus };
      }
      return beginExtractionBeforeTactical.call(this, zone, ...args);
    };

    const updateRaidBeforeTactical = updateRaid;
    updateRaid = function updateProfiledExtraction(dt, ...args) {
      const raid = state.raid;
      const player = raid?.player;
      const interactionBefore = raid && player ? getCurrentInteraction() : null;
      const zone = interactionBefore?.type === 'extract' ? interactionBefore.zone : null;
      const eligible = Boolean(
        zone &&
        state.input.interactHeld &&
        !raid?.extractionSequence &&
        isExtractionCurrentlyAvailable(zone, raid)
      );

      if (player) {
        if (eligible) {
          if (player.tacticalExtractionZoneId !== zone.id) {
            player.tacticalExtractionProgress = 0;
            player.tacticalExtractionZoneId = zone.id;
          }
          player.tacticalExtractionProgress = Math.min(
            getHoldTime(zone) + 0.3,
            (player.tacticalExtractionProgress ?? 0) + dt,
          );
        } else {
          player.tacticalExtractionProgress = Math.max(0, (player.tacticalExtractionProgress ?? 0) - dt * 3.2);
          if ((player.tacticalExtractionProgress ?? 0) <= 0.001) {
            player.tacticalExtractionZoneId = null;
          }
        }
      }

      const result = updateRaidBeforeTactical.call(this, dt, ...args);

      if (
        zone &&
        player &&
        !raid?.extractionSequence &&
        isExtractionCurrentlyAvailable(zone, raid) &&
        (player.tacticalExtractionProgress ?? 0) >= getHoldTime(zone)
      ) {
        beginExtractionSequence(zone);
      }

      if (zone && player && state.input.interactHeld && !raid?.extractionSequence) {
        const required = getHoldTime(zone);
        raid.interactionText = typeof L === 'function'
          ? L(
              `撤离准备 ${getZoneLabel(zone)} ${Math.min(player.tacticalExtractionProgress ?? 0, required).toFixed(1)} / ${required.toFixed(1)}s`,
              `Preparing extraction at ${getZoneLabel(zone)} ${Math.min(player.tacticalExtractionProgress ?? 0, required).toFixed(1)} / ${required.toFixed(1)}s`,
            )
          : `Preparing extraction ${Math.min(player.tacticalExtractionProgress ?? 0, required).toFixed(1)} / ${required.toFixed(1)}s`;
      }
      return result;
    };

    const statusBeforeTactical = getExtractionStatusLabel;
    getExtractionStatusLabel = function tacticalExtractionStatus(zone, raid = state.raid) {
      const base = statusBeforeTactical.call(this, zone, raid);
      if (!zone?.active) return base;
      const hold = getHoldTime(zone).toFixed(1);
      const suffix = typeof L === 'function'
        ? L(` · 撤离准备 ${hold}s`, ` · Hold ${hold}s`)
        : ` · Hold ${hold}s`;
      return `${base}${suffix}`;
    };

    const finishSwitchBeforeTactical = finishSwitchSequence;
    finishSwitchSequence = function finishNoisySwitch(...args) {
      const raid = state.raid;
      const sequence = raid?.switchSequence ? { ...raid.switchSequence } : null;
      const point = sequence ? (raid.switchPoints ?? []).find(entry => entry.id === sequence.pointId) : null;
      const result = finishSwitchBeforeTactical.apply(this, args);
      if (!raid || !sequence) return result;

      const zone = raid.extractions?.find(entry => entry.id === sequence.zoneId);
      const alertX = point?.x ?? zone?.x ?? 0;
      const alertZ = point?.z ?? zone?.z ?? 0;
      let alerted = 0;
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget) continue;
        const distance = distance2D(enemy.x, enemy.z, alertX, alertZ);
        if (distance > 64) continue;
        enemy.alertTimer = Math.max(enemy.alertTimer ?? 0, 5.5);
        enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 8);
        enemy.lastKnownPlayerX = alertX;
        enemy.lastKnownPlayerZ = alertZ;
        if (enemy.combatState !== 'combat') enemy.combatState = 'investigate';
        alerted += 1;
      }
      if (alerted > 0) {
        debug.switchAlerts += 1;
        debug.lastSwitchAlert = {
          zoneId: zone?.id ?? sequence.zoneId,
          pointId: point?.id ?? sequence.pointId,
          alerted,
        };
        if (typeof notify === 'function') {
          notify(
            typeof L === 'function'
              ? L(`拉闸噪声惊动了附近 ${alerted} 名敌人。`, `Lever noise alerted ${alerted} nearby hostiles.`)
              : `Lever noise alerted ${alerted} nearby hostiles.`,
            'warning',
          );
        }
      }
      return result;
    };

    for (const enemy of state.raid?.enemies ?? []) applyArchetypeIdentity(enemy);
  };

  boot();
})();