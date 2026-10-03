const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=stun-control-smoke', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      state.save.selectedOperatorId = 'engineer';
      state.save.engineerUnlocked = true;
      state.save.selectedModeId = 'raid';
      startRaid();
      const raid = state.raid;
      const player = raid.player;
      player.dropTimer = 0;

      const enemy = raid.enemies.find(e => !e.dead && !e.isNamelessBoss && !e.isNamelessMinion);
      enemy.x = player.x + 3;
      enemy.z = player.z;
      enemy.engineerSlowTimer = 10;
      enemy.mobilityAction = null;
      enemy.mobilityCooldown = 0;

      const beforeX = enemy.x;
      moveEntityWithCollision(enemy, 1, 0, enemy.radius ?? 0.7);
      const moveDelta = enemy.x - beforeX;

      const mobility = {
        jump: beginMobilityAction(enemy, 'jump', 1, 0, { duration: .4, speed: 8, height: 1, cooldown: .5 }),
        slide: beginMobilityAction(enemy, 'slide', 1, 0, { duration: .4, speed: 8, cooldown: .5 }),
        roll: beginMobilityAction(enemy, 'roll', 1, 0, { duration: .4, speed: 8, cooldown: .5 }),
        dodge: beginMobilityAction(enemy, 'dodge', 1, 0, { duration: .4, speed: 8, cooldown: .5 }),
      };

      player.engineerSlowTimer = 10;
      player.mobilityAction = null;
      player.mobilityCooldown = 0;
      state.input.keys.clear();
      state.input.keys.add('KeyW');
      const playerMobility = {
        jump: tryPlayerMobilityAction('jump'),
        slide: tryPlayerMobilityAction('slide'),
        roll: tryPlayerMobilityAction('roll'),
        dodge: tryPlayerMobilityAction('dodge'),
      };

      return {
        enemySlowTimer: enemy.engineerSlowTimer,
        moveDelta,
        mobility,
        playerSlowTimer: player.engineerSlowTimer,
        playerMobility,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    const allEnemyBlocked = Object.values(result.mobility).every(v => v === false);
    const allPlayerBlocked = Object.values(result.playerMobility).every(v => v === false);
    if (
      result.enemySlowTimer < 9.9 ||
      result.playerSlowTimer < 9.9 ||
      result.moveDelta > 0.12 ||
      !allEnemyBlocked ||
      !allPlayerBlocked ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
