(() => {
  if (window.__sdrCombatPolishWaiting || window.__sdrCombatPolishApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof attemptShoot === 'undefined' ||
      typeof damageEnemy === 'undefined' ||
      typeof killEnemy === 'undefined' ||
      typeof animateRaidEntities === 'undefined' ||
      typeof getCurrentPlayerWeaponStats === 'undefined' ||
      typeof distance2D === 'undefined' ||
      typeof lineOfSightBlocked === 'undefined' ||
      typeof BABYLON === 'undefined' ||
      typeof scene === 'undefined'
    ) {
      window.__sdrCombatPolishWaiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrCombatPolishWaiting = false;
    if (window.__sdrCombatPolishApplied) return;
    window.__sdrCombatPolishApplied = true;

    const debug = {
      version: '2026-09-19-combat-polish-v4',
      shotCount: 0,
      hitCount: 0,
      killCount: 0,
      lastDamage: 0,
      lastKill: null,
      currentPoi: null,
      rareFindCount: 0,
      lastRareFind: null,
      echoSwingCount: 0,
      echoHitCount: 0,
      echoInspectCount: 0,
      echoSmokeBlockedCount: 0,
      lastEchoTarget: null,
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
      #combatExtractLabel{position:absolute;right:24px;bottom:78px;padding:6px 10px;border-right:3px solid rgba(113,214,199,.82);background:linear-gradient(270deg,rgba(5,12,14,.78),rgba(5,12,14,.16));backdrop-filter:blur(7px);color:#dff8f3;font-size:.66rem;font-weight:800;letter-spacing:.08em;opacity:0;transition:opacity .18s ease}
      #combatExtractLabel.is-visible{opacity:1}
      #combatShotBloom{position:absolute;left:50%;top:50%;width:16px;height:16px;border:1px solid rgba(220,242,242,.32);border-radius:50%;transform:translate(-50%,-50%);opacity:0}
      #combatShotBloom.is-active{animation:combat-bloom .13s ease-out}
      @keyframes combat-bloom{0%{opacity:.8;transform:translate(-50%,-50%) scale(.65)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.4)}}
      #combatLootBanner{position:absolute;left:50%;top:31%;min-width:250px;transform:translate(-50%,-10px);padding:9px 15px;border:1px solid rgba(255,211,119,.34);border-left:3px solid #ffd16f;background:linear-gradient(90deg,rgba(25,17,7,.88),rgba(17,12,6,.25));backdrop-filter:blur(8px);opacity:0;color:#fff3d0}
      #combatLootBanner strong{display:block;font-size:.76rem;letter-spacing:.12em}
      #combatLootBanner span{display:block;margin-top:3px;font-size:.68rem;color:#ead7a9}
      #combatLootBanner.is-active{animation:combat-loot 2.15s ease both}
      @keyframes combat-loot{0%{opacity:0;transform:translate(-50%,-16px) scale(.95)}10%{opacity:1;transform:translate(-50%,0) scale(1.02)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,10px) scale(1)}}
      #echoExposureLayer{position:absolute;inset:0;pointer-events:none;overflow:hidden}
      .echo-exposure-marker{position:absolute;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:2px;color:#ff947f;text-shadow:0 1px 5px #000,0 0 9px rgba(255,74,54,.65);font-size:.66rem;font-weight:900;letter-spacing:.05em;white-space:nowrap}
      .echo-exposure-marker::before{content:'◆';font-size:1rem;color:#ff6e58;filter:drop-shadow(0 0 5px rgba(255,64,42,.8))}
      .echo-exposure-marker.is-boss{color:#ffd28a}.echo-exposure-marker.is-boss::before{color:#ffb65d}
    `;
    document.head.appendChild(style);

    const hud = document.createElement('div');
    hud.id = 'combatPolishHud';
    hud.innerHTML = `
      <div id="combatHitMarker"><i></i><i></i><i></i><i></i></div>
      <div id="combatDamageNumber"></div>
      <div id="combatKillBanner"><strong></strong><span></span></div>
      <div id="combatPoiLabel"></div>
      <div id="combatExtractLabel"></div>
      <div id="combatShotBloom"></div>
      <div id="combatLootBanner"><strong></strong><span></span></div>
      <div id="echoExposureLayer"></div>
    `;
    document.body.appendChild(hud);

    const hitMarker = hud.querySelector('#combatHitMarker');
    const damageNumber = hud.querySelector('#combatDamageNumber');
    const killBanner = hud.querySelector('#combatKillBanner');
    const killTitle = killBanner.querySelector('strong');
    const killDetail = killBanner.querySelector('span');
    const poiLabel = hud.querySelector('#combatPoiLabel');
    const extractLabel = hud.querySelector('#combatExtractLabel');
    const shotBloom = hud.querySelector('#combatShotBloom');
    const lootBanner = hud.querySelector('#combatLootBanner');
    const lootTitle = lootBanner.querySelector('strong');
    const lootDetail = lootBanner.querySelector('span');
    const echoExposureLayer = hud.querySelector('#echoExposureLayer');
    const echoMarkers = new Map();

    const ECHO_RANGE = 12;
    const ECHO_DAMAGE = 200;
    const ECHO_REVEAL_DURATION = 5;
    const ECHO_COOLDOWN = 0.5;
    const ECHO_SWING_DURATION = 0.34;
    const ECHO_INSPECT_DURATION = 1.55;
    const ECHO_SUPPORT_SMOKE_RADIUS = 20;

    const shopBeforeEchoRangeUpdate = getShopEntries;
    getShopEntries = function restorePrepShopAfterSubsidyCleanup() {
      const entries = shopBeforeEchoRangeUpdate();
      const existing = new Set(entries.map((entry) => entry.id));
      const restoredPrep = [
        {
          id: 'prep_medkit',
          kind: 'prep',
          name: L('战地医疗包', 'Field Medkit'),
          description: L('下次出击时医疗包 +1', 'Adds 1 medkit to the next raid'),
          price: 900,
          status: L(`已备 ${state.save.prep.medkitBonus}`, `Prepared ${state.save.prep.medkitBonus}`),
          disabled: false,
        },
        {
          id: 'prep_surgical',
          kind: 'prep',
          name: L('手术包', 'Surgical Kit'),
          description: L('下次出击时额外获得 2 个医疗包', 'Adds 2 more medkits to the next raid'),
          price: 1700,
          status: L('重型医疗补给', 'Heavy medical supply'),
          disabled: false,
        },
        {
          id: 'prep_armor',
          kind: 'prep',
          name: L('复合护甲板', 'Composite Plates'),
          description: L('下次出击时初始护甲 +35', 'Adds 35 starting armor for the next raid'),
          price: 1200,
          status: L(`已备 +${state.save.prep.armorBonus}`, `Prepared +${state.save.prep.armorBonus}`),
          disabled: false,
        },
      ];
      const echoUnlocked = Boolean(state.save.echoUnlocked);
      const echoEntry = {
        id: 'echo_unlock',
        kind: 'permanent',
        name: L('回声', 'Echo'),
        description: L('永久解锁回声近战武器：12 米攻击范围、200 伤害、0.5 秒一刀，命中暴露敌人 5 秒。', 'Permanently unlock Echo melee: 12m range, 200 damage, 0.5s slash, reveals hit enemies for 5s.'),
        price: 100000,
        status: echoUnlocked ? L('已永久解锁', 'Permanently unlocked') : L('永久购买', 'Permanent purchase'),
        disabled: echoUnlocked,
      };
      return [...restoredPrep.filter((entry) => !existing.has(entry.id)), ...(existing.has(echoEntry.id) ? [] : [echoEntry]), ...(echoUnlocked && !existing.has('echo_smoke_upgrade') ? [{
          id: 'echo_smoke_upgrade',
          kind: 'permanent',
          name: L('回声 · 烟雾适应', 'Echo · Smoke Adaptation'),
          description: L('再支付 150,000，永久允许回声在烟雾中攻击和检视。', 'Pay another 150,000 to permanently use and inspect Echo inside smoke.'),
          price: 150000,
          status: state.save.echoSmokeUnlocked ? L('已永久解锁', 'Permanently unlocked') : L('永久升级', 'Permanent upgrade'),
          disabled: Boolean(state.save.echoSmokeUnlocked),
        }] : []), ...entries]
        .filter((entry) => entry.id !== 'emergency_funding');
    };

    const echoUnlocked = () => Boolean(state.save.echoUnlocked);

    const basePanelEchoUnlockHandler = (event) => {
      const button = event.target?.closest?.('[data-shop-id="echo_unlock"]');
      const smokeButton = event.target?.closest?.('[data-shop-id="echo_smoke_upgrade"]');
      if (smokeButton) {
        if (!echoUnlocked() || state.save.echoSmokeUnlocked) return;
        if ((state.save.money ?? 0) < 150000) {
          notify(L('资金不足：烟雾适应需要 150,000。', 'Not enough funds: Smoke Adaptation costs 150,000.'), 'danger');
          return;
        }
        state.save.money -= 150000;
        state.save.echoSmokeUnlocked = true;
        persistSave();
        renderBasePanel();
        notify(L('回声烟雾适应已永久解锁。', 'Echo Smoke Adaptation permanently unlocked.'), 'success');
        return;
      }
      if (!button || echoUnlocked()) return;
      if ((state.save.money ?? 0) < 100000) {
        notify(L('资金不足：回声需要 100,000。', 'Not enough funds: Echo costs 100,000.'), 'danger');
        return;
      }
      state.save.money -= 100000;
      state.save.echoUnlocked = true;
      persistSave();
      renderBasePanel();
      notify(L('回声已永久解锁。', 'Echo permanently unlocked.'), 'success');
    };
    refs?.basePanel?.addEventListener?.('click', basePanelEchoUnlockHandler, true);

    const syncEchoBaseInfo = () => {
      const loadout = refs?.loadoutPrep?.querySelector?.('[data-echo-melee-loadout] strong');
      if (loadout) {
        loadout.textContent = L(
          '回声 · 12 米 · 200 伤害 · 0.5 秒一刀 · T 挥刀 · H 检视',
          'Echo · 12m · 200 damage · 0.5s per slash · T attack · H inspect',
        );
      }
      const armoryMeta = refs?.armoryPanel?.querySelector?.('[data-echo-melee-armory] .item-meta');
      if (armoryMeta) {
        armoryMeta.textContent = L(
          '蓝色科技近战副武器 · 12 米 · 200 伤害 · 0.5 秒一刀 · T 挥刀 · H 检视 · 命中暴露位置 5 秒 · 烟雾中无法使用',
          'Blue-tech melee sidearm · 12m · 200 damage · 0.5s per slash · T attack · H inspect · exposes hit targets for 5s · disabled in smoke',
        );
      }
    };

    const renderBaseBeforeEchoRangeUpdate = renderBasePanel;
    renderBasePanel = function renderBaseWithEchoRange(...args) {
      const result = renderBaseBeforeEchoRangeUpdate.apply(this, args);
      syncEchoBaseInfo();
      return result;
    };
    syncEchoBaseInfo();

    const isEchoBlockedBySmoke = (player = state.raid?.player) => Boolean(
      player &&
      (player.supportSmokeTimer ?? 0) > 0 &&
      Number.isFinite(player.supportSmokeX) &&
      Number.isFinite(player.supportSmokeZ) &&
      Math.hypot(player.x - player.supportSmokeX, player.z - player.supportSmokeZ) <= ECHO_SUPPORT_SMOKE_RADIUS
    );

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

    const syncStaminaHud = () => {
      const player = state.raid?.player;
      const value = document.getElementById('staminaValue');
      const fill = document.getElementById('staminaMeterFill');
      if (!player || !value || !fill) return;
      const max = Math.max(1, Number(player.maxStamina ?? (player.operatorId === 'lingshuang' ? 650 : 500)));
      const current = Math.max(0, Math.min(max, Number(player.stamina ?? max)));
      value.textContent = `${Math.round(current)} / ${Math.round(max)}`;
      fill.style.width = `${Math.max(0, Math.min(100, current / max * 100))}%`;
      fill.dataset.low = current / max < 0.22 ? '1' : '0';
    };
    const syncHudBeforeStamina = typeof syncHud === 'function' ? syncHud : null;
    if (syncHudBeforeStamina) {
      syncHud = function syncHudWithStamina(...args) {
        const result = syncHudBeforeStamina.apply(this, args);
        syncStaminaHud();
        return result;
      };
    }

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

    const makeEchoKnifeVisual = () => {
      const root = new BABYLON.TransformNode('echo-knife-view', scene);
      root.parent = scene.activeCamera;
      root.position.set(0.32, -0.28, 0.62);
      root.rotation.set(-0.08, -0.18, -0.08);

      const shell = new BABYLON.StandardMaterial('echo-knife-shell-blue', scene);
      shell.diffuseColor = BABYLON.Color3.FromHexString('#0c4aa8');
      shell.emissiveColor = BABYLON.Color3.FromHexString('#0b65d9').scale(0.62);
      shell.specularColor = BABYLON.Color3.FromHexString('#8fe9ff').scale(0.8);

      const core = new BABYLON.StandardMaterial('echo-knife-core-blue', scene);
      core.diffuseColor = BABYLON.Color3.FromHexString('#168dff');
      core.emissiveColor = BABYLON.Color3.FromHexString('#159dff').scale(0.95);
      core.specularColor = BABYLON.Color3.FromHexString('#d8f8ff');

      const line = new BABYLON.StandardMaterial('echo-knife-line-blue', scene);
      line.diffuseColor = BABYLON.Color3.FromHexString('#7cecff');
      line.emissiveColor = BABYLON.Color3.FromHexString('#42d7ff').scale(1.15);
      line.specularColor = BABYLON.Color3.FromHexString('#efffff');

      const blade = BABYLON.MeshBuilder.CreateBox('echo-knife-blade', { width: 0.082, height: 0.038, depth: 0.58 }, scene);
      blade.parent = root;
      blade.position.z = 0.17;
      blade.material = shell;

      const centerChannel = BABYLON.MeshBuilder.CreateBox('echo-knife-center-line', { width: 0.018, height: 0.044, depth: 0.5 }, scene);
      centerChannel.parent = root;
      centerChannel.position.set(0, 0.003, 0.17);
      centerChannel.material = line;

      for (const side of [-1, 1]) {
        const rail = BABYLON.MeshBuilder.CreateBox(`echo-knife-side-line-${side}`, { width: 0.014, height: 0.046, depth: 0.42 }, scene);
        rail.parent = root;
        rail.position.set(side * 0.034, 0.004, 0.14);
        rail.material = core;

        const vent = BABYLON.MeshBuilder.CreateBox(`echo-knife-tech-vent-${side}`, { width: 0.02, height: 0.052, depth: 0.11 }, scene);
        vent.parent = root;
        vent.position.set(side * 0.046, 0, -0.015);
        vent.rotation.y = side * 0.12;
        vent.material = line;
      }

      const tip = BABYLON.MeshBuilder.CreateCylinder('echo-knife-tip', { height: 0.18, diameterTop: 0, diameterBottom: 0.084, tessellation: 4 }, scene);
      tip.parent = root;
      tip.position.z = 0.55;
      tip.rotation.x = Math.PI / 2;
      tip.material = core;

      const guard = BABYLON.MeshBuilder.CreateBox('echo-knife-guard', { width: 0.25, height: 0.052, depth: 0.065 }, scene);
      guard.parent = root;
      guard.position.z = -0.14;
      guard.material = shell;

      const guardLine = BABYLON.MeshBuilder.CreateBox('echo-knife-guard-line', { width: 0.21, height: 0.058, depth: 0.018 }, scene);
      guardLine.parent = root;
      guardLine.position.set(0, 0.002, -0.137);
      guardLine.material = line;

      const grip = BABYLON.MeshBuilder.CreateCylinder('echo-knife-handle', { height: 0.34, diameter: 0.082, tessellation: 14 }, scene);
      grip.parent = root;
      grip.position.z = -0.34;
      grip.rotation.x = Math.PI / 2;
      grip.material = shell;

      for (let i = 0; i < 4; i++) {
        const ring = BABYLON.MeshBuilder.CreateTorus(`echo-knife-grip-ring-${i}`, { diameter: 0.09, thickness: 0.011, tessellation: 14 }, scene);
        ring.parent = root;
        ring.position.z = -0.23 - i * 0.075;
        ring.rotation.x = Math.PI / 2;
        ring.material = i % 2 ? core : line;
      }

      const pommel = BABYLON.MeshBuilder.CreateCylinder('echo-knife-pommel', { height: 0.07, diameter: 0.095, tessellation: 12 }, scene);
      pommel.parent = root;
      pommel.position.z = -0.535;
      pommel.rotation.x = Math.PI / 2;
      pommel.material = core;

      for (const mesh of root.getChildMeshes()) {
        mesh.isPickable = false;
        mesh.metadata = { ...(mesh.metadata ?? {}), echoKnife: true, techBlue: true };
      }
      root.metadata = { echoKnife: true, inspectable: true, range: ECHO_RANGE, damage: ECHO_DAMAGE };
      return root;
    };

    const sameMeleeLevel = (player, enemy) => {
      const playerRoof = player?.onRoofBuildingId ?? null;
      const enemyRoof = enemy?.onRoofBuildingId ?? null;
      return playerRoof === enemyRoof || (!playerRoof && !enemyRoof);
    };

    const echoTarget = (player) => {
      let best = null;
      let bestScore = Infinity;
      const forwardX = Math.sin(player.yaw ?? 0);
      const forwardZ = Math.cos(player.yaw ?? 0);
      for (const enemy of state.raid?.enemies ?? []) {
        if (!enemy || enemy.dead || enemy.despawned || !sameMeleeLevel(player, enemy)) continue;
        const dx = enemy.x - player.x;
        const dz = enemy.z - player.z;
        const distance = Math.hypot(dx, dz);
        if (distance > ECHO_RANGE || distance < 0.001) continue;
        const dot = (dx * forwardX + dz * forwardZ) / distance;
        if (dot < 0.48) continue;
        if (lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) continue;
        const score = distance + (1 - dot) * 1.2;
        if (score < bestScore) {
          best = enemy;
          bestScore = score;
        }
      }
      return best;
    };

    const applyEchoHit = (player) => {
      const target = echoTarget(player);
      if (!target) {
        if (typeof spawnPulse === 'function') spawnPulse(new BABYLON.Vector3(player.x, 1, player.z), '#75c9df', 0.04, 0.06);
        return null;
      }
      target.echoRevealTimer = ECHO_REVEAL_DURATION;
      const before = target.health ?? 0;
      damageEnemy(target, ECHO_DAMAGE, { ignoreSmoke: true });
      const dealt = Math.max(0, before - Math.max(0, target.health ?? 0));
      debug.echoHitCount += 1;
      debug.lastEchoTarget = { enemyId: target.id, reveal: target.echoRevealTimer, damage: dealt };
      if (typeof spawnImpactBurst === 'function') spawnImpactBurst(new BABYLON.Vector3(target.x, 1.1, target.z), '#72d9ff', 0.9, 'hard');
      if (typeof playImpactAudio === 'function') playImpactAudio(new BABYLON.Vector3(target.x, 1, target.z), 'hard');
      notify(L(`回声命中：目标位置暴露 ${ECHO_REVEAL_DURATION} 秒。`, `Echo hit: target position exposed for ${ECHO_REVEAL_DURATION}s.`), 'success');
      return target;
    };

    const beginEchoKnifeAttack = () => {
      const player = state.raid?.player;
      if (!echoUnlocked()) {
        notify(L('需要先在商店用 100,000 资金永久购买回声。', 'Purchase Echo permanently in the shop for 100,000 first.'), 'warning');
        return false;
      }
      if (
        state.mode !== 'raid' || state.overlay || !player || player.health <= 0 ||
        (player.dropTimer ?? 0) > 0 || (player.echoKnifeCooldown ?? 0) > 0 ||
        player.echoKnifeAction || player.echoKnifeInspect || player.executionLocked || player.utilityAction ||
        player.incendiaryThrow || player.stunGrenadeThrow || player.useAction
      ) return false;
      if (isEchoBlockedBySmoke(player) && !state.save.echoSmokeUnlocked) {
        debug.echoSmokeBlockedCount += 1;
        notify(L('烟雾中无法使用回声。', 'Echo cannot be used inside smoke.'), 'warning');
        return false;
      }
      player.echoKnifeCooldown = ECHO_COOLDOWN;
      player.echoKnifeAction = { timer: 0, duration: ECHO_SWING_DURATION, applied: false, visual: makeEchoKnifeVisual() };
      state.input.fireHeld = false;
      debug.echoSwingCount += 1;
      return true;
    };

    const beginEchoKnifeInspect = () => {
      const player = state.raid?.player;
      if (!echoUnlocked()) {
        notify(L('需要先在商店用 100,000 资金永久购买回声。', 'Purchase Echo permanently in the shop for 100,000 first.'), 'warning');
        return false;
      }
      if (
        state.mode !== 'raid' || state.overlay || !player || player.health <= 0 ||
        (player.dropTimer ?? 0) > 0 || player.echoKnifeAction || player.echoKnifeInspect ||
        player.executionLocked || player.utilityAction || player.incendiaryThrow ||
        player.stunGrenadeThrow || player.useAction
      ) return false;
      if (isEchoBlockedBySmoke(player) && !state.save.echoSmokeUnlocked) {
        debug.echoSmokeBlockedCount += 1;
        notify(L('烟雾中无法检视回声。', 'Echo cannot be inspected inside smoke.'), 'warning');
        return false;
      }
      player.echoKnifeInspect = { timer: 0, duration: ECHO_INSPECT_DURATION, visual: makeEchoKnifeVisual() };
      state.input.fireHeld = false;
      debug.echoInspectCount += 1;
      return true;
    };

    window.__sdrUseEchoKnife = beginEchoKnifeAttack;
    window.__sdrInspectEchoKnife = beginEchoKnifeInspect;
    window.__sdrEchoKnifeConfig = {
      range: ECHO_RANGE,
      damage: ECHO_DAMAGE,
      revealDuration: ECHO_REVEAL_DURATION,
      cooldown: ECHO_COOLDOWN,
      inspectDuration: ECHO_INSPECT_DURATION,
    };

    let echoAttackHeld = false;
    window.addEventListener('keydown', (event) => {
      const lower = event.key?.toLowerCase?.() ?? '';
      if (state.mode !== 'raid' || state.overlay) return;
      if (event.code === 'KeyT' || lower === 't') {
        event.preventDefault();
        event.stopImmediatePropagation();
        echoAttackHeld = true;
        if (!event.repeat) beginEchoKnifeAttack();
      } else if (event.code === 'KeyH' || lower === 'h') {
        event.preventDefault();
        event.stopImmediatePropagation();
        beginEchoKnifeInspect();
      }
    }, true);
    window.addEventListener('keyup', (event) => {
      const lower = event.key?.toLowerCase?.() ?? '';
      if (event.code === 'KeyT' || lower === 't') echoAttackHeld = false;
    }, true);

    const animateBeforePolish = animateRaidEntities;
    animateRaidEntities = function polishedEnemyReaction(dt, ...args) {
      const result = animateBeforePolish(dt, ...args);
      for (const enemy of state.raid?.enemies ?? []) {
        enemy.echoRevealTimer = Math.max(0, (enemy.echoRevealTimer ?? 0) - dt);
      }
      const player = state.raid?.player;
      if (player) {
        player.echoKnifeCooldown = Math.max(0, (player.echoKnifeCooldown ?? 0) - dt);
        if (echoAttackHeld && !player.echoKnifeAction && !player.echoKnifeInspect && (player.echoKnifeCooldown ?? 0) <= 0) beginEchoKnifeAttack();
        const action = player.echoKnifeAction;
        if (action) {
          action.timer += dt;
          const progress = Math.min(1, action.timer / action.duration);
          const wave = Math.sin(progress * Math.PI);
          if (action.visual) {
            action.visual.position.set(0.32 - progress * 0.24, -0.28 + wave * 0.21, 0.62 - wave * 0.25);
            action.visual.rotation.x = -0.08 - wave * 1.08;
            action.visual.rotation.y = -0.18 + wave * 0.38;
            action.visual.rotation.z = -0.08 - wave * 0.72;
          }
          if (!action.applied && progress >= 0.3) {
            action.applied = true;
            applyEchoHit(player);
          }
          if (progress >= 1) {
            action.visual?.dispose(false, true);
            player.echoKnifeAction = null;
          }
        }

        const inspect = player.echoKnifeInspect;
        if (inspect) {
          inspect.timer += dt;
          const progress = Math.min(1, inspect.timer / inspect.duration);
          const lift = Math.sin(progress * Math.PI);
          const turn = Math.sin(progress * Math.PI * 0.5);
          if (inspect.visual) {
            inspect.visual.position.set(0.05 + lift * 0.08, -0.14 + lift * 0.13, 0.5 - lift * 0.08);
            inspect.visual.rotation.x = -0.12 + Math.sin(progress * Math.PI * 2) * 0.18;
            inspect.visual.rotation.y = -0.3 + turn * Math.PI * 1.75;
            inspect.visual.rotation.z = -0.12 + Math.sin(progress * Math.PI) * 0.42;
          }
          if (progress >= 1) {
            inspect.visual?.dispose(false, true);
            player.echoKnifeInspect = null;
          }
        }
      }
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

    const clearBeforeEcho = clearRaid;
    clearRaid = function clearEchoKnifeEffects() {
      const player = state.raid?.player;
      player?.echoKnifeAction?.visual?.dispose(false, true);
      player?.echoKnifeInspect?.visual?.dispose(false, true);
      for (const marker of echoMarkers.values()) marker.remove();
      echoMarkers.clear();
      return clearBeforeEcho();
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
    let lastExtractKey = null;
    window.setInterval(() => {
      const raid = state.raid;
      const player = raid?.player;
      const inRaid = state.mode === 'raid' && Boolean(player);
      const activeIds = new Set();
      if (inRaid && scene.activeCamera && refs?.canvas) {
        const engine = scene.getEngine();
        const renderWidth = engine.getRenderWidth();
        const renderHeight = engine.getRenderHeight();
        const viewport = scene.activeCamera.viewport.toGlobal(renderWidth, renderHeight);
        const rect = refs.canvas.getBoundingClientRect();
        for (const enemy of raid.enemies ?? []) {
          if (enemy.dead || enemy.despawned || (enemy.echoRevealTimer ?? 0) <= 0) continue;
          const id = String(enemy.id ?? `${enemy.x}:${enemy.z}`);
          activeIds.add(id);
          let marker = echoMarkers.get(id);
          if (!marker) {
            marker = document.createElement('div');
            marker.className = 'echo-exposure-marker';
            echoExposureLayer.appendChild(marker);
            echoMarkers.set(id, marker);
          }
          marker.classList.toggle('is-boss', Boolean(enemy.isNamelessBoss));
          const rootPosition = enemy.visual?.root?.getAbsolutePosition?.();
          const world = new BABYLON.Vector3(enemy.x, (rootPosition?.y ?? 0) + 2.05, enemy.z);
          const projected = BABYLON.Vector3.Project(world, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), viewport);
          const screenX = rect.left + projected.x * (rect.width / Math.max(1, renderWidth));
          const screenY = rect.top + projected.y * (rect.height / Math.max(1, renderHeight));
          const visible = projected.z >= 0 && projected.z <= 1 &&
            screenX >= rect.left - 40 && screenX <= rect.right + 40 &&
            screenY >= rect.top - 40 && screenY <= rect.bottom + 40;
          marker.hidden = !visible;
          marker.style.left = `${screenX}px`;
          marker.style.top = `${screenY}px`;
          marker.textContent = `${enemyLabel(enemy)} · ${enemy.echoRevealTimer.toFixed(1)}s`;
        }
      }
      for (const [id, marker] of echoMarkers) {
        if (!activeIds.has(id)) {
          marker.remove();
          echoMarkers.delete(id);
        }
      }
    }, 80);

    window.setInterval(() => {
      const player = state.raid?.player;
      if (!player || state.mode !== 'raid') {
        poiLabel.classList.remove('is-visible');
        extractLabel.classList.remove('is-visible');
        lastPoiId = null;
        lastExtractKey = null;
        return;
      }
      const poi = resolvePoi(player.x, player.z);
      debug.currentPoi = poi?.id ?? null;
      if (!poi) {
        poiLabel.classList.remove('is-visible');
        lastPoiId = null;
      } else {
        if (poi.id !== lastPoiId) {
          const riskLabel = poi.risk === 'high' ? L('高风险', 'HIGH RISK') : L('中风险', 'MEDIUM RISK');
          poiLabel.textContent = `${L(poi.zh, poi.en)} · ${riskLabel}`;
          lastPoiId = poi.id;
        }
        poiLabel.classList.add('is-visible');
      }

      const zones = (state.raid?.extractions ?? []).filter(zone => zone.active !== false);
      let nearestZone = null;
      let nearestDistance = Infinity;
      for (const zone of zones) {
        const distance = Math.hypot(player.x - zone.x, player.z - zone.z);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestZone = zone;
        }
      }
      if (nearestZone && nearestDistance <= 28) {
        const typeLabel = nearestZone.kind === 'switch'
          ? L('拉闸撤离', 'LEVER EXIT')
          : nearestZone.kind === 'task'
            ? L('任务撤离', 'TASK EXIT')
            : L('普通撤离', 'STANDARD EXIT');
        const zoneName = L(nearestZone.nameZh ?? nearestZone.name ?? nearestZone.id, nearestZone.nameEn ?? nearestZone.name ?? nearestZone.id);
        const roundedDistance = Math.round(nearestDistance / 2) * 2;
        const nextExtractKey = `${nearestZone.id}|${typeLabel}|${roundedDistance}`;
        if (nextExtractKey !== lastExtractKey) {
          extractLabel.textContent = `${zoneName} · ${typeLabel} · ${roundedDistance}m`;
          lastExtractKey = nextExtractKey;
        }
        extractLabel.classList.add('is-visible');
      } else {
        extractLabel.classList.remove('is-visible');
        lastExtractKey = null;
      }
    }, 360);
  };

  boot();
})();