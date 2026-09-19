(() => {
  if (window.__sdrVisualUpgradeWaiting || window.__sdrVisualUpgradeApplied) return;

  const boot = () => {
    if (typeof createEnemyVisual === 'undefined' || typeof BABYLON === 'undefined' || typeof makeMaterial === 'undefined') {
      window.__sdrVisualUpgradeWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrVisualUpgradeWaiting = false;
    if (window.__sdrVisualUpgradeApplied) return;
    window.__sdrVisualUpgradeApplied = true;

    const originalCreateEnemyVisual = createEnemyVisual;
    createEnemyVisual = function upgradedEnemyVisual(enemy) {
      const visual = originalCreateEnemyVisual(enemy);
      const root = visual?.root;
      if (!root) return visual;

      const armorMaterial = visual.chestRig?.material ?? makeMaterial(`enemy-detail-armor-${enemy.id}`, '#5f7276', '#2c3c40');
      const gearMaterial = visual.backpack?.material ?? makeMaterial(`enemy-detail-gear-${enemy.id}`, '#46565b', '#243034');
      const gunMaterial = visual.gun?.material ?? makeMaterial(`enemy-detail-gun-${enemy.id}`, '#85969d', '#47555b');
      const height = enemy.type === 'bruiser' ? 1.36 : 1.22;
      const shoulderWidth = enemy.type === 'bruiser' ? 0.58 : 0.5;

      const shoulderLeft = BABYLON.MeshBuilder.CreateBox(`enemy-upgrade-shoulder-l-${enemy.id}`, {
        width: 0.3,
        height: 0.16,
        depth: 0.44,
      }, scene);
      shoulderLeft.parent = root;
      shoulderLeft.position.set(-shoulderWidth, height + 0.23, 0.06);
      shoulderLeft.rotation.z = -0.12;
      shoulderLeft.material = armorMaterial;

      const shoulderRight = BABYLON.MeshBuilder.CreateBox(`enemy-upgrade-shoulder-r-${enemy.id}`, {
        width: 0.3,
        height: 0.16,
        depth: 0.44,
      }, scene);
      shoulderRight.parent = root;
      shoulderRight.position.set(shoulderWidth, height + 0.2, 0.06);
      shoulderRight.rotation.z = 0.12;
      shoulderRight.material = armorMaterial;

      const pouchMaterial = makeMaterial(`enemy-upgrade-pouch-${enemy.id}`, '#35464a', '#1d292c');
      const pouches = [-0.2, 0, 0.2].map((offset, index) => {
        const pouch = BABYLON.MeshBuilder.CreateBox(`enemy-upgrade-pouch-${enemy.id}-${index}`, {
          width: 0.15,
          height: 0.18,
          depth: 0.12,
        }, scene);
        pouch.parent = root;
        pouch.position.set(offset, height - 0.22, 0.39);
        pouch.material = pouchMaterial;
        return pouch;
      });

      const kneeMaterial = makeMaterial(`enemy-upgrade-knee-${enemy.id}`, '#718288', '#344247');
      const knees = [-0.18, 0.18].map((offset, index) => {
        const knee = BABYLON.MeshBuilder.CreateSphere(`enemy-upgrade-knee-${enemy.id}-${index}`, { diameter: 0.24, segments: 8 }, scene);
        knee.parent = root;
        knee.position.set(offset, 0.52, 0.12);
        knee.scaling.z = 0.62;
        knee.material = kneeMaterial;
        return knee;
      });

      const barrel = BABYLON.MeshBuilder.CreateCylinder(`enemy-upgrade-barrel-${enemy.id}`, {
        height: 0.72,
        diameterTop: 0.05,
        diameterBottom: 0.08,
        tessellation: 8,
      }, scene);
      barrel.parent = root;
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0.18, height, 1.18);
      barrel.material = gunMaterial;

      const sight = BABYLON.MeshBuilder.CreateBox(`enemy-upgrade-sight-${enemy.id}`, {
        width: 0.06,
        height: 0.09,
        depth: 0.12,
      }, scene);
      sight.parent = root;
      sight.position.set(0.18, height + 0.11, 0.7);
      sight.material = gearMaterial;

      const addedMeshes = [shoulderLeft, shoulderRight, ...pouches, ...knees, barrel, sight];
      visual.overlayMeshes = [...(visual.overlayMeshes ?? []), ...addedMeshes];
      visual.emissiveMeshes = [...(visual.emissiveMeshes ?? []), shoulderLeft, shoulderRight];
      return visual;
    };
  };

  boot();
})();
