(() => {
  if (window.__sdrModeNoveltyApplied || window.__sdrModeNoveltyWaiting) return;
  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof startRaid !== 'function' ||
      typeof updateRaid !== 'function' ||
      typeof killEnemy !== 'function' ||
      typeof openLootPanel !== 'function' ||
      typeof getPlayerMoveSpeed !== 'function' ||
      typeof reloadWeapon !== 'function' ||
      typeof advanceRaidObjective !== 'function'
    ) {
      window.__sdrModeNoveltyWaiting = true;
      window.setTimeout(boot, 80);
      return;
    }
    window.__sdrModeNoveltyWaiting = false;
    if (window.__sdrModeNoveltyApplied) return;
    window.__sdrModeNoveltyApplied = true;

    const debug = {
      version: '2026-10-02-mode-novelty-v2',
      blitzRelayCompletions: 0,
      lockdownGhostCaches: 0,
      blitzCouriersSpawned: 0,
      blitzCouriersKilled: 0,
      lastRelayId: null,
    };
    window.__sdrModeNoveltyDebug = debug;
    const Ls = (zh, en) => typeof L === 'function' ? L(zh, en) : en;


    const armLockdownGhostCache = (raid) => {
      if (!raid || raid.modeId !== 'raid') return null;
      const player = raid.player;
      const candidates = (raid.containers ?? [])
        .filter(container => !container.opened && !String(container.id ?? '').startsWith('drop-'))
        .slice()
        .sort((a, b) => {
          const da = player ? Math.hypot(a.x - player.x, a.z - player.z) : 0;
          const db = player ? Math.hypot(b.x - player.x, b.z - player.z) : 0;
          return db - da;
        });
      if (!candidates.length) return null;
      const pool = candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.45)));
      const target = pool[Math.floor(Math.random() * pool.length)];
      target.lockdownGhostCache = true;
      target.lockdownGhostOriginalName = target.name;
      target.name = Ls('无编号补给箱', 'Unnumbered Cache');
      raid.lockdownGhostCacheId = target.id;
      raid.lockdownGhostHintTimer = 6 + Math.random() * 8;
      return target;
    };

    const activateLockdownGhost = (raid, container) => {
      const player = raid?.player;
      if (!player || !container || raid.lockdownGhostTriggered) return;
      raid.lockdownGhostTriggered = true;
      raid.bonusReward = Math.max(0, Number(raid.bonusReward ?? 0)) + 1800;
      player.invisibilityTimer = Math.max(player.invisibilityTimer ?? 0, 6);
      player.lockdownGhostTimer = 18;
      debug.lockdownGhostCaches += 1;
      notify(Ls(
        '幽灵频段 617：信号遮蔽 6 秒，额外发现 1,800 行动奖金。',
        'Ghost frequency 617: 6s signal masking and +1,800 operation bonus.',
      ), 'success');
    };

    const markBlitzCourier = (raid) => {
      if (!raid || raid.blitzCourierId) return null;
      const candidates = (raid.enemies ?? []).filter(enemy =>
        !enemy.dead && !enemy.despawned && !enemy.isRangeTarget &&
        !enemy.isNamelessBoss && !enemy.isNamelessMinion
      );
      if (!candidates.length) return null;
      const player = raid.player;
      candidates.sort((a, b) => {
        const da = player ? Math.hypot(a.x - player.x, a.z - player.z) : 0;
        const db = player ? Math.hypot(b.x - player.x, b.z - player.z) : 0;
        return db - da;
      });
      const courier = candidates[0];
      courier.blitzCourier = true;
      courier.blitzCourierBaseName ??= courier.name;
      courier.name = Ls('404 信使', 'Courier 404');
      courier.maxHealth = Math.round((courier.maxHealth ?? courier.health ?? 100) * 1.65);
      courier.health = courier.maxHealth;
      courier.speed = (courier.speed ?? 2.5) * 1.35;
      courier.fireInterval = Math.max(0.24, (courier.fireInterval ?? 1) * 0.72);
      courier.accuracyBonus = (courier.accuracyBonus ?? 0) + 0.18;
      courier.combatSpeedMult = (courier.combatSpeedMult ?? 1) * 1.3;
      raid.blitzCourierId = courier.id;
      debug.blitzCouriersSpawned += 1;
      notify(Ls(
        '隐藏事件：检测到 404 信使。击败它可夺取额外突袭奖金。',
        'Hidden event: Courier 404 detected. Eliminate it for an extra Blitz bonus.',
      ), 'warning');
      return courier;
    };

    const assignBlackFileTarget = (raid) => {
      if (!raid || raid.contractBlackFileId || raid.contractBlackFileResolved) return null;
      const candidates = (raid.enemies ?? []).filter(enemy =>
        !enemy.dead && !enemy.despawned && !enemy.isRangeTarget &&
        !enemy.isNamelessBoss && !enemy.isNamelessMinion && !enemy.contractHvtActive
      );
      if (!candidates.length) return null;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      target.contractBlackFile = true;
      target.contractBlackFileBaseName ??= target.name;
      target.name = Ls('黑档案 NULL', 'Black File NULL');
      target.maxHealth = Math.round((target.maxHealth ?? target.health ?? 100) * 1.9);
      target.health = target.maxHealth;
      target.damage = Math.round((target.damage ?? 10) * 1.45);
      target.speed = (target.speed ?? 2.5) * 1.18;
      target.fireInterval = Math.max(0.24, (target.fireInterval ?? 1) * 0.76);
      target.accuracyBonus = (target.accuracyBonus ?? 0) + 0.16;
      raid.contractBlackFileId = target.id;
      debug.contractBlackFilesSpawned += 1;
      notify(Ls(
        '黑档案已解密：发现可选目标 NULL。击败它不会影响撤离，但有额外奖金。',
        'Black File decrypted: optional target NULL discovered. Extraction is unaffected, but the target carries an extra bonus.',
      ), 'warning');
      return target;
    };

    const applyContractModifier = (target) => {
      const roll = Math.floor(Math.random() * 3);
      if (roll === 0) {
        target.contractModifier = 'bulwark';
        target.name += Ls(' · 重甲', ' · Bulwark');
        target.maxHealth = Math.round(target.maxHealth * 1.28);
        target.health = target.maxHealth;
      } else if (roll === 1) {
        target.contractModifier = 'pursuer';
        target.name += Ls(' · 追猎', ' · Pursuer');
        target.speed *= 1.22;
        target.combatSpeedMult = (target.combatSpeedMult ?? 1) * 1.2;
      } else {
        target.contractModifier = 'deadeye';
        target.name += Ls(' · 神射', ' · Deadeye');
        target.fireInterval = Math.max(0.22, target.fireInterval * 0.82);
        target.accuracyBonus += 0.12;
      }
    };

    const selectRelayContainers = (raid) => {
      const player = raid?.player;
      const candidates = (raid?.containers ?? [])
        .filter(container => !container.opened && !String(container.id ?? '').startsWith('drop-'))
        .slice()
        .sort((a, b) => {
          const da = player ? Math.hypot((a.x ?? 0) - player.x, (a.z ?? 0) - player.z) : 0;
          const db = player ? Math.hypot((b.x ?? 0) - player.x, (b.z ?? 0) - player.z) : 0;
          return db - da;
        });
      const picked = [];
      if (candidates.length) picked.push(candidates[Math.floor(candidates.length * 0.25)]);
      if (candidates.length > 2) picked.push(candidates[Math.floor(candidates.length * 0.55)]);
      if (candidates.length > 4) picked.push(candidates[Math.floor(candidates.length * 0.82)]);
      const unique = [...new Map(picked.filter(Boolean).map(entry => [entry.id, entry])).values()];
      for (const container of candidates) {
        if (unique.length >= 3) break;
        if (!unique.some(entry => entry.id === container.id)) unique.push(container);
      }
      return unique.slice(0, 3);
    };

    const markRelay = (raid) => {
      const relay = raid?.blitzRelays?.[raid.blitzRelayIndex ?? 0];
      for (const container of raid?.containers ?? []) {
        container.blitzRelayActive = Boolean(relay && container.id === relay.id);
      }
      raid.blitzActiveRelayId = relay?.id ?? null;
      if (relay) {
        raid.interactionText = Ls(
          `热区接力 ${Math.min((raid.blitzRelayIndex ?? 0) + 1, 3)}/3：前往 ${relay.name ?? '目标物资点'}。`,
          `Hot Relay ${Math.min((raid.blitzRelayIndex ?? 0) + 1, 3)}/3: reach ${relay.name ?? 'the marked cache'}.`,
        );
      }
    };

    const triggerBlitzOverdrive = (raid) => {
      const player = raid?.player;
      if (!player) return;
      player.blitzOverdriveTimer = 12;
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget) continue;
        enemy.alertTimer = Math.max(enemy.alertTimer ?? 0, 8);
        enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 10);
        enemy.lastKnownPlayerX = player.x;
        enemy.lastKnownPlayerZ = player.z;
      }
      notify(Ls('热区接力完成：超频 12 秒，全场敌人进入警戒！', 'Relay complete: 12s Overdrive. All hostiles are alerted!'), 'warning');
    };

    const eligibleContractTargets = (raid) => (raid?.enemies ?? []).filter(enemy =>
      !enemy.dead && !enemy.despawned && !enemy.isRangeTarget &&
      !enemy.isNamelessBoss && !enemy.isNamelessMinion && !enemy.contractHvtKilled
    );

    const assignContractHvt = (raid) => {
      if (!raid || raid.modeId !== 'contract') return null;
      for (const enemy of raid.enemies ?? []) enemy.contractHvtActive = false;
      const candidates = eligibleContractTargets(raid);
      if (!candidates.length) {
        raid.contractHvtId = null;
        return null;
      }
      const player = raid.player;
      candidates.sort((a, b) => {
        const da = player ? Math.hypot(a.x - player.x, a.z - player.z) : 0;
        const db = player ? Math.hypot(b.x - player.x, b.z - player.z) : 0;
        return db - da;
      });
      const target = candidates[Math.floor(Math.min(candidates.length - 1, candidates.length * 0.35))];
      target.contractHvtActive = true;
      target.contractHvtBaseName ??= target.name;
      target.name = `${Ls('高价值目标', 'HVT')} · ${target.contractHvtBaseName ?? target.type ?? 'Target'}`;
      if (!target.contractHvtTuned) {
        target.contractHvtTuned = true;
        const ratio = target.maxHealth > 0 ? target.health / target.maxHealth : 1;
        target.maxHealth = Math.round((target.maxHealth ?? target.health ?? 100) * 1.45);
        target.health = Math.max(1, Math.round(target.maxHealth * ratio));
        target.damage = Math.round((target.damage ?? 10) * 1.25);
        target.speed = (target.speed ?? 2.5) * 1.16;
        target.fireInterval = Math.max(0.28, (target.fireInterval ?? 1) * 0.82);
        target.accuracyBonus = (target.accuracyBonus ?? 0) + 0.12;
        applyContractModifier(target);
      }
      raid.contractHvtId = target.id;
      debug.lastHvtId = target.id;
      notify(Ls('新 HVT 已标记。完成猎杀后将刷新下一阶段目标。', 'New HVT marked. Eliminate it to reveal the next contract target.'), 'warning');
      return target;
    };

    const startBeforeNovelty = startRaid;
    startRaid = function startRaidWithDistinctModes(...args) {
      const result = startBeforeNovelty.apply(this, args);
      const raid = state.raid;
      if (!raid) return result;

      if (raid.modeId === 'raid') {
        armLockdownGhostCache(raid);
      }

      if (raid.modeId === 'blitz') {
        raid.objectives = [
          { id: 'relay', label: Ls('热区接力', 'Relay'), target: 3, progress: 0 },
          { id: 'kill', label: Ls('击倒', 'Eliminate'), target: 4, progress: 0 },
        ];
        raid.tasksComplete = false;
        raid.blitzRelays = selectRelayContainers(raid);
        raid.blitzRelayIndex = 0;
        raid.blitzOverdriveTimer = 0;
        markRelay(raid);
      }


      return result;
    };

    const lootBeforeNovelty = openLootPanel;
    openLootPanel = function openLootWithBlitzRelay(container, ...args) {
      const raid = state.raid;
      const isRelay = Boolean(
        raid?.modeId === 'blitz' &&
        container &&
        !container.opened &&
        container.id === raid.blitzActiveRelayId
      );
      const isGhostCache = Boolean(
        raid?.modeId === 'raid' &&
        container &&
        !container.opened &&
        container.id === raid.lockdownGhostCacheId
      );
      const result = lootBeforeNovelty.call(this, container, ...args);
      if (isGhostCache && raid) activateLockdownGhost(raid, container);
      if (!isRelay || !raid) return result;
      advanceRaidObjective('relay', 1);
      debug.blitzRelayCompletions += 1;
      debug.lastRelayId = container.id;
      raid.blitzRelayIndex = (raid.blitzRelayIndex ?? 0) + 1;
      triggerBlitzOverdrive(raid);
      markRelay(raid);
      if ((raid.blitzRelayIndex ?? 0) >= 3) {
        const elapsed = Math.max(0, 300 - Number(raid.timeLeft ?? 300));
        if (elapsed <= 90) markBlitzCourier(raid);
      }
      return result;
    };

    const killBeforeNovelty = killEnemy;
    killEnemy = function killWithContractStages(enemy, ...args) {
      const raid = state.raid;
      const wasHvt = Boolean(raid?.modeId === 'contract' && enemy?.contractHvtActive && !enemy.dead);
      const wasCourier = Boolean(raid?.modeId === 'blitz' && enemy?.blitzCourier && !enemy.dead);
      const wasBlackFile = Boolean(raid?.modeId === 'contract' && enemy?.contractBlackFile && !enemy.dead);
      const result = killBeforeNovelty.call(this, enemy, ...args);
      if (wasCourier && raid && enemy?.dead) {
        raid.blitzCourierId = null;
        raid.bonusReward = Math.max(0, Number(raid.bonusReward ?? 0)) + 3500;
        if (raid.player) raid.player.blitzOverdriveTimer = Math.max(raid.player.blitzOverdriveTimer ?? 0, 12);
        debug.blitzCouriersKilled += 1;
        notify(Ls('404 信使已截获：+3,500 突袭奖金，超频重新充能。', 'Courier 404 intercepted: +3,500 Blitz bonus and Overdrive recharged.'), 'success');
      }
      if (wasBlackFile && raid && enemy?.dead) {
        raid.contractBlackFileId = null;
        raid.contractBlackFileResolved = true;
        raid.bonusReward = Math.max(0, Number(raid.bonusReward ?? 0)) + 5000;
        debug.contractBlackFilesKilled += 1;
        notify(Ls('黑档案 NULL 已清除：+5,000 隐藏合约奖金。', 'Black File NULL cleared: +5,000 hidden contract bonus.'), 'success');
      }
      if (!wasHvt || !raid || !enemy?.dead) return result;

      enemy.contractHvtActive = false;
      enemy.contractHvtKilled = true;
      advanceRaidObjective('hvt', 1);
      raid.contractHvtStage = (raid.contractHvtStage ?? 0) + 1;
      raid.contractStageBonus = (raid.contractStageBonus ?? 0) + 2200;
      raid.bonusReward = Math.max(0, Number(raid.bonusReward ?? 0)) + 2200;
      debug.contractHvtKills += 1;
      notify(Ls(
        `HVT 阶段完成：+2,200 合约奖金（${raid.contractHvtStage}/3）。`,
        `HVT stage complete: +2,200 contract bonus (${raid.contractHvtStage}/3).`,
      ), 'success');
      raid.contractHvtId = null;
      if ((raid.contractHvtStage ?? 0) < 3) {
        window.setTimeout(() => assignContractHvt(state.raid), 180);
      } else {
        window.setTimeout(() => assignBlackFileTarget(state.raid), 260);
      }
      return result;
    };

    const speedBeforeNovelty = getPlayerMoveSpeed;
    getPlayerMoveSpeed = function getModeBoostedMoveSpeed(player, sprinting) {
      const speed = speedBeforeNovelty(player, sprinting);
      return state.raid?.modeId === 'blitz' && (player?.blitzOverdriveTimer ?? 0) > 0 ? speed * 1.22 : speed;
    };

    const reloadBeforeNovelty = reloadWeapon;
    reloadWeapon = function reloadWithBlitzOverdrive(...args) {
      const player = state.raid?.player;
      const before = player?.reloadTimer ?? 0;
      const result = reloadBeforeNovelty.apply(this, args);
      if (
        player &&
        state.raid?.modeId === 'blitz' &&
        (player.blitzOverdriveTimer ?? 0) > 0 &&
        (player.reloadTimer ?? 0) > before
      ) player.reloadTimer *= 0.72;
      return result;
    };

    const updateBeforeNovelty = updateRaid;
    updateRaid = function updateDistinctModeSystems(dt, ...args) {
      const result = updateBeforeNovelty.call(this, dt, ...args);
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player) return result;
      if (raid.modeId === 'raid') {
        player.lockdownGhostTimer = Math.max(0, (player.lockdownGhostTimer ?? 0) - dt);
        raid.lockdownGhostHintTimer = Math.max(0, (raid.lockdownGhostHintTimer ?? 0) - dt);
        if (!raid.lockdownGhostHintShown && !raid.lockdownGhostTriggered && raid.lockdownGhostHintTimer <= 0) {
          raid.lockdownGhostHintShown = true;
          notify(Ls('无线电里夹着一段重复数字：6-1-7……地图上似乎有个没有编号的箱子。', 'A repeating number leaks through the radio: 6-1-7... There may be an unnumbered cache somewhere in the zone.'), 'warning');
        }
      }
      if (raid.modeId === 'blitz') {
        player.blitzOverdriveTimer = Math.max(0, (player.blitzOverdriveTimer ?? 0) - dt);
        if (!raid.tasksComplete && !raid.blitzActiveRelayId && (raid.blitzRelayIndex ?? 0) < 3) markRelay(raid);
      }

      return result;
    };

    if (state.mode === 'base' && typeof renderBasePanel === 'function') renderBasePanel();
  };
  boot();
})();
