const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=operator-power-smoke', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      const defs = getOperatorDefs();
      const ids = ['assault', 'recon', 'medic', 'engineer', 'lingshuang'].filter(id => defs[id]);
      const damageMultipliers = {};
      for (const id of ids) damageMultipliers[id] = defs[id].baseDamageMult ?? 1;

      state.save.selectedOperatorId = 'recon';
      state.save.claireUnlocked = true;
      startRaid();
      state.raid.player.dropTimer = 0;
      const claire = state.raid.player;
      const claireBaseMove = getPlayerMoveSpeed(claire, false);
      const claireBaseStats = getCurrentPlayerWeaponStats(claire);
      const claireHealthBefore = claire.health = claire.maxHealth = 1000;
      useOperatorAbility();
      const claireBuffMove = getPlayerMoveSpeed(claire, false);
      const claireBuffStats = getCurrentPlayerWeaponStats(claire);
      applyDamageToPlayer(100);
      const claireDamageTaken = claireHealthBefore - claire.health;

      clearRaid();
      setMode('base');
      state.save.selectedOperatorId = 'medic';
      state.save.benjaminUnlocked = true;
      startRaid();
      state.raid.player.dropTimer = 0;
      const ben = state.raid.player;
      ben.health = ben.maxHealth = 1000;
      const benBaseMove = getPlayerMoveSpeed(ben, false);
      useOperatorAbility();
      const benBuffMove = getPlayerMoveSpeed(ben, false);

      const baseWeapon = getWeaponStats(ben.weapon, { ammoId: ben.currentAmmoId }).projectileDamage;
      const boostedWeapon = getWeaponDamage(ben.weapon, { ammoId: ben.currentAmmoId, player: ben });

      return {
        ids,
        damageMultipliers,
        claire: {
          active: claire.abilityActiveTimer > 0,
          moveRatio: claireBuffMove / claireBaseMove,
          reloadRatio: claireBuffStats.reload / claireBaseStats.reload,
          spreadRatio: claireBuffStats.spread / claireBaseStats.spread,
          damageTaken: claireDamageTaken,
          charges: claire.claireScanCharges,
        },
        benjamin: {
          immunity: ben.damageImmunityTimer,
          speedTimer: ben.medicSpeedBoostTimer,
          moveRatio: benBuffMove / benBaseMove,
          skillUses: ben.skillUses,
          health: ben.health,
        },
        damageRatio: boostedWeapon / baseWeapon,
        debugVersion: window.__sdrFinalPolishDebug?.version ?? null,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    const d = result.damageMultipliers;
    const allBuffed = result.ids.every(id => d[id] > 1);
    if (
      !allBuffed ||
      !result.claire.active ||
      result.claire.moveRatio < 1.3 ||
      result.claire.reloadRatio > 0.8 ||
      result.claire.spreadRatio > 0.75 ||
      result.claire.damageTaken > 66 ||
      result.benjamin.immunity < 11.9 ||
      result.benjamin.speedTimer < 11.9 ||
      result.benjamin.moveRatio < 1.4 ||
      result.benjamin.health !== 1000 ||
      result.damageRatio < 1.15 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
