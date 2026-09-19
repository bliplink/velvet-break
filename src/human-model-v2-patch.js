(() => {
  if (window.__sdrHumanModelV2Waiting || window.__sdrHumanModelV2Applied) return;

  const boot = () => {
    if (
      typeof BABYLON === 'undefined' ||
      typeof scene === 'undefined' ||
      typeof createEnemyVisual !== 'function'
    ) {
      window.__sdrHumanModelV2Waiting = true;
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrHumanModelV2Waiting = false;
    if (window.__sdrHumanModelV2Applied) return;
    window.__sdrHumanModelV2Applied = true;

    const makeMat = (name, color, emissive = '#000000') => {
      const mat = new BABYLON.StandardMaterial(name, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(color);
      mat.emissiveColor = BABYLON.Color3.FromHexString(emissive).scale(0.08);
      mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      mat.alpha = 1;
      return mat;
    };

    const friendlyCloth = makeMat('human-v2-friendly-cloth', '#5b665d');
    const friendlyVest = makeMat('human-v2-friendly-vest', '#36423c');
    const enemyCloth = makeMat('human-v2-enemy-cloth', '#313538');
    const enemyVest = makeMat('human-v2-enemy-vest', '#1f2427');
    const supportCloth = makeMat('human-v2-support-cloth', '#52665c');
    const skin = makeMat('human-v2-skin', '#b98b70');
    const gloves = makeMat('human-v2-gloves', '#1b1f20');
    const boots = makeMat('human-v2-boots', '#151819');
    const metal = makeMat('human-v2-metal', '#687477');

    const capsule = (name, parent, pos, radius, height, mat, rot = null, scale = null) => {
      const mesh = BABYLON.MeshBuilder.CreateCapsule(name, { radius, height, tessellation: 10 }, scene);
      mesh.parent = parent;
      mesh.position.copyFrom(pos);
      if (rot) mesh.rotation.copyFrom(rot);
      if (scale) mesh.scaling.copyFrom(scale);
      mesh.material = mat;
      mesh.isPickable = false;
      return mesh;
    };

    const sphere = (name, parent, pos, diameter, mat, scale = null) => {
      const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene);
      mesh.parent = parent;
      mesh.position.copyFrom(pos);
      if (scale) mesh.scaling.copyFrom(scale);
      mesh.material = mat;
      mesh.isPickable = false;
      return mesh;
    };

    const torso = (name, parent, pos, top, bottom, height, mat) => {
      const mesh = BABYLON.MeshBuilder.CreateCylinder(name, {
        height,
        diameterTop: top,
        diameterBottom: bottom,
        tessellation: 12,
      }, scene);
      mesh.parent = parent;
      mesh.position.copyFrom(pos);
      mesh.material = mat;
      mesh.isPickable = false;
      return mesh;
    };

    const roundedPack = (name, parent, pos, mat, scale = 1) => {
      const mesh = sphere(name, parent, pos, 0.72, mat, new BABYLON.Vector3(0.82 * scale, 1.1 * scale, 0.55 * scale));
      return mesh;
    };

    const isFriendly = (actor) => {
      const id = String(actor?.id ?? '');
      return id.includes('companion') || id.includes('battlefield-ally') || id.includes('replay-player') || id.includes('player');
    };

    const hideLegacyBlocks = (visual) => {
      for (const mesh of [
        visual.body, visual.chestRig, visual.leftArm, visual.rightArm,
        visual.leftLeg, visual.rightLeg, visual.backpack
      ]) {
        if (mesh) mesh.isVisible = false;
      }
      for (const mesh of visual.humanDetailMeshes ?? []) {
        if (mesh) mesh.isVisible = false;
      }
      for (const name of ['player-human-glove-r','player-human-glove-l']) {
        const mesh = scene.getMeshByName(name);
        if (mesh) mesh.isVisible = false;
      }
    };

    const humanize = (visual, actor = {}) => {
      if (!visual?.root || visual.__humanV2Applied) return visual;
      visual.__humanV2Applied = true;
      hideLegacyBlocks(visual);

      const root = visual.root;
      const friendly = isFriendly(actor);
      const support = friendly && actor.operatorId === 'medic';
      const heavy = actor.type === 'bruiser';
      const cloth = support ? supportCloth : friendly ? friendlyCloth : enemyCloth;
      const vest = friendly ? friendlyVest : enemyVest;
      const tag = String(actor.id ?? Math.random().toString(36).slice(2));

      const parts = [];
      const yBias = heavy ? 0.08 : 0;
      const torsoMesh = torso(
        `human-v2-torso-${tag}`, root,
        new BABYLON.Vector3(0, 1.28 + yBias, 0),
        heavy ? 0.78 : 0.67,
        heavy ? 0.58 : 0.5,
        heavy ? 0.88 : 0.82,
        cloth
      );
      const vestMesh = torso(
        `human-v2-vest-${tag}`, root,
        new BABYLON.Vector3(0, 1.31 + yBias, 0.045),
        heavy ? 0.84 : 0.72,
        heavy ? 0.66 : 0.57,
        heavy ? 0.62 : 0.58,
        vest
      );
      vestMesh.scaling.z = 0.72;

      const pelvis = sphere(
        `human-v2-pelvis-${tag}`, root,
        new BABYLON.Vector3(0, 0.86 + yBias, 0),
        heavy ? 0.62 : 0.54,
        cloth,
        new BABYLON.Vector3(1, 0.72, 0.78)
      );

      const neck = capsule(
        `human-v2-neck-${tag}`, root,
        new BABYLON.Vector3(0, 1.77 + yBias, 0),
        0.09, 0.22, skin
      );

      const head = sphere(
        `human-v2-head-${tag}`, root,
        new BABYLON.Vector3(0, 1.99 + yBias, 0.01),
        heavy ? 0.39 : 0.36,
        skin,
        new BABYLON.Vector3(0.92, 1.08, 0.96)
      );

      const helmet = sphere(
        `human-v2-helmet-${tag}`, root,
        new BABYLON.Vector3(0, 2.065 + yBias, -0.005),
        heavy ? 0.44 : 0.41,
        vest,
        new BABYLON.Vector3(1.02, 0.72, 1.05)
      );

      parts.push(torsoMesh, vestMesh, pelvis, neck, head, helmet);

      for (const side of [-1, 1]) {
        const sx = side * (heavy ? 0.43 : 0.37);
        parts.push(
          sphere(
            `human-v2-shoulder-${side}-${tag}`, root,
            new BABYLON.Vector3(sx, 1.52 + yBias, 0.015),
            heavy ? 0.29 : 0.25,
            vest,
            new BABYLON.Vector3(1.05, 0.86, 1.0)
          ),
          capsule(
            `human-v2-upperarm-${side}-${tag}`, root,
            new BABYLON.Vector3(side * (heavy ? 0.49 : 0.43), 1.29 + yBias, 0.025),
            heavy ? 0.105 : 0.09,
            heavy ? 0.54 : 0.49,
            cloth,
            new BABYLON.Vector3(0, 0, side * -0.12)
          ),
          capsule(
            `human-v2-forearm-${side}-${tag}`, root,
            new BABYLON.Vector3(side * (heavy ? 0.48 : 0.42), 0.94 + yBias, 0.11),
            heavy ? 0.095 : 0.08,
            heavy ? 0.47 : 0.43,
            cloth,
            new BABYLON.Vector3(side * 0.12, 0, side * -0.08)
          ),
          sphere(
            `human-v2-hand-${side}-${tag}`, root,
            new BABYLON.Vector3(side * (heavy ? 0.44 : 0.39), 0.72 + yBias, 0.22),
            0.17,
            gloves,
            new BABYLON.Vector3(0.9, 1.1, 0.82)
          ),
          capsule(
            `human-v2-thigh-${side}-${tag}`, root,
            new BABYLON.Vector3(side * (heavy ? 0.18 : 0.16), 0.58 + yBias, 0),
            heavy ? 0.12 : 0.105,
            heavy ? 0.62 : 0.56,
            cloth
          ),
          capsule(
            `human-v2-calf-${side}-${tag}`, root,
            new BABYLON.Vector3(side * (heavy ? 0.18 : 0.16), 0.23 + yBias, 0.025),
            heavy ? 0.105 : 0.09,
            heavy ? 0.5 : 0.45,
            cloth
          ),
          capsule(
            `human-v2-boot-${side}-${tag}`, root,
            new BABYLON.Vector3(side * (heavy ? 0.18 : 0.16), 0.045 + yBias, 0.12),
            heavy ? 0.11 : 0.095,
            heavy ? 0.34 : 0.31,
            boots,
            new BABYLON.Vector3(Math.PI / 2, 0, 0),
            new BABYLON.Vector3(1, 1.08, 1.25)
          )
        );
      }

      const pack = roundedPack(
        `human-v2-pack-${tag}`, root,
        new BABYLON.Vector3(0, 1.3 + yBias, -0.34),
        friendly ? friendlyVest : enemyVest,
        heavy ? 1.04 : 0.92
      );
      parts.push(pack);

      const belt = BABYLON.MeshBuilder.CreateTorus(`human-v2-belt-${tag}`, {
        diameter: heavy ? 0.62 : 0.54,
        thickness: 0.055,
        tessellation: 16,
      }, scene);
      belt.parent = root;
      belt.position.y = 0.91 + yBias;
      belt.rotation.x = Math.PI / 2;
      belt.material = gloves;
      belt.isPickable = false;
      parts.push(belt);

      visual.humanV2Meshes = parts;
      visual.emissiveMeshes = [torsoMesh, vestMesh];
      visual.overlayMeshes = [...(visual.overlayMeshes ?? []), ...parts];
      return visual;
    };

    const createBeforeHumanV2 = createEnemyVisual;
    createEnemyVisual = function createHumanV2(actor) {
      return humanize(createBeforeHumanV2(actor), actor);
    };

    const updateExisting = () => {
      const raid = typeof state !== 'undefined' ? state.raid : null;
      if (!raid) return;
      for (const enemy of raid.enemies ?? []) humanize(enemy.visual, enemy);
      if (raid.companion) humanize(raid.companion.visual, raid.companion);
      for (const ally of raid.allies ?? []) humanize(ally.visual, ally);
    };

    const smoothPlayerHands = () => {
      if (typeof viewModel === 'undefined' || !viewModel?.root || viewModel.__humanV2Hands) return;
      viewModel.__humanV2Hands = true;

      for (const name of ['player-human-glove-r','player-human-glove-l']) {
        const mesh = scene.getMeshByName(name);
        if (mesh) mesh.isVisible = false;
      }

      const root = viewModel.root;
      const left = capsule(
        'player-human-v2-hand-l', root,
        new BABYLON.Vector3(-0.1, -0.08, 0.58),
        0.07, 0.2, gloves,
        new BABYLON.Vector3(0, 0, 0.15)
      );
      const right = capsule(
        'player-human-v2-hand-r', root,
        new BABYLON.Vector3(0.14, -0.16, 0.39),
        0.075, 0.22, gloves,
        new BABYLON.Vector3(0, 0, -0.18)
      );
      left.renderingGroupId = 2;
      right.renderingGroupId = 2;
    };

    window.__sdrHumanModelV2Debug = {
      version: '2026-09-19-human-v2',
      roundedHumanModel: true,
      legacyBlocksHidden: true,
    };

    updateExisting();
    smoothPlayerHands();
    window.setInterval(() => {
      updateExisting();
      smoothPlayerHands();
    }, 900);
  };

  boot();
})();
