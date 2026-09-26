(() => {
  if (window.__sdrBlackTideContentApplied || window.__sdrBlackTideContentWaiting) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof getLobbyModeDefs !== 'function' ||
      typeof getOperatorDefs !== 'function' ||
      typeof getOperatorOrder !== 'function' ||
      typeof renderOperatorPanel !== 'function' ||
      typeof setSelectedOperator !== 'function' ||
      typeof setSelectedLobbyMode !== 'function' ||
      typeof startRaid !== 'function' ||
      typeof clearRaid !== 'function' ||
      typeof updateRaid !== 'function' ||
      typeof useOperatorAbility !== 'function' ||
      typeof applyDamageToPlayer !== 'function' ||
      typeof enemyShoot !== 'function' ||
      typeof damageEnemy !== 'function' ||
      typeof distance2D !== 'function' ||
      typeof getPlayerMoveSpeed !== 'function' ||
      typeof resolveStaticPlacement !== 'function' ||
      typeof generateContainerLoot !== 'function' ||
      typeof persistSave !== 'function' ||
      typeof renderBasePanel !== 'function' ||
      typeof syncHud !== 'function' ||
      typeof notify !== 'function' ||
      typeof makeMaterial !== 'function' ||
      typeof obstacleDefs === 'undefined' ||
      typeof world === 'undefined' ||
      typeof scene === 'undefined' ||
      typeof BABYLON === 'undefined'
    ) {
      window.__sdrBlackTideContentWaiting = true;
      window.setTimeout(boot, 70);
      return;
    }

    window.__sdrBlackTideContentWaiting = false;
    if (window.__sdrBlackTideContentApplied) return;
    window.__sdrBlackTideContentApplied = true;

    const MODE_ID = 'blacktide';
    const MAP_ID = 'black-tide-harbor';
    const OPERATOR_ID = 'lingshuang';
    const OPERATOR_PRICE = 50000;
    const PHASE_DURATION = 50;
    const PHASE_MOVE_MULT = 1.6666667;
    const PHASE_DAMAGE_MULT = 0.15;
    const PRISM_MAX = 4;
    const PRISM_REFILL = 10;
    const PRISM_DURATION = 10;
    const PRISM_HP = 1000;
    const THREAT_STEP = 90;
    const THREAT_MAX = 3;

    const debug = {
      version: '2026-09-25-black-tide-v1',
      modeId: MODE_ID,
      mapId: MAP_ID,
      operatorId: OPERATOR_ID,
      operatorPrice: OPERATOR_PRICE,
      phaseDuration: PHASE_DURATION,
      phaseMoveMult: PHASE_MOVE_MULT,
      phaseDamageMult: PHASE_DAMAGE_MULT,
      prismHp: PRISM_HP,
      prismDuration: PRISM_DURATION,
      prismMax: PRISM_MAX,
      prismRefill: PRISM_REFILL,
      mapMounts: 0,
      mapCleanups: 0,
      threatEscalations: 0,
      usePrismShield: null,
      getMapObstacleCount: () => activeMapObstacleIds.size,
    };
    window.__sdrBlackTideDebug = debug;

    const Ls = (zh, en) => typeof L === 'function' ? L(zh, en) : en;
    const preload = window.__sdrBlackTidePreload ?? {};
    if (preload.lingshuangUnlocked) state.save.lingshuangUnlocked = true;

    const modeBeforeBlackTide = getLobbyModeDefs;
    getLobbyModeDefs = function getLobbyModeDefsWithBlackTide() {
      const defs = modeBeforeBlackTide();
      if (defs[MODE_ID]) return defs;
      return {
        ...defs,
        [MODE_ID]: {
          id: MODE_ID,
          nameZh: '黑潮行动',
          nameEn: 'Black Tide Operation',
          summaryZh: '黑潮港专属模式。8 分钟内搜索 3 个港区物资点并击败 8 名敌人；警戒强度每 90 秒提升一档。',
          summaryEn: 'Black Tide Harbor mode. Search 3 harbor caches and defeat 8 hostiles in 8 minutes; alert intensity rises every 90 seconds.',
          detailZh: '新地图：黑潮港。集装箱通道、码头掩体与双撤离路线；任务撤离需要完成目标，拉闸撤离可提前冒险开启。',
          detailEn: 'New map: Black Tide Harbor, with container lanes, dock cover and two extraction routes. The task exit requires objectives; the lever exit can be risked early.',
          deployZh: '进入黑潮港',
          deployEn: 'Enter Black Tide Harbor',
          duration: 8 * 60,
          bonusReward: 8000,
          objectiveFactory: () => ([
            { id: 'search', label: 'search', target: 3, progress: 0 },
            { id: 'kill', label: 'kill', target: 8, progress: 0 },
          ]),
          buildLayout() {
            const task = {
              id: 'blacktide-ferry',
              nameZh: '东侧渡轮码头',
              nameEn: 'East Ferry Terminal',
              x: 118,
              z: 34,
              radius: 5.8,
              kind: 'task',
              active: true,
              requiresObjectives: true,
              pulse: Math.random() * Math.PI * 2,
            };
            const gated = {
              id: 'blacktide-drydock',
              nameZh: '西侧干船坞',
              nameEn: 'West Drydock',
              x: -118,
              z: -72,
              radius: 5.8,
              kind: 'switch',
              active: true,
              switchArmed: false,
              switchTimer: 0,
              switchExpired: false,
              pulse: Math.random() * Math.PI * 2,
              switchPointId: 'blacktide-grid',
            };
            return {
              extractions: [task, gated],
              switchPoints: [{
                id: 'blacktide-grid',
                nameZh: '吊机配电台',
                nameEn: 'Crane Power Console',
                x: 82,
                z: 98,
                radius: 2.4,
                active: true,
                used: false,
                pulse: Math.random() * Math.PI * 2,
                zoneId: gated.id,
              }],
            };
          },
          getStartInteractionText() {
            return Ls('黑潮港：完成搜索与清敌可开启渡轮撤离，也可以前往吊机配电台开启干船坞撤离。', 'Black Tide Harbor: finish search and kill objectives for the ferry, or power the drydock exit at the crane console.');
          },
          getStartNotice() {
            return Ls('黑潮行动开始：8 分钟，警戒强度每 90 秒提升。', 'Black Tide Operation started: 8 minutes, alert intensity rises every 90 seconds.');
          },
        },
      };
    };

    const wardenDef = {
      id: OPERATOR_ID,
      nameZh: '凌霜',
      nameEn: 'Lingshuang',
      passiveZh: '女 · 防卫位。初始护甲大幅提升，后坐力与散布显著降低、换弹更快；专属棱镜盾可吸收大量爆发伤害。',
      passiveEn: 'Female · Warden. Starts with greatly increased armor, much lower recoil and spread, faster reloads, and a powerful Prism Shield for burst protection.',
      skillNameZh: '相位推进',
      skillNameEn: 'Phase Drive',
      skillTextZh: 'C 手动启动 50 秒：移动速度 +110%，受到伤害降低 85%。',
      skillTextEn: 'C: activate for 50s to gain +66.7% phase movement speed and take 85% less damage.',
      itemNameZh: '棱镜盾',
      itemNameEn: 'Prism Shield',
      moveMult: 1.2,
      spreadMult: 0.58,
      recoilMult: 0.55,
      reloadMult: 0.68,
      detectMult: 1,
      healBonus: 0,
      healCooldownMult: 1,
      startArmorBonus: 250,
      startMedkitBonus: 0,
      utilityCharges: 3,
      abilityDuration: PHASE_DURATION,
      abilityCooldown: 0,
      abilityColor: '#7cecff',
    };

    const defsBeforeWarden = getOperatorDefs;
    getOperatorDefs = function getOperatorDefsWithLingshuang() {
      const defs = defsBeforeWarden();
      defs[OPERATOR_ID] = { ...wardenDef };
      return defs;
    };

    const orderBeforeWarden = getOperatorOrder;
    getOperatorOrder = function getOperatorOrderWithLingshuang() {
      const order = orderBeforeWarden();
      return order.includes(OPERATOR_ID) ? order : [...order, OPERATOR_ID];
    };

    const isOperatorUnlocked = (operatorId) => {
      if (operatorId === 'engineer') return Boolean(state.save.engineerUnlocked);
      if (operatorId === OPERATOR_ID) return Boolean(state.save.lingshuangUnlocked);
      return true;
    };

    if (preload.selectedModeId === MODE_ID) state.save.selectedModeId = MODE_ID;
    if (preload.selectedOperatorId === OPERATOR_ID && state.save.lingshuangUnlocked) {
      state.save.selectedOperatorId = OPERATOR_ID;
    }

    const selectBeforeWarden = setSelectedOperator;
    setSelectedOperator = function selectLingshuang(operatorId) {
      if (operatorId === OPERATOR_ID && !state.save.lingshuangUnlocked) {
        notify(Ls('凌霜尚未解锁，需要 50,000 资金。', 'Lingshuang is locked. 50,000 funds are required.'), 'warning');
        return;
      }
      const result = selectBeforeWarden(operatorId);
      return result;
    };

    renderOperatorPanel = function renderOperatorsWithLingshuang() {
      const selected = state.save.selectedOperatorId;
      return getOperatorOrder().map((operatorId) => {
        const operator = getOperatorDefs()[operatorId];
        const unlocked = isOperatorUnlocked(operatorId);
        const active = selected === operatorId;
        const extra = operatorId === 'engineer'
          ? `<div class="item-meta">${Ls('速凝掩体：G；火焰弹：I；震撼弹：O。', 'Rapid Barrier: G; Incendiary: I; Stun Grenade: O.')}</div>`
          : operatorId === OPERATOR_ID
            ? `<div class="item-meta">${Ls('棱镜盾：1000 点护盾，持续 10 秒；最多 4 个，每 10 秒补充 1 个，G 使用。', 'Prism Shield: 1000 shield for 10s; max 4, +1 every 10s, press G.')}</div>`
            : '';
        const lock = operatorId === 'engineer'
          ? `<div class="item-meta operator-lock-note">${Ls('解锁价格：200,000 资金', 'Unlock cost: 200,000 funds')}</div>`
          : operatorId === OPERATOR_ID
            ? `<div class="item-meta lingshuang-lock-note">${Ls('解锁价格：50,000 资金', 'Unlock cost: 50,000 funds')}</div>`
            : '';
        const action = unlocked
          ? `<button class="${active ? 'primary-button' : 'ghost-button'} small" type="button" data-operator-id="${operatorId}">${active ? Ls('已选择', 'Selected') : Ls('选择', 'Select')}</button>`
          : operatorId === 'engineer'
            ? `<button class="primary-button small" type="button" data-engineer-unlock ${state.save.money >= 200000 ? '' : 'disabled'}>${Ls('购买彦飞', 'Buy Yanfei')}</button>`
            : `<button class="primary-button small" type="button" data-lingshuang-unlock ${state.save.money >= OPERATOR_PRICE ? '' : 'disabled'}>${Ls('购买凌霜', 'Buy Lingshuang')}</button>`;
        return `
          <article class="shop-row operator-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}">
            <div>
              <div class="item-title">${Ls(operator.nameZh, operator.nameEn)}</div>
              <div class="item-meta">${Ls(operator.passiveZh, operator.passiveEn)}</div>
              <div class="item-meta">${Ls('技能：' + Ls(operator.skillNameZh, operator.skillNameEn) + ' · ' + Ls(operator.skillTextZh, operator.skillTextEn), 'Skill: ' + operator.skillNameEn + ' · ' + operator.skillTextEn)}</div>
              <div class="item-meta">${Ls('专属道具：' + Ls(operator.itemNameZh, operator.itemNameEn), 'Signature item: ' + operator.itemNameEn)}</div>
              ${extra}
              ${unlocked ? '' : lock}
            </div>
            <div class="stack-list">${action}</div>
          </article>`;
      }).join('');
    };

    refs.basePanel?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lingshuang-unlock]');
      if (!button || state.save.lingshuangUnlocked) return;
      if (state.save.money < OPERATOR_PRICE) {
        notify(Ls('资金不足，需要 50,000。', 'Not enough funds. Need 50,000.'), 'danger');
        return;
      }
      state.save.money -= OPERATOR_PRICE;
      state.save.lingshuangUnlocked = true;
      state.save.selectedOperatorId = OPERATOR_ID;
      persistSave();
      renderBasePanel();
      notify(Ls('凌霜已解锁并已选择。', 'Lingshuang unlocked and selected.'), 'success');
    });

    persistSave();

    const HARBOR_OBSTACLES = [
      { id: 'bt-cargo-01', x: -88, z: -54, w: 26, d: 7, h: 5.2, color: '#315a78' },
      { id: 'bt-cargo-02', x: -88, z: -35, w: 18, d: 7, h: 3.8, color: '#8d583c' },
      { id: 'bt-cargo-03', x: -84, z: 20, w: 28, d: 7, h: 5.2, color: '#355f78' },
      { id: 'bt-cargo-04', x: -82, z: 47, w: 20, d: 8, h: 4.4, color: '#7a4e3a' },
      { id: 'bt-cargo-05', x: -38, z: -86, w: 8, d: 28, h: 5.5, color: '#315a78' },
      { id: 'bt-cargo-06', x: -18, z: -86, w: 8, d: 22, h: 4.1, color: '#77623f' },
      { id: 'bt-cargo-07', x: 34, z: -82, w: 8, d: 30, h: 5.2, color: '#315a78' },
      { id: 'bt-cargo-08', x: 56, z: -80, w: 8, d: 21, h: 4.2, color: '#8d583c' },
      { id: 'bt-cargo-09', x: 84, z: -36, w: 25, d: 7, h: 5.2, color: '#315a78' },
      { id: 'bt-cargo-10', x: 86, z: -14, w: 18, d: 7, h: 4.1, color: '#77623f' },
      { id: 'bt-cargo-11', x: 88, z: 54, w: 24, d: 8, h: 5.1, color: '#315a78' },
      { id: 'bt-cargo-12', x: 62, z: 84, w: 8, d: 25, h: 4.6, color: '#7a4e3a' },
      { id: 'bt-cargo-13', x: 18, z: 88, w: 8, d: 24, h: 5.2, color: '#315a78' },
      { id: 'bt-cargo-14', x: -24, z: 88, w: 8, d: 20, h: 4.2, color: '#77623f' },
      { id: 'bt-dock-wall-a', x: 0, z: -111, w: 64, d: 4, h: 3.6, color: '#253e4a' },
      { id: 'bt-dock-wall-b', x: 0, z: 111, w: 70, d: 4, h: 3.6, color: '#253e4a' },
    ];

    const HARBOR_CACHE_SPOTS = [
      { x: -111, z: -18, pool: 'weapon', tier: 2, name: 'Dock Weapon Case' },
      { x: -108, z: 54, pool: 'tech', tier: 2, name: 'Crane Tool Locker' },
      { x: -72, z: 78, pool: 'valuable', tier: 3, name: 'Harbor Secure Cache' },
      { x: -48, z: 36, pool: 'med', tier: 2, name: 'Dockside Medical Case' },
      { x: -52, z: -18, pool: 'tech', tier: 2, name: 'Signal Parts Crate' },
      { x: -70, z: -104, pool: 'weapon', tier: 2, name: 'Drydock Weapon Case' },
      { x: -12, z: -64, pool: 'valuable', tier: 3, name: 'Manifest Lockbox' },
      { x: 18, z: -50, pool: 'med', tier: 2, name: 'Emergency Med Case' },
      { x: 52, z: -104, pool: 'tech', tier: 2, name: 'Crane Electronics' },
      { x: 72, z: -58, pool: 'weapon', tier: 2, name: 'Security Weapon Case' },
      { x: 108, z: -4, pool: 'valuable', tier: 3, name: 'Customs Lockbox' },
      { x: 104, z: 72, pool: 'med', tier: 2, name: 'Ferry Medical Case' },
      { x: 58, z: 62, pool: 'tech', tier: 2, name: 'Relay Equipment' },
      { x: 28, z: 104, pool: 'valuable', tier: 3, name: 'Captain Cache' },
      { x: -18, z: 66, pool: 'weapon', tier: 2, name: 'Dock Armory Box' },
      { x: -56, z: 106, pool: 'tech', tier: 2, name: 'Maintenance Locker' },
      { x: 6, z: 34, pool: 'valuable', tier: 3, name: 'Harbor Data Vault' },
      { x: 56, z: 18, pool: 'med', tier: 2, name: 'Crew Medical Case' },
    ];

    const HARBOR_ENEMY_SPOTS = [
      [-104, -88], [-78, -72], [-52, -58], [-24, -96],
      [10, -84], [44, -62], [76, -88], [108, -54],
      [96, -8], [108, 46], [78, 76], [42, 98],
      [4, 78], [-38, 104], [-72, 72], [-108, 34],
      [-92, 4], [-52, 16], [-8, -26], [40, 28],
    ];

    let activeMapRoot = null;
    let activeMapFog = null;
    const activeMapObstacleIds = new Set();

    const createMapBox = (root, def) => {
      const mesh = BABYLON.MeshBuilder.CreateBox(def.id, { width: def.w, height: def.h, depth: def.d }, scene);
      mesh.parent = root;
      mesh.position = new BABYLON.Vector3(def.x, def.h / 2, def.z);
      mesh.material = makeMaterial(def.id + '-mat', def.color, '#14232b');
      mesh.metadata = { raycastTarget: 'obstacle', obstacleId: def.id, blackTideMap: true };
      world.obstacleMeshes.push(mesh);
      return mesh;
    };

    const cleanupBlackTideMap = () => {
      if (!activeMapRoot && !activeMapObstacleIds.size) return;
      for (let index = obstacleDefs.length - 1; index >= 0; index -= 1) {
        if (activeMapObstacleIds.has(obstacleDefs[index]?.id)) obstacleDefs.splice(index, 1);
      }
      for (let index = world.obstacleMeshes.length - 1; index >= 0; index -= 1) {
        const mesh = world.obstacleMeshes[index];
        if (activeMapObstacleIds.has(mesh?.metadata?.obstacleId)) world.obstacleMeshes.splice(index, 1);
      }
      activeMapRoot?.dispose(false, true);
      activeMapRoot = null;
      activeMapObstacleIds.clear();
      if (activeMapFog) {
        scene.fogDensity = activeMapFog.density;
        scene.fogColor = activeMapFog.color;
        activeMapFog = null;
      }
      debug.mapCleanups += 1;
    };

    const mountBlackTideMap = (raid) => {
      cleanupBlackTideMap();
      activeMapFog = {
        density: scene.fogDensity,
        color: scene.fogColor?.clone?.() ?? scene.fogColor,
      };
      scene.fogDensity = Math.max(Number(scene.fogDensity ?? 0), 0.0115);
      scene.fogColor = BABYLON.Color3.FromHexString('#102834');

      const root = new BABYLON.TransformNode('black-tide-harbor-root', scene);
      activeMapRoot = root;

      for (const source of HARBOR_OBSTACLES) {
        const def = { ...source, mapColor: source.color, blackTideMap: true };
        obstacleDefs.push(def);
        activeMapObstacleIds.add(def.id);
        createMapBox(root, def);
      }

      const laneMat = makeMaterial('black-tide-dock-lane-mat', '#173b4b', '#0b1f28');
      for (const [index, z] of [-118, 118].entries()) {
        const lane = BABYLON.MeshBuilder.CreateBox('black-tide-dock-lane-' + index, { width: 232, height: 0.035, depth: 8 }, scene);
        lane.parent = root;
        lane.position.set(0, 0.022, z);
        lane.material = laneMat;
        lane.isPickable = false;
      }

      raid.mapId = MAP_ID;
      raid.mapNameZh = '黑潮港';
      raid.mapNameEn = 'Black Tide Harbor';
      raid.isBlackTide = true;
      raid.blackTideThreatClock = 0;
      raid.blackTideThreatLevel = 0;
      raid.spawnSafeTimer = Math.min(raid.spawnSafeTimer ?? 6, 6);
      raid.spawnSafeRadius = Math.min(raid.spawnSafeRadius ?? 62, 62);

      const playerSpawn = resolveStaticPlacement(-120, 96, 1.4);
      raid.player.x = playerSpawn.x;
      raid.player.z = playerSpawn.z;
      raid.player.yaw = Math.PI * 0.56;
      raid.spawnSafeCenterX = playerSpawn.x;
      raid.spawnSafeCenterZ = playerSpawn.z;

      for (let index = 0; index < raid.containers.length; index += 1) {
        const container = raid.containers[index];
        const spot = HARBOR_CACHE_SPOTS[index % HARBOR_CACHE_SPOTS.length];
        const cycle = Math.floor(index / HARBOR_CACHE_SPOTS.length);
        const resolved = resolveStaticPlacement(spot.x + cycle * 3.5, spot.z - cycle * 3.5, 1.45);
        container.x = resolved.x;
        container.z = resolved.z;
        container.pool = spot.pool;
        container.tier = spot.tier;
        container.name = spot.name;
        container.opened = false;
        container.items = generateContainerLoot(container);
        container.blackTideCache = true;
        if (container.visual?.root) {
          container.visual.root.position.x = container.x;
          container.visual.root.position.z = container.z;
        }
      }

      for (let index = 0; index < raid.enemies.length; index += 1) {
        const enemy = raid.enemies[index];
        const spot = HARBOR_ENEMY_SPOTS[index % HARBOR_ENEMY_SPOTS.length];
        const cycle = Math.floor(index / HARBOR_ENEMY_SPOTS.length);
        const resolved = resolveStaticPlacement(spot[0] + cycle * 2.8, spot[1] + cycle * 2.4, enemy.radius ?? 0.72);
        enemy.x = resolved.x;
        enemy.z = resolved.z;
        enemy.lastKnownPlayerX = resolved.x;
        enemy.lastKnownPlayerZ = resolved.z;
        enemy.route = [
          { x: resolved.x, z: resolved.z },
          { x: Math.max(-132, Math.min(132, resolved.x + 10)), z: resolved.z },
          { x: resolved.x, z: Math.max(-132, Math.min(132, resolved.z + 10)) },
        ];
        enemy.routeIndex = 0;
        enemy.blackTideThreatLevel = 0;
        if (!enemy.blackTideBaseTuned) {
          enemy.blackTideBaseTuned = true;
          enemy.speed = (enemy.speed ?? 2.5) * 1.03;
          enemy.detectRange = (enemy.detectRange ?? 28) * 1.04;
        }
        if (enemy.visual?.root) {
          enemy.visual.root.position.x = enemy.x;
          enemy.visual.root.position.z = enemy.z;
        }
      }

      syncPlayerCamera?.();
      raid.statusText = Ls('黑潮港 · 警戒 0/3 · 搜索 3 处并击败 8 人。', 'Black Tide Harbor · Alert 0/3 · Search 3 caches and defeat 8 hostiles.');
      debug.mapMounts += 1;
    };

    const startBeforeBlackTide = startRaid;
    startRaid = function startRaidWithBlackTide(...args) {
      const result = startBeforeBlackTide.apply(this, args);
      const raid = state.raid;
      if (!raid) return result;

      if (raid.player?.operatorId === OPERATOR_ID) {
        raid.player.utilityItems = 1;
        raid.player.utilityMaxItems = PRISM_MAX;
        raid.player.utilityGainInterval = PRISM_REFILL;
        raid.player.utilityGainTimer = PRISM_REFILL;
        raid.player.phaseBarrierTimer = 0;
        raid.player.phaseBarrierHp = 0;
        raid.player.phaseBarrierVisual = null;
        raid.player.frostCanisters = 2;
        raid.player.frostCanisterGainTimer = 12;
      }

      if (raid.modeId === MODE_ID) mountBlackTideMap(raid);
      return result;
    };

    const clearBeforeBlackTide = clearRaid;
    clearRaid = function clearRaidWithBlackTideCleanup(...args) {
      const result = clearBeforeBlackTide.apply(this, args);
      cleanupBlackTideMap();
      return result;
    };

    const abilityBeforeWarden = useOperatorAbility;
    useOperatorAbility = function useLingshuangAbility(...args) {
      const player = state.raid?.player;
      if (player?.operatorId !== OPERATOR_ID) return abilityBeforeWarden.apply(this, args);
      if (state.overlay || player.health <= 0 || (player.dropTimer ?? 0) > 0) return;
      if ((player.abilityActiveTimer ?? 0) > 0 || (player.skillUses ?? 0) <= 0) return;
      player.skillUses -= 1;
      player.abilityCharges = player.skillUses;
      player.abilityActiveTimer = PHASE_DURATION;
      player.operatorEffectTimer = PHASE_DURATION;
      spawnPulse?.(new BABYLON.Vector3(player.x, 1, player.z), '#7cecff', 0.17, 0.22);
      notify(Ls(`相位推进启动：50 秒内移速提升至 3.0×，受到伤害降低 85%。剩余技能 ${player.skillUses}/4。`, `Phase Drive active: +66.7% phase movement and 85% damage reduction for 50s. Uses left: ${player.skillUses}/4.`), 'success');
      syncHud();
      return true;
    };

    const speedBeforeWarden = getPlayerMoveSpeed;
    getPlayerMoveSpeed = function getLingshuangMoveSpeed(player, sprinting = false) {
      const speed = speedBeforeWarden(player, sprinting);
      return player?.operatorId === OPERATOR_ID && (player.abilityActiveTimer ?? 0) > 0
        ? speed * PHASE_MOVE_MULT
        : speed;
    };

    const disposePrismVisual = (player) => {
      player?.phaseBarrierVisual?.dispose?.(false, true);
      if (player) player.phaseBarrierVisual = null;
    };

    const createPrismVisual = (player) => {
      disposePrismVisual(player);
      const sphere = BABYLON.MeshBuilder.CreateSphere('lingshuang-prism-shield', { diameter: 2.45, segments: 14 }, scene);
      const mat = new BABYLON.StandardMaterial('lingshuang-prism-shield-mat', scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString('#62bfff');
      mat.emissiveColor = BABYLON.Color3.FromHexString('#62e5ff').scale(0.85);
      mat.specularColor = BABYLON.Color3.FromHexString('#e7ffff');
      mat.alpha = 0.13;
      mat.wireframe = true;
      mat.backFaceCulling = false;
      sphere.material = mat;
      sphere.isPickable = false;
      sphere.position.set(player.x, 1.05, player.z);
      player.phaseBarrierVisual = sphere;
      return sphere;
    };

    const usePrismShield = () => {
      const player = state.raid?.player;
      if (!player || player.operatorId !== OPERATOR_ID || state.overlay || player.health <= 0 || (player.dropTimer ?? 0) > 0) return false;
      if ((player.phaseBarrierTimer ?? 0) > 0 && (player.phaseBarrierHp ?? 0) > 0) {
        notify(Ls('棱镜盾仍在生效。', 'Prism Shield is already active.'), 'warning');
        return false;
      }
      if ((player.utilityItems ?? 0) <= 0) {
        notify(Ls('棱镜盾不足，等待补充。', 'No Prism Shield charge available. Wait for a resupply.'), 'warning');
        return false;
      }
      player.utilityItems -= 1;
      player.utilityGainInterval = PRISM_REFILL;
      if (player.utilityItems < PRISM_MAX && (player.utilityGainTimer ?? 0) <= 0) player.utilityGainTimer = PRISM_REFILL;
      player.phaseBarrierHp = PRISM_HP;
      player.phaseBarrierTimer = PRISM_DURATION;
      createPrismVisual(player);
      spawnPulse?.(new BABYLON.Vector3(player.x, 1, player.z), '#62e5ff', 0.2, 0.3);
      notify(Ls('棱镜盾已展开：1000 点护盾，持续 10 秒。', 'Prism Shield deployed: 1000 shield for 10 seconds.'), 'success');
      syncHud();
      return true;
    };
    debug.usePrismShield = usePrismShield;

    window.addEventListener('keydown', (event) => {
      const player = state.raid?.player;
      const lower = event.key?.toLowerCase?.() ?? '';
      if (
        player?.operatorId === OPERATOR_ID &&
        (event.code === 'KeyG' || lower === 'g') &&
        !event.repeat &&
        state.mode === 'raid'
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        usePrismShield();
      }
    }, true);

    const FROST_RADIUS = 5;
    const FROST_DURATION = 5;
    const disposeFrostField = (field) => {
      field?.root?.dispose?.(false, true);
      field?.ice?.dispose?.(false, true);
      field?.canister?.dispose?.(false, true);
    };
    const createFrostField = (raid, x, z) => {
      raid.lingshuangFrostFields ??= [];
      const root = new BABYLON.TransformNode('lingshuang-frost-field', scene);
      root.position.set(x, 0.03, z);

      const ice = BABYLON.MeshBuilder.CreateCylinder('lingshuang-frost-ice', { diameter: FROST_RADIUS * 2, height: 0.055, tessellation: 48 }, scene);
      ice.parent = root;
      ice.isPickable = false;
      const iceMat = new BABYLON.StandardMaterial('lingshuang-frost-ice-mat', scene);
      iceMat.diffuseColor = BABYLON.Color3.FromHexString('#a8efff');
      iceMat.emissiveColor = BABYLON.Color3.FromHexString('#57cfff').scale(0.5);
      iceMat.specularColor = BABYLON.Color3.FromHexString('#ffffff');
      iceMat.alpha = 0.52;
      iceMat.backFaceCulling = false;
      ice.material = iceMat;
      ice.scaling.set(0.04, 1, 0.04);

      const canister = BABYLON.MeshBuilder.CreateCylinder('lingshuang-frost-canister', { diameter: 0.34, height: 0.78, tessellation: 12 }, scene);
      canister.parent = root;
      canister.position.y = 0.42;
      canister.rotation.z = Math.PI * 0.48;
      canister.isPickable = false;
      const canMat = new BABYLON.StandardMaterial('lingshuang-frost-canister-mat', scene);
      canMat.diffuseColor = BABYLON.Color3.FromHexString('#1e5f86');
      canMat.emissiveColor = BABYLON.Color3.FromHexString('#58dfff').scale(0.42);
      canMat.specularColor = BABYLON.Color3.FromHexString('#dfffff');
      canister.material = canMat;

      const field = { x, z, timer: FROST_DURATION, age: 0, root, ice, canister };
      raid.lingshuangFrostFields.push(field);
      spawnPulse?.(new BABYLON.Vector3(x, 0.25, z), '#9eeeff', 0.42, 0.5);
      return field;
    };
    const useFrostCanister = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || player.operatorId !== OPERATOR_ID || state.overlay || player.health <= 0 || (player.dropTimer ?? 0) > 0) return false;
      if ((player.frostCanisters ?? 0) <= 0) {
        notify(Ls('极寒冷罐不足，等待补充。', 'No Frost Canister available.'), 'warning');
        return false;
      }
      player.frostCanisters -= 1;
      const startX = player.x;
      const startZ = player.z;
      const targetX = startX + Math.sin(player.yaw ?? 0) * 8;
      const targetZ = startZ + Math.cos(player.yaw ?? 0) * 8;
      const throwRoot = new BABYLON.TransformNode('lingshuang-frost-throw', scene);
      const canister = BABYLON.MeshBuilder.CreateCylinder('lingshuang-frost-canister-flight', { diameter: 0.3, height: 0.72, tessellation: 12 }, scene);
      canister.parent = throwRoot;
      canister.rotation.z = Math.PI / 2;
      canister.isPickable = false;
      const mat = new BABYLON.StandardMaterial('lingshuang-frost-canister-flight-mat', scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString('#1d638b');
      mat.emissiveColor = BABYLON.Color3.FromHexString('#63e6ff').scale(0.48);
      mat.specularColor = BABYLON.Color3.FromHexString('#eaffff');
      canister.material = mat;
      throwRoot.position.set(startX, 1.35, startZ);
      raid.lingshuangFrostThrows ??= [];
      raid.lingshuangFrostThrows.push({ root: throwRoot, timer: 0.46, duration: 0.46, startX, startZ, targetX, targetZ });
      notify(Ls('极寒冷罐已投出。', 'Frost Canister thrown.'), 'success');
      return true;
    };
    debug.useFrostCanister = useFrostCanister;

    window.addEventListener('keydown', (event) => {
      const player = state.raid?.player;
      if (player?.operatorId === OPERATOR_ID && event.code === 'KeyI' && !event.repeat && state.mode === 'raid') {
        event.preventDefault();
        event.stopImmediatePropagation();
        useFrostCanister();
      }
    }, true);

    document.addEventListener('pointerdown', (event) => {
      const player = state.raid?.player;
      const button = event.target?.closest?.('#utilityActionButton');
      if (!button || player?.operatorId !== OPERATOR_ID || state.mode !== 'raid') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      usePrismShield();
    }, true);

    let prismDamageSource = null;
    const shootBeforePrismReflect = enemyShoot;
    enemyShoot = function prismTrackedEnemyShot(enemy, options = {}) {
      prismDamageSource = enemy;
      try { return shootBeforePrismReflect(enemy, options); }
      finally { prismDamageSource = null; }
    };

    const hurtBeforeWarden = applyDamageToPlayer;
    applyDamageToPlayer = function lingshuangDamageProtection(amount) {
      const player = state.raid?.player;
      if (player?.operatorId !== OPERATOR_ID) return hurtBeforeWarden(amount);

      const rawIncoming = Math.max(0, Number(amount) || 0);
      if ((player.phaseBarrierTimer ?? 0) > 0 && (player.phaseBarrierHp ?? 0) > 0 && rawIncoming > 0) {
        player.phaseBarrierHp = Math.max(0, player.phaseBarrierHp - rawIncoming);
        const source = prismDamageSource;
        if (source && !source.dead && !source.despawned) {
          damageEnemy(source, rawIncoming, { ignoreSmoke: true });
          spawnImpactBurst?.(new BABYLON.Vector3(source.x, 1.05, source.z), '#62e5ff', 0.85, 'hard');
        }
        spawnPulse?.(new BABYLON.Vector3(player.x, 1, player.z), '#62e5ff', 0.08, 0.08);
        if (player.phaseBarrierHp <= 0.001) {
          player.phaseBarrierHp = 0;
          player.phaseBarrierTimer = 0;
          disposePrismVisual(player);
          notify(Ls('棱镜盾已耗尽。', 'Prism Shield depleted.'), 'warning');
        }
        return;
      }

      let incoming = rawIncoming;
      if ((player.abilityActiveTimer ?? 0) > 0) incoming *= PHASE_DAMAGE_MULT;
      if (incoming <= 0.001) return;
      return hurtBeforeWarden(incoming);
    };

    const applyThreatToEnemy = (enemy, level) => {
      if (!enemy || enemy.dead || enemy.despawned || enemy.isRangeTarget) return;
      enemy.blackTideThreatLevel ??= 0;
      while (enemy.blackTideThreatLevel < level) {
        enemy.speed = (enemy.speed ?? 2.5) * 1.025;
        enemy.detectRange = (enemy.detectRange ?? 28) * 1.03;
        enemy.fireInterval = Math.max(0.34, (enemy.fireInterval ?? 1) * 0.985);
        enemy.blackTideThreatLevel += 1;
      }
    };

    const syncWardenUi = () => {
      const player = state.raid?.player;
      if (player?.operatorId !== OPERATOR_ID) return;
      const value = document.getElementById('operatorUtilityValue');
      const detail = document.getElementById('operatorUtilityDetail');
      const fill = document.getElementById('operatorUtilityFill');
      const button = document.getElementById('utilityActionButton');
      const count = Math.max(0, Number(player.utilityItems ?? 0));
      const timer = Math.max(0, Number(player.utilityGainTimer ?? PRISM_REFILL));
      if (value) value.textContent = `${Ls('棱镜盾', 'Prism Shield')} ${count}/${PRISM_MAX}`;
      if (detail) {
        detail.textContent = (player.phaseBarrierTimer ?? 0) > 0
          ? Ls(`护盾 ${Math.ceil(player.phaseBarrierHp ?? 0)}/${PRISM_HP} · ${(player.phaseBarrierTimer ?? 0).toFixed(1)}s`, `Shield ${Math.ceil(player.phaseBarrierHp ?? 0)}/${PRISM_HP} · ${(player.phaseBarrierTimer ?? 0).toFixed(1)}s`)
          : count >= PRISM_MAX
            ? Ls('已满，按 G 使用', 'Full. Press G to use')
            : Ls(`${timer.toFixed(0)} 秒后补充 1 个`, `+1 in ${timer.toFixed(0)}s`);
      }
      if (fill) {
        const ratio = (player.phaseBarrierTimer ?? 0) > 0
          ? Math.max(0, Math.min(1, (player.phaseBarrierHp ?? 0) / PRISM_HP))
          : count >= PRISM_MAX ? 1 : Math.max(0, Math.min(1, 1 - timer / PRISM_REFILL));
        fill.style.width = `${Math.round(ratio * 100)}%`;
        fill.style.background = '#62e5ff';
      }
      if (button) {
        button.textContent = `${Ls('棱镜盾', 'Prism Shield')} G`;
        button.title = Ls('展开棱镜盾', 'Deploy Prism Shield');
      }
    };

    if (typeof renderRaidLoadoutMarkup === 'function') {
      const loadoutBeforeWarden = renderRaidLoadoutMarkup;
      renderRaidLoadoutMarkup = function renderLingshuangLoadout() {
        const html = loadoutBeforeWarden();
        if (state.raid?.player?.operatorId !== OPERATOR_ID) return html;
        return String(html)
          .replace(/增益烟雾/g, '棱镜盾')
          .replace(/Recovery Smoke/g, 'Prism Shield');
      };
    }

    const syncBeforeWarden = syncHud;
    syncHud = function syncHudWithBlackTide(...args) {
      const result = syncBeforeWarden.apply(this, args);
      syncWardenUi();
      const raid = state.raid;
      if (raid?.isBlackTide && refs.raidStatus) {
        refs.raidStatus.dataset.blackTideThreat = String(raid.blackTideThreatLevel ?? 0);
      }
      return result;
    };

    const updateEnemiesBeforeFrost = typeof updateEnemies === 'function' ? updateEnemies : null;
    if (updateEnemiesBeforeFrost) {
      updateEnemies = function updateEnemiesWithFrostFreeze(dt, ...args) {
        const raid = state.raid;
        const frozen = [];
        for (const enemy of raid?.enemies ?? []) {
          if (!enemy.lingshuangIceFrozen || enemy.dead || enemy.despawned) continue;
          frozen.push([enemy, enemy.x, enemy.z]);
        }
        const result = updateEnemiesBeforeFrost.call(this, dt, ...args);
        for (const [enemy, x, z] of frozen) {
          if (!enemy.lingshuangIceFrozen || enemy.dead || enemy.despawned) continue;
          enemy.x = x;
          enemy.z = z;
          enemy.velocityX = 0;
          enemy.velocityZ = 0;
          if (enemy.visual?.root) {
            enemy.visual.root.position.x = x;
            enemy.visual.root.position.z = z;
          }
        }
        return result;
      };
    }

    const updateBeforeBlackTide = updateRaid;
    updateRaid = function updateBlackTideAndLingshuang(dt, ...args) {
      const result = updateBeforeBlackTide.call(this, dt, ...args);
      const raid = state.raid;
      const player = raid?.player;

      if (player?.operatorId === OPERATOR_ID) {
        player.utilityMaxItems = PRISM_MAX;
        player.utilityGainInterval = PRISM_REFILL;
        player.maxStamina = 650;
        player.stamina = Math.min(650, Number(player.stamina ?? 650));
        if ((player.frostCanisters ?? 0) < 2) {
          player.frostCanisterGainTimer = Math.max(0, (player.frostCanisterGainTimer ?? 12) - dt);
          if (player.frostCanisterGainTimer <= 0) {
            player.frostCanisters = Math.min(2, (player.frostCanisters ?? 0) + 1);
            player.frostCanisterGainTimer = (player.frostCanisters ?? 0) >= 2 ? 0 : 12;
          }
        }
        if (raid.lingshuangFrostThrows?.length) {
          for (const thrown of raid.lingshuangFrostThrows) {
            thrown.timer = Math.max(0, thrown.timer - dt);
            const progress = 1 - thrown.timer / thrown.duration;
            const arc = Math.sin(Math.min(1, progress) * Math.PI) * 2.25;
            thrown.root.position.x = thrown.startX + (thrown.targetX - thrown.startX) * progress;
            thrown.root.position.z = thrown.startZ + (thrown.targetZ - thrown.startZ) * progress;
            thrown.root.position.y = 0.16 + arc;
            thrown.root.rotation.x += dt * 10;
            thrown.root.rotation.z += dt * 7;
            if (thrown.timer <= 0) {
              thrown.root.dispose?.(false, true);
              createFrostField(raid, thrown.targetX, thrown.targetZ);
            }
          }
          raid.lingshuangFrostThrows = raid.lingshuangFrostThrows.filter((thrown) => thrown.timer > 0);
        }
        if (raid.lingshuangFrostFields?.length) {
          for (const field of raid.lingshuangFrostFields) {
            field.timer = Math.max(0, field.timer - dt);
            field.age += dt;
            const grow = Math.min(1, field.age / 0.28);
            field.ice?.scaling?.set(grow, 1, grow);
            if (field.canister) {
              field.canister.rotation.y += dt * 1.8;
              field.canister.position.y = 0.38 + Math.sin(field.age * 8) * 0.025;
            }
            for (const enemy of raid.enemies ?? []) {
              if (enemy.dead || enemy.despawned || distance2D(field.x, field.z, enemy.x, enemy.z) > FROST_RADIUS) continue;
              enemy.lingshuangIceFrozen = true;
              enemy.lingshuangIceX = enemy.x;
              enemy.lingshuangIceZ = enemy.z;
            }
            if (field.timer <= 0) disposeFrostField(field);
          }
          raid.lingshuangFrostFields = raid.lingshuangFrostFields.filter((field) => field.timer > 0);
        }
        for (const enemy of raid.enemies ?? []) {
          const onIce = (raid.lingshuangFrostFields ?? []).some((field) => field.timer > 0 && distance2D(field.x, field.z, enemy.x, enemy.z) <= FROST_RADIUS);
          if (enemy.lingshuangIceFrozen && !onIce) enemy.lingshuangIceFrozen = false;
        }
        player.phaseBarrierTimer = Math.max(0, (player.phaseBarrierTimer ?? 0) - dt);
        if ((player.phaseBarrierTimer ?? 0) <= 0 && player.phaseBarrierVisual) {
          player.phaseBarrierHp = 0;
          disposePrismVisual(player);
        }
        if (player.phaseBarrierVisual) {
          player.phaseBarrierVisual.position.x = player.x;
          player.phaseBarrierVisual.position.y = 1.05;
          player.phaseBarrierVisual.position.z = player.z;
          const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.035;
          player.phaseBarrierVisual.scaling.set(pulse, pulse, pulse);
        }
        syncWardenUi();
      }

      if (raid?.isBlackTide) {
        raid.blackTideThreatClock = (raid.blackTideThreatClock ?? 0) + dt;
        const nextLevel = Math.min(THREAT_MAX, Math.floor(raid.blackTideThreatClock / THREAT_STEP));
        if (nextLevel > (raid.blackTideThreatLevel ?? 0)) {
          raid.blackTideThreatLevel = nextLevel;
          debug.threatEscalations += 1;
          notify(
            Ls(`黑潮警戒提升至 ${nextLevel}/${THREAT_MAX}：敌人反应与推进速度增强。`, `Black Tide alert increased to ${nextLevel}/${THREAT_MAX}: enemy reaction and push speed increased.`),
            'warning',
          );
        }
        for (const enemy of raid.enemies ?? []) applyThreatToEnemy(enemy, raid.blackTideThreatLevel ?? 0);
      }

      return result;
    };

    if (state.save.lingshuangUnlocked && preload.selectedOperatorId === OPERATOR_ID) {
      state.save.selectedOperatorId = OPERATOR_ID;
    }
    if (preload.selectedModeId === MODE_ID) state.save.selectedModeId = MODE_ID;
    persistSave();
    if (state.mode === 'base') renderBasePanel();
  };

  boot();
})();
