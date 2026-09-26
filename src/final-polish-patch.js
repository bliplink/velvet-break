(() => {
  const boot = () => {
    if (window.__sdrFinalPolishApplied) return;
    if (typeof state === 'undefined' || typeof animateRaidEntities !== 'function' ||
        typeof createContainerVisual !== 'function' || typeof syncHud !== 'function') {
      setTimeout(boot, 80);
      return;
    }
    window.__sdrFinalPolishApplied = true;

    // Final authority for loot containers: visual/searchable, never physical blockers.
    const createContainerBeforeFinal = createContainerVisual;
    createContainerVisual = function createNonSolidContainerFinal(container) {
      const visual = createContainerBeforeFinal(container);
      for (const mesh of [visual?.base, visual?.lid, visual?.beacon]) {
        if (!mesh) continue;
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.metadata = { ...(mesh.metadata ?? {}), nonSolidLootContainer: true };
      }
      const obstacleId = `prop-container-${container?.id}`;
      for (let i = obstacleDefs.length - 1; i >= 0; i--) {
        if (obstacleDefs[i]?.id === obstacleId) obstacleDefs.splice(i, 1);
      }
      return visual;
    };

    // Remove any legacy container blockers already created before this patch loaded.
    for (let i = obstacleDefs.length - 1; i >= 0; i--) {
      if (String(obstacleDefs[i]?.id ?? '').startsWith('prop-container-')) obstacleDefs.splice(i, 1);
    }

    // Final visual pass: enemy roots always follow simulation each rendered frame.
    const animateBeforeFinal = animateRaidEntities;
    animateRaidEntities = function animateContinuousEnemiesFinal(dt, ...args) {
      const result = animateBeforeFinal.call(this, dt, ...args);
      const raid = state.raid;
      if (!raid?.player) return result;
      for (const enemy of raid.enemies ?? []) {
        if (enemy?.despawned || !enemy?.visual?.root) continue;
        const root = enemy.visual.root;
        root.position.x = enemy.x;
        root.position.z = enemy.z;
        root.rotation.y = enemy.heading ?? root.rotation.y;
      }
      return result;
    };

    // One authoritative stamina HUD after every earlier patch has run.
    const syncHudBeforeFinal = syncHud;
    syncHud = function syncFinalStaminaHud(...args) {
      const result = syncHudBeforeFinal.apply(this, args);
      const player = state.raid?.player;
      if (!player) return result;
      const max = Math.max(1, Number(player.maxStamina ?? (player.operatorId === 'lingshuang' ? 650 : 500)));
      player.stamina = Math.max(0, Math.min(max, Number(player.stamina ?? max)));
      const value = document.getElementById('staminaValue');
      const fill = document.getElementById('staminaMeterFill');
      if (value) value.textContent = `${Math.round(player.stamina)} / ${Math.round(max)}`;
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, player.stamina / max * 100)).toFixed(1)}%`;
      return result;
    };

    // Final building opacity guard, including panels, alarms and secure doors.
    const structures = window.__sdrInteractiveBuildingStructures;
    for (const mesh of structures?.meshes ?? []) {
      const material = mesh?.material;
      if (!material) continue;
      material.alpha = 1;
      if (window.BABYLON?.Material) material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
    }

    // Lightweight danger readout: nearby living enemies only; no wallhack positions.
    const ensureDangerBadge = () => {
      let badge = document.getElementById('raidDangerBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'raidDangerBadge';
        badge.style.cssText = 'position:fixed;right:18px;top:86px;z-index:1200;padding:5px 9px;border:1px solid rgba(255,190,92,.35);border-radius:4px;background:rgba(12,16,18,.58);color:#ffd18a;font:700 11px/1.2 system-ui;letter-spacing:.08em;pointer-events:none;opacity:.82';
        document.body.appendChild(badge);
      }
      return badge;
    };
    let dangerAccumulator = 0;
    const updateRaidBeforeDanger = typeof updateRaid === 'function' ? updateRaid : null;
    if (updateRaidBeforeDanger) {
      updateRaid = function updateRaidWithDangerReadout(dt, ...args) {
        const result = updateRaidBeforeDanger.call(this, dt, ...args);
        dangerAccumulator += dt;
        if (dangerAccumulator >= 0.35) {
          dangerAccumulator = 0;
          const raid = state.raid;
          const badge = ensureDangerBadge();
          if (!raid?.player) {
            badge.style.display = 'none';
          } else {
            badge.style.display = '';
            const nearby = (raid.enemies ?? []).filter(enemy => !enemy.dead && !enemy.despawned && Math.hypot(enemy.x - raid.player.x, enemy.z - raid.player.z) <= 32).length;
            badge.textContent = nearby >= 6 ? '威胁：极高' : nearby >= 3 ? '威胁：高' : nearby >= 1 ? '威胁：警戒' : '威胁：低';
          }
        }
        return result;
      };
    }

    window.__sdrFinalPolishDebug = {
      version: '20260926-final1',
      nonSolidLoot: true,
      continuousEnemyVisuals: true,
      authoritativeStaminaHud: true,
      opaqueBuildings: true,
      dangerReadout: true,
    };
  };
  boot();
})();