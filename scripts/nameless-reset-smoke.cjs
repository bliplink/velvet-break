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

    await page.goto('http://127.0.0.1:5531/?v=nameless-reset-smoke', { waitUntil: 'networkidle' });

    const first = await page.evaluate(() => {
      state.save.selectedModeId = 'raid';
      startRaid();
      state.raid.player.dropTimer = 0;
      updateRaid(0.05);
      const boss = state.raid.enemies.find(e => e.isNamelessBoss);
      if (!boss) throw new Error('Nameless did not spawn in first raid');
      boss.health = Math.min(boss.health, 1000);
      damageEnemy(boss, 1);
      const guards = state.raid.enemies.filter(e => e.isNamelessMinion);
      return {
        bossId: boss.id,
        guardIds: guards.map(g => g.id),
        guardCount: guards.length,
        guardsHealthy: guards.every(g => !g.dead && !g.despawned && g.health > 0 && g.visual?.root && !g.visual.root.isDisposed?.()),
      };
    });

    const second = await page.evaluate(() => {
      clearRaid();
      setMode('base');
      state.save.selectedModeId = 'raid';
      startRaid();
      state.raid.player.dropTimer = 0;
      updateRaid(0.05);
      const boss = state.raid.enemies.find(e => e.isNamelessBoss);
      if (!boss) throw new Error('Nameless did not spawn in second raid');
      boss.health = Math.min(boss.health, 1000);
      damageEnemy(boss, 1);
      const guards = state.raid.enemies.filter(e => e.isNamelessMinion);
      return {
        bossId: boss.id,
        guardIds: guards.map(g => g.id),
        guardCount: guards.length,
        guardsHealthy: guards.every(g => !g.dead && !g.despawned && g.health > 0 && g.visual?.root && !g.visual.root.isDisposed?.()),
        token: state.raid.namelessGuardResetToken ?? 0,
      };
    });

    const overlap = first.guardIds.filter(id => second.guardIds.includes(id));
    console.log(JSON.stringify({ first, second, overlap, errors }, null, 2));

    if (
      first.guardCount !== 5 ||
      second.guardCount !== 5 ||
      !first.guardsHealthy ||
      !second.guardsHealthy ||
      overlap.length !== 0 ||
      second.token < 1 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
