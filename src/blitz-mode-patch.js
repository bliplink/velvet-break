(() => {
  if (window.__sdrBlitzModeWaiting || window.__sdrBlitzModeApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof getLobbyModeDefs !== 'function' ||
      typeof chooseRaidExtractions !== 'function' ||
      typeof startRaid !== 'function' ||
      typeof createLootInstance !== 'function' ||
      typeof weightedPick !== 'function' ||
      typeof lootCatalog === 'undefined'
    ) {
      window.__sdrBlitzModeWaiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrBlitzModeWaiting = false;
    if (window.__sdrBlitzModeApplied) return;
    window.__sdrBlitzModeApplied = true;

    const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, red: 5 };
    const debug = {
      version: '2026-09-19-blitz-v1',
      starts: 0,
      bonusItemsInjected: 0,
      tunedEnemies: 0,
      lastRaid: null,
    };
    window.__sdrBlitzModeDebug = debug;

    const getDefsBeforeBlitz = getLobbyModeDefs;
    getLobbyModeDefs = function getLobbyModeDefsWithBlitz() {
      const defs = getDefsBeforeBlitz();
      if (defs.blitz) return defs;

      return {
        ...defs,
        blitz: {
          id: 'blitz',
          nameZh: '极速突袭',
          nameEn: 'Blitz Raid',
          summaryZh: '5 分钟高压搜打撤。完成搜索与清敌目标可开启任务撤离，也可以冒险拉闸快速离场。',
          summaryEn: 'A 5-minute high-pressure raid. Complete search and kill objectives for the task exit, or risk the lever route for a faster escape.',
          detailZh: '搜索 3 个物资点并击倒 6 名敌人。出生保护更短、敌人反应更快，但会额外投放高价值物资。',
          detailEn: 'Search 3 caches and eliminate 6 hostiles. Spawn protection is shorter and enemies react faster, but extra high-value loot is injected.',
          deployZh: '进入极速突袭',
          deployEn: 'Enter Blitz Raid',
          duration: 5 * 60,
          bonusReward: 5200,
          objectiveFactory: () => ([
            { id: 'search', label: 'search', target: 3, progress: 0 },
            { id: 'kill', label: 'kill', target: 6, progress: 0 },
          ]),
          buildLayout(playerSpawn) {
            const layout = chooseRaidExtractions(playerSpawn);
            const standard = layout.extractions.find(zone => zone.kind === 'standard');
            const switchZone = layout.extractions.find(zone => zone.kind === 'switch');
            const extractions = [];

            if (standard) {
              extractions.push({
                ...standard,
                kind: 'task',
                active: true,
                requiresObjectives: true,
                pulse: Math.random() * Math.PI * 2,
              });
            }

            if (switchZone) {
              extractions.push({ ...switchZone });
            }

            const switchPoints = switchZone
              ? (layout.switchPoints ?? []).filter(point => point.zoneId === switchZone.id)
              : [];

            return { extractions, switchPoints };
          },
          getStartInteractionText() {
            return typeof L === 'function'
              ? L('极速突袭：完成搜索/清敌可解锁任务撤离，或直接寻找拉闸点开启快速撤离。', 'Blitz: finish search/kill objectives for the task exit, or find the lever to open the fast exit.')
              : 'Blitz Raid started.';
          },
          getStartNotice() {
            return typeof L === 'function'
              ? L('极速突袭开始：只有 5 分钟，目标与撤离路线同时推进。', 'Blitz Raid started: only 5 minutes, push objectives and extraction routes in parallel.')
              : 'Blitz Raid started.';
          },
        },
      };
    };

    const injectBlitzLoot = (raid) => {
      const containers = (raid?.containers ?? [])
        .filter(container => !container.opened)
        .slice()
        .sort((a, b) => {
          const av = Math.abs((a.x ?? 0) * 0.37 + (a.z ?? 0) * 0.19);
          const bv = Math.abs((b.x ?? 0) * 0.37 + (b.z ?? 0) * 0.19);
          return bv - av;
        });

      let injected = 0;
      for (const container of containers) {
        if (injected >= 4) break;
        const candidates = lootCatalog.filter(item =>
          item?.pools?.includes(container.pool) &&
          (rarityRank[item.rarity] ?? 0) >= 2
        );
        const picked = weightedPick(candidates, item => Math.max(0.001, item.spawnWeight ?? 1));
        if (!picked) continue;
        const item = createLootInstance(picked);
        item.blitzBonus = true;
        item.blitzSource = container.id;
        container.items ??= [];
        container.items.push(item);
        injected += 1;
      }
      debug.bonusItemsInjected += injected;
      return injected;
    };

    const tuneBlitzEnemies = (raid) => {
      let tuned = 0;
      for (const enemy of raid?.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget || enemy.isNamelessBoss || enemy.isNamelessMinion) continue;
        if (enemy.blitzModeTuned) continue;
        enemy.blitzModeTuned = true;
        enemy.speed = (enemy.speed ?? 2.5) * 1.04;
        enemy.detectRange = (enemy.detectRange ?? 28) * 1.06;
        enemy.fireInterval = Math.max(0.35, (enemy.fireInterval ?? 1) * 0.97);
        enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 1.2);
        tuned += 1;
      }
      debug.tunedEnemies += tuned;
      return tuned;
    };

    const startBeforeBlitz = startRaid;
    startRaid = function startRaidWithBlitzMode(...args) {
      const result = startBeforeBlitz.apply(this, args);
      const raid = state.raid;
      if (!raid || raid.modeId !== 'blitz') return result;

      raid.isBlitzRaid = true;
      raid.spawnSafeTimer = Math.min(raid.spawnSafeTimer ?? 4, 4);
      raid.spawnSafeRadius = Math.min(raid.spawnSafeRadius ?? 60, 62);

      const injected = injectBlitzLoot(raid);
      const tuned = tuneBlitzEnemies(raid);
      debug.starts += 1;
      debug.lastRaid = {
        duration: raid.timeLeft,
        objectives: (raid.objectives ?? []).map(objective => ({
          id: objective.id,
          target: objective.target,
        })),
        extractionKinds: (raid.extractions ?? []).map(zone => zone.kind),
        switchPoints: raid.switchPoints?.length ?? 0,
        injected,
        tuned,
      };
      return result;
    };
  };

  boot();
})();