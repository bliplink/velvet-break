const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('http://127.0.0.1:5531/?v=tactical-loop-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.spawnSafeTimer = 0;
      state.raid.player.health = 9999;
      state.raid.player.maxHealth = 9999;
      for (const enemy of state.raid.enemies) {
        enemy.damage = 0;
        enemy.shootCooldown = 999;
        enemy.alertTimer = 0;
        enemy.investigateTimer = 0;
      }
    });
    await page.waitForTimeout(300);

    const roles = await page.evaluate(() => {
      const debug = window.__sdrTacticalLoopDebug;
      const byType = type => state.raid.enemies.find(enemy => enemy.type === type && !enemy.isNamelessBoss && !enemy.isNamelessMinion);
      const scout = byType('scout');
      const hunter = byType('hunter');
      const bruiser = byType('bruiser');

      for (const enemy of [scout, hunter, bruiser]) {
        if (!enemy) continue;
        enemy.tacticalIdentityApplied = false;
        debug.applyArchetypeIdentity(enemy);
      }

      return {
        version: debug?.version ?? null,
        holds: {
          standard: debug?.getHoldTime?.({ kind: 'standard' }),
          task: debug?.getHoldTime?.({ kind: 'task' }),
          switch: debug?.getHoldTime?.({ kind: 'switch' }),
        },
        scout: scout ? {
          role: scout.tacticalRole,
          strafeRadius: scout.strafeRadius,
          flankDistance: scout.flankDistance,
          retreatBias: scout.retreatBias,
        } : null,
        hunter: hunter ? {
          role: hunter.tacticalRole,
          preferredRange: hunter.preferredRange,
          longFireRange: hunter.longFireRange,
          retreatBias: hunter.retreatBias,
        } : null,
        bruiser: bruiser ? {
          role: bruiser.tacticalRole,
          preferredRange: bruiser.preferredRange,
          retreatBias: bruiser.retreatBias,
          damageReduction: bruiser.damageReduction,
        } : null,
      };
    });

    async function runExtraction(kind, secondsBeforeCheck, totalSeconds) {
      return await page.evaluate(({ kind, secondsBeforeCheck, totalSeconds }) => {
        const raid = state.raid;
        const player = raid.player;
        let zone = raid.extractions.find(entry => entry.kind === kind);
        let restoreZone = null;

        // Some raid seeds do not include a task extraction. For QA, temporarily
        // convert one standard exit so task timing/reward behavior is still
        // exercised without changing production raid generation.
        if (!zone && kind === 'task') {
          zone = raid.extractions.find(entry => entry.kind === 'standard') ?? raid.extractions[0];
          if (zone) {
            restoreZone = {
              kind: zone.kind,
              requiresObjectives: zone.requiresObjectives,
              active: zone.active,
              tacticalTaskBonusAwarded: zone.tacticalTaskBonusAwarded,
            };
            zone.kind = 'task';
            zone.requiresObjectives = true;
          }
        }
        if (!zone) return { missing: true, kind };

        zone.active = true;
        if (kind === 'task') {
          zone.requiresObjectives = true;
          raid.tasksComplete = true;
          zone.tacticalTaskBonusAwarded = false;
          raid.bonusReward = 0;
          raid.bagValue = 10000;
        }
        if (kind === 'switch') {
          zone.switchArmed = true;
          zone.switchTimer = 45;
          zone.switchExpired = false;
        }

        player.x = zone.x;
        player.z = zone.z;
        player.extractionProgress = 0;
        player.extractionZoneId = null;
        player.tacticalExtractionProgress = 0;
        player.tacticalExtractionZoneId = null;
        raid.extractionSequence = null;
        state.input.interactHeld = true;

        const step = 0.1;
        let elapsed = 0;
        while (elapsed + step / 2 < secondsBeforeCheck) {
          updateRaid(step);
          elapsed += step;
          if (raid.extractionSequence) break;
        }
        const before = {
          elapsed,
          sequence: Boolean(raid.extractionSequence),
          tactical: player.tacticalExtractionProgress ?? 0,
          base: player.extractionProgress ?? 0,
        };

        while (elapsed + step / 2 < totalSeconds && !raid.extractionSequence) {
          updateRaid(step);
          elapsed += step;
        }
        const after = {
          elapsed,
          sequence: Boolean(raid.extractionSequence),
          tactical: player.tacticalExtractionProgress ?? 0,
          base: player.extractionProgress ?? 0,
          bonusReward: raid.bonusReward ?? 0,
          status: getExtractionStatusLabel(zone, raid),
          zoneId: zone.id,
        };

        state.input.interactHeld = false;
        raid.extractionSequence = null;
        player.extractionProgress = 0;
        player.tacticalExtractionProgress = 0;
        player.extractionZoneId = null;
        player.tacticalExtractionZoneId = null;

        const usedSyntheticTask = Boolean(restoreZone);
        if (restoreZone) {
          zone.kind = restoreZone.kind;
          zone.requiresObjectives = restoreZone.requiresObjectives;
          zone.active = restoreZone.active;
          zone.tacticalTaskBonusAwarded = restoreZone.tacticalTaskBonusAwarded;
        }
        return { kind, before, after, usedSyntheticTask };
      }, { kind, secondsBeforeCheck, totalSeconds });
    }

    const standard = await runExtraction('standard', 3.2, 4.7);
    const task = await runExtraction('task', 3.0, 3.6);
    const switchExit = await runExtraction('switch', 1.9, 2.4);

    const switchAlert = await page.evaluate(() => {
      const debug = window.__sdrTacticalLoopDebug;
      const raid = state.raid;
      const point = (raid.switchPoints ?? []).find(entry => !entry.used);
      if (!point) return { missing: true };
      const zone = raid.extractions.find(entry => entry.id === point.zoneId);
      if (!zone) return { missingZone: true, pointId: point.id, zoneId: point.zoneId };

      const enemy = raid.enemies.find(entry => !entry.dead && !entry.despawned && !entry.isRangeTarget && !entry.isNamelessBoss);
      enemy.x = point.x + 6;
      enemy.z = point.z + 2;
      enemy.alertTimer = 0;
      enemy.investigateTimer = 0;
      enemy.combatState = 'patrol';
      point.used = false;
      zone.active = true;
      zone.switchArmed = false;
      zone.switchTimer = 0;
      zone.switchExpired = false;
      raid.switchSequence = {
        pointId: point.id,
        zoneId: zone.id,
        timer: 0,
        duration: 1.45,
      };
      const before = debug.switchAlerts;
      finishSwitchSequence();

      return {
        delta: debug.switchAlerts - before,
        last: debug.lastSwitchAlert,
        enemyAlert: enemy.alertTimer,
        enemyInvestigate: enemy.investigateTimer,
        enemyState: enemy.combatState,
        armed: zone.switchArmed,
        switchTimer: zone.switchTimer,
      };
    });

    const visuals = await page.evaluate(() => ({
      humanV2Parts: scene.meshes.filter(mesh => String(mesh.name).startsWith('human-v2-')).length,
      humanDetailParts: state.raid.enemies[0]?.visual?.humanDetailMeshes?.length ?? 0,
      baseBodyVisible: state.raid.enemies[0]?.visual?.body?.isVisible ?? false,
      rollback: window.__sdrVisualOverhaulDebug ?? null,
    }));

    console.log(JSON.stringify({ roles, standard, task, switchExit, switchAlert, visuals, errors }, null, 2));

    const ok = Boolean(
      roles.version === '2026-09-19-tactical-loop-v1' &&
      Math.abs(roles.holds.standard - 4.5) < 0.01 &&
      Math.abs(roles.holds.task - 3.4) < 0.01 &&
      Math.abs(roles.holds.switch - 2.2) < 0.01 &&
      roles.scout?.role === 'flanker' &&
      roles.scout.strafeRadius >= 5.4 &&
      roles.scout.flankDistance >= 2.8 &&
      roles.hunter?.role === 'marksman' &&
      roles.hunter.preferredRange >= 24 &&
      roles.hunter.longFireRange >= 44 &&
      roles.bruiser?.role === 'breacher' &&
      roles.bruiser.preferredRange <= 12.5 &&
      roles.bruiser.retreatBias <= 1.8 &&
      roles.bruiser.damageReduction >= 0.22 &&
      standard.before.sequence === false &&
      standard.after.sequence === true &&
      /4\.5s/.test(standard.after.status) &&
      !task.missing &&
      task.before?.sequence === false &&
      task.after?.sequence === true &&
      task.after?.bonusReward >= 800 &&
      /3\.4s/.test(task.after?.status ?? '') &&
      switchExit.before.sequence === false &&
      switchExit.after.sequence === true &&
      /2\.2s/.test(switchExit.after.status) &&
      switchAlert.delta === 1 &&
      switchAlert.last?.alerted >= 1 &&
      switchAlert.enemyAlert >= 5.4 &&
      switchAlert.enemyInvestigate >= 7.9 &&
      ['investigate', 'combat'].includes(switchAlert.enemyState) &&
      switchAlert.armed &&
      switchAlert.switchTimer > 40 &&
      visuals.humanV2Parts === 0 &&
      visuals.humanDetailParts === 0 &&
      visuals.baseBodyVisible &&
      visuals.rollback?.legacyCanisterModel &&
      errors.length === 0
    );

    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});