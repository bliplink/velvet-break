(() => {
  'use strict';

  const install = () => {
    if (window.__sdrFairVisionCanisterPatch) return;
    if (
      typeof scene === 'undefined' ||
      !scene ||
      typeof state === 'undefined'
    ) {
      window.setTimeout(install, 80);
      return;
    }

    window.__sdrFairVisionCanisterPatch = true;

    const removeWallReveal = () => {
      const raid = state.raid;
      if (!raid) return;
      for (const enemy of raid.enemies ?? []) {
        const visual = enemy.visual;
        if (!visual) continue;

        if (visual.revealMaterial) visual.revealMaterial.alpha = 0;
        if (visual.classLabelMaterial) visual.classLabelMaterial.alpha = 0;
        for (const mesh of visual.revealMeshes ?? []) {
          mesh?.setEnabled?.(false);
        }

        visual.classLabel?.setEnabled?.(false);
        for (const mesh of visual.overlayMeshes ?? []) {
          if (!mesh) continue;
          mesh.renderOverlay = false;
          mesh.overlayAlpha = 0;
        }
      }
    };

    if (typeof syncEnemyRevealOverlays === 'function') {
      syncEnemyRevealOverlays = function fairReconReveal() {
        removeWallReveal();
      };
    }

    const tick = () => {
      removeWallReveal();
      window.setTimeout(tick, 300);
    };
    tick();

    window.__sdrFairVisionCanisterDebug = {
      version: '2026-09-19-original-model-v1',
      wallRevealDisabled: true,
      opaqueBuildings: true,
      actorTankRemodel: false,
      playerUtilityTankRemodel: false,
      originalCharacterModels: true,
    };
  };

  install();
})();