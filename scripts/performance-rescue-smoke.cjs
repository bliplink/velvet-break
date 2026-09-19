const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=performance-rescue-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.spawnSafeTimer = 0;
    });
    await page.waitForTimeout(700);

    const farEnemy = await page.evaluate(() => {
      const raid = state.raid;
      const player = raid.player;
      const enemy = raid.enemies.find(e => !e.dead && !e.despawned);
      player.x = 0;
      player.z = 0;
      player.insideBuildingId = 'qa-open-space';
      player.onRoofBuildingId = null;

      enemy.x = 0;
      enemy.z = 122;
      enemy.insideBuildingId = 'qa-open-space';
      enemy.onRoofBuildingId = null;
      enemy.dead = false;
      enemy.despawned = false;
      enemy.visual.root.setEnabled(true);

      for (let i = 0; i < 18; i++) {
        updateEnemies(0.033);
        animateRaidEntities(0.033);
      }

      return {
        distance: Math.hypot(enemy.x - player.x, enemy.z - player.z),
        rootEnabled: enemy.visual.root.isEnabled(),
        bodyEnabled: enemy.visual.body?.isEnabled?.() ?? false,
        detailFar: Boolean(enemy.visual.__detailLodFar),
        performance: window.__sdrPerformanceDebug ?? null,
      };
    });

    const repeatRescue = await page.evaluate(() => {
      const raid = state.raid;
      const player = raid.player;
      const companion = raid.companion;

      player.x = 0;
      player.z = 0;
      player.downed = false;
      raid.playerDowned = false;
      companion.x = 1;
      companion.z = 0;
      companion.dead = false;
      companion.despawned = false;
      companion.reviveCount = 0;
      companion.reviveUsed = true;
      state.input.interactHeld = true;

      const doRescue = () => {
        companion.downed = true;
        companion.health = 1;
        companion.reviveProgress = 5.85;
        companion.downedEliminationTimer = 0;
        updateRaid(0.25);
        return {
          downed: companion.downed,
          health: companion.health,
          reviveCount: companion.reviveCount ?? 0,
          dead: companion.dead,
          despawned: companion.despawned,
          text: raid.interactionText,
        };
      };

      const first = doRescue();
      const second = doRescue();
      state.input.interactHeld = false;
      return { first, second };
    });

    const visuals = await page.evaluate(() => {
      const transparentStructures = scene.meshes.filter(mesh => {
        const mat = mesh?.material;
        if (!mat) return false;
        const name = String(mesh.name ?? '');
        const structural = !/^(?:extract|container|switch)-/i.test(name) && (
          mesh.metadata?.raycastTarget === 'obstacle' ||
          /(?:building|facade|warehouse|hangar|bunker|freight|silo|office|apartment|depot|utility|roof|wall|boundary|tower|pillar|window|awning)/i.test(name)
        );
        return structural && typeof mat.alpha === 'number' && mat.alpha < 0.999;
      });
      return {
        overhaul: window.__sdrVisualOverhaulDebug ?? null,
        transparentStructures: transparentStructures.length,
        industrialLampHeads: scene.meshes.filter(mesh => String(mesh.name).startsWith('industrial-lamp-head-')).length,
        humanEnemyMeshes: state.raid.enemies[0]?.visual?.humanDetailMeshes?.length ?? 0,
        playerArms: scene.meshes.filter(mesh => String(mesh.name).startsWith('player-human-')).length,
      };
    });

    console.log(JSON.stringify({ farEnemy, repeatRescue, visuals, errors }, null, 2));

    const ok = Boolean(
      farEnemy.distance >= 115 &&
      farEnemy.rootEnabled &&
      farEnemy.bodyEnabled &&
      farEnemy.performance?.noHardEnemyCull &&
      farEnemy.performance?.tieredAI &&
      farEnemy.performance?.tieredAnimation &&
      !repeatRescue.first.downed &&
      !repeatRescue.first.dead &&
      repeatRescue.first.reviveCount >= 1 &&
      !repeatRescue.second.downed &&
      !repeatRescue.second.dead &&
      repeatRescue.second.reviveCount >= 2 &&
      visuals.overhaul?.humanActorOverhaul &&
      visuals.overhaul?.opaqueBuildings &&
      visuals.overhaul?.streetlightOverhaul &&
      visuals.transparentStructures === 0 &&
      visuals.industrialLampHeads >= 6 &&
      visuals.humanEnemyMeshes >= 10 &&
      visuals.playerArms >= 4 &&
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
