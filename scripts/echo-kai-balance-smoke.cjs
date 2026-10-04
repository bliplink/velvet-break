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

    await page.goto('http://127.0.0.1:5531/?v=echo-kai-smoke', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      state.save.money = 500000;
      state.save.echoUnlocked = false;
      state.save.echoForm2Unlocked = false;
      state.save.selectedEchoForm = 1;
      state.save.selectedOperatorId = 'assault';
      persistSave();

      const form2Before = getShopEntries().find(e => e.id === 'echo_form2_unlock');
      const boughtEcho = buyShopEntry('echo_unlock');
      const form2Ready = getShopEntries().find(e => e.id === 'echo_form2_unlock');
      const boughtForm2 = buyShopEntry('echo_form2_unlock');

      startRaid();
      const raid = state.raid;
      const player = raid.player;
      player.dropTimer = 0;
      player.health = 5000;
      player.maxHealth = 5000;
      player.armor = 0;
      player.maxArmor = 0;

      const echoStarted = window.__sdrUseEchoKnife();
      const echoAction = player.echoKnifeAction;
      const echoMeshNames = echoAction?.visual?.getChildMeshes?.().map(m => m.name) ?? [];
      const phaseModel = echoAction?.form === 2 &&
        echoMeshNames.some(n => n === 'echo-phase-spine') &&
        echoMeshNames.some(n => n.includes('echo-phase-guard-fin-'));

      // Let Echo animation finish before testing Kai utility.
      for (let i = 0; i < 12; i++) updateRaid(0.05);

      const enemy = raid.enemies.find(e => !e.dead && !e.isNamelessBoss && !e.isNamelessMinion);
      for (const other of raid.enemies) {
        other.speed = 0;
        other.detectRange = 0;
        other.alertTimer = 0;
      }
      enemy.dead = false;
      enemy.health = 3000;
      enemy.maxHealth = 3000;
      enemy.damageReduction = enemy.type === 'bruiser' ? 0.18 : 0;
      enemy.x = player.x + 10;
      enemy.z = player.z;

      const beforeEnemyHealth = enemy.health;
      player.utilityItems = Math.max(1, player.utilityItems ?? 1);
      player.grenadeTargeting = { distance: 10, x: enemy.x, z: enemy.z };
      const utilityBefore = player.utilityItems;
      window.useOperatorUtility();
      for (let i = 0; i < 30; i++) updateRaid(0.05);
      const grenadeDamage = beforeEnemyHealth - enemy.health;
      const expected = enemy.type === 'bruiser' ? 420 : enemy.type === 'hunter' ? 450 : 480;

      const guardTimer = player.kaiUtilityGuardTimer ?? 0;
      const hpBeforeGuardHit = player.health;
      applyDamageToPlayer(100);
      const guardedDamage = hpBeforeGuardHit - player.health;

      const kaiDef = getPlayerOperatorDef(player);

      return {
        form2BeforeDisabled: Boolean(form2Before?.disabled),
        boughtEcho,
        form2ReadyDisabled: Boolean(form2Ready?.disabled),
        boughtForm2,
        echoForm2Unlocked: state.save.echoForm2Unlocked,
        selectedEchoForm: state.save.selectedEchoForm,
        echoConfigForm: window.__sdrEchoKnifeConfig?.form,
        echoStarted,
        phaseModel,
        grenadeEnemyType: enemy.type,
        grenadeDamage,
        expectedGrenadeDamage: expected,
        utilitySpent: utilityBefore - (player.utilityItems ?? 0),
        guardTimer,
        guardedDamage,
        kaiAbilityDuration: kaiDef.abilityDuration,
        kaiDamageBoost: kaiDef.damageBoostMult,
        kaiDamageTakenMult: kaiDef.abilityDamageTakenMult,
        kaiKillHeal: kaiDef.killHeal,
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    if (
      !result.form2BeforeDisabled ||
      !result.boughtEcho ||
      result.form2ReadyDisabled ||
      !result.boughtForm2 ||
      !result.echoForm2Unlocked ||
      result.selectedEchoForm !== 2 ||
      result.echoConfigForm !== 2 ||
      !result.echoStarted ||
      !result.phaseModel ||
      Math.abs(result.grenadeDamage - result.expectedGrenadeDamage) > 2 ||
      result.utilitySpent < 1 ||
      result.guardTimer <= 4 ||
      result.guardedDamage > 62 ||
      result.kaiAbilityDuration < 32 ||
      result.kaiDamageBoost < 1.85 ||
      result.kaiDamageTakenMult > 0.62 ||
      result.kaiKillHeal < 90 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
