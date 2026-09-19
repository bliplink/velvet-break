(() => {
  'use strict';

  const install = () => {
    if (window.__sdrRemaster20260919) return;
    if (
      typeof BABYLON === 'undefined' ||
      typeof scene === 'undefined' ||
      !scene ||
      typeof makeMaterial !== 'function' ||
      typeof createEnemyVisual !== 'function'
    ) {
      window.setTimeout(install, 80);
      return;
    }

    window.__sdrRemaster20260919 = true;

    const metalDark = makeMaterial('remaster-metal-dark', '#39454a', '#141b1e');
    const metalMid = makeMaterial('remaster-metal-mid', '#66777c', '#252f33');
    const armorPlate = makeMaterial('remaster-armor-plate', '#56666a', '#20292c');
    const softGear = makeMaterial('remaster-soft-gear', '#39423f', '#151b19');
    const warmAccent = makeMaterial('remaster-warm-accent', '#a67855', '#3b271b');
    const coolAccent = makeMaterial('remaster-cool-accent', '#6c9ca4', '#17363b');
    const trimMaterial = makeMaterial('remaster-building-trim', '#4f5e61', '#1c2527');
    const roofMaterial = makeMaterial('remaster-roof-cap', '#303a3d', '#111719');

    [metalDark, metalMid, armorPlate, softGear, warmAccent, coolAccent, trimMaterial, roofMaterial].forEach((material) => {
      if (!material) return;
      material.specularColor = new BABYLON.Color3(0.12, 0.13, 0.14);
    });

    const safeParent = (mesh, parent, position) => {
      mesh.parent = parent;
      mesh.position = position;
      mesh.isPickable = false;
      return mesh;
    };

    const remasterEnemyVisual = (visual, enemy) => {
      if (!visual?.root || visual.__remastered) return visual;
      visual.__remastered = true;

      const bruiser = enemy.type === 'bruiser' || enemy.isNamelessBoss;
      const scale = bruiser ? 1.06 : 1;

      if (visual.body) {
        visual.body.scaling.x *= bruiser ? 1.04 : 1.02;
        visual.body.scaling.z *= 0.96;
      }
      if (visual.chestRig) {
        visual.chestRig.scaling.x *= 1.04;
        visual.chestRig.scaling.y *= 0.92;
        visual.chestRig.scaling.z *= 0.9;
        visual.chestRig.position.z += 0.015;
      }
      if (visual.helmet) {
        visual.helmet.scaling.x *= 1.04;
        visual.helmet.scaling.y *= 0.92;
        visual.helmet.scaling.z *= 1.06;
      }
      if (visual.backpack) {
        visual.backpack.scaling.x *= 0.94;
        visual.backpack.scaling.y *= 1.04;
        visual.backpack.scaling.z *= 0.9;
        visual.backpack.position.z -= 0.025;
      }
      if (visual.leftArm) visual.leftArm.scaling.y *= 1.03;
      if (visual.rightArm) visual.rightArm.scaling.y *= 1.03;
      if (visual.leftLeg) visual.leftLeg.scaling.x *= 1.08;
      if (visual.rightLeg) visual.rightLeg.scaling.x *= 1.08;
      if (visual.gun) {
        visual.gun.scaling.z *= 1.08;
        visual.gun.scaling.y *= 0.92;
      }

      const plate = safeParent(
        BABYLON.MeshBuilder.CreateBox(`remaster-chest-plate-${enemy.id}`, {
          width: (bruiser ? 0.82 : 0.7) * scale,
          height: bruiser ? 0.4 : 0.34,
          depth: 0.075,
        }, scene),
        visual.root,
        new BABYLON.Vector3(0, bruiser ? 1.42 : 1.26, 0.39),
      );
      plate.material = enemy.isNamelessBoss ? metalDark : armorPlate;

      const belt = safeParent(
        BABYLON.MeshBuilder.CreateBox(`remaster-belt-${enemy.id}`, {
          width: bruiser ? 0.78 : 0.68,
          height: 0.11,
          depth: 0.42,
        }, scene),
        visual.root,
        new BABYLON.Vector3(0, bruiser ? 0.92 : 0.82, 0.02),
      );
      belt.material = softGear;

      const barrel = safeParent(
        BABYLON.MeshBuilder.CreateCylinder(`remaster-gun-barrel-${enemy.id}`, {
          height: bruiser ? 0.52 : 0.46,
          diameter: bruiser ? 0.07 : 0.055,
          tessellation: 8,
        }, scene),
        visual.root,
        new BABYLON.Vector3(0.18, bruiser ? 1.36 : 1.22, 0.99),
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.material = metalDark;

      if (enemy.isNamelessBoss) {
        const collar = safeParent(
          BABYLON.MeshBuilder.CreateTorus(`remaster-boss-collar-${enemy.id}`, {
            diameter: 0.72,
            thickness: 0.08,
            tessellation: 14,
          }, scene),
          visual.root,
          new BABYLON.Vector3(0, 1.73, 0),
        );
        collar.rotation.x = Math.PI / 2;
        collar.material = warmAccent;
      }

      visual.remasterMeshes = [plate, belt, barrel];
      return visual;
    };

    const originalCreateEnemyVisual = createEnemyVisual;
    createEnemyVisual = function remasteredCreateEnemyVisual(enemy) {
      return remasterEnemyVisual(originalCreateEnemyVisual(enemy), enemy);
    };

    const remasterContainerVisual = (visual, container) => {
      if (!visual?.root || visual.__remastered) return visual;
      visual.__remastered = true;
      if (visual.base) {
        visual.base.scaling.x *= 1.02;
        visual.base.scaling.z *= 0.97;
      }
      if (visual.lid) visual.lid.scaling.z *= 0.96;
      [-0.42, 0.42].forEach((x, index) => {
        const latch = safeParent(
          BABYLON.MeshBuilder.CreateBox(`remaster-container-latch-${container.id}-${index}`, {
            width: 0.18,
            height: 0.22,
            depth: 0.07,
          }, scene),
          visual.root,
          new BABYLON.Vector3(x, 0.86, 0.62),
        );
        latch.material = metalDark;
      });
      const handle = safeParent(
        BABYLON.MeshBuilder.CreateBox(`remaster-container-handle-${container.id}`, {
          width: 0.54,
          height: 0.08,
          depth: 0.1,
        }, scene),
        visual.root,
        new BABYLON.Vector3(0, 0.62, 0.66),
      );
      handle.material = metalMid;
      return visual;
    };

    const originalCreateContainerVisual = createContainerVisual;
    createContainerVisual = function remasteredCreateContainerVisual(container) {
      return remasterContainerVisual(originalCreateContainerVisual(container), container);
    };

    const remasterExtractionVisual = (visual, zone) => {
      if (!visual?.root || visual.__remastered) return visual;
      visual.__remastered = true;
      if (visual.gateLeft) visual.gateLeft.scaling.z *= 0.82;
      if (visual.gateRight) visual.gateRight.scaling.z *= 0.82;
      if (visual.gateBeam) visual.gateBeam.scaling.y *= 0.82;
      const signal = safeParent(
        BABYLON.MeshBuilder.CreateBox(`remaster-extract-signal-${zone.id}`, {
          width: 1.8,
          height: 0.16,
          depth: 0.22,
        }, scene),
        visual.root,
        new BABYLON.Vector3(0, 3.55, 0),
      );
      signal.material = coolAccent;
      return visual;
    };

    const originalCreateExtractionVisual = createExtractionVisual;
    createExtractionVisual = function remasteredCreateExtractionVisual(zone) {
      return remasterExtractionVisual(originalCreateExtractionVisual(zone), zone);
    };

    const remasterSwitchVisual = (visual, point) => {
      if (!visual?.root || visual.__remastered) return visual;
      visual.__remastered = true;
      if (visual.consoleBody) {
        visual.consoleBody.scaling.x *= 0.94;
        visual.consoleBody.scaling.z *= 1.08;
      }
      const screen = safeParent(
        BABYLON.MeshBuilder.CreateBox(`remaster-switch-screen-${point.id}`, {
          width: 0.72,
          height: 0.4,
          depth: 0.035,
        }, scene),
        visual.root,
        new BABYLON.Vector3(-0.2, 1.75, 0.11),
      );
      screen.rotation.x = -0.16;
      screen.material = coolAccent;
      return visual;
    };

    const originalCreateSwitchVisual = createSwitchVisual;
    createSwitchVisual = function remasteredCreateSwitchVisual(point) {
      return remasterSwitchVisual(originalCreateSwitchVisual(point), point);
    };

    const remasterViewModel = () => {
      if (!viewModel?.root || viewModel.root.__remastered) return;
      viewModel.root.__remastered = true;

      const handguard = safeParent(
        BABYLON.MeshBuilder.CreateBox('remaster-weapon-handguard', {
          width: 0.2,
          height: 0.14,
          depth: 0.46,
        }, scene),
        viewModel.root,
        new BABYLON.Vector3(0.03, -0.015, 0.72),
      );
      handguard.material = metalMid;

      const magazine = safeParent(
        BABYLON.MeshBuilder.CreateBox('remaster-weapon-magazine', {
          width: 0.13,
          height: 0.3,
          depth: 0.22,
        }, scene),
        viewModel.root,
        new BABYLON.Vector3(0.03, -0.24, 0.32),
      );
      magazine.rotation.x = -0.16;
      magazine.material = metalDark;

      const foregrip = safeParent(
        BABYLON.MeshBuilder.CreateBox('remaster-weapon-foregrip', {
          width: 0.09,
          height: 0.24,
          depth: 0.1,
        }, scene),
        viewModel.root,
        new BABYLON.Vector3(0.03, -0.16, 0.72),
      );
      foregrip.rotation.x = -0.12;
      foregrip.material = softGear;

      const rail = safeParent(
        BABYLON.MeshBuilder.CreateBox('remaster-weapon-rail', {
          width: 0.13,
          height: 0.025,
          depth: 0.64,
        }, scene),
        viewModel.root,
        new BABYLON.Vector3(0.01, 0.12, 0.42),
      );
      rail.material = metalDark;
    };

    const remasterEnvironment = () => {
      for (const mesh of scene.meshes) {
        const name = mesh.name ?? '';
        if (
          /^(boundary-|obstacle-|roof-|window-|door-|wide-door-|ladder-|stair-|lamp-|tower-|fence-)/.test(name) &&
          mesh.material &&
          !mesh.metadata?.remasterTint
        ) {
          mesh.metadata = { ...(mesh.metadata ?? {}), remasterTint: true };
          if (mesh.material.diffuseColor) mesh.material.diffuseColor = mesh.material.diffuseColor.scale(0.96);
          if (mesh.material.emissiveColor) mesh.material.emissiveColor = mesh.material.emissiveColor.scale(0.9);
          mesh.material.specularColor = new BABYLON.Color3(0.09, 0.1, 0.11);
        }
      }

      if (!Array.isArray(obstacleDefs)) return;
      let detailIndex = 0;
      for (const obstacle of obstacleDefs) {
        if (!obstacle || obstacle.h < 3.2 || obstacle.w < 4 || obstacle.d < 4) continue;
        if (detailIndex > 46) break;
        detailIndex += 1;

        const roofCap = BABYLON.MeshBuilder.CreateBox(`remaster-roof-cap-${detailIndex}`, {
          width: obstacle.w + 0.12,
          height: 0.09,
          depth: obstacle.d + 0.12,
        }, scene);
        roofCap.position = new BABYLON.Vector3(obstacle.x, obstacle.h + 0.045, obstacle.z);
        roofCap.material = roofMaterial;
        roofCap.isPickable = false;

        const facade = BABYLON.MeshBuilder.CreateBox(`remaster-facade-band-${detailIndex}`, {
          width: Math.max(1.4, obstacle.w * 0.42),
          height: 0.14,
          depth: 0.08,
        }, scene);
        facade.position = new BABYLON.Vector3(obstacle.x, obstacle.h * 0.68, obstacle.z + obstacle.d / 2 + 0.045);
        facade.material = trimMaterial;
        facade.isPickable = false;
      }
    };

    if (typeof syncEnemyRevealOverlays === 'function') {
      syncEnemyRevealOverlays = function remasteredReconOverlay() {
        const raid = state.raid;
        if (!raid) return;
        for (const enemy of raid.enemies) {
          if (!enemy.visual) continue;
          const scanned = typeof isEnemyActivelyReconRevealed === 'function'
            ? isEnemyActivelyReconRevealed(enemy, raid)
            : (enemy.revealedTimer ?? 0) > 0.01;
          const visible = scanned && !enemy.dead && !lineOfSightBlocked(
            raid.player.x,
            raid.player.z,
            enemy.x,
            enemy.z,
          );
          for (const mesh of enemy.visual.overlayMeshes ?? []) {
            if (!mesh) continue;
            mesh.renderOverlay = visible;
            mesh.overlayColor = BABYLON.Color3.FromHexString('#6bc8d2');
            mesh.overlayAlpha = visible ? 0.14 : 0;
          }
          if (enemy.visual.revealMaterial) enemy.visual.revealMaterial.alpha = 0;
          if (enemy.visual.classLabelMaterial) enemy.visual.classLabelMaterial.alpha = 0;
          for (const mesh of enemy.visual.revealMeshes ?? []) {
            mesh.setEnabled(false);
          }
        }
      };
    }

    if (typeof getOperatorDefs === 'function') {
      const originalGetOperatorDefs = getOperatorDefs;
      getOperatorDefs = function remasteredOperatorDefs() {
        const defs = originalGetOperatorDefs();
        const recon = defs?.recon;
        if (recon) {
          recon.skillNameZh = '战术扫描';
          recon.skillNameEn = 'Tactical Scan';
          recon.skillTextZh = '锁定一片区域 20 秒：敌人持续标记在战术地图；只有视线无遮挡时才显示轻微识别描边，不再穿墙显示实体。';
          recon.skillTextEn = 'Locks a sector for 20s. Enemies stay marked on the tactical map; only targets in clear line of sight receive a subtle identification outline, with no wall-through silhouettes.';
        }
        return defs;
      };
    }

    const originalSyncPlayerCamera = typeof syncPlayerCamera === 'function' ? syncPlayerCamera : null;
    if (originalSyncPlayerCamera) {
      syncPlayerCamera = function remasteredPerspective(...args) {
        const result = originalSyncPlayerCamera(...args);
        if (camera) {
          camera.minZ = 0.07;
          camera.maxZ = Math.max(camera.maxZ ?? 300, 320);
        }
        return result;
      };
    }

    remasterViewModel();
    remasterEnvironment();
    for (const enemy of state.raid?.enemies ?? []) remasterEnemyVisual(enemy.visual, enemy);
    for (const container of state.raid?.containers ?? []) remasterContainerVisual(container.visual, container);
    for (const zone of state.raid?.extractions ?? []) remasterExtractionVisual(zone.visual, zone);
    for (const point of state.raid?.switchPoints ?? []) remasterSwitchVisual(point.visual, point);

    window.__sdrRemasterDebug = {
      version: '2026-09-19',
      wallXrayDisabled: true,
      perspectiveFov: 0.82,
    };
  };

  install();
})();
