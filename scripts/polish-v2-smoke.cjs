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
      player.armor = 0;
      player.skillUses = 4;
      const before = player.health;
      const maxArmor = player.maxArmor;
      useOperatorAbility();
      const immediate = {
        healed: player.health - before,
        armorRestored: player.armor,
        maxArmor,
        immunity: player.damageImmunityTimer,
        speedBoost: player.medicSpeedBoostTimer,
        activeTimer: player.abilityActiveTimer,
      };

      player.damageImmunityTimer = 0;
      updateRaid(0.05);
      const postTimer = player.supportFirepowerTimer;
      const postReductionMult = player.damageReductionMult;

      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      enemy.maxHealth = 10000;
      enemy.health = 10000;
      player.__supportShot = true;
      player.supportFirepowerTimer = 25;
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
      state.save.prep.armorBonus = 0;
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
      const healOnKill = player.health - healthBefore;
      const startingArmor = player.maxArmor;
      const armorBeforeHit = player.armor;
      player.health = player.maxHealth;
      applyDamageToPlayer(100);
      const armorAfterHit = player.armor;
      return {
        abilityDuration: def.abilityDuration,
        startTimer,
        afterKillTimer: player.abilityActiveTimer,
        healOnKill,
        killExtendSeconds: def.killExtendSeconds,
        killHeal: def.killHeal,
        spreadMult: def.spreadMult,
        recoilMult: def.recoilMult,
        reloadMult: def.reloadMult,
        startArmorBonus: def.startArmorBonus,
        armorDurabilityCostMult: def.armorDurabilityCostMult,
        startingArmor,
        armorBeforeHit,
        armorAfterHit,
        armorLoss: armorBeforeHit - armorAfterHit,
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

    const stun = await page.evaluate(() => {
      state.save.engineerUnlocked = true;
      state.save.selectedOperatorId = 'engineer';
      startRaid();
      const raid = state.raid;
      const player = raid.player;
      player.operatorId = 'engineer';
      player.stunGrenadeItems = 1;

      let target = null;
      for (let step = 0; step < 12 && !target; step++) {
        const angle = (Math.PI * 2 * step) / 12;
        const rawX = player.x + Math.cos(angle) * 4;
        const rawZ = player.z + Math.sin(angle) * 4;
        const placed = resolveStaticPlacement(rawX, rawZ, 0.7);
        if (!lineOfSightBlocked(player.x, player.z, placed.x, placed.z) && !pointInsideObstaclePadding(placed.x, placed.z, 0.7)) {
          target = { x: placed.x, y: 0, z: placed.z };
        }
      }
      if (!target) target = { x: player.x + 2, y: 0, z: player.z };

      const enemy = raid.enemies.find(e => !e.dead && !e.despawned);
      enemy.x = target.x;
      enemy.z = target.z;
      enemy.health = Math.max(enemy.health, 10000);
      enemy.maxHealth = Math.max(enemy.maxHealth, 10000);

      raid.mouseWorldPointer = { clientX: 640, clientY: 400 };
      const originalPick = scene.pick.bind(scene);
      scene.pick = () => ({
        hit: true,
        pickedPoint: new BABYLON.Vector3(target.x, target.y, target.z),
        pickedMesh: { name: 'ground' },
      });

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO' }));
      const targetingStarted = Boolean(raid.stunGrenadeTargeting);
      const markerName = raid.stunGrenadeTargeting?.marker?.name ?? '';
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO' }));
      const itemAfterThrow = player.stunGrenadeItems;
      const throwStarted = Boolean(player.stunGrenadeThrow);

      for (let i = 0; i < 80 && !(enemy.engineerSlowTimer > 0); i++) {
        enemy.x = target.x;
        enemy.z = target.z;
        updateRaid(0.05);
      }
      const slowTimer = enemy.engineerSlowTimer ?? 0;
      const hudText = document.getElementById('stunGrenadePanel')?.textContent ?? '';
      scene.pick = originalPick;

      return {
        targetingStarted,
        markerName,
        itemAfterThrow,
        throwStarted,
        slowTimer,
        targetingEnded: !raid.stunGrenadeTargeting,
        throwEnded: !player.stunGrenadeThrow,
        hudText,
      };
    });

    console.log(JSON.stringify({ firstRescue, balance, kai, visual, stun, errors }, null, 2));

    const ok = Boolean(
      !firstRescue.downed &&
      firstRescue.health > 1 &&
      firstRescue.reviveCount >= 1 &&
      balance.name === 'Benjamin' &&
      balance.healed >= 599 && balance.healed <= 601 &&
      balance.armorRestored === balance.maxArmor &&
      balance.immunity >= 7.99 && balance.immunity <= 8.01 &&
      balance.speedBoost >= 32.9 && balance.speedBoost <= 33.1 &&
      balance.activeTimer >= 32.9 && balance.activeTimer <= 33.1 &&
      balance.postTimer <= 25.1 && balance.postTimer > 24.5 &&
      balance.postReductionMult === 0.3 &&
      balance.boostedDamage >= 249 && balance.boostedDamage <= 251 &&
      balance.description.includes('2.5x bullet damage') &&
      kai.abilityDuration === 35 &&
      kai.startTimer >= 34.9 && kai.startTimer <= 35.1 &&
      kai.afterKillTimer >= 36.4 && kai.afterKillTimer <= 36.6 &&
      kai.healOnKill >= 89 && kai.healOnKill <= 91 &&
      kai.killExtendSeconds === 1.5 &&
      kai.killHeal === 90 &&
      kai.spreadMult === 0.70 &&
      kai.recoilMult === 0.72 &&
      kai.reloadMult === 0.72 &&
      kai.startArmorBonus === 170 &&
      kai.armorDurabilityCostMult === 0.5 &&
      kai.startingArmor === 200 &&
      kai.armorBeforeHit === 200 &&
      kai.armorAfterHit >= 167.49 && kai.armorAfterHit <= 167.51 &&
      kai.armorLoss >= 32.49 && kai.armorLoss <= 32.51 &&
      stun.targetingStarted &&
      stun.markerName === 'stun-grenade-target-radius' &&
      stun.itemAfterThrow === 0 &&
      stun.throwStarted &&
      stun.slowTimer > 8.5 && stun.slowTimer <= 10 &&
      stun.targetingEnded &&
      stun.throwEnded &&
      /震撼弹|Stun Grenade/.test(stun.hudText) &&
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
