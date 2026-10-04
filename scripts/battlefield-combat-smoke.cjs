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

    await page.goto('http://127.0.0.1:5531/?v=battlefield-combat-smoke', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(document.querySelector('[data-mode-id="battlefield"]')));

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'raid';
      if (typeof persistSave === 'function') persistSave();
      if (state.mode === 'base') renderBasePanel();
    });

    await page.click('[data-mode-id="battlefield"]');
    await page.click('#deployButton');
    await page.waitForFunction(() => state.mode === 'raid' && state.raid?.modeId === 'battlefield');

    const entered = await page.evaluate(() => ({
      mode: state.mode,
      modeId: state.raid?.modeId,
      initialEnemies: state.raid?.enemies?.length ?? 0,
      vehicles: state.raid?.vehicles?.length ?? 0,
      battlefield: Boolean(state.raid?.isBattlefield),
      rifleDamage: getCurrentPlayerWeaponStats(state.raid?.player)?.projectileDamage ?? 0,
    }));

    const combat = await page.evaluate(() => {
      const raid = state.raid;
      const player = raid.player;
      player.dropTimer = 0;

      for (let i = 0; i < 16; i++) updateRaid(0.05);

      const enemy = raid.enemies.find(e => !e.dead && !e.isNamelessBoss && !e.isNamelessMinion);
      enemy.health = 2000;
      enemy.maxHealth = 2000;
      enemy.damageReduction = 0;
      enemy.x = player.x + 8;
      enemy.z = player.z;
      player.utilityItems = 1;
      player.grenadeTargeting = { distance: 8, x: enemy.x, z: enemy.z };
      const before = enemy.health;
      window.useOperatorUtility();
      for (let i = 0; i < 28; i++) updateRaid(0.05);
      const grenadeDamage = before - enemy.health;

      return {
        enemies: raid.enemies.length,
        rosterReady: Boolean(raid.battlefieldRosterReady),
        vehicles: raid.vehicles?.length ?? 0,
        grenadeDamage,
        utilityItems: player.utilityItems,
      };
    });

    console.log(JSON.stringify({ entered, combat, errors }, null, 2));
    if (
      entered.modeId !== 'battlefield' ||
      !entered.battlefield ||
      entered.initialEnemies >= 72 ||
      entered.vehicles !== 3 ||
      entered.rifleDamage < 38 ||
      combat.enemies < 72 ||
      !combat.rosterReady ||
      combat.vehicles !== 3 ||
      combat.grenadeDamage < 640 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
