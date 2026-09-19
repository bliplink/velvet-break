(() => {
  'use strict';

  const install = () => {
    if (window.__sdrFairVisionCanisterPatch) return;
    if (
      typeof BABYLON === 'undefined' ||
      typeof scene === 'undefined' ||
      !scene ||
      typeof createEnemyVisual !== 'function' ||
      typeof state === 'undefined'
    ) {
      window.setTimeout(install, 80);
      return;
    }

    window.__sdrFairVisionCanisterPatch = true;

    const material = (name, diffuse, emissive = '#000000') => {
      const mat = new BABYLON.StandardMaterial(name, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(diffuse);
      mat.emissiveColor = BABYLON.Color3.FromHexString(emissive).scale(0.12);
      mat.specularColor = new BABYLON.Color3(0.18, 0.2, 0.22);
      return mat;
    };

    const tankDark = material('tank-dark-mat', '#252d31', '#101417');
    const tankMetal = material('tank-metal-mat', '#737e81', '#20282a');
    const tankGreen = material('tank-green-mat', '#394f43', '#18251d');
    const tankBlue = material('tank-blue-mat', '#315b72', '#102b38');
    const tankRed = material('tank-red-mat', '#7a3838', '#351515');
    const gaugeFace = material('tank-gauge-face-mat', '#d5e3df', '#7fa7a0');
    const hoseMat = material('tank-hose-mat', '#111719', '#080b0c');

    const setUnpickable = (root) => {
      for (const mesh of root.getChildMeshes()) mesh.isPickable = false;
    };

    const makeTank = (prefix, {
      parent,
      position,
      scale = 1,
      accent = 'green',
      side = 1,
    }) => {
      const root = new BABYLON.TransformNode(prefix + '-root', scene);
      root.parent = parent;
      root.position.copyFrom(position);
      root.scaling.setAll(scale);

      const accentMat = accent === 'blue' ? tankBlue : accent === 'red' ? tankRed : tankGreen;

      const body = BABYLON.MeshBuilder.CreateCylinder(prefix + '-body', {
        height: 0.72,
        diameter: 0.23,
        tessellation: 16,
      }, scene);
      body.parent = root;
      body.material = tankMetal;

      const shoulder = BABYLON.MeshBuilder.CreateSphere(prefix + '-shoulder', {
        diameter: 0.225,
        segments: 12,
      }, scene);
      shoulder.parent = root;
      shoulder.position.y = 0.31;
      shoulder.scaling.y = 0.45;
      shoulder.material = tankMetal;

      const boot = BABYLON.MeshBuilder.CreateCylinder(prefix + '-boot', {
        height: 0.07,
        diameter: 0.25,
        tessellation: 16,
      }, scene);
      boot.parent = root;
      boot.position.y = -0.36;
      boot.material = tankDark;

      for (const y of [-0.22, 0.06, 0.23]) {
        const band = BABYLON.MeshBuilder.CreateTorus(prefix + '-band-' + y, {
          diameter: 0.245,
          thickness: 0.018,
          tessellation: 18,
        }, scene);
        band.parent = root;
        band.position.y = y;
        band.rotation.x = Math.PI / 2;
        band.material = y === 0.06 ? accentMat : tankDark;
      }

      const neck = BABYLON.MeshBuilder.CreateCylinder(prefix + '-neck', {
        height: 0.1,
        diameter: 0.085,
        tessellation: 12,
      }, scene);
      neck.parent = root;
      neck.position.y = 0.42;
      neck.material = tankDark;

      const valve = BABYLON.MeshBuilder.CreateCylinder(prefix + '-valve', {
        height: 0.075,
        diameter: 0.095,
        tessellation: 12,
      }, scene);
      valve.parent = root;
      valve.position.y = 0.5;
      valve.rotation.z = Math.PI / 2;
      valve.material = accentMat;

      const gauge = BABYLON.MeshBuilder.CreateCylinder(prefix + '-gauge', {
        height: 0.035,
        diameter: 0.12,
        tessellation: 16,
      }, scene);
      gauge.parent = root;
      gauge.position.set(side * 0.12, 0.46, 0.01);
      gauge.rotation.z = Math.PI / 2;
      gauge.material = tankDark;

      const gaugeDisc = BABYLON.MeshBuilder.CreateCylinder(prefix + '-gauge-face', {
        height: 0.008,
        diameter: 0.09,
        tessellation: 16,
      }, scene);
      gaugeDisc.parent = root;
      gaugeDisc.position.set(side * 0.141, 0.46, 0.01);
      gaugeDisc.rotation.z = Math.PI / 2;
      gaugeDisc.material = gaugeFace;

      const guardLeft = BABYLON.MeshBuilder.CreateBox(prefix + '-guard-left', {
        width: 0.035,
        height: 0.54,
        depth: 0.035,
      }, scene);
      guardLeft.parent = root;
      guardLeft.position.set(-0.145, -0.03, -0.03);
      guardLeft.material = tankDark;

      const guardRight = guardLeft.clone(prefix + '-guard-right');
      guardRight.parent = root;
      guardRight.position.x = 0.145;

      if (BABYLON.MeshBuilder.CreateTube) {
        const hose = BABYLON.MeshBuilder.CreateTube(prefix + '-hose', {
          path: [
            new BABYLON.Vector3(side * 0.08, 0.47, 0),
            new BABYLON.Vector3(side * 0.22, 0.36, 0.04),
            new BABYLON.Vector3(side * 0.24, 0.08, 0.09),
            new BABYLON.Vector3(side * 0.14, -0.13, 0.12),
          ],
          radius: 0.018,
          tessellation: 8,
          cap: BABYLON.Mesh.CAP_ALL,
        }, scene);
        hose.parent = root;
        hose.material = hoseMat;
      }

      setUnpickable(root);
      return root;
    };

    const decorateActor = (visual, actor) => {
      if (!visual?.root || visual.__tankRemodeled) return visual;
      visual.__tankRemodeled = true;

      const isCompanion = String(actor?.id ?? '').includes('companion');
      const bruiser = actor?.type === 'bruiser';
      const accent = isCompanion ? 'blue' : (bruiser ? 'red' : 'green');
      const y = bruiser ? 1.34 : 1.2;
      const z = bruiser ? -0.57 : -0.52;

      const first = makeTank('actor-tank-' + actor.id + '-a', {
        parent: visual.root,
        position: new BABYLON.Vector3(bruiser ? -0.2 : -0.18, y, z),
        scale: bruiser ? 1.12 : 0.96,
        accent,
        side: -1,
      });

      const tanks = [first];
      if (bruiser || isCompanion) {
        tanks.push(makeTank('actor-tank-' + actor.id + '-b', {
          parent: visual.root,
          position: new BABYLON.Vector3(bruiser ? 0.2 : 0.18, y, z),
          scale: bruiser ? 1.12 : 0.96,
          accent,
          side: 1,
        }));
      }

      visual.tankMeshes = tanks;
      return visual;
    };

    const baseCreateEnemyVisual = createEnemyVisual;
    createEnemyVisual = function patchedCreateEnemyVisual(actor) {
      return decorateActor(baseCreateEnemyVisual(actor), actor);
    };

    const decorateExistingActors = () => {
      const raid = state.raid;
      if (!raid) return;
      for (const enemy of raid.enemies ?? []) decorateActor(enemy.visual, enemy);
      if (raid.companion) decorateActor(raid.companion.visual, raid.companion);
    };

    const removeWallReveal = () => {
      const raid = state.raid;
      if (!raid) return;
      for (const enemy of raid.enemies ?? []) {
        const visual = enemy.visual;
        if (!visual) continue;

        if (visual.revealMaterial) visual.revealMaterial.alpha = 0;
        if (visual.classLabelMaterial) visual.classLabelMaterial.alpha = 0;
        for (const mesh of visual.revealMeshes ?? []) {
          if (mesh?.setEnabled) mesh.setEnabled(false);
        }

        const scanned = typeof isEnemyActivelyReconRevealed === 'function'
          ? isEnemyActivelyReconRevealed(enemy, raid)
          : (enemy.revealedTimer ?? 0) > 0.01;

        let clearSight = false;
        if (scanned && !enemy.dead && typeof lineOfSightBlocked === 'function') {
          clearSight = !lineOfSightBlocked(
            raid.player.x,
            raid.player.z,
            enemy.x,
            enemy.z,
          );
        }

        for (const mesh of visual.overlayMeshes ?? []) {
          if (!mesh) continue;
          mesh.renderOverlay = clearSight;
          mesh.overlayColor = BABYLON.Color3.FromHexString('#7ad7df');
          mesh.overlayAlpha = clearSight ? 0.12 : 0;
        }
      }
    };

    if (typeof syncEnemyRevealOverlays === 'function') {
      syncEnemyRevealOverlays = function fairReconReveal() {
        removeWallReveal();
      };
    }

    const decoratePlayerUtility = () => {
      const smokeBody = scene.getMeshByName('utility-smoke-body');
      if (!smokeBody || smokeBody.metadata?.tankRemodeled) return;
      smokeBody.metadata = { ...(smokeBody.metadata ?? {}), tankRemodeled: true };

      const root = smokeBody.parent;
      if (!root) return;

      const collar = BABYLON.MeshBuilder.CreateTorus('utility-smoke-remodel-collar', {
        diameter: 0.15,
        thickness: 0.012,
        tessellation: 16,
      }, scene);
      collar.parent = root;
      collar.position.y = 0.135;
      collar.rotation.x = Math.PI / 2;
      collar.material = tankDark;
      collar.isPickable = false;

      const regulator = BABYLON.MeshBuilder.CreateBox('utility-smoke-remodel-regulator', {
        width: 0.075,
        height: 0.055,
        depth: 0.07,
      }, scene);
      regulator.parent = root;
      regulator.position.set(-0.075, 0.18, 0);
      regulator.material = tankDark;
      regulator.isPickable = false;

      const gauge = BABYLON.MeshBuilder.CreateCylinder('utility-smoke-remodel-gauge', {
        height: 0.018,
        diameter: 0.075,
        tessellation: 14,
      }, scene);
      gauge.parent = root;
      gauge.position.set(-0.12, 0.2, 0);
      gauge.rotation.z = Math.PI / 2;
      gauge.material = gaugeFace;
      gauge.isPickable = false;
    };

    const tick = () => {
      decorateExistingActors();
      removeWallReveal();
      decoratePlayerUtility();
      window.setTimeout(tick, 250);
    };

    tick();

    window.__sdrFairVisionCanisterDebug = {
      version: '2026-09-19b',
      wallRevealDisabled: true,
      opaqueBuildings: true,
      actorTankRemodel: true,
      playerUtilityTankRemodel: true,
    };
  };

  install();
})();
