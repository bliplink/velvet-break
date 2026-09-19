(() => {
  if (window.__sdrDeathReplayApplied) return;
  if (typeof state === 'undefined' || typeof update === 'undefined' ||
    typeof finishRaid === 'undefined' || typeof enemyShoot === 'undefined' ||
    typeof createEnemyVisual === 'undefined' || typeof scene === 'undefined' ||
    typeof camera === 'undefined' || typeof obstacleDefs === 'undefined') return;
  window.__sdrDeathReplayApplied = true;

  const MAX_HISTORY = 5.5;
  const SAMPLE_INTERVAL = 0.08;
  const history = [];
  let clock = 0;
  let lastSample = -Infinity;
  let replay = null;

  const floorHeight = (actor) => actor?.onRoofBuildingId
    ? (obstacleDefs.find((entry) => entry.id === actor.onRoofBuildingId)?.h ?? 0) : 0;
  const recordFrame = (force = false) => {
    const raid = state.raid;
    const player = raid?.player;
    if (!raid || !player || raid.isTrainingRange || (!force && clock - lastSample < SAMPLE_INTERVAL)) return;
    lastSample = clock;
    history.push({
      time: clock,
      player: { x: player.x, z: player.z, y: floorHeight(player), yaw: player.yaw ?? 0 },
      enemies: raid.enemies.filter((enemy) => !enemy.despawned &&
        (Math.hypot(enemy.x - player.x, enemy.z - player.z) < 75 || enemy.id === raid.replayAttackerId))
        .map((enemy) => ({ id: enemy.id, x: enemy.x, z: enemy.z,
          y: enemy.stairAction ? (enemy.stairVisualY ?? 0) : floorHeight(enemy),
          heading: enemy.heading ?? 0, dead: Boolean(enemy.dead) })),
    });
    while (history.length > 1 && history[0].time < clock - MAX_HISTORY) history.shift();
  };

  const overlay = document.createElement('div');
  overlay.id = 'deathReplayOverlay';
  overlay.className = 'hidden';
  overlay.innerHTML = '<span id="deathReplayTitle"></span><button id="deathReplaySkip" type="button"></button><span id="deathReplaySource"></span>';
  document.body.appendChild(overlay);

  const endReplay = () => {
    if (!replay) return;
    replay.avatar?.root?.dispose(false, true);
    replay = null;
    overlay.classList.add('hidden');
    state.mode = 'result';
    refs.resultOverlay.classList.remove('hidden');
  };
  overlay.querySelector('#deathReplaySkip').addEventListener('click', endReplay);
  window.addEventListener('keydown', (event) => {
    if (!replay || !['Escape', 'Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    endReplay();
  }, true);

  const startReplay = (frames, attackerId) => {
    if (!frames.length || !state.raid) return;
    const avatar = createEnemyVisual({
      id: 'replay-player', x: frames[0].player.x, z: frames[0].player.z,
      type: 'hunter', visualColor: '#73b9c5', heading: frames[0].player.yaw,
    });
    avatar.classLabel?.setEnabled(false);
    avatar.hitbox?.setEnabled(false);
    const attacker = state.raid.enemies.find((enemy) => enemy.id === attackerId);
    overlay.querySelector('#deathReplayTitle').textContent = L('淘汰回放 · 第三人称', 'ELIMINATION REPLAY · THIRD PERSON');
    overlay.querySelector('#deathReplaySkip').textContent = L('跳过回放', 'Skip Replay');
    overlay.querySelector('#deathReplaySource').textContent = attacker
      ? L(`击败者：${attacker.isNamelessBoss ? '无名' : attacker.type === 'bruiser' ? '重装兵' : attacker.type === 'hunter' ? '猎手' : '侦察兵'}`,
        `Eliminated by: ${attacker.isNamelessBoss ? 'Nameless' : attacker.type === 'bruiser' ? 'Heavy' : attacker.type === 'hunter' ? 'Hunter' : 'Scout'}`)
      : L('正在回放最后的交战', 'Replaying the final engagement');
    overlay.classList.remove('hidden');
    refs.resultOverlay.classList.add('hidden');
    if (typeof viewModel !== 'undefined') viewModel?.root?.setEnabled(false);
    state.mode = 'replay';
    replay = { frames, avatar, elapsed: 0,
      duration: Math.max(2.8, Math.min(5.5, frames.at(-1).time - frames[0].time + 0.4)) };
  };

  const interpolate = (a, b, t) => a + (b - a) * t;
  const animateReplay = (dt) => {
    if (!replay || !state.raid) return;
    replay.elapsed += Math.max(0, dt);
    const { frames } = replay;
    const recordedDuration = Math.max(0, frames.at(-1).time - frames[0].time);
    const time = frames[0].time + Math.min(1, replay.elapsed / Math.max(0.01, replay.duration - 0.4)) * recordedDuration;
    let index = 0;
    while (index < frames.length - 2 && frames[index + 1].time < time) index++;
    const current = frames[index];
    const next = frames[Math.min(index + 1, frames.length - 1)];
    const blend = Math.max(0, Math.min(1, (time - current.time) / Math.max(0.001, next.time - current.time)));
    const player = {
      x: interpolate(current.player.x, next.player.x, blend),
      z: interpolate(current.player.z, next.player.z, blend),
      y: interpolate(current.player.y, next.player.y, blend),
      yaw: interpolate(current.player.yaw, next.player.yaw, blend),
    };
    replay.avatar.root.position.set(player.x, player.y, player.z);
    replay.avatar.root.rotation.y = player.yaw;
    replay.avatar.root.rotation.z = replay.elapsed > replay.duration - 0.55
      ? Math.min(0.95, (replay.elapsed - replay.duration + 0.55) * 2) : 0;
    const nextEnemies = new Map(next.enemies.map((entry) => [entry.id, entry]));
    const currentEnemies = new Map(current.enemies.map((entry) => [entry.id, entry]));
    for (const enemy of state.raid.enemies) {
      const visual = enemy.visual?.root;
      if (!visual) continue;
      const from = currentEnemies.get(enemy.id);
      if (!from) { visual.setEnabled(false); continue; }
      const to = nextEnemies.get(enemy.id) ?? from;
      visual.setEnabled(true);
      visual.position.set(interpolate(from.x, to.x, blend), interpolate(from.y, to.y, blend), interpolate(from.z, to.z, blend));
      visual.rotation.y = interpolate(from.heading, to.heading, blend);
      visual.rotation.x = from.dead ? 1.1 : 0;
    }
    camera.position.set(player.x - Math.sin(player.yaw) * 5.2 + Math.cos(player.yaw) * 1.4,
      player.y + 3.1, player.z - Math.cos(player.yaw) * 5.2 - Math.sin(player.yaw) * 1.4);
    camera.setTarget(new BABYLON.Vector3(player.x, player.y + 1.35, player.z));
    if (replay.elapsed >= replay.duration) endReplay();
  };

  const shootBeforeReplay = enemyShoot;
  enemyShoot = function recordReplayAttacker(enemy, ...args) {
    const raid = state.raid;
    if (!raid) return shootBeforeReplay(enemy, ...args);
    const previous = raid.replayAttackerId;
    const healthBefore = raid.player.health;
    raid.replayAttackerId = enemy.id;
    try { return shootBeforeReplay(enemy, ...args); }
    finally { if (state.mode === 'raid' && raid.player.health >= healthBefore) raid.replayAttackerId = previous; }
  };

  const finishBeforeReplay = finishRaid;
  finishRaid = function finishWithReplay(success, reason, extracted) {
    if (state.mode !== 'raid') return;
    const raid = state.raid;
    const showReplay = !success && !extracted && reason === 'player_killed' && !raid?.isTrainingRange && !raid?.skipDeathReplay;
    if (showReplay) recordFrame(true);
    const frames = showReplay ? history.slice() : [];
    const attackerId = raid?.replayAttackerId;
    const result = finishBeforeReplay(success, reason, extracted);
    if (showReplay) startReplay(frames, attackerId);
    return result;
  };

  const updateBeforeReplay = update;
  update = function updateWithReplay(dt) {
    if (replay) { animateReplay(dt); return; }
    const result = updateBeforeReplay(dt);
    if (state.mode === 'raid' && state.raid && !state.raid.isTrainingRange) {
      clock += Math.max(0, dt);
      recordFrame();
    } else if (state.mode === 'base' && history.length) {
      history.length = 0;
      clock = 0;
      lastSample = -Infinity;
    }
    return result;
  };

  window.__sdrReplayDebug = { get active() { return Boolean(replay); }, get frames() { return history.length; }, skip: endReplay };
})();
