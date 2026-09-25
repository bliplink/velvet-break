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

      const viewState = window.__sdrStashDirectoryState ??= {
        query: '',
        category: 'all',
        sort: 'value-desc',
      };
      const stash = state.save.stash ?? [];
      const groups = new Map();
      const categories = new Map();
      let totalValue = 0;
      let totalWeight = 0;

      for (const item of stash) {
        const key = item.itemType === 'ammo' && item.ammoId
          ? `ammo:${item.ammoId}`
          : item.itemType === 'part' && item.partId
            ? `part:${item.partId}`
            : `item:${item.id}`;
        const group = groups.get(key) ?? { item, count: 0, value: 0, weight: 0, rounds: 0 };
        group.count += 1;
        group.value += Number(item.value ?? 0);
        group.weight += Number(item.weight ?? 0);
        group.rounds += Number(item.rounds ?? 0);
        groups.set(key, group);

        const category = String(item.category ?? L('其他', 'Other'));
        categories.set(category, (categories.get(category) ?? 0) + 1);
        totalValue += Number(item.value ?? 0);
        totalWeight += Number(item.weight ?? 0);
      }

      const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, red: 5 };
      const compareGroups = (left, right) => {
        if (viewState.sort === 'count-desc') return right.count - left.count || right.value - left.value;
        if (viewState.sort === 'weight-desc') return right.weight - left.weight || right.value - left.value;
        if (viewState.sort === 'name-asc') return getItemLabel(left.item).localeCompare(getItemLabel(right.item), getLanguage() === 'zh' ? 'zh-CN' : 'en');
        if (viewState.sort === 'rarity-desc') return (rarityRank[right.item.rarity] ?? 0) - (rarityRank[left.item.rarity] ?? 0) || right.value - left.value;
        return right.value - left.value;
      };

      const groupsMarkup = Array.from(groups.values())
        .sort(compareGroups)
        .map(({ item, count, value, weight, rounds }) => {
          const category = String(item.category ?? L('其他', 'Other'));
          return `
            <div class="stash-directory-row" data-stash-category="${encodeURIComponent(category)}">
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
          `;
        })
        .join('');

      const categoryOptions = Array.from(categories.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([category, count]) => {
          const value = encodeURIComponent(category);
          return `<option value="${value}" ${viewState.category === value ? 'selected' : ''}>${category} · ${count}</option>`;
        })
        .join('');

      const ammoCount = stash.filter((item) => item.itemType === 'ammo' && item.ammoId).length;
      const newPartCount = stash.filter((item) =>
        item.itemType === 'part' &&
        item.partId &&
        !state.save.armory.ownedParts.includes(item.partId),
      ).length;

      directory.innerHTML = `
        <div class="stash-directory-head">
          <div>
            <strong>${L('仓库目录', 'Stash Directory')}</strong>
            <span>${stash.length ? L('按物品归类管理，支持搜索、分类、排序和批量收纳。', 'Grouped inventory with search, category filters, sorting, and batch storage actions.') : L('暂无物资', 'No stored items')}</span>
          </div>
          <div class="stash-directory-actions">
            <button class="ghost-button small" type="button" data-stash-bulk="ammo" ${ammoCount ? '' : 'disabled'}>${L(`弹药入库 ${ammoCount}`, `Store ammo ${ammoCount}`)}</button>
            <button class="ghost-button small" type="button" data-stash-bulk="parts" ${newPartCount ? '' : 'disabled'}>${L(`收纳新配件 ${newPartCount}`, `Archive new parts ${newPartCount}`)}</button>
          </div>
        </div>

        <div class="stash-directory-summary">
          <div><span>${L('物资', 'Items')}</span><strong>${stash.length}</strong></div>
          <div><span>${L('总价值', 'Total value')}</span><strong>${formatMoney(totalValue)}</strong></div>
          <div><span>${L('总重量', 'Total weight')}</span><strong>${formatWeight(totalWeight)}</strong></div>
          <div><span>${L('分类', 'Categories')}</span><strong>${categories.size}</strong></div>
        </div>

        <div class="stash-directory-controls">
          <input class="stash-directory-filter" type="search" value="${viewState.query.replace(/"/g, '&quot;')}" placeholder="${L('搜索物品', 'Search items')}" aria-label="${L('搜索仓库物品', 'Search stash items')}" />
          <select class="stash-directory-category" aria-label="${L('仓库分类', 'Stash category')}">
            <option value="all" ${viewState.category === 'all' ? 'selected' : ''}>${L('全部分类', 'All categories')}</option>
            ${categoryOptions}
          </select>
          <select class="stash-directory-sort" aria-label="${L('仓库排序', 'Stash sort')}">
            <option value="value-desc" ${viewState.sort === 'value-desc' ? 'selected' : ''}>${L('总价值优先', 'Value first')}</option>
            <option value="count-desc" ${viewState.sort === 'count-desc' ? 'selected' : ''}>${L('数量优先', 'Count first')}</option>
            <option value="weight-desc" ${viewState.sort === 'weight-desc' ? 'selected' : ''}>${L('重量优先', 'Weight first')}</option>
            <option value="rarity-desc" ${viewState.sort === 'rarity-desc' ? 'selected' : ''}>${L('稀有度优先', 'Rarity first')}</option>
            <option value="name-asc" ${viewState.sort === 'name-asc' ? 'selected' : ''}>${L('名称排序', 'Name')}</option>
          </select>
        </div>

        <div class="stash-directory-list">${groupsMarkup || `<div class="item-meta">${L('仓库里还没有带出的物资。', 'The stash is empty.')}</div>`}</div>
      `;

      const applyFilters = () => {
        const query = String(viewState.query ?? '').trim().toLowerCase();
        const category = viewState.category === 'all' ? '' : decodeURIComponent(viewState.category);
        const categoryLower = category.toLowerCase();
        let visibleGroups = 0;

        for (const row of refs.stashList.querySelectorAll('.stash-row')) {
          const text = row.textContent.toLowerCase();
          row.hidden = Boolean(
            (query && !text.includes(query)) ||
            (categoryLower && !text.includes(categoryLower))
          );
        }
        for (const row of directory.querySelectorAll('.stash-directory-row')) {
          const text = row.textContent.toLowerCase();
          const rowCategory = decodeURIComponent(row.dataset.stashCategory ?? '').toLowerCase();
          row.hidden = Boolean(
            (query && !text.includes(query)) ||
            (categoryLower && rowCategory !== categoryLower)
          );
          if (!row.hidden) visibleGroups += 1;
        }

        window.__sdrStashDirectoryDebug = {
          version: '2026-09-25-stash-v2',
          itemCount: stash.length,
          groupCount: groups.size,
          visibleGroups,
          totalValue,
          totalWeight,
          categoryCount: categories.size,
          query: viewState.query,
          category: viewState.category,
          sort: viewState.sort,
        };
      };

      const filter = directory.querySelector('.stash-directory-filter');
      filter?.addEventListener('input', () => {
        viewState.query = filter.value;
        applyFilters();
      });
      directory.querySelector('.stash-directory-category')?.addEventListener('change', (event) => {
        viewState.category = event.currentTarget.value;
        applyFilters();
      });
      directory.querySelector('.stash-directory-sort')?.addEventListener('change', (event) => {
        viewState.sort = event.currentTarget.value;
        enhanceStashDirectory();
      });

      directory.querySelector('[data-stash-bulk="ammo"]')?.addEventListener('click', () => {
        const nextStash = [];
        let itemCount = 0;
        let roundCount = 0;
        for (const item of state.save.stash ?? []) {
          if (item.itemType === 'ammo' && item.ammoId) {
            const rounds = Math.max(0, Number(item.rounds ?? 0));
            state.save.prepAmmo[item.ammoId] = (state.save.prepAmmo[item.ammoId] ?? 0) + rounds;
            roundCount += rounds;
            itemCount += 1;
          } else {
            nextStash.push(item);
          }
        }
        if (!itemCount) return;
        state.save.stash = nextStash;
        persistSave();
        renderBasePanel();
        notify(L(`已将 ${itemCount} 组弹药（${roundCount} 发）存入弹药库。`, `Stored ${itemCount} ammo stacks (${roundCount} rounds) in the ammo reserve.`), 'success');
      });

      directory.querySelector('[data-stash-bulk="parts"]')?.addEventListener('click', () => {
        const nextStash = [];
        const learned = [];
        for (const item of state.save.stash ?? []) {
          if (
            item.itemType === 'part' &&
            item.partId &&
            !state.save.armory.ownedParts.includes(item.partId)
          ) {
            state.save.armory.ownedParts.push(item.partId);
            learned.push(item);
          } else {
            nextStash.push(item);
          }
        }
        if (!learned.length) return;
        state.save.stash = nextStash;
        persistSave();
        renderBasePanel();
        notify(L(`已将 ${learned.length} 个新配件收入军械库。`, `Archived ${learned.length} new parts in the armory.`), 'success');
      });

      applyFilters();
    }

    // This patch loads after the lobby's first paint. Repaint once so the
    // injected mode is visible immediately instead of waiting for a later
    // state change.
    renderBasePanel();
  };

  boot();
})();
