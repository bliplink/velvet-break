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

    await page.goto('http://127.0.0.1:5531/?v=combat-polish-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      state.raid.spawnSafeTimer = 0;
    });
    await page.waitForTimeout(600);

    const shot = await page.evaluate(() => {
      const player = state.raid.player;
      player.fireCooldown = 0;
      player.reloadTimer = 0;
      player.healTimer = 0;
      player.ammoInMag = Math.max(3, player.ammoInMag);
      const before = player.ammoInMag;
      const debugBefore = window.__sdrCombatPolishDebug.shotCount;
      attemptShoot();
      return {
        ammoBefore: before,
        ammoAfter: player.ammoInMag,
        shotCountDelta: window.__sdrCombatPolishDebug.shotCount - debugBefore,
        recoilKick: player.recoilKick ?? 0,
        bloomActive: document.getElementById('combatShotBloom')?.classList.contains('is-active') ?? false,
      };
    });

    const hit = await page.evaluate(() => {
      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      enemy.health = Math.max(500, enemy.health);
      const healthBefore = enemy.health;
      const hitsBefore = window.__sdrCombatPolishDebug.hitCount;
      damageEnemy(enemy, 35, { ignoreSmoke: true });
      const timerBeforeAnimate = enemy.hitReactTimer ?? 0;
      animateRaidEntities(0.04);
      return {
        damage: healthBefore - enemy.health,
        hitCountDelta: window.__sdrCombatPolishDebug.hitCount - hitsBefore,
        timerBeforeAnimate,
        reactRotation: Math.abs(enemy.visual?.root?.rotation?.z ?? 0),
        damageText: document.getElementById('combatDamageNumber')?.textContent ?? '',
        hitClass: document.getElementById('combatHitMarker')?.classList.contains('is-hit') ?? false,
      };
    });

    const kill = await page.evaluate(() => {
      const player = state.raid.player;
      const enemy = state.raid.enemies.find(e => !e.dead && !e.despawned);
      enemy.x = player.x;
      enemy.z = player.z + 22;
      enemy.health = 20;
      const killsBefore = window.__sdrCombatPolishDebug.killCount;
      damageEnemy(enemy, 1000, { ignoreSmoke: true });
      return {
        dead: enemy.dead,
        killCountDelta: window.__sdrCombatPolishDebug.killCount - killsBefore,
        lastKill: window.__sdrCombatPolishDebug.lastKill,
        bannerActive: document.getElementById('combatKillBanner')?.classList.contains('is-active') ?? false,
        bannerText: document.getElementById('combatKillBanner')?.textContent ?? '',
      };
    });

    const rareLoot = await page.evaluate(() => {
      const container = state.raid.containers.find(c => !c.id.startsWith('drop-'));
      container.opened = false;
      container.items = [{
        uid: 'qa-legendary',
        id: 'qa-legendary',
        name: 'QA Legendary Core',
        category: 'Tech',
        rarity: 'legendary',
        value: 25000,
        weight: 0.5,
      }];
      const before = window.__sdrCombatPolishDebug.rareFindCount;
      openLootPanel(container);
      return {
        delta: window.__sdrCombatPolishDebug.rareFindCount - before,
        last: window.__sdrCombatPolishDebug.lastRareFind,
        bannerActive: document.getElementById('combatLootBanner')?.classList.contains('is-active') ?? false,
        bannerText: document.getElementById('combatLootBanner')?.textContent ?? '',
        version: window.__sdrCombatPolishDebug.version,
      };
    });

    const echo = await page.evaluate(() => {
      if (state.overlay) closeLootPanel();
      const raid = state.raid;
      const player = raid.player;
      player.dropTimer = 0;
      player.executionLocked = false;
      player.utilityAction = null;
      player.useAction = null;
      player.echoKnifeCooldown = 0;
      player.onRoofBuildingId = null;
      player.insideBuildingId = null;

      let spot = null;
      for (let x = -96; x <= 96 && !spot; x += 16) {
        for (let z = -96; z <= 96 && !spot; z += 16) {
          const targetZ = z + 3.9;
          if (
            !pointInsideObstaclePadding(x, z, 1) &&
            !pointInsideObstaclePadding(x, targetZ, 0.8) &&
            !lineOfSightBlocked(x, z, x, targetZ)
          ) {
            spot = { x, z, targetZ };
          }
        }
      }
      if (!spot) throw new Error('No clear Echo melee QA position');

      const target = raid.enemies.find(enemy => !enemy.dead && !enemy.despawned);
      if (!target) throw new Error('No Echo melee QA target');
      for (const enemy of raid.enemies) {
        if (enemy !== target) enemy.despawned = true;
      }
      player.x = spot.x;
      player.z = spot.z;
      player.yaw = 0;
      target.x = spot.x;
      target.z = spot.targetZ;
      target.onRoofBuildingId = null;
      target.insideBuildingId = null;
      target.dead = false;
      target.despawned = false;
      target.health = Math.max(500, target.health ?? 0);
      target.maxHealth = Math.max(target.health, target.maxHealth ?? 0);
      target.echoRevealTimer = 0;

      window.__echoTargetId = target.id;
      const healthBefore = target.health;
      const swingsBefore = window.__sdrCombatPolishDebug.echoSwingCount;
      const hitsBefore = window.__sdrCombatPolishDebug.echoHitCount;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't' }));
      const actionStarted = Boolean(player.echoKnifeAction);
      animateRaidEntities(0.13);
      const echoVisual = player.echoKnifeAction?.visual;
      const techMeshes = echoVisual?.getChildMeshes?.() ?? [];
      return {
        actionStarted,
        damage: healthBefore - target.health,
        revealTimer: target.echoRevealTimer ?? 0,
        swingDelta: window.__sdrCombatPolishDebug.echoSwingCount - swingsBefore,
        hitDelta: window.__sdrCombatPolishDebug.echoHitCount - hitsBefore,
        debugTarget: window.__sdrCombatPolishDebug.lastEchoTarget,
        knifeMeshes: techMeshes.length,
        allTechBlue: techMeshes.length >= 12 && techMeshes.every(mesh => mesh.metadata?.techBlue === true),
        config: window.__sdrEchoKnifeConfig,
      };
    });

    await page.waitForTimeout(360);
    const echoMarker = await page.evaluate(() => {
      const marker = document.querySelector('.echo-exposure-marker');
      return {
        exists: Boolean(marker),
        hidden: marker?.hidden ?? true,
        text: marker?.textContent ?? '',
        statusRemoved: !document.getElementById('echoKnifeStatus'),
      };
    });

    const echoExpired = await page.evaluate(() => {
      const target = state.raid.enemies.find(enemy => enemy.id === window.__echoTargetId);
      for (let index = 0; index < 52; index++) animateRaidEntities(0.1);
      return {
        revealTimer: target?.echoRevealTimer ?? 0,
        actionEnded: !state.raid.player.echoKnifeAction,
      };
    });
    await page.waitForTimeout(120);
    echoExpired.markerRemoved = await page.evaluate(() => !document.querySelector('.echo-exposure-marker'));

    const echoInspect = await page.evaluate(() => {
      const player = state.raid.player;
      player.echoKnifeCooldown = 0;
      const before = window.__sdrCombatPolishDebug.echoInspectCount;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', key: 'h' }));
      const started = Boolean(player.echoKnifeInspect);
      const meshCount = player.echoKnifeInspect?.visual?.getChildMeshes?.().length ?? 0;
      animateRaidEntities(0.42);
      const rotationY = player.echoKnifeInspect?.visual?.rotation?.y ?? 0;
      for (let index = 0; index < 15; index++) animateRaidEntities(0.1);
      return {
        started,
        meshCount,
        rotationY,
        ended: !player.echoKnifeInspect,
        delta: window.__sdrCombatPolishDebug.echoInspectCount - before,
      };
    });

    const echoSmoke = await page.evaluate(() => {
      const player = state.raid.player;
      const target = state.raid.enemies.find(enemy => enemy.id === window.__echoTargetId);
      player.echoKnifeCooldown = 0;
      player.supportSmokeTimer = 7;
      player.supportSmokeX = player.x;
      player.supportSmokeZ = player.z;
      target.echoRevealTimer = 0;
      const healthBefore = target.health;
      const blockedBefore = window.__sdrCombatPolishDebug.echoSmokeBlockedCount;
      const attack = window.__sdrUseEchoKnife();
      const inspect = window.__sdrInspectEchoKnife();
      const result = {
        attack,
        inspect,
        healthDelta: healthBefore - target.health,
        revealTimer: target.echoRevealTimer ?? 0,
        blockedDelta: window.__sdrCombatPolishDebug.echoSmokeBlockedCount - blockedBefore,
        action: Boolean(player.echoKnifeAction),
        inspectAction: Boolean(player.echoKnifeInspect),
      };
      player.supportSmokeTimer = 0;
      player.supportSmokeX = null;
      player.supportSmokeZ = null;
      return result;
    });

    const poi = await page.evaluate(() => {
      const def = obstacleDefs.find(entry => entry.id === 'center-depot');
      const resolved = window.__sdrRaidDesignConfig?.resolvePoi(def.x, def.z);
      state.input.keys.clear();
      state.raid.player.structureAction = null;
      state.raid.player.mobilityAction = null;
      state.raid.player.x = def.x;
      state.raid.player.z = def.z;
      return {
        resolvedId: resolved?.id ?? null,
        nameZh: resolved?.zh ?? null,
        configPoiCount: window.__sdrRaidDesignConfig?.poiDefs?.length ?? 0,
        hasRareTargets: (window.__sdrRaidDesignConfig?.rarityTargets?.highRisk?.length ?? 0) >= 2,
      };
    });

    await page.waitForFunction(() => window.__sdrCombatPolishDebug?.currentPoi === 'center-depot', null, { timeout: 2500 });
    const poiHud = await page.evaluate(() => ({
      text: document.getElementById('combatPoiLabel')?.textContent ?? '',
      visible: document.getElementById('combatPoiLabel')?.classList.contains('is-visible') ?? false,
      debugPoi: window.__sdrCombatPolishDebug?.currentPoi ?? null,
    }));

    const extractionHud = await page.evaluate(() => {
      const raid = state.raid;
      const zone = raid.extractions.find(z => z.active !== false) ?? raid.extractions[0];
      raid.player.x = zone.x + Math.min(8, Math.max(2, zone.radius + 1));
      raid.player.z = zone.z;
      return { zoneKind: zone.kind, zoneId: zone.id };
    });
    await page.waitForTimeout(900);
    const extractionHudAfter = await page.evaluate(() => ({
      text: document.getElementById('combatExtractLabel')?.textContent ?? '',
      visible: document.getElementById('combatExtractLabel')?.classList.contains('is-visible') ?? false,
    }));

    console.log(JSON.stringify({ shot, hit, kill, rareLoot, echo, echoMarker, echoExpired, echoInspect, echoSmoke, poi, poiHud, extractionHud, extractionHudAfter, errors }, null, 2));

    const ok = Boolean(
      shot.ammoAfter === shot.ammoBefore - 1 &&
      shot.shotCountDelta === 1 &&
      shot.recoilKick > 0 &&
      shot.bloomActive &&
      hit.damage > 0 &&
      hit.hitCountDelta === 1 &&
      hit.timerBeforeAnimate > 0 &&
      hit.reactRotation > 0 &&
      /^-\d+/.test(hit.damageText) &&
      hit.hitClass &&
      kill.dead &&
      kill.killCountDelta === 1 &&
      kill.lastKill?.distance >= 20 &&
      kill.lastKill?.weapon &&
      kill.bannerActive &&
      rareLoot.delta === 1 &&
      rareLoot.last?.rarity === 'legendary' &&
      rareLoot.bannerActive &&
      /QA Legendary Core/.test(rareLoot.bannerText) &&
      rareLoot.version === '2026-09-19-combat-polish-v4' &&
      echo.actionStarted &&
      echo.damage >= 199 && echo.damage <= 201 &&
      echo.revealTimer >= 4.99 && echo.revealTimer <= 5.01 &&
      echo.swingDelta === 1 &&
      echo.hitDelta === 1 &&
      echo.debugTarget?.reveal === 5 &&
      echo.knifeMeshes >= 12 &&
      echo.allTechBlue &&
      echo.config?.range === 4 &&
      echo.config?.damage === 200 &&
      echo.config?.cooldown === 0.5 &&
      echo.config?.revealDuration === 5 &&
      echoMarker.exists &&
      echoMarker.text.trim().length > 0 &&
      /\d+(?:\.\d+)?s/.test(echoMarker.text) &&
      echoMarker.statusRemoved &&
      echoExpired.revealTimer === 0 &&
      echoExpired.actionEnded &&
      echoExpired.markerRemoved &&
      echoInspect.started &&
      echoInspect.meshCount >= 12 &&
      Math.abs(echoInspect.rotationY) > 0.2 &&
      echoInspect.ended &&
      echoInspect.delta === 1 &&
      echoSmoke.attack === false &&
      echoSmoke.inspect === false &&
      echoSmoke.healthDelta === 0 &&
      echoSmoke.revealTimer === 0 &&
      echoSmoke.blockedDelta === 2 &&
      !echoSmoke.action &&
      !echoSmoke.inspectAction &&
      poi.resolvedId === 'center-depot' &&
      poi.configPoiCount >= 6 &&
      poi.hasRareTargets &&
      poiHud.visible &&
      poiHud.debugPoi === 'center-depot' &&
      /风险|RISK/.test(poiHud.text) &&
      extractionHudAfter.visible &&
      extractionHudAfter.text.length > 0 &&
      /撤离|EXIT/.test(extractionHudAfter.text) &&
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