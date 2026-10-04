const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=lockdown-wall-occlusion-smoke', { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'raid';
      startRaid();
      const raid = state.raid;
      raid.player.dropTimer = 0;

      for (let i = 0; i < 80 && !window.__sdrFinalOpaqueInteractiveShellsBuilt; i++) {
        updateRaid(0.05);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      const structureId = 'center-depot';
      const walls = obstacleDefs.filter(o => o?.structureId === structureId && String(o.id).includes('-wall-'));
      if (!walls.length) return { missingWalls: true };

      const minX = Math.min(...walls.map(w => w.x - w.w / 2));
      const maxX = Math.max(...walls.map(w => w.x + w.w / 2));
      const minZ = Math.min(...walls.map(w => w.z - w.d / 2));
      const maxZ = Math.max(...walls.map(w => w.z + w.d / 2));
      const centerZ = (minZ + maxZ) / 2;

      const player = raid.player;
      const enemy = raid.enemies.find(e => !e.dead && !e.despawned && e.visual);
      player.x = minX - 3;
      player.z = centerZ;
      player.yaw = Math.PI / 2;
      enemy.x = maxX + 3;
      enemy.z = centerZ;
      enemy.heading = -Math.PI / 2;
      enemy.revealedTimer = 0;

      for (let i = 0; i < 5; i++) {
        updateRaid(0.05);
        syncHud();
      }

      const blocked = lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z);
      const from = new BABYLON.Vector3(player.x, getPlayerViewHeight(player), player.z);
      const to = new BABYLON.Vector3(enemy.x, 1.35, enemy.z);
      const delta = to.subtract(from);
      const ray = new BABYLON.Ray(from, delta.normalize(), delta.length());
      const hit = scene.pickWithRay(ray, mesh => {
        const kind = mesh?.metadata?.raycastTarget;
        return kind === 'obstacle' || kind === 'enemy';
      });

      const overlayViolations = (enemy.visual.overlayMeshes ?? []).filter(m =>
        m?.renderOverlay || (m?.overlayAlpha ?? 0) > 0.001 || m?.renderingGroupId !== 0
      ).map(m => m.name);
      const revealViolations = (enemy.visual.revealMeshes ?? []).filter(m =>
        m?.isEnabled?.() !== false || m?.isVisible !== false || m?.renderingGroupId !== 0
      ).map(m => m.name);

      const interactiveShells = scene.meshes.filter(m => m.metadata?.finalInteractiveOpaqueShell);
      const shellStructures = [...new Set(interactiveShells.map(m => m.metadata?.structureId).filter(Boolean))].sort();
      const badShells = interactiveShells.filter(m =>
        m.isVisible === false ||
        (m.visibility ?? 1) < 0.999 ||
        (m.material?.alpha ?? 1) < 0.999 ||
        m.renderingGroupId !== 0 ||
        m.material?.disableDepthWrite === true
      );

      return {
        missingWalls: false,
        blocked,
        firstHitKind: hit?.pickedMesh?.metadata?.raycastTarget ?? null,
        firstHitName: hit?.pickedMesh?.name ?? null,
        finalBuilt: Boolean(window.__sdrFinalOpaqueInteractiveShellsBuilt),
        shellCount: interactiveShells.length,
        shellStructures,
        badShellCount: badShells.length,
        overlayViolations,
        revealViolations,
        classLabelAlpha: enemy.visual.classLabelMaterial?.alpha ?? 0,
        revealAlpha: enemy.visual.revealMaterial?.alpha ?? 0,
      };
    });

    fs.mkdirSync('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/lockdown-wall-occlusion.png', fullPage: false });
    console.log(JSON.stringify({ result, errors }, null, 2));
    if (
      result.missingWalls ||
      !result.blocked ||
      result.firstHitKind !== 'obstacle' ||
      !result.finalBuilt ||
      result.shellStructures.length !== 6 ||
      result.shellCount < 12 ||
      result.badShellCount !== 0 ||
      result.overlayViolations.length ||
      result.revealViolations.length ||
      result.classLabelAlpha > 0.001 ||
      result.revealAlpha > 0.001 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
