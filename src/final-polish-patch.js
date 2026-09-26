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

    // Echo is a permanent unlock: equip it automatically at the start of every raid.
    const startRaidBeforeEchoUnlock = typeof startRaid === 'function' ? startRaid : null;
    if (startRaidBeforeEchoUnlock) {
      startRaid = function startRaidWithPermanentEcho(...args) {
        const result = startRaidBeforeEchoUnlock.apply(this, args);
        if (state.save?.echoUnlocked && state.raid?.player) {
          state.raid.player.echoKnifeEquipped = true;
        }
        return result;
      };
    }

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

    // Remove duplicate stamina widgets created by older structure builds.
    const staminaPanels = [...document.querySelectorAll('.stamina-stat, #staminaPanel')];
    const canonicalStamina = document.querySelector('.stamina-stat');
    for (const panel of staminaPanels) {
      if (canonicalStamina && panel !== canonicalStamina && panel.id === 'staminaPanel') panel.remove();
    }

    // Final building opacity guard. Glass panes are the only structural meshes allowed to stay transparent.
    const forceOpaqueBuildingMeshes = () => {
      const structures = window.__sdrInteractiveBuildingStructures;
      const candidates = new Set([
        ...(world?.obstacleMeshes ?? []),
        ...(structures?.meshes ?? []),
        ...(scene?.meshes ?? []).filter(mesh =>
          /(?:wall|roof|floor|building|obstacle|stair|ladder|awning|door|cover|divider|window-frame)/i.test(mesh?.name ?? '') &&
          !/window-pane|lamp|beacon|halo|glow/i.test(mesh?.name ?? '')
        ),
      ]);
      for (const mesh of candidates) {
        const material = mesh?.material;
        if (!material) continue;
        material.alpha = 1;
        if (window.BABYLON?.Material) material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      }
    };
    forceOpaqueBuildingMeshes();
    // Structures finish booting asynchronously; one delayed correction is enough.
    // Avoid rescanning the entire scene forever just to keep static building materials opaque.
    setTimeout(forceOpaqueBuildingMeshes, 1600);

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

    // Recon role feedback: summarize scan value without exposing permanent positions.
    let reconNoticeReady = true;
    const useAbilityBeforeReconFeedback = typeof useOperatorAbility === 'function' ? useOperatorAbility : null;
    if (useAbilityBeforeReconFeedback) {
      useOperatorAbility = function useOperatorAbilityWithReconFeedback(...args) {
        const player = state.raid?.player;
        const wasRecon = player?.operatorId === 'recon';
        const chargesBefore = player?.abilityCharges ?? 0;
        const result = useAbilityBeforeReconFeedback.apply(this, args);
        if (wasRecon && chargesBefore > (player?.abilityCharges ?? 0) && reconNoticeReady) {
          const raid = state.raid;
          const revealed = (raid?.enemies ?? []).filter(enemy => !enemy.dead && !enemy.despawned && (enemy.revealedTimer ?? 0) > 0).length;
          const elites = (raid?.enemies ?? []).filter(enemy => !enemy.dead && !enemy.despawned && (enemy.revealedTimer ?? 0) > 0 && (enemy.isNamelessBoss || enemy.type === 'bruiser')).length;
          notify(`侦查回波：发现 ${revealed} 个目标${elites ? `，其中高威胁 ${elites} 个` : ''}。`, revealed ? 'success' : 'warning');
          reconNoticeReady = false;
          setTimeout(() => { reconNoticeReady = true; }, 500);
        }
        return result;
      };
    }


    // Claire: separate four-use no-cooldown global scan from her jammer utility.
    const useAbilityBeforeClaire = typeof useOperatorAbility === 'function' ? useOperatorAbility : null;
    if (useAbilityBeforeClaire) {
      useOperatorAbility = function useClaireGlobalScan(...args) {
        const raid = state.raid;
        const player = raid?.player;
        if (player?.operatorId !== 'recon') return useAbilityBeforeClaire.apply(this, args);
        player.claireScanCharges = Number.isFinite(player.claireScanCharges) ? player.claireScanCharges : 4;
        if (player.claireScanCharges <= 0) {
          notify('全域扫描次数已耗尽。', 'warning');
          return;
        }
        player.claireScanCharges -= 1;
        player.abilityCharges = player.claireScanCharges;
        player.abilityCooldown = 0;
        player.abilityCooldownPending = false;
        player.abilityActiveTimer = Math.max(player.abilityActiveTimer ?? 0, 30);
        player.reconZone = { minX: -MAP_HALF, maxX: MAP_HALF, minZ: -MAP_HALF, maxZ: MAP_HALF };
        let count = 0;
        for (const enemy of raid.enemies ?? []) {
          if (enemy.dead || enemy.despawned) continue;
          enemy.revealedTimer = Math.max(enemy.revealedTimer ?? 0, 30);
          enemy.claireFreezeTimer = Math.max(enemy.claireFreezeTimer ?? 0, 20);
          count += 1;
        }
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#72d9ff', 0.16, 0.2);
        notify(`全域扫描：冻结 ${count} 名敌人 20 秒，并暴露 30 秒。剩余 ${player.claireScanCharges} 次。`, 'success');
        syncHud();
      };
    }

    const updateEnemiesBeforeClaire = typeof updateEnemies === 'function' ? updateEnemies : null;
    if (updateEnemiesBeforeClaire) {
      updateEnemies = function updateEnemiesWithClaireFreeze(dt, ...args) {
        const raid = state.raid;
        const frozen = [];
        for (const enemy of raid?.enemies ?? []) {
          if ((enemy.claireFreezeTimer ?? 0) > 0 && !enemy.dead && !enemy.despawned) {
            enemy.claireFreezeTimer = Math.max(0, enemy.claireFreezeTimer - dt);
            frozen.push({ enemy, x: enemy.x, z: enemy.z, heading: enemy.heading, alertTimer: enemy.alertTimer });
          }
        }
        const result = updateEnemiesBeforeClaire.call(this, dt, ...args);
        for (const snap of frozen) {
          if (snap.enemy.dead || snap.enemy.despawned) continue;
          snap.enemy.x = snap.x;
          snap.enemy.z = snap.z;
          snap.enemy.heading = snap.heading;
          snap.enemy.alertTimer = snap.alertTimer;
          snap.enemy.revealedTimer = Math.max(snap.enemy.revealedTimer ?? 0, snap.enemy.claireFreezeTimer > 0 ? 0.1 : 0);
        }
        return result;
      };
    }

    const useClaireJammer = () => {
      const player = state.raid?.player;
      if (!player || player.operatorId !== 'recon') return;
      player.claireJammerCharges = Number.isFinite(player.claireJammerCharges) ? player.claireJammerCharges : 4;
      player.claireJammerCooldown = Math.max(0, Number(player.claireJammerCooldown ?? 0));
      if (player.claireJammerCharges <= 0) return notify('电子干扰器已耗尽。', 'warning');
      if (player.claireJammerCooldown > 0) return notify(`电子干扰器冷却中 ${player.claireJammerCooldown.toFixed(1)}s。`, 'warning');
      player.claireJammerCharges -= 1;
      player.claireJammerCooldown = 20;
      player.claireInvisibleTimer = 10;
      notify(`电子干扰器启动：隐身 10 秒。剩余 ${player.claireJammerCharges} 个。`, 'success');
    };
    window.__sdrUseClaireJammer = useClaireJammer;
    window.addEventListener('keydown', (event) => {
      if (event.repeat || state.mode !== 'raid' || !state.raid || state.overlay) return;
      if (event.code === 'KeyG' || event.key?.toLowerCase?.() === 'g') {
        useClaireJammer();
        event.preventDefault();
      }
    });

    const updateRaidBeforeClaireTimers = typeof updateRaid === 'function' ? updateRaid : null;
    if (updateRaidBeforeClaireTimers) {
      updateRaid = function updateRaidWithClaireTimers(dt, ...args) {
        const player = state.raid?.player;
        if (player?.operatorId === 'recon') {
          if (!Number.isFinite(player.claireScanCharges)) {
            player.claireScanCharges = 4;
            player.abilityCharges = 4;
          }
          if (!Number.isFinite(player.claireJammerCharges)) player.claireJammerCharges = 4;
          player.claireJammerCooldown = Math.max(0, Number(player.claireJammerCooldown ?? 0) - dt);
          player.claireInvisibleTimer = Math.max(0, Number(player.claireInvisibleTimer ?? 0) - dt);
        }
        return updateRaidBeforeClaireTimers.call(this, dt, ...args);
      };
    }

    window.__sdrFinalPolishDebug = {
      version: '20260926-final5',
      nonSolidLoot: true,
      continuousEnemyVisuals: true,
      authoritativeStaminaHud: true,
      opaqueBuildings: true,
      permanentEcho: true,
      singleStaminaHud: true,
      dangerReadout: true,
      reconRoleFeedback: true,
      claireGlobalScan: true,
      claireJammer: true,
    };
  };
  boot();
})();