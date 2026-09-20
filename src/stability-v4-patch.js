(() => {
  'use strict';

  if (window.__sdrStabilityV4Waiting || window.__sdrStabilityV4Applied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof scene === 'undefined' ||
      typeof syncHud === 'undefined' ||
      typeof distance2D === 'undefined'
    ) {
      window.__sdrStabilityV4Waiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrStabilityV4Waiting = false;
    if (window.__sdrStabilityV4Applied) return;
    window.__sdrStabilityV4Applied = true;

    const RESCUE_RANGE = 3.6;
    const REVIVE_TIME = 5;
    const HUD_INTERVAL = 250;
    const VISIBILITY_INTERVAL = 420;

    const debug = {
      version: '2026-09-20-stability-v4',
      visibilityRecoveries: 0,
      rescueInputRecoveries: 0,
      blitzHudUpdates: 0,
      staleReplayOverlaysCleared: 0,
      lastVisibleEnemyCount: 0,
    };
    window.__sdrStabilityV4Debug = debug;

    const companionCanBeRescued = () => {
      const raid = state.raid;
      const companion = raid?.companion;
      const player = raid?.player;
      return Boolean(
        state.mode === 'raid' &&
        !state.overlay &&
        companion?.downed &&
        !companion.dead &&
        player &&
        distance2D(companion.x, companion.z, player.x, player.z) <= RESCUE_RANGE
      );
    };

    const setRescueHeld = (held) => {
      if (!state.input) return;
      if (held && companionCanBeRescued() && !state.input.interactHeld) {
        state.input.interactHeld = true;
        debug.rescueInputRecoveries += 1;
      } else if (!held) {
        state.input.interactHeld = false;
      }
    };

    window.addEventListener('keydown', (event) => {
      const isInteract = event.code === 'KeyE' || event.key?.toLowerCase?.() === 'e';
      if (isInteract) setRescueHeld(true);
    }, true);

    window.addEventListener('keyup', (event) => {
      const isInteract = event.code === 'KeyE' || event.key?.toLowerCase?.() === 'e';
      if (isInteract) setRescueHeld(false);
    }, true);

    document.addEventListener('pointerdown', (event) => {
      const button = event.target?.closest?.('[data-control-action="interact"]');
      if (button) setRescueHeld(true);
    }, true);

    const releasePointerRescue = (event) => {
      const button = event.target?.closest?.('[data-control-action="interact"]');
      if (button) setRescueHeld(false);
    };
    document.addEventListener('pointerup', releasePointerRescue, true);
    document.addEventListener('pointercancel', releasePointerRescue, true);

    const hud = document.createElement('div');
    hud.id = 'blitzStatusHud';
    hud.className = 'hidden';
    hud.setAttribute('aria-live', 'polite');
    hud.innerHTML = '<strong></strong><span></span><em></em>';
    document.body.appendChild(hud);

    const style = document.createElement('style');
    style.textContent = `
      #blitzStatusHud {
        position: fixed;
        z-index: 52;
        top: 72px;
        left: 50%;
        transform: translateX(-50%);
        display: grid;
        grid-template-columns: auto auto auto;
        align-items: center;
        gap: 10px;
        max-width: min(760px, calc(100vw - 24px));
        padding: 7px 12px;
        border: 1px solid rgba(255, 185, 86, 0.48);
        border-radius: 8px;
        background: rgba(17, 18, 22, 0.78);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
        color: #f7f1e5;
        font: 600 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        pointer-events: none;
        backdrop-filter: blur(5px);
      }
      #blitzStatusHud.hidden { display: none; }
      #blitzStatusHud strong { color: #ffbd66; letter-spacing: 0.04em; }
      #blitzStatusHud span { color: #ffffff; white-space: nowrap; }
      #blitzStatusHud em { color: #cfd6df; font-style: normal; white-space: nowrap; }
      @media (max-width: 720px) {
        #blitzStatusHud {
          top: 60px;
          grid-template-columns: 1fr;
          gap: 3px;
          width: min(360px, calc(100vw - 20px));
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);

    const formatTime = (seconds) => {
      const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
      const mins = Math.floor(safe / 60);
      const secs = safe % 60;
      return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    let lastHudUpdate = 0;
    let lastHudKey = '';
    const updateBlitzHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudUpdate < HUD_INTERVAL) return;
      lastHudUpdate = now;

      const raid = state.raid;
      const visible = state.mode === 'raid' && raid?.modeId === 'blitz';
      hud.classList.toggle('hidden', !visible);
      if (!visible) {
        lastHudKey = '';
        return;
      }

      const search = raid.objectives?.find((entry) => entry.id === 'search');
      const kill = raid.objectives?.find((entry) => entry.id === 'kill');
      const taskReady = Boolean(raid.tasksComplete);
      const switchReady = Boolean(raid.extractions?.some((zone) => zone.kind === 'switch' && zone.active !== false));
      const timeText = formatTime(raid.timeLeft);
      const objectiveText = `搜索 ${search?.progress ?? 0}/${search?.target ?? 3} · 清敌 ${kill?.progress ?? 0}/${kill?.target ?? 6}`;
      const exitText = taskReady
        ? '任务撤离已解锁'
        : switchReady
          ? '任务撤离锁定 · 可寻找拉闸点'
          : '任务撤离锁定';
      const key = `${timeText}|${objectiveText}|${exitText}`;
      if (key === lastHudKey) return;
      lastHudKey = key;

      hud.querySelector('strong').textContent = `极速突袭 ${timeText}`;
      hud.querySelector('span').textContent = objectiveText;
      hud.querySelector('em').textContent = exitText;
      debug.blitzHudUpdates += 1;
    };

    const syncHudBeforeStability = syncHud;
    syncHud = function syncHudWithStabilityV4(...args) {
      const result = syncHudBeforeStability.apply(this, args);
      const raid = state.raid;
      const companion = raid?.companion;
      const player = raid?.player;

      if (state.mode === 'raid' && companion?.downed && !companion.dead && player && refs?.interactionPrompt) {
        const distance = distance2D(companion.x, companion.z, player.x, player.z);
        const progress = Math.max(0, companion.reviveProgress ?? 0);
        refs.interactionPrompt.textContent = distance <= RESCUE_RANGE
          ? (typeof L === 'function'
              ? L(`克隆倒地：按住 E 救援 ${Math.min(progress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`, `Clone down: hold E to revive ${Math.min(progress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`)
              : `Clone down: hold E to revive ${Math.min(progress, REVIVE_TIME).toFixed(1)} / ${REVIVE_TIME}s`)
          : (typeof L === 'function'
              ? L(`克隆倒地：进入 ${RESCUE_RANGE.toFixed(1)} 米范围后按住 E 救援`, `Clone down: move within ${RESCUE_RANGE.toFixed(1)} m and hold E to revive`)
              : `Clone down: move within ${RESCUE_RANGE.toFixed(1)} m and hold E to revive`);
      }

      updateBlitzHud();
      return result;
    };

    const recoverEnemyVisibility = () => {
      const raid = state.raid;
      if (state.mode !== 'raid' || !raid?.enemies) return;
      let livingVisible = 0;
      for (const enemy of raid.enemies) {
        if (!enemy || enemy.dead || enemy.despawned) continue;
        const root = enemy.visual?.root;
        if (!root || root.isDisposed?.()) continue;
        if (root.isEnabled?.() === false) {
          root.setEnabled?.(true);
          debug.visibilityRecoveries += 1;
        }
        if (root.isEnabled?.() !== false) livingVisible += 1;
      }
      debug.lastVisibleEnemyCount = livingVisible;
    };

    const cleanupReplayOverlay = () => {
      const overlay = document.getElementById('deathReplayOverlay');
      if (!overlay || window.__sdrReplayDebug?.active) return;
      if (state.mode !== 'raid' && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        debug.staleReplayOverlaysCleared += 1;
      }
    };

    window.setInterval(() => {
      recoverEnemyVisibility();
      updateBlitzHud();
      cleanupReplayOverlay();
    }, VISIBILITY_INTERVAL);

    recoverEnemyVisibility();
    updateBlitzHud(true);
  };

  boot();
})();
