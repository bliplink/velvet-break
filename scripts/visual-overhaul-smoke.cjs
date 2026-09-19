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

    await page.goto('http://127.0.0.1:5531/?v=visual-overhaul-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
    });
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const raid = state.raid;
      const enemy = raid?.enemies?.find(e => !e.dead);
      const companion = raid?.companion;

      const transparentStructures = scene.meshes.filter(mesh => {
        const mat = mesh?.material;
        if (!mat) return false;
        const name = String(mesh.name ?? '');
        const structural = !/^(?:extract|container|switch)-/i.test(name) &&
          !/^utility-cloak-/i.test(name) && (
          mesh.metadata?.raycastTarget === 'obstacle' ||
          /(?:building|facade|warehouse|hangar|bunker|freight|silo|office|apartment|depot|utility|roof|wall|boundary|tower|pillar|window|awning)/i.test(name)
        );
        return structural && typeof mat.alpha === 'number' && mat.alpha < 0.999;
      });

      const legacyLampEnabled = scene.meshes.filter(mesh =>
        (String(mesh.name).startsWith('lamp-pole-') ||
          (String(mesh.name).startsWith('lamp-') && !String(mesh.name).startsWith('lamp-pole-'))) &&
        mesh.isEnabled()
      );

      return {
        debug: window.__sdrVisualOverhaulDebug ?? null,
        enemyHumanDetail: enemy?.visual?.humanDetailMeshes?.length ?? 0,
        companionHumanDetail: companion?.visual?.humanDetailMeshes?.length ?? 0,
        humanV2Parts: scene.meshes.filter(mesh => String(mesh.name).startsWith('human-v2-')).length,
        playerHumanArms: scene.meshes.filter(mesh => String(mesh.name).startsWith('player-human-')).length,
        enemyBodyVisible: enemy?.visual?.body?.isVisible ?? false,
        enemyChestVisible: enemy?.visual?.chestRig?.isVisible ?? false,
        companionBodyVisible: companion?.visual?.body?.isVisible ?? false,
        industrialLampHeads: scene.meshes.filter(mesh => String(mesh.name).startsWith('industrial-lamp-head-')).length,
        industrialLampShafts: scene.meshes.filter(mesh => String(mesh.name).startsWith('industrial-lamp-shaft-')).length,
        legacyLampEnabled: legacyLampEnabled.length,
        realtimeStreetlights: scene.lights.filter(light => String(light.name).startsWith('industrial-streetlight-glow-')).length,
        actorTankMeshes: scene.meshes.filter(mesh => String(mesh.name).startsWith('actor-tank-')).length,
        transparentStructures: transparentStructures.length,
        transparentNames: transparentStructures.slice(0, 20).map(mesh => mesh.name),
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));

    const ok = Boolean(
      result.debug?.legacyCanisterModel &&
      result.debug?.humanActorOverhaul === false &&
      result.debug?.playerArmsOverhaul === false &&
      result.debug?.opaqueBuildings &&
      result.debug?.streetlightOverhaul &&
      result.enemyHumanDetail === 0 &&
      result.companionHumanDetail === 0 &&
      result.humanV2Parts === 0 &&
      result.playerHumanArms === 0 &&
      result.enemyBodyVisible &&
      result.enemyChestVisible &&
      result.companionBodyVisible &&
      result.industrialLampHeads >= 6 &&
      result.industrialLampShafts >= 6 &&
      result.legacyLampEnabled === 0 &&
      result.realtimeStreetlights <= 2 &&
      result.actorTankMeshes === 0 &&
      result.debug?.originalCharacterModels &&
      result.transparentStructures === 0 &&
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
