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

    // Keep the native canvas resolution. Performance comes from distance
    // culling and AI budgeting, so the scene stays sharp on desktop screens.
    engine.adaptToDeviceRatio = false;
    engine.setHardwareScalingLevel(1);
    engine.resize();

    const originalUpdateEnemies = updateEnemies;
    updateEnemies = function updateEnemiesWithDistanceBudget(dt) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || raid.enemies.length <= 24) return originalUpdateEnemies(dt);
      raid.aiBudgetFrame = (raid.aiBudgetFrame ?? 0) + 1;
      const allEnemies = raid.enemies;
      const activeEnemies = allEnemies.filter((enemy, index) => {
        if (enemy.isNamelessBoss || enemy.mobilityAction || enemy.dead) return true;
        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        if (distance <= 72 || (enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0) return true;
        return (raid.aiBudgetFrame + index) % 8 === 0;
      });
      raid.enemies = activeEnemies;
      try {
        return originalUpdateEnemies(dt);
      } finally {
        raid.enemies = allEnemies;
      }
    };

    const originalAnimateRaidEntities = animateRaidEntities;
    animateRaidEntities = function animateRaidEntitiesWithDistanceBudget(dt, ...args) {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || raid.enemies.length <= 24) return originalAnimateRaidEntities(dt, ...args);
      raid.renderBudgetFrame = (raid.renderBudgetFrame ?? 0) + 1;
      const allEnemies = raid.enemies;
      const visibleEnemies = allEnemies.filter((enemy, index) => {
        if (enemy.isNamelessBoss || enemy.mobilityAction || enemy.dead) return true;
        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        if (distance <= 96) return true;
        return (raid.renderBudgetFrame + index) % 8 === 0;
      });
      raid.enemies = visibleEnemies;
      try {
        return originalAnimateRaidEntities(dt, ...args);
      } finally {
        raid.enemies = allEnemies;

        // The previous animation pass only sees the active subset. Explicitly
        // disable every omitted root; otherwise distant models remain enabled
        // forever and the distance budget increases the render cost.
        const activeRoots = new Set(visibleEnemies.map((enemy) => enemy.visual?.root).filter(Boolean));
        for (const enemy of allEnemies) {
          const root = enemy.visual?.root;
          if (root && !activeRoots.has(root)) root.setEnabled(false);
        }
      }
    };
  };

  boot();
})();
