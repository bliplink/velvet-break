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
      const player = raid.player;
      if ((player.ultimateStartupTimer ?? 0) > 0) {
        player.ultimateStartupTimer = Math.max(0, player.ultimateStartupTimer - dt);
        const p = 1 - player.ultimateStartupTimer / 0.9;
        const lift = Math.sin(Math.min(1, p) * Math.PI);
        if (typeof viewModel !== 'undefined' && viewModel?.root) {
          viewModel.root.position.y += lift * 0.16;
          viewModel.root.position.z -= lift * 0.18;
          viewModel.root.rotation.x -= lift * 0.28;
          viewModel.root.rotation.z += Math.sin(p * Math.PI * 2) * 0.055;
        }
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

    // Unified ultimate/action feedback. Movement, jumping and prone are intentionally excluded.
    const combatFeedbackStyle = document.createElement('style');
    combatFeedbackStyle.id = 'final-combat-action-feedback-style';
    combatFeedbackStyle.textContent = `
      #finalCombatFeedback{position:fixed;inset:0;pointer-events:none;z-index:29;font-family:inherit;overflow:hidden}
      #finalUltimateFrame{position:absolute;inset:10px;border:2px solid transparent;border-radius:16px;opacity:0;transition:opacity .18s ease;box-shadow:inset 0 0 28px transparent,0 0 18px transparent}
      #finalUltimateFrame.is-active{opacity:.9;animation:final-ultimate-pulse .72s ease-in-out infinite alternate}
      #finalActionFrame{position:absolute;inset:18px;border:1px solid transparent;border-radius:14px;opacity:0;transition:opacity .12s ease;box-shadow:inset 0 0 42px transparent}
      #finalActionFrame.is-active{opacity:.62;animation:final-action-frame .52s ease-in-out infinite alternate}
      #finalUltimateBurst{position:absolute;left:50%;top:19%;min-width:300px;transform:translate(-50%,-50%) scale(.82);padding:12px 26px;border:1px solid transparent;border-radius:10px;background:linear-gradient(90deg,rgba(5,10,14,0),rgba(5,10,14,.84),rgba(5,10,14,0));text-align:center;opacity:0;filter:blur(4px)}
      #finalUltimateBurst strong{display:block;font-size:1.03rem;letter-spacing:.18em;text-transform:uppercase}
      #finalUltimateBurst span{display:block;margin-top:4px;font-size:.7rem;letter-spacing:.12em;opacity:.82}
      #finalUltimateBurst.is-starting{animation:final-ultimate-start 1.05s cubic-bezier(.16,.8,.22,1)}
      #finalActionFeedback{position:absolute;left:50%;bottom:16%;transform:translate(-50%,14px) scale(.96);min-width:260px;max-width:min(520px,76vw);padding:10px 18px 9px;border:1px solid rgba(180,230,255,.3);border-radius:9px;background:linear-gradient(90deg,rgba(5,10,14,.24),rgba(5,10,14,.88),rgba(5,10,14,.24));box-shadow:0 10px 30px rgba(0,0,0,.34);opacity:0;transition:opacity .12s ease,transform .12s ease;text-align:center;backdrop-filter:blur(7px)}
      #finalActionFeedback.is-active{opacity:1;transform:translate(-50%,0) scale(1)}
      #finalActionFeedback::before,#finalActionFeedback::after{content:'';position:absolute;top:50%;width:42px;height:1px;background:currentColor;opacity:.58;animation:final-action-ray .75s ease-in-out infinite alternate}
      #finalActionFeedback::before{right:100%}#finalActionFeedback::after{left:100%}
      #finalActionLabel{font-size:.83rem;font-weight:900;letter-spacing:.08em;text-shadow:0 0 11px currentColor}
      #finalActionDetail{margin-top:3px;font-size:.65rem;opacity:.72;letter-spacing:.06em}
      #finalActionProgress{height:2px;margin-top:7px;background:rgba(255,255,255,.12);overflow:hidden}
      #finalActionProgress i{display:block;height:100%;width:0;background:currentColor;box-shadow:0 0 10px currentColor;transition:width .06s linear}
      @keyframes final-ultimate-pulse{from{filter:brightness(.82)}to{filter:brightness(1.35)}}
      @keyframes final-ultimate-start{0%{opacity:0;transform:translate(-50%,-50%) scale(.62);filter:blur(8px)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.08);filter:blur(0)}72%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-54%) scale(1.04);filter:blur(3px)}}
      @keyframes final-action-ray{from{transform:scaleX(.45);opacity:.22}to{transform:scaleX(1);opacity:.72}}
      @keyframes final-action-frame{from{filter:brightness(.78)}to{filter:brightness(1.28)}}
    `;
    document.head.appendChild(combatFeedbackStyle);

    const combatFeedback = document.createElement('div');
    combatFeedback.id = 'finalCombatFeedback';
    combatFeedback.innerHTML = `
      <div id="finalUltimateFrame"></div>
      <div id="finalActionFrame"></div>
      <div id="finalUltimateBurst"><strong id="finalUltimateName"></strong><span id="finalUltimateSub"></span></div>
      <div id="finalActionFeedback">
        <div id="finalActionLabel"></div>
        <div id="finalActionDetail"></div>
        <div id="finalActionProgress"><i></i></div>
      </div>
    `;
    document.body.appendChild(combatFeedback);

    const ultimateFrame = combatFeedback.querySelector('#finalUltimateFrame');
    const actionFrame = combatFeedback.querySelector('#finalActionFrame');
    const ultimateBurst = combatFeedback.querySelector('#finalUltimateBurst');
    const ultimateName = combatFeedback.querySelector('#finalUltimateName');
    const ultimateSub = combatFeedback.querySelector('#finalUltimateSub');
    const actionFeedback = combatFeedback.querySelector('#finalActionFeedback');
    const actionLabel = combatFeedback.querySelector('#finalActionLabel');
    const actionDetail = combatFeedback.querySelector('#finalActionDetail');
    const actionProgress = combatFeedback.querySelector('#finalActionProgress i');
    let previousUltimateActive = false;
    const KAI_ULT_ARMOR_BONUS = 650;

    const activateKaiUltimateArmor = (player) => {
      if (!player || player.operatorId !== 'assault' || player.kaiUltArmorActive) return;
      player.kaiUltArmorBaseMax = Math.max(0, Number(player.maxArmor ?? 0));
      player.kaiUltArmorBonus = KAI_ULT_ARMOR_BONUS;
      player.maxArmor = player.kaiUltArmorBaseMax + KAI_ULT_ARMOR_BONUS;
      player.armor = Math.min(player.maxArmor, Number(player.armor ?? 0) + KAI_ULT_ARMOR_BONUS);
      player.kaiUltArmorActive = true;
      notify(L(`凯大招护甲增幅：+${KAI_ULT_ARMOR_BONUS} 临时护甲。`, `Kai ultimate armor surge: +${KAI_ULT_ARMOR_BONUS} temporary armor.`), 'success');
    };

    const clearKaiUltimateArmor = (player) => {
      if (!player?.kaiUltArmorActive) return;
      const restoredMax = Math.max(0, Number(player.kaiUltArmorBaseMax ?? (player.maxArmor - (player.kaiUltArmorBonus ?? 0))));
      player.maxArmor = restoredMax;
      player.armor = Math.min(Number(player.armor ?? 0), restoredMax);
      player.kaiUltArmorBonus = 0;
      player.kaiUltArmorActive = false;
    };

    const setUltimateFeedbackColor = (color) => {
      const safe = color || '#8fd6ff';
      ultimateFrame.style.borderColor = safe;
      ultimateFrame.style.boxShadow = `inset 0 0 34px ${safe}55,0 0 20px ${safe}66`;
      ultimateBurst.style.color = safe;
      ultimateBurst.style.borderColor = `${safe}88`;
      ultimateBurst.style.boxShadow = `0 0 30px ${safe}44,inset 0 0 24px ${safe}22`;
    };

    const triggerUltimateStartFeedback = (player) => {
      if (!player) return;
      const operator = getPlayerOperatorDef(player);
      const color = operator?.abilityColor ?? '#8fd6ff';
      setUltimateFeedbackColor(color);
      player.ultimateStartupTimer = Math.max(Number(player.ultimateStartupTimer ?? 0), 0.9);
      if (player.operatorId === 'assault') activateKaiUltimateArmor(player);
      ultimateName.textContent = L(operator?.skillNameZh ?? '大招启动', operator?.skillNameEn ?? 'ULTIMATE ACTIVE');
      ultimateSub.textContent = L('战术系统已启动', 'TACTICAL SYSTEM ONLINE');
      ultimateBurst.classList.remove('is-starting');
      void ultimateBurst.offsetWidth;
      ultimateBurst.classList.add('is-starting');
    };

    const getFinalActionFeedback = (player, raid) => {
      if (!player || !raid) return null;
      const operator = getPlayerOperatorDef(player);
      const opColor = operator?.abilityColor ?? '#8fd6ff';

      if (raid.engineerExecution || player.executionLocked) {
        const action = raid.engineerExecution;
        return { label: L('正在处决目标', 'Executing target'), detail: L('保持警戒 · 处决期间仍会受伤', 'Stay alert · you can still take damage'), color: '#ff765f', remaining: action?.timer, duration: action?.duration };
      }
      if (player.echoKnifeInspect) {
        return { label: L('正在检视：回声', 'Inspecting: Echo'), detail: window.__sdrEchoKnifeConfig?.form === 2 ? L('相位形态', 'Phase Form') : L('标准形态', 'Standard Form'), color: getEchoForm?.() === 2 ? '#a985ff' : '#70e8ff', remaining: Math.max(0, player.echoKnifeInspect.duration - player.echoKnifeInspect.timer), duration: player.echoKnifeInspect.duration };
      }
      if (player.echoKnifeAction) {
        return { label: L('正在挥击：回声', 'Striking: Echo'), detail: L('近战攻击', 'Melee strike'), color: player.echoKnifeAction.form === 2 ? '#a985ff' : '#70e8ff', remaining: Math.max(0, player.echoKnifeAction.duration - player.echoKnifeAction.timer), duration: player.echoKnifeAction.duration };
      }
      if (player.reloadTimer > 0) {
        let duration = player.reloadTimer;
        try { duration = Math.max(player.reloadTimer, getCurrentPlayerWeaponStats(player)?.reload ?? player.reloadTimer); } catch (_) {}
        return { label: L('正在换弹', 'Reloading'), detail: `${player.reloadTimer.toFixed(1)}s`, color: '#8fd6ff', remaining: player.reloadTimer, duration };
      }
      if (player.useAction) {
        const action = player.useAction;
        return { label: L(`正在${action.labelZh ?? '使用物品'}`, `Using: ${action.labelEn ?? 'item'}`), detail: L('动作完成前请保持操作', 'Action completes when the timer finishes'), color: action.flavor === 'armor' ? '#93c9ff' : '#82f2b2', remaining: player.healTimer, duration: action.duration };
      }
      if (player.healTimer > 0) {
        return { label: L('正在治疗', 'Healing'), detail: `${player.healTimer.toFixed(1)}s`, color: '#82f2b2', remaining: player.healTimer, duration: Math.max(player.healTimer, PLAYER_HEAL_COOLDOWN ?? player.healTimer) };
      }
      if (player.utilityAction) {
        const type = player.utilityAction.type;
        const name = type === 'assault' ? L('正在投掷高级手雷', 'Throwing Advanced Grenade')
          : type === 'medic' ? L('正在释放增益烟雾', 'Deploying Recovery Smoke')
          : L('正在启动电子隐身器', 'Activating Electronic Cloak');
        return { label: name, detail: L('专属道具', 'Signature utility'), color: opColor, remaining: player.utilityAction.timer, duration: player.utilityAction.duration };
      }
      if (player.barrierDeployAction) {
        return { label: L('正在部署速凝掩体', 'Deploying Rapid Barrier'), detail: L('工程道具', 'Engineer utility'), color: '#58c8ff', remaining: Math.max(0, player.barrierDeployAction.duration - player.barrierDeployAction.timer), duration: player.barrierDeployAction.duration };
      }
      if (player.incendiaryThrow) {
        return { label: L('正在投掷火焰弹', 'Throwing Incendiary'), detail: L('彦飞专属道具', 'Yanfei utility'), color: '#ff8a57' };
      }
      if (player.stunGrenadeThrow) {
        return { label: L('正在投掷震撼弹', 'Throwing Stun Grenade'), detail: L('彦飞专属道具', 'Yanfei utility'), color: '#9fe8ff' };
      }
      if (raid.incendiaryTargeting) {
        return { label: L('正在选择火焰弹落点', 'Selecting incendiary landing'), detail: L('再次按 I 确认', 'Press I again to confirm'), color: '#ff8a57' };
      }
      if (raid.stunGrenadeTargeting) {
        return { label: L('正在选择震撼弹落点', 'Selecting stun landing'), detail: L('再次按 O 确认', 'Press O again to confirm'), color: '#9fe8ff' };
      }
      if (player.grenadeTargeting) {
        return { label: L('正在选择高级手雷落点', 'Selecting grenade landing'), detail: L('再次按 G 投掷', 'Press G again to throw'), color: '#ff9a62' };
      }
      if (raid.switchSequence) {
        return { label: L('正在启动撤离开关', 'Activating extraction switch'), detail: `${Math.max(0, raid.switchSequence.timer ?? 0).toFixed(1)}s`, color: '#ffd06a', remaining: raid.switchSequence.timer, duration: raid.switchSequence.duration ?? 2.2 };
      }
      if ((player.extractionProgress ?? 0) > 0) {
        return { label: L('正在撤离', 'Extracting'), detail: `${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME.toFixed(1)}s`, color: '#8fffc1', remaining: Math.max(0, EXTRACTION_HOLD_TIME - player.extractionProgress), duration: EXTRACTION_HOLD_TIME };
      }
      if (player.structureAction) {
        const type = player.structureAction.type;
        const label = type === 'window' ? L('正在翻越窗户', 'Vaulting window')
          : type === 'ladder' ? L('正在攀爬梯子', 'Climbing ladder')
          : type === 'stairs' ? L('正在使用楼梯', 'Using stairs')
          : L('正在交互', 'Interacting');
        return { label, detail: L('机动交互', 'Traversal action'), color: '#9ccfff' };
      }
      const mobilityType = player.mobilityAction?.type;
      if (mobilityType && mobilityType !== 'jump' && mobilityType !== 'prone') {
        const label = mobilityType === 'slide' ? L('正在滑铲', 'Sliding')
          : mobilityType === 'roll' ? L('正在翻滚', 'Rolling')
          : mobilityType === 'dodge' ? L('正在躲闪', 'Dodging')
          : L('正在机动', 'Mobility action');
        return { label, detail: L('战术机动', 'Tactical movement'), color: '#9ccfff' };
      }
      if (player.isAiming) {
        return { label: L('正在瞄准', 'Aiming'), detail: L('精确射击状态', 'Precision fire state'), color: '#ffd48a' };
      }
      if (state.input?.fireHeld || (player.fireCooldown ?? 0) > 0.02) {
        return { label: L('正在开火', 'Firing'), detail: L('武器射击', 'Weapon fire'), color: '#ffb06f' };
      }
      return null;
    };

    const syncFinalCombatFeedback = () => {
      const raid = state.raid;
      const player = raid?.player;
      const inRaid = state.mode === 'raid' && Boolean(player);
      const activeUltimate = Boolean(inRaid && (player.abilityActiveTimer ?? 0) > 0);
      if (activeUltimate && !previousUltimateActive) triggerUltimateStartFeedback(player);
      previousUltimateActive = activeUltimate;

      if (activeUltimate) {
        const operator = getPlayerOperatorDef(player);
        setUltimateFeedbackColor(operator?.abilityColor ?? '#8fd6ff');
      }
      ultimateFrame.classList.toggle('is-active', activeUltimate);
      if (!inRaid) {
        actionFeedback.classList.remove('is-active');
        actionFrame.classList.remove('is-active');
        return;
      }

      const action = getFinalActionFeedback(player, raid);
      if (!action) {
        actionFeedback.classList.remove('is-active');
        actionFrame.classList.remove('is-active');
        actionProgress.style.width = '0%';
        return;
      }
      actionFeedback.classList.add('is-active');
      actionFrame.classList.add('is-active');
      actionFrame.style.borderColor = `${action.color ?? '#8fd6ff'}55`;
      actionFrame.style.boxShadow = `inset 0 0 48px ${action.color ?? '#8fd6ff'}33`;
      actionFeedback.style.color = action.color ?? '#8fd6ff';
      actionFeedback.style.borderColor = `${action.color ?? '#8fd6ff'}66`;
      actionFeedback.style.boxShadow = `0 10px 30px rgba(0,0,0,.34),0 0 18px ${action.color ?? '#8fd6ff'}33`;
      actionLabel.textContent = action.label;
      actionDetail.textContent = action.detail ?? '';
      const progress = Number.isFinite(action.remaining) && Number.isFinite(action.duration) && action.duration > 0
        ? Math.max(0, Math.min(1, 1 - action.remaining / action.duration))
        : 0.5;
      actionProgress.style.width = `${Math.round(progress * 100)}%`;
    };

    // One authoritative stamina HUD after every earlier patch has run.
    const syncHudBeforeFinal = syncHud;
    syncHud = function syncFinalStaminaHud(...args) {
      const result = syncHudBeforeFinal.apply(this, args);
      const player = state.raid?.player;
      if (!player) {
        syncFinalCombatFeedback();
        return result;
      }
      const max = Math.max(1, Number(player.maxStamina ?? (player.operatorId === 'lingshuang' ? 650 : 500)));
      player.stamina = Math.max(0, Math.min(max, Number(player.stamina ?? max)));
      const value = document.getElementById('staminaValue');
      const fill = document.getElementById('staminaMeterFill');
      if (value) value.textContent = `${Math.round(player.stamina)} / ${Math.round(max)}`;
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, player.stamina / max * 100)).toFixed(1)}%`;
      syncFinalCombatFeedback();
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
        if (player) {
          player.kaiUtilityGuardTimer = Math.max(0, Number(player.kaiUtilityGuardTimer ?? 0) - dt);
          if ((player.kaiUtilityGuardTimer ?? 0) <= 0) player.kaiUtilityDamageTakenMult = 1;
          if (player.kaiUltArmorActive && (player.abilityActiveTimer ?? 0) <= 0) clearKaiUltimateArmor(player);
        }
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
        if (typeof window.__sdrPatchedStartRaid === 'function') window.__sdrPatchedStartRaid();
        else startRaid();
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
          moveMult: 1.10,
          spreadMult: 0.64,
          recoilMult: 0.64,
          reloadMult: 0.66,
          baseDamageMult: 1.30,
          abilityDuration: 36,
          speedBoostMult: 2.35,
          damageBoostMult: 2.50,
          killExtendSeconds: 2.25,
          killHeal: 130,
          abilityDamageTakenMult: 0.45,
          ultimateArmorBonus: KAI_ULT_ARMOR_BONUS,
          abilityReloadMult: 0.50,
          abilitySpreadMult: 0.50,
          abilityRecoilMult: 0.50,
          skillTextZh: '手动启动：36 秒强化过载；移速提升至 2.35 倍、枪械伤害提升至 2.5 倍，获得 55% 减伤、+650 临时护甲、强化控枪/换弹与击败续航。',
          skillTextEn: 'Manual: 36s enhanced Overdrive with 2.35x movement, 2.5x weapon damage, 55% damage reduction, +650 temporary armor, stronger handling/reload and kill sustain.',
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

    const damageEnemyBeforeFinalUtilityResistance = typeof damageEnemy === 'function' ? damageEnemy : null;
    if (damageEnemyBeforeFinalUtilityResistance) {
      damageEnemy = function damageEnemyWithFinalUtilityResistance(enemy, amount, options = {}) {
        if (!enemy || !options?.utilityKind) {
          return damageEnemyBeforeFinalUtilityResistance.call(this, enemy, amount, options);
        }
        const savedReduction = enemy.damageReduction;
        const minimumReduction = enemy.isNamelessBoss
          ? 0.50
          : enemy.isNamelessMinion
            ? 0.35
            : enemy.type === 'bruiser'
              ? 0.30
              : enemy.type === 'hunter'
                ? 0.25
                : 0.20;
        enemy.damageReduction = Math.max(Number(savedReduction ?? 0), minimumReduction);
        try {
          return damageEnemyBeforeFinalUtilityResistance.call(this, enemy, amount, options);
        } finally {
          enemy.damageReduction = savedReduction;
        }
      };
    }

    const GLOBAL_FIREARM_DAMAGE_MULT = 1.75;

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
        if (player.operatorId === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
          stats.spread *= operator.abilitySpreadMult ?? 0.58;
          stats.recoil = (stats.recoil ?? 1) * (operator.abilityRecoilMult ?? 0.58);
          stats.reload *= operator.abilityReloadMult ?? 0.62;
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
        if (player?.operatorId === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
          incoming *= getPlayerOperatorDef(player)?.abilityDamageTakenMult ?? 0.62;
        }
        if (player?.operatorId === 'assault' && (player.kaiUtilityGuardTimer ?? 0) > 0) {
          incoming *= player.kaiUtilityDamageTakenMult ?? 0.65;
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

    const useAbilityBeforeUniversalStartup = typeof useOperatorAbility === 'function' ? useOperatorAbility : null;
    if (useAbilityBeforeUniversalStartup) {
      useOperatorAbility = function useOperatorAbilityWithUniversalStartup(...args) {
        const player = state.raid?.player;
        const before = player ? {
          active: Number(player.abilityActiveTimer ?? 0),
          charges: Number(player.abilityCharges ?? 0),
          uses: Number(player.skillUses ?? 0),
          immunity: Number(player.damageImmunityTimer ?? 0),
          phase: Number(player.phaseTimer ?? 0),
          freeze: Number(player.claireFreezeTimer ?? 0),
        } : null;
        const result = useAbilityBeforeUniversalStartup.apply(this, args);
        if (player && before) {
          const used =
            Number(player.abilityActiveTimer ?? 0) > before.active + 0.05 ||
            Number(player.abilityCharges ?? 0) < before.charges ||
            Number(player.skillUses ?? 0) < before.uses ||
            Number(player.damageImmunityTimer ?? 0) > before.immunity + 0.05 ||
            Number(player.phaseTimer ?? 0) > before.phase + 0.05 ||
            Number(player.claireFreezeTimer ?? 0) > before.freeze + 0.05;
          if (used) {
            triggerUltimateStartFeedback(player);
            previousUltimateActive = Number(player.abilityActiveTimer ?? 0) > 0;
          }
        }
        return result;
      };
    }

    window.__sdrFinalPolishDebug = {
      version: '20261004-combat-feedback25',
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