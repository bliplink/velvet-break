(() => {
  if (window.__sdrDeathReplayApplied) return;
  if (typeof state === 'undefined' || typeof update === 'undefined' ||
    typeof finishRaid === 'undefined' || typeof enemyShoot === 'undefined' ||
    typeof createEnemyVisual === 'undefined' || typeof scene === 'undefined' ||
    typeof camera === 'undefined' || typeof obstacleDefs === 'undefined') return;
  window.__sdrDeathReplayApplied = true;

  const MAX_HISTORY = 6.8;
  const SAMPLE_INTERVAL = 0.055;
  const MIN_REPLAY_DURATION = 4.0;
  const MAX_REPLAY_DURATION = 6.8;
  const history = [];
  let clock = 0;
  let lastSample = -Infinity;
  let replay = null;
  let lastDamageEvent = null;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (value) => {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  };
  const interpolate = (a, b, t) => a + (b - a) * t;
  const interpolateAngle = (a, b, t) => {
    let delta = (b - a) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    return a + delta * t;
  };
  const floorHeight = (actor) => actor?.onRoofBuildingId
    ? (obstacleDefs.find((entry) => entry.id === actor.onRoofBuildingId)?.h ?? 0) : 0;

  const recordFrame = (force = false) => {
    const raid = state.raid;
    const player = raid?.player;
    if (!raid || !player || raid.isTrainingRange || (!force && clock - lastSample < SAMPLE_INTERVAL)) return;
    lastSample = clock;
    history.push({
      time: clock,
      player: {
        x: player.x,
        z: player.z,
        y: floorHeight(player),
        yaw: player.yaw ?? 0,
        pitch: player.pitch ?? 0,
        health: player.health ?? 0,
      },
      enemies: raid.enemies.filter((enemy) => !enemy.despawned &&
        (Math.hypot(enemy.x - player.x, enemy.z - player.z) < 86 || enemy.id === raid.replayAttackerId))
        .map((enemy) => ({
          id: enemy.id,
          x: enemy.x,
          z: enemy.z,
          y: enemy.stairAction ? (enemy.stairVisualY ?? 0) : floorHeight(enemy),
          heading: enemy.heading ?? 0,
          dead: Boolean(enemy.dead),
          health: enemy.health ?? 0,
        })),
    });
    while (history.length > 1 && history[0].time < clock - MAX_HISTORY) history.shift();
  };

  const overlay = document.createElement('div');
  overlay.id = 'deathReplayOverlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div class="death-replay-topbar">
      <div class="death-replay-copy">
        <span id="deathReplayTitle"></span>
        <span id="deathReplaySource"></span>
      </div>
      <button id="deathReplaySkip" type="button"></button>
    </div>

    <div class="death-replay-killcard">
      <span id="deathReplayPerspective"></span>
      <strong id="deathReplayDistance"></strong>
      <span id="deathReplayDamage"></span>
    </div>

    <div class="death-replay-center">
      <span id="deathReplayPhase"></span>
      <span id="deathReplayImpactText"></span>
    </div>

    <div class="death-replay-reticle" aria-hidden="true">
      <i></i><i></i><i></i><i></i>
    </div>

    <div class="death-replay-timeline" aria-hidden="true">
      <span id="deathReplayProgress"></span>
      <i id="deathReplayImpactMark"></i>
    </div>
    <span id="deathReplayHint"></span>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector('#deathReplayTitle');
  const sourceEl = overlay.querySelector('#deathReplaySource');
  const skipEl = overlay.querySelector('#deathReplaySkip');
  const phaseEl = overlay.querySelector('#deathReplayPhase');
  const distanceEl = overlay.querySelector('#deathReplayDistance');
  const damageEl = overlay.querySelector('#deathReplayDamage');
  const perspectiveEl = overlay.querySelector('#deathReplayPerspective');
  const impactTextEl = overlay.querySelector('#deathReplayImpactText');
  const progressEl = overlay.querySelector('#deathReplayProgress');
  const hintEl = overlay.querySelector('#deathReplayHint');

  const attackerLabel = (attacker) => {
    if (!attacker) return L('未知敌人', 'Unknown hostile');
    if (attacker.isNamelessBoss) return L('无名', 'Nameless');
    if (attacker.type === 'bruiser') return L('重装兵', 'Heavy');
    if (attacker.type === 'hunter') return L('猎手', 'Hunter');
    return L('侦察兵', 'Scout');
  };

  const makeReplayMarker = () => {
    const root = new BABYLON.TransformNode('death-replay-attacker-marker-root', scene);
    const mat = new BABYLON.StandardMaterial('death-replay-attacker-marker-mat', scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString('#ff685f');
    mat.emissiveColor = BABYLON.Color3.FromHexString('#ff493f').scale(0.85);
    mat.alpha = 0.82;
    mat.disableLighting = true;
    mat.backFaceCulling = false;

    const ring = BABYLON.MeshBuilder.CreateTorus('death-replay-attacker-ring', {
      diameter: 1.45,
      thickness: 0.055,
      tessellation: 24,
    }, scene);
    ring.parent = root;
    ring.position.y = 0.08;
    ring.material = mat;
    ring.isPickable = false;

    const beacon = BABYLON.MeshBuilder.CreatePlane('death-replay-attacker-beacon', {
      width: 0.28,
      height: 0.28,
    }, scene);
    beacon.parent = root;
    beacon.position.y = 2.58;
    beacon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    beacon.rotation.z = Math.PI / 4;
    beacon.material = mat;
    beacon.isPickable = false;

    root.setEnabled(false);
    return { root, mat };
  };

  const disposeFatalTracer = (tracer) => {
    if (!tracer) return;
    tracer.core?.dispose();
    tracer.glow?.dispose();
    tracer.impact?.dispose();
    tracer.coreMat?.dispose();
    tracer.glowMat?.dispose();
    tracer.impactMat?.dispose();
  };

  const makeFatalTracer = (from, to) => {
    const direction = to.subtract(from);
    const distance = direction.length();
    if (distance < 0.05) return null;

    const coreMat = new BABYLON.StandardMaterial('death-replay-fatal-core-mat', scene);
    coreMat.diffuseColor = BABYLON.Color3.FromHexString('#fff5cf');
    coreMat.emissiveColor = BABYLON.Color3.FromHexString('#fff1ad');
    coreMat.alpha = 0.98;
    coreMat.disableLighting = true;

    const glowMat = new BABYLON.StandardMaterial('death-replay-fatal-glow-mat', scene);
    glowMat.diffuseColor = BABYLON.Color3.FromHexString('#ff8c66');
    glowMat.emissiveColor = BABYLON.Color3.FromHexString('#ff5e48');
    glowMat.alpha = 0.25;
    glowMat.disableLighting = true;

    const impactMat = new BABYLON.StandardMaterial('death-replay-fatal-impact-mat', scene);
    impactMat.diffuseColor = BABYLON.Color3.FromHexString('#ffb073');
    impactMat.emissiveColor = BABYLON.Color3.FromHexString('#ff6047');
    impactMat.alpha = 0.75;
    impactMat.disableLighting = true;

    const core = BABYLON.MeshBuilder.CreateTube('death-replay-fatal-core', {
      path: [from, to],
      radius: 0.022,
      tessellation: 7,
      cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    core.material = coreMat;
    core.isPickable = false;

    const glow = BABYLON.MeshBuilder.CreateTube('death-replay-fatal-glow', {
      path: [from, to],
      radius: 0.065,
      tessellation: 7,
      cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    glow.material = glowMat;
    glow.isPickable = false;

    const impact = BABYLON.MeshBuilder.CreateSphere('death-replay-fatal-impact', {
      diameter: 0.28,
      segments: 10,
    }, scene);
    impact.position.copyFrom(to);
    impact.material = impactMat;
    impact.isPickable = false;

    return { core, glow, impact, coreMat, glowMat, impactMat, age: 0 };
  };

  const resolveCameraCollision = (target, desired) => {
    const delta = desired.subtract(target);
    const distance = delta.length();
    if (distance < 0.2) return desired;

    const direction = delta.scale(1 / distance);
    const ray = new BABYLON.Ray(target, direction, distance);
    const pick = scene.pickWithRay(ray, (mesh) => mesh?.metadata?.raycastTarget === 'obstacle');
    replay && (replay.cameraCollisionChecks += 1);

    if (!pick?.hit || !Number.isFinite(pick.distance) || pick.distance >= distance) return desired;

    const safeDistance = Math.max(0.65, pick.distance - 0.42);
    replay && (replay.cameraCollisionAvoided += 1);
    return target.add(direction.scale(safeDistance));
  };

  const restoreReplayVisualState = () => {
    document.getElementById('hud')?.classList.remove('replay-dim');
    overlay.classList.remove('impact', 'freeze', 'killer-view');
  };

  const endReplay = () => {
    if (!replay) return;
    replay.avatar?.root?.dispose(false, true);
    replay.marker?.root?.dispose(false, true);
    disposeFatalTracer(replay.fatalTracer);
    replay = null;
    restoreReplayVisualState();
    overlay.classList.add('hidden');
    state.mode = 'result';
    refs.resultOverlay.classList.remove('hidden');
  };

  skipEl.addEventListener('click', endReplay);
  window.addEventListener('keydown', (event) => {
    if (!replay || !['Escape', 'Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    endReplay();
  }, true);

  const findFrameEnemy = (frame, id) => frame?.enemies?.find((entry) => entry.id === id) ?? null;

  const startReplay = (frames, attackerId) => {
    if (!frames.length || !state.raid) return;

    const first = frames[0];
    const last = frames.at(-1);
    const avatar = createEnemyVisual({
      id: 'replay-player',
      x: first.player.x,
      z: first.player.z,
      type: 'hunter',
      visualColor: '#73b9c5',
      heading: first.player.yaw,
    });
    avatar.classLabel?.setEnabled(false);
    avatar.hitbox?.setEnabled(false);

    const attacker = state.raid.enemies.find((enemy) => enemy.id === attackerId);
    const finalAttackerFrame = findFrameEnemy(last, attackerId);
    const fallbackDistance = finalAttackerFrame
      ? Math.hypot(finalAttackerFrame.x - last.player.x, finalAttackerFrame.z - last.player.z)
      : null;
    const fatalEvent = lastDamageEvent?.attackerId === attackerId ? { ...lastDamageEvent } : null;
    const finalDistance = fatalEvent?.distance ?? fallbackDistance;

    titleEl.textContent = L('淘汰回放 · 战术击杀镜头', 'ELIMINATION REPLAY · TACTICAL KILLCAM');
    skipEl.textContent = L('跳过回放', 'Skip Replay');
    sourceEl.textContent = attacker
      ? L(`击败者：${attackerLabel(attacker)}`, `Eliminated by: ${attackerLabel(attacker)}`)
      : L('正在回放最后的交战', 'Replaying the final engagement');
    distanceEl.textContent = finalDistance == null
      ? ''
      : L(`${Math.round(finalDistance)}m`, `${Math.round(finalDistance)}m`);
    damageEl.textContent = fatalEvent?.amount
      ? L(`最后受击 -${Math.round(fatalEvent.amount)} HP`, `Final hit -${Math.round(fatalEvent.amount)} HP`)
      : L('最后交战记录', 'Final engagement record');
    phaseEl.textContent = L('最后交战', 'FINAL ENGAGEMENT');
    perspectiveEl.textContent = L('第三人称追踪', 'THIRD-PERSON TRACK');
    impactTextEl.textContent = '';
    hintEl.textContent = L('空格 / Enter / Esc 跳过', 'Space / Enter / Esc to skip');
    progressEl.style.width = '0%';

    overlay.classList.remove('hidden', 'impact', 'freeze', 'killer-view');
    refs.resultOverlay.classList.add('hidden');
    document.getElementById('hud')?.classList.add('replay-dim');
    if (typeof viewModel !== 'undefined') viewModel?.root?.setEnabled(false);
    state.mode = 'replay';

    const recordedDuration = Math.max(0, last.time - first.time);
    replay = {
      frames,
      avatar,
      attacker,
      attackerId,
      fatalEvent,
      marker: makeReplayMarker(),
      fatalTracer: null,
      elapsed: 0,
      duration: Math.max(MIN_REPLAY_DURATION, Math.min(MAX_REPLAY_DURATION, recordedDuration + 0.95)),
      recordedDuration,
      finalDistance,
      impactShown: false,
      tracerShown: false,
      freezeShown: false,
      killerViewShown: false,
      cameraCollisionChecks: 0,
      cameraCollisionAvoided: 0,
    };
  };

  const sampleEnemy = (current, next, id, blend) => {
    const from = findFrameEnemy(current, id);
    const to = findFrameEnemy(next, id) ?? from;
    if (!from || !to) return null;
    return {
      x: interpolate(from.x, to.x, blend),
      z: interpolate(from.z, to.z, blend),
      y: interpolate(from.y, to.y, blend),
      heading: interpolateAngle(from.heading, to.heading, blend),
      dead: from.dead,
    };
  };

  const replaySourceProgress = (progress) => {
    // Normal-speed lead-in, a compressed approach to the final shot, then a short
    // freeze on the fatal frame before the last few recorded frames finish.
    if (progress < 0.70) return (progress / 0.70) * 0.82;
    if (progress < 0.82) return 0.82 + ((progress - 0.70) / 0.12) * 0.135;
    if (progress < 0.90) return 0.955;
    return 0.955 + ((progress - 0.90) / 0.10) * 0.045;
  };

  const animateReplay = (dt) => {
    if (!replay || !state.raid) return;
    replay.elapsed += Math.max(0, dt);

    const { frames } = replay;
    const replayProgress = clamp01(replay.elapsed / replay.duration);
    const sourceProgress = clamp01(replaySourceProgress(replayProgress));

    const time = frames[0].time + sourceProgress * replay.recordedDuration;
    let index = 0;
    while (index < frames.length - 2 && frames[index + 1].time < time) index++;
    const current = frames[index];
    const next = frames[Math.min(index + 1, frames.length - 1)];
    const blend = clamp01((time - current.time) / Math.max(0.001, next.time - current.time));

    const player = {
      x: interpolate(current.player.x, next.player.x, blend),
      z: interpolate(current.player.z, next.player.z, blend),
      y: interpolate(current.player.y, next.player.y, blend),
      yaw: interpolateAngle(current.player.yaw, next.player.yaw, blend),
      pitch: interpolate(current.player.pitch ?? 0, next.player.pitch ?? 0, blend),
      health: interpolate(current.player.health ?? 0, next.player.health ?? 0, blend),
    };

    replay.avatar.root.position.set(player.x, player.y, player.z);
    replay.avatar.root.rotation.y = player.yaw;

    const fallProgress = smoothstep((replayProgress - 0.84) / 0.14);
    replay.avatar.root.rotation.z = fallProgress * 1.02;
    replay.avatar.root.position.y = player.y - fallProgress * 0.18;

    const nextEnemies = new Map(next.enemies.map((entry) => [entry.id, entry]));
    const currentEnemies = new Map(current.enemies.map((entry) => [entry.id, entry]));
    for (const enemy of state.raid.enemies) {
      const visual = enemy.visual?.root;
      if (!visual) continue;
      const from = currentEnemies.get(enemy.id);
      if (!from) {
        visual.setEnabled(false);
        continue;
      }
      const to = nextEnemies.get(enemy.id) ?? from;
      visual.setEnabled(true);
      visual.position.set(
        interpolate(from.x, to.x, blend),
        interpolate(from.y, to.y, blend),
        interpolate(from.z, to.z, blend),
      );
      visual.rotation.y = interpolateAngle(from.heading, to.heading, blend);
      visual.rotation.x = from.dead ? 1.1 : 0;
    }

    const attackerFrame = replay.attackerId
      ? sampleEnemy(current, next, replay.attackerId, blend)
      : null;

    const markerVisible = Boolean(attackerFrame && replayProgress >= 0.43);
    replay.marker.root.setEnabled(markerVisible);
    if (markerVisible) {
      replay.marker.root.position.set(attackerFrame.x, attackerFrame.y, attackerFrame.z);
      replay.marker.mat.alpha = 0.58 + Math.sin(replay.elapsed * 9) * 0.18;
      const liveDistance = Math.hypot(attackerFrame.x - player.x, attackerFrame.z - player.z);
      distanceEl.textContent = L(
        `${Math.max(1, Math.round(liveDistance))}m`,
        `${Math.max(1, Math.round(liveDistance))}m`,
      );
    }

    const playerForward = new BABYLON.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const playerRight = new BABYLON.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const playerCamera = new BABYLON.Vector3(
      player.x - playerForward.x * 4.35 + playerRight.x * 1.18,
      player.y + 3.0,
      player.z - playerForward.z * 4.35 + playerRight.z * 1.18,
    );

    const playerChest = new BABYLON.Vector3(player.x, player.y + 1.22, player.z);
    let desiredCamera = playerCamera;
    let cameraTarget = playerChest.clone();
    let targetFov = 0.88;

    if (attackerFrame) {
      const attackerForward = new BABYLON.Vector3(
        Math.sin(attackerFrame.heading),
        0,
        Math.cos(attackerFrame.heading),
      );
      const attackerRight = new BABYLON.Vector3(
        Math.cos(attackerFrame.heading),
        0,
        -Math.sin(attackerFrame.heading),
      );
      const attackerHead = new BABYLON.Vector3(attackerFrame.x, attackerFrame.y + 1.76, attackerFrame.z);

      const shoulderCamera = attackerHead
        .subtract(attackerForward.scale(1.02))
        .add(attackerRight.scale(0.44))
        .add(new BABYLON.Vector3(0, 0.12, 0));
      const eyeCamera = attackerHead
        .subtract(attackerForward.scale(0.26))
        .add(attackerRight.scale(0.11));

      const shoulderBlend = smoothstep((replayProgress - 0.48) / 0.22);
      const eyeBlend = smoothstep((replayProgress - 0.72) / 0.12);
      desiredCamera = BABYLON.Vector3.Lerp(playerCamera, shoulderCamera, shoulderBlend);
      desiredCamera = BABYLON.Vector3.Lerp(desiredCamera, eyeCamera, eyeBlend * 0.78);
      cameraTarget = BABYLON.Vector3.Lerp(playerChest, playerChest.add(new BABYLON.Vector3(0, -0.16, 0)), eyeBlend);
      targetFov = interpolate(0.84, 0.60, Math.max(shoulderBlend * 0.72, eyeBlend));

      if (shoulderBlend > 0.25) {
        replay.killerViewShown = true;
        overlay.classList.add('killer-view');
        perspectiveEl.textContent = eyeBlend > 0.55
          ? L('击杀者瞄准视角', 'KILLER AIM VIEW')
          : L('击杀者肩后视角', 'KILLER SHOULDER VIEW');
      }
    }

    const safeCamera = resolveCameraCollision(cameraTarget, desiredCamera);
    camera.position.copyFrom(safeCamera);
    camera.setTarget(cameraTarget);
    camera.fov = targetFov;

    const fatalWindow = replayProgress >= 0.80 && replayProgress <= 0.94;
    const freezeWindow = replayProgress >= 0.82 && replayProgress < 0.90;
    overlay.classList.toggle('impact', fatalWindow);
    overlay.classList.toggle('freeze', freezeWindow);

    if (replayProgress >= 0.76) {
      phaseEl.textContent = L('致命一击', 'FATAL SHOT');
    } else if (replayProgress >= 0.50) {
      phaseEl.textContent = L('击杀者视角', 'KILLER VIEW');
    } else {
      phaseEl.textContent = L('最后交战', 'FINAL ENGAGEMENT');
    }

    if (freezeWindow) {
      replay.freezeShown = true;
      impactTextEl.textContent = L('致命命中 · 定格', 'FATAL HIT · FREEZE');
    } else if (fatalWindow) {
      impactTextEl.textContent = L('致命弹道', 'FATAL TRAJECTORY');
    } else {
      impactTextEl.textContent = '';
    }

    if (!replay.fatalTracer && replayProgress >= 0.815 && attackerFrame) {
      const from = replay.fatalEvent
        ? new BABYLON.Vector3(
            replay.fatalEvent.attackerX,
            replay.fatalEvent.attackerY,
            replay.fatalEvent.attackerZ,
          )
        : new BABYLON.Vector3(attackerFrame.x, attackerFrame.y + 1.46, attackerFrame.z);
      const to = replay.fatalEvent
        ? new BABYLON.Vector3(
            replay.fatalEvent.playerX,
            replay.fatalEvent.playerY,
            replay.fatalEvent.playerZ,
          )
        : new BABYLON.Vector3(player.x, player.y + 1.18, player.z);
      replay.fatalTracer = makeFatalTracer(from, to);
      replay.tracerShown = Boolean(replay.fatalTracer);
    }

    if (replay.fatalTracer) {
      replay.fatalTracer.age += Math.max(0, dt);
      const pulse = 0.72 + Math.sin(replay.fatalTracer.age * 18) * 0.18;
      replay.fatalTracer.glowMat.alpha = fatalWindow ? 0.20 + pulse * 0.12 : 0.06;
      replay.fatalTracer.coreMat.alpha = fatalWindow ? 0.95 : 0.28;
      replay.fatalTracer.impactMat.alpha = fatalWindow ? 0.52 + pulse * 0.28 : 0.12;
      replay.fatalTracer.impact.scaling.setAll(fatalWindow ? 0.9 + pulse * 0.45 : 0.7);
    }

    replay.impactShown ||= fatalWindow;
    progressEl.style.width = `${Math.round(replayProgress * 1000) / 10}%`;

    if (replay.elapsed >= replay.duration) endReplay();
  };

  const shootBeforeReplay = enemyShoot;
  enemyShoot = function recordReplayAttacker(enemy, ...args) {
    const raid = state.raid;
    if (!raid) return shootBeforeReplay(enemy, ...args);

    const previous = raid.replayAttackerId;
    const healthBefore = raid.player.health;
    const playerBefore = {
      x: raid.player.x,
      y: floorHeight(raid.player) + 1.18,
      z: raid.player.z,
    };
    const attackerBefore = {
      x: enemy.x,
      y: floorHeight(enemy) + 1.46,
      z: enemy.z,
    };

    raid.replayAttackerId = enemy.id;
    try {
      return shootBeforeReplay(enemy, ...args);
    } finally {
      const healthAfter = raid.player.health;
      if (healthAfter < healthBefore) {
        lastDamageEvent = {
          time: clock,
          attackerId: enemy.id,
          amount: healthBefore - healthAfter,
          healthBefore,
          healthAfter,
          distance: Math.hypot(enemy.x - raid.player.x, enemy.z - raid.player.z),
          attackerX: attackerBefore.x,
          attackerY: attackerBefore.y,
          attackerZ: attackerBefore.z,
          playerX: playerBefore.x,
          playerY: playerBefore.y,
          playerZ: playerBefore.z,
        };
      } else if (state.mode === 'raid') {
        raid.replayAttackerId = previous;
      }
    }
  };

  const finishBeforeReplay = finishRaid;
  finishRaid = function finishWithReplay(success, reason, extracted) {
    if (state.mode !== 'raid') return;
    const raid = state.raid;
    const showReplay = !success && !extracted && reason === 'player_killed' &&
      !raid?.isTrainingRange && !raid?.skipDeathReplay;

    if (showReplay) recordFrame(true);
    const frames = showReplay ? history.slice() : [];
    const attackerId = raid?.replayAttackerId ?? lastDamageEvent?.attackerId ?? null;
    const result = finishBeforeReplay(success, reason, extracted);
    if (showReplay) startReplay(frames, attackerId);
    return result;
  };

  const updateBeforeReplay = update;
  update = function updateWithReplay(dt) {
    if (replay) {
      animateReplay(dt);
      return;
    }
    const result = updateBeforeReplay(dt);
    if (state.mode === 'raid' && state.raid && !state.raid.isTrainingRange) {
      clock += Math.max(0, dt);
      recordFrame();
    } else if (state.mode === 'base' && history.length) {
      history.length = 0;
      clock = 0;
      lastSample = -Infinity;
      lastDamageEvent = null;
    }
    return result;
  };

  window.__sdrReplayDebug = {
    version: '2026-09-19-killcam-v3',
    get active() { return Boolean(replay); },
    get frames() { return history.length; },
    get elapsed() { return replay?.elapsed ?? 0; },
    get duration() { return replay?.duration ?? 0; },
    get attackerId() { return replay?.attackerId ?? null; },
    get impactShown() { return replay?.impactShown ?? false; },
    get tracerShown() { return replay?.tracerShown ?? false; },
    get freezeShown() { return replay?.freezeShown ?? false; },
    get killerViewShown() { return replay?.killerViewShown ?? false; },
    get cameraCollisionChecks() { return replay?.cameraCollisionChecks ?? 0; },
    get cameraCollisionAvoided() { return replay?.cameraCollisionAvoided ?? 0; },
    get lastDamage() { return lastDamageEvent; },
    skip: endReplay,
  };
})();
