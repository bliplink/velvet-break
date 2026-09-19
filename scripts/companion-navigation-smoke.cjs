const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5531/?companion-navigation-smoke', { waitUntil: 'networkidle' });
  await page.locator('#deployButton').click();
  await page.waitForTimeout(700);
  const result = await page.evaluate(() => {
    const raid = state.raid;
    const clone = raid.companion;
    const target = raid.enemies.find((enemy) => !enemy.isNamelessBoss && !enemy.isNamelessMinion);
    const stair = window.__sdrStructureRegistry.stairs.find((entry) => obstacleDefs.some((roof) => roof.id === entry.obstacleId));
    const roof = obstacleDefs.find((entry) => entry.id === stair.obstacleId);
    for (const enemy of raid.enemies) if (enemy !== target) enemy.dead = true;
    raid.player.dropTimer = 0;
    raid.spawnSafeTimer = 0;

    clone.x = roof.x - roof.w / 2 - 3;
    clone.z = roof.z;
    target.x = roof.x + roof.w / 2 + 3;
    target.z = roof.z;
    target.health = 500;
    clone.shootTimer = 0;
    updateRaid(0.033);
    const wallShot = { health: target.health, cloneSpeed: clone.speed };

    target.dead = true;
    raid.player.x = target.x;
    raid.player.z = target.z;
    const beforeRoute = Math.hypot(raid.player.x - clone.x, raid.player.z - clone.z);
    for (let i = 0; i < 300; i++) updateRaid(0.033);
    const route = {
      before: beforeRoute,
      after: Math.hypot(raid.player.x - clone.x, raid.player.z - clone.z),
      pathLength: clone.navPath?.length ?? 0,
      clone: { x: clone.x, z: clone.z },
      player: { x: raid.player.x, z: raid.player.z },
      path: clone.navPath,
      obstacle: { x: roof.x, z: roof.z, w: roof.w, d: roof.d },
    };

    const access = { x: stair.x - stair.dirX * 0.9, z: stair.z - stair.dirZ * 0.9 };
    clone.x = access.x;
    clone.z = access.z;
    clone.onRoofBuildingId = null;
    clone.stairAction = null;
    raid.player.x = roof.x;
    raid.player.z = roof.z;
    raid.player.onRoofBuildingId = roof.id;
    updateRaid(0.033);
    const cloneStairsStarted = Boolean(clone.stairAction);
    if (clone.stairAction) clone.stairAction.timer = 0.01;
    updateRaid(0.033);
    const cloneRoof = clone.onRoofBuildingId;

    target.dead = false;
    target.despawned = false;
    target.x = access.x;
    target.z = access.z;
    target.alertTimer = 0;
    target.onRoofBuildingId = null;
    target.stairAction = null;
    target.mobilityAction = null;
    target.engineerStunTimer = 0;
    updateEnemies(0.033);
    const enemyStairsStarted = Boolean(target.stairAction);
    const enemyAfterStart = { x: target.x, z: target.z, alertTimer: target.alertTimer, navGoal: target.navGoal, playerRoof: raid.player.onRoofBuildingId, targetRoof: target.onRoofBuildingId, mobility: target.mobilityAction?.type, stun: target.engineerStunTimer, stairCandidates: window.__sdrStructureRegistry.stairs.filter((entry) => entry.obstacleId === roof.id).map((entry) => ({ x: entry.x - entry.dirX * 0.9, z: entry.z - entry.dirZ * 0.9 })) };
    if (target.stairAction) target.stairAction.timer = 0.01;
    updateEnemies(0.033);
    return { wallShot, route, cloneStairsStarted, cloneRoof, enemyStairsStarted, enemyAfterStart, enemyRoof: target.onRoofBuildingId, expectedRoof: roof.id };
  });
  console.log(JSON.stringify({ result, errors }, null, 2));
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 1500))]);
  process.exit(errors.length || result.wallShot.health !== 500 || result.route.after >= result.route.before || !result.cloneStairsStarted || result.cloneRoof !== result.expectedRoof || !result.enemyStairsStarted || result.enemyRoof !== result.expectedRoof ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
