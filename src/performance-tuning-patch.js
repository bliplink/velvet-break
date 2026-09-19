(() => {
  if (window.__sdrPerformanceTuningWaiting || window.__sdrPerformanceTuningApplied) return;

  const boot = () => {
    if (
      typeof engine === 'undefined' ||
      typeof state === 'undefined' ||
      typeof updateEnemies === 'undefined' ||
      typeof animateRaidEntities === 'undefined' ||
      typeof distance2D === 'undefined'
    ) {
      window.__sdrPerformanceTuningWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }

    window.__sdrPerformanceTuningWaiting = false;
    if (window.__sdrPerformanceTuningApplied) return;
    window.__sdrPerformanceTuningApplied = true;

    engine.adaptToDeviceRatio = false;
    engine.setHardwareScalingLevel(1);
    engine.resize();

    let scalingLevel = 1;
    let lowFpsSamples = 0;
    let highFpsSamples = 0;
    let lastScaleCheck = performance.now();

    const tuneResolution = () => {
      const now = performance.now();
      if (now - lastScaleCheck < 1800) return;
      lastScaleCheck = now;

      const fps = engine.getFps?.() ?? 60;
      if (fps < 50) {
        lowFpsSamples += 1;
        highFpsSamples = 0;
      } else if (fps > 59) {
        highFpsSamples += 1;
        lowFpsSamples = 0;
      } else {
        lowFpsSamples = Math.max(0, lowFpsSamples - 1);
        highFpsSamples = Math.max(0, highFpsSamples - 1);
      }

      if (lowFpsSamples >= 2 && scalingLevel < 1.65) {
        scalingLevel = Math.min(1.65, Math.round((scalingLevel + 0.12) * 100) / 100);
        engine.setHardwareScalingLevel(scalingLevel);
        engine.resize();
        lowFpsSamples = 0;
      } else if (highFpsSamples >= 3 && scalingLevel > 1) {
        scalingLevel = Math.max(1, Math.round((scalingLevel - 0.1) * 100) / 100);
        engine.setHardwareScalingLevel(scalingLevel);
        engine.resize();
        highFpsSamples = 0;
      }

      window.__sdrPerformanceDebug.scalingLevel = scalingLevel;
      window.__sdrPerformanceDebug.fps = Math.round(fps * 10) / 10;
    };

    const originalUpdateEnemies = updateEnemies;
    updateEnemies = function updateEnemiesWithTieredBudget(dt) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || raid.enemies.length <= 18) {
        tuneResolution();
        return originalUpdateEnemies(dt);
      }

      raid.aiBudgetFrame = (raid.aiBudgetFrame ?? 0) + 1;
      const allEnemies = raid.enemies;
      const activeEnemies = allEnemies.filter((enemy, index) => {
        if (enemy.isNamelessBoss || enemy.mobilityAction || enemy.dead) return true;
        if ((enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0 || (enemy.companionAlertTimer ?? 0) > 0) return true;

        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        if (distance <= 60) return true;
        if (distance <= 100) return (raid.aiBudgetFrame + index) % 2 === 0;
        return (raid.aiBudgetFrame + index) % 5 === 0;
      });

      raid.enemies = activeEnemies;
      try {
        return originalUpdateEnemies(dt);
      } finally {
        raid.enemies = allEnemies;
        tuneResolution();
      }
    };

    const originalAnimateRaidEntities = animateRaidEntities;
    animateRaidEntities = function animateRaidEntitiesWithTieredBudget(dt, ...args) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || raid.enemies.length <= 18) return originalAnimateRaidEntities(dt, ...args);

      raid.renderBudgetFrame = (raid.renderBudgetFrame ?? 0) + 1;
      const allEnemies = raid.enemies;
      const animatedEnemies = allEnemies.filter((enemy, index) => {
        if (enemy.isNamelessBoss || enemy.mobilityAction || enemy.dead) return true;
        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        if (distance <= 70) return true;
        if (distance <= 118) return (raid.renderBudgetFrame + index) % 2 === 0;
        return (raid.renderBudgetFrame + index) % 4 === 0;
      });

      raid.enemies = animatedEnemies;
      try {
        return originalAnimateRaidEntities(dt, ...args);
      } finally {
        raid.enemies = allEnemies;

        // Omitted enemies remain visible. Only sync cheap root transforms on
        // budgeted frames; do not disable or pop the whole model.
        const animatedSet = new Set(animatedEnemies);
        for (const enemy of allEnemies) {
          if (animatedSet.has(enemy) || enemy.despawned) continue;
          const root = enemy.visual?.root;
          if (!root) continue;
          root.position.x = enemy.x;
          root.position.z = enemy.z;
          root.rotation.y = enemy.heading ?? root.rotation.y;
        }
      }
    };

    window.__sdrPerformanceDebug = {
      version: '2026-09-19-tiered-v3',
      noHardEnemyCull: true,
      tieredAI: true,
      tieredAnimation: true,
      adaptiveResolution: true,
      maxScalingLevel: 1.65,
      aiNearDistance: 60,
      animationNearDistance: 70,
      scalingLevel,
      fps: 0,
    };
  };

  boot();
})();
