(() => {
  'use strict';

  const boot = () => {
    if (window.__sdrVisualOverhaulApplied) return;
    if (
      typeof BABYLON === 'undefined' ||
      typeof scene === 'undefined' ||
      !scene ||
      typeof createEnemyVisual !== 'function'
    ) {
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrVisualOverhaulApplied = true;

    const makeMat = (name, diffuse, emissive = '#000000', spec = 0.08) => {
      const mat = new BABYLON.StandardMaterial(name, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(diffuse);
      mat.emissiveColor = BABYLON.Color3.FromHexString(emissive).scale(0.12);
      mat.specularColor = new BABYLON.Color3(spec, spec, spec);
      mat.alpha = 1;
      mat.backFaceCulling = true;
      if (BABYLON.Material?.MATERIAL_OPAQUE !== undefined) {
        mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      }
      return mat;
    };

    const mats = {
      friendlyCloth: makeMat('overhaul-friendly-cloth', '#5c6155', '#181b18'),
      friendlyArmor: makeMat('overhaul-friendly-armor', '#343d37', '#141815'),
      friendlyGear: makeMat('overhaul-friendly-gear', '#2c3331', '#101312'),
      enemyCloth: makeMat('overhaul-enemy-cloth', '#2b2e31', '#111214'),
      enemyArmor: makeMat('overhaul-enemy-armor', '#161b1f', '#0a0c0e'),
      enemyGear: makeMat('overhaul-enemy-gear', '#34393d', '#111416'),
      enemyAccent: makeMat('overhaul-enemy-accent', '#7c2929', '#4f1111'),
      skin: makeMat('overhaul-skin', '#bd9175', '#2b1710'),
      glove: makeMat('overhaul-glove', '#171b1c', '#090b0b'),
      boot: makeMat('overhaul-boot', '#171a1b', '#090a0a'),
      metal: makeMat('overhaul-metal', '#707b7e', '#22282a', 0.18),
      lampPole: makeMat('overhaul-lamp-pole', '#394247', '#15191b', 0.16),
      lampHousing: makeMat('overhaul-lamp-housing', '#252b2e', '#0f1213', 0.14),
      lampGlow: makeMat('overhaul-lamp-glow', '#ffe1a3', '#ffcc6b', 0),
    };
    mats.lampGlow.disableLighting = true;

    const isFriendlyActor = (actor) => {
      const id = String(actor?.id ?? '');
      return id.includes('companion') || id.includes('replay-player') || id.includes('player');
    };

    const addCapsule = (name, parent, position, radius, height, material, rotation = null) => {
      const mesh = BABYLON.MeshBuilder.CreateCapsule(name, {
        radius,
        height,
        tessellation: 10,
      }, scene);
      mesh.parent = parent;
      mesh.position.copyFrom(position);
      if (rotation) mesh.rotation.copyFrom(rotation);
      mesh.material = material;
      mesh.isPickable = false;
      return mesh;
    };

    const addBox = (name, parent, position, size, material, rotation = null) => {
      const mesh = BABYLON.MeshBuilder.CreateBox(name, {
        width: size.x,
        height: size.y,
        depth: size.z,
      }, scene);
      mesh.parent = parent;
      mesh.position.copyFrom(position);
      if (rotation) mesh.rotation.copyFrom(rotation);
      mesh.material = material;
      mesh.isPickable = false;
      return mesh;
    };

    const humanizeActor = (visual) => {
      // Character-model rollback: keep the original capsule/canister silhouette
      // from createEnemyVisual and do not add human-shaped replacement meshes.
      return visual;
    };

    const previousCreateEnemyVisual = createEnemyVisual;
    createEnemyVisual = function visualOverhaulCreateEnemy(actor) {
      return humanizeActor(previousCreateEnemyVisual(actor), actor);
    };

    const decorateExistingActors = () => {
      const raid = typeof state !== 'undefined' ? state.raid : null;
      if (!raid) return;
      for (const enemy of raid.enemies ?? []) humanizeActor(enemy.visual, enemy);
      if (raid.companion) humanizeActor(raid.companion.visual, raid.companion);
    };

    const overhaulPlayerViewModel = () => {
      // Keep the original first-person view model; no added human forearms/hands.
    };

    const isStructuralMesh = (mesh) => {
      if (!mesh?.material) return false;
      if (mesh.metadata?.raycastTarget === 'obstacle') return true;
      const name = String(mesh.name ?? '').toLowerCase();
      if (name.startsWith('extract-') || name.startsWith('container-') || name.startsWith('switch-')) return false;
      return /(?:building|facade|warehouse|hangar|bunker|freight|silo|office|apartment|depot|utility|roof|wall|boundary|tower|pillar|window|awning)/.test(name);
    };

    const forceOpaqueBuildings = () => {
      let count = 0;
      for (const mesh of scene.meshes) {
        if (!isStructuralMesh(mesh)) continue;
        const mat = mesh.material;
        if (!mat) continue;
        mat.alpha = 1;
        mat.backFaceCulling = true;
        mat.disableDepthWrite = false;
        if ('useAlphaFromDiffuseTexture' in mat) mat.useAlphaFromDiffuseTexture = false;
        if ('opacityTexture' in mat) mat.opacityTexture = null;
        if (BABYLON.Material?.MATERIAL_OPAQUE !== undefined && 'transparencyMode' in mat) {
          mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
        }
        count += 1;
      }
      window.__sdrVisualOverhaulDebug.opaqueStructuralMeshes = count;
    };

    const streetlightRoots = [];
    const remodelStreetlights = () => {
      if (streetlightRoots.length) return;
      const legacyPoles = scene.meshes.filter((mesh) => String(mesh.name).startsWith('lamp-pole-'));
      const locators = legacyPoles.map((mesh) => ({ x: mesh.position.x, z: mesh.position.z }));
      if (!locators.length) return;

      for (const mesh of scene.meshes) {
        const name = String(mesh.name ?? '');
        if (name.startsWith('lamp-pole-') || (name.startsWith('lamp-') && !name.startsWith('lamp-pole-'))) {
          mesh.setEnabled(false);
        }
      }

      locators.forEach(({ x, z }, index) => {
        const root = new BABYLON.TransformNode(`industrial-streetlight-${index}`, scene);
        root.position.set(x, 0, z);
        const towardCenter = Math.atan2(-x, -z);
        root.rotation.y = towardCenter;
        streetlightRoots.push(root);

        const base = BABYLON.MeshBuilder.CreateCylinder(`industrial-lamp-base-${index}`, {
          height: 0.34, diameterTop: 0.5, diameterBottom: 0.68, tessellation: 12,
        }, scene);
        base.parent = root;
        base.position.y = 0.17;
        base.material = mats.lampPole;

        const shaft = BABYLON.MeshBuilder.CreateCylinder(`industrial-lamp-shaft-${index}`, {
          height: 7.1, diameterTop: 0.16, diameterBottom: 0.24, tessellation: 12,
        }, scene);
        shaft.parent = root;
        shaft.position.y = 3.72;
        shaft.material = mats.lampPole;

        const collar = BABYLON.MeshBuilder.CreateCylinder(`industrial-lamp-collar-${index}`, {
          height: 0.22, diameter: 0.29, tessellation: 12,
        }, scene);
        collar.parent = root;
        collar.position.set(0, 7.18, 0);
        collar.material = mats.lampHousing;

        const arm = BABYLON.MeshBuilder.CreateBox(`industrial-lamp-arm-${index}`, {
          width: 0.14, height: 0.14, depth: 1.8,
        }, scene);
        arm.parent = root;
        arm.position.set(0, 7.28, 0.83);
        arm.material = mats.lampPole;

        const brace = BABYLON.MeshBuilder.CreateBox(`industrial-lamp-brace-${index}`, {
          width: 0.08, height: 0.08, depth: 0.95,
        }, scene);
        brace.parent = root;
        brace.position.set(0, 6.95, 0.48);
        brace.rotation.x = -0.65;
        brace.material = mats.lampPole;

        const housing = BABYLON.MeshBuilder.CreateBox(`industrial-lamp-head-${index}`, {
          width: 0.72, height: 0.2, depth: 0.9,
        }, scene);
        housing.parent = root;
        housing.position.set(0, 7.22, 1.72);
        housing.rotation.x = -0.08;
        housing.material = mats.lampHousing;

        const lens = BABYLON.MeshBuilder.CreateBox(`industrial-lamp-lens-${index}`, {
          width: 0.56, height: 0.035, depth: 0.66,
        }, scene);
        lens.parent = root;
        lens.position.set(0, 7.105, 1.74);
        lens.material = mats.lampGlow;

        const worldHead = new BABYLON.Vector3(
          x + Math.sin(towardCenter) * 1.72,
          7.02,
          z + Math.cos(towardCenter) * 1.72,
        );
        if (index % 3 === 0) {
          const light = new BABYLON.PointLight(`industrial-streetlight-glow-${index}`, worldHead, scene);
          light.diffuse = BABYLON.Color3.FromHexString('#ffd58d');
          light.specular = BABYLON.Color3.FromHexString('#f6bd63');
          light.intensity = 0.22;
          light.range = 14;
        }
      });

      window.__sdrVisualOverhaulDebug.streetlightCount = streetlightRoots.length;
      window.__sdrVisualOverhaulDebug.realtimeStreetlightCount = scene.lights.filter(light => String(light.name).startsWith('industrial-streetlight-glow-')).length;
    };

    const animateBeforeMaterialGuard = typeof animateRaidEntities === 'function' ? animateRaidEntities : null;
    if (animateBeforeMaterialGuard) {
      animateRaidEntities = function animateWithSafeEmissiveMeshes(...args) {
        const raid = typeof state !== 'undefined' ? state.raid : null;
        for (const enemy of raid?.enemies ?? []) {
          const visual = enemy.visual;
          if (!visual) continue;
          visual.emissiveMeshes = (visual.emissiveMeshes ?? [visual.body])
            .filter((mesh) => mesh?.material && !mesh.isDisposed?.());
        }
        return animateBeforeMaterialGuard.apply(this, args);
      };
    }

    window.__sdrVisualOverhaulDebug = {
      version: '2026-09-19-canister-rollback-v1',
      humanActorOverhaul: false,
      playerArmsOverhaul: false,
      opaqueBuildings: true,
      streetlightOverhaul: true,
      legacyCanisterModel: true,
      opaqueStructuralMeshes: 0,
      streetlightCount: 0,
      realtimeStreetlightCount: 0,
      originalCharacterModels: true,
    };

    const initialPass = () => {
      decorateExistingActors();
      overhaulPlayerViewModel();
      forceOpaqueBuildings();
      remodelStreetlights();
    };

    initialPass();
    window.setTimeout(initialPass, 450);
  };

  boot();
})();
