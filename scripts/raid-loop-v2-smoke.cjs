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

    await page.goto('http://127.0.0.1:5531/?v=raid-loop-v2-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.spawnSafeTimer = 0;
    });
    await page.waitForTimeout(500);

    const risk = await page.evaluate(() => {
      const debug = window.__sdrRaidLoopV2Debug;
      const poi = window.__sdrRaidDesignConfig.poiDefs.find(entry => entry.id === 'center-depot');
      const obstacle = obstacleDefs.find(entry => entry.id === poi.id);
      return {
        version: debug?.version ?? null,
        risk: debug?.getRiskAt?.(obstacle.x, obstacle.z) ?? null,
        center: { x: obstacle.x, z: obstacle.z },
      };
    });

    const lootBonus = await page.evaluate(() => {
      const debug = window.__sdrRaidLoopV2Debug;
      const obstacle = obstacleDefs.find(entry => entry.id === 'center-depot');
      const container = state.raid.containers[0];
      container.x = obstacle.x;
      container.z = obstacle.z;
      container.pool = 'valuable';
      container.items = [];
      container.riskLootApplied = false;
      container.__riskCounted = false;
      delete container.riskBonusItemId;
      debug.applyContainerRisk(container, { forceBonus: true });
      const bonus = container.items.find(item => item.riskBonus);
      return {
        tier: container.raidRiskTier,
        poiId: container.raidPoiId,
        itemCount: container.items.length,
        bonus: bonus ? {
          rarity: bonus.rarity,
          riskBonus: bonus.riskBonus,
          riskSource: bonus.riskSource,
        } : null,
      };
    });

    const enemyRisk = await page.evaluate(() => {
      const debug = window.__sdrRaidLoopV2Debug;
      const obstacle = obstacleDefs.find(entry => entry.id === 'center-depot');
      const enemy = state.raid.enemies.find(entry => !entry.dead && !entry.despawned && !entry.isNamelessBoss);
      enemy.x = obstacle.x + 3;
      enemy.z = obstacle.z + 3;
      enemy.maxHealth = 1000;
      enemy.health = 1000;
      enemy.damage = 100;
      enemy.detectRange = 40;
      enemy.accuracyBonus = 0;
      enemy.fireInterval = 1;
      enemy.raidRiskTuned = false;
      delete enemy.raidRiskTier;
      debug.applyEnemyRisk(enemy);
      return {
        tier: enemy.raidRiskTier,
        poiId: enemy.raidPoiId,
        maxHealth: enemy.maxHealth,
        health: enemy.health,
        damage: enemy.damage,
        detectRange: enemy.detectRange,
        accuracyBonus: enemy.accuracyBonus,
        fireInterval: enemy.fireInterval,
      };
    });

    const alert = await page.evaluate(() => {
      closeLootPanel?.();
      const debug = window.__sdrRaidLoopV2Debug;
      const obstacle = obstacleDefs.find(entry => entry.id === 'center-depot');
      const container = state.raid.containers[0];
      const enemy = state.raid.enemies.find(entry => !entry.dead && !entry.despawned && !entry.isNamelessBoss);

      container.x = obstacle.x;
      container.z = obstacle.z;
      container.opened = false;
      container.raidRiskTier = 'high';
      container.items = [{
        uid: 'qa-epic',
        id: 'qa-epic',
        name: 'QA Epic Core',
        category: 'Tech',
        rarity: 'epic',
        value: 50000,
        weight: 0.5,
      }];

      enemy.x = obstacle.x + 8;
      enemy.z = obstacle.z + 4;
      enemy.alertTimer = 0;
      enemy.investigateTimer = 0;
      enemy.combatState = 'patrol';
      const beforeBursts = debug.alertBursts;
      openLootPanel(container);

      return {
        burstDelta: debug.alertBursts - beforeBursts,
        lastAlert: debug.lastAlert,
        alertTimer: enemy.alertTimer,
        investigateTimer: enemy.investigateTimer,
        combatState: enemy.combatState,
        lastKnownDistance: Math.hypot(enemy.lastKnownPlayerX - container.x, enemy.lastKnownPlayerZ - container.z),
      };
    });

    const visuals = await page.evaluate(() => ({
      humanV2Parts: scene.meshes.filter(mesh => String(mesh.name).startsWith('human-v2-')).length,
      humanDetailParts: state.raid.enemies[0]?.visual?.humanDetailMeshes?.length ?? 0,
      baseBodyVisible: state.raid.enemies[0]?.visual?.body?.isVisible ?? false,
      rollback: window.__sdrVisualOverhaulDebug ?? null,
    }));

    console.log(JSON.stringify({ risk, lootBonus, enemyRisk, alert, visuals, errors }, null, 2));

    const rarityRank = { rare: 2, epic: 3, legendary: 4, red: 5 };
    const ok = Boolean(
      risk.version === '2026-09-19-raid-loop-v2' &&
      risk.risk === 'high' &&
      lootBonus.tier === 'high' &&
      lootBonus.poiId === 'center-depot' &&
      lootBonus.itemCount >= 1 &&
      lootBonus.bonus?.riskBonus &&
      (rarityRank[lootBonus.bonus?.rarity] ?? 0) >= 2 &&
      enemyRisk.tier === 'high' &&
      enemyRisk.poiId === 'center-depot' &&
      enemyRisk.maxHealth >= 1090 && enemyRisk.maxHealth <= 1110 &&
      enemyRisk.health >= 1090 &&
      enemyRisk.damage >= 107 && enemyRisk.damage <= 109 &&
      enemyRisk.detectRange >= 45 &&
      enemyRisk.accuracyBonus >= 0.024 &&
      enemyRisk.fireInterval < 1 &&
      alert.burstDelta === 1 &&
      alert.lastAlert?.alerted >= 1 &&
      alert.alertTimer >= 6.9 &&
      alert.investigateTimer >= 5.9 &&
      ['investigate', 'combat'].includes(alert.combatState) &&
      alert.lastKnownDistance < 0.01 &&
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