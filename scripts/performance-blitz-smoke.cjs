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

    await page.goto('http://127.0.0.1:5531/?v=performance-blitz-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const lobby = await page.evaluate(() => {
      const defs = getLobbyModeDefs();
      const blitz = defs.blitz;
      return {
        hasBlitz: Boolean(blitz),
        nameZh: blitz?.nameZh ?? null,
        duration: blitz?.duration ?? null,
        bonusReward: blitz?.bonusReward ?? null,
        lobbyText: refs.lobbyPanel?.textContent ?? '',
        performance: window.__sdrPerformanceDebug ?? null,
        performanceV3: window.__sdrPerformanceV3Debug ?? null,
      };
    });

    await page.evaluate(() => {
      state.save.selectedModeId = 'blitz';
      renderBasePanel();
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.player.health = 9999;
      state.raid.player.maxHealth = 9999;
      for (const enemy of state.raid.enemies) {
        enemy.damage = 0;
        enemy.shootCooldown = 999;
      }
    });
    await page.waitForTimeout(350);

    const blitzRaid = await page.evaluate(() => {
      const raid = state.raid;
      const bonuses = (raid.containers ?? []).flatMap(container =>
        (container.items ?? []).filter(item => item.blitzBonus)
      );
      const taskExit = raid.extractions.find(zone => zone.kind === 'task');
      const switchExit = raid.extractions.find(zone => zone.kind === 'switch');
      return {
        modeId: raid.modeId,
        isBlitzRaid: raid.isBlitzRaid,
        timeLeft: raid.timeLeft,
        tasksComplete: raid.tasksComplete,
        objectives: (raid.objectives ?? []).map(entry => ({
          id: entry.id,
          target: entry.target,
          progress: entry.progress,
        })),
        extractionKinds: raid.extractions.map(zone => zone.kind),
        taskRequiresObjectives: Boolean(taskExit?.requiresObjectives),
        taskAvailableBeforeObjectives: taskExit ? isExtractionCurrentlyAvailable(taskExit, raid) : null,
        switchPointCount: raid.switchPoints?.length ?? 0,
        hasSwitchExit: Boolean(switchExit),
        spawnSafeTimer: raid.spawnSafeTimer,
        spawnSafeRadius: raid.spawnSafeRadius,
        blitzBonusCount: bonuses.length,
        tunedEnemies: raid.enemies.filter(enemy => enemy.blitzModeTuned).length,
        debug: window.__sdrBlitzModeDebug ?? null,
      };
    });

    const objectiveCompletion = await page.evaluate(() => {
      const raid = state.raid;
      for (let i = 0; i < 3; i++) advanceRaidObjective('search', 1);
      for (let i = 0; i < 6; i++) advanceRaidObjective('kill', 1);
      const taskExit = raid.extractions.find(zone => zone.kind === 'task');
      return {
        tasksComplete: raid.tasksComplete,
        taskAvailableAfterObjectives: taskExit ? isExtractionCurrentlyAvailable(taskExit, raid) : null,
        objectives: raid.objectives.map(entry => ({
          id: entry.id,
          progress: entry.progress,
          target: entry.target,
        })),
      };
    });

    const effects = await page.evaluate(() => {
      const raid = state.raid;
      const debug = window.__sdrPerformanceV3Debug;
      const player = raid.player;
      const point = new BABYLON.Vector3(player.x, 1.2, player.z);
      const before = raid.effects.length;
      for (let i = 0; i < 120; i++) {
        spawnSmokePuff(point, '#b8c0c4', 0.1, 0.35);
      }
      const afterSpawn = raid.effects.length;
      updateEffects(0.016);
      return {
        before,
        afterSpawn,
        afterUpdate: raid.effects.length,
        limit: debug?.effectLimit ?? null,
        skippedSmoke: debug?.skippedSmoke ?? 0,
        trimmedEffects: debug?.trimmedEffects ?? 0,
        pointerPickingDisabled: debug?.pointerPickingDisabled ?? false,
        sceneFlags: {
          move: scene.skipPointerMovePicking,
          down: scene.skipPointerDownPicking,
          up: scene.skipPointerUpPicking,
          underPointer: scene.constantlyUpdateMeshUnderPointer,
        },
        lightGovernorMode: debug?.lightGovernorMode ?? null,
        activeRealtimeStreetlights: debug?.activeRealtimeStreetlights ?? null,
        lightGovernorChanges: debug?.lightGovernorChanges ?? 0,
      };
    });

    const visuals = await page.evaluate(() => ({
      rollback: window.__sdrVisualOverhaulDebug ?? null,
      fairVision: window.__sdrFairVisionCanisterDebug ?? null,
      humanV2Parts: scene.meshes.filter(mesh => String(mesh.name).startsWith('human-v2-')).length,
      humanDetailParts: state.raid.enemies[0]?.visual?.humanDetailMeshes?.length ?? 0,
      actorTankMeshes: scene.meshes.filter(mesh => String(mesh.name).startsWith('actor-tank-')).length,
      baseBodyVisible: state.raid.enemies[0]?.visual?.body?.isVisible ?? false,
    }));

    const stability = await page.evaluate(async () => {
      const enemy = state.raid.enemies.find(entry => !entry.dead && !entry.despawned && entry.visual?.root);
      const root = enemy?.visual?.root ?? null;
      root?.setEnabled?.(false);
      await new Promise(resolve => setTimeout(resolve, 560));
      const hud = document.getElementById('blitzStatusHud');
      return {
        debug: window.__sdrStabilityV4Debug ?? null,
        enemyVisible: root?.isEnabled?.() ?? false,
        hudVisible: Boolean(hud && !hud.classList.contains('hidden')),
        hudText: hud?.textContent ?? '',
      };
    });

    const result = { lobby, blitzRaid, objectiveCompletion, effects, visuals, stability, errors };
    console.log(JSON.stringify(result, null, 2));

    const searchObjective = blitzRaid.objectives.find(entry => entry.id === 'search');
    const killObjective = blitzRaid.objectives.find(entry => entry.id === 'kill');

    const ok = Boolean(
      lobby.hasBlitz &&
      lobby.nameZh === '极速突袭' &&
      lobby.duration === 300 &&
      lobby.bonusReward === 5200 &&
      lobby.lobbyText.includes('极速突袭') &&
      lobby.performance?.version === '2026-09-19-tiered-v3' &&
      lobby.performance?.maxScalingLevel === 1.65 &&
      lobby.performance?.tieredAI &&
      lobby.performance?.tieredAnimation &&
      lobby.performanceV3?.version === '2026-09-19-fps-v5' &&
      lobby.performanceV3?.baseEffectLimit === 72 &&
      lobby.performanceV3?.frozenStaticMeshes > 100 &&
      lobby.performanceV3?.frozenStaticMaterials > 5 &&
      blitzRaid.modeId === 'blitz' &&
      blitzRaid.isBlitzRaid &&
      blitzRaid.timeLeft <= 300 &&
      blitzRaid.timeLeft > 295 &&
      searchObjective?.target === 3 &&
      killObjective?.target === 6 &&
      blitzRaid.tasksComplete === false &&
      blitzRaid.extractionKinds.includes('task') &&
      blitzRaid.extractionKinds.includes('switch') &&
      blitzRaid.taskRequiresObjectives &&
      blitzRaid.taskAvailableBeforeObjectives === false &&
      blitzRaid.hasSwitchExit &&
      blitzRaid.switchPointCount >= 1 &&
      blitzRaid.spawnSafeTimer <= 4 &&
      blitzRaid.spawnSafeRadius <= 62 &&
      blitzRaid.blitzBonusCount >= 2 &&
      blitzRaid.tunedEnemies >= 20 &&
      blitzRaid.debug?.starts >= 1 &&
      objectiveCompletion.tasksComplete &&
      objectiveCompletion.taskAvailableAfterObjectives === true &&
      effects.afterSpawn <= 72 &&
      effects.afterUpdate <= 72 &&
      effects.skippedSmoke > 0 &&
      effects.pointerPickingDisabled &&
      effects.sceneFlags.move &&
      effects.sceneFlags.down &&
      effects.sceneFlags.up &&
      effects.sceneFlags.underPointer === false &&
      ['full','reduced','off'].includes(effects.lightGovernorMode) &&
      effects.activeRealtimeStreetlights <= 2 &&
      visuals.humanV2Parts === 0 &&
      visuals.humanDetailParts === 0 &&
      visuals.actorTankMeshes === 0 &&
      visuals.baseBodyVisible &&
      visuals.fairVision?.originalCharacterModels &&
      visuals.rollback?.legacyCanisterModel &&
      visuals.rollback?.opaquePasses <= 2 &&
      stability.debug?.version === '2026-09-20-stability-v4' &&
      stability.debug?.visibilityRecoveries >= 1 &&
      stability.enemyVisible &&
      stability.hudVisible &&
      stability.hudText.includes('极速突袭') &&
      stability.hudText.includes('搜索') &&
      stability.hudText.includes('清敌') &&
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