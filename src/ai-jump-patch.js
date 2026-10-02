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
        enemy.jumpDecisionTimer = Math.max(0, (enemy.jumpDecisionTimer ?? (0.48 + Math.random() * 0.95)) - dt);
        const distance = distance2D(enemy.x, enemy.z, player.x, player.z);
        const engaged = (enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0;
        const recentlyShot = (player.fireCooldown ?? 0) > 0.04 && distance < 48;
        if (!engaged || distance < 4.5 || distance > 52 || enemy.jumpDecisionTimer > 0 || (!recentlyShot && Math.random() > 0.58)) continue;

        const toward = normalize2D(player.x - enemy.x, player.z - enemy.z);
        const side = enemy.strafeDirection ?? 1;
        const direction = normalize2D(
          toward.x * 0.52 - toward.z * side * 0.86,
          toward.z * 0.52 + toward.x * side * 0.86,
        );
        const started = beginMobilityAction(enemy, 'jump', direction.x, direction.z, {
          duration: 0.50,
          speed: enemy.isNamelessBoss ? 12.8 : 10.8,
          height: enemy.isNamelessBoss ? 1.2 : 1.08,
          cooldown: enemy.isNamelessBoss ? 0.56 : 0.85,
          spinDir: side,
        });
        enemy.jumpDecisionTimer = started ? 1.5 + Math.random() * 1.2 : 0.32;
        if (started) enemy.strafeDirection = -side;
      }
      return result;
    };
  };

  boot();
})();
