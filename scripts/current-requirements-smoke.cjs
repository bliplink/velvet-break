const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
  const operatorSource = fs.readFileSync('src/operator-utility-patch.js', 'utf8');
  const kaiSourceOk =
    /const GRENADE_DAMAGE = 600;/.test(operatorSource) &&
    /kaiUtilityGuardTimer[^\n]*8/.test(operatorSource) &&
    /kaiUtilityDamageTakenMult\s*=\s*0\.60/.test(operatorSource);

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=current-requirements-smoke', { waitUntil: 'networkidle' });

    const shop = await page.evaluate(() => {
      state.save.money = 500000;
      state.save.echoUnlocked = false;
      state.save.echoForm2Unlocked = false;
      state.save.selectedEchoForm = 1;
      persistSave();
      renderBasePanel();

      const idsBefore = getShopEntries().map(entry => entry.id);
      const echoBought = buyShopEntry('echo_unlock');
      const form2Bought = buyShopEntry('echo_form2_unlock');
      return {
        idsBefore,
        echoBought,
        form2Bought,
        echoUnlocked: state.save.echoUnlocked,
        form2Unlocked: state.save.echoForm2Unlocked,
        selectedEchoForm: state.save.selectedEchoForm,
        liveForm: window.__sdrEchoKnifeConfig?.form,
      };
    });

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'battlefield';
      persistSave();
      startRaid();
    });
    await page.waitForTimeout(350);

    const runtime = await page.evaluate(() => {
      const raid = state.raid;
      const assault = getOperatorDefs().assault;
      const player = raid?.player;
      const rifleDamage = player ? getWeaponDamage('rifle', { player, ammoId: player.currentAmmoId }) : 0;
      return {
        modeDefs: Object.keys(getLobbyModeDefs()),
        modeId: raid?.modeId,
        enemyCount: raid?.enemies?.length ?? 0,
        allyCount: raid?.allies?.length ?? 0,
        operatorId: player?.operatorId,
        rifleDamage,
        assault: {
          duration: assault?.abilityDuration,
          speed: assault?.speedBoostMult,
          damage: assault?.damageBoostMult,
          damageTaken: assault?.abilityDamageTakenMult,
          armorBonus: assault?.ultimateArmorBonus,
        },
        utility: window.__sdrEnemyUtilityConfig,
        replayVersion: window.__sdrReplayDebug?.version,
        finalDebug: window.__sdrFinalPolishDebug,
        actionFeedback: Boolean(document.getElementById('finalCombatFeedback')),
      };
    });

    console.log(JSON.stringify({ kaiSourceOk, shop, runtime, errors }, null, 2));

    const ok =
      kaiSourceOk &&
      shop.idsBefore.includes('echo_unlock') &&
      shop.idsBefore.includes('echo_form2_unlock') &&
      shop.echoBought === true &&
      shop.form2Bought === true &&
      shop.echoUnlocked === true &&
      shop.form2Unlocked === true &&
      shop.selectedEchoForm === 2 &&
      shop.liveForm === 2 &&
      runtime.modeDefs.includes('battlefield') &&
      !runtime.modeDefs.includes('contract') &&
      !runtime.modeDefs.includes('blacktide') &&
      !runtime.modeDefs.includes('hormone') &&
      runtime.modeId === 'battlefield' &&
      runtime.enemyCount >= 40 &&
      runtime.allyCount === 6 &&
      runtime.operatorId === 'assault' &&
      runtime.rifleDamage >= 70 &&
      runtime.assault.duration >= 32 &&
      runtime.assault.speed >= 1.8 &&
      runtime.assault.damage >= 1.85 &&
      runtime.assault.damageTaken <= 0.62 &&
      runtime.assault.armorBonus >= 300 &&
      runtime.utility?.smokeRadius >= 8 &&
      runtime.utility?.impactSphereEnabled === false &&
      /first-person/i.test(runtime.replayVersion ?? '') &&
      runtime.actionFeedback === true &&
      errors.length === 0;

    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
