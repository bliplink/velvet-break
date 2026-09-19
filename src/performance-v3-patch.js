(() => {
  if (window.__sdrPerformanceV3Waiting || window.__sdrPerformanceV3Applied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof engine === 'undefined' ||
      typeof scene === 'undefined' ||
      typeof spawnSmokePuff !== 'function' ||
      typeof spawnPulse !== 'function' ||
      typeof spawnTracer !== 'function' ||
      typeof spawnImpactBurst !== 'function' ||
      typeof updateEffects !== 'function' ||
      typeof disposeVisual !== 'function'
    ) {
      window.__sdrPerformanceV3Waiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrPerformanceV3Waiting = false;
    if (window.__sdrPerformanceV3Applied) return;
    window.__sdrPerformanceV3Applied = true;

    scene.skipPointerMovePicking = true;
    scene.skipPointerDownPicking = true;
    scene.skipPointerUpPicking = true;

    const debug = {
      version: '2026-09-19-fps-v3',
      baseEffectLimit: 72,
      effectLimit: 72,
      trimmedEffects: 0,
      skippedSmoke: 0,
      skippedTracers: 0,
      simplifiedImpacts: 0,
      pointerPickingDisabled: true,
      currentFps: 0,
    };
    window.__sdrPerformanceV3Debug = debug;

    let lastBudgetSample = 0;
    const updateBudget = () => {
      const now = performance.now();
      if (now - lastBudgetSample < 700) return;
      lastBudgetSample = now;
      const fps = engine.getFps?.() ?? 60;
      debug.currentFps = Math.round(fps * 10) / 10;
      debug.effectLimit = fps < 30 ? 34 : fps < 42 ? 48 : fps < 52 ? 60 : 72;
    };

    const distanceFromPlayer = (position) => {
      const player = state.raid?.player;
      if (!player || !position) return 0;
      return Math.hypot((position.x ?? player.x) - player.x, (position.z ?? player.z) - player.z);
    };

    const smokeBefore = spawnSmokePuff;
    spawnSmokePuff = function performanceSmoke(position, ...args) {
      updateBudget();
      const effects = state.raid?.effects ?? [];
      if (effects.length >= debug.effectLimit || distanceFromPlayer(position) > 62) {
        debug.skippedSmoke += 1;
        return null;
      }
      return smokeBefore.call(this, position, ...args);
    };

    const pulseBefore = spawnPulse;
    spawnPulse = function performancePulse(position, ...args) {
      updateBudget();
      const effects = state.raid?.effects ?? [];
      if (effects.length >= debug.effectLimit + 10 && distanceFromPlayer(position) > 28) {
        return null;
      }
      return pulseBefore.call(this, position, ...args);
    };

    const tracerBefore = spawnTracer;
    spawnTracer = function performanceTracer(from, to, ...args) {
      updateBudget();
      const effects = state.raid?.effects ?? [];
      if (effects.length >= debug.effectLimit && distanceFromPlayer(from) > 46) {
        debug.skippedTracers += 1;
        return null;
      }
      return tracerBefore.call(this, from, to, ...args);
    };

    const impactBefore = spawnImpactBurst;
    spawnImpactBurst = function performanceImpact(position, color, intensity = 1, flavor = 'hard') {
      updateBudget();
      const effects = state.raid?.effects ?? [];
      if (effects.length >= Math.max(28, debug.effectLimit - 8)) {
        debug.simplifiedImpacts += 1;
        return spawnPulse(position, color, 0.08 + intensity * 0.05, 0.08 + intensity * 0.03);
      }
      return impactBefore.call(this, position, color, intensity, flavor);
    };

    const updateEffectsBefore = updateEffects;
    updateEffects = function updateEffectsWithBudget(dt, ...args) {
      updateBudget();
      const effects = state.raid?.effects ?? [];
      while (effects.length > debug.effectLimit) {
        const effect = effects.shift();
        if (!effect) break;
        disposeVisual(effect.line ?? effect.mesh);
        debug.trimmedEffects += 1;
      }
      return updateEffectsBefore.call(this, dt, ...args);
    };
  };

  boot();
})();