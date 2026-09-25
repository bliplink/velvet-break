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
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    await page.goto('http://127.0.0.1:5531/?v=black-tide-content-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1100);

    const lobby = await page.evaluate(() => {
      state.save = defaultSave();
      state.save.money = 600000;
      state.save.engineerUnlocked = true;
      persistSave();
      renderBasePanel();

      const defs = getLobbyModeDefs();
      const operator = getOperatorDefs().lingshuang;
      const unlock = document.querySelector('[data-lingshuang-unlock]');
      const beforeMoney = state.save.money;
      unlock?.click();
      setSelectedLobbyMode('blacktide');

      return {
        hasMode: Boolean(defs.blacktide),
        modeDuration: defs.blacktide?.duration,
        modeReward: defs.blacktide?.bonusReward,
        modeText: refs.lobbyPanel?.textContent ?? '',
        hasOperator: Boolean(operator),
        operatorName: operator?.nameEn,
        operatorDuration: operator?.abilityDuration,
        operatorArmorBonus: operator?.startArmorBonus,
        unlocked: Boolean(state.save.lingshuangUnlocked),
        selectedOperatorId: state.save.selectedOperatorId,
        selectedModeId: state.save.selectedModeId,
        unlockCost: beforeMoney - state.save.money,
        debug: window.__sdrBlackTideDebug ?? null,
      };
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1100);

    const persisted = await page.evaluate(() => ({
      unlocked: Boolean(state.save.lingshuangUnlocked),
      selectedOperatorId: state.save.selectedOperatorId,
      selectedModeId: state.save.selectedModeId,
      order: getOperatorOrder(),
      hasUnlockButton: Boolean(document.querySelector('[data-lingshuang-unlock]')),
      selectedCardText: document.querySelector('.operator-card.is-active')?.textContent ?? '',
    }));

    await page.evaluate(() => {
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.player.health = 9999;
      state.raid.player.maxHealth = 9999;
      for (const enemy of state.raid.enemies) {
        enemy.damage = 0;
        enemy.shootCooldown = 999;
      }
    });
    await page.waitForTimeout(300);

    const raid = await page.evaluate(() => {
      const r = state.raid;
      const task = r.extractions.find(zone => zone.kind === 'task');
      const gated = r.extractions.find(zone => zone.kind === 'switch');
      const search = r.objectives.find(entry => entry.id === 'search');
      const kill = r.objectives.find(entry => entry.id === 'kill');
      return {
        modeId: r.modeId,
        mapId: r.mapId,
        mapNameEn: r.mapNameEn,
        isBlackTide: r.isBlackTide,
        timeLeft: r.timeLeft,
        objectives: { search: search?.target, kill: kill?.target },
        taskExit: task?.id,
        taskRequiresObjectives: Boolean(task?.requiresObjectives),
        taskAvailable: task ? isExtractionCurrentlyAvailable(task, r) : null,
        switchExit: gated?.id,
        switchPoint: r.switchPoints?.[0]?.id ?? null,
        mapRoot: Boolean(scene.getTransformNodeByName('black-tide-harbor-root')),
        mapObstacles: window.__sdrBlackTideDebug?.getMapObstacleCount?.() ?? -1,
        harborCaches: r.containers.filter(c => c.blackTideCache).length,
        playerX: r.player.x,
        playerZ: r.player.z,
        playerArmor: r.player.armor,
        operatorId: r.player.operatorId,
        utilityInterval: r.player.utilityGainInterval,
      };
    });

    const ability = await page.evaluate(() => {
      const p = state.raid.player;
      p.skillUses = 4;
      p.abilityActiveTimer = 0;
      const baseSpeed = getPlayerMoveSpeed(p, false);
      const started = useOperatorAbility();
      const activeSpeed = getPlayerMoveSpeed(p, false);

      p.armor = 0;
      p.health = 1000;
      p.maxHealth = 1000;
      p.phaseBarrierTimer = 0;
      p.phaseBarrierHp = 0;
      applyDamageToPlayer(100);

      return {
        started,
        skillUses: p.skillUses,
        activeTimer: p.abilityActiveTimer,
        baseSpeed,
        activeSpeed,
        speedRatio: activeSpeed / baseSpeed,
        healthAfter100: p.health,
      };
    });

    const shield = await page.evaluate(() => {
      const p = state.raid.player;
      p.abilityActiveTimer = 0;
      p.armor = 0;
      p.health = 1000;
      p.maxHealth = 1000;
      p.utilityItems = 1;
      p.utilityGainTimer = 0;
      const started = window.__sdrBlackTideDebug.usePrismShield();
      const healthBefore = p.health;
      applyDamageToPlayer(100);
      syncHud();
      return {
        started,
        utilityItems: p.utilityItems,
        barrierTimer: p.phaseBarrierTimer,
        barrierHp: p.phaseBarrierHp,
        healthDelta: healthBefore - p.health,
        visual: Boolean(p.phaseBarrierVisual),
        utilityText: document.getElementById('operatorUtilityValue')?.textContent ?? '',
        utilityDetail: document.getElementById('operatorUtilityDetail')?.textContent ?? '',
      };
    });

    const threat = await page.evaluate(() => {
      const r = state.raid;
      r.blackTideThreatClock = 89.9;
      const enemy = r.enemies.find(e => !e.dead && !e.despawned);
      const beforeSpeed = enemy?.speed ?? 0;
      updateRaid(0.2);
      return {
        level: r.blackTideThreatLevel,
        clock: r.blackTideThreatClock,
        enemyThreatLevel: enemy?.blackTideThreatLevel ?? 0,
        enemySpeedBefore: beforeSpeed,
        enemySpeedAfter: enemy?.speed ?? 0,
        escalations: window.__sdrBlackTideDebug?.threatEscalations ?? 0,
      };
    });

    const cleanup = await page.evaluate(() => {
      clearRaid();
      return {
        rootGone: !scene.getTransformNodeByName('black-tide-harbor-root'),
        obstacleCount: window.__sdrBlackTideDebug?.getMapObstacleCount?.() ?? -1,
        remainingDefs: obstacleDefs.filter(entry => entry.blackTideMap).length,
        cleanups: window.__sdrBlackTideDebug?.mapCleanups ?? 0,
      };
    });

    const result = { lobby, persisted, raid, ability, shield, threat, cleanup, errors };
    console.log(JSON.stringify(result, null, 2));

    const ok = Boolean(
      lobby.hasMode &&
      lobby.modeDuration === 480 &&
      lobby.modeReward === 8000 &&
      /黑潮|Black Tide/i.test(lobby.modeText) &&
      lobby.hasOperator &&
      lobby.operatorName === 'Lingshuang' &&
      lobby.operatorDuration === 18 &&
      lobby.operatorArmorBonus === 70 &&
      lobby.unlocked &&
      lobby.selectedOperatorId === 'lingshuang' &&
      lobby.selectedModeId === 'blacktide' &&
      lobby.unlockCost === 240000 &&
      lobby.debug?.version === '2026-09-25-black-tide-v1' &&
      persisted.unlocked &&
      persisted.selectedOperatorId === 'lingshuang' &&
      persisted.selectedModeId === 'blacktide' &&
      persisted.order.includes('lingshuang') &&
      !persisted.hasUnlockButton &&
      /凌霜|Lingshuang/i.test(persisted.selectedCardText) &&
      raid.modeId === 'blacktide' &&
      raid.mapId === 'black-tide-harbor' &&
      raid.mapNameEn === 'Black Tide Harbor' &&
      raid.isBlackTide &&
      raid.timeLeft <= 480 && raid.timeLeft > 475 &&
      raid.objectives.search === 3 &&
      raid.objectives.kill === 8 &&
      raid.taskExit === 'blacktide-ferry' &&
      raid.taskRequiresObjectives &&
      raid.taskAvailable === false &&
      raid.switchExit === 'blacktide-drydock' &&
      raid.switchPoint === 'blacktide-grid' &&
      raid.mapRoot &&
      raid.mapObstacles >= 16 &&
      raid.harborCaches >= 16 &&
      raid.playerArmor >= 100 &&
      raid.operatorId === 'lingshuang' &&
      raid.utilityInterval === 25 &&
      ability.started === true &&
      ability.skillUses === 3 &&
      ability.activeTimer >= 17.9 &&
      ability.speedRatio > 1.24 && ability.speedRatio < 1.26 &&
      ability.healthAfter100 >= 934 && ability.healthAfter100 <= 936 &&
      shield.started === true &&
      shield.utilityItems === 0 &&
      shield.barrierTimer >= 7.9 &&
      shield.barrierHp >= 19 && shield.barrierHp <= 21 &&
      shield.healthDelta === 0 &&
      shield.visual &&
      /棱镜盾|Prism Shield/i.test(shield.utilityText) &&
      threat.level === 1 &&
      threat.enemyThreatLevel >= 1 &&
      threat.enemySpeedAfter > threat.enemySpeedBefore &&
      threat.escalations >= 1 &&
      cleanup.rootGone &&
      cleanup.obstacleCount === 0 &&
      cleanup.remainingDefs === 0 &&
      cleanup.cleanups >= 1 &&
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
