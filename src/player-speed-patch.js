(() => {
  if (window.__sdrPlayerSpeedPatchApplied || window.__sdrPlayerSpeedPatchWaiting) return;

  const boot = () => {
    if (typeof getPlayerMoveSpeed === 'undefined' || typeof state === 'undefined') {
      window.__sdrPlayerSpeedPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrPlayerSpeedPatchWaiting = false;
    if (window.__sdrPlayerSpeedPatchApplied) return;
    window.__sdrPlayerSpeedPatchApplied = true;

    const originalGetPlayerMoveSpeed = getPlayerMoveSpeed;
    getPlayerMoveSpeed = function fasterPlayerMoveSpeed(player, sprinting = false) {
      return originalGetPlayerMoveSpeed(player, sprinting) * 1.4;
    };

    const renderSprintHint = () => {
      const hint = document.getElementById('tipSprint');
      if (!hint) return;
      const language = typeof getLanguage === 'function' ? getLanguage() : 'zh';
      hint.textContent = language === 'en' ? 'Hold Shift to sprint' : '按住 Shift 冲刺';
    };
    if (typeof applyStaticLanguage === 'function') {
      const originalApplyStaticLanguage = applyStaticLanguage;
      applyStaticLanguage = function applyLanguageWithSprintHint(...args) {
        const result = originalApplyStaticLanguage.apply(this, args);
        renderSprintHint();
        return result;
      };
    }
    renderSprintHint();

    if (typeof syncEnemyRevealOverlays === 'function' && typeof lineOfSightBlocked === 'function') {
      const applyEnemyVisibility = () => {
        const raid = state.raid;
        const player = raid?.player;
        const reconActive = player?.operatorId === 'recon' && (player.abilityActiveTimer ?? 0) > 0 && player.reconZone;
        if (!raid || !player) return;
        for (const enemy of raid.enemies ?? []) {
          const root = enemy.visual?.root;
          if (!root) continue;
          const revealVisible = Boolean(reconActive && !enemy.dead && (enemy.revealedTimer ?? 0) > 0.01);
          for (const mesh of enemy.visual?.revealMeshes ?? []) mesh.setEnabled(revealVisible);
          if (enemy.dead || enemy.despawned || reconActive) continue;
          const sameInterior = player.insideBuildingId && player.insideBuildingId === enemy.insideBuildingId;
          const sameRoof = player.onRoofBuildingId && player.onRoofBuildingId === enemy.onRoofBuildingId;
          const blocked = !sameInterior && !sameRoof && lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z);
          // Buildings are now fully opaque, so let normal depth occlusion hide
          // enemies instead of disabling the whole actor and causing pop-out.
          root.__sdrOccludedByCover = blocked;
          if (root.__sdrHiddenBehindCover) {
            root.__sdrHiddenBehindCover = false;
            root.setEnabled(true);
          }
        }
      };
      const originalSyncEnemyRevealOverlays = syncEnemyRevealOverlays;
      syncEnemyRevealOverlays = function hideEnemiesBehindCover(...args) {
        const result = originalSyncEnemyRevealOverlays.apply(this, args);
        applyEnemyVisibility();
        return result;
      };
      if (typeof animateRaidEntities === 'function') {
        const originalAnimateRaidEntities = animateRaidEntities;
        animateRaidEntities = function animateRaidEntitiesWithCoverVisibility(...args) {
          const result = originalAnimateRaidEntities.apply(this, args);
          applyEnemyVisibility();
          return result;
        };
      }
    }
  };

  boot();
})();
