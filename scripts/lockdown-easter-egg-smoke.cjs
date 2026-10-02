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

    await page.goto('http://127.0.0.1:5531/?v=lockdown-easter-egg-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    await page.evaluate(() => {
      state.save.selectedModeId = 'raid';
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
    await page.waitForTimeout(180);

    const result = await page.evaluate(() => {
      const raid = state.raid;
      const ghost = raid.containers.find(container => container.id === raid.lockdownGhostCacheId);
      const beforeBonus = raid.bonusReward ?? 0;
      const beforeInvisible = raid.player.invisibilityTimer ?? 0;
      if (ghost) openLootPanel(ghost);
      const after = {
        modeId: raid.modeId,
        ghostId: ghost?.id ?? null,
        ghostName: ghost?.name ?? '',
        triggered: Boolean(raid.lockdownGhostTriggered),
        bonusGain: (raid.bonusReward ?? 0) - beforeBonus,
        invisibilityGain: Math.max(0, (raid.player.invisibilityTimer ?? 0) - beforeInvisible),
        ghostTimer: raid.player.lockdownGhostTimer ?? 0,
        debug: window.__sdrModeNoveltyDebug ?? null,
      };
      closeLootPanel();
      return after;
    });

    console.log(JSON.stringify({ result, errors }, null, 2));

    const ok = Boolean(
      result.modeId === 'raid' &&
      result.ghostId &&
      /无编号|Unnumbered/.test(result.ghostName) &&
      result.triggered &&
      result.bonusGain >= 1800 &&
      result.invisibilityGain >= 5.5 &&
      result.ghostTimer > 0 &&
      result.debug?.version === '2026-10-02-mode-novelty-v2' &&
      result.debug?.lockdownGhostCaches >= 1 &&
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
