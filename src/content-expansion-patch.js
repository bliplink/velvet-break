(() => {
  if (window.__sdrContentExpansionWaiting || window.__sdrContentExpansionApplied) return;

  const boot = () => {
    if (
      typeof getLobbyModeDefs === 'undefined' ||
      typeof getSelectedLobbyModeId === 'undefined' ||
      typeof getLobbyModeDef === 'undefined' ||
      typeof chooseRaidEnemySpawns === 'undefined' ||
      typeof startRaid === 'undefined' ||
      typeof state === 'undefined' ||
      typeof refs === 'undefined' ||
      typeof renderBasePanel === 'undefined' ||
      typeof getItemLabel === 'undefined' ||
      typeof itemMetaLine === 'undefined' ||
      typeof renderBaseItemActions === 'undefined' ||
      typeof formatMoney === 'undefined' ||
      typeof formatWeight === 'undefined' ||
      typeof L === 'undefined' ||
      typeof chooseRaidExtractions === 'undefined' ||
      typeof resolveStaticPlacement === 'undefined' ||
      typeof distance2D === 'undefined' ||
      typeof SPAWN_SAFE_RADIUS === 'undefined' ||
      typeof generateContainerLoot === 'undefined' ||
      typeof createContainerVisual === 'undefined' ||
      typeof notify === 'undefined' ||
      typeof scene === 'undefined'
    ) {
      window.__sdrContentExpansionWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrContentExpansionWaiting = false;
    if (window.__sdrContentExpansionApplied) return;
    window.__sdrContentExpansionApplied = true;

    const BATTLEFIELD_ID = 'battlefield';
    const BATTLEFIELD_ENABLED = false;
    const BATTLEFIELD_ENEMY_COUNT = 72;
    const BATTLEFIELD_EXTRA_CONTAINERS = 10;
    const BATTLEFIELD_VISUAL_RADIUS = 86;

    if (!BATTLEFIELD_ENABLED && state.save?.selectedModeId === BATTLEFIELD_ID) {
      state.save.selectedModeId = 'raid';
      if (typeof persistSave === 'function') persistSave();
    }

    const originalGetLobbyModeDefs = getLobbyModeDefs;
    getLobbyModeDefs = function productionLobbyModes() {
      const modes = originalGetLobbyModeDefs();
      if (!BATTLEFIELD_ENABLED) return modes;
      modes[BATTLEFIELD_ID] = {
        id: BATTLEFIELD_ID,
        nameZh: '大战场',
        nameEn: 'Battlefield',
        summaryZh: '多线交火的大地图玩法，更多敌人、更多补给，撤离路线自由选择。',
        summaryEn: 'A large multi-front raid with more hostiles, more supplies, and open extraction choices.',
        detailZh: '12 分钟限时，72 名敌人，战场区域扩大至 1.5 倍；不设置波次，压力来自持续交火。',
        detailEn: '12-minute limit, 72 hostiles, and a 1.5x battlefield area. No waves; pressure comes from sustained contact.',
        deployZh: '进入大战场',
        deployEn: 'Enter Battlefield',
        duration: 12 * 60,
        bonusReward: 18000,
        objectiveFactory: () => [],
        buildLayout(playerSpawn) {
          return chooseRaidExtractions(playerSpawn);
        },
        getStartInteractionText() {
          return L('大战场：普通撤离点已开放，拉闸撤离仍需先拉闸。', 'Battlefield: standard extraction is open; the gated exit still needs its lever.');
        },
        getStartNotice() {
          return L('大战场已开始：72 名敌人已部署，战场区域扩大，物资点已增密。', 'Battlefield started: 72 hostiles deployed across the expanded battlefield with reinforced loot.');
        },
      };
      return modes;
    };

    const originalChooseRaidEnemySpawns = chooseRaidEnemySpawns;
    chooseRaidEnemySpawns = function productionEnemySpawns(playerSpawn) {
      const baseSpawns = originalChooseRaidEnemySpawns(playerSpawn);
      if (getSelectedLobbyModeId() !== BATTLEFIELD_ID || baseSpawns.length >= BATTLEFIELD_ENEMY_COUNT) {
        return baseSpawns;
      }
      const result = baseSpawns.slice();
      let attempt = 0;
      while (result.length < BATTLEFIELD_ENEMY_COUNT && attempt < BATTLEFIELD_ENEMY_COUNT * 10) {
        const source = baseSpawns[attempt % Math.max(1, baseSpawns.length)];
        const angle = (attempt * 2.39996) % (Math.PI * 2);
        const radius = 5 + (attempt % 5) * 1.9;
        const x = source.x + Math.cos(angle) * radius;
        const z = source.z + Math.sin(angle) * radius;
        const resolved = resolveStaticPlacement(x, z, 1.2);
        const tooCloseToPlayer = distance2D(resolved.x, resolved.z, playerSpawn.x, playerSpawn.z) < SPAWN_SAFE_RADIUS;
        const tooCloseToExisting = result.some((entry) => distance2D(entry.x, entry.z, resolved.x, resolved.z) < 2.3);
        if (!tooCloseToPlayer && !tooCloseToExisting) {
          result.push({ ...source, x: resolved.x, z: resolved.z, route: (source.route ?? []).map((point) => ({ ...point })) });
        }
        attempt += 1;
      }
      return result;
    };

    const originalPatchedStartRaid = window.__sdrPatchedStartRaid;
    if (typeof originalPatchedStartRaid === 'function') {
      window.__sdrPatchedStartRaid = function startProductionBattlefield() {
        const result = originalPatchedStartRaid();
        const raid = state.raid;
        if (!raid || raid.modeId !== BATTLEFIELD_ID) return result;
        raid.isBattlefield = true;
        raid.battlefieldScale = 1.5;

        // The final runtime owns the enemy-spawn call, so top up here as a
        // post-start invariant. This keeps the mode at exactly 72 enemies
        // even when a later runtime override replaces the spawn helper.
        if (raid.enemies.length < BATTLEFIELD_ENEMY_COUNT && raid.enemies.length > 0) {
          const initialEnemies = raid.enemies.slice();
          let attempt = 0;
          while (raid.enemies.length < BATTLEFIELD_ENEMY_COUNT && attempt < 400) {
              const source = initialEnemies[attempt % Math.max(1, initialEnemies.length)];
              const gridX = -112 + (attempt % 15) * 16;
              const gridZ = -112 + Math.floor(attempt / 15) * 16;
              attempt += 1;
              // Grid candidates avoid the expensive collision resolver during
              // the 56-unit burst; the navigation update will correct each
              // unit on its first patrol step.
              const resolved = { x: gridX, z: gridZ };
              const tooCloseToPlayer = distance2D(resolved.x, resolved.z, raid.player.x, raid.player.z) < 18;
              if (!tooCloseToPlayer) {
                const spawn = { x: resolved.x, z: resolved.z, route: (source.route ?? [{ x: source.x, z: source.z }]).map((point) => ({ ...point })) };
                const template = source;
                const enemy = {
                  ...template,
                  id: `battlefield-enemy-${raid.enemies.length}`,
                  x: spawn.x,
                  z: spawn.z,
                  health: template.maxHealth,
                  lastKnownPlayerX: spawn.x,
                  lastKnownPlayerZ: spawn.z,
                  route: spawn.route,
                  routeIndex: 0,
                  combatState: 'patrol',
                  alertTimer: 0,
                  investigateTimer: 0,
                  mobilityAction: null,
                  isProne: false,
                  proneTimer: 0,
                  proneBlend: 0,
                  dead: false,
                  despawned: false,
                  dropPending: false,
                  dropItem: null,
                  visual: null,
                  damageFlash: 0,
                  muzzleTimer: 0,
                  shootCooldown: 0.4 + Math.random() * 0.8,
                };
                raid.enemies.push(enemy);
                enemy.visual = distance2D(enemy.x, enemy.z, raid.player.x, raid.player.z) <= BATTLEFIELD_VISUAL_RADIUS
                  ? createEnemyVisual(enemy)
                  : null;
              }
          }
        }
        const pools = ['tech', 'weapon', 'valuable', 'med'];
        for (let index = 0; index < BATTLEFIELD_EXTRA_CONTAINERS; index += 1) {
          const angle = (index * 2.39996) % (Math.PI * 2);
          const radius = 44 + (index % 4) * 14;
          const resolved = resolveStaticPlacement(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            1.5,
          );
          const spawn = {
            id: `battlefield-cache-${index}`,
            name: L('前线补给箱', 'Frontline Cache'),
            x: resolved.x,
            z: resolved.z,
            pool: pools[index % pools.length],
            tier: index % 3 === 0 ? 3 : 2,
          };
          const container = {
            ...spawn,
            opened: false,
            items: generateContainerLoot(spawn),
            visual: createContainerVisual(spawn),
            highlight: 0,
          };
          raid.containers.push(container);
        }
        notify(L('前线补给已增援，地图上新增多个补给点。', 'Frontline caches reinforced: extra supply sites are now active.'), 'success');
        return result;
      };
      startRaid = window.__sdrPatchedStartRaid;
    }

    const tuneBattlefieldEnemy = (enemy, index) => {
      if (!enemy || enemy.isNamelessBoss || enemy.isNamelessMinion || enemy.isRangeTarget) return;
      if (enemy.battlefieldTuned) return;
      const health = [500, 700, 900][index % 3];
      enemy.maxHealth = health;
      enemy.health = health;
      enemy.battlefieldTuned = true;
      enemy.damage = Math.max(18, Math.round((enemy.damage ?? 10) * 1.16));
      enemy.detectRange = Math.max(36, (enemy.detectRange ?? 28) * 1.12);
      enemy.longFireRange = Math.max(32, (enemy.longFireRange ?? 24) * 1.12);
      enemy.accuracyBonus = Math.max(0.12, enemy.accuracyBonus ?? 0);
      enemy.combatSpeedMult = Math.max(1.14, enemy.combatSpeedMult ?? 1);
    };

    const addBattlefieldEnemy = (raid, template, x, z) => {
      const spawn = { x, z, route: (template.route ?? [{ x, z }]).map((point) => ({ ...point })) };
      const enemy = {
        ...template,
        id: `battlefield-enemy-${raid.enemies.length}`,
        x,
        z,
        lastKnownPlayerX: x,
        lastKnownPlayerZ: z,
        route: spawn.route,
        routeIndex: 0,
        combatState: 'patrol',
        alertTimer: 0,
        investigateTimer: 0,
        mobilityAction: null,
        isProne: false,
        proneTimer: 0,
        proneBlend: 0,
        dead: false,
        despawned: false,
        dropPending: false,
        dropItem: null,
        visual: null,
        damageFlash: 0,
        muzzleTimer: 0,
        shootCooldown: 0.4 + Math.random() * 0.8,
      };
      raid.enemies.push(enemy);
      tuneBattlefieldEnemy(enemy, raid.enemies.length);
      enemy.visual = distance2D(enemy.x, enemy.z, raid.player.x, raid.player.z) <= BATTLEFIELD_VISUAL_RADIUS
        ? createEnemyVisual(enemy)
        : null;
    };

    const enforceBattlefieldRoster = (raid) => {
      if (!raid || raid.modeId !== BATTLEFIELD_ID || !raid.enemies?.length) return;
      raid.enemies.filter((enemy) => !enemy.isNamelessBoss && !enemy.isNamelessMinion).forEach(tuneBattlefieldEnemy);
      if (raid.enemies.length >= BATTLEFIELD_ENEMY_COUNT) return;
      const templates = raid.enemies.filter((enemy) => !enemy.isNamelessBoss && !enemy.isNamelessMinion);
      if (!templates.length) return;
      const boss = raid.enemies.find((enemy) => enemy.isNamelessBoss && !enemy.dead);
      let attempt = 0;
      while (raid.enemies.length < BATTLEFIELD_ENEMY_COUNT && attempt < 900) {
        const x = -112 + (attempt % 29) * 8;
        const z = -112 + Math.floor(attempt / 29) * 8;
        attempt += 1;
        if (Math.hypot(x - raid.player.x, z - raid.player.z) < 20) continue;
        if (boss && Math.hypot(x - boss.territoryX, z - boss.territoryZ) < (boss.territoryRadius ?? 68) + 3) continue;
        if (raid.enemies.some((enemy) => Math.hypot(enemy.x - x, enemy.z - z) < 2.4)) continue;
        addBattlefieldEnemy(raid, templates[attempt % templates.length], x, z);
      }
    };

    const ensureNearbyBattlefieldVisuals = (raid) => {
      if (!raid?.player || raid.modeId !== BATTLEFIELD_ID) return;
      for (const enemy of raid.enemies) {
        if (enemy.visual || enemy.dead || enemy.despawned) continue;
        if (distance2D(enemy.x, enemy.z, raid.player.x, raid.player.z) <= BATTLEFIELD_VISUAL_RADIUS) {
          enemy.visual = createEnemyVisual(enemy);
        }
      }
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function updateBattlefieldRoster(dt) {
      const result = originalUpdateRaid(dt);
      if (state.raid?.modeId === BATTLEFIELD_ID) {
        enforceBattlefieldRoster(state.raid);
        ensureNearbyBattlefieldVisuals(state.raid);
      }
      return result;
    };

    const originalRenderBasePanel = renderBasePanel;
    renderBasePanel = function renderProductionBasePanel() {
      const result = originalRenderBasePanel();
      enhanceStashDirectory();
      return result;
    };

    function enhanceStashDirectory() {
      if (state.mode !== 'base' || !refs.stashList?.parentElement) return;
      const parent = refs.stashList.parentElement;
      let directory = document.getElementById('stashDirectory');
      if (!directory) {
        directory = document.createElement('section');
        directory.id = 'stashDirectory';
        directory.className = 'stash-directory';
        parent.insertBefore(directory, refs.stashList);
      }
      const stash = state.save.stash ?? [];
      const groups = new Map();
      for (const item of stash) {
        const key = item.itemType === 'ammo' && item.ammoId ? `ammo:${item.ammoId}` : item.itemType === 'part' && item.partId ? `part:${item.partId}` : `item:${item.id}`;
        const group = groups.get(key) ?? { item, count: 0, value: 0, weight: 0, rounds: 0 };
        group.count += 1;
        group.value += Number(item.value ?? 0);
        group.weight += Number(item.weight ?? 0);
        group.rounds += Number(item.rounds ?? 0);
        groups.set(key, group);
      }
      const groupsMarkup = Array.from(groups.values())
        .sort((left, right) => right.value - left.value)
        .map(({ item, count, value, weight, rounds }) => `
          <div class="stash-directory-row">
            <div class="stash-directory-name">
              <strong class="rarity-${item.rarity}">${getItemLabel(item)}</strong>
              <span>${itemMetaLine(item)}</span>
            </div>
            <div class="stash-directory-stats">
              <b>x${count}</b>
              <span>${formatMoney(value)}</span>
              <span>${formatWeight(weight)}${rounds > 0 ? ` · ${rounds} ${L('发', 'rounds')}` : ''}</span>
            </div>
          </div>
        `)
        .join('');
      directory.innerHTML = `
        <div class="stash-directory-head">
          <div>
            <strong>${L('仓库目录', 'Stash Directory')}</strong>
            <span>${stash.length ? L('按物品归类显示，便于核对数量、价值和重量。', 'Grouped by item for a precise count, value, and weight check.') : L('暂无物资', 'No stored items')}</span>
          </div>
          <input class="stash-directory-filter" type="search" placeholder="${L('搜索物品', 'Search items')}" aria-label="${L('搜索仓库物品', 'Search stash items')}" />
        </div>
        <div class="stash-directory-list">${groupsMarkup || `<div class="item-meta">${L('仓库里还没有带出的物资。', 'The stash is empty.')}</div>`}</div>
      `;
      const filter = directory.querySelector('.stash-directory-filter');
      filter?.addEventListener('input', () => {
        const query = filter.value.trim().toLowerCase();
        for (const row of refs.stashList.querySelectorAll('.stash-row')) {
          row.hidden = Boolean(query && !row.textContent.toLowerCase().includes(query));
        }
        for (const row of directory.querySelectorAll('.stash-directory-row')) {
          row.hidden = Boolean(query && !row.textContent.toLowerCase().includes(query));
        }
      });
    }

    // This patch loads after the lobby's first paint. Repaint once so the
    // injected mode is visible immediately instead of waiting for a later
    // state change.
    renderBasePanel();
  };

  boot();
})();
