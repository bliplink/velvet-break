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

    const humanizeActor = (visual, actor) => {
      if (!visual?.root || visual.__humanOverhaul) return visual;
      visual.__humanOverhaul = true;

      const friendly = isFriendlyActor(actor);
      const heavy = actor?.type === 'bruiser';
      const cloth = friendly ? mats.friendlyCloth : mats.enemyCloth;
      const armor = friendly ? mats.friendlyArmor : mats.enemyArmor;
      const gear = friendly ? mats.friendlyGear : mats.enemyGear;
      const root = visual.root;
      const tag = String(actor?.id ?? Math.random().toString(36).slice(2));

      // Retune the original primitives into a more human torso/head silhouette.
      if (visual.body) {
        visual.body.material = cloth;
        visual.body.scaling.x = heavy ? 0.93 : 0.82;
        visual.body.scaling.z = 0.72;
        visual.body.scaling.y = heavy ? 1.02 : 1.05;
        visual.body.position.y += heavy ? 0.02 : 0.04;
      }
      if (visual.chestRig) {
        visual.chestRig.material = armor;
        visual.chestRig.scaling.x = heavy ? 0.98 : 0.9;
        visual.chestRig.scaling.y = 0.88;
        visual.chestRig.scaling.z = 0.78;
        visual.chestRig.position.z = 0.12;
      }
      if (visual.head) {
        visual.head.material = mats.skin;
        visual.head.scaling.set(0.86, 1.02, 0.9);
      }
      if (visual.helmet) {
        visual.helmet.material = armor;
        visual.helmet.scaling.set(0.92, 0.66, 0.96);
      }
      if (visual.visor) {
        visual.visor.material = friendly ? mats.metal : mats.enemyAccent;
        visual.visor.scaling.set(1.05, 0.72, 0.72);
      }
      if (visual.backpack) {
        visual.backpack.material = gear;
        visual.backpack.scaling.set(0.9, 0.92, 0.78);
        visual.backpack.position.z = -0.31;
      }
      if (visual.gun) {
        visual.gun.material = mats.metal;
        visual.gun.scaling.set(0.92, 0.88, 1.05);
      }

      // Original single-piece arms/legs become upper limbs; added lower limbs make
      // elbows/knees readable without exploding the mesh count.
      const upperArmY = heavy ? 1.39 : 1.24;
      const thighY = heavy ? 0.69 : 0.62;
      for (const [mesh, side] of [[visual.leftArm, -1], [visual.rightArm, 1]]) {
        if (!mesh) continue;
        mesh.material = cloth;
        mesh.scaling.set(1.08, 0.56, 1.08);
        mesh.position.x = side * (heavy ? 0.49 : 0.43);
        mesh.position.y = upperArmY;
        mesh.position.z = 0.04;
        mesh.rotation.set(0, 0, side * -0.15);
      }
      for (const [mesh, side] of [[visual.leftLeg, -1], [visual.rightLeg, 1]]) {
        if (!mesh) continue;
        mesh.material = cloth;
        mesh.scaling.set(1.18, 0.56, 1.18);
        mesh.position.x = side * (heavy ? 0.19 : 0.17);
        mesh.position.y = thighY;
        mesh.position.z = 0;
      }

      const neck = addCapsule(
        `human-neck-${tag}`, root,
        new BABYLON.Vector3(0, heavy ? 1.88 : 1.73, 0),
        0.105, 0.25, mats.skin,
      );
      const pelvis = addBox(
        `human-pelvis-${tag}`, root,
        new BABYLON.Vector3(0, heavy ? 0.93 : 0.84, 0),
        new BABYLON.Vector3(heavy ? 0.68 : 0.6, 0.34, 0.38),
        gear,
      );

      const added = [neck, pelvis];
      for (const side of [-1, 1]) {
        const forearm = addCapsule(
          `human-forearm-${side}-${tag}`, root,
          new BABYLON.Vector3(side * (heavy ? 0.5 : 0.44), heavy ? 1.08 : 0.98, 0.19),
          heavy ? 0.11 : 0.095,
          heavy ? 0.56 : 0.5,
          cloth,
          new BABYLON.Vector3(side * 0.08, 0, side * -0.22),
        );
        const hand = addCapsule(
          `human-hand-${side}-${tag}`, root,
          new BABYLON.Vector3(side * (heavy ? 0.43 : 0.38), heavy ? 0.88 : 0.8, 0.37),
          0.09,
          0.22,
          mats.glove,
          new BABYLON.Vector3(Math.PI * 0.08, 0, 0),
        );
        const calf = addCapsule(
          `human-calf-${side}-${tag}`, root,
          new BABYLON.Vector3(side * (heavy ? 0.19 : 0.17), heavy ? 0.31 : 0.27, 0),
          heavy ? 0.12 : 0.105,
          heavy ? 0.56 : 0.5,
          cloth,
        );
        const boot = addBox(
          `human-boot-${side}-${tag}`, root,
          new BABYLON.Vector3(side * (heavy ? 0.19 : 0.17), 0.08, 0.09),
          new BABYLON.Vector3(heavy ? 0.25 : 0.22, 0.16, heavy ? 0.43 : 0.38),
          mats.boot,
        );
        added.push(forearm, hand, calf, boot);
      }

      const shoulderLeft = addBox(
        `human-shoulder-l-${tag}`, root,
        new BABYLON.Vector3(-(heavy ? 0.42 : 0.37), heavy ? 1.48 : 1.34, 0.03),
        new BABYLON.Vector3(heavy ? 0.28 : 0.24, 0.22, 0.34),
        armor,
        new BABYLON.Vector3(0, 0, -0.13),
      );
      const shoulderRight = addBox(
        `human-shoulder-r-${tag}`, root,
        new BABYLON.Vector3(heavy ? 0.42 : 0.37, heavy ? 1.48 : 1.34, 0.03),
        new BABYLON.Vector3(heavy ? 0.28 : 0.24, 0.22, 0.34),
        armor,
        new BABYLON.Vector3(0, 0, 0.13),
      );
      added.push(shoulderLeft, shoulderRight);

      if (!friendly) {
        const chestAccent = addBox(
          `human-enemy-accent-${tag}`, root,
          new BABYLON.Vector3(0, heavy ? 1.43 : 1.3, 0.355),
          new BABYLON.Vector3(heavy ? 0.34 : 0.29, 0.1, 0.025),
          mats.enemyAccent,
        );
        added.push(chestAccent);
      }

      visual.humanDetailMeshes = added;
      visual.overlayMeshes = [...(visual.overlayMeshes ?? []), ...added];
      visual.emissiveMeshes = (visual.emissiveMeshes ?? [visual.body]).filter((mesh) => mesh?.material);
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
      if (typeof viewModel === 'undefined' || !viewModel?.root || viewModel.__humanArmsOverhaul) return;
      viewModel.__humanArmsOverhaul = true;

      const root = viewModel.root;
      const sleeveMat = mats.friendlyCloth;
      const gloveMat = mats.glove;

      const rightForearm = addCapsule(
        'player-human-forearm-r', root,
        new BABYLON.Vector3(0.21, -0.28, 0.22),
        0.085, 0.48, sleeveMat,
        new BABYLON.Vector3(0.12, 0, -0.28),
      );
      const rightGlove = addBox(
        'player-human-glove-r', root,
        new BABYLON.Vector3(0.14, -0.16, 0.38),
        new BABYLON.Vector3(0.16, 0.13, 0.22),
        gloveMat,
        new BABYLON.Vector3(0, 0, -0.18),
      );
      const leftForearm = addCapsule(
        'player-human-forearm-l', root,
        new BABYLON.Vector3(-0.18, -0.19, 0.54),
        0.08, 0.42, sleeveMat,
        new BABYLON.Vector3(-0.08, 0, 0.22),
      );
      const leftGlove = addBox(
        'player-human-glove-l', root,
        new BABYLON.Vector3(-0.09, -0.08, 0.58),
        new BABYLON.Vector3(0.15, 0.12, 0.2),
        gloveMat,
        new BABYLON.Vector3(0, 0, 0.14),
      );
      for (const mesh of [rightForearm, rightGlove, leftForearm, leftGlove]) mesh.renderingGroupId = 2;
    };

    const isStructuralMesh = (mesh) => {
      if (!mesh?.material) return false;
      if (mesh.metadata?.raycastTarget === 'obstacle') return true;
      const name = String(mesh.name ?? '').toLowerCase();
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
        const light = new BABYLON.PointLight(`industrial-streetlight-glow-${index}`, worldHead, scene);
        light.diffuse = BABYLON.Color3.FromHexString('#ffd58d');
        light.specular = BABYLON.Color3.FromHexString('#f6bd63');
        light.intensity = 0.28;
        light.range = 17;
      });

      window.__sdrVisualOverhaulDebug.streetlightCount = streetlightRoots.length;
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
      version: '2026-09-19-human-v1',
      humanActorOverhaul: true,
      playerArmsOverhaul: true,
      opaqueBuildings: true,
      streetlightOverhaul: true,
      opaqueStructuralMeshes: 0,
      streetlightCount: 0,
    };

    const tick = () => {
      decorateExistingActors();
      overhaulPlayerViewModel();
      forceOpaqueBuildings();
      remodelStreetlights();
    };

    tick();
    window.setTimeout(tick, 350);
    window.setInterval(() => {
      decorateExistingActors();
      overhaulPlayerViewModel();
      forceOpaqueBuildings();
    }, 1400);
  };

  boot();
})();
