(() => {
  if (window.__sdrEngineerPatchApplied || window.__sdrEngineerPatchWaiting) return;

  const boot = () => {
    if (
      typeof state === 'undefined' || typeof getOperatorDefs === 'undefined' ||
      typeof getOperatorOrder === 'undefined' || typeof renderOperatorPanel === 'undefined' ||
      typeof setSelectedOperator === 'undefined' || typeof useOperatorAbility === 'undefined' ||
      typeof useOperatorUtility === 'undefined' || typeof updateRaid === 'undefined' ||
      typeof moveEntityWithCollision === 'undefined' || typeof lineOfSightBlocked === 'undefined' ||
      typeof pointInsideObstaclePadding === 'undefined' || typeof resolveStaticPlacement === 'undefined' ||
      typeof distance2D === 'undefined' || typeof clamp === 'undefined' || typeof lerp === 'undefined' ||
      typeof killEnemy === 'undefined' || typeof notify === 'undefined' || typeof persistSave === 'undefined' ||
      typeof BABYLON === 'undefined' || typeof scene === 'undefined'
    ) {
      window.__sdrEngineerPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrEngineerPatchWaiting = false;
    if (window.__sdrEngineerPatchApplied) return;
    window.__sdrEngineerPatchApplied = true;

    const ENGINEER_ID = 'engineer';
    const ENGINEER_PRICE = 100000;
    const BARRIER_LENGTH = 15;
    const BARRIER_DEPTH = 0.72;
    const BARRIER_HEIGHT = 3.05;
    const BARRIER_LIMIT = 8;
    const ENGINEER_UTILITY_MAX = 10;
    // One metre from an enemy's body edge. Actor coordinates are body centres,
    // therefore collision radii are included in this practical interaction range.
    const rules = window.SDRCombat;
    const EXECUTION_RANGE = rules.config.executionRange;
    const actorFeet = (actor) => {
      if (actor.onRoofBuildingId) {
        const roof = scene.getMeshByName(`roof-${actor.onRoofBuildingId}`);
        if (roof) { roof.computeWorldMatrix(true); return roof.getBoundingInfo().boundingBox.maximumWorld.y; }
      }
      return actor.visual?.root?.position?.y ?? 0;
    };
    const staticMesh = (mesh) => mesh?.isEnabled() && mesh.isPickable !== false && (
      mesh.metadata?.raycastTarget === 'obstacle' ||
      obstacleDefs.some((obstacle) => mesh.name === `roof-${obstacle.id}`) ||
      mesh.name === 'rapid-barrier-wall'
    );
    const geometryBlocked = (from, to) => {
      const origin = new BABYLON.Vector3(from.x, from.y, from.z);
      const delta = new BABYLON.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
      const length = delta.length();
      if (length < 0.04) return false;
      const ray = new BABYLON.Ray(origin, delta.scale(1 / length), length);
      return Boolean(scene.multiPickWithRay(ray, staticMesh)?.some(hit => hit.hit && hit.distance > 0.02 && hit.distance < length - 0.03));
    };

    const engineerDef = {
      id: ENGINEER_ID,
      nameZh: '彦飞', nameEn: 'Yanfei',
      passiveZh: '男 · 工程位，后坐力与散布均为普通值的 20%；G 部署速凝掩体，I 投掷火焰弹。两种道具每 20 秒各补充 1 个。',
      passiveEn: 'Male · Engineer with 20% recoil and spread. G: Rapid Barrier. I: Incendiary. Each item refills once every 20s.',
      skillNameZh: '定点传送', skillNameEn: 'Point Warp',
      skillTextZh: 'C 启动 25 秒传送窗口，期间不耗体力、受到伤害降低三分之一；启动时全场敌人硬控 7 秒。J 瞬移至鼠标位置，可上房顶但不能穿墙。',
      skillTextEn: 'C: 25s stamina-free warp with one-third damage reduction; stun all enemies for 7s on activation. J: warp to the mouse point, including roofs, without passing through walls.',
      itemNameZh: '速凝掩体', itemNameEn: 'Rapid Barrier',
      moveMult: 1, spreadMult: 0.2, recoilMult: 0.2, reloadMult: 1, detectMult: 1,
      healBonus: 0, healCooldownMult: 1, startArmorBonus: 20, startMedkitBonus: 0,
      utilityCharges: 1, abilityDuration: 25, abilityCooldown: 0, abilityColor: '#58c8ff',
    };

    const ensureExecutionOverlay = () => {
      let overlay = document.getElementById('executionOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'executionOverlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
      }
      return overlay;
    };

    const getDefinitionsBeforeEngineer = getOperatorDefs;
    getOperatorDefs = function engineerOperatorDefinitions() {
      const defs = getDefinitionsBeforeEngineer();
      delete defs.recon;
      delete defs.vanguard;
      delete defs.saboteur;
      delete defs.quartermaster;
      Object.assign(defs.assault, {
        nameZh: '凯', nameEn: 'Kai',
        passiveZh: '男 · 前线突击手，初始护甲耐久 200，护甲耐久消耗减半；移动每秒消耗 5 点体力，控枪更稳、换弹更快，静止时恢复体力。',
        passiveEn: 'Male · Frontline breacher with 200 starting armor and half armor durability consumption. Movement costs 5 stamina/s; steadier aim, faster reloads, and stamina recovery while idle.',
        skillTextZh: '手动启动：35 秒内移速 x2、伤害翻倍；期间每击败一人延长 1.5 秒并恢复 90 生命。',
        skillTextEn: 'Manual: 35s of x2 speed and double damage. Each kill during it adds 1.5s and restores 90 HP.',
        spreadMult: 0.70, recoilMult: 0.72, reloadMult: 0.72, startArmorBonus: 170, armorDurabilityCostMult: 0.5,
        abilityDuration: 35, speedBoostMult: 2, damageBoostMult: 2, killExtendSeconds: 1.5, killHeal: 90,
      });
      Object.assign(defs.medic, {
        nameZh: '本杰明', nameEn: 'Benjamin',
        passiveZh: '男 · 战术支援员，额外携带 3 个医疗包；瞬间处决，每累计击败 5 人获得 2.5 秒无敌。',
        passiveEn: 'Male · Support specialist with 3 extra medkits, instant executions, and 2.5s invulnerability every 5 kills.',
        skillNameZh: '战术增益', skillNameEn: 'Tactical Surge',
        undefined,
        undefined,
        spreadMult: 1, reloadMult: 0.96, healCooldownMult: 0.72, startArmorBonus: 6, startMedkitBonus: 3,
        abilityDuration: 20, abilityColor: '#74e0a0',
      });
      defs[ENGINEER_ID] = { ...engineerDef };
      return defs;
    };

    getOperatorOrder = function engineerOperatorOrder() {
      return ['assault', 'medic', ENGINEER_ID];
    };

    const isEngineerUnlocked = () => Boolean(state.save.engineerUnlocked);
    const ensureSelection = () => {
      if (!["assault", "medic", ENGINEER_ID].includes(state.save.selectedOperatorId)) {
        state.save.selectedOperatorId = 'assault';
      }
      if (state.save.selectedOperatorId === ENGINEER_ID && !isEngineerUnlocked()) {
        state.save.selectedOperatorId = 'assault';
      }
    };
    ensureSelection();
    persistSave();

    const setOperatorBeforeEngineer = setSelectedOperator;
    setSelectedOperator = function selectEngineerOperator(operatorId) {
      if (operatorId === ENGINEER_ID && !isEngineerUnlocked()) {
        notify(L('彦飞尚未解锁，需要 100,000 资金。', 'Yanfei is locked. 100,000 funds are required.'), 'warning');
        return;
      }
      return setOperatorBeforeEngineer(operatorId);
    };

    renderOperatorPanel = function renderEngineerOperatorPanel() {
      ensureSelection();
      const selected = state.save.selectedOperatorId;
      return getOperatorOrder().map((operatorId) => {
        const operator = getOperatorDefs()[operatorId];
        const unlocked = operatorId !== ENGINEER_ID || isEngineerUnlocked();
        const active = selected === operatorId;
        return `
          <article class="shop-row operator-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}">
            <div>
              <div class="item-title">${L(operator.nameZh, operator.nameEn)}</div>
              <div class="item-meta">${L(operator.passiveZh, operator.passiveEn)}</div>
              <div class="item-meta">${L('技能：' + L(operator.skillNameZh, operator.skillNameEn) + ' · ' + L(operator.skillTextZh, operator.skillTextEn), 'Skill: ' + operator.skillNameEn + ' · ' + operator.skillTextEn)}</div>
              <div class="item-meta">${L('专属道具：' + L(operator.itemNameZh, operator.itemNameEn), 'Signature item: ' + operator.itemNameEn)}</div>
              ${operatorId === ENGINEER_ID ? `<div class="item-meta">${L('速凝掩体：最多携带 10 个，场上同时保留 8 个；火焰弹：最多携带 2 个，I 选点 / 确认。两者均每 20 秒补充 1 个。', 'Rapid Barrier: carry 10, keep 8 deployed; Incendiary: carry 2, press I to select / confirm. Each refills once every 20s.')}</div>` : ''}
              ${operatorId === ENGINEER_ID && !unlocked ? `<div class="item-meta operator-lock-note">${L('解锁价格：100,000 资金', 'Unlock cost: 100,000 funds')}</div>` : ''}
            </div>
            <div class="stack-list">
              ${unlocked
                ? `<button class="${active ? 'primary-button' : 'ghost-button'} small" type="button" data-operator-id="${operatorId}">${active ? L('已选择', 'Selected') : L('选择', 'Select')}</button>`
                : `<button class="primary-button small" type="button" data-engineer-unlock ${state.save.money >= ENGINEER_PRICE ? '' : 'disabled'}>${L('购买彦飞', 'Buy Yanfei')}</button>`}
            </div>
          </article>`;
      }).join('');
    };

    refs.basePanel?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-engineer-unlock]');
      if (!button || isEngineerUnlocked()) return;
      if (state.save.money < ENGINEER_PRICE) {
        notify(L('资金不足，需要 100,000。', 'Not enough funds. Need 100,000.'), 'danger');
        return;
      }
      state.save.money -= ENGINEER_PRICE;
      state.save.engineerUnlocked = true;
      state.save.selectedOperatorId = ENGINEER_ID;
      persistSave();
      renderBasePanel();
      notify(L('彦飞已解锁并已选择。', 'Yanfei unlocked and selected.'), 'success');
    });

    const barrierContains = (barrier, x, z, padding = 0) => {
      const dx = x - barrier.x;
      const dz = z - barrier.z;
      const c = Math.cos(barrier.heading);
      const s = Math.sin(barrier.heading);
      const localX = c * dx - s * dz;
      const localZ = s * dx + c * dz;
      return Math.abs(localX) < barrier.length / 2 + padding && Math.abs(localZ) < barrier.depth / 2 + padding;
    };
    const collidesWithBarrier = (x, z, radius = 0) => (state.raid?.engineerBarriers ?? []).some((barrier) => barrierContains(barrier, x, z, radius));

    const moveBeforeEngineer = moveEntityWithCollision;
    moveEntityWithCollision = function moveWithEngineerBarriers(entity, dx, dz, radius) {
      if ((entity.engineerStunTimer ?? 0) > 0) return;
      const before = { x: entity.x, z: entity.z };
      moveBeforeEngineer(entity, dx, dz, radius);
      if (entity !== state.raid?.player && collidesWithBarrier(entity.x, entity.z, radius)) {
        entity.x = before.x;
        entity.z = before.z;
      }
    };

    const sightBeforeEngineer = lineOfSightBlocked;
    lineOfSightBlocked = function engineerBarrierBlocksSight(ax, az, bx, bz) {
      if (sightBeforeEngineer(ax, az, bx, bz)) return true;
      const distance = distance2D(ax, az, bx, bz);
      const steps = Math.max(1, Math.ceil(distance / 0.35));
      for (let index = 1; index < steps; index += 1) {
        const t = index / steps;
        if (collidesWithBarrier(lerp(ax, bx, t), lerp(az, bz, t), 0.02)) return true;
      }
      return false;
    };

    const makeBarrierVisual = (barrier) => {
      const root = new BABYLON.TransformNode(`engineer-barrier-${Math.random().toString(36).slice(2, 7)}`, scene);
      root.position.set(barrier.x, 0.12, barrier.z);
      root.rotation.y = barrier.heading;
      root.scaling.y = 0.06;
      const wall = BABYLON.MeshBuilder.CreateBox('rapid-barrier-wall', { width: barrier.length, height: BARRIER_HEIGHT - 0.18, depth: barrier.depth * 0.72 }, scene);
      wall.parent = root;
      wall.isPickable = true;
      wall.metadata = { raycastTarget: true };
      const material = new BABYLON.StandardMaterial(`rapid-barrier-mat-${Math.random().toString(36).slice(2, 7)}`, scene);
      material.diffuseColor = BABYLON.Color3.FromHexString('#233840');
      material.emissiveColor = BABYLON.Color3.FromHexString('#2b7188').scale(0.12);
      material.specularColor = BABYLON.Color3.FromHexString('#93a8ad').scale(0.22);
      wall.material = material;
      const bandMaterial = new BABYLON.StandardMaterial(`rapid-barrier-band-mat-${Math.random().toString(36).slice(2, 7)}`, scene);
      bandMaterial.diffuseColor = BABYLON.Color3.FromHexString('#5f9caf');
      bandMaterial.emissiveColor = BABYLON.Color3.FromHexString('#55c7e5').scale(0.55);
      const frameMaterial = new BABYLON.StandardMaterial(`rapid-barrier-frame-mat-${Math.random().toString(36).slice(2, 7)}`, scene);
      frameMaterial.diffuseColor = BABYLON.Color3.FromHexString('#75858a');
      frameMaterial.specularColor = BABYLON.Color3.FromHexString('#b9c8ca').scale(0.35);
      const panels = [];
      for (let index = 0; index < 6; index += 1) {
        const x = -barrier.length / 2 + (index + 0.5) * (barrier.length / 6);
        const plate = BABYLON.MeshBuilder.CreateBox(`rapid-barrier-plate-${index}`, { width: barrier.length / 6 - 0.1, height: BARRIER_HEIGHT - 0.38, depth: barrier.depth * 0.82 }, scene);
        plate.parent = root;
        plate.position.set(x, 0.02, 0);
        plate.material = material;
        plate.isPickable = false;
        panels.push(plate);
        const spine = BABYLON.MeshBuilder.CreateBox(`rapid-barrier-spine-${index}`, { width: 0.08, height: BARRIER_HEIGHT - 0.12, depth: barrier.depth + 0.08 }, scene);
        spine.parent = root;
        spine.position.set(-barrier.length / 2 + index * (barrier.length / 6), 0, 0);
        spine.material = frameMaterial;
        spine.isPickable = false;
      }
      const band = BABYLON.MeshBuilder.CreateBox('rapid-barrier-band', { width: barrier.length - 0.18, height: 0.11, depth: barrier.depth + 0.04 }, scene);
      band.parent = root;
      band.position.y = 0.62;
      band.material = bandMaterial;
      band.isPickable = false;
      for (const x of [-barrier.length / 2 + 0.55, 0, barrier.length / 2 - 0.55]) {
        const foot = BABYLON.MeshBuilder.CreateBox(`rapid-barrier-foot-${x}`, { width: 0.72, height: 0.16, depth: 1.18 }, scene);
        foot.parent = root;
        foot.position.set(x, -BARRIER_HEIGHT / 2 + 0.08, 0);
        foot.material = frameMaterial;
        foot.isPickable = false;
      }
      return { root, wall, band, panels };
    };

    const makeBarrierProjectorVisual = () => {
      const root = new BABYLON.TransformNode('rapid-barrier-projector-view', scene);
      root.parent = scene.activeCamera;
      root.position.set(0.28, -0.36, 0.68);
      const body = BABYLON.MeshBuilder.CreateBox('rapid-barrier-projector-body', { width: 0.28, height: 0.16, depth: 0.38 }, scene);
      body.parent = root;
      body.material = fireMaterial('rapid-barrier-projector-body-mat', '#27383e');
      const emitter = BABYLON.MeshBuilder.CreateCylinder('rapid-barrier-projector-emitter', { height: 0.08, diameter: 0.13, tessellation: 16 }, scene);
      emitter.parent = root;
      emitter.rotation.x = Math.PI / 2;
      emitter.position.set(0, 0.025, 0.22);
      emitter.material = fireMaterial('rapid-barrier-projector-emitter-mat', '#5fd5ee');
      const grip = BABYLON.MeshBuilder.CreateBox('rapid-barrier-projector-grip', { width: 0.12, height: 0.2, depth: 0.13 }, scene);
      grip.parent = root;
      grip.position.set(0, -0.15, -0.06);
      grip.rotation.x = -0.16;
      grip.material = body.material;
      root.getChildMeshes().forEach((mesh) => { mesh.isPickable = false; });
      return root;
    };

    const crosshairTarget = (player, maxDistance = 18) => {
      const camera = scene.activeCamera;
      const ray = camera?.getForwardRay?.(maxDistance);
      let x = player.x + Math.sin(player.yaw) * maxDistance;
      let z = player.z + Math.cos(player.yaw) * maxDistance;
      if (ray && Math.abs(ray.direction.y) > 0.001) {
        const travel = -ray.origin.y / ray.direction.y;
        if (travel > 0 && travel <= maxDistance * 2) {
          x = ray.origin.x + ray.direction.x * travel;
          z = ray.origin.z + ray.direction.z * travel;
        }
      }
      return { x: clamp(x, -PLAYABLE_HALF + 1.2, PLAYABLE_HALF - 1.2), z: clamp(z, -PLAYABLE_HALF + 1.2, PLAYABLE_HALF - 1.2) };
    };

    const placeBarrier = (player) => {
      const raid = state.raid;
      const target = crosshairTarget(player, 11);
      const heading = player.yaw;
      const forwardX = Math.sin(heading);
      const forwardZ = Math.cos(heading);
      const sideX = Math.cos(heading);
      const sideZ = -Math.sin(heading);
      const maxDistance = Math.min(11, Math.max(3.4, distance2D(player.x, player.z, target.x, target.z)));
      let candidate = null;
      for (let distance = maxDistance; distance >= 3.4; distance -= 0.8) {
        const x = player.x + forwardX * distance;
        const z = player.z + forwardZ * distance;
        const clear = [0, -BARRIER_LENGTH * 0.5, BARRIER_LENGTH * 0.5].every((offset) => {
          const checkX = x + sideX * offset;
          const checkZ = z + sideZ * offset;
          return Math.abs(checkX) < PLAYABLE_HALF - 1 && Math.abs(checkZ) < PLAYABLE_HALF - 1 &&
            !pointInsideObstaclePadding(checkX, checkZ, 0.55) && !collidesWithBarrier(checkX, checkZ, 0.55);
        });
        if (clear && !lineOfSightBlocked(player.x, player.z, x, z)) {
          candidate = { x, z };
          break;
        }
      }
      if (!candidate) {
        notify(L('此处无法部署掩体。', 'Cannot deploy a barrier there.'), 'warning');
        return false;
      }
      raid.engineerBarriers ??= [];
      if (raid.engineerBarriers.length >= BARRIER_LIMIT) {
        const old = raid.engineerBarriers.shift();
        old.visual?.root?.dispose();
      }
      const barrier = { x: candidate.x, z: candidate.z, heading, length: BARRIER_LENGTH, depth: BARRIER_DEPTH, deployProgress: 0 };
      barrier.visual = makeBarrierVisual(barrier);
      raid.engineerBarriers.push(barrier);
      disposeFireNode(player.barrierDeployAction?.visual);
      player.barrierDeployAction = { timer: 0, duration: 0.72, visual: makeBarrierProjectorVisual() };
      spawnPulse(new BABYLON.Vector3(barrier.x, 0.8, barrier.z), '#58c8ff', 0.18, 0.18);
      notify(L('速凝掩体已部署：15 米，不可破坏。', 'Rapid Barrier deployed: 15m and indestructible.'), 'success');
      return true;
    };

    const utilityBeforeEngineer = useOperatorUtility;
    useOperatorUtility = function useEngineerUtility() {
      const player = state.raid?.player;
      if (player?.operatorId !== ENGINEER_ID) return utilityBeforeEngineer();
      if (state.overlay || player.utilityAction || player.incendiaryThrow) return;
      if ((player.utilityItems ?? 0) <= 0) {
        notify(L('速凝掩体不足，等待补充。', 'No Rapid Barrier available. Wait for resupply.'), 'warning');
        return;
      }
      if (placeBarrier(player)) {
        player.utilityItems -= 1;
        if (player.utilityItems < ENGINEER_UTILITY_MAX && (player.engineerUtilityGainTimer ?? 0) <= 0) {
          player.engineerUtilityGainTimer = 20;
        }
      }
    };
    window.useOperatorUtility = useOperatorUtility;

    const abilityBeforeEngineer = useOperatorAbility;
    useOperatorAbility = function useEngineerAbility() {
      const player = state.raid?.player;
      if (!player || state.overlay || player.health <= 0) return;
      if (player?.operatorId === 'medic') {
        if ((player.abilityActiveTimer ?? 0) > 0 || (player.skillUses ?? 0) <= 0) return abilityBeforeEngineer();
        player.skillUses -= 1;
        player.abilityCharges = player.skillUses;
        player.abilityActiveTimer = 20;
        player.operatorEffectTimer = 20;
        player.health = Math.min(player.maxHealth, player.health + 500);
        player.damageImmunityTimer = 5;
        player.damageReductionTimer = 0;
        player.damageReductionMult = 1;
        player.supportFirepowerTimer = 0;
        player.benjaminPostPhasePending = true;
        player.medicPostShieldPending = false;
        player.supportFirepowerPending = false;
        spawnPulse(new BABYLON.Vector3(player.x, 1, player.z), '#74e0a0', 0.18, 0.22);
        notify(L(`战术增益启动：恢复 500 生命、免伤 5 秒；随后 15 秒伤害减半且子弹伤害翻倍。剩余技能 ${player.skillUses}/4。`, `Tactical Surge: +500 HP, 5s immunity, then 15s of half damage and double bullet damage. Uses left: ${player.skillUses}/4.`), 'success');
        return;
      }
      if (player?.operatorId !== ENGINEER_ID) return abilityBeforeEngineer();
      if ((player.abilityActiveTimer ?? 0) > 0 || (player.skillUses ?? 0) <= 0) return abilityBeforeEngineer();
      player.skillUses -= 1;
      player.abilityCharges = player.skillUses;
      const duration = getPlayerOperatorDef(player).abilityDuration ?? 30;
      player.abilityActiveTimer = duration;
      player.operatorEffectTimer = duration;
      player.staminaFreeTimer = duration;
      player.warpWindowTimer = duration;
      document.exitPointerLock?.();
      state.input.fireHeld = false;
      for (const enemy of state.raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned) continue;
        enemy.engineerStunTimer = 7;
        enemy.mobilityAction = null;
        enemy.muzzleTimer = 0;
      }
      spawnPulse(new BABYLON.Vector3(player.x, 1, player.z), '#58c8ff', 0.15, 0.18);
      notify(L(`传送窗口 ${duration} 秒：鼠标指向可见地面或屋顶，按 J 瞬移。期间不耗体力、受到伤害降低三分之一；剩余 ${player.skillUses}/4 次。`, `${duration}s warp window: point at visible ground or rooftop and press J. No stamina cost, one-third less damage; ${player.skillUses}/4 uses left.`), 'success');
    };

    const hurtBeforeEngineer = applyDamageToPlayer;
    applyDamageToPlayer = function engineerAndSupportProtection(amount) {
      const player = state.raid?.player;
      if ((player?.benjaminKillShieldTimer ?? 0) > 0) return;
      const armorBefore = Number(player?.armor ?? 0);
      const result = hurtBeforeEngineer(player?.operatorId === ENGINEER_ID && player.abilityActiveTimer > 0 ? amount * (2 / 3) : amount);
      if (player?.operatorId === 'assault' && armorBefore > Number(player.armor ?? 0)) {
        const durabilityCostMult = getPlayerOperatorDef(player).armorDurabilityCostMult ?? 1;
        const armorSpent = armorBefore - player.armor;
        const refund = armorSpent * Math.max(0, 1 - durabilityCostMult);
        player.armor = Math.min(player.maxArmor ?? armorBefore, player.armor + refund);
      }
      return result;
    };

    const killBeforeEngineer = killEnemy;
    killEnemy = function benjaminKillReward(enemy) {
      const raid = state.raid;
      const alive = enemy && !enemy.dead && !enemy.despawned && !enemy.isRangeTarget;
      const result = killBeforeEngineer(enemy);
      if (alive && enemy.dead && state.raid === raid && raid?.player?.operatorId === 'medic') {
        const player = raid.player;
        player.benjaminKillCount = (player.benjaminKillCount ?? 0) + 1;
        if (player.benjaminKillCount % 5 === 0) {
          player.benjaminKillShieldTimer = 2.5;
          notify(L('五连击奖励：无敌 2.5 秒。', 'Five-kill reward: invulnerable for 2.5s.'), 'success');
        }
      }
      return result;
    };

    const damageBeforeIncendiary = damageEnemy;
    damageEnemy = function incendiaryDamage(enemy, amount, options = {}) {
      if (options.utilityKind !== 'incendiary' || !enemy || enemy.isNamelessBoss) return damageBeforeIncendiary(enemy, amount, options);
      const reduction = enemy.damageReduction;
      enemy.damageReduction = 0;
      try { return damageBeforeIncendiary(enemy, amount, options); }
      finally { enemy.damageReduction = reduction; }
    };

    const enemyShootBeforeEngineer = enemyShoot;
    enemyShoot = function shootUnlessStunned(enemy, ...args) {
      if ((enemy?.engineerStunTimer ?? 0) > 0) return;
      if (enemy?.isNamelessBoss && enemy.flashAction) return;
      return enemyShootBeforeEngineer(enemy, ...args);
    };
    const mobilityBeforeEngineer = beginMobilityAction;
    beginMobilityAction = function moveUnlessStunned(actor, ...args) {
      if ((actor?.engineerStunTimer ?? 0) > 0) return false;
      if (actor?.isNamelessBoss && (actor.flashAction || (actor.recoveryTimer ?? 0) > 0)) return false;
      return mobilityBeforeEngineer(actor, ...args);
    };
    const enemiesBeforeEngineer = updateEnemies;
    updateEnemies = function updateUnstunnedEnemies(dt) {
      const raid = state.raid;
      if (!raid) return enemiesBeforeEngineer(dt);
      const frozen = raid.enemies.filter((enemy) => !enemy.dead && (enemy.engineerStunTimer ?? 0) > 0);
      raid.enemies = raid.enemies.filter((enemy) => !frozen.includes(enemy));
      try { return enemiesBeforeEngineer(dt); }
      finally { raid.enemies.push(...frozen); }
    };

    const shootBeforeIncendiary = attemptShoot;
    attemptShoot = function engineerControlledShot() {
      const player = state.raid?.player;
      if (player?.incendiaryThrow || player?.barrierDeployAction) return;
      if (player?.operatorId !== ENGINEER_ID) return shootBeforeIncendiary();
      const before = { ammo: player.ammoInMag, pitch: player.pitch, kick: player.recoilKick ?? 0, recoil: viewModel?.recoil ?? 0 };
      const result = shootBeforeIncendiary();
      if (player.ammoInMag < before.ammo) {
        const mult = getPlayerOperatorDef(player).recoilMult;
        player.pitch = before.pitch + (player.pitch - before.pitch) * mult;
        player.recoilKick = before.kick + ((player.recoilKick ?? 0) - before.kick) * mult;
        if (viewModel) viewModel.recoil = before.recoil + (viewModel.recoil - before.recoil) * mult;
      }
      return result;
    };

    const updateBeforeEngineer = updateRaid;
    updateRaid = function updateEngineerSystems(dt) {
      const raid = state.raid;
      const player = raid?.player;
      if (player?.operatorId === ENGINEER_ID) {
        if (!player.engineerUtilityInitialized) {
          player.engineerUtilityInitialized = true;
          player.engineerUtilityGainTimer = 20;
        }
        // The shared supplier skips Yanfei; keep its public timer in sync with
        // the dedicated ten-item supplier instead of exposing an internal flag.
        player.utilityGainTimer = player.engineerUtilityGainTimer;
        player.utilityMaxItems = ENGINEER_UTILITY_MAX;
        player.utilityGainInterval = 20;
      }
      const staminaBefore = player?.stamina;
      const result = updateBeforeEngineer(dt);
      const currentRaid = state.raid;
      const current = currentRaid?.player;
      if (!currentRaid || !current) return result;
      for (const barrier of currentRaid.engineerBarriers ?? []) {
        barrier.deployProgress = Math.min(1, (barrier.deployProgress ?? 0) + dt / 0.72);
        const eased = 1 - Math.pow(1 - barrier.deployProgress, 3);
        if (barrier.visual?.root) {
          barrier.visual.root.scaling.y = 0.06 + eased * 0.94;
          barrier.visual.root.position.y = 0.12 + eased * (BARRIER_HEIGHT / 2 - 0.12);
        }
      }
      if (current.barrierDeployAction) {
        const action = current.barrierDeployAction;
        action.timer += dt;
        const progress = Math.min(1, action.timer / action.duration);
        if (action.visual) {
          action.visual.position.set(0.28 - progress * 0.52, -0.36 + Math.sin(progress * Math.PI) * 0.32, 0.68 - Math.sin(progress * Math.PI) * 0.28);
          action.visual.rotation.x = -Math.sin(progress * Math.PI) * 0.95;
          action.visual.rotation.z = -Math.sin(progress * Math.PI) * 0.32;
        }
        if (progress >= 1) {
          disposeFireNode(action.visual);
          current.barrierDeployAction = null;
        }
      }
      current.benjaminKillShieldTimer = Math.max(0, (current.benjaminKillShieldTimer ?? 0) - dt);
      for (const enemy of currentRaid.enemies ?? []) {
        enemy.engineerStunTimer = Math.max(0, (enemy.engineerStunTimer ?? 0) - dt);
      }
      updateIncendiaries(currentRaid, dt);

      if ((current.staminaFreeTimer ?? 0) > 0) {
        current.staminaFreeTimer = Math.max(0, current.staminaFreeTimer - dt);
        if (Number.isFinite(staminaBefore) && current.stamina < staminaBefore) current.stamina = staminaBefore;
      }

      if (current.operatorId === ENGINEER_ID) {
        current.utilityMaxItems = ENGINEER_UTILITY_MAX;
        current.utilityGainInterval = 20;
        if ((current.utilityItems ?? 0) < ENGINEER_UTILITY_MAX) {
          current.engineerUtilityGainTimer = Math.max(0, (current.engineerUtilityGainTimer ?? 20) - dt);
          if (current.engineerUtilityGainTimer <= 0) {
            current.utilityItems = Math.min(ENGINEER_UTILITY_MAX, (current.utilityItems ?? 0) + 1);
            current.engineerUtilityGainTimer = current.utilityItems >= ENGINEER_UTILITY_MAX ? 0 : 20;
            current.utilityGainTimer = current.engineerUtilityGainTimer;
            notify(L('获得 1 个速凝掩体。', 'Received 1 Rapid Barrier.'), 'success');
          }
        }
        if ((current.utilityItems ?? 0) >= ENGINEER_UTILITY_MAX) current.engineerUtilityGainTimer = 0;
        current.utilityGainTimer = current.utilityItems >= ENGINEER_UTILITY_MAX ? 0 : current.engineerUtilityGainTimer;
        current.warpWindowTimer = Math.max(0, (current.warpWindowTimer ?? 0) - dt);
      }

      if (current.operatorId === 'medic' && (current.supportSmokeTimer ?? 0) > 0) {
        if (!current.supportSmokeExtended) {
          current.supportSmokeExtended = true;
          current.supportSmokeTimer = Math.max(current.supportSmokeTimer, 7);
          current.supportSmokeDamageTick = 1;
        }
        current.supportSmokeDamageTick = Math.max(0, (current.supportSmokeDamageTick ?? 1) - dt);
        if (current.supportSmokeDamageTick <= 0) {
          current.supportSmokeDamageTick += 1;
          for (const enemy of currentRaid.enemies ?? []) {
            if (!enemy.dead && !enemy.despawned && distance2D(enemy.x, enemy.z, current.supportSmokeX, current.supportSmokeZ) <= 20) {
              damageEnemy(enemy, 75, { utilityKind: 'support-smoke', ignoreSmoke: true });
            }
          }
        }
      } else {
        current.supportSmokeExtended = false;
      }

      if (current.operatorId === 'medic' && current.benjaminPostPhasePending && (current.damageImmunityTimer ?? 0) <= 0) {
        current.benjaminPostPhasePending = false;
        current.damageReductionTimer = 15;
        current.damageReductionMult = 0.5;
        current.supportFirepowerTimer = 15;
        spawnPulse(new BABYLON.Vector3(current.x, 1, current.z), '#d6ff98', 0.14, 0.16);
        notify(L('免伤结束：接下来 15 秒伤害减半，子弹伤害翻倍。', 'Immunity ended: 15 seconds of half damage taken and double bullet damage.'), 'success');
      }

      const execution = currentRaid.engineerExecution;
      if (execution) {
        const enemy = currentRaid.enemies?.find((entry) => entry.id === execution.enemyId);
        if (!enemy || enemy.dead || !rules.executionEligible(current, enemy, actorFeet, geometryBlocked)) {
          if (enemy) enemy.executionFrozen = false;
          if (enemy && !enemy.dead) enemy.shootCooldown = 0.5;
          current.executionLocked = false;
          currentRaid.engineerExecution = null;
          ensureExecutionOverlay().classList.remove('is-active', 'is-impact');
        } else {
          execution.timer = Math.max(0, execution.timer - dt);
          const progress = 1 - execution.timer / execution.duration;
          const backX = -Math.sin(enemy.heading ?? 0);
          const backZ = -Math.cos(enemy.heading ?? 0);
          const swing = Math.sin(Math.min(1, progress) * Math.PI);
          if (enemy.visual?.root) {
            enemy.visual.root.rotation.x = swing * 0.3;
            enemy.visual.root.rotation.z = -swing * 0.64;
            enemy.visual.root.position.y = -Math.max(0, progress - 0.48) * 0.52;
          }
          if (typeof viewModel !== 'undefined' && viewModel?.root) {
            viewModel.root.position.z -= swing * 0.78;
            viewModel.root.position.x += (progress < 0.56 ? -1 : 1) * swing * 0.18;
            viewModel.root.rotation.x += swing * 0.42;
            viewModel.root.rotation.z += (progress < 0.56 ? -1 : 1) * swing * 0.24;
          }
          const overlay = ensureExecutionOverlay();
          overlay.style.setProperty('--execution-progress', progress.toFixed(3));
          overlay.classList.toggle('is-impact', progress >= 0.48 && progress <= 0.76);
          overlay.classList.add('is-active');
          if (!execution.applied && progress >= 0.5) {
            execution.applied = true;
            spawnImpactBurst(new BABYLON.Vector3(enemy.x, 1.25, enemy.z), execution.color, 1.55, 'flesh');
            playImpactAudio(new BABYLON.Vector3(enemy.x, 1.25, enemy.z), 'flesh');
            killEnemy(enemy);
          }
          if (execution.timer <= 0) {
            enemy.executionFrozen = false;
            current.executionLocked = false;
            currentRaid.engineerExecution = null;
            const overlay = ensureExecutionOverlay();
            overlay.classList.remove('is-active', 'is-impact');
          }
        }
      }
      return result;
    };

    const executionTarget = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || raid.execution || raid.engineerExecution) return null;
      let nearest = null;
      let best = Infinity;
      for (const enemy of raid.enemies ?? []) {
        if (!rules.executionEligible(player, enemy, actorFeet, geometryBlocked)) continue;
        const distance = distance2D(player.x, player.z, enemy.x, enemy.z);
        if (distance > EXECUTION_RANGE || distance >= best) continue;
        nearest = enemy;
        best = distance;
      }
      return nearest;
    };
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'KeyB' || event.repeat || state.mode !== 'raid' || state.overlay) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const enemy = executionTarget();
      if (!enemy) {
        notify(L('处决需要同层贴近且无遮挡；无名需低于 20% 生命，并结束狂暴免伤。', 'Execution requires close, unobstructed contact on the same floor. Nameless must be below 20% HP and out of immunity.'), 'warning');
        return;
      }
      const player = state.raid.player;
      const fast = player.operatorId === 'medic';
      if (fast) {
        spawnImpactBurst(new BABYLON.Vector3(enemy.x, 1.25, enemy.z), '#7fe2a2', 1.55, 'flesh');
        playImpactAudio(new BABYLON.Vector3(enemy.x, 1.25, enemy.z), 'flesh');
        killEnemy(enemy);
        return;
      }
      state.raid.engineerExecution = { enemyId: enemy.id, duration: fast ? 0.24 : 1.08, timer: fast ? 0.24 : 1.08, applied: false, color: fast ? '#7fe2a2' : player.operatorId === ENGINEER_ID ? '#58c8ff' : '#ff8f62' };
      enemy.executionFrozen = true;
      enemy.shootCooldown = Number.POSITIVE_INFINITY;
      player.executionLocked = true;
      state.raid.statusText = L('处决中，仍会受到伤害。', 'Executing. You can still take damage.');
      ensureExecutionOverlay().classList.add('is-active');
    }, true);

    const getCrosshairRoof = () => {
      const ray = scene.activeCamera?.getForwardRay?.(80);
      if (!ray) return null;
      const hits = scene.multiPickWithRay?.(ray, (mesh) =>
        obstacleDefs.some((obstacle) => mesh?.name === `roof-${obstacle.id}`),
      ) ?? [];
      const hit = hits.find((entry) => entry?.hit && entry.pickedPoint && entry.pickedMesh);
      if (!hit) return null;
      const obstacle = obstacleDefs.find((entry) => hit.pickedMesh.name === `roof-${entry.id}`);
      return obstacle ? { obstacle, x: hit.pickedPoint.x, z: hit.pickedPoint.z } : null;
    };

    // Keep the actual pointer position even while the player is not dragging to
    // look. Yanfei's warp deliberately uses this point instead of screen centre.
    refs.canvas?.addEventListener('pointermove', (event) => {
      const raid = state.raid;
      if (!raid?.player) return;
      raid.mouseWorldPointer = { clientX: event.clientX, clientY: event.clientY };
    }, true);

    const getMouseWorldTarget = () => {
      const pointer = state.raid?.mouseWorldPointer;
      const canvas = refs.canvas;
      if (!pointer || !canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (pointer.clientX < rect.left || pointer.clientX > rect.right || pointer.clientY < rect.top || pointer.clientY > rect.bottom) return null;
      const x = pointer.clientX - rect.left;
      const y = pointer.clientY - rect.top;
      const pick = scene.pick(x, y, (mesh) =>
        mesh?.name === 'ground' || staticMesh(mesh),
      );
      if (!pick?.hit || !pick.pickedPoint) return null;
      const surface = rules.classifyWarpSurface(pick, obstacleDefs, (id) => Boolean(scene.getMeshByName(`roof-${id}`)));
      if (!surface) return null;
      const obstacle = surface.obstacle;
      if (obstacle) {
        const inset = Math.min(0.9, Math.max(0.35, Math.min(obstacle.w, obstacle.d) * 0.08));
        const x = clamp(surface.x, obstacle.x - obstacle.w / 2 + inset, obstacle.x + obstacle.w / 2 - inset);
        const z = clamp(surface.z, obstacle.z - obstacle.d / 2 + inset, obstacle.z + obstacle.d / 2 - inset);
        if ((window.__sdrStructureRegistry?.roofProps ?? []).some((prop) =>
          prop.obstacleId === obstacle.id &&
          Math.abs(x - prop.x) < prop.w / 2 + 0.55 &&
          Math.abs(z - prop.z) < prop.d / 2 + 0.55)) return null;
        return {
          x,
          y: obstacle.h + 0.3,
          z,
          obstacle,
        };
      }
      return { x: surface.x, y: pick.pickedPoint.y, z: surface.z, obstacle: null };
    };

    const FIRE_RADIUS = rules.config.fireRadius;
    const FIRE_ITEM_MAX = 2;
    const FIRE_REFILL = 20;
    const disposeFireNode = (node) => node?.dispose(false, true);

    const fireMaterial = (name, color, alpha = 1) => {
      const mat = new BABYLON.StandardMaterial(name, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(color);
      mat.emissiveColor = mat.diffuseColor.scale(0.8);
      mat.alpha = alpha;
      return mat;
    };
    const makeIncendiaryModel = (held = false) => {
      const root = new BABYLON.TransformNode('incendiary-grenade', scene);
      const body = BABYLON.MeshBuilder.CreateCylinder('incendiary-body', { height: 0.25, diameter: 0.12, tessellation: 16 }, scene);
      body.parent = root;
      body.material = fireMaterial('incendiary-metal', '#b44a2c');
      const cap = BABYLON.MeshBuilder.CreateCylinder('incendiary-cap', { height: 0.055, diameter: 0.09, tessellation: 12 }, scene);
      cap.parent = root;
      cap.position.y = 0.15;
      cap.material = fireMaterial('incendiary-cap-metal', '#363c40');
      const band = BABYLON.MeshBuilder.CreateCylinder('incendiary-warning-band', { height: 0.05, diameter: 0.124, tessellation: 16 }, scene);
      band.parent = root;
      band.material = fireMaterial('incendiary-yellow', '#ffd36a');
      const pin = BABYLON.MeshBuilder.CreateTorus('incendiary-pin', { diameter: 0.065, thickness: 0.012, tessellation: 12 }, scene);
      pin.parent = root;
      pin.position.set(0.055, 0.17, 0);
      pin.material = cap.material;
      if (held) {
        const glove = BABYLON.MeshBuilder.CreateBox('incendiary-gloved-hand', { width: 0.15, height: 0.1, depth: 0.17 }, scene);
        glove.parent = root;
        glove.position.set(0.015, -0.03, -0.07);
        glove.material = fireMaterial('engineer-glove', '#333e42');
        const arm = BABYLON.MeshBuilder.CreateCylinder('incendiary-sleeve', { height: 0.43, diameter: 0.12, tessellation: 12 }, scene);
        arm.parent = root;
        arm.position.set(0.035, -0.1, -0.26);
        arm.rotation.x = Math.PI / 2;
        arm.material = fireMaterial('engineer-sleeve', '#28637d');
      }
      for (const mesh of root.getChildMeshes()) mesh.isPickable = false;
      return root;
    };

    const createFireField = (raid, target) => {
      const root = new BABYLON.TransformNode('persistent-incendiary-field', scene);
      root.position.set(target.x, target.y + 0.06, target.z);
      // Reuse a nearby field only when both centres share the same visible floor.
      const existing = (raid.incendiaryFields ?? []).find(field => Math.hypot(field.x - target.x, field.z - target.z) < 0.5 && Math.abs(field.y - target.y) < 0.2);
      if (existing) { root.dispose(); return; }
      if (!raid.incendiaryParticleTexture) {
        const texture = new BABYLON.DynamicTexture('incendiary-particle-texture', { width: 128, height: 128 }, scene, false);
        texture.hasAlpha = true;
        const context = texture.getContext();
        context.clearRect(0, 0, 128, 128);
        const glow = context.createRadialGradient(64, 76, 2, 64, 72, 57);
        glow.addColorStop(0, 'rgba(255,255,225,1)');
        glow.addColorStop(0.24, 'rgba(255,220,110,.96)');
        glow.addColorStop(0.55, 'rgba(255,105,24,.72)');
        glow.addColorStop(0.8, 'rgba(178,34,8,.28)');
        glow.addColorStop(1, 'rgba(80,8,0,0)');
        context.fillStyle = glow;
        context.beginPath();
        context.moveTo(64, 8);
        context.bezierCurveTo(79, 31, 111, 48, 104, 87);
        context.bezierCurveTo(98, 116, 31, 122, 23, 87);
        context.bezierCurveTo(16, 55, 47, 44, 64, 8);
        context.fill();
        texture.update();
        raid.incendiaryParticleTexture = texture;
      }
      const makeSystem = (name, capacity, smoke = false) => {
        const system = new BABYLON.ParticleSystem(name, capacity, scene);
        system.particleTexture = raid.incendiaryParticleTexture;
        system.emitter = root;
        system.minLifeTime = smoke ? 1.8 : 0.42;
        system.maxLifeTime = smoke ? 3.4 : 1.05;
        system.minSize = smoke ? 1.1 : 0.45;
        system.maxSize = smoke ? 3.2 : 2.15;
        system.emitRate = smoke ? 16 : 128;
        system.minEmitPower = smoke ? 0.35 : 1.1;
        system.maxEmitPower = smoke ? 0.85 : 3.1;
        system.updateSpeed = 0.012;
        system.gravity = new BABYLON.Vector3(0.08, smoke ? 0.18 : 0.62, -0.04);
        system.direction1 = new BABYLON.Vector3(-0.32, smoke ? 0.8 : 1.5, -0.32);
        system.direction2 = new BABYLON.Vector3(0.32, smoke ? 1.25 : 2.7, 0.32);
        system.color1 = smoke ? new BABYLON.Color4(0.16, 0.17, 0.18, 0.22) : new BABYLON.Color4(1, 0.28, 0.035, 0.92);
        system.color2 = smoke ? new BABYLON.Color4(0.28, 0.28, 0.27, 0.08) : new BABYLON.Color4(1, 0.76, 0.15, 0.86);
        system.colorDead = smoke ? new BABYLON.Color4(0.2, 0.2, 0.2, 0) : new BABYLON.Color4(0.18, 0.015, 0, 0);
        system.minAngularSpeed = -2.4;
        system.maxAngularSpeed = 2.4;
        system.blendMode = smoke ? BABYLON.ParticleSystem.BLENDMODE_STANDARD : BABYLON.ParticleSystem.BLENDMODE_ADD;
        system.startPositionFunction = (worldMatrix, position) => {
          let localX = 0;
          let localZ = 0;
          for (let attempt = 0; attempt < 6; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * (FIRE_RADIUS - 0.8);
            localX = Math.cos(angle) * radius;
            localZ = Math.sin(angle) * radius;
            if (!geometryBlocked(
              { x: target.x, y: target.y + 0.35, z: target.z },
              { x: target.x + localX, y: target.y + 0.35, z: target.z + localZ },
            )) break;
          }
          BABYLON.Vector3.TransformCoordinatesToRef(new BABYLON.Vector3(localX, smoke ? 0.75 : 0.08, localZ), worldMatrix, position);
        };
        system.start();
        return system;
      };
      const systems = [makeSystem('incendiary-flame-particles', 420), makeSystem('incendiary-smoke-particles', 120, true)];
      const light = new BABYLON.PointLight('incendiary-fire-light', new BABYLON.Vector3(0, 1.2, 0), scene);
      light.parent = root;
      light.diffuse = BABYLON.Color3.FromHexString('#ff6a25');
      light.range = 24;
      light.intensity = 0.56;
      raid.incendiaryFields ??= [];
      const field = { ...target, root, systems, light, particlesActive: true, phase: 0 };
      raid.incendiaryFields.push(field);
      raid.incendiaryGrid ??= new rules.SpatialGrid();
      raid.incendiaryGrid.add(field);
      playImpactAudio(new BABYLON.Vector3(target.x, target.y, target.z), 'hard');
      spawnPulse(new BABYLON.Vector3(target.x, target.y + 0.3, target.z), '#ff9a32', 0.22, 0.3);
    };

    const fireTargetAtMouse = () => {
      const target = getMouseWorldTarget();
      if (!target || !Number.isFinite(target.y) || Math.abs(target.x) > PLAYABLE_HALF || Math.abs(target.z) > PLAYABLE_HALF) return null;
      return target;
    };

    const useIncendiary = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (state.mode !== 'raid' || state.overlay || player?.operatorId !== ENGINEER_ID || player.health <= 0) return;
      if (player.incendiaryThrow || player.utilityAction || player.useAction || player.executionLocked || (player.dropTimer ?? 0) > 0) return;
      player.incendiaryItems ??= 1;
      if (player.incendiaryItems <= 0) {
        notify(L('火焰弹补充中。', 'Incendiary resupplying.'), 'warning');
        return;
      }
      if (!raid.incendiaryTargeting) {
        const marker = BABYLON.MeshBuilder.CreateTorus('incendiary-target-radius', { diameter: FIRE_RADIUS * 2, thickness: 0.14, tessellation: 64 }, scene);
        marker.material = fireMaterial('incendiary-target-mat', '#ffbe52');
        marker.isPickable = false;
        marker.setEnabled(false);
        raid.incendiaryTargeting = { marker, target: null };
        document.exitPointerLock?.();
        state.input.fireHeld = false;
        notify(L('用鼠标选择火焰落点，再按 I 投掷；Esc 取消。', 'Choose a point with the mouse. I to throw, Esc to cancel.'), 'success');
        return;
      }
      const target = fireTargetAtMouse();
      if (!target) {
        notify(L('请选择鼠标指向的可见地面或屋顶。', 'Point the mouse at visible ground or a rooftop.'), 'warning');
        return;
      }
      disposeFireNode(raid.incendiaryTargeting.marker);
      raid.incendiaryTargeting = null;
      player.incendiaryItems--;
      player.incendiaryRefillTimer ??= FIRE_REFILL;
      const held = makeIncendiaryModel(true);
      held.parent = scene.activeCamera;
      held.position.set(0.3, -0.25, 0.6);
      player.incendiaryThrow = { target: { ...target }, timer: 0, held };
      state.input.fireHeld = false;
    };

    const updateIncendiaries = (raid, dt) => {
      const player = raid.player;
      if (player.operatorId === ENGINEER_ID) {
        player.incendiaryItems ??= 1;
        if (player.incendiaryItems < FIRE_ITEM_MAX) {
          player.incendiaryRefillTimer = (player.incendiaryRefillTimer ?? FIRE_REFILL) - dt;
          while (player.incendiaryRefillTimer <= 0 && player.incendiaryItems < FIRE_ITEM_MAX) {
            player.incendiaryItems++;
            player.incendiaryRefillTimer += FIRE_REFILL;
          }
        } else player.incendiaryRefillTimer = FIRE_REFILL;
      }
      const targeting = raid.incendiaryTargeting;
      if (targeting) {
        targeting.target = fireTargetAtMouse();
        targeting.marker.setEnabled(Boolean(targeting.target));
        if (targeting.target) targeting.marker.position.set(targeting.target.x, targeting.target.y + 0.1, targeting.target.z);
      }
      const action = player.incendiaryThrow;
      if (action) {
        action.timer += dt;
        if (action.held) {
          const p = Math.min(1, action.timer / 0.5);
          action.held.position.set(0.3 - p * 0.19, -0.25 + Math.sin(p * Math.PI) * 0.36, 0.6 - Math.sin(p * Math.PI) * 0.3 + p * 0.28);
          action.held.rotation.x = -Math.sin(p * Math.PI) * 1.15;
          if (p >= 1) {
            action.held.computeWorldMatrix(true);
            action.start = action.held.getAbsolutePosition().clone();
            disposeFireNode(action.held);
            action.held = null;
            action.projectile = makeIncendiaryModel();
            action.projectile.position.copyFrom(action.start);
            action.flightStart = action.timer;
            action.flightDuration = clamp(distance2D(action.start.x, action.start.z, action.target.x, action.target.z) / 35, 0.6, 2.4);
          }
        } else if (action.projectile) {
          const p = clamp((action.timer - action.flightStart) / action.flightDuration, 0, 1);
          action.projectile.position.set(lerp(action.start.x, action.target.x, p), lerp(action.start.y, action.target.y + 0.12, p) + Math.sin(p * Math.PI) * 6, lerp(action.start.z, action.target.z, p));
          action.projectile.rotation.x += dt * 9;
          action.projectile.rotation.z += dt * 4;
          if (p >= 1) {
            disposeFireNode(action.projectile);
            createFireField(raid, action.target);
            player.incendiaryThrow = null;
          }
        }
      }
      for (const field of raid.incendiaryFields ?? []) {
        field.phase += dt;
        const distance = distance2D(player.x, player.z, field.x, field.z);
        field.root.setEnabled(distance < 120);
        const shouldRun = distance < 120;
        if (shouldRun !== field.particlesActive) {
          for (const system of field.systems) shouldRun ? system.start() : system.stop();
          field.particlesActive = shouldRun;
        }
        if (field.systems?.[0]) field.systems[0].emitRate = distance > 55 ? 42 : 128;
        if (field.systems?.[1]) field.systems[1].emitRate = distance > 55 ? 5 : 16;
        if (field.light) field.light.intensity = distance > 60 ? 0 : 0.48 + Math.sin(field.phase * 8.4) * 0.1;
      }
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned) continue;
        const inside = (raid.incendiaryGrid?.at(enemy.x, enemy.z) ?? []).some(field => rules.fireContains(field, enemy, actorFeet, geometryBlocked));
        if (inside) {
          enemy.incendiaryAfterburn = 3;
          enemy.incendiaryOutsideTick = 0;
          enemy.incendiaryInsideTick = (enemy.incendiaryInsideTick ?? 0) + dt;
          while (enemy.incendiaryInsideTick >= 1 && !enemy.dead) {
            enemy.incendiaryInsideTick -= 1;
            damageEnemy(enemy, 100, { utilityKind: 'incendiary', ignoreSmoke: true, bypassArmor: true });
          }
        } else {
          enemy.incendiaryInsideTick = 0;
          const burning = Math.min(dt, enemy.incendiaryAfterburn ?? 0);
          enemy.incendiaryAfterburn = Math.max(0, (enemy.incendiaryAfterburn ?? 0) - dt);
          enemy.incendiaryOutsideTick = (enemy.incendiaryOutsideTick ?? 0) + burning;
          while (enemy.incendiaryOutsideTick >= 1 - 1e-8 && !enemy.dead) {
            enemy.incendiaryOutsideTick = Math.max(0, enemy.incendiaryOutsideTick - 1);
            damageEnemy(enemy, 50, { utilityKind: 'incendiary', ignoreSmoke: true, bypassArmor: true });
          }
        }
      }
    };

    window.addEventListener('keydown', (event) => {
      const raid = state.raid;
      if (state.mode !== 'raid' || raid?.player?.operatorId !== ENGINEER_ID) return;
      if (event.code === 'Escape' && raid.incendiaryTargeting) {
        event.preventDefault();
        event.stopImmediatePropagation();
        disposeFireNode(raid.incendiaryTargeting.marker);
        raid.incendiaryTargeting = null;
      } else if (event.code === 'KeyI' && !event.repeat && !state.overlay) {
        event.preventDefault();
        event.stopImmediatePropagation();
        useIncendiary();
      }
    }, true);

    const clearBeforeIncendiary = clearRaid;
    clearRaid = function clearEngineerEffects() {
      const raid = state.raid;
      disposeFireNode(raid?.incendiaryTargeting?.marker);
      disposeFireNode(raid?.player?.incendiaryThrow?.held);
      disposeFireNode(raid?.player?.incendiaryThrow?.projectile);
      for (const field of raid?.incendiaryFields ?? []) {
        for (const system of field.systems ?? []) system.dispose(false);
        field.light?.dispose();
        disposeFireNode(field.root);
      }
      raid?.incendiaryParticleTexture?.dispose();
      for (const barrier of raid?.engineerBarriers ?? []) disposeFireNode(barrier.visual?.root);
      return clearBeforeIncendiary();
    };

    const warpToCrosshair = () => {
      const raid = state.raid;
      const player = raid?.player;
      if (!player || player.operatorId !== ENGINEER_ID || (player.warpWindowTimer ?? 0) <= 0) {
        notify(L('先按 C 开启传送窗口。', 'Press C first to open the warp window.'), 'warning');
        return;
      }
      const mouseHit = getMouseWorldTarget();
      const roofHit = mouseHit;
      if (!mouseHit) { notify(L('落点无效：请用鼠标指向可见地面或建筑屋顶。', 'Invalid landing point: aim the mouse at visible ground or a rooftop.'), 'warning'); return; }
      const target = roofHit;
      // A location inside a building footprint is still an interior ground point.
      // Only an actual raycast hit on the roof mesh grants rooftop placement.
      const roof = roofHit?.obstacle ?? null;
      if (!roof && (sightBeforeEngineer(player.x, player.z, target.x, target.z) || pointInsideObstaclePadding(target.x, target.z, player.radius + 0.15))) {
        notify(L('该地面落点被墙体或掩体阻挡，请改选同侧可见位置。', 'That ground point is blocked by a wall or barrier. Choose a visible point on this side.'), 'warning');
        return;
      }
      if (roof) {
        player.x = target.x;
        player.z = target.z;
        player.onRoofBuildingId = roof.id;
        player.insideBuildingId = roof.id;
        player.safeRoofExitTimer = 1.2;
      } else {
        const placed = resolveStaticPlacement(target.x, target.z, player.radius + 0.1);
        player.x = placed.x;
        player.z = placed.z;
        player.onRoofBuildingId = null;
        player.insideBuildingId = null;
      }
      spawnPulse(new BABYLON.Vector3(player.x, roof ? (roof.h ?? 3) + 0.5 : 1, player.z), '#58c8ff', 0.24, 0.25);
      notify(roof ? L(`已传送至建筑屋顶，可继续按 J 瞬移。`, 'Warped onto the rooftop. Press J to warp again.') : L('定点传送完成，可继续按 J 瞬移。', 'Point warp complete. Press J to warp again.'), 'success');
    };

    window.addEventListener('keydown', (event) => {
      if (event.code !== 'KeyJ' || event.repeat || state.mode !== 'raid' || state.overlay) return;
      if (state.raid?.player?.operatorId !== ENGINEER_ID) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      warpToCrosshair();
    }, true);

    // Earlier patches bind G directly inside their own closure. Capture it here so
    // Yanfei's barrier can never fall through to the legacy smoke implementation.
    window.addEventListener('keydown', (event) => {
      if ((event.code !== 'KeyG' && event.key?.toLowerCase?.() !== 'g') || event.repeat) return;
      if (state.mode !== 'raid' || state.overlay || state.raid?.player?.operatorId !== ENGINEER_ID) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      useOperatorUtility();
    }, true);

    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest?.('#utilityActionButton') || state.raid?.player?.operatorId !== ENGINEER_ID) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      useOperatorUtility();
    }, true);

    const syncHudBeforeEngineer = syncHud;
    syncHud = function syncEngineerHud() {
      const result = syncHudBeforeEngineer();
      const player = state.raid?.player;
      if (!player) return result;
      let firePanel = document.getElementById('incendiaryPanel');
      if (!firePanel) {
        firePanel = document.createElement('div');
        firePanel.id = 'incendiaryPanel';
        firePanel.className = 'hud-stat compact-stat';
        firePanel.innerHTML = '<span id="incendiaryLabel"></span><strong id="incendiaryCount"></strong><small id="incendiaryStatus"></small>';
        const host = document.querySelector('#hud .hud-left .tactical-strip') ?? document.querySelector('#hud .hud-left');
        host?.appendChild(firePanel);
      }
      firePanel.hidden = player.operatorId !== ENGINEER_ID;
      if (player.operatorId === ENGINEER_ID) {
        firePanel.querySelector('#incendiaryLabel').textContent = L('火焰弹 · I', 'Incendiary · I');
        firePanel.querySelector('#incendiaryCount').textContent = `${player.incendiaryItems ?? 1}/${FIRE_ITEM_MAX}`;
        firePanel.querySelector('#incendiaryStatus').textContent = player.incendiaryThrow
          ? L('投掷中', 'Throwing')
          : state.raid.incendiaryTargeting
            ? L('I 确认落点 · Esc 取消', 'I confirm · Esc cancel')
            : (player.incendiaryItems ?? 1) >= FIRE_ITEM_MAX
              ? L('库存已满', 'Stock full')
              : L(`${Math.ceil(player.incendiaryRefillTimer ?? FIRE_REFILL)} 秒后补充 1 个`, `+1 in ${Math.ceil(player.incendiaryRefillTimer ?? FIRE_REFILL)}s`);
      }
      if (player.operatorId === 'medic' && refs.supportPrompt) {
        refs.supportPrompt.textContent = (player.benjaminKillShieldTimer ?? 0) > 0
          ? L(`击杀无敌 ${player.benjaminKillShieldTimer.toFixed(1)} 秒`, `Kill shield ${player.benjaminKillShieldTimer.toFixed(1)}s`)
          : L(`无敌奖励进度 ${(player.benjaminKillCount ?? 0) % 5}/5 · B 瞬间处决`, `Shield progress ${(player.benjaminKillCount ?? 0) % 5}/5 · B instant execution`);
      }
      if (player.operatorId === ENGINEER_ID) {
        const value = document.getElementById('operatorUtilityValue');
        const detail = document.getElementById('operatorUtilityDetail');
        const button = document.getElementById('utilityActionButton');
        if (value) value.textContent = `${L('速凝掩体', 'Rapid Barrier')} ${Math.max(0, player.utilityItems ?? 0)}/${ENGINEER_UTILITY_MAX}`;
        if (detail) detail.textContent = (player.utilityItems ?? 0) >= ENGINEER_UTILITY_MAX
          ? L('库存已满 · 场上最多 8 个', 'Stock full · 8 deployed max')
          : L(`G 部署 · ${Math.ceil(player.engineerUtilityGainTimer ?? 20)} 秒后补充 1 个`, `G deploy · +1 in ${Math.ceil(player.engineerUtilityGainTimer ?? 20)}s`);
        if (button) button.textContent = `${L('速凝掩体', 'Rapid Barrier')} G`;
        const rows = document.querySelectorAll('#raidLoadoutList .prep-row');
        for (const row of rows) {
          if (/^(专属道具|Utility)$/.test(row.firstElementChild?.textContent ?? '')) {
            row.lastElementChild.textContent = L(`速凝掩体 ${player.utilityItems ?? 0}/10 · G；火焰弹 ${player.incendiaryItems ?? 1}/2 · I`, `Barrier ${player.utilityItems ?? 0}/10 · G; Incendiary ${player.incendiaryItems ?? 1}/2 · I`);
          }
        }
      }
      return result;
    };

    if (typeof startRaid === 'function' && typeof syncRaidPanelCollapses === 'function') {
      const startRaidBeforeReview = startRaid;
      startRaid = function startRaidWithCompactHud(...args) {
        const result = startRaidBeforeReview(...args);
        state.ui.raidPanelCollapsed = {
          raidLoadoutList: true,
          raidAmmoRail: true,
          raidBagList: true,
        };
        syncRaidPanelCollapses();
        return result;
      };
    }

    const style = document.createElement('style');
    style.textContent = `
      .operator-card.is-locked{opacity:.7}.operator-card .operator-lock-note{color:#f3c477}.hud-stat #operatorUtilityValue{font-size:.84rem}
      #hud .hud-left .tactical-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
      #hud .tactical-strip .hud-stat{min-width:0;overflow-wrap:anywhere}
      #hud .raid-side-panel{width:clamp(210px,20vw,250px);gap:6px}
      #hud .raid-side-panel .overlay-section{padding:8px 10px}
      #hud .raid-side-panel .section-head{margin-bottom:0}
      #executionOverlay{position:fixed;inset:0;z-index:24;pointer-events:none;opacity:0;transition:opacity .08s linear;background:linear-gradient(112deg,transparent 38%,rgba(220,245,255,.08) 46%,rgba(255,255,255,.5) 49%,rgba(255,103,78,.2) 52%,transparent 60%);mix-blend-mode:screen}
      #executionOverlay.is-active{opacity:.8}#executionOverlay.is-impact{opacity:1;animation:execution-strike .16s steps(2) both}
      @keyframes execution-strike{0%{transform:translateX(-16%) skewX(-17deg);filter:brightness(1)}100%{transform:translateX(16%) skewX(-17deg);filter:brightness(1.8)}}
    `;
    document.head.appendChild(style);
    if (state.mode === 'base') renderBasePanel();
  };
  boot();
})();
