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
    const BATTLEFIELD_ENABLED = true;
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
        nameZh: '载具战场',
        nameEn: 'Vehicle Battlefield',
        summaryZh: '大规模交火 + 可驾驶装甲载具。驾驶载具穿越战区、碾压敌人并完成撤离。',
        summaryEn: 'Large-scale combat with drivable armored vehicles. Cross the battlefield, run down hostiles, and extract.'
        detailZh: '12 分钟限时，72 名敌人，部署 3 辆装甲越野车。E 上下车，WASD 驾驶；载具有独立耐久和碰撞伤害。',
        detailEn: '12-minute limit, 72 hostiles, and 3 armored vehicles. Press E to enter/exit, WASD to drive; vehicles have durability and impact damage.'
        deployZh: '进入载具战场',
        deployEn: 'Enter Vehicle Battlefield',
        duration: 12 * 60,
        bonusReward: 18000,
        objectiveFactory: () => [],
        buildLayout(playerSpawn) {
          return chooseRaidExtractions(playerSpawn);
        },
        getStartInteractionText() {
          return L('载具战场：普通撤离点开放。靠近载具按 E 上车，WASD 驾驶。', 'Vehicle Battlefield: standard extraction is open. Approach a vehicle and press E; drive with WASD.');
        },
        getStartNotice() {
          return L('载具战场开始：72 名敌人和 3 辆装甲越野车已部署。按 E 上下车，WASD 驾驶。', 'Vehicle Battlefield started: 72 hostiles and 3 armored vehicles deployed. Press E to enter/exit; drive with WASD.');
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


    const createBattlefieldVehicleVisual = (vehicle) => {
      const root = new BABYLON.TransformNode(`battlefield-vehicle-${vehicle.id}`, scene);
      root.position.set(vehicle.x, 0, vehicle.z);
      root.rotation.y = vehicle.yaw ?? 0;

      const bodyMat = new BABYLON.StandardMaterial(`battlefield-vehicle-body-mat-${vehicle.id}`, scene);
      bodyMat.diffuseColor = BABYLON.Color3.FromHexString('#4b5f55');
      bodyMat.emissiveColor = BABYLON.Color3.FromHexString('#111b17');
      bodyMat.specularColor = BABYLON.Color3.Black();

      const darkMat = new BABYLON.StandardMaterial(`battlefield-vehicle-dark-mat-${vehicle.id}`, scene);
      darkMat.diffuseColor = BABYLON.Color3.FromHexString('#20292a');
      darkMat.specularColor = BABYLON.Color3.Black();

      const body = BABYLON.MeshBuilder.CreateBox(`battlefield-vehicle-body-${vehicle.id}`, { width: 2.35, height: 0.72, depth: 4.25 }, scene);
      body.parent = root;
      body.position.y = 0.82;
      body.material = bodyMat;

      const cabin = BABYLON.MeshBuilder.CreateBox(`battlefield-vehicle-cabin-${vehicle.id}`, { width: 2.05, height: 0.95, depth: 1.85 }, scene);
      cabin.parent = root;
      cabin.position.set(0, 1.48, -0.35);
      cabin.material = bodyMat;

      const hood = BABYLON.MeshBuilder.CreateBox(`battlefield-vehicle-hood-${vehicle.id}`, { width: 2.0, height: 0.34, depth: 1.15 }, scene);
      hood.parent = root;
      hood.position.set(0, 1.03, 1.47);
      hood.material = bodyMat;

      const bumper = BABYLON.MeshBuilder.CreateBox(`battlefield-vehicle-bumper-${vehicle.id}`, { width: 2.45, height: 0.22, depth: 0.22 }, scene);
      bumper.parent = root;
      bumper.position.set(0, 0.56, 2.18);
      bumper.material = darkMat;

      for (const side of [-1, 1]) {
        for (const z of [-1.35, 1.35]) {
          const wheel = BABYLON.MeshBuilder.CreateCylinder(`battlefield-vehicle-wheel-${vehicle.id}-${side}-${z}`, {
            height: 0.32, diameter: 0.74, tessellation: 16,
          }, scene);
          wheel.parent = root;
          wheel.position.set(side * 1.12, 0.5, z);
          wheel.rotation.z = Math.PI / 2;
          wheel.material = darkMat;
        }
      }

      for (const mesh of root.getChildMeshes()) {
        mesh.isPickable = true;
        mesh.metadata = { vehicleId: vehicle.id, battlefieldVehicle: true };
      }
      vehicle.visual = { root, bodyMat, darkMat };
      return vehicle.visual;
    };

    const disposeBattlefieldVehicles = (raid = state.raid) => {
      for (const vehicle of raid?.vehicles ?? []) vehicle.visual?.root?.dispose?.(false, true);
      if (raid) {
        raid.vehicles = [];
        if (raid.player) raid.player.mountedVehicleId = null;
      }
    };

    const spawnBattlefieldVehicles = (raid) => {
      if (!raid || raid.modeId !== BATTLEFIELD_ID) return;
      disposeBattlefieldVehicles(raid);
      const points = [
        { x: -22, z: -4, yaw: 0.25 },
        { x: 58, z: -52, yaw: -1.15 },
        { x: -72, z: 62, yaw: 2.3 },
      ];
      raid.vehicles = points.map((point, index) => {
        const placed = resolveStaticPlacement(point.x, point.z, 2.4);
        const vehicle = {
          id: `armored-jeep-${index + 1}`,
          x: placed.x,
          z: placed.z,
          yaw: point.yaw,
          speed: 0,
          health: 1200,
          maxHealth: 1200,
          radius: 1.35,
          occupied: false,
          impactCooldowns: new Map(),
          visual: null,
        };
        createBattlefieldVehicleVisual(vehicle);
        return vehicle;
      });
      raid.vehicleKills = 0;
    };

    const getMountedBattlefieldVehicle = (raid = state.raid) => {
      const id = raid?.player?.mountedVehicleId;
      return id ? raid.vehicles?.find((vehicle) => vehicle.id === id) ?? null : null;
    };

    const enterOrExitBattlefieldVehicle = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || raid.modeId !== BATTLEFIELD_ID || !player || state.overlay) return false;
      const mounted = getMountedBattlefieldVehicle(raid);
      if (mounted) {
        mounted.occupied = false;
        player.mountedVehicleId = null;
        player.x = mounted.x + Math.cos(mounted.yaw) * 2.2;
        player.z = mounted.z - Math.sin(mounted.yaw) * 2.2;
        notify(L('已下车。', 'Exited vehicle.'), 'success');
        return true;
      }
      let nearest = null;
      let nearestDistance = Infinity;
      for (const vehicle of raid.vehicles ?? []) {
        if (vehicle.health <= 0 || vehicle.occupied) continue;
        const distance = distance2D(player.x, player.z, vehicle.x, vehicle.z);
        if (distance < nearestDistance) {
          nearest = vehicle;
          nearestDistance = distance;
        }
      }
      if (!nearest || nearestDistance > 3.4) return false;
      nearest.occupied = true;
      player.mountedVehicleId = nearest.id;
      player.mobilityAction = null;
      player.x = nearest.x;
      player.z = nearest.z;
      notify(L('已进入装甲越野车：WASD 驾驶，E 下车。', 'Entered armored vehicle: WASD to drive, E to exit.'), 'success');
      return true;
    };

    window.__sdrEnterOrExitBattlefieldVehicle = enterOrExitBattlefieldVehicle;
    window.addEventListener('keydown', (event) => {
      if (event.repeat || event.code !== 'KeyE') return;
      if (state.raid?.modeId !== BATTLEFIELD_ID) return;
      if (enterOrExitBattlefieldVehicle()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    const updateBattlefieldVehicles = (dt) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || raid.modeId !== BATTLEFIELD_ID || !player) return;
      const vehicle = getMountedBattlefieldVehicle(raid);
      if (!vehicle) return;

      const forward = (state.input.keys.has('KeyW') || state.input.keys.has('ArrowUp') ? 1 : 0) -
        (state.input.keys.has('KeyS') || state.input.keys.has('ArrowDown') ? 1 : 0);
      const steer = (state.input.keys.has('KeyD') || state.input.keys.has('ArrowRight') ? 1 : 0) -
        (state.input.keys.has('KeyA') || state.input.keys.has('ArrowLeft') ? 1 : 0);

      const targetSpeed = forward * (forward >= 0 ? 15.5 : 8.5);
      vehicle.speed += (targetSpeed - vehicle.speed) * Math.min(1, dt * 3.4);
      if (!forward) vehicle.speed *= Math.pow(0.86, dt * 10);
      const steerStrength = Math.min(1, Math.abs(vehicle.speed) / 6);
      vehicle.yaw += steer * dt * 1.35 * steerStrength * (vehicle.speed >= 0 ? 1 : -1);

      const dx = Math.sin(vehicle.yaw) * vehicle.speed * dt;
      const dz = Math.cos(vehicle.yaw) * vehicle.speed * dt;
      const carrier = { x: vehicle.x, z: vehicle.z, radius: vehicle.radius };
      moveEntityWithCollision(carrier, dx, dz, vehicle.radius);
      vehicle.x = carrier.x;
      vehicle.z = carrier.z;
      vehicle.visual?.root?.position.set(vehicle.x, 0, vehicle.z);
      if (vehicle.visual?.root) vehicle.visual.root.rotation.y = vehicle.yaw;

      player.x = vehicle.x;
      player.z = vehicle.z;
      player.yaw = vehicle.yaw;
      player.sprinting = false;
      player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 100) + dt * 8);

      for (const [enemyId, remaining] of [...vehicle.impactCooldowns.entries()]) {
        const next = remaining - dt;
        if (next <= 0) vehicle.impactCooldowns.delete(enemyId);
        else vehicle.impactCooldowns.set(enemyId, next);
      }
      if (Math.abs(vehicle.speed) >= 5) {
        for (const enemy of raid.enemies ?? []) {
          if (enemy.dead || enemy.despawned || vehicle.impactCooldowns.has(enemy.id)) continue;
          if (distance2D(vehicle.x, vehicle.z, enemy.x, enemy.z) > 2.0) continue;
          const damage = Math.round(55 + Math.min(145, Math.abs(vehicle.speed) * 8));
          const wasAlive = !enemy.dead;
          damageEnemy(enemy, damage, { utilityKind: 'vehicle-impact', ignoreSmoke: true });
          vehicle.impactCooldowns.set(enemy.id, 0.9);
          vehicle.speed *= 0.78;
          if (wasAlive && enemy.dead) raid.vehicleKills = (raid.vehicleKills ?? 0) + 1;
        }
      }
    };

    const getPlayerMoveSpeedBeforeBattlefieldVehicle = typeof getPlayerMoveSpeed === 'function' ? getPlayerMoveSpeed : null;
    if (getPlayerMoveSpeedBeforeBattlefieldVehicle) {
      getPlayerMoveSpeed = function getPlayerMoveSpeedWithVehicle(player, sprinting = false) {
        if (player?.mountedVehicleId && state.raid?.modeId === BATTLEFIELD_ID) return 0;
        return getPlayerMoveSpeedBeforeBattlefieldVehicle.call(this, player, sprinting);
      };
    }

    const damagePlayerBeforeBattlefieldVehicle = typeof applyDamageToPlayer === 'function' ? applyDamageToPlayer : null;
    if (damagePlayerBeforeBattlefieldVehicle) {
      applyDamageToPlayer = function damagePlayerThroughBattlefieldVehicle(amount, ...args) {
        const raid = state.raid;
        const player = raid?.player;
        const vehicle = getMountedBattlefieldVehicle(raid);
        if (!vehicle || vehicle.health <= 0 || !player) {
          return damagePlayerBeforeBattlefieldVehicle.call(this, amount, ...args);
        }
        const raw = Math.max(0, Number(amount) || 0);
        const absorbed = Math.min(vehicle.health, raw * 0.78);
        vehicle.health = Math.max(0, vehicle.health - absorbed);
        const remaining = Math.max(0, raw - absorbed);
        if (vehicle.health <= 0) {
          vehicle.occupied = false;
          player.mountedVehicleId = null;
          player.x = vehicle.x + Math.cos(vehicle.yaw) * 2.4;
          player.z = vehicle.z - Math.sin(vehicle.yaw) * 2.4;
          if (vehicle.visual?.bodyMat) vehicle.visual.bodyMat.diffuseColor = BABYLON.Color3.FromHexString('#262b29');
          notify(L('载具已被摧毁，已强制下车。', 'Vehicle destroyed. You were forced out.'), 'danger');
        }
        return remaining > 0 ? damagePlayerBeforeBattlefieldVehicle.call(this, remaining, ...args) : 0;
      };
    }

    const originalPatchedStartRaid = window.__sdrPatchedStartRaid;
    if (typeof originalPatchedStartRaid === 'function') {
      window.__sdrPatchedStartRaid = function startProductionBattlefield() {
        const result = originalPatchedStartRaid();
        const raid = state.raid;
        if (!raid || raid.modeId !== BATTLEFIELD_ID) return result;
        raid.isBattlefield = true;
        raid.battlefieldScale = 1.5;
        spawnBattlefieldVehicles(raid);

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
        updateBattlefieldVehicles(dt);
      }
      return result;
    };

    const clearRaidBeforeBattlefieldVehicles = clearRaid;
    clearRaid = function clearRaidWithBattlefieldVehicleCleanup(...args) {
      disposeBattlefieldVehicles(state.raid);
      return clearRaidBeforeBattlefieldVehicles.apply(this, args);
    };

    const RESET_DAY_KEY = 'iron-extraction-reset-day-v1';
    const RESET_PASSWORD = '20251001';

    const shopBeforeStashUpgrade = getShopEntries;
    getShopEntries = function permanentShopOnly() {
      return shopBeforeStashUpgrade().filter((entry) => entry.kind !== 'prep');
    };

    const getLocalDayKey = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const runProtectedDailyReset = () => {
      const today = getLocalDayKey();
      let lastResetDay = '';
      try {
        lastResetDay = localStorage.getItem(RESET_DAY_KEY) ?? '';
      } catch {}
      if (lastResetDay === today) {
        notify(L('今天已经重置过一次，明天才能再次重置。', 'The save has already been reset once today. Try again tomorrow.'), 'warning');
        return false;
      }
      const password = window.prompt?.(L('输入重置密码。每天最多重置一次。', 'Enter the reset password. Only one reset is allowed per day.'), '') ?? null;
      if (password === null) return false;
      if (password !== RESET_PASSWORD) {
        notify(L('重置密码错误。', 'Incorrect reset password.'), 'danger');
        return false;
      }
      try {
        localStorage.setItem(RESET_DAY_KEY, today);
      } catch {}
      state.save = defaultSave();
      persistSave();
      if (typeof renderBasePanel === 'function') renderBasePanel();
      notify(L('存档已重置。今天不能再次重置。', 'Save reset complete. Another reset is not allowed today.'), 'warning');
      return true;
    };

    resetSave = runProtectedDailyReset;

    if (refs.saveResetButton && !refs.saveResetButton.dataset.dailyResetProtected) {
      refs.saveResetButton.dataset.dailyResetProtected = 'true';
      refs.saveResetButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        runProtectedDailyReset();
      }, true);
    }

    window.__sdrPersistenceDebug = {
      version: '2026-09-25-persistence-v2',
      resetDayKey: RESET_DAY_KEY,
      resetPasswordRequired: true,
      oneResetPerDay: true,
      shopHasPrep: () => getShopEntries().some((entry) => entry.kind === 'prep'),
      getLocalDayKey,
      runProtectedDailyReset,
    };

    const originalRenderBasePanel = renderBasePanel;
    renderBasePanel = function renderProductionBasePanel() {
      const result = originalRenderBasePanel();
      enhanceEchoLoadoutInfo();
      enhanceStashDirectory();
      return result;
    };

    function enhanceEchoLoadoutInfo() {
      if (state.mode !== 'base') return;
      if (refs.loadoutPrep && !refs.loadoutPrep.querySelector('[data-echo-melee-loadout]')) {
        refs.loadoutPrep.insertAdjacentHTML('beforeend', `
          <div class="prep-row" data-echo-melee-loadout>
            <span>${L('近战武器', 'Melee weapon')}</span>
            <strong>${L('回声 · 3 米 · 200 伤害 · 0.5 秒一刀 · T 挥刀 · H 检视', 'Echo · 3m · 200 damage · 0.5s per slash · T attack · H inspect')}</strong>
          </div>
        `);
      }
      if (refs.armoryPanel && !refs.armoryPanel.querySelector('[data-echo-melee-armory]')) {
        refs.armoryPanel.insertAdjacentHTML('afterbegin', `
          <article class="stash-row echo-melee-armory" data-echo-melee-armory>
            <div>
              <div class="item-title rarity-rare">${L('回声', 'Echo')}</div>
              <div class="item-meta">${L('蓝色科技近战副武器 · 3 米 · 200 伤害 · 0.5 秒一刀 · T 挥刀 · H 检视 · 命中暴露位置 5 秒 · 烟雾中无法使用', 'Blue-tech melee sidearm · 3m · 200 damage · 0.5s per slash · T attack · H inspect · exposes hit targets for 5s · disabled in smoke')}</div>
            </div>
            <strong class="item-meta">${L('已装备', 'Equipped')}</strong>
          </article>
        `);
      }
    }

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
