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
    if ('constantlyUpdateMeshUnderPointer' in scene) scene.constantlyUpdateMeshUnderPointer = false;

    const debug = {
      version: '2026-09-19-fps-v5',
      baseEffectLimit: 72,
      effectLimit: 72,
      trimmedEffects: 0,
      skippedSmoke: 0,
      skippedTracers: 0,
      simplifiedImpacts: 0,
      pointerPickingDisabled: true,
      currentFps: 0,
      frozenStaticMeshes: 0,
      frozenStaticMaterials: 0,
      lightGovernorMode: 'full',
      activeRealtimeStreetlights: 0,
      lightGovernorChanges: 0,
      distantAiVisualSkips: 0,
      distantAiVisualInterval: 0.12,
    };
    window.__sdrPerformanceV3Debug = debug;

    const freezeStaticWorld = () => {
      const frozenMaterials = new Set();
      let frozenMeshes = 0;
      const staticName = /^(?:obstacle-|boundary-|roof-|tower-|fence-|industrial-lamp-(?:base|shaft|collar|arm|brace|head|lens)-)/i;

      for (const mesh of scene.meshes ?? []) {
        if (!mesh || mesh.isDisposed?.()) continue;
        const name = String(mesh.name ?? '');
        const movableName = /(?:door|gate|shutter|container|extract|switch|enemy|companion|player|weapon|utility|replay)/i.test(name);
        const eligible = !movableName && (
          staticName.test(name) ||
          (mesh.metadata?.raycastTarget === 'obstacle' && /^(?:obstacle-|boundary-|roof-|tower-|fence-)/i.test(name))
        );
        if (!eligible) continue;

        try {
          mesh.freezeWorldMatrix?.();
          frozenMeshes += 1;
        } catch {}

        const mat = mesh.material;
        if (mat && !frozenMaterials.has(mat)) {
          try {
            mat.freeze?.();
            frozenMaterials.add(mat);
          } catch {}
        }
      }

      debug.frozenStaticMeshes = frozenMeshes;
      debug.frozenStaticMaterials = frozenMaterials.size;
    };

    window.setTimeout(freezeStaticWorld, 700);
    window.setTimeout(freezeStaticWorld, 2200);

    let lastBudgetSample = 0;
    const updateBudget = () => {
      const now = performance.now();
      if (now - lastBudgetSample < 700) return;
      lastBudgetSample = now;
      const fps = engine.getFps?.() ?? 60;
      debug.currentFps = Math.round(fps * 10) / 10;
      debug.effectLimit = fps < 30 ? 30 : fps < 42 ? 42 : fps < 52 ? 56 : 72;

      const lights = (scene.lights ?? [])
        .filter(light => String(light.name ?? '').startsWith('industrial-streetlight-glow-'));
      const desiredMode = fps < 40 ? 'off' : fps < 50 ? 'reduced' : 'full';
      if (desiredMode !== debug.lightGovernorMode) {
        debug.lightGovernorMode = desiredMode;
        debug.lightGovernorChanges += 1;
      }
      lights.forEach((light, index) => {
        const enabled = desiredMode === 'full'
          ? true
          : desiredMode === 'reduced'
            ? index === 0
            : false;
        light.setEnabled?.(enabled);
      });
      debug.activeRealtimeStreetlights = lights.filter(light => light.isEnabled?.() !== false).length;
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

    const animateBeforeDistanceBudget = typeof animateRaidEntities === 'function' ? animateRaidEntities : null;
    if (animateBeforeDistanceBudget) {
      let distantVisualAccumulator = 0;
      animateRaidEntities = function distanceBudgetedAnimation(dt, ...args) {
        const raid = state.raid;
        const player = raid?.player;
        if (!player || !raid?.enemies?.length) return animateBeforeDistanceBudget.call(this, dt, ...args);
        distantVisualAccumulator += dt;
        if (distantVisualAccumulator < 0.12) {
          const original = raid.enemies;
          const near = original.filter(enemy => enemy?.dead || enemy?.despawned || distanceFromPlayer(enemy) <= 48);
          if (near.length !== original.length) {
            raid.enemies = near;
            debug.distantAiVisualSkips += original.length - near.length;
            try { return animateBeforeDistanceBudget.call(this, dt, ...args); }
            finally { raid.enemies = original; }
          }
          return animateBeforeDistanceBudget.call(this, dt, ...args);
        }
        distantVisualAccumulator = 0;
        return animateBeforeDistanceBudget.call(this, dt, ...args);
      };
    }

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