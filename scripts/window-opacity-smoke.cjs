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

    await page.goto('http://127.0.0.1:5531/?v=window-opacity-smoke', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      state.save.selectedModeId = 'raid';
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.player.health = 9999;
    });
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const raid = state.raid;
      const player = raid.player;
      const win = window.__sdrStructureRegistry?.windows?.find(w => {
        const obstacle = obstacleDefs.find(o => o.id === w.obstacleId);
        return obstacle && obstacle.w >= 7 && obstacle.d >= 6;
      });
      if (!win) throw new Error('No window feature');

      const obstacle = obstacleDefs.find(o => o.id === win.obstacleId);
      const normals = {
        north: { x: 0, z: -1 },
        south: { x: 0, z: 1 },
        east: { x: 1, z: 0 },
        west: { x: -1, z: 0 },
      };
      const n = normals[win.face] || normals.south;
      player.x = win.x + n.x * 1.35;
      player.z = win.z + n.z * 1.35;
      player.insideBuildingId = null;
      player.onRoofBuildingId = null;
      win.broken = true;
      if (win.pane) win.pane.setEnabled(false);

      triggerRaidInteract();
      const started = player.structureAction?.type === 'window';
      for (let i = 0; i < 70; i++) update(0.02);

      const insideGeom =
        player.x > obstacle.x - obstacle.w / 2 + 0.08 &&
        player.x < obstacle.x + obstacle.w / 2 - 0.08 &&
        player.z > obstacle.z - obstacle.d / 2 + 0.08 &&
        player.z < obstacle.z + obstacle.d / 2 - 0.08;

      const structural = scene.meshes.filter(mesh => {
        const name = String(mesh?.name ?? '');
        const parentName = String(mesh?.parent?.name ?? '');
        const md = mesh?.metadata ?? {};
        const isStructural =
          Boolean(md.structureId || md.obstacleId || md.raycastTarget === 'obstacle') ||
          /wall|roof|floor|building|obstacle|stair|ladder|awning|door|cover|divider|window-frame|facade|warehouse|hangar|bunker|depot|silo|office|apartment/i.test(name) ||
          /^decor-/.test(parentName);
        return isStructural && !/window-pane|lamp|beacon|halo|glow|smoke|glass/i.test(name);
      });
      const transparent = structural.filter(mesh =>
        (mesh.visibility ?? 1) < 0.999 ||
        (mesh.material && (mesh.material.alpha ?? 1) < 0.999)
      );

      return {
        started,
        obstacleId: obstacle.id,
        insideId: player.insideBuildingId,
        insideGeom,
        x: player.x,
        z: player.z,
        transparentCount: transparent.length,
        transparentNames: transparent.slice(0, 12).map(m => m.name),
        structuralCount: structural.length,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    if (
      !result.started ||
      result.insideId !== result.obstacleId ||
      !result.insideGeom ||
      result.structuralCount < 20 ||
      result.transparentCount !== 0 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
