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
    const startRaidBeforeNamelessReset = typeof startRaid === 'function' ? startRaid : null;
    if (startRaidBeforeNamelessReset) {
      startRaid = function startRaidWithFreshNameless(...args) {
        const result = startRaidBeforeNamelessReset.apply(this, args);
        const raid = state.raid;
        if (raid?.enemies) {
          const leftovers = raid.enemies.filter(enemy => enemy?.isNamelessBoss || enemy?.isNamelessMinion);
          for (const enemy of leftovers) enemy?.visual?.root?.dispose?.(false, true);
          raid.enemies = raid.enemies.filter(enemy => !enemy?.isNamelessBoss && !enemy?.isNamelessMinion);
          raid.namelessSpawned = false;
          raid.namelessGuardResetToken = (raid.namelessGuardResetToken ?? 0) + 1;
          raid.initialEnemyCount = raid.enemies.length;
          raid.enemyCount = raid.enemies.length;
        }
        return result;
      };
    }

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

    // Last-loaded solid shell reinforcement for Lockdown buildings.
    // This does not trust earlier facade materials: it draws independent opaque wall panels
    // around every large building and leaves only registered doors/windows as openings.
    const buildFinalOpaqueLockdownShells = () => {
      if (window.__sdrFinalOpaqueLockdownShellsBuilt || !window.BABYLON || !scene) return;
      window.__sdrFinalOpaqueLockdownShellsBuilt = true;
      const registry = window.__sdrStructureRegistry ?? { windows: [], doors: [] };
      const buildings = (obstacleDefs ?? []).filter(obstacle =>
        obstacle && obstacle.w >= 7 && obstacle.d >= 6 && obstacle.h >= 3.45 &&
        !obstacle.structureId && !String(obstacle.id ?? '').includes('-wall-')
      );
      const mat = new BABYLON.StandardMaterial('final-lockdown-solid-shell-mat', scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString('#3a474d');
      mat.emissiveColor = BABYLON.Color3.FromHexString('#10171b');
      mat.specularColor = BABYLON.Color3.Black();
      mat.alpha = 1;
      mat.backFaceCulling = false;
      mat.disableDepthWrite = false;
      if ('forceDepthWrite' in mat) mat.forceDepthWrite = true;
      mat.needDepthPrePass = false;
      if (BABYLON.Material) mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      if (BABYLON.Engine?.ALPHA_DISABLE !== undefined) mat.alphaMode = BABYLON.Engine.ALPHA_DISABLE;

      const makePanel = (name, x, y, z, width, height, depth) => {
        if (width <= 0.04 || height <= 0.04 || depth <= 0.04) return null;
        const mesh = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, scene);
        mesh.position.set(x, y, z);
        mesh.material = mat;
        mesh.visibility = 1;
        mesh.isVisible = true;
        mesh.isPickable = true;
        mesh.renderingGroupId = 0;
        mesh.metadata = { raycastTarget: 'obstacle', finalOpaqueBuildingShell: true };
        return mesh;
      };

      const splitFace = (obstacle, face) => {
        const horizontal = face === 'north' || face === 'south';
        const spanMin = horizontal ? obstacle.x - obstacle.w / 2 : obstacle.z - obstacle.d / 2;
        const spanMax = horizontal ? obstacle.x + obstacle.w / 2 : obstacle.z + obstacle.d / 2;
        const openings = [
          ...(registry.windows ?? []),
          ...(registry.doors ?? []),
        ].filter(feature => feature?.obstacleId === obstacle.id && feature.face === face)
          .map(feature => {
            const center = horizontal ? feature.x : feature.z;
            const width = Math.max(0.9, Number(feature.width ?? 1.2));
            const height = Math.min(obstacle.h - 0.15, Math.max(0.8, Number(feature.height ?? (feature.type === 'door' ? 2.2 : 0.9))));
            const centerY = Math.max(height / 2 + 0.04, Number(feature.y ?? (feature.type === 'door' ? height / 2 : 1.8)));
            return {
              left: Math.max(spanMin, center - width / 2),
              right: Math.min(spanMax, center + width / 2),
              bottom: Math.max(0, centerY - height / 2),
              top: Math.min(obstacle.h, centerY + height / 2),
            };
          })
          .sort((a, b) => a.left - b.left);

        const wallX = face === 'west' ? obstacle.x - obstacle.w / 2 + 0.025 :
          face === 'east' ? obstacle.x + obstacle.w / 2 - 0.025 : obstacle.x;
        const wallZ = face === 'north' ? obstacle.z - obstacle.d / 2 + 0.025 :
          face === 'south' ? obstacle.z + obstacle.d / 2 - 0.025 : obstacle.z;
        const depth = horizontal ? 0.09 : obstacle.d;
        const width = horizontal ? obstacle.w : 0.09;

        if (!openings.length) {
          makePanel(`final-solid-${obstacle.id}-${face}`, wallX, obstacle.h / 2, wallZ, width, obstacle.h, depth);
          return;
        }

        let cursor = spanMin;
        for (let index = 0; index < openings.length; index++) {
          const opening = openings[index];
          if (opening.left > cursor + 0.03) {
            const span = opening.left - cursor;
            makePanel(
              `final-solid-${obstacle.id}-${face}-side-${index}`,
              horizontal ? cursor + span / 2 : wallX,
              obstacle.h / 2,
              horizontal ? wallZ : cursor + span / 2,
              horizontal ? span : 0.09,
              obstacle.h,
              horizontal ? 0.09 : span,
            );
          }
          if (opening.bottom > 0.04) {
            makePanel(
              `final-solid-${obstacle.id}-${face}-lower-${index}`,
              horizontal ? (opening.left + opening.right) / 2 : wallX,
              opening.bottom / 2,
              horizontal ? wallZ : (opening.left + opening.right) / 2,
              horizontal ? opening.right - opening.left : 0.09,
              opening.bottom,
              horizontal ? 0.09 : opening.right - opening.left,
            );
          }
          if (opening.top < obstacle.h - 0.04) {
            const h = obstacle.h - opening.top;
            makePanel(
              `final-solid-${obstacle.id}-${face}-upper-${index}`,
              horizontal ? (opening.left + opening.right) / 2 : wallX,
              opening.top + h / 2,
              horizontal ? wallZ : (opening.left + opening.right) / 2,
              horizontal ? opening.right - opening.left : 0.09,
              h,
              horizontal ? 0.09 : opening.right - opening.left,
            );
          }
          cursor = Math.max(cursor, opening.right);
        }
        if (cursor < spanMax - 0.03) {
          const span = spanMax - cursor;
          makePanel(
            `final-solid-${obstacle.id}-${face}-tail`,
            horizontal ? cursor + span / 2 : wallX,
            obstacle.h / 2,
            horizontal ? wallZ : cursor + span / 2,
            horizontal ? span : 0.09,
            obstacle.h,
            horizontal ? 0.09 : span,
          );
        }
      };

      for (const obstacle of buildings) {
        for (const face of ['north', 'south', 'east', 'west']) splitFace(obstacle, face);
        makePanel(
          `final-solid-${obstacle.id}-roof`,
          obstacle.x,
          obstacle.h + 0.055,
          obstacle.z,
          obstacle.w + 0.1,
          0.11,
          obstacle.d + 0.1,
        );
      }
    };
    buildFinalOpaqueLockdownShells();

    const buildFinalOpaqueInteractiveShells = () => {
      if (!window.BABYLON || !scene) return false;
      const interactiveIds = new Set(['center-depot','west-barracks','east-hangar','west-bunker','north-silo','south-yard-2']);
      const interactiveWalls = (obstacleDefs ?? []).filter(wall => {
        const structureId = String(wall?.structureId ?? '');
        return interactiveIds.has(structureId) && String(wall?.id ?? '').includes('-wall-');
      });
      // expansion-patch initializes these asynchronously; do not mark complete too early.
      if (!interactiveWalls.length) return false;

      const mat = scene.getMaterialByName?.('final-interactive-solid-shell-mat')
        ?? new BABYLON.StandardMaterial('final-interactive-solid-shell-mat', scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString('#3b474d');
      mat.emissiveColor = BABYLON.Color3.FromHexString('#0f171b');
      mat.specularColor = BABYLON.Color3.Black();
      mat.alpha = 1;
      mat.backFaceCulling = false;
      mat.disableDepthWrite = false;
      if ('forceDepthWrite' in mat) mat.forceDepthWrite = true;
      mat.needDepthPrePass = false;
      if (BABYLON.Material) mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      if (BABYLON.Engine?.ALPHA_DISABLE !== undefined) mat.alphaMode = BABYLON.Engine.ALPHA_DISABLE;

      const completedStructures = new Set();
      let createdWalls = 0;
      for (const wall of interactiveWalls) {
        const structureId = String(wall?.structureId ?? '');
        completedStructures.add(structureId);
        const name = `final-interactive-solid-${wall.id}`;
        if (scene.getMeshByName?.(name)) continue;
        const mesh = BABYLON.MeshBuilder.CreateBox(name, {
          width: wall.w,
          height: wall.h,
          depth: wall.d,
        }, scene);
        mesh.position.set(wall.x, wall.h / 2, wall.z);
        mesh.material = mat;
        mesh.visibility = 1;
        mesh.isVisible = true;
        mesh.isPickable = true;
        mesh.renderingGroupId = 0;
        mesh.alwaysSelectAsActiveMesh = false;
        mesh.metadata = {
          raycastTarget: 'obstacle',
          structureId,
          finalOpaqueBuildingShell: true,
          finalInteractiveOpaqueShell: true,
        };
        createdWalls++;
      }

      // Duplicate the interactive roofs too; the legacy full-building mesh is disabled.
      const structures = window.__sdrInteractiveBuildingStructures;
      for (const mesh of structures?.meshes ?? []) {
        const name = String(mesh?.name ?? '');
        if (!name.includes('-interactive-roof')) continue;
        const structureId = String(mesh?.metadata?.structureId ?? name.replace(/-interactive-roof$/, ''));
        if (!interactiveIds.has(structureId)) continue;
        const bounds = mesh.getBoundingInfo?.().boundingBox;
        const size = bounds?.extendSizeWorld;
        if (!size) continue;
        const cloneName = `final-interactive-solid-${structureId}-roof`;
        if (scene.getMeshByName?.(cloneName)) continue;
        const roof = BABYLON.MeshBuilder.CreateBox(cloneName, {
          width: size.x * 2,
          height: Math.max(0.12, size.y * 2),
          depth: size.z * 2,
        }, scene);
        roof.position.copyFrom(mesh.getAbsolutePosition());
        roof.material = mat;
        roof.visibility = 1;
        roof.isVisible = true;
        roof.isPickable = true;
        roof.renderingGroupId = 0;
        roof.metadata = {
          raycastTarget: 'obstacle',
          structureId,
          finalOpaqueBuildingShell: true,
          finalInteractiveOpaqueShell: true,
        };
      }
      window.__sdrFinalOpaqueInteractiveShellCount = scene.meshes.filter(mesh => mesh.metadata?.finalInteractiveOpaqueShell).length;
      window.__sdrFinalOpaqueInteractiveStructures = [...completedStructures];
      window.__sdrFinalOpaqueInteractiveShellsBuilt = completedStructures.size === interactiveIds.size;
      return window.__sdrFinalOpaqueInteractiveShellsBuilt;
    };

    // The interactive buildings are created by an async boot patch. Retry until all six exist.
    const ensureFinalOpaqueInteractiveShells = () => {
      if (window.__sdrFinalOpaqueInteractiveShellsBuilt) return;
      buildFinalOpaqueInteractiveShells();
      if (!window.__sdrFinalOpaqueInteractiveShellsBuilt) window.setTimeout(ensureFinalOpaqueInteractiveShells, 120);
    };
    ensureFinalOpaqueInteractiveShells();
    window.setTimeout(ensureFinalOpaqueInteractiveShells, 500);
    window.setTimeout(ensureFinalOpaqueInteractiveShells, 1500);
    window.setTimeout(ensureFinalOpaqueInteractiveShells, 3500);

    // Final building opacity guard. Glass panes are the only structural meshes allowed to stay transparent.
    const forceOpaqueBuildingMeshes = () => {
      const structures = window.__sdrInteractiveBuildingStructures;
      const candidates = new Set([
        ...(world?.obstacleMeshes ?? []),
        ...(structures?.meshes ?? []),
        ...(scene?.meshes ?? []).filter(mesh => {
          const name = String(mesh?.name ?? '');
          const parentName = String(mesh?.parent?.name ?? '');
          const metadata = mesh?.metadata ?? {};
          const structural =
            Boolean(metadata.structureId || metadata.obstacleId || metadata.raycastTarget === 'obstacle') ||
            /(?:wall|roof|floor|building|obstacle|stair|ladder|awning|door|cover|divider|window-frame|facade|warehouse|hangar|bunker|depot|silo|office|apartment)/i.test(name) ||
            /^decor-/.test(parentName);
          const intentionallyTransparent = /window-pane|lamp|beacon|halo|glow|smoke|glass/i.test(name);
          return structural && !intentionallyTransparent;
        }),
      ]);
      for (const mesh of candidates) {
        const material = mesh?.material;
        if (!material) continue;
        mesh.visibility = 1;
        if ('isVisible' in mesh) mesh.isVisible = true;
        material.alpha = 1;
        mesh.renderingGroupId = 0;
        if ('alphaIndex' in mesh) mesh.alphaIndex = 0;
        mesh.alwaysSelectAsActiveMesh = false;
        if ('useAlphaFromDiffuseTexture' in material) material.useAlphaFromDiffuseTexture = false;
        if ('opacityTexture' in material) material.opacityTexture = null;
        if ('alphaMode' in material && window.BABYLON?.Engine) material.alphaMode = BABYLON.Engine.ALPHA_DISABLE;
        if (window.BABYLON?.Material) material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
        material.needDepthPrePass = false;
        if ('disableDepthWrite' in material) material.disableDepthWrite = false;
        if ('forceDepthWrite' in material) material.forceDepthWrite = true;
        if ('separateCullingPass' in material) material.separateCullingPass = false;
        if ('backFaceCulling' in material) material.backFaceCulling = false;
        if (material.diffuseTexture && 'hasAlpha' in material.diffuseTexture) material.diffuseTexture.hasAlpha = false;
      }
    };
    forceOpaqueBuildingMeshes();
    // Keep a low-frequency structural opacity guard alive. Several late patches
    // replace or clone building materials after startup; without this, those
    // meshes can become transparent again on longer sessions.
    setTimeout(forceOpaqueBuildingMeshes, 600);
    setTimeout(forceOpaqueBuildingMeshes, 1800);
    setTimeout(forceOpaqueBuildingMeshes, 4200);
    const opaqueGuardTimer = window.setInterval(() => {
      if (state.mode !== 'raid' || !scene || scene._isDisposed === true || scene.isDisposed === true) return;
      forceOpaqueBuildingMeshes();
    }, 2200);

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
        notify(`全域扫描：冻结 ${count} 名敌人 20 秒、暴露 30 秒；30 秒内移速 +35%、换弹更快、后坐/散布降低并获得 35% 减伤。剩余 ${player.claireScanCharges} 次。`, 'success');
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

    const syncReconWallRevealDepth = () => {
      const raid = state.raid;
      if (!raid) return;
      const allowThroughWalls = raid.player?.operatorId === 'recon' && (raid.player?.abilityActiveTimer ?? 0) > 0;
      for (const enemy of raid.enemies ?? []) {
        if (!enemy?.visual) continue;

        // Normal enemies must always obey world depth and never render as an x-ray overlay.
        for (const mesh of enemy.visual.overlayMeshes ?? []) {
          if (!mesh) continue;
          mesh.renderingGroupId = 0;
          if (!allowThroughWalls) {
            mesh.renderOverlay = false;
            mesh.overlayAlpha = 0;
          }
        }

        const revealMaterial = enemy.visual.revealMaterial;
        const classLabelMaterial = enemy.visual.classLabelMaterial;
        for (const mesh of enemy.visual.revealMeshes ?? []) {
          mesh.renderingGroupId = allowThroughWalls ? 3 : 0;
          mesh.alwaysSelectAsActiveMesh = allowThroughWalls;
          if (!allowThroughWalls) {
            mesh.setEnabled(false);
            mesh.isVisible = false;
          }
        }

        if (enemy.visual.classLabel && !allowThroughWalls) {
          enemy.visual.classLabel.setEnabled(false);
          enemy.visual.classLabel.isVisible = false;
        }

        if (revealMaterial) {
          revealMaterial.depthFunction = allowThroughWalls
            ? (BABYLON.ALWAYS ?? 519)
            : (BABYLON.LEQUAL ?? 515);
          if (!allowThroughWalls) revealMaterial.alpha = 0;
        }
        if (classLabelMaterial) {
          classLabelMaterial.depthFunction = allowThroughWalls
            ? (BABYLON.ALWAYS ?? 519)
            : (BABYLON.LEQUAL ?? 515);
          if (!allowThroughWalls) classLabelMaterial.alpha = 0;
        }
      }
    };

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
        const result = updateRaidBeforeClaireTimers.call(this, dt, ...args);
        if (!window.__sdrFinalOpaqueInteractiveShellsBuilt) buildFinalOpaqueInteractiveShells();
        // Run last so no earlier patch can reopen enemy x-ray rendering in the same frame.
        syncReconWallRevealDepth();
        return result;
      };
    }


    // Final deploy authority for Vehicle Battlefield. Route the lobby deploy button
    // through the latest wrapped startRaid so battlefield initialization cannot be skipped.
    if (refs?.deployButton && !refs.deployButton.dataset.finalBattlefieldDeployBound) {
      refs.deployButton.dataset.finalBattlefieldDeployBound = 'true';
      refs.deployButton.addEventListener('click', (event) => {
        if (state.mode !== 'base' || getSelectedLobbyModeId?.() !== 'battlefield') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        state.save.selectedModeId = 'battlefield';
        persistSave?.();
        startRaid();
      }, true);
    }

    // Final mode authority: only Lockdown and Vehicle Battlefield are selectable.
    const getLobbyModeDefsBeforeFinalModeTrim = typeof getLobbyModeDefs === 'function' ? getLobbyModeDefs : null;
    if (getLobbyModeDefsBeforeFinalModeTrim) {
      getLobbyModeDefs = function getFinalLobbyModeDefs() {
        const defs = getLobbyModeDefsBeforeFinalModeTrim.apply(this, arguments) ?? {};
        const finalDefs = {};
        if (defs.raid) finalDefs.raid = defs.raid;
        if (defs.battlefield) finalDefs.battlefield = defs.battlefield;
        return finalDefs;
      };
      if (!['raid', 'battlefield'].includes(state.save?.selectedModeId)) {
        state.save.selectedModeId = 'raid';
        if (typeof persistSave === 'function') persistSave();
      }
      if (state.mode === 'base' && typeof renderBasePanel === 'function') {
        renderBasePanel();
      }
    }

    // Final operator power pass. This lives in the last-loaded authority patch so
    // earlier operator/engineer/warden definitions cannot weaken it later.
    const getOperatorDefsBeforePowerPass = typeof getOperatorDefs === 'function' ? getOperatorDefs : null;
    if (getOperatorDefsBeforePowerPass) {
      getOperatorDefs = function getStrengthenedOperatorDefs() {
        const defs = getOperatorDefsBeforePowerPass.apply(this, arguments);
        if (defs.assault) Object.assign(defs.assault, {
          moveMult: 1.04,
          spreadMult: 0.82,
          recoilMult: 0.84,
          reloadMult: 0.86,
          baseDamageMult: 1.08,
          abilityDuration: 16,
          speedBoostMult: 1.40,
          damageBoostMult: 1.35,
          killExtendSeconds: 1.0,
          killHeal: 40,
          startArmorBonus: Math.max(defs.assault.startArmorBonus ?? 0, 170),
        });
        if (defs.recon) Object.assign(defs.recon, {
          moveMult: Math.max(defs.recon.moveMult ?? 1, 1.15),
          spreadMult: Math.min(defs.recon.spreadMult ?? 1, 0.82),
          recoilMult: Math.min(defs.recon.recoilMult ?? 1, 0.84),
          reloadMult: Math.min(defs.recon.reloadMult ?? 1, 0.84),
          baseDamageMult: 1.16,
          scanDamageMult: Math.max(defs.recon.scanDamageMult ?? 1, 2.5),
          abilityMoveMult: 1.35,
          abilitySpreadMult: 0.70,
          abilityRecoilMult: 0.75,
          abilityReloadMult: 0.75,
          abilityDamageTakenMult: 0.65,
        });
        if (defs.medic) Object.assign(defs.medic, {
          moveMult: Math.max(defs.medic.moveMult ?? 1, 1.08),
          spreadMult: Math.min(defs.medic.spreadMult ?? 1, 0.88),
          recoilMult: Math.min(defs.medic.recoilMult ?? 1, 0.90),
          reloadMult: Math.min(defs.medic.reloadMult ?? 1, 0.88),
          baseDamageMult: 1.18,
          speedBoostMult: 1.45,
          postSpeedBoostMult: 1.20,
        });
        if (defs.engineer) Object.assign(defs.engineer, {
          moveMult: Math.max(defs.engineer.moveMult ?? 1, 1.06),
          spreadMult: Math.min(defs.engineer.spreadMult ?? 1, 0.50),
          recoilMult: Math.min(defs.engineer.recoilMult ?? 1, 0.50),
          reloadMult: Math.min(defs.engineer.reloadMult ?? 1, 0.86),
          baseDamageMult: 1.20,
        });
        if (defs.lingshuang) Object.assign(defs.lingshuang, {
          moveMult: Math.max(defs.lingshuang.moveMult ?? 1, 1.08),
          spreadMult: Math.min(defs.lingshuang.spreadMult ?? 1, 0.74),
          recoilMult: Math.min(defs.lingshuang.recoilMult ?? 1, 0.74),
          reloadMult: Math.min(defs.lingshuang.reloadMult ?? 1, 0.78),
          baseDamageMult: 1.18,
        });
        return defs;
      };
    }

    const getMoveSpeedBeforePowerPass = typeof getPlayerMoveSpeed === 'function' ? getPlayerMoveSpeed : null;
    if (getMoveSpeedBeforePowerPass) {
      getPlayerMoveSpeed = function getStrengthenedPlayerMoveSpeed(player, sprinting = false) {
        let speed = getMoveSpeedBeforePowerPass.call(this, player, sprinting);
        if (!player) return speed;
        if (player.operatorId === 'medic') {
          if ((player.damageReductionTimer ?? 0) > 0 && (player.medicSpeedBoostTimer ?? 0) <= 0) {
            speed *= 1.20;
          }
        }
        return speed;
      };
    }

    const GLOBAL_FIREARM_DAMAGE_MULT = 1.30;

    const weaponDamageBeforePowerPass = typeof getWeaponDamage === 'function' ? getWeaponDamage : null;
    if (weaponDamageBeforePowerPass) {
      getWeaponDamage = function getStrengthenedWeaponDamage(weaponId = 'rifle', options = {}) {
        const base = weaponDamageBeforePowerPass.call(this, weaponId, options);
        const player = options?.player ?? state.raid?.player;
        if (!player) return base;
        const operator = getPlayerOperatorDef(player);
        return base * GLOBAL_FIREARM_DAMAGE_MULT * (operator?.baseDamageMult ?? 1);
      };
    }

    const currentStatsBeforePowerPass = typeof getCurrentPlayerWeaponStats === 'function' ? getCurrentPlayerWeaponStats : null;
    if (currentStatsBeforePowerPass) {
      getCurrentPlayerWeaponStats = function getStrengthenedCurrentWeaponStats(player = state.raid?.player) {
        const raw = currentStatsBeforePowerPass.call(this, player);
        if (!raw || !player) return raw;
        const stats = { ...raw };
        const operator = getPlayerOperatorDef(player);
        const baseDamageMult = operator?.baseDamageMult ?? 1;
        stats.projectileDamage = (stats.projectileDamage ?? stats.damage ?? 0) * GLOBAL_FIREARM_DAMAGE_MULT * baseDamageMult;
        stats.damage = (stats.damage ?? stats.projectileDamage ?? 0) * GLOBAL_FIREARM_DAMAGE_MULT * baseDamageMult;
        if (player.operatorId === 'recon' && (player.abilityActiveTimer ?? 0) > 0) {
          stats.projectileDamage *= operator.scanDamageMult ?? 2.5;
          stats.damage *= operator.scanDamageMult ?? 2.5;
          stats.spread *= operator.abilitySpreadMult ?? 0.70;
          stats.reload *= operator.abilityReloadMult ?? 0.75;
        }
        return stats;
      };
    }

    const damageBeforeClairePowerPass = typeof applyDamageToPlayer === 'function' ? applyDamageToPlayer : null;
    if (damageBeforeClairePowerPass) {
      applyDamageToPlayer = function applyOperatorPowerDamageReduction(amount, ...args) {
        const player = state.raid?.player;
        let incoming = amount;
        if (player?.operatorId === 'recon' && (player.abilityActiveTimer ?? 0) > 0) {
          incoming *= 0.65;
        }
        return damageBeforeClairePowerPass.call(this, incoming, ...args);
      };
    }

    const useAbilityBeforeBenjaminSpeed = typeof useOperatorAbility === 'function' ? useOperatorAbility : null;
    if (useAbilityBeforeBenjaminSpeed) {
      useOperatorAbility = function useOperatorAbilityWithBenjaminSpeed(...args) {
        const player = state.raid?.player;
        const medic = player?.operatorId === 'medic';
        const beforeUses = player?.skillUses ?? player?.abilityCharges ?? 0;
        const result = useAbilityBeforeBenjaminSpeed.apply(this, args);
        if (medic) {
          const afterUses = player?.skillUses ?? player?.abilityCharges ?? beforeUses;
          if (afterUses < beforeUses || (player?.damageImmunityTimer ?? 0) > 0) {
            player.medicSpeedBoostTimer = Math.max(player.medicSpeedBoostTimer ?? 0, player.damageImmunityTimer ?? 8);
            notify(
              L('战术增益：免伤阶段移速提高 45%，后续减伤阶段仍保持 20% 移速加成。', 'Tactical Surge: +45% movement during immunity, then +20% during the damage-reduction phase.'),
              'success',
            );
          }
        }
        return result;
      };
    }

    window.__sdrFinalPolishDebug = {
      version: '20261003-operator-power7',
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