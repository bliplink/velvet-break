const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=ai-utility-smoke', { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      state.save.selectedModeId = 'raid';
      startRaid();
      const raid = state.raid;
      raid.player.dropTimer = 0;
      const normal = raid.enemies.filter(e => !e.isNamelessBoss && !e.isNamelessMinion && !e.isRangeTarget);
      const healths = normal.slice(0,6).map(e => ({ type:e.type, maxHealth:e.maxHealth }));
      const enemy = normal[0];
      enemy.x = raid.player.x + 14;
      enemy.z = raid.player.z;
      enemy.alertTimer = 10;
      enemy.combatState = 'combat';
      enemy.utilityCooldown = 0;
      raid.enemyUtilityGlobalCooldown = 0;
      const before = window.__sdrEnemyUtilityDebug?.throws ?? 0;
      for (let i=0;i<400;i++) updateRaid(0.05);
      const after = window.__sdrEnemyUtilityDebug?.throws ?? 0;
      const shells = scene.meshes.filter(m => m.metadata?.finalOpaqueBuildingShell);
      const badShells = shells.filter(m =>
        m.isVisible === false ||
        (m.visibility ?? 1) < 0.999 ||
        (m.material?.alpha ?? 1) < 0.999 ||
        m.renderingGroupId !== 0 ||
        m.material?.disableDepthWrite === true
      );
      return {
        normalCount: normal.length,
        healths,
        utilityThrows: after - before,
        playerSlowTimer: raid.player.engineerSlowTimer ?? 0,
        shellCount: shells.length,
        badShellCount: badShells.length,
        utilityDebug: window.__sdrEnemyUtilityDebug,
      };
    });
    console.log(JSON.stringify({ result, errors }, null, 2));
    const healthOk = result.healths.every(row => row.maxHealth >= (row.type === 'bruiser' ? 490 : row.type === 'hunter' ? 370 : 260));
    if (result.normalCount < 30 || !healthOk || result.utilityThrows < 1 || result.utilityThrows > 4 || result.playerSlowTimer > 10.01 || result.shellCount < 20 || result.badShellCount !== 0 || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
