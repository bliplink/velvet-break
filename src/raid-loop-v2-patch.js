(() => {
  if (window.__sdrRaidLoopV2Waiting || window.__sdrRaidLoopV2Applied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof startRaid !== 'function' ||
      typeof openLootPanel !== 'function' ||
      typeof weightedPick !== 'function' ||
      typeof createLootInstance !== 'function' ||
      typeof lootCatalog === 'undefined'
    ) {
      window.__sdrRaidLoopV2Waiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    const design = window.__sdrRaidDesignConfig;
    if (!design?.resolvePoi) {
      window.__sdrRaidLoopV2Waiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrRaidLoopV2Waiting = false;
    if (window.__sdrRaidLoopV2Applied) return;
    window.__sdrRaidLoopV2Applied = true;

    const RISK_BONUS_CHANCE = {
      high: 0.34,
      medium: 0.14,
    };
    const RARITY_RANK = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      red: 5,
    };

    const debug = {
      version: '2026-09-19-raid-loop-v2',
      highRiskContainers: 0,
      mediumRiskContainers: 0,
      bonusLootRolls: 0,
      tunedEnemies: 0,
      highRiskEnemies: 0,
      alertBursts: 0,
      lastAlert: null,
      getRiskAt: (x, z) => design.resolvePoi(x, z)?.risk ?? 'low',
      reapply: null,
      applyContainerRisk: null,
      applyEnemyRisk: null,
    };
    window.__sdrRaidLoopV2Debug = debug;

    const riskAt = (x, z) => {
      const poi = design.resolvePoi(x, z);
      return {
        risk: poi?.risk ?? 'low',
        poi: poi ?? null,
      };
    };

    const candidatePool = (container, risk) => {
      const minimumRank = risk === 'high' ? 2 : 2;
      return lootCatalog.filter(item =>
        item?.pools?.includes(container.pool) &&
        (RARITY_RANK[item.rarity] ?? 0) >= minimumRank
      );
    };

    const applyContainerRisk = (container, options = {}) => {
      if (!container) return container;
      const info = riskAt(container.x, container.z);
      container.raidRiskTier = info.risk;
      container.raidPoiId = info.poi?.id ?? null;

      if (info.risk === 'high') debug.highRiskContainers += container.__riskCounted ? 0 : 1;
      if (info.risk === 'medium') debug.mediumRiskContainers += container.__riskCounted ? 0 : 1;
      container.__riskCounted = true;

      if (container.riskLootApplied) return container;
      container.riskLootApplied = true;

      const chance = RISK_BONUS_CHANCE[info.risk] ?? 0;
      if (chance <= 0) return container;
      if (!options.forceBonus && Math.random() >= chance) return container;

      const candidates = candidatePool(container, info.risk);
      const picked = weightedPick(
        candidates,
        item => Math.max(0.001, (item.spawnWeight ?? 1) * (1 + (RARITY_RANK[item.rarity] ?? 0) * 0.18)),
      );
      if (!picked) return container;

      const bonus = createLootInstance(picked);
      bonus.riskBonus = true;
      bonus.riskSource = info.poi?.id ?? info.risk;
      container.items ??= [];
      container.items.push(bonus);
      container.riskBonusItemId = bonus.uid;
      debug.bonusLootRolls += 1;
      return container;
    };

    const applyEnemyRisk = (enemy) => {
      if (!enemy || enemy.raidRiskTuned || enemy.dead || enemy.despawned) return enemy;
      if (enemy.isNamelessBoss || enemy.isNamelessMinion || enemy.isRangeTarget) return enemy;

      const info = riskAt(enemy.x, enemy.z);
      enemy.raidRiskTier = info.risk;
      enemy.raidPoiId = info.poi?.id ?? null;
      enemy.raidRiskTuned = true;

      const healthMult = info.risk === 'high' ? 1.10 : info.risk === 'medium' ? 1.045 : 1;
      const damageMult = info.risk === 'high' ? 1.08 : info.risk === 'medium' ? 1.035 : 1;
      const detectMult = info.risk === 'high' ? 1.15 : info.risk === 'medium' ? 1.07 : 1;

      if (healthMult !== 1) {
        enemy.maxHealth = Math.max(1, Math.round((enemy.maxHealth ?? enemy.health ?? 1) * healthMult));
        enemy.health = Math.min(enemy.maxHealth, Math.max(1, Math.round((enemy.health ?? enemy.maxHealth) * healthMult)));
      }
      enemy.damage = Math.max(1, (enemy.damage ?? 1) * damageMult);
      enemy.detectRange = Math.max(enemy.detectRange ?? 0, (enemy.detectRange ?? 0) * detectMult);
      if (info.risk === 'high') {
        enemy.accuracyBonus = (enemy.accuracyBonus ?? 0) + 0.025;
        enemy.fireInterval = Math.max(0.35, (enemy.fireInterval ?? 1) * 0.96);
        debug.highRiskEnemies += 1;
      } else if (info.risk === 'medium') {
        enemy.accuracyBonus = (enemy.accuracyBonus ?? 0) + 0.01;
      }
      if (info.risk !== 'low') debug.tunedEnemies += 1;
      return enemy;
    };

    const applyRiskToRaid = (raid = state.raid) => {
      if (!raid) return;
      for (const container of raid.containers ?? []) applyContainerRisk(container);
      for (const enemy of raid.enemies ?? []) applyEnemyRisk(enemy);
      debug.highRiskContainers = (raid.containers ?? []).filter(container => container.raidRiskTier === 'high').length;
      debug.mediumRiskContainers = (raid.containers ?? []).filter(container => container.raidRiskTier === 'medium').length;
      debug.tunedEnemies = (raid.enemies ?? []).filter(enemy => enemy.raidRiskTier === 'high' || enemy.raidRiskTier === 'medium').length;
      debug.highRiskEnemies = (raid.enemies ?? []).filter(enemy => enemy.raidRiskTier === 'high').length;
    };

    debug.applyContainerRisk = applyContainerRisk;
    debug.applyEnemyRisk = applyEnemyRisk;
    debug.reapply = applyRiskToRaid;

    const startBeforeRisk = startRaid;
    startRaid = function startRaidWithRiskReward(...args) {
      const result = startBeforeRisk.apply(this, args);
      if (state.raid) {
        window.setTimeout(() => applyRiskToRaid(state.raid), 0);
      }
      return result;
    };

    const openBeforeRisk = openLootPanel;
    openLootPanel = function openLootWithThreat(container, ...args) {
      const firstOpen = Boolean(container && !container.opened);
      const result = openBeforeRisk.call(this, container, ...args);
      if (!firstOpen || !container || container.raidRiskTier !== 'high') return result;

      const bestRank = Math.max(
        -1,
        ...(container.items ?? []).map(item => RARITY_RANK[item?.rarity] ?? -1),
      );
      if (bestRank < 3) return result;

      const raid = state.raid;
      if (!raid?.player) return result;
      let alerted = 0;
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget) continue;
        const distance = Math.hypot(enemy.x - container.x, enemy.z - container.z);
        if (distance > 42) continue;
        enemy.alertTimer = Math.max(enemy.alertTimer ?? 0, 7);
        enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 6);
        enemy.combatState = enemy.combatState === 'combat' ? 'combat' : 'investigate';
        enemy.lastKnownPlayerX = container.x;
        enemy.lastKnownPlayerZ = container.z;
        enemy.broadcastCooldown = Math.min(enemy.broadcastCooldown ?? 0.4, 0.35);
        alerted += 1;
      }

      if (alerted > 0) {
        debug.alertBursts += 1;
        debug.lastAlert = {
          containerId: container.id,
          alerted,
          x: container.x,
          z: container.z,
        };
        if (typeof notify === 'function') {
          notify(
            typeof L === 'function'
              ? L(`高价值搜索暴露了位置：附近 ${alerted} 名敌人进入警戒。`, `High-value search exposed your position: ${alerted} nearby hostiles alerted.`)
              : `High-value search alerted ${alerted} nearby hostiles.`,
            'warning',
          );
        }
      }
      return result;
    };

    const updateBeforeRisk = typeof updateRaid === 'function' ? updateRaid : null;
    if (updateBeforeRisk) {
      let riskRefreshTimer = 0;
      updateRaid = function updateRaidRiskRefresh(dt, ...args) {
        const result = updateBeforeRisk.call(this, dt, ...args);
        riskRefreshTimer -= dt;
        if (riskRefreshTimer <= 0 && state.raid) {
          riskRefreshTimer = 2.5;
          for (const enemy of state.raid.enemies ?? []) {
            if (!enemy.raidRiskTuned) applyEnemyRisk(enemy);
          }
        }
        return result;
      };
    }

    applyRiskToRaid(state.raid);
  };

  boot();
})();