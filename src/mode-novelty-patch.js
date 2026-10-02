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
      version: '2026-10-02-mode-novelty-v1',
      blitzRelayCompletions: 0,
      contractHvtKills: 0,
      lastRelayId: null,
      lastHvtId: null,
    };
    window.__sdrModeNoveltyDebug = debug;
    const Ls = (zh, en) => typeof L === 'function' ? L(zh, en) : en;

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

      if (raid.modeId === 'contract') {
        raid.objectives = [
          { id: 'hvt', label: 'HVT', target: 3, progress: 0 },
          { id: 'kill', label: Ls('击倒', 'Eliminate'), target: 8, progress: 0 },
        ];
        raid.tasksComplete = false;
        raid.contractHvtStage = 0;
        raid.contractStageBonus = 0;
        assignContractHvt(raid);
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
      const result = lootBeforeNovelty.call(this, container, ...args);
      if (!isRelay || !raid) return result;
      advanceRaidObjective('relay', 1);
      debug.blitzRelayCompletions += 1;
      debug.lastRelayId = container.id;
      raid.blitzRelayIndex = (raid.blitzRelayIndex ?? 0) + 1;
      triggerBlitzOverdrive(raid);
      markRelay(raid);
      return result;
    };

    const killBeforeNovelty = killEnemy;
    killEnemy = function killWithContractStages(enemy, ...args) {
      const raid = state.raid;
      const wasHvt = Boolean(raid?.modeId === 'contract' && enemy?.contractHvtActive && !enemy.dead);
      const result = killBeforeNovelty.call(this, enemy, ...args);
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
      if ((raid.contractHvtStage ?? 0) < 3) window.setTimeout(() => assignContractHvt(state.raid), 180);
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
      if (raid.modeId === 'blitz') {
        player.blitzOverdriveTimer = Math.max(0, (player.blitzOverdriveTimer ?? 0) - dt);
        if (!raid.tasksComplete && !raid.blitzActiveRelayId && (raid.blitzRelayIndex ?? 0) < 3) markRelay(raid);
      }
      if (raid.modeId === 'contract' && !raid.tasksComplete && !raid.contractHvtId) assignContractHvt(raid);
      return result;
    };

    if (state.mode === 'base' && typeof renderBasePanel === 'function') renderBasePanel();
  };
  boot();
})();
