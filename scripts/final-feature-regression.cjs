const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5531/?v=final-feature-regression', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      const out = {};

      // Echo shop purchase chain.
      state.save.money = 500000;
      state.save.echoUnlocked = false;
      state.save.echoForm2Unlocked = false;
      state.save.selectedEchoForm = 1;
      persistSave();
      renderBasePanel();
      out.echoBaseBought = buyShopEntry('echo_unlock') === true;
      out.echoForm2Bought = buyShopEntry('echo_form2_unlock') === true;
      out.echoForm2Unlocked = Boolean(state.save.echoForm2Unlocked);
      out.echoSelectedForm = Number(state.save.selectedEchoForm);

      // Kai ultimate defensive buff and runtime config.
      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'raid';
      persistSave();
      startRaid();
      const player = state.raid.player;
      player.dropTimer = 0;
      player.skillUses = Math.max(1, player.skillUses ?? 1);
      player.abilityCharges = player.skillUses;
      const beforeMaxArmor = Number(player.maxArmor ?? 0);
      useOperatorAbility();
      syncHud();
      out.kaiAbilityActive = (player.abilityActiveTimer ?? 0) > 0;
      out.kaiArmorGain = Number(player.maxArmor ?? 0) - beforeMaxArmor;
      out.kaiConfig = window.__sdrKaiUtilityConfig ?? null;
      out.actionHudPresent = Boolean(document.getElementById('finalCombatFeedback'));
      out.ultimateFrameActive = document.getElementById('finalUltimateFrame')?.classList.contains('is-active') ?? false;

      out.aiUtilityConfig = window.__sdrEnemyUtilityConfig ?? null;

      // Battlefield deploy path must preserve battlefield mode.
      finishRaid?.(true, 'qa', false);
      state.mode = 'base';
      state.save.selectedModeId = 'battlefield';
      persistSave();
      renderBasePanel();
      refs.deployButton?.click();
      out.battlefieldModeId = state.raid?.modeId ?? null;
      out.battlefieldFlag = Boolean(state.raid?.isBattlefieldRaid || state.raid?.modeId === 'battlefield');

      return out;
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    const ok =
      result.echoBaseBought &&
      result.echoForm2Bought &&
      result.echoForm2Unlocked &&
      result.echoSelectedForm === 2 &&
      result.kaiAbilityActive &&
      result.kaiArmorGain >= 450 &&
      result.kaiConfig?.grenadeDamage === 600 &&
      result.kaiConfig?.guardDuration === 8 &&
      result.kaiConfig?.guardDamageTakenMult === 0.60 &&
      result.actionHudPresent &&
      result.ultimateFrameActive &&
      result.aiUtilityConfig?.smokeRadius === 10 &&
      result.aiUtilityConfig?.smokeDuration === 6.5 &&
      result.aiUtilityConfig?.impactSphereEnabled === false &&
      result.battlefieldFlag &&
      errors.length === 0;
    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
