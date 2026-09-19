(() => {
  if (window.__sdrCombatPolishWaiting || window.__sdrCombatPolishApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof attemptShoot === 'undefined' ||
      typeof damageEnemy === 'undefined' ||
      typeof killEnemy === 'undefined' ||
      typeof animateRaidEntities === 'undefined' ||
      typeof getCurrentPlayerWeaponStats === 'undefined'
    ) {
      window.__sdrCombatPolishWaiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrCombatPolishWaiting = false;
    if (window.__sdrCombatPolishApplied) return;
    window.__sdrCombatPolishApplied = true;

    const debug = {
      version: '2026-09-19-combat-polish-v2',
      shotCount: 0,
      hitCount: 0,
      killCount: 0,
      lastDamage: 0,
      lastKill: null,
      currentPoi: null,
      rareFindCount: 0,
      lastRareFind: null,
    };
    window.__sdrCombatPolishDebug = debug;

    const style = document.createElement('style');
    style.textContent = `
      #combatPolishHud{position:fixed;inset:0;z-index:23;pointer-events:none;font-family:inherit}
      #combatHitMarker{position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%);opacity:0}
      #combatHitMarker i{position:absolute;left:50%;top:50%;width:10px;height:2px;background:#eefbfb;box-shadow:0 0 7px rgba(255,255,255,.35);transform-origin:center}
      #combatHitMarker i:nth-child(1){transform:translate(-18px,-10px) rotate(45deg)}
      #combatHitMarker i:nth-child(2){transform:translate(8px,-10px) rotate(-45deg)}
      #combatHitMarker i:nth-child(3){transform:translate(-18px,8px) rotate(-45deg)}
      #combatHitMarker i:nth-child(4){transform:translate(8px,8px) rotate(45deg)}
      #combatHitMarker.is-hit{animation:combat-hit .14s ease-out}
      #combatHitMarker.is-kill i{background:#ff8f79;box-shadow:0 0 9px rgba(255,91,70,.55)}
      @keyframes combat-hit{0%{opacity:0;transform:translate(-50%,-50%) scale(1.32)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.86)}}
      #combatDamageNumber{position:absolute;left:50%;top:calc(50% + 38px);transform:translateX(-50%);font-size:.8rem;font-weight:800;color:#eefbfb;text-shadow:0 2px 8px #000;opacity:0}
      #combatDamageNumber.is-active{animation:combat-damage .48s ease-out}
      @keyframes combat-damage{0%{opacity:0;transform:translate(-50%,8px) scale(.88)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-18px) scale(1)}}
      #combatKillBanner{position:absolute;left:50%;top:24%;min-width:230px;transform:translate(-50%,-12px);padding:8px 14px;border-left:3px solid #ff7867;background:linear-gradient(90deg,rgba(7,12,15,.84),rgba(7,12,15,.18));backdrop-filter:blur(8px);opacity:0;color:#f4fbfb}
      #combatKillBanner strong{display:block;font-size:.78rem;letter-spacing:.13em}
      #combatKillBanner span{display:block;margin-top:3px;font-size:.68rem;color:#c7d5d6}
      #combatKillBanner.is-active{animation:combat-kill 1.55s ease both}
      @keyframes combat-kill{0%{opacity:0;transform:translate(-50%,-18px)}12%{opacity:1;transform:translate(-50%,0)}76%{opacity:1}100%{opacity:0;transform:translate(-50%,8px)}}
      #combatPoiLabel{position:absolute;left:50%;top:68px;transform:translateX(-50%);padding:5px 11px;border-radius:3px;background:rgba(4,9,12,.48);backdrop-filter:blur(6px);color:rgba(224,238,238,.78);font-size:.68rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:0;transition:opacity .18s ease}
      #combatPoiLabel.is-visible{opacity:1}
      #combatShotBloom{position:absolute;left:50%;top:50%;width:16px;height:16px;border:1px solid rgba(220,242,242,.32);border-radius:50%;transform:translate(-50%,-50%);opacity:0}
      #combatShotBloom.is-active{animation:combat-bloom .13s ease-out}
      @keyframes combat-bloom{0%{opacity:.8;transform:translate(-50%,-50%) scale(.65)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.4)}}
      #combatLootBanner{position:absolute;left:50%;top:31%;min-width:250px;transform:translate(-50%,-10px);padding:9px 15px;border:1px solid rgba(255,211,119,.34);border-left:3px solid #ffd16f;background:linear-gradient(90deg,rgba(25,17,7,.88),rgba(17,12,6,.25));backdrop-filter:blur(8px);opacity:0;color:#fff3d0}
      #combatLootBanner strong{display:block;font-size:.76rem;letter-spacing:.12em}
      #combatLootBanner span{display:block;margin-top:3px;font-size:.68rem;color:#ead7a9}
      #combatLootBanner.is-active{animation:combat-loot 2.15s ease both}
      @keyframes combat-loot{0%{opacity:0;transform:translate(-50%,-16px) scale(.95)}10%{opacity:1;transform:translate(-50%,0) scale(1.02)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,10px) scale(1)}}
    `;
    document.head.appendChild(style);

    const hud = document.createElement('div');
    hud.id = 'combatPolishHud';
    hud.innerHTML = `
      <div id="combatHitMarker"><i></i><i></i><i></i><i></i></div>
      <div id="combatDamageNumber"></div>
      <div id="combatKillBanner"><strong></strong><span></span></div>
      <div id="combatPoiLabel"></div>
      <div id="combatShotBloom"></div>
      <div id="combatLootBanner"><strong></strong><span></span></div>
    `;
    document.body.appendChild(hud);

    const hitMarker = hud.querySelector('#combatHitMarker');
    const damageNumber = hud.querySelector('#combatDamageNumber');
    const killBanner = hud.querySelector('#combatKillBanner');
    const killTitle = killBanner.querySelector('strong');
    const killDetail = killBanner.querySelector('span');
    const poiLabel = hud.querySelector('#combatPoiLabel');
    const shotBloom = hud.querySelector('#combatShotBloom');
    const lootBanner = hud.querySelector('#combatLootBanner');
    const lootTitle = lootBanner.querySelector('strong');
    const lootDetail = lootBanner.querySelector('span');

    const retrigger = (el, ...classes) => {
      el.classList.remove(...classes);
      void el.offsetWidth;
      el.classList.add(...classes);
    };

    const weaponLabel = (player) => {
      try {
        const weapon = getCurrentPlayerWeaponStats(player);
        return weapon?.name ?? weapon?.id ?? player?.weapon ?? L('当前武器', 'Current weapon');
      } catch {
        return player?.weapon ?? L('当前武器', 'Current weapon');
      }
    };

    const enemyLabel = (enemy) => {
      if (enemy?.isNamelessBoss) return L('无名', 'Nameless');
      if (enemy?.type === 'bruiser') return L('重装兵', 'Heavy');
      if (enemy?.type === 'hunter') return L('猎手', 'Hunter');
      return enemy?.name ?? L('敌人', 'Hostile');
    };

    const weaponPunch = (weapon) => {
      const id = String(weapon?.id ?? '');
      if ((weapon?.pellets ?? 1) > 1 || id.includes('shotgun')) return { kick: 0.22, yaw: 0.0032 };
      if (id.includes('dmr') || id.includes('battle')) return { kick: 0.16, yaw: 0.0022 };
      if (id.includes('smg') || id.includes('pdw')) return { kick: 0.055, yaw: 0.0014 };
      return { kick: 0.1, yaw: 0.0018 };
    };

    const attemptShootBeforePolish = attemptShoot;
    attemptShoot = function polishedAttemptShoot(...args) {
      const player = state.raid?.player;
      const beforeAmmo = player?.ammoInMag ?? 0;
      const result = attemptShootBeforePolish.apply(this, args);
      if (!player || player.ammoInMag >= beforeAmmo) return result;

      debug.shotCount += 1;
      const weapon = getCurrentPlayerWeaponStats(player);
      const punch = weaponPunch(weapon);
      player.recoilKick = Math.min(1.45, (player.recoilKick ?? 0) + punch.kick);
      player.yaw += (Math.random() * 2 - 1) * punch.yaw;
      if (typeof viewModel !== 'undefined' && viewModel) {
        viewModel.recoil = Math.min(1.5, (viewModel.recoil ?? 0) + punch.kick * 1.3);
      }
      retrigger(shotBloom, 'is-active');
      return result;
    };

    const damageBeforePolish = damageEnemy;
    damageEnemy = function polishedDamageEnemy(enemy, amount, options = {}) {
      const healthBefore = enemy?.health ?? 0;
      const result = damageBeforePolish(enemy, amount, options);
      if (!enemy || healthBefore <= 0) return result;

      const dealt = Math.max(0, healthBefore - Math.max(0, enemy.health ?? 0));
      if (dealt <= 0) return result;

      debug.hitCount += 1;
      debug.lastDamage = dealt;
      enemy.hitReactTimer = 0.18;
      enemy.hitReactStrength = Math.min(1.35, 0.45 + dealt / 75);
      enemy.hitReactSide = Math.random() < 0.5 ? -1 : 1;

      damageNumber.textContent = `-${Math.round(dealt)}`;
      retrigger(damageNumber, 'is-active');
      retrigger(hitMarker, 'is-hit', ...(enemy.health <= 0 ? ['is-kill'] : []));
      window.setTimeout(() => hitMarker.classList.remove('is-kill'), 180);
      return result;
    };

    const killBeforePolish = killEnemy;
    killEnemy = function polishedKillEnemy(enemy, ...args) {
      const wasAlive = enemy && !enemy.dead;
      const player = state.raid?.player;
      const distance = player && enemy ? Math.hypot(enemy.x - player.x, enemy.z - player.z) : null;
      const result = killBeforePolish(enemy, ...args);
      if (!wasAlive || !enemy?.dead) return result;

      debug.killCount += 1;
      debug.lastKill = {
        enemyId: enemy.id,
        distance: distance == null ? null : Math.round(distance),
        weapon: weaponLabel(player),
      };

      killTitle.textContent = L('目标击倒', 'TARGET DOWN');
      killDetail.textContent = [
        enemyLabel(enemy),
        distance == null ? null : `${Math.round(distance)}m`,
        weaponLabel(player),
      ].filter(Boolean).join(' · ');
      retrigger(killBanner, 'is-active');
      return result;
    };

    const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, red: 5 };
    const rareLootBeforePolish = typeof openLootPanel === 'function' ? openLootPanel : null;
    if (rareLootBeforePolish) {
      openLootPanel = function polishedRareLootOpen(container, ...args) {
        const firstOpen = Boolean(container && !container.opened);
        const result = rareLootBeforePolish(container, ...args);
        if (!firstOpen || !container?.items?.length) return result;

        const best = container.items
          .slice()
          .sort((a, b) => (rarityRank[b?.rarity] ?? 0) - (rarityRank[a?.rarity] ?? 0))[0];
        const rank = rarityRank[best?.rarity] ?? 0;
        if (rank < 3) return result;

        debug.rareFindCount += 1;
        debug.lastRareFind = {
          itemId: best.id,
          rarity: best.rarity,
          value: best.value,
          containerId: container.id,
        };

        const tierName = best.rarity === 'red'
          ? L('红色战利品', 'RED-TIER LOOT')
          : best.rarity === 'legendary'
            ? L('传奇战利品', 'LEGENDARY LOOT')
            : L('史诗战利品', 'EPIC LOOT');
        lootTitle.textContent = tierName;
        const valueText = typeof formatMoney === 'function' ? formatMoney(best.value ?? 0) : String(best.value ?? '');
        const itemName = typeof getItemLabel === 'function' ? getItemLabel(best) : best.name;
        lootDetail.textContent = [itemName, valueText].filter(Boolean).join(' · ');
        retrigger(lootBanner, 'is-active');

        if (typeof spawnPulse === 'function' && typeof BABYLON !== 'undefined') {
          spawnPulse(new BABYLON.Vector3(container.x, 1.1, container.z), best.rarity === 'red' ? '#ff6659' : '#ffd16f', 0.18, 0.34);
        }
        return result;
      };
    }

    const animateBeforePolish = animateRaidEntities;
    animateRaidEntities = function polishedEnemyReaction(dt, ...args) {
      const result = animateBeforePolish(dt, ...args);
      for (const enemy of state.raid?.enemies ?? []) {
        const root = enemy.visual?.root;
        if (!root || enemy.dead) continue;
        const timer = Math.max(0, enemy.hitReactTimer ?? 0);
        if (timer > 0) {
          const nextTimer = Math.max(0, timer - dt);
          const progress = 1 - nextTimer / 0.18;
          const wave = Math.sin(Math.PI * progress);
          const strength = enemy.hitReactStrength ?? 0.7;
          root.rotation.z = (enemy.hitReactSide ?? 1) * wave * 0.11 * strength;
          root.rotation.x = -wave * 0.045 * strength;
          enemy.hitReactTimer = nextTimer;
        } else {
          root.rotation.z *= Math.max(0, 1 - dt * 18);
          root.rotation.x *= Math.max(0, 1 - dt * 16);
        }
      }
      return result;
    };

    const poiDefs = [
      { id: 'center-depot', zh: '中央军械库', en: 'Central Depot', risk: 'high' },
      { id: 'west-barracks', zh: '西侧兵营', en: 'West Barracks', risk: 'medium' },
      { id: 'east-fuel', zh: '东侧燃料区', en: 'East Fuel Farm', risk: 'high' },
      { id: 'south-freight', zh: '南部货运区', en: 'South Freight', risk: 'medium' },
      { id: 'west-bunker', zh: '西部地堡', en: 'West Bunker', risk: 'high' },
      { id: 'east-hangar', zh: '东部机库', en: 'East Hangar', risk: 'high' },
      { id: 'north-silo', zh: '北部筒仓', en: 'North Silo', risk: 'medium' },
    ];

    const resolvePoi = (x, z) => {
      let best = null;
      let bestDistance = Infinity;
      for (const def of poiDefs) {
        const obstacle = typeof obstacleDefs !== 'undefined'
          ? obstacleDefs.find(entry => entry.id === def.id)
          : null;
        if (!obstacle) continue;
        const distance = Math.hypot(x - obstacle.x, z - obstacle.z);
        const radius = Math.max(12, Math.max(obstacle.w, obstacle.d) * 1.35);
        if (distance <= radius && distance < bestDistance) {
          bestDistance = distance;
          best = { ...def, x: obstacle.x, z: obstacle.z, radius };
        }
      }
      return best;
    };

    window.__sdrRaidDesignConfig = {
      poiDefs,
      resolvePoi,
      rarityTargets: {
        highRisk: ['epic', 'legendary', 'red'],
        mediumRisk: ['rare', 'epic'],
      },
      extractionArchetypes: ['standard', 'task', 'switch'],
    };

    let lastPoiId = null;
    window.setInterval(() => {
      const player = state.raid?.player;
      if (!player || state.mode !== 'raid') {
        poiLabel.classList.remove('is-visible');
        lastPoiId = null;
        return;
      }
      const poi = resolvePoi(player.x, player.z);
      debug.currentPoi = poi?.id ?? null;
      if (!poi) {
        poiLabel.classList.remove('is-visible');
        lastPoiId = null;
        return;
      }
      if (poi.id !== lastPoiId) {
        poiLabel.textContent = L(poi.zh, poi.en);
        lastPoiId = poi.id;
      }
      poiLabel.classList.add('is-visible');
    }, 220);
  };

  boot();
})();