(() => {
  if (window.__sdrPerformancePatchApplied || window.__sdrPerformancePatchWaiting) return;
  const boot = () => {
    if (typeof engine === 'undefined' || typeof scene === 'undefined' ||
      typeof syncHud === 'undefined' || typeof drawMinimap === 'undefined' ||
      typeof drawFullMap === 'undefined' || typeof animateRaidEntities === 'undefined' ||
      typeof notify === 'undefined' || typeof refs === 'undefined') {
      window.__sdrPerformancePatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrPerformancePatchWaiting = false;
    if (window.__sdrPerformancePatchApplied) return;
    window.__sdrPerformancePatchApplied = true;

    // Render at the browser's CSS resolution instead of multiplying it by a
    // high-DPI device ratio. This keeps text and models sharp while avoiding
    // an unnecessary 2x or 3x pixel workload on integrated GPUs.
    engine.adaptToDeviceRatio = false;
    engine.setHardwareScalingLevel(1);
    engine.resize();
    window.__sdrEngine = engine;
    window.__sdrScene = scene;
    if (typeof camera !== 'undefined') { camera.minZ = Math.max(0.06, camera.minZ ?? 0.06); camera.maxZ = Math.max(camera.maxZ ?? 0, 260); }
    for (const layer of scene.effectLayers ?? []) {
      if (layer instanceof BABYLON.GlowLayer) layer.isEnabled = false;
    }
    scene.skipPointerMovePicking = true;
    const throttle = (callback, interval) => {
      let lastRun = -Infinity;
      return function throttledRender(...args) {
        const now = performance.now();
        if (now - lastRun < interval) return;
        lastRun = now;
        return callback.apply(this, args);
      };
    };
    syncHud = throttle(syncHud, 100);
    drawMinimap = throttle(drawMinimap, 180);
    drawFullMap = throttle(drawFullMap, 180);

    const notifyBeforeLimit = notify;
    notify = function notifyWithoutScreenFlood(message, type) {
      notifyBeforeLimit(message, type);
      const notices = refs.notificationHost?.querySelectorAll('.notification') ?? [];
      for (let index = 0; index < notices.length - 3; index++) notices[index].remove();
    };

    const animateBeforeLod = animateRaidEntities;
    animateRaidEntities = function animateWithEnemyDetailLod(...args) {
      const result = animateBeforeLod.apply(this, args);
      const raid = state.raid;
      if (!raid?.player) return result;

      for (const enemy of raid.enemies) {
        const visual = enemy.visual;
        if (!visual?.root || enemy.despawned) continue;

        // Never cull the whole enemy. Keep the core silhouette visible at every
        // gameplay distance and only trim secondary detail meshes far away.
        if (!visual.root.isEnabled()) visual.root.setEnabled(true);

        const dx = enemy.x - raid.player.x;
        const dz = enemy.z - raid.player.z;
        const distanceSq = dx * dx + dz * dz;
        const farDetail = distanceSq > 105 * 105;
        const veryFarDetail = distanceSq > 145 * 145;

        if (visual.__detailLodFar !== farDetail) {
          visual.__detailLodFar = farDetail;
          for (const mesh of visual.humanDetailMeshes ?? []) {
            if (mesh && mesh !== visual.hitbox) mesh.setEnabled(!farDetail);
          }
          for (const tankRoot of visual.tankMeshes ?? []) {
            tankRoot?.setEnabled?.(!veryFarDetail);
          }
        }

        if (visual.classLabel) {
          visual.classLabel.setEnabled(!farDetail && !enemy.dead);
        }

        // Keep hitboxes active for gameplay even when cosmetic detail is reduced.
        visual.hitbox?.setEnabled?.(!enemy.dead && !enemy.despawned);
      }
      return result;
    };
  };
  boot();
})();
