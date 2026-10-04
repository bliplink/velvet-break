const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=ai-throw-animation-smoke', { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      state.save.selectedModeId = 'raid';
      startRaid();
      const raid = state.raid;
      const player = raid.player;
      player.dropTimer = 0;
      const enemy = raid.enemies.find(e => !e.dead && !e.isNamelessBoss && !e.isNamelessMinion);
      enemy.x = player.x + 14;
      enemy.z = player.z;
      enemy.alertTimer = 10;
      enemy.combatState = 'combat';
      enemy.utilityCooldown = 0;
      raid.enemyUtilityGlobalCooldown = 0;

      // Force deterministic stun selection by directly starting the staged action.
      const baseMove = getPlayerMoveSpeed(player, false);
      const beforeStuns = window.__sdrEnemyUtilityDebug?.stuns ?? 0;
      const started = window.__sdrBeginEnemyUtilityThrow?.(enemy, player, 'stun') ?? false;
      const shootingBlocked = enemyShoot(enemy) === false;

      for (let i=0;i<12;i++) updateRaid(0.05);
      const projectileVisible = scene.meshes.some(m => String(m.name).includes('enemy-stun-body-'));
      const beforeImpactStuns = window.__sdrEnemyUtilityDebug?.stuns ?? 0;

      let guard = 0;
      while (enemy.utilityThrowAction && guard < 60) {
        updateRaid(0.05);
        guard++;
      }
      const afterImpactStuns = window.__sdrEnemyUtilityDebug?.stuns ?? 0;
      const stunnedMove = getPlayerMoveSpeed(player, false);
      state.input.keys.clear();
      state.input.keys.add('KeyW');
      const jumpBlocked = tryPlayerMobilityAction('jump') === false;
      const dodgeBlocked = tryPlayerMobilityAction('dodge') === false;

      return {
        started,
        shootingBlocked,
        projectileVisible,
        beforeStuns,
        beforeImpactStuns,
        afterImpactStuns,
        actionEnded: !enemy.utilityThrowAction,
        aiSlowTimer: player.aiStunSlowTimer ?? 0,
        aiMobilityLockTimer: player.aiStunMobilityLockTimer ?? 0,
        moveRatio: stunnedMove / baseMove,
        jumpBlocked,
        dodgeBlocked,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    if (
      !result.started ||
      !result.shootingBlocked ||
      !result.projectileVisible ||
      result.beforeImpactStuns !== result.beforeStuns ||
      result.afterImpactStuns <= result.beforeStuns ||
      !result.actionEnded ||
      result.aiSlowTimer < 4.7 || result.aiSlowTimer > 5.01 ||
      result.aiMobilityLockTimer < 2.2 || result.aiMobilityLockTimer > 2.51 ||
      result.moveRatio < 0.44 || result.moveRatio > 0.46 ||
      !result.jumpBlocked || !result.dodgeBlocked ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
