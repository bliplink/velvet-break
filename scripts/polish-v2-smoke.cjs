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

    await page.goto('http://127.0.0.1:5531/?v=polish-v2-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      const c = state.raid.companion;
      c.x = state.raid.player.x + 1.2;
      c.z = state.raid.player.z;
      c.downed = true;
      c.dead = false;
      c.despawned = false;
      c.health = 1;
      c.reviveProgress = 0;
    });

    await page.keyboard.down('e');
    await page.evaluate(() => {
      for (let i = 0; i < 55; i++) updateRaid(0.1);
    });
    await page.keyboard.up('e');

    const firstRescue = await page.evaluate(() => ({
      downed: state.raid.companion.downed,
      health: state.raid.companion.health,
      reviveCount: state.raid.companion.reviveCount ?? 0,
      interactHeld: state.input.interactHeld,
    }));

    const balance = await page.evaluate(() => {
      startRaid();
      const player = state.raid.player;
      player.operatorId = 'medic';
      player.health = Math.max(1, player.maxHealth - 600);
      player.skillUses = 4;
      const before = player.health;
      useOperatorAbility();
      const immediate = {
        healed: player.health - before,
        immunity: player.damageImmunityTimer,
      };

      player.damageImmunityTimer = 0;
      updateRaid(0.05);
      const postTimer = player.supportFirepowerTimer;
      const postReductionMult = player.damageReductionMult;

      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      enemy.maxHealth = 10000;
      enemy.health = 10000;
      player.__supportShot = true;
      player.supportFirepowerTimer = 15;
      const enemyBefore = enemy.health;
      damageEnemy(enemy, 100, { ignoreSmoke: true });
      player.__supportShot = false;

      return {
        ...immediate,
        postTimer,
        postReductionMult,
        boostedDamage: enemyBefore - enemy.health,
        name: getOperatorDefs().medic.nameEn,
        description: getOperatorDefs().medic.skillTextEn,
        stability: window.__sdrStabilityV4Debug ?? null,
      };
    });

    const kai = await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      const player = state.raid.player;
      player.operatorId = 'assault';
      player.skillUses = 4;
      player.health = Math.max(1, player.maxHealth - 200);
      const def = getOperatorDefs().assault;
      const healthBefore = player.health;
      useOperatorAbility();
      const startTimer = player.abilityActiveTimer;
      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      killEnemy(enemy);
      return {
        abilityDuration: def.abilityDuration,
        startTimer,
        afterKillTimer: player.abilityActiveTimer,
        healOnKill: player.health - healthBefore,
        killExtendSeconds: def.killExtendSeconds,
        killHeal: def.killHeal,
        spreadMult: def.spreadMult,
        recoilMult: def.recoilMult,
        reloadMult: def.reloadMult,
        startArmorBonus: def.startArmorBonus,
      };
    });

    await page.evaluate(() => {
      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      enemy.revealedTimer = 10;
      for (const mesh of enemy.visual?.revealMeshes ?? []) mesh.setEnabled(true);
      for (const mesh of enemy.visual?.overlayMeshes ?? []) {
        mesh.renderOverlay = true;
        mesh.overlayAlpha = 1;
      }
      enemy.visual?.classLabel?.setEnabled?.(true);
      if (enemy.visual?.classLabelMaterial) enemy.visual.classLabelMaterial.alpha = 1;
    });
    await page.waitForTimeout(400);

    const visual = await page.evaluate(() => {
      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      return {
        xray: {
          revealEnabled: (enemy.visual?.revealMeshes ?? []).filter(m => m?.isEnabled?.()).length,
          overlayEnabled: (enemy.visual?.overlayMeshes ?? []).filter(m => m?.renderOverlay || (m?.overlayAlpha ?? 0) > 0).length,
          labelEnabled: enemy.visual?.classLabel?.isEnabled?.() ?? false,
          labelAlpha: enemy.visual?.classLabelMaterial?.alpha ?? 0,
        },
        canister: {
          humanDebug: window.__sdrHumanModelV2Debug ?? null,
          humanPartCount: enemy.visual?.humanV2Meshes?.length ?? 0,
          oldBodyVisible: enemy.visual?.body?.isVisible ?? false,
          oldChestVisible: enemy.visual?.chestRig?.isVisible ?? false,
          roundedParts: scene.meshes.filter(m => String(m.name).startsWith('human-v2-')).length,
          humanDetailParts: enemy.visual?.humanDetailMeshes?.length ?? 0,
          rollbackDebug: window.__sdrVisualOverhaulDebug ?? null,
        },
      };
    });

    console.log(JSON.stringify({ firstRescue, balance, kai, visual, errors }, null, 2));

    const ok = Boolean(
      !firstRescue.downed &&
      firstRescue.health > 1 &&
      firstRescue.reviveCount >= 1 &&
      balance.name === 'Benjamin' &&
      balance.healed >= 499 && balance.healed <= 501 &&
      balance.immunity >= 4.99 && balance.immunity <= 5.01 &&
      balance.postTimer <= 15.1 && balance.postTimer > 14.5 &&
      balance.postReductionMult === 0.5 &&
      balance.boostedDamage >= 199 && balance.boostedDamage <= 201 &&
      balance.description.includes('double bullet damage') &&
      kai.abilityDuration === 35 &&
      kai.startTimer >= 34.9 && kai.startTimer <= 35.1 &&
      kai.afterKillTimer >= 36.4 && kai.afterKillTimer <= 36.6 &&
      kai.healOnKill >= 89 && kai.healOnKill <= 91 &&
      kai.killExtendSeconds === 1.5 &&
      kai.killHeal === 90 &&
      kai.spreadMult === 0.70 &&
      kai.recoilMult === 0.72 &&
      kai.reloadMult === 0.72 &&
      kai.startArmorBonus === 18 &&
      balance.stability?.version === '2026-09-20-stability-v4' &&
      balance.stability?.rescueInputRecoveries >= 1 &&
      visual.xray.revealEnabled === 0 &&
      visual.xray.overlayEnabled === 0 &&
      (!visual.xray.labelEnabled || visual.xray.labelAlpha === 0) &&
      visual.canister.humanDebug == null &&
      visual.canister.humanPartCount === 0 &&
      visual.canister.oldBodyVisible &&
      visual.canister.oldChestVisible &&
      visual.canister.roundedParts === 0 &&
      visual.canister.humanDetailParts === 0 &&
      visual.canister.rollbackDebug?.legacyCanisterModel &&
      errors.length === 0
    );

    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
