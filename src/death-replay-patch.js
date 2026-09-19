(() => {
  if (window.__sdrDeathReplayApplied) return;
  if (typeof state === 'undefined' || typeof update === 'undefined' ||
    typeof finishRaid === 'undefined' || typeof enemyShoot === 'undefined' ||
    typeof createEnemyVisual === 'undefined' || typeof scene === 'undefined' ||
    typeof camera === 'undefined' || typeof obstacleDefs === 'undefined') return;
  window.__sdrDeathReplayApplied = true;

  const MAX_HISTORY = 6.4;
  const SAMPLE_INTERVAL = 0.06;
  const MIN_REPLAY_DURATION = 3.6;
  const MAX_REPLAY_DURATION = 6.4;
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
        health: player.health ?? 0,
      },
      enemies: raid.enemies.filter((enemy) => !enemy.despawned &&
        (Math.hypot(enemy.x - player.x, enemy.z - player.z) < 82 || enemy.id === raid.replayAttackerId))
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
    <div class="death-replay-center">
      <span id="deathReplayPhase"></span>
      <span id="deathReplayDistance"></span>
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

  const restoreReplayVisualState = () => {
    const hud = document.getElementById('hud');
    hud?.classList.remove('replay-dim');
    overlay.classList.remove('impact');
  };

  const endReplay = () => {
    if (!replay) return;
    replay.avatar?.root?.dispose(false, true);
    replay.marker?.root?.dispose(false, true);
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
    const finalDistance = finalAttackerFrame
      ? Math.hypot(finalAttackerFrame.x - last.player.x, finalAttackerFrame.z - last.player.z)
      : null;

    titleEl.textContent = L('淘汰回放 · 第三人称战术镜头', 'ELIMINATION REPLAY · THIRD-PERSON TACTICAL CAMERA');
    skipEl.textContent = L('跳过回放', 'Skip Replay');
    sourceEl.textContent = attacker
      ? L(`击败者：${attackerLabel(attacker)}`, `Eliminated by: ${attackerLabel(attacker)}`)
      : L('正在回放最后的交战', 'Replaying the final engagement');
    distanceEl.textContent = finalDistance == null
      ? ''
      : L(`击杀距离 ${Math.round(finalDistance)}m`, `Kill distance ${Math.round(finalDistance)}m`);
    phaseEl.textContent = L('最后交战', 'FINAL ENGAGEMENT');
    hintEl.textContent = L('空格 / Enter / Esc 跳过', 'Space / Enter / Esc to skip');
    progressEl.style.width = '0%';

    overlay.classList.remove('hidden', 'impact');
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
      marker: makeReplayMarker(),
      elapsed: 0,
      duration: Math.max(MIN_REPLAY_DURATION, Math.min(MAX_REPLAY_DURATION, recordedDuration + 0.85)),
      recordedDuration,
      finalDistance,
      fatalSourceProgress: 0.88,
      impactShown: false,
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

  const animateReplay = (dt) => {
    if (!replay || !state.raid) return;
    replay.elapsed += Math.max(0, dt);

    const { frames } = replay;
    const replayProgress = clamp01(replay.elapsed / replay.duration);

    // Give the last ~14% of recorded action more screen time, so the fatal hit is readable.
    let sourceProgress;
    if (replayProgress < 0.76) {
      sourceProgress = (replayProgress / 0.76) * 0.86;
    } else {
      sourceProgress = 0.86 + ((replayProgress - 0.76) / 0.24) * 0.14;
    }
    sourceProgress = clamp01(sourceProgress);

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
      health: interpolate(current.player.health ?? 0, next.player.health ?? 0, blend),
    };

    replay.avatar.root.position.set(player.x, player.y, player.z);
    replay.avatar.root.rotation.y = player.yaw;

    const fallProgress = smoothstep((replayProgress - 0.82) / 0.16);
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

    const markerVisible = Boolean(attackerFrame && replayProgress >= 0.46);
    replay.marker.root.setEnabled(markerVisible);
    if (markerVisible) {
      replay.marker.root.position.set(attackerFrame.x, attackerFrame.y, attackerFrame.z);
      replay.marker.mat.alpha = 0.58 + Math.sin(replay.elapsed * 9) * 0.18;
      const liveDistance = Math.hypot(attackerFrame.x - player.x, attackerFrame.z - player.z);
      distanceEl.textContent = L(
        `击杀者距离 ${Math.max(1, Math.round(liveDistance))}m`,
        `Killer distance ${Math.max(1, Math.round(liveDistance))}m`,
      );
    }

    const sideX = Math.cos(player.yaw);
    const sideZ = -Math.sin(player.yaw);
    const playerCamera = new BABYLON.Vector3(
      player.x - Math.sin(player.yaw) * 5.4 + sideX * 1.45,
      player.y + 3.05,
      player.z - Math.cos(player.yaw) * 5.4 + sideZ * 1.45,
    );

    let finalCamera = playerCamera.clone();
    if (attackerFrame) {
      let dx = player.x - attackerFrame.x;
      let dz = player.z - attackerFrame.z;
      const length = Math.max(0.001, Math.hypot(dx, dz));
      dx /= length;
      dz /= length;
      finalCamera = new BABYLON.Vector3(
        attackerFrame.x - dx * 3.35 + dz * 0.72,
        attackerFrame.y + 2.15,
        attackerFrame.z - dz * 3.35 - dx * 0.72,
      );
    }

    const cameraBlend = smoothstep((replayProgress - 0.55) / 0.28);
    camera.position.copyFrom(BABYLON.Vector3.Lerp(playerCamera, finalCamera, cameraBlend));
    const target = new BABYLON.Vector3(
      player.x,
      player.y + interpolate(1.3, 1.05, cameraBlend),
      player.z,
    );
    camera.setTarget(target);
    camera.fov = interpolate(0.88, 0.76, cameraBlend);

    if (replayProgress >= 0.76) {
      phaseEl.textContent = L('致命一击', 'FATAL SHOT');
    } else {
      phaseEl.textContent = L('最后交战', 'FINAL ENGAGEMENT');
    }

    const impactNow = replayProgress >= 0.82 && replayProgress <= 0.93;
    overlay.classList.toggle('impact', impactNow);
    replay.impactShown ||= impactNow;
    progressEl.style.width = `${Math.round(replayProgress * 1000) / 10}%`;

    if (replay.elapsed >= replay.duration) endReplay();
  };

  const shootBeforeReplay = enemyShoot;
  enemyShoot = function recordReplayAttacker(enemy, ...args) {
    const raid = state.raid;
    if (!raid) return shootBeforeReplay(enemy, ...args);
    const previous = raid.replayAttackerId;
    const healthBefore = raid.player.health;
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
    version: '2026-09-19-optimized',
    get active() { return Boolean(replay); },
    get frames() { return history.length; },
    get elapsed() { return replay?.elapsed ?? 0; },
    get duration() { return replay?.duration ?? 0; },
    get attackerId() { return replay?.attackerId ?? null; },
    get impactShown() { return replay?.impactShown ?? false; },
    get lastDamage() { return lastDamageEvent; },
    skip: endReplay,
  };
})();
