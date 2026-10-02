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

    await page.goto('http://127.0.0.1:5531/?v=contract-hvt-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1100);

    const lobby = await page.evaluate(() => {
      const def = getLobbyModeDefs().contract;
      return {
        nameZh: def?.nameZh ?? null,
        duration: def?.duration ?? null,
        summary: def?.summaryZh ?? '',
        detail: def?.detailZh ?? '',
      };
    });

    await page.evaluate(() => {
      state.save.selectedModeId = 'contract';
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
    await page.waitForTimeout(250);

    const before = await page.evaluate(() => {
      const raid = state.raid;
      const hvt = raid.enemies.find(enemy => enemy.id === raid.contractHvtId);
      const taskExit = raid.extractions.find(zone => zone.kind === 'task');
      return {
        modeId: raid.modeId,
        objectives: raid.objectives.map(entry => ({ id: entry.id, target: entry.target, progress: entry.progress })),
        hvtId: raid.contractHvtId,
        hvtActive: Boolean(hvt?.contractHvtActive),
        hvtName: hvt?.name ?? '',
        hvtHealth: hvt?.maxHealth ?? null,
        hvtDamage: hvt?.damage ?? null,
        taskAvailable: taskExit ? isExtractionCurrentlyAvailable(taskExit, raid) : null,
        novelty: window.__sdrModeNoveltyDebug ?? null,
      };
    });

    const hunt = await page.evaluate(async () => {
      const raid = state.raid;
      const killed = [];
      for (let stage = 0; stage < 3; stage++) {
        const target = raid.enemies.find(enemy => enemy.id === raid.contractHvtId);
        if (!target) break;
        killed.push(target.id);
        killEnemy(target);
        await new Promise(resolve => setTimeout(resolve, 260));
      }
      for (let i = 0; i < 5; i++) advanceRaidObjective('kill', 1);
      const taskExit = raid.extractions.find(zone => zone.kind === 'task');
      return {
        killed,
        stage: raid.contractHvtStage,
        stageBonus: raid.contractStageBonus,
        bonusReward: raid.bonusReward,
        currentHvtId: raid.contractHvtId ?? null,
        tasksComplete: raid.tasksComplete,
        taskAvailable: taskExit ? isExtractionCurrentlyAvailable(taskExit, raid) : null,
        objectives: raid.objectives.map(entry => ({ id: entry.id, target: entry.target, progress: entry.progress })),
        novelty: window.__sdrModeNoveltyDebug ?? null,
      };
    });

    const result = { lobby, before, hunt, errors };
    console.log(JSON.stringify(result, null, 2));

    const beforeHvt = before.objectives.find(entry => entry.id === 'hvt');
    const beforeKill = before.objectives.find(entry => entry.id === 'kill');
    const huntHvt = hunt.objectives.find(entry => entry.id === 'hvt');
    const huntKill = hunt.objectives.find(entry => entry.id === 'kill');

    const ok = Boolean(
      lobby.nameZh === '清剿合约' &&
      lobby.duration === 420 &&
      /HVT/.test(lobby.summary) &&
      /3/.test(lobby.detail) &&
      before.modeId === 'contract' &&
      beforeHvt?.target === 3 &&
      beforeKill?.target === 8 &&
      before.hvtId &&
      before.hvtActive &&
      /高价值目标|HVT/.test(before.hvtName) &&
      before.hvtHealth > 0 &&
      before.hvtDamage > 0 &&
      before.taskAvailable === false &&
      before.novelty?.version === '2026-10-02-mode-novelty-v1' &&
      hunt.killed.length === 3 &&
      hunt.stage === 3 &&
      hunt.stageBonus === 6600 &&
      hunt.bonusReward >= 16200 &&
      huntHvt?.progress === 3 &&
      huntKill?.progress >= 8 &&
      hunt.tasksComplete &&
      hunt.taskAvailable === true &&
      hunt.novelty?.contractHvtKills === 3 &&
      errors.length === 0
    );

    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
