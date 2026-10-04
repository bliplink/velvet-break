const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=latest-combat-regression', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      state.save.money = 1000000;
      state.save.echoUnlocked = false;
      state.save.echoForm2Unlocked = false;
      state.save.selectedEchoForm = 1;
      renderBasePanel();
      buyShopEntry('echo_unlock');
      buyShopEntry('echo_form2_unlock');
      const echoShop = getShopEntries().find(e => e.id === 'echo_form2_unlock');

      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'raid';
      startRaid();
      const raid = state.raid;
      const player = raid.player;
      player.dropTimer = 0;
      const maxBefore = player.maxArmor;
      const armorBefore = player.armor;
      player.abilityCooldown = 0;
      if ((player.abilityCharges ?? 0) <= 0) player.abilityCharges = 1;
      if ((player.skillUses ?? 0) <= 0) player.skillUses = Math.max(1, player.abilityCharges ?? 1);
      useOperatorAbility();
      syncHud();
      const kaiUlt = {
        baseMaxArmor: maxBefore,
        active: (player.abilityActiveTimer ?? 0) > 0,
        maxArmorGain: player.maxArmor - maxBefore,
        armorGain: player.armor - armorBefore,
        startupTimer: player.ultimateStartupTimer ?? 0,
        frameActive: document.getElementById('finalUltimateFrame')?.classList.contains('is-active') ?? false,
      };

      const enemy = raid.enemies.find(e => !e.dead && !e.isNamelessBoss && !e.isNamelessMinion);
      enemy.health = 1000;
      enemy.maxHealth = 1000;
      enemy.damageReduction = 0;
      const beforeUtility = enemy.health;
      damageEnemy(enemy, 100, { utilityKind: 'regression-test', ignoreSmoke: true });
      const utilityDamage = beforeUtility - enemy.health;

      player.isAiming = true;
      syncHud();
      const actionHud = {
        active: document.getElementById('finalActionFeedback')?.classList.contains('is-active') ?? false,
        frameActive: document.getElementById('finalActionFrame')?.classList.contains('is-active') ?? false,
        label: document.getElementById('finalActionLabel')?.textContent ?? '',
      };
      player.isAiming = false;

      enemy.x = player.x + 12;
      enemy.z = player.z;
      enemy.alertTimer = 10;
      enemy.combatState = 'combat';
      enemy.utilityCooldown = 0;
      raid.enemyUtilityGlobalCooldown = 0;
      const smokeStarted = window.__sdrBeginEnemyUtilityThrow?.(enemy, player, 'smoke') ?? false;
      for (let i = 0; i < 50; i++) updateRaid(0.05);
      const smokeRadius = Math.max(0, ...(raid.enemySmokeFields ?? []).map(f => f.radius ?? 0));
      const landingSphereCount = scene.meshes.filter(m => String(m.name ?? '').startsWith('enemy-utility-fx-')).length;

      const echoStarted = window.__sdrUseEchoKnife?.() ?? false;
      const echoPhaseGeometry = scene.meshes.filter(m => /echo-phase-(outer-edge|guard-ring)/.test(String(m.name ?? ''))).length;

      player.abilityActiveTimer = 0;
      updateRaid(0.05);
      syncHud();
      const kaiRestored = {
        maxArmor: player.maxArmor,
        ultArmorActive: Boolean(player.kaiUltArmorActive),
      };

      return {
        echo: {
          unlocked: state.save.echoUnlocked,
          form2Unlocked: state.save.echoForm2Unlocked,
          selectedForm: state.save.selectedEchoForm,
          shopDisabled: Boolean(echoShop?.disabled),
          attackStarted: echoStarted,
          phaseGeometry: echoPhaseGeometry,
        },
        kaiUlt,
        kaiRestored,
        utilityDamage,
        enemyType: enemy.type,
        smokeStarted,
        smokeRadius,
        landingSphereCount,
        actionHud,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    const r = result;
    if (
      !r.echo.unlocked ||
      !r.echo.form2Unlocked ||
      r.echo.selectedForm !== 2 ||
      !r.echo.shopDisabled ||
      !r.echo.attackStarted ||
      r.echo.phaseGeometry < 3 ||
      !r.kaiUlt.active ||
      r.kaiUlt.maxArmorGain < 299 ||
      r.kaiUlt.armorGain < 299 ||
      r.kaiUlt.startupTimer <= 0 ||
      !r.kaiUlt.frameActive ||
      r.utilityDamage >= 100 ||
      !r.smokeStarted ||
      r.smokeRadius < 7.9 ||
      r.landingSphereCount !== 0 ||
      !r.actionHud.active ||
      !r.actionHud.frameActive ||
      !/瞄准|Aiming/i.test(r.actionHud.label) ||
      r.kaiRestored.ultArmorActive ||
      r.kaiRestored.maxArmor !== r.kaiUlt.baseMaxArmor ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
