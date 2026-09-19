(() => {
  if (window.__sdrAiJumpWaiting || window.__sdrAiJumpApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof updateEnemies === 'undefined' ||
      typeof beginMobilityAction === 'undefined' ||
      typeof distance2D === 'undefined' ||
      typeof normalize2D === 'undefined'
    ) {
      window.__sdrAiJumpWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrAiJumpWaiting = false;
    if (window.__sdrAiJumpApplied) return;
    window.__sdrAiJumpApplied = true;

    const originalUpdateEnemies = updateEnemies;
    updateEnemies = function updateEnemiesWithReliableJumps(dt) {
      const result = originalUpdateEnemies(dt);
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player) return result;

      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.despawned || enemy.isRangeTarget || enemy.mobilityAction || enemy.isProne) continue;
        enemy.jumpDecisionTimer = Math.max(0, (enemy.jumpDecisionTimer ?? (0.8 + Math.random() * 1.8)) - dt);
        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        const engaged = (enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0;
        const recentlyShot = (player.fireCooldown ?? 0) > 0.04 && distance < 48;
        if (!engaged || distance < 5 || distance > 48 || enemy.jumpDecisionTimer > 0 || (!recentlyShot && Math.random() > 0.42)) continue;

        const toward = normalize2D(player.x - enemy.x, player.z - enemy.z);
        const side = enemy.strafeDirection ?? 1;
        const direction = normalize2D(
          toward.x * 0.62 - toward.z * side * 0.78,
          toward.z * 0.62 + toward.x * side * 0.78,
        );
        const started = beginMobilityAction(enemy, 'jump', direction.x, direction.z, {
          duration: 0.62,
          speed: enemy.isNamelessBoss ? 10.8 : 8.9,
          height: enemy.isNamelessBoss ? 1.15 : 1.02,
          cooldown: enemy.isNamelessBoss ? 0.72 : 1.28,
          spinDir: side,
        });
        enemy.jumpDecisionTimer = started ? 2.6 + Math.random() * 2.2 : 0.45;
        if (started) enemy.strafeDirection = -side;
      }
      return result;
    };
  };

  boot();
})();
