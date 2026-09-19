(() => {
  if (window.__sdrOperatorUtilityPatchApplied || window.__sdrOperatorUtilityPatchWaiting) {
    return;
  }

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof startRaid === 'undefined' ||
      typeof updateRaid === 'undefined' ||
      typeof updateEnemies === 'undefined' ||
      typeof useOperatorAbility === 'undefined' ||
      typeof damageEnemy === 'undefined' ||
      typeof notify === 'undefined' ||
      typeof L === 'undefined'
    ) {
      window.__sdrOperatorUtilityPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }

    window.__sdrOperatorUtilityPatchWaiting = false;
    if (window.__sdrOperatorUtilityPatchApplied) {
      return;
    }
    window.__sdrOperatorUtilityPatchApplied = true;

    const SKILL_MAX_USES = 4;
    const UTILITY_MAX_ITEMS = 2;
    const ENGINEER_UTILITY_MAX_ITEMS = 10;
    const UTILITY_GAIN_TIME = 20;
    const RECON_UTILITY_GAIN_TIME = 30;
    const RECON_CLOAK_TIME = 20;
    const SUPPORT_SMOKE_TIME = 7;
    const SUPPORT_SMOKE_RADIUS = 20;
    const SUPPORT_SMOKE_CONTACT_RANGE = 2.2;
    const GRENADE_DAMAGE = 500;
    const GRENADE_RADIUS = 26;
    let utilityView = null;

    const utilityName = (operatorId) => {
      if (operatorId === 'assault') return L('高级手雷', 'Advanced Grenade');
      if (operatorId === 'recon') return L('电子隐身器', 'Electronic Cloak');
      if (operatorId === 'engineer') return L('速凝掩体', 'Rapid Barrier');
      return L('增益烟雾', 'Recovery Smoke');
    };

    const utilityShort = (operatorId) => {
      if (operatorId === 'assault') return L('高级手雷', 'Adv. Grenade');
      if (operatorId === 'recon') return L('隐身器', 'Cloak');
      return L('烟雾', 'Smoke');
    };
    const utilityMax = (operatorId) => operatorId === 'engineer' ? ENGINEER_UTILITY_MAX_ITEMS : UTILITY_MAX_ITEMS;
    const utilityGainTime = (operatorId) => operatorId === 'recon' ? RECON_UTILITY_GAIN_TIME : UTILITY_GAIN_TIME;

    const ensureUtilityUi = () => {
      const hudLeft = document.querySelector('#hud .hud-left');
      if (!hudLeft) return null;
      let panel = document.getElementById('operatorUtilityPanel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'operatorUtilityPanel';
        panel.className = 'hud-stat operator-utility-panel';
        panel.innerHTML = `
          <span id="operatorUtilityLabel"></span>
          <strong id="operatorUtilityValue"></strong>
          <small id="operatorUtilityDetail"></small>
          <div class="mini-progress" aria-hidden="true"><span id="operatorUtilityFill"></span></div>
        `;
        const tactical = hudLeft.querySelector('.tactical-strip');
        (tactical ?? hudLeft).appendChild(panel);
      }
      return {
        panel,
        label: panel.querySelector('#operatorUtilityLabel'),
        value: panel.querySelector('#operatorUtilityValue'),
        detail: panel.querySelector('#operatorUtilityDetail'),
        fill: panel.querySelector('#operatorUtilityFill'),
      };
    };

    const ensureUtilityButton = () => {
      const actionPad = document.querySelector('#touchControls .action-pad');
      if (!actionPad) return null;
      let button = document.getElementById('utilityActionButton');
      if (!button) {
        button = document.createElement('button');
        button.id = 'utilityActionButton';
        button.className = 'control-button action';
        button.type = 'button';
        button.dataset.controlAction = 'utility';
        button.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          useOperatorUtility();
        });
        actionPad.appendChild(button);
      }
      return button;
    };

    const syncUtilityUi = () => {
      const player = state.raid?.player;
      const ui = ensureUtilityUi();
      const button = ensureUtilityButton();
      if (!player || !ui) return;
      const count = Math.max(0, Number(player.utilityItems ?? 0));
      const maxItems = utilityMax(player.operatorId);
      const gainTime = player.utilityGainInterval ?? utilityGainTime(player.operatorId);
      const timer = Math.max(0, Number(player.utilityGainTimer ?? gainTime));
      const ready = count >= maxItems;
      ui.label.textContent = L('专属道具', 'Utility');
      ui.value.textContent = `${utilityName(player.operatorId)} ${count}/${maxItems}`;
      ui.detail.textContent = player.grenadeTargeting
        ? L(`落点已选 ${player.grenadeTargeting.distance.toFixed(0)} 米，再按 G 投掷`, `Target ${player.grenadeTargeting.distance.toFixed(0)}m. Press G to throw`)
        : player.utilityAction
        ? L('使用中...', 'Using...')
        : ready
        ? L('已满，按 G 使用', 'Full. Press G to use')
        : L(`${timer.toFixed(0)} 秒后补充 1 个`, `+1 in ${timer.toFixed(0)}s`);
      ui.fill.style.width = `${ready ? 100 : Math.max(0, Math.min(100, (1 - timer / gainTime) * 100))}%`;
      ui.fill.style.background = player.operatorId === 'assault' ? '#ff9a62' : player.operatorId === 'recon' ? '#72d9ff' : '#74e0a0';
      if (button) {
        button.textContent = `${utilityName(player.operatorId)} G`;
        button.title = L(`使用${utilityName(player.operatorId)}`, `Use ${utilityName(player.operatorId)}`);
        button.disabled = count <= 0 || Boolean(player.utilityAction) || state.mode !== 'raid';
      }
    };

    const configurePlayer = (player) => {
      if (!player) return;
      player.skillUses = SKILL_MAX_USES;
      player.skillMaxUses = SKILL_MAX_USES;
      player.skillChargeTimer = 0;
      player.skillChargeDuration = 0;
      player.abilityCharges = SKILL_MAX_USES;
      player.utilityItems = 1;
      player.utilityMaxItems = utilityMax(player.operatorId);
      player.utilityGainInterval = utilityGainTime(player.operatorId);
      player.utilityGainTimer = player.utilityGainInterval;
      player.abilityActiveTimer = 0;
      player.operatorEffectTimer = 0;
      player.abilityCooldown = 0;
      player.abilityCooldownPending = false;
      player.invisibilityTimer = 0;
      player.supportSmokeTimer = 0;
      player.supportSmokeTick = 1;
      player.supportSmokeX = null;
      player.supportSmokeZ = null;
      player.reconZone = null;
      player.medicSkillArmed = false;
      player.utilityAction = null;
      player.grenadeTargeting = null;
      player.supportFirepowerTimer = 0;
      player.supportFirepowerPending = false;
    };

    const hasActiveSupportSmoke = (player = state.raid?.player) => Boolean(
      player &&
      (player.supportSmokeTimer ?? 0) > 0 &&
      Number.isFinite(player.supportSmokeX) &&
      Number.isFinite(player.supportSmokeZ),
    );

    const isInsideSupportSmoke = (x, z, player = state.raid?.player) => hasActiveSupportSmoke(player) &&
      distance2D(x, z, player.supportSmokeX, player.supportSmokeZ) <= SUPPORT_SMOKE_RADIUS;

    const segmentCrossesSupportSmoke = (fromX, fromZ, toX, toZ, player = state.raid?.player) => {
      if (!hasActiveSupportSmoke(player)) return false;
      const dx = toX - fromX;
      const dz = toZ - fromZ;
      const lengthSq = dx * dx + dz * dz;
      const projection = lengthSq > 0.0001
        ? clamp(((player.supportSmokeX - fromX) * dx + (player.supportSmokeZ - fromZ) * dz) / lengthSq, 0, 1)
        : 0;
      const closestX = fromX + dx * projection;
      const closestZ = fromZ + dz * projection;
      return distance2D(closestX, closestZ, player.supportSmokeX, player.supportSmokeZ) <= SUPPORT_SMOKE_RADIUS;
    };

    const makeUtilityMaterial = (name, diffuse, emissive = diffuse, alpha = 1) => {
      const material = new BABYLON.StandardMaterial(name, scene);
      material.diffuseColor = BABYLON.Color3.FromHexString(diffuse);
      material.emissiveColor = BABYLON.Color3.FromHexString(emissive).scale(0.14);
      material.alpha = alpha;
      material.backFaceCulling = false;
      return material;
    };

    const makeGrenadeModel = (prefix) => {
      const root = new BABYLON.TransformNode(`${prefix}-root`, scene);
      const body = BABYLON.MeshBuilder.CreateSphere(`${prefix}-body`, { diameter: 0.2, segments: 14 }, scene);
      body.parent = root;
      body.scaling.set(0.82, 1.08, 0.82);
      body.material = makeUtilityMaterial(`${prefix}-body-mat`, '#34473d', '#617568');
      for (let index = -1; index <= 1; index += 1) {
        const groove = BABYLON.MeshBuilder.CreateTorus(`${prefix}-groove-${index}`, { diameter: 0.17, thickness: 0.009, tessellation: 16 }, scene);
        groove.parent = root;
        groove.position.y = index * 0.055;
        groove.material = makeUtilityMaterial(`${prefix}-groove-mat-${index}`, '#17221d', '#25372e');
      }
      const neck = BABYLON.MeshBuilder.CreateCylinder(`${prefix}-neck`, { height: 0.07, diameter: 0.085, tessellation: 12 }, scene);
      neck.parent = root;
      neck.position.y = 0.125;
      neck.material = makeUtilityMaterial(`${prefix}-neck-mat`, '#69716c', '#8d9690');
      const lever = BABYLON.MeshBuilder.CreateBox(`${prefix}-lever`, { width: 0.06, height: 0.025, depth: 0.17 }, scene);
      lever.parent = root;
      lever.position.set(0.045, 0.155, -0.035);
      lever.rotation.z = -0.22;
      lever.material = makeUtilityMaterial(`${prefix}-lever-mat`, '#727b78', '#aeb8b3');
      const pin = BABYLON.MeshBuilder.CreateTorus(`${prefix}-pin`, { diameter: 0.105, thickness: 0.012, tessellation: 14 }, scene);
      pin.parent = root;
      pin.position.set(-0.075, 0.145, 0);
      pin.rotation.x = Math.PI / 2;
      pin.material = makeUtilityMaterial(`${prefix}-pin-mat`, '#b89255', '#d9bd79');
      root.getChildMeshes().forEach((mesh) => { mesh.isPickable = false; });
      return root;
    };

    const makeSmokeCanisterModel = (prefix) => {
      const root = new BABYLON.TransformNode(`${prefix}-root`, scene);
      const body = BABYLON.MeshBuilder.CreateCylinder(`${prefix}-body`, { height: 0.32, diameter: 0.135, tessellation: 18 }, scene);
      body.parent = root;
      body.material = makeUtilityMaterial(`${prefix}-body-mat`, '#58605d', '#747f79');
      for (const [offset, color] of [[-0.11, '#222a27'], [0.02, '#47735a'], [0.11, '#222a27']]) {
        const band = BABYLON.MeshBuilder.CreateCylinder(`${prefix}-band-${offset}`, { height: 0.035, diameter: 0.142, tessellation: 18 }, scene);
        band.parent = root;
        band.position.y = offset;
        band.material = makeUtilityMaterial(`${prefix}-band-mat-${offset}`, color, color);
      }
      const cap = BABYLON.MeshBuilder.CreateCylinder(`${prefix}-cap`, { height: 0.05, diameterTop: 0.07, diameterBottom: 0.11, tessellation: 14 }, scene);
      cap.parent = root;
      cap.position.y = 0.185;
      cap.material = makeUtilityMaterial(`${prefix}-cap-mat`, '#8b918d', '#adb4af');
      const pin = BABYLON.MeshBuilder.CreateTorus(`${prefix}-pin`, { diameter: 0.075, thickness: 0.01, tessellation: 14 }, scene);
      pin.parent = root;
      pin.position.set(0.065, 0.2, 0);
      pin.rotation.x = Math.PI / 2;
      pin.material = makeUtilityMaterial(`${prefix}-pin-mat`, '#b7a26e', '#d7c38a');
      root.getChildMeshes().forEach((mesh) => { mesh.isPickable = false; });
      return root;
    };

    const ensureUtilityModels = () => {
      if (utilityView?.root) return utilityView;
      if (!scene || !camera) return null;
      const root = new BABYLON.TransformNode('operator-utility-view-root', scene);
      root.parent = camera;
      root.setEnabled(false);

      const grenadeRoot = makeGrenadeModel('utility-grenade');
      grenadeRoot.parent = root;
      grenadeRoot.scaling.setAll(0.72);

      const smokeRoot = makeSmokeCanisterModel('utility-smoke');
      smokeRoot.parent = root;
      smokeRoot.scaling.setAll(0.78);

      const cloakRoot = new BABYLON.TransformNode('utility-cloak-root', scene);
      cloakRoot.parent = root;
      const cloakBody = BABYLON.MeshBuilder.CreateBox('utility-cloak-body', { width: 0.22, height: 0.34, depth: 0.06 }, scene);
      cloakBody.parent = cloakRoot;
      cloakBody.material = makeUtilityMaterial('utility-cloak-body-mat', '#344552', '#678498');
      const cloakScreen = BABYLON.MeshBuilder.CreatePlane('utility-cloak-screen', { width: 0.15, height: 0.19 }, scene);
      cloakScreen.parent = cloakRoot;
      cloakScreen.position.z = -0.034;
      const cloakScreenMat = makeUtilityMaterial('utility-cloak-screen-mat', '#65eaff', '#8dffff', 0.8);
      cloakScreenMat.disableLighting = true;
      cloakScreen.material = cloakScreenMat;
      const cloakAntenna = BABYLON.MeshBuilder.CreateCylinder('utility-cloak-antenna', { height: 0.18, diameter: 0.016, tessellation: 8 }, scene);
      cloakAntenna.parent = cloakRoot;
      cloakAntenna.position = new BABYLON.Vector3(0.08, 0.24, 0);
      cloakAntenna.rotation.z = -0.22;
      cloakAntenna.material = makeUtilityMaterial('utility-cloak-antenna-mat', '#93aab5', '#d2edf4');

      const targetingMarker = BABYLON.MeshBuilder.CreateTorus('advanced-grenade-target-marker', { diameter: 1.2, thickness: 0.08, tessellation: 20 }, scene);
      targetingMarker.rotation.x = Math.PI / 2;
      targetingMarker.isPickable = false;
      const targetingMaterial = makeUtilityMaterial('advanced-grenade-target-marker-mat', '#ff795f', '#ffb18a', 0.72);
      targetingMaterial.disableLighting = true;
      targetingMarker.material = targetingMaterial;
      targetingMarker.setEnabled(false);

      utilityView = { root, grenadeRoot, smokeRoot, cloakRoot, cloakScreenMat, targetingMarker };
      return utilityView;
    };

    const getGrenadeTarget = (player, distance = 18) => {
      const rect = refs.canvas?.getBoundingClientRect();
      const screenX = player.grenadeMouseX ?? (rect ? rect.width / 2 : 0);
      const screenY = player.grenadeMouseY ?? (rect ? rect.height / 2 : 0);
      const ray = scene && camera && rect
        ? scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), camera)
        : null;
      if (ray && Math.abs(ray.direction.y) > 0.001) {
        const travel = -ray.origin.y / ray.direction.y;
        if (travel > 0 && Number.isFinite(travel)) {
          return {
            x: clamp(ray.origin.x + ray.direction.x * travel, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
            z: clamp(ray.origin.z + ray.direction.z * travel, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
          };
        }
      }
      return {
        x: clamp(player.x + Math.sin(player.yaw) * distance, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
        z: clamp(player.z + Math.cos(player.yaw) * distance, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
      };
    };

    const updateGrenadeTargeting = (player) => {
      const marker = ensureUtilityModels()?.targetingMarker;
      const targeting = player?.grenadeTargeting;
      if (!marker) return;
      marker.setEnabled(Boolean(targeting));
      if (!targeting) return;
      const target = getGrenadeTarget(player, targeting.distance);
      targeting.x = target.x;
      targeting.z = target.z;
      marker.position.set(target.x, 0.08, target.z);
      const pulse = 0.92 + Math.sin(performance.now() * 0.012) * 0.12;
      marker.scaling.setAll(pulse);
    };

    const updateUtilityActionVisual = (player) => {
      const view = ensureUtilityModels();
      if (!view) return;
      const action = player?.utilityAction;
      view.root.setEnabled(Boolean(action));
      updateGrenadeTargeting(player);
      if (!action) return;
      const progress = clamp(1 - action.timer / action.duration, 0, 1);
      const throwArc = Math.sin(Math.min(1, progress / 0.48) * Math.PI);
      view.grenadeRoot.setEnabled(action.type === 'assault' && progress < 0.42);
      view.smokeRoot.setEnabled(action.type === 'medic' && progress < 0.42);
      view.cloakRoot.setEnabled(action.type === 'recon');
      if (action.type === 'assault') {
        view.grenadeRoot.position.set(0.25 - progress * 0.52, -0.34 + throwArc * 0.31, 0.7 - throwArc * 0.34);
        view.grenadeRoot.rotation.set(-0.28 - throwArc * 1.25, -0.28 + progress * 0.5, -0.18 - throwArc * 0.4);
      } else if (action.type === 'medic') {
        view.smokeRoot.position.set(0.25 - progress * 0.42, -0.38 + throwArc * 0.28, 0.69 - throwArc * 0.31);
        view.smokeRoot.rotation.set(0.2 - throwArc * 1.05, -0.35 + progress * 0.42, -0.12 - throwArc * 0.34);
      } else {
        const flicker = 0.65 + Math.sin(performance.now() * 0.035) * 0.28;
        view.cloakRoot.position.set(0.14, -0.29 + Math.sin(progress * Math.PI) * 0.07, 0.61 - progress * 0.13);
        view.cloakRoot.rotation.set(-0.1, 0.08 + Math.sin(progress * Math.PI) * 0.28, 0.04);
        view.cloakScreenMat.alpha = flicker;
        view.cloakScreenMat.emissiveColor = BABYLON.Color3.FromHexString('#8dffff').scale(flicker * 1.1);
      }
    };

    const originalStartRaid = startRaid;
    startRaid = function patchedStartRaidWithOperatorUtilities() {
      const result = originalStartRaid();
      configurePlayer(state.raid?.player);
      const extraEnemies = state.raid?.enemies?.splice(56) ?? [];
      for (const enemy of extraEnemies) disposeVisual(enemy.visual);
      ensureUtilityModels();
      syncUtilityUi();
      return result;
    };

    const originalClearRaidForSmoke = clearRaid;
    clearRaid = function patchedClearRaidForSmoke() {
      const visual = state.raid?.player?.supportSmokeVisual;
      visual?.smokeTexture?.dispose();
      disposeVisual(visual?.root);
      return originalClearRaidForSmoke();
    };

    const originalGetOperatorDefs = getOperatorDefs;
    getOperatorDefs = function patchedOperatorProfiles() {
      const defs = originalGetOperatorDefs();
      Object.assign(defs.assault, {
        nameZh: '凯',
        nameEn: 'Kai',
        passiveZh: '男 · 前线突击手，重甲推进时体力消耗更低。',
        passiveEn: 'Male · Frontline breacher with reduced stamina drain during Overdrive.',
        skillTextZh: '手动启动：20 秒内移速 x2、伤害翻倍并降低体力消耗；击败敌人延长时间并回复生命。',
        skillTextEn: 'Manual: 20s of x2 speed, double damage, and reduced stamina drain. Kills extend it and restore health.',
        itemNameZh: '高级手雷',
        itemNameEn: 'Advanced Grenade',
        killExtendSeconds: 0.5,
      });
      Object.assign(defs.medic, {
        nameZh: '本杰明',
        nameEn: 'Benjamin',
        passiveZh: '男 · 战术支援员，携带额外医疗物资并擅长持续火力。',
        passiveEn: 'Male · Tactical support specialist with extra medical supplies and sustained fire.',
        skillNameZh: '火力增益',
        skillNameEn: 'Firepower Boost',
        skillTextZh: '手动启动：立即恢复 500 生命并免伤 5 秒，随后 15 秒伤害减半且子弹伤害翻倍。技能不会自动触发。',
        skillTextEn: 'Manual: restore 500 HP and gain 5s immunity, then take half damage and deal double bullet damage for 15s. Never auto-triggers.',
        itemNameZh: '增益烟雾',
        itemNameEn: 'Recovery Smoke',
      });
      delete defs.recon;
      return defs;
    };

    const originalGetOperatorOrder = getOperatorOrder;
    getOperatorOrder = function availableOperatorOrder() {
      return originalGetOperatorOrder().filter((operatorId) => operatorId !== 'recon');
    };

    if (state.save.selectedOperatorId === 'recon') {
      state.save.selectedOperatorId = 'assault';
      persistSave();
    }

    const activateSkill = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (!player || state.overlay) return;
      if ((player.abilityActiveTimer ?? 0) > 0) {
        notify(L('技能正在生效。', 'Skill is already active.'), 'warning');
        return;
      }
      if ((player.skillUses ?? 0) <= 0) {
        notify(L('本局 4 次技能均已使用。', 'All 4 skill uses have been spent this raid.'), 'warning');
        return;
      }

      const operator = getPlayerOperatorDef(player);
      player.skillUses -= 1;
      player.abilityCharges = player.skillUses;
      player.skillChargeTimer = 0;
      player.abilityCooldown = 0;
      player.abilityCooldownPending = false;
      player.abilityActiveTimer = operator.abilityDuration ?? 0;
      player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);

      if (operator.id === 'assault') {
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor ?? '#ff9a62', 0.13, 0.2);
        notify(L(`过载突进已启动，剩余技能 ${player.skillUses}/4。`, `Overdrive active. Skill uses left: ${player.skillUses}/4.`), 'success');
      } else if (operator.id === 'recon') {
        player.reconZone = getReconZoneBoundsForPoint(player.x, player.z);
        const revealed = refreshReconZoneReveal(raid, player, operator);
        const targets = raid.enemies
          .filter((enemy) => !enemy.dead && !enemy.despawned && (enemy.combatState === 'engage' || (enemy.muzzleTimer ?? 0) > 0))
          .sort((a, b) => distance2D(player.x, player.z, a.x, a.z) - distance2D(player.x, player.z, b.x, b.z))
          .slice(0, 6);
        for (const enemy of targets) {
          if (enemy.isNamelessBoss) {
            damageEnemy(enemy, 100, { utilityKind: 'recon' });
          } else {
            killEnemy(enemy);
          }
        }
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor ?? '#72d9ff', 0.16, 0.24);
        notify(L(`扫描区域已揭示 ${revealed} 名敌人和兵种，已清除正在交火的最近 ${targets.length} 名敌人。`, `Scan revealed ${revealed} enemies and classes; eliminated ${targets.length} nearest enemies currently engaging you.`), 'success');
      } else {
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor ?? '#74e0a0', 0.14, 0.22);
        player.health = Math.min(player.maxHealth, player.health + 500);
        player.damageImmunityTimer = 5;
        player.damageReductionTimer = 0;
        player.damageReductionMult = 1;
        player.medicPostShieldPending = true;
        player.supportFirepowerTimer = 0;
        player.supportFirepowerPending = true;
        notify(L(`战术增益已启动：恢复 500 生命，5 秒免伤；随后 15 秒减伤与双倍子弹伤害。剩余技能 ${player.skillUses}/4。`, `Combat boost active: +500 HP, 5s immunity, then 15s half damage and double bullet damage. Uses left: ${player.skillUses}/4.`), 'success');
      }
      syncUtilityUi();
      syncHud();
    };
    useOperatorAbility = activateSkill;

    triggerMedicLastStand = function disabledAutomaticSupportSkill() {
      return false;
    };

    const createUtilityBurst = (position, color, count = 1.2) => {
      spawnPulse(position, color, 0.16, 0.36);
      spawnImpactBurst(position, color, count, 'hard');
      playImpactAudio(position, 'hard');
    };

    const createSupportSmokeVisual = (x, z) => {
      const root = new BABYLON.TransformNode(`support-smoke-${Math.random().toString(36).slice(2, 7)}`, scene);
      root.position.set(x, 0, z);
      const puffs = [];
      const smokeTexture = new BABYLON.DynamicTexture(`support-smoke-texture-${Math.random().toString(36).slice(2, 7)}`, { width: 192, height: 192 }, scene, false);
      smokeTexture.hasAlpha = true;
      const context = smokeTexture.getContext();
      context.clearRect(0, 0, 192, 192);
      const cloud = context.createRadialGradient(96, 96, 8, 96, 96, 88);
      cloud.addColorStop(0, 'rgba(28, 35, 33, 0.82)');
      cloud.addColorStop(0.36, 'rgba(72, 83, 77, 0.62)');
      cloud.addColorStop(0.72, 'rgba(45, 54, 50, 0.28)');
      cloud.addColorStop(1, 'rgba(20, 26, 24, 0)');
      context.fillStyle = cloud;
      context.beginPath();
      for (let point = 0; point < 18; point += 1) {
        const angle = (point / 18) * Math.PI * 2;
        const radius = 58 + Math.sin(point * 2.7) * 10 + Math.cos(point * 1.4) * 7;
        const px = 96 + Math.cos(angle) * radius;
        const py = 96 + Math.sin(angle) * radius;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      smokeTexture.update();
      const tones = ['#2c3532', '#3d4944', '#53605a'];
      const materials = tones.map((tone, index) => {
        const material = makeUtilityMaterial(`support-smoke-mat-${index}-${Math.random().toString(36).slice(2, 6)}`, tone, '#77857b', 0.42 - index * 0.06);
        material.diffuseTexture = smokeTexture;
        material.useAlphaFromDiffuseTexture = true;
        material.disableLighting = true;
        material.backFaceCulling = false;
        material.zOffset = -2;
        return material;
      });
      const layers = [
        { count: 9, radius: SUPPORT_SMOKE_RADIUS * 0.25, height: 0.95, spread: 7.2, scale: 1.15 },
        { count: 8, radius: SUPPORT_SMOKE_RADIUS * 0.58, height: 1.7, spread: 8.8, scale: 1.28 },
        { count: 7, radius: SUPPORT_SMOKE_RADIUS * 0.84, height: 2.5, spread: 8.2, scale: 1.08 },
      ];
      let index = 0;
      for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
        const layer = layers[layerIndex];
        for (let offset = 0; offset < layer.count; offset += 1) {
          const angle = (offset / layer.count) * Math.PI * 2 + layerIndex * 0.9 + Math.sin(offset * 2.4) * 0.18;
          const radius = layer.radius * (0.72 + ((offset * 17 + layerIndex * 11) % 19) / 100);
          const mesh = BABYLON.MeshBuilder.CreatePlane(`support-smoke-puff-${index}-${Math.random().toString(36).slice(2, 6)}`, {
            width: layer.spread,
            height: layer.spread * (0.72 + ((offset + layerIndex) % 4) * 0.08),
          }, scene);
          mesh.parent = root;
          mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
          mesh.position.set(
            Math.cos(angle) * radius,
            layer.height + (offset % 3) * 0.42,
            Math.sin(angle) * radius,
          );
          mesh.rotation.z = Math.sin(index * 1.8) * 0.6;
          mesh.scaling.set(layer.scale * (0.9 + (offset % 4) * 0.08), layer.scale * (0.86 + (offset % 3) * 0.08), 1);
          mesh.material = materials[layerIndex];
          mesh.isPickable = false;
          mesh.metadata = { drift: 0.012 + (index % 4) * 0.004, phase: index * 0.73, baseY: mesh.position.y };
          puffs.push(mesh);
          index += 1;
        }
      }
      return { root, puffs, materials, smokeTexture, ground: null, boundary: null, pulse: 0 };
    };

    const updateSupportSmokeVisual = (player, dt) => {
      const visual = player?.supportSmokeVisual;
      if (!visual?.root) return;
      if ((player.supportSmokeTimer ?? 0) <= 0) {
        visual.smokeTexture?.dispose();
        disposeVisual(visual.root);
        player.supportSmokeVisual = null;
        return;
      }
      visual.pulse += dt;
      const fade = Math.min(1, (player.supportSmokeTimer ?? 0) / 0.8);
      for (let index = 0; index < visual.materials.length; index += 1) {
        visual.materials[index].alpha = (0.78 - index * 0.1) * fade;
      }
      for (let index = 0; index < visual.puffs.length; index += 1) {
        const puff = visual.puffs[index];
        const metadata = puff.metadata ?? {};
        const wave = Math.sin(visual.pulse * 1.35 + (metadata.phase ?? index * 0.73));
        puff.position.y = (metadata.baseY ?? puff.position.y) + visual.pulse * (metadata.drift ?? 0.014) + wave * 0.16;
        puff.position.x += Math.cos(index * 1.7) * dt * 0.012;
        puff.position.z += Math.sin(index * 1.7) * dt * 0.012;
        puff.rotation.z += dt * (0.035 + (index % 3) * 0.012);
        puff.scaling.x *= 1 + wave * dt * 0.02;
        puff.scaling.y *= 1 - wave * dt * 0.015;
      }
    };

    const createThrownUtilityVisual = (type) => {
      if (type === 'recon') return null;
      const prefix = `thrown-${type}-${Math.random().toString(36).slice(2, 7)}`;
      const model = type === 'assault' ? makeGrenadeModel(prefix) : makeSmokeCanisterModel(prefix);
      model.setEnabled(false);
      return model;
    };

    const getUtilityLanding = (player, type) => {
      const distance = type === 'assault' ? 10 : 6.2;
      const forwardX = Math.sin(player.yaw);
      const forwardZ = Math.cos(player.yaw);
      return {
        x: clamp(player.x + forwardX * distance, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
        z: clamp(player.z + forwardZ * distance, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
      };
    };

    const applyOperatorUtilityEffect = (action) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!player || state.overlay || (player.utilityItems ?? 0) <= 0 || (player.dropTimer ?? 0) > 0) {
        if (player && (player.utilityItems ?? 0) <= 0) notify(L('专属道具不足，等待补充。', 'No utility item available. Wait for a resupply.'), 'warning');
        return;
      }
      player.utilityItems -= 1;
      if (player.operatorId !== 'engineer' && player.utilityItems < utilityMax(player.operatorId) && (player.utilityGainTimer ?? 0) <= 0) {
        player.utilityGainTimer = player.utilityGainInterval ?? UTILITY_GAIN_TIME;
      }

      if (player.operatorId === 'assault') {
        const center = new BABYLON.Vector3(action?.targetX ?? player.x, 0.45, action?.targetZ ?? player.z);
        let hits = 0;
        for (const enemy of raid.enemies) {
          if (enemy.dead || distance2D(center.x, center.z, enemy.x, enemy.z) > GRENADE_RADIUS) continue;
          damageEnemy(enemy, GRENADE_DAMAGE, { ignoreSmoke: true, utilityKind: 'grenade' });
          hits += 1;
        }
        createUtilityBurst(center, '#ff8a57', 2.2);
        notify(L(`高级手雷爆炸，半径 ${GRENADE_RADIUS} 米，命中 ${hits} 名敌人，每名造成 ${GRENADE_DAMAGE} 伤害。`, `Advanced Grenade detonated: ${GRENADE_RADIUS}m radius, ${hits} targets hit for ${GRENADE_DAMAGE} damage each.`), hits ? 'success' : 'warning');
      } else if (player.operatorId === 'recon') {
        player.invisibilityTimer = RECON_CLOAK_TIME;
        player.bossCloakTimer = 5;
        createUtilityBurst(new BABYLON.Vector3(player.x, 0.82, player.z), '#7deeff', 0.55);
        notify(L('电子隐身已启动：20 秒内敌人不会向你开火。', 'Electronic Cloak active: enemies will not fire at you for 20 seconds.'), 'success');
      } else {
        player.supportSmokeTimer = SUPPORT_SMOKE_TIME;
        player.supportSmokeTick = 1;
        player.supportSmokeX = action?.targetX ?? player.x;
        player.supportSmokeZ = action?.targetZ ?? player.z;
        player.supportSmokeVisual?.smokeTexture?.dispose();
        disposeVisual(player.supportSmokeVisual?.root);
        player.supportSmokeVisual = createSupportSmokeVisual(player.supportSmokeX, player.supportSmokeZ);
        createUtilityBurst(new BABYLON.Vector3(player.supportSmokeX, 0.5, player.supportSmokeZ), '#76e6a4', 1.05);
        notify(L('增益烟雾已释放：半径 20 米，持续 7 秒，每秒恢复 50 生命和 20 体力。', 'Recovery Smoke: 20m radius, 7s, +50 HP and +20 stamina per second.'), 'success');
      }
      syncUtilityUi();
    };
    const useOperatorUtility = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (!player || state.overlay || player.utilityAction || (player.utilityItems ?? 0) <= 0 || (player.dropTimer ?? 0) > 0) {
        if (player && !player.utilityAction && (player.utilityItems ?? 0) <= 0) {
          notify(L('专属道具不足，等待补充。', 'No utility item available. Wait for a resupply.'), 'warning');
        }
        return;
      }
      const type = player.operatorId;
      if (type === 'assault' && !player.grenadeTargeting) {
        player.grenadeTargeting = { distance: 18, x: player.x, z: player.z };
        updateGrenadeTargeting(player);
        raid.statusText = L('高级手雷：转动视角选择落点，滚轮调整距离，再按 G 投掷。', 'Advanced Grenade: aim the landing point, use the wheel for distance, then press G to throw.');
        syncUtilityUi();
        return;
      }
      const duration = type === 'assault' ? 0.9 : type === 'medic' ? 1.08 : 1;
      const landing = type === 'assault' ? player.grenadeTargeting : getUtilityLanding(player, type);
      const startX = player.x + Math.sin(player.yaw) * 0.75;
      const startZ = player.z + Math.cos(player.yaw) * 0.75;
      const flightMesh = createThrownUtilityVisual(type);
      if (flightMesh) flightMesh.position.set(startX, getPlayerViewHeight(player) - 0.25, startZ);
      player.utilityAction = {
        type,
        timer: duration,
        duration,
        startX,
        startY: getPlayerViewHeight(player) - 0.25,
        startZ,
        targetX: landing.x,
        targetZ: landing.z,
        flightMesh,
      };
      player.grenadeTargeting = null;
      updateGrenadeTargeting(player);
      player.isAiming = false;
      raid.statusText = type === 'assault'
        ? L('投掷手雷中...', 'Throwing grenade...')
        : type === 'medic'
          ? L('释放增益烟雾中...', 'Deploying recovery smoke...')
          : L('启动电子隐身器...', 'Activating electronic cloak...');
      updateUtilityActionVisual(player);
      syncUtilityUi();
    };
    window.useOperatorUtility = useOperatorUtility;

    const originalAttemptShoot = attemptShoot;
    attemptShoot = function patchedAttemptShootDuringUtilityAction() {
      if (state.raid?.player?.utilityAction) return;
      return originalAttemptShoot();
    };

    const originalDamageEnemy = damageEnemy;
    damageEnemy = function patchedSupportDamage(enemy, damage, options = {}) {
      const player = state.raid?.player;
      if (
        player?.__playerShot &&
        !options.ignoreSmoke &&
        segmentCrossesSupportSmoke(player.x, player.z, enemy.x, enemy.z, player)
      ) {
        return;
      }
      const boostedDamage = player?.__supportShot && player.operatorId === 'medic' && (player.supportFirepowerTimer ?? 0) > 0
        ? damage * 2
        : damage;
      return originalDamageEnemy(enemy, boostedDamage, options);
    };

    const originalAttemptShootWithUtility = attemptShoot;
    attemptShoot = function patchedAttemptShootWithSupportBoost() {
      const player = state.raid?.player;
      if (!player) return originalAttemptShootWithUtility();
      player.__supportShot = player.operatorId === 'medic' && (player.supportFirepowerTimer ?? 0) > 0;
      player.__playerShot = true;
      try {
        return originalAttemptShootWithUtility();
      } finally {
        player.__supportShot = false;
        player.__playerShot = false;
      }
    };

    const originalGetAssaultAutoAimTarget = getAssaultAutoAimTarget;
    getAssaultAutoAimTarget = function patchedAssaultAutoAimTarget(player = state.raid?.player) {
      if ((player?.namelessBlackoutTimer ?? 0) > 0) {
        return null;
      }
      if (player?.operatorId === 'assault' && (player.ammoInMag ?? 0) <= 0 && getCurrentReserveAmmo(player) <= 0) {
        return null;
      }
      return originalGetAssaultAutoAimTarget(player);
    };

    const originalGetReconZoneBoundsForPoint = getReconZoneBoundsForPoint;
    getReconZoneBoundsForPoint = function patchedReconZoneBounds(x, z) {
      return originalGetReconZoneBoundsForPoint(clamp(x, -MAP_HALF + 0.01, MAP_HALF - 0.01), clamp(z, -MAP_HALF + 0.01, MAP_HALF - 0.01));
    };

    const enforceEnemyCap = (raid = state.raid) => {
      if (!raid?.enemies) return;
      const normalEnemies = raid.enemies.filter((enemy) => !enemy.isNamelessBoss && !enemy.isNamelessMinion && !enemy.isEventElite && !enemy.dead && !enemy.despawned);
      if (normalEnemies.length <= 36) return;
      const keep = new Set(normalEnemies.slice(0, 36));
      const removed = new Set(normalEnemies.filter((enemy) => !keep.has(enemy)));
      raid.enemies = raid.enemies.filter((enemy) => !removed.has(enemy));
      for (const enemy of removed) disposeVisual(enemy.visual);
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function patchedUpdateRaidWithOperatorUtilities(dt) {
      const player = state.raid?.player;
      if (player) {
        if (!state.raid.__sdrOperatorUtilityInitialized) {
          configurePlayer(player);
          for (const enemy of state.raid.enemies ?? []) {
            enemy.revealedTimer = 0;
            for (const mesh of enemy.visual?.overlayMeshes ?? []) mesh.renderOverlay = false;
            for (const mesh of enemy.visual?.revealMeshes ?? []) mesh.setEnabled(false);
          }
          state.raid.__sdrOperatorUtilityInitialized = true;
        } else if (!Number.isFinite(player.skillUses)) {
          configurePlayer(player);
        }
        enforceEnemyCap(state.raid);
        player.skillChargeTimer = Math.max(0, (player.skillChargeTimer ?? 0) - dt);
        player.invisibilityTimer = Math.max(0, (player.invisibilityTimer ?? 0) - dt);
        player.supportFirepowerTimer = Math.max(0, (player.supportFirepowerTimer ?? 0) - dt);
        player.supportSmokeTimer = Math.max(0, (player.supportSmokeTimer ?? 0) - dt);
        if (player.operatorId !== 'engineer' && (player.utilityItems ?? 0) < utilityMax(player.operatorId)) {
          player.utilityGainTimer = Math.max(0, (player.utilityGainTimer ?? player.utilityGainInterval) - dt);
          if (player.utilityGainTimer <= 0) {
            player.utilityItems = Math.min(utilityMax(player.operatorId), (player.utilityItems ?? 0) + 1);
            player.utilityGainTimer = player.utilityItems >= utilityMax(player.operatorId) ? 0 : player.utilityGainInterval;
            notify(L(`获得 1 个${utilityName(player.operatorId)}。`, `Received 1 ${utilityName(player.operatorId)}.`), 'success');
          }
        }
        if (player.supportSmokeTimer > 0) {
          const insideSmoke = isInsideSupportSmoke(player.x, player.z, player);
          player.supportSmokeTick = Math.max(0, (player.supportSmokeTick ?? 1) - dt);
          if (insideSmoke && player.supportSmokeTick <= 0) {
            player.supportSmokeTick += 1;
            player.health = Math.min(player.maxHealth, player.health + 50);
            player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 0) + 20);
            spawnPulse(new BABYLON.Vector3(player.x, 0.7, player.z), '#76e6a4', 0.07, 0.08);
          }
        }
        updateSupportSmokeVisual(player, dt);
        if (player.utilityAction) {
          player.utilityAction.timer = Math.max(0, player.utilityAction.timer - dt);
          const action = player.utilityAction;
          if (action.flightMesh) {
            const progress = clamp(1 - action.timer / action.duration, 0, 1);
            const released = progress >= 0.38;
            action.flightMesh.setEnabled(released);
            if (released) {
              const flight = clamp((progress - 0.38) / 0.62, 0, 1);
              action.flightMesh.position.x = lerp(action.startX, action.targetX, flight);
              action.flightMesh.position.z = lerp(action.startZ, action.targetZ, flight);
              action.flightMesh.position.y = lerp(action.startY, 0.22, flight) + Math.sin(flight * Math.PI) * (action.type === 'assault' ? 1.55 : 1.05);
              action.flightMesh.rotation.x += dt * 14;
              action.flightMesh.rotation.z += dt * 9;
            }
          }
          updateUtilityActionVisual(player);
          if (player.utilityAction.timer <= 0) {
            const action = player.utilityAction;
            disposeVisual(action.flightMesh);
            player.utilityAction = null;
            updateUtilityActionVisual(player);
            applyOperatorUtilityEffect(action);
          }
        }
      }
      const result = originalUpdateRaid(dt);
      const current = state.raid?.player;
      enforceEnemyCap(state.raid);
      if (current?.operatorId === 'recon' && (current.abilityActiveTimer ?? 0) <= 0) {
        current.reconZone = null;
        for (const enemy of state.raid?.enemies ?? []) {
          enemy.revealedTimer = 0;
          for (const mesh of enemy.visual?.overlayMeshes ?? []) mesh.renderOverlay = false;
          for (const mesh of enemy.visual?.revealMeshes ?? []) mesh.setEnabled(false);
        }
      }
      if (current?.supportFirepowerPending && (current.damageImmunityTimer ?? 0) <= 0) {
        current.supportFirepowerPending = false;
        current.supportFirepowerTimer = 15;
        notify(L('免伤结束：接下来 15 秒伤害减半，子弹伤害翻倍。', 'Immunity ended: 15 seconds of half damage taken and double bullet damage.'), 'success');
      }
      if (current) {
        // Old layers refill abilityCharges. The raid-wide four-use cap is authoritative.
        current.abilityCharges = Math.max(0, current.skillUses ?? 0);
        current.abilityCooldown = Math.max(current.abilityCooldown ?? 0, current.skillChargeTimer ?? 0);
      }
      updateUtilityActionVisual(current);
      syncUtilityUi();
      return result;
    };

    const originalIsPlayerSoundSuppressed = isPlayerSoundSuppressed;
    isPlayerSoundSuppressed = function patchedPlayerSoundSuppression(player = state.raid?.player) {
      return originalIsPlayerSoundSuppressed(player) || (player?.invisibilityTimer ?? 0) > 0;
    };

    const originalUpdateEnemies = updateEnemies;
    updateEnemies = function patchedEnemyAwarenessAndNavigation(dt) {
      const raid = state.raid;
      const player = raid?.player;
      const smokeActive = hasActiveSupportSmoke(player);
      const insideSupportSmoke = player && isInsideSupportSmoke(player.x, player.z, player);
      const concealed = player && ((player.invisibilityTimer ?? 0) > 0 || insideSupportSmoke);
      const originalLineOfSight = lineOfSightBlocked;
      const smokeBlurredEnemies = [];
      if (smokeActive && player) {
        for (const enemy of raid?.enemies ?? []) {
          if (enemy.dead || !isInsideSupportSmoke(enemy.x, enemy.z, player)) continue;
          smokeBlurredEnemies.push([enemy, enemy.accuracyBonus ?? 0]);
          enemy.accuracyBonus = (enemy.accuracyBonus ?? 0) - 0.28;
        }
      }
      if ((concealed || smokeActive) && player) {
        lineOfSightBlocked = function concealedLineOfSight(fromX, fromZ, toX, toZ) {
          const reachesPlayer = distance2D(toX, toZ, player.x, player.z) < 0.25 || distance2D(fromX, fromZ, player.x, player.z) < 0.25;
          let closeSmokeContact = false;
          if (smokeActive && segmentCrossesSupportSmoke(fromX, fromZ, toX, toZ, player)) {
            const bothInsideSmoke = isInsideSupportSmoke(fromX, fromZ, player) && isInsideSupportSmoke(toX, toZ, player);
            const contactDistance = distance2D(fromX, fromZ, toX, toZ);
            if (!bothInsideSmoke || contactDistance > SUPPORT_SMOKE_CONTACT_RANGE) {
              return true;
            }
            closeSmokeContact = true;
          }
          return (concealed && reachesPlayer && !closeSmokeContact) || originalLineOfSight(fromX, fromZ, toX, toZ);
        };
      }
      try {
        originalUpdateEnemies(dt);
      } finally {
        lineOfSightBlocked = originalLineOfSight;
        for (const [enemy, accuracyBonus] of smokeBlurredEnemies) enemy.accuracyBonus = accuracyBonus;
      }
      for (const enemy of raid?.enemies ?? []) {
        if (enemy.dead || enemy.despawned) continue;
        if (pointInsideObstaclePadding(enemy.x, enemy.z, enemy.radius ?? 0.6)) {
          const oldX = enemy.x;
          const oldZ = enemy.z;
          let resolved = false;
          for (let ring = 1; ring <= 8 && !resolved; ring += 1) {
            for (let step = 0; step < 12; step += 1) {
              const angle = (Math.PI * 2 * step) / 12;
              const testX = oldX + Math.cos(angle) * ring * 0.72;
              const testZ = oldZ + Math.sin(angle) * ring * 0.72;
              if (!pointInsideObstaclePadding(testX, testZ, enemy.radius ?? 0.6)) {
                enemy.x = testX;
                enemy.z = testZ;
                enemy.wallStuckTimer = 0;
                resolved = true;
                break;
              }
            }
          }
        }
      }
    };

    const originalBeginMobilityAction = beginMobilityAction;
    beginMobilityAction = function patchedBeginMobilityAction(actor, type, dirX, dirZ, options = {}) {
      if (actor && actor.id?.startsWith('enemy-')) {
        const sameSpeed = type === 'roll' ? 11.4 : type === 'dodge' ? PLAYER_DODGE_SPEED : type === 'jump' ? 7.6 : type === 'slide' ? 10.6 : options.speed;
        options = { ...options, speed: sameSpeed };
      }
      return originalBeginMobilityAction(actor, type, dirX, dirZ, options);
    };

    window.addEventListener('keydown', (event) => {
      if ((event.code === 'KeyG' || event.key?.toLowerCase?.() === 'g') && !event.repeat && state.mode === 'raid' && !state.overlay) {
        event.preventDefault();
        useOperatorUtility();
      }
    });

    refs.canvas?.addEventListener('wheel', (event) => {
      const player = state.raid?.player;
      if (!player?.grenadeTargeting || state.overlay) return;
      event.preventDefault();
      player.grenadeTargeting.distance = clamp(player.grenadeTargeting.distance + Math.sign(event.deltaY) * 1.5, 5, 28);
      updateGrenadeTargeting(player);
      syncUtilityUi();
    }, { passive: false });

    refs.canvas?.addEventListener('pointermove', (event) => {
      const player = state.raid?.player;
      const rect = refs.canvas.getBoundingClientRect();
      if (!player || !rect.width || !rect.height) return;
      player.grenadeMouseX = clamp(event.clientX - rect.left, 0, rect.width);
      player.grenadeMouseY = clamp(event.clientY - rect.top, 0, rect.height);
      if (player.grenadeTargeting) updateGrenadeTargeting(player);
    });

    const originalSyncHud = syncHud;
    syncHud = function patchedSyncHud() {
      const result = originalSyncHud();
      const player = state.raid?.player;
      if (player && refs.abilityValue && refs.abilityDetail) {
        const duration = getPlayerOperatorDef(player).abilityDuration ?? 20;
        const remaining = Math.max(0, player.abilityActiveTimer ?? 0);
        refs.abilityValue.textContent = remaining > 0
          ? L(`生效 ${remaining.toFixed(1)}秒`, `Active ${remaining.toFixed(1)}s`)
          : L(`技能时长 ${duration}秒`, `Duration ${duration}s`);
        refs.abilityDetail.textContent = L(`C 使用技能 · 本局剩余 ${player.skillUses ?? 0}/4 次`, `C: skill · ${player.skillUses ?? 0}/4 uses left this raid`);
        if (refs.abilityMeterFill) {
          refs.abilityMeterFill.style.width = `${Math.round((remaining / Math.max(duration, 0.01)) * 100)}%`;
          refs.abilityMeterFill.style.background = getPlayerOperatorDef(player).abilityColor ?? '#8fd6b3';
        }
      }
      if (state.mode === 'raid') {
        syncUtilityUi();
        if (refs.raidStatus && !player?.utilityAction) refs.raidStatus.textContent = L('鼠标转向 · F 开火 · C 技能 · G 道具 · E 交互', 'Mouse look · F fire · C skill · G utility · E interact');
      }
      return result;
    };

    // This patch replaces the operator profiles after the base screen has rendered.
    // Refresh it once so lobby cards, descriptions, and the current loadout use the live profiles.
    if (state.mode === 'base') {
      renderBasePanel();
    }

    const clearReconRenderState = (raid = state.raid) => {
      for (const enemy of raid?.enemies ?? []) {
        enemy.revealedTimer = 0;
        for (const mesh of enemy.visual?.overlayMeshes ?? []) {
          mesh.renderOverlay = false;
          mesh.overlayAlpha = 0;
        }
        for (const mesh of enemy.visual?.revealMeshes ?? []) {
          mesh.setEnabled(false);
          mesh.isVisible = false;
        }
        enemy.visual?.classLabel?.setEnabled(false);
        if (enemy.visual?.revealMaterial) enemy.visual.revealMaterial.alpha = 0;
        if (enemy.visual?.classLabelMaterial) enemy.visual.classLabelMaterial.alpha = 0;
      }
    };

    const originalReconVisibleEnemies = getReconVisibleEnemies;
    getReconVisibleEnemies = function strictReconVisibleEnemies(raid = state.raid) {
      const player = raid?.player;
      if (player?.operatorId !== 'recon' || (player.abilityActiveTimer ?? 0) <= 0 || !player.reconZone) return [];
      const visible = originalReconVisibleEnemies(raid);
      const boss = raid.enemies?.find((enemy) => enemy.isNamelessBoss && !enemy.dead);
      if (boss && !visible.includes(boss)) visible.push(boss);
      return visible;
    };

    const originalSyncEnemyRevealOverlays = syncEnemyRevealOverlays;
    syncEnemyRevealOverlays = function strictReconRevealRendering() {
      const player = state.raid?.player;
      if (player?.operatorId !== 'recon' || (player.abilityActiveTimer ?? 0) <= 0 || !player.reconZone) {
        clearReconRenderState();
        return;
      }
      const result = originalSyncEnemyRevealOverlays();
      const boss = state.raid?.enemies?.find((enemy) => enemy.isNamelessBoss && !enemy.dead);
      if (boss?.visual) {
        for (const mesh of boss.visual.overlayMeshes ?? []) {
          mesh.renderOverlay = true;
          mesh.overlayColor = BABYLON.Color3.FromHexString('#ff5364');
          mesh.overlayAlpha = 0.46;
        }
        if (boss.visual.revealMaterial) boss.visual.revealMaterial.alpha = 0.34;
        if (boss.visual.classLabelMaterial) boss.visual.classLabelMaterial.alpha = 0.92;
        for (const mesh of boss.visual.revealMeshes ?? []) {
          mesh.isVisible = true;
          mesh.setEnabled(true);
        }
      }
      return result;
    };

    const originalDrawMapEnemies = drawMapEnemies;
    drawMapEnemies = function cleanReconMapMarkers(ctx, size, enemies, radius, drawBadge) {
      // Enemy type letters overlap heavily during a scan; retain compact markers only.
      return originalDrawMapEnemies(ctx, size, enemies, radius, false);
    };

    const originalRenderRaidLoadoutMarkup = renderRaidLoadoutMarkup;
    renderRaidLoadoutMarkup = function patchedRenderRaidLoadoutMarkup() {
      const player = state.raid?.player;
      if (!player) return originalRenderRaidLoadoutMarkup();
      const stats = getCurrentPlayerWeaponStats(player);
      const partLines = getActivePartIds(player.weapon, player).map((partId) => getPartLabel(partId)).filter(Boolean);
      return [
        prepRow(L('兵种', 'Operator'), getOperatorName(player.operatorId)),
        prepRow(L('技能', 'Skill'), `${getOperatorSkillName(player.operatorId)} · ${Math.max(0, player.skillUses ?? 0)}/4 · ${Math.ceil(player.abilityActiveTimer ?? 0)}s`),
        prepRow(L('专属道具', 'Utility'), `${utilityName(player.operatorId)} · ${Math.max(0, player.utilityItems ?? 0)}/${utilityMax(player.operatorId)} · G`),
        prepRow(L('当前武器', 'Current Weapon'), `${getWeaponLabel(player.weapon)} · ${stats.damage} ${L('伤害', 'damage')}`),
        prepRow(L('当前子弹', 'Current Ammo'), getAmmoTierLabel(player.currentAmmoId)),
        prepRow(L('弹匣 / 备弹', 'Mag / Reserve'), getReserveAmmoLabel(player)),
        prepRow(L('枪械零件', 'Weapon Parts'), partLines.length ? partLines.join(' / ') : L('无', 'None')),
      ].join('');
    };
  };

  boot();
})();
