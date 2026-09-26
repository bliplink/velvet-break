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

    window.__sdrFinalPolishDebug = {
      version: '20260926-final1',
      nonSolidLoot: true,
      continuousEnemyVisuals: true,
      authoritativeStaminaHud: true,
      opaqueBuildings: true,
    };
  };
  boot();
})();