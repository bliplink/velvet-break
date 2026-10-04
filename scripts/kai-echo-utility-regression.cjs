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

    await page.goto('http://127.0.0.1:5531/?v=kai-echo-utility-regression', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      state.save.money = 600000;
      state.save.echoUnlocked = false;
      state.save.echoForm2Unlocked = false;
      state.save.selectedEchoForm = 1;

      const echoBought = buyShopEntry('echo_unlock') === true;
      const form2Bought = buyShopEntry('echo_form2_unlock') === true;
      const echoState = {
        echoUnlocked: Boolean(state.save.echoUnlocked),
        echoForm2Unlocked: Boolean(state.save.echoForm2Unlocked),
        selectedEchoForm: Number(state.save.selectedEchoForm),
      };

      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'raid';
      startRaid();
      state.raid.player.dropTimer = 0;

      const player = state.raid.player;
      const op = getPlayerOperatorDef(player);
      const kai = {
        abilityDuration: op.abilityDuration,
        speedBoostMult: op.speedBoostMult,
        damageBoostMult: op.damageBoostMult,
        abilityDamageTakenMult: op.abilityDamageTakenMult,
        ultimateArmorBonus: op.ultimateArmorBonus,
        killHeal: op.killHeal,
        baseDamageMult: op.baseDamageMult,
        abilitySpreadMult: op.abilitySpreadMult,
        abilityRecoilMult: op.abilityRecoilMult,
        abilityReloadMult: op.abilityReloadMult,
      };

      const grenade = { ...(window.__sdrKaiUtilityConfig || {}) };

      const enemy = state.raid.enemies.find(e => !e.dead && !e.isNamelessBoss && !e.isNamelessMinion && !e.isRangeTarget);
      let utilityDamage = null;
      if (enemy) {
        enemy.damageReduction = 0;
        enemy.health = Math.max(200, enemy.maxHealth || 200);
        enemy.maxHealth = enemy.health;
        const before = enemy.health;
        damageEnemy(enemy, 100, { utilityKind: 'qa-utility', ignoreSmoke: true });
        utilityDamage = {
          type: enemy.type,
          before,
          after: enemy.health,
          dealt: before - enemy.health,
        };
      }

      const beforeArmorMax = player.maxArmor || 0;
      const beforeUses = player.skillUses ?? player.abilityCharges ?? 0;
      useOperatorAbility();
      const afterUses = player.skillUses ?? player.abilityCharges ?? beforeUses;
      const startup = {
        activeTimer: player.abilityActiveTimer || 0,
        ultimateStartupTimer: player.ultimateStartupTimer || 0,
        armorMaxGain: (player.maxArmor || 0) - beforeArmorMax,
        used: afterUses < beforeUses || (player.abilityActiveTimer || 0) > 0,
        framePresent: Boolean(document.getElementById('finalUltimateFrame')),
        burstStarting: Boolean(document.getElementById('finalUltimateBurst')?.classList.contains('is-starting')),
      };

      return {
        echoBought,
        form2Bought,
        echoState,
        kai,
        grenade,
        utilityDamage,
        startup,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));

    const r = result;
    const kaiOk =
      r.kai.abilityDuration >= 36 &&
      r.kai.speedBoostMult >= 2.35 &&
      r.kai.damageBoostMult >= 2.5 &&
      r.kai.abilityDamageTakenMult <= 0.45 &&
      r.kai.ultimateArmorBonus >= 650 &&
      r.kai.killHeal >= 130 &&
      r.kai.baseDamageMult >= 1.30 &&
      r.kai.abilitySpreadMult <= 0.50 &&
      r.kai.abilityRecoilMult <= 0.50 &&
      r.kai.abilityReloadMult <= 0.50;

    const grenadeOk =
      r.grenade.grenadeDamage === 600 &&
      r.grenade.grenadeRadius >= 26 &&
      r.grenade.guardDuration >= 8 &&
      r.grenade.guardDamageTakenMult <= 0.60;

    const echoOk =
      r.echoBought &&
      r.form2Bought &&
      r.echoState.echoUnlocked &&
      r.echoState.echoForm2Unlocked &&
      r.echoState.selectedEchoForm === 2;

    const utilityResistanceOk =
      r.utilityDamage &&
      r.utilityDamage.dealt > 0 &&
      r.utilityDamage.dealt < 100;

    const startupOk =
      r.startup.used &&
      r.startup.activeTimer > 0 &&
      r.startup.ultimateStartupTimer > 0 &&
      r.startup.armorMaxGain >= 650 &&
      r.startup.framePresent &&
      r.startup.burstStarting;

    if (!kaiOk || !grenadeOk || !echoOk || !utilityResistanceOk || !startupOk || errors.length) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
