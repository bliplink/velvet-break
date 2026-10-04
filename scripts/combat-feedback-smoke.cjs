const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=combat-feedback-smoke', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      state.save.echoUnlocked = true;
      state.save.echoForm2Unlocked = true;
      state.save.selectedEchoForm = 2;
      startRaid();
      const player = state.raid.player;
      player.dropTimer = 0;
      syncHud();

      const frame = document.getElementById('finalUltimateFrame');
      const burst = document.getElementById('finalUltimateBurst');
      const action = document.getElementById('finalActionFeedback');
      const actionLabel = document.getElementById('finalActionLabel');

      const before = {
        frame: Boolean(frame),
        burst: Boolean(burst),
        action: Boolean(action),
      };

      useOperatorAbility();
      syncHud();
      const ultimate = {
        active: frame?.classList.contains('is-active'),
        starting: burst?.classList.contains('is-starting'),
        name: document.getElementById('finalUltimateName')?.textContent ?? '',
        border: frame?.style.borderColor ?? '',
      };

      player.reloadTimer = 1.2;
      syncHud();
      const reload = {
        active: action?.classList.contains('is-active'),
        label: actionLabel?.textContent ?? '',
      };

      player.reloadTimer = 0;
      player.echoKnifeInspect = { timer: 0.2, duration: 1.9, form: 2, visual: null };
      syncHud();
      const inspect = {
        active: action?.classList.contains('is-active'),
        label: actionLabel?.textContent ?? '',
        detail: document.getElementById('finalActionDetail')?.textContent ?? '',
      };

      player.echoKnifeInspect = null;
      player.mobilityAction = { type: 'jump', timer: 0.3, duration: 0.5 };
      syncHud();
      const movementExcluded = !action?.classList.contains('is-active');

      return {
        before,
        ultimate,
        reload,
        inspect,
        movementExcluded,
        damageMult: getWeaponDamage(player.weapon, { ammoId: player.currentAmmoId, player }) /
          getWeaponStats(player.weapon, { ammoId: player.currentAmmoId }).projectileDamage,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    if (
      !result.before.frame || !result.before.burst || !result.before.action ||
      !result.ultimate.active || !result.ultimate.starting || !result.ultimate.name ||
      !result.reload.active || !/换弹|Reloading/.test(result.reload.label) ||
      !result.inspect.active || !/回声|Echo/.test(result.inspect.label) ||
      !/相位|Phase/.test(result.inspect.detail) ||
      !result.movementExcluded ||
      result.damageMult < 1.7 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
