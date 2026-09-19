const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');

const gameUrl = 'http://127.0.0.1:5531/';
let server = null;

async function ensureServer() {
  try {
    if ((await fetch(gameUrl)).ok) return;
  } catch {}
  server = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 100));
    try {
      if ((await fetch(gameUrl)).ok) return;
    } catch {}
  }
  throw new Error('server did not start');
}

process.on('exit', () => server?.kill());

(async () => {
  await ensureServer();
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(gameUrl + '?v=fair-vision-canister-smoke', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('#deployButton').click();
  await page.waitForTimeout(2200);

  const result = await page.evaluate(() => {
    const raid = state.raid;
    const player = raid.player;

    player.operatorId = 'recon';
    player.abilityActiveTimer = 10;
    for (const enemy of raid.enemies) enemy.revealedTimer = 10;
    if (typeof syncEnemyRevealOverlays === 'function') syncEnemyRevealOverlays();

    const revealMeshes = raid.enemies.flatMap(enemy => enemy.visual?.revealMeshes ?? []);
    const enabledRevealMeshes = revealMeshes.filter(mesh => mesh?.isEnabled?.()).length;
    const visibleOverlays = raid.enemies.flatMap(enemy => enemy.visual?.overlayMeshes ?? [])
      .filter(mesh => mesh?.renderOverlay && (mesh?.overlayAlpha ?? 0) > 0).length;

    const tankMeshes = scene.meshes.filter(mesh => mesh.name.startsWith('actor-tank-'));
    const companionTankMeshes = scene.meshes.filter(mesh => mesh.name.startsWith('actor-tank-raid-companion-clone'));

    const opaqueStructureMeshes = scene.meshes.filter(mesh =>
      /^(obstacle-|boundary-|roof-|window-|door-|wide-door-|tower-|fence-)/.test(mesh.name)
    );
    const transparentStructures = opaqueStructureMeshes.filter(mesh =>
      mesh.material && typeof mesh.material.alpha === 'number' && mesh.material.alpha < 0.999
    );

    return {
      debug: window.__sdrFairVisionCanisterDebug ?? null,
      enemyCount: raid.enemies.length,
      tankMeshCount: tankMeshes.length,
      companionTankMeshCount: companionTankMeshes.length,
      originalCharacterModels: window.__sdrFairVisionCanisterDebug?.originalCharacterModels ?? false,
      revealMeshCount: revealMeshes.length,
      enabledRevealMeshes,
      visibleOverlays,
      structureMeshCount: opaqueStructureMeshes.length,
      transparentStructureCount: transparentStructures.length,
      transparentStructureNames: transparentStructures.slice(0, 20).map(mesh => mesh.name),
    };
  });

  console.log(JSON.stringify({ result, errors }, null, 2));
  await browser.close();

  const ok = Boolean(
    result.debug?.wallRevealDisabled &&
    result.debug?.opaqueBuildings &&
    result.debug?.actorTankRemodel === false &&
    result.debug?.playerUtilityTankRemodel === false &&
    result.originalCharacterModels &&
    result.enemyCount > 0 &&
    result.tankMeshCount === 0 &&
    result.companionTankMeshCount === 0 &&
    result.revealMeshCount > 0 &&
    result.enabledRevealMeshes === 0 &&
    result.transparentStructureCount === 0 &&
    errors.length === 0
  );

  process.exit(ok ? 0 : 1);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
