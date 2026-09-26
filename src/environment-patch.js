(() => {
  if (window.__sdrEnvironmentPatchApplied || window.__sdrEnvironmentPatchWaiting) {
    return;
  }
  const tryApplyEnvironmentPatch = () => {
    if (typeof scene === 'undefined' || typeof world === 'undefined' || typeof obstacleDefs === 'undefined') {
      window.__sdrEnvironmentPatchWaiting = true;
      window.setTimeout(tryApplyEnvironmentPatch, 60);
      return;
    }
    window.__sdrEnvironmentPatchWaiting = false;
    if (window.__sdrEnvironmentPatchApplied) {
      return;
    }
    window.__sdrEnvironmentPatchApplied = true;
    const structureRegistry = window.__sdrStructureRegistry = {
    doors: [],
    windows: [],
    ladders: [],
    stairs: [],
    easterEggs: [],
    roofProps: [],
    };

  const envRoot = new BABYLON.TransformNode('sdrEnvPatchRoot', scene);
  const decorationRoots = [];
  const districtColors = [
    { base: '#34494b', glow: '#1b2a2b' },
    { base: '#534b40', glow: '#2c2923' },
    { base: '#3c4b42', glow: '#202b26' },
    { base: '#4c444f', glow: '#29242b' },
  ];
  const buildingThemes = {
    office: { facade: '#5b7280', emissive: '#324149', trim: '#89a5b4', accent: '#8fd6ff', door: '#6d4b38', awning: '#6e94a4' },
    warehouse: { facade: '#7e684f', emissive: '#453828', trim: '#c4a26d', accent: '#ffd08a', door: '#6b5d51', awning: '#a77746' },
    apartment: { facade: '#6a5d82', emissive: '#3f364d', trim: '#b8a9dd', accent: '#d1c2ff', door: '#69493c', awning: '#7d6aa6' },
    utility: { facade: '#58705f', emissive: '#314238', trim: '#8fc2a3', accent: '#9ce0c8', door: '#5c4e40', awning: '#567968' },
    depot: { facade: '#7a575e', emissive: '#432e33', trim: '#d6a3af', accent: '#ffc4d5', door: '#744f44', awning: '#8e6670' },
  };

  function makePatchMaterial(name, diffuseHex, emissiveHex, alpha = 1) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(diffuseHex);
    mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex).scale(0.5);
    mat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
    mat.alpha = alpha;
    if (alpha >= 0.99 && BABYLON.Material) {
      mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      mat.needDepthPrePass = false;
    }
    return mat;
  }

  const facadeTextures = new Map();
  let terrainTexture = null;
  function getTerrainTexture() {
    if (terrainTexture) return terrainTexture;
    terrainTexture = new BABYLON.DynamicTexture('terrain-grit', 256, scene, false);
    const context = terrainTexture.getContext();
    context.fillStyle = '#b6b8b4';
    context.fillRect(0, 0, 256, 256);
    let seed = 734615;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let index = 0; index < 4200; index++) {
      const shade = Math.floor(85 + random() * 125);
      context.fillStyle = `rgba(${shade},${shade},${shade},${0.035 + random() * 0.09})`;
      context.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 3);
    }
    for (let index = 0; index < 8; index++) {
      context.strokeStyle = `rgba(55,61,59,${0.06 + random() * 0.06})`;
      context.lineWidth = 1;
      const x = random() * 256;
      const y = random() * 256;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + random() * 28 - 14, y + random() * 34 - 17);
      context.stroke();
    }
    terrainTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    terrainTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    terrainTexture.uScale = 8;
    terrainTexture.vScale = 8;
    terrainTexture.update();
    return terrainTexture;
  }
  function facadeTexture(themeId) {
    if (facadeTextures.has(themeId)) return facadeTextures.get(themeId);
    const texture = new BABYLON.DynamicTexture(`facade-${themeId}`, 256, scene, false);
    const context = texture.getContext();
    context.fillStyle = '#d7d9d7';
    context.fillRect(0, 0, 256, 256);
    let seed = themeId.split('').reduce((value, char) => value * 31 + char.charCodeAt(0), 17) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let index = 0; index < 1800; index++) {
      const shade = Math.floor(174 + random() * 70);
      context.fillStyle = `rgba(${shade},${shade},${shade},${0.025 + random() * 0.08})`;
      context.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 2);
    }
    context.strokeStyle = 'rgba(61,72,76,0.24)';
    context.lineWidth = 2;
    const seam = themeId === 'office' || themeId === 'utility' ? 32 : 24;
    for (let y = seam; y < 256; y += seam) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(256, y);
      context.stroke();
    }
    for (let row = 0; row < 256 / seam; row++) {
      const offset = themeId === 'office' || themeId === 'utility' ? 0 : row % 2 * 24;
      for (let x = offset; x < 256; x += 48) {
        context.beginPath();
        context.moveTo(x, row * seam);
        context.lineTo(x, (row + 1) * seam);
        context.stroke();
      }
    }
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.uScale = 2.2;
    texture.vScale = 1.7;
    texture.update();
    facadeTextures.set(themeId, texture);
    return texture;
  }

  function applyFacade(mesh, theme, themeId) {
    mesh.material = makeMaterial(`env-obstacle-mat-${mesh.name}`, theme.facade, theme.emissive);
    mesh.material.diffuseTexture = facadeTexture(themeId);
    mesh.material.emissiveColor = BABYLON.Color3.FromHexString(theme.emissive).scale(0.34);
    mesh.material.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    mesh.material.backFaceCulling = false;
    mesh.material.alpha = 1;
    if (BABYLON.Material) mesh.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
  }

  function getObstacleIdFromRoot(root) {
    return String(root?.name ?? '').replace(/^decor-/, '');
  }

  function getFaceFromRotation(rotY) {
    const normalized = ((((rotY ?? 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    if (Math.abs(normalized) < 0.2 || Math.abs(normalized - Math.PI * 2) < 0.2) {
      return 'south';
    }
    if (Math.abs(normalized - Math.PI) < 0.2) {
      return 'north';
    }
    if (Math.abs(normalized - Math.PI / 2) < 0.2) {
      return 'east';
    }
    return 'west';
  }

  function getFaceNormal(face) {
    if (face === 'north') {
      return { x: 0, z: -1 };
    }
    if (face === 'south') {
      return { x: 0, z: 1 };
    }
    if (face === 'east') {
      return { x: 1, z: 0 };
    }
    return { x: -1, z: 0 };
  }

  function registerStructureFeature(collection, root, data) {
    collection.push({
      id: `${data.type}-${collection.length + 1}`,
      obstacleId: getObstacleIdFromRoot(root),
      buildingId: getObstacleIdFromRoot(root),
      root,
      ...data,
    });
  }

  function addGroundDistrict(x, z, width, depth, color, layer = 'district') {
    const tile = BABYLON.MeshBuilder.CreateGround(`district-${x}-${z}`, { width, height: depth }, scene);
    tile.parent = envRoot;
    tile.position = new BABYLON.Vector3(x, layer === 'road' ? 0.008 : 0.004, z);
    tile.isPickable = false;
    tile.material = makePatchMaterial(`district-mat-${x}-${z}`, color.base, color.glow, 1);
    tile.material.diffuseTexture = getTerrainTexture();
    tile.material.emissiveColor = BABYLON.Color3.FromHexString(color.glow).scale(0.08);
    tile.material.zOffset = layer === 'road' ? -1 : 0;
  }

  function applyColorDistricts() {
    addGroundDistrict(-72, -72, 82, 76, districtColors[0]);
    addGroundDistrict(74, -70, 88, 72, districtColors[1]);
    addGroundDistrict(-76, 78, 86, 82, districtColors[2]);
    addGroundDistrict(72, 74, 84, 78, districtColors[3]);
    addGroundDistrict(0, 0, 68, 56, { base: '#393c43', glow: '#202329' });
    addGroundDistrict(0, -112, 120, 16, { base: '#3f444d', glow: '#23272d' }, 'road');
    addGroundDistrict(112, 0, 16, 120, { base: '#40464d', glow: '#252930' }, 'road');
    addGroundDistrict(-112, 0, 16, 120, { base: '#40464d', glow: '#252930' }, 'road');
    addGroundDistrict(0, 112, 120, 16, { base: '#3f444d', glow: '#23272d' }, 'road');
    const ground = scene.getMeshByName('ground');
    if (ground?.material) {
      ground.material.diffuseTexture = getTerrainTexture();
      ground.material.emissiveColor = new BABYLON.Color3(0.004, 0.006, 0.007);
    }
    for (const mesh of scene.meshes) {
      if (mesh.name.startsWith('line-x-') || mesh.name.startsWith('line-z-')) mesh.isVisible = false;
    }
  }

  function classifyBuilding(obstacle, index = 0) {
    const footprint = obstacle.w * obstacle.d;
    if (obstacle.h >= 6.4 && footprint >= 88) {
      return 'apartment';
    }
    if (obstacle.w >= 11 || obstacle.d >= 11) {
      return index % 2 === 0 ? 'warehouse' : 'depot';
    }
    if (obstacle.h >= 5.4) {
      return 'office';
    }
    return 'utility';
  }

  function themeForBuilding(obstacle, index = 0) {
    return buildingThemes[classifyBuilding(obstacle, index)] ?? buildingThemes.utility;
  }

  function recolorExistingBuildings() {
    for (let i = 0; i < world.obstacleMeshes.length; i += 1) {
      const mesh = world.obstacleMeshes[i];
      const obstacle = obstacleDefs.find((entry) => entry.id === mesh.metadata?.obstacleId);
      const theme = themeForBuilding(obstacle ?? { w: 8, d: 8, h: 4 }, i);
      applyFacade(mesh, theme, classifyBuilding(obstacle ?? { w: 8, d: 8, h: 4 }, i));
      if (obstacle) {
        obstacle.color = theme.facade;
        obstacle.mapColor = theme.facade;
        obstacle.theme = classifyBuilding(obstacle, i);
      }
    }
  }

  function createWindowPanel(root, x, y, z, rotY, width = 1, height = 0.72, glow = '#95d7ef') {
    const face = getFaceFromRotation(rotY);
    const normal = getFaceNormal(face);
    const centerX = x - normal.x * 0.06;
    const centerZ = z - normal.z * 0.06;
    const frame = BABYLON.MeshBuilder.CreateBox(`window-frame-${x}-${y}-${z}`, { width, height, depth: 0.12 }, scene);
    frame.parent = root;
    frame.position = new BABYLON.Vector3(centerX, y, centerZ);
    frame.rotation.y = rotY;
    frame.material = makePatchMaterial(`window-frame-mat-${x}-${y}-${z}`, '#1d2d34', '#142028');
    frame.material.backFaceCulling = false;

    const statusLamp = BABYLON.MeshBuilder.CreateBox(`window-lamp-${x}-${y}-${z}`, {
      width: Math.max(0.22, width * 0.44),
      height: 0.08,
      depth: 0.05,
    }, scene);
    statusLamp.parent = root;
    statusLamp.position = new BABYLON.Vector3(centerX, y + height * 0.5 + 0.16, centerZ);
    statusLamp.rotation.y = rotY;
    statusLamp.material = makePatchMaterial(`window-lamp-mat-${x}-${y}-${z}`, '#79d9ff', '#2e8eb6', 0.88);
    statusLamp.material.backFaceCulling = false;

    const pane = BABYLON.MeshBuilder.CreateBox(`window-pane-${x}-${y}-${z}`, {
      width: face === 'north' || face === 'south' ? width * 0.78 : 0.035,
      height: height * 0.68,
      depth: face === 'north' || face === 'south' ? 0.035 : width * 0.78,
    }, scene);
    pane.parent = root;
    pane.position = new BABYLON.Vector3(centerX, y, centerZ);
    pane.rotation.y = rotY;
    const paneMat = makePatchMaterial(`window-pane-mat-${x}-${y}-${z}`, glow, shadeColor(glow, 24), 0.16);
    paneMat.specularColor = new BABYLON.Color3(0.9, 0.97, 1);
    paneMat.backFaceCulling = false;
    paneMat.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    pane.material = paneMat;
    registerStructureFeature(structureRegistry.windows, root, {
      type: 'window',
      face,
      x: root.position.x + centerX,
      y,
      z: root.position.z + centerZ,
      localX: x,
      localZ: z,
      rotY,
      width,
      height,
      intact: true,
      frame,
      pane,
      statusLamp,
    });
    return { frame, pane };
  }

  function createDoor(root, x, y, z, rotY, color = '#6d4e37') {
    const face = getFaceFromRotation(rotY);
    const normal = getFaceNormal(face);
    const centerX = x - normal.x * 0.08;
    const centerZ = z - normal.z * 0.08;
    const door = BABYLON.MeshBuilder.CreateBox(`door-${x}-${z}`, { width: 1.16, height: 2.2, depth: 0.16 }, scene);
    door.parent = root;
    door.position = new BABYLON.Vector3(centerX, y, centerZ);
    door.rotation.y = rotY;
    door.material = makePatchMaterial(`door-mat-${x}-${z}`, color, shadeColor(color, -16));
    door.material.backFaceCulling = false;

    const lintel = BABYLON.MeshBuilder.CreateBox(`door-lintel-${x}-${z}`, { width: 1.42, height: 0.18, depth: 0.18 }, scene);
    lintel.parent = root;
    lintel.position = new BABYLON.Vector3(centerX, y + 1.2, centerZ);
    lintel.rotation.y = rotY;
    lintel.material = makePatchMaterial(`door-lintel-mat-${x}-${z}`, '#465861', '#28333a');
    lintel.material.backFaceCulling = false;

    const statusLamp = BABYLON.MeshBuilder.CreateBox(`door-lamp-${x}-${z}`, { width: 0.42, height: 0.08, depth: 0.06 }, scene);
    statusLamp.parent = root;
    statusLamp.position = new BABYLON.Vector3(centerX, y + 1.38, centerZ);
    statusLamp.rotation.y = rotY;
    statusLamp.material = makePatchMaterial(`door-lamp-mat-${x}-${z}`, '#f7b36d', '#8d5529', 0.88);
    statusLamp.material.backFaceCulling = false;
    registerStructureFeature(structureRegistry.doors, root, {
      type: 'door',
      face,
      x: root.position.x + centerX,
      y,
      z: root.position.z + centerZ,
      localX: x,
      localZ: z,
      rotY,
      width: 1.16,
      height: 2.2,
      open: false,
      panel: door,
      lintel,
      statusLamp,
      style: 'standard',
    });
    return { door, lintel };
  }

  function createLadder(root, x, y, z, height, rotY) {
    const railMat = makePatchMaterial(`ladder-rail-mat-${x}-${z}`, '#83959e', '#4d5d65');
    const rungMat = makePatchMaterial(`ladder-rung-mat-${x}-${z}`, '#a5b8bf', '#586971');
    const leftRail = BABYLON.MeshBuilder.CreateBox(`ladder-left-${x}-${z}`, { width: 0.1, height, depth: 0.08 }, scene);
    const rightRail = BABYLON.MeshBuilder.CreateBox(`ladder-right-${x}-${z}`, { width: 0.1, height, depth: 0.08 }, scene);
    leftRail.parent = root;
    rightRail.parent = root;
    leftRail.position = new BABYLON.Vector3(x - 0.26, y + height / 2, z);
    rightRail.position = new BABYLON.Vector3(x + 0.26, y + height / 2, z);
    leftRail.rotation.y = rotY;
    rightRail.rotation.y = rotY;
    leftRail.material = railMat;
    rightRail.material = railMat;
    for (let offset = 0.45; offset < height - 0.15; offset += 0.42) {
      const rung = BABYLON.MeshBuilder.CreateBox(`ladder-rung-${x}-${z}-${offset}`, { width: 0.58, height: 0.05, depth: 0.08 }, scene);
      rung.parent = root;
      rung.position = new BABYLON.Vector3(x, y + offset, z);
      rung.rotation.y = rotY;
      rung.material = rungMat;
    }
    registerStructureFeature(structureRegistry.ladders, root, {
      type: 'ladder',
      face: getFaceFromRotation(rotY),
      x: root.position.x + x,
      y,
      z: root.position.z + z,
      localX: x,
      localZ: z,
      rotY,
      height,
    });
  }

  function createStairRun(root, originX, originY, originZ, roofHeight, dirX, dirZ, color = '#5b6a73') {
    const stepCount = Math.max(12, Math.ceil((roofHeight - originY) / 0.22));
    const rise = (roofHeight - originY) / stepCount;
    const stepColor = shadeColor(color, -48);
    const stairLength = Math.max(3.8, (roofHeight - originY) * 0.9);
    const slopeLength = Math.hypot(stairLength, roofHeight - originY);
    const slopeAngle = Math.atan2(roofHeight - originY, stairLength);
    const ramp = BABYLON.MeshBuilder.CreateBox(`stair-ramp-${originX}-${originZ}`, {
      width: dirZ ? 1.42 : slopeLength,
      height: 0.14,
      depth: dirX ? 1.42 : slopeLength,
    }, scene);
    ramp.parent = root;
    ramp.position = new BABYLON.Vector3(
      originX + dirX * stairLength * 0.5,
      (originY + roofHeight) * 0.5,
      originZ + dirZ * stairLength * 0.5,
    );
    if (dirZ) ramp.rotation.x = -dirZ * slopeAngle;
    else ramp.rotation.z = dirX * slopeAngle;
    ramp.material = makePatchMaterial(`stair-ramp-mat-${originX}-${originZ}`, stepColor, shadeColor(stepColor, -15));
    for (let index = 1; index <= 5; index += 1) {
      const fraction = index / 6;
      const tread = BABYLON.MeshBuilder.CreateBox(`stair-tread-${originX}-${originZ}-${index}`, {
        width: dirZ ? 1.43 : 0.07,
        height: 0.025,
        depth: dirX ? 1.43 : 0.07,
      }, scene);
      tread.parent = root;
      tread.position = new BABYLON.Vector3(
        originX + dirX * stairLength * fraction,
        originY + (roofHeight - originY) * fraction + 0.12,
        originZ + dirZ * stairLength * fraction,
      );
      tread.material = ramp.material;
    }
    const landing = BABYLON.MeshBuilder.CreateBox(`stair-landing-${originX}-${originZ}`, {
      width: Math.abs(dirZ) > 0 ? 1.52 : 1.08,
      height: 0.12,
      depth: Math.abs(dirX) > 0 ? 1.52 : 1.08,
    }, scene);
    landing.parent = root;
    landing.position = new BABYLON.Vector3(
      originX + dirX * stairLength,
      roofHeight + 0.02,
      originZ + dirZ * stairLength,
    );
    landing.material = makePatchMaterial(`stair-landing-mat-${originX}-${originZ}`, stepColor, shadeColor(stepColor, -18));

    const railMaterial = makePatchMaterial(`stair-rail-mat-${originX}-${originZ}`, '#687980', '#3f4b52');
    const makeRail = (offsetX, offsetZ) => {
      const railLength = Math.hypot(stairLength, roofHeight - originY) + 0.4;
      const rail = BABYLON.MeshBuilder.CreateBox(`stair-rail-${originX}-${originZ}-${offsetX}-${offsetZ}`, {
        width: Math.abs(dirZ) > 0 ? 0.09 : railLength,
        height: 0.09,
        depth: Math.abs(dirX) > 0 ? 0.09 : railLength,
      }, scene);
      rail.parent = root;
      rail.position = new BABYLON.Vector3(
        originX + dirX * (stairLength * 0.5) + offsetX,
        originY + (roofHeight - originY) * 0.5 + 0.7,
        originZ + dirZ * (stairLength * 0.5) + offsetZ,
      );
      if (dirZ) rail.rotation.x = -dirZ * Math.atan2(roofHeight - originY, stairLength);
      else rail.rotation.z = dirX * Math.atan2(roofHeight - originY, stairLength);
      rail.material = railMaterial;
    };
    if (Math.abs(dirZ) > 0) {
      makeRail(-0.72, 0);
      makeRail(0.72, 0);
    } else {
      makeRail(0, -0.72);
      makeRail(0, 0.72);
    }
    registerStructureFeature(structureRegistry.stairs, root, {
      type: 'stairs',
      x: root.position.x + originX,
      y: originY,
      z: root.position.z + originZ,
      localX: originX,
      localZ: originZ,
      dirX,
      dirZ,
      stepCount,
      rise,
      run: stairLength,
      roofHeight,
      width: Math.abs(dirZ) > 0 ? 1.8 : 1.2,
      depth: Math.abs(dirX) > 0 ? 1.8 : 1.2,
    });
  }

  function createRoofUnit(root, x, y, z, width, depth, height, color = '#73848d') {
    const body = BABYLON.MeshBuilder.CreateBox(`roof-unit-${x}-${z}`, { width, depth, height }, scene);
    body.parent = root;
    body.position = new BABYLON.Vector3(x, y + height / 2, z);
    body.material = makePatchMaterial(`roof-unit-mat-${x}-${z}`, color, shadeColor(color, -20));
    structureRegistry.roofProps.push({
      obstacleId: getObstacleIdFromRoot(root),
      x: root.position.x + x,
      z: root.position.z + z,
      w: width,
      d: depth,
    });

    const vent = BABYLON.MeshBuilder.CreateCylinder(`roof-vent-${x}-${z}`, { height: 0.52, diameter: Math.min(width, depth) * 0.45, tessellation: 12 }, scene);
    vent.parent = root;
    vent.position = new BABYLON.Vector3(x, y + height + 0.2, z);
    vent.material = makePatchMaterial(`roof-vent-mat-${x}-${z}`, '#c9d7dd', '#6b7a80');
  }

  function createTrimBand(root, y, width, depth, color = '#9cb5c1') {
    const band = BABYLON.MeshBuilder.CreateBox(`trim-band-${y}-${width}-${depth}`, {
      width: width + 0.16,
      height: 0.1,
      depth: depth + 0.16,
    }, scene);
    band.parent = root;
    band.position = new BABYLON.Vector3(0, y, 0);
    band.material = makePatchMaterial(`trim-band-mat-${y}-${width}-${depth}`, color, shadeColor(color, -24));
  }

  function createBalcony(root, x, y, z, rotY, width = 2.1, depth = 0.9, color = '#7c8d95') {
    const floor = BABYLON.MeshBuilder.CreateBox(`balcony-floor-${x}-${y}-${z}`, { width, height: 0.12, depth }, scene);
    floor.parent = root;
    floor.position = new BABYLON.Vector3(x, y, z);
    floor.rotation.y = rotY;
    floor.material = makePatchMaterial(`balcony-floor-mat-${x}-${y}-${z}`, color, shadeColor(color, -18));

    const rail = BABYLON.MeshBuilder.CreateBox(`balcony-rail-${x}-${y}-${z}`, { width, height: 0.5, depth: 0.08 }, scene);
    rail.parent = root;
    rail.position = new BABYLON.Vector3(x, y + 0.3, z + Math.cos(rotY) * (depth * 0.5 - 0.05));
    rail.rotation.y = rotY;
    rail.material = makePatchMaterial(`balcony-rail-mat-${x}-${y}-${z}`, '#b7c6cc', '#627077');
  }

  function createWideDoor(root, x, y, z, rotY, width = 2.7, height = 2.8, color = '#67727d') {
    const face = getFaceFromRotation(rotY);
    const normal = getFaceNormal(face);
    const centerX = x - normal.x * 0.08;
    const centerZ = z - normal.z * 0.08;
    const shutter = BABYLON.MeshBuilder.CreateBox(`wide-door-${x}-${z}`, { width, height, depth: 0.18 }, scene);
    shutter.parent = root;
    shutter.position = new BABYLON.Vector3(centerX, y, centerZ);
    shutter.rotation.y = rotY;
    shutter.material = makePatchMaterial(`wide-door-mat-${x}-${z}`, color, shadeColor(color, -22));
    shutter.material.backFaceCulling = false;
    const statusLamp = BABYLON.MeshBuilder.CreateBox(`wide-door-lamp-${x}-${z}`, {
      width: Math.max(0.46, width * 0.22),
      height: 0.08,
      depth: 0.06,
    }, scene);
    statusLamp.parent = root;
    statusLamp.position = new BABYLON.Vector3(centerX, y + height * 0.5 + 0.18, centerZ);
    statusLamp.rotation.y = rotY;
    statusLamp.material = makePatchMaterial(`wide-door-lamp-mat-${x}-${z}`, '#f7b36d', '#8d5529', 0.88);
    statusLamp.material.backFaceCulling = false;
    registerStructureFeature(structureRegistry.doors, root, {
      type: 'door',
      face,
      x: root.position.x + centerX,
      y,
      z: root.position.z + centerZ,
      localX: x,
      localZ: z,
      rotY,
      width,
      height,
      open: false,
      panel: shutter,
      statusLamp,
      lintel: null,
      style: 'wide',
    });
    return { shutter };
  }

  function createSecretTerminal(root, x, y, z, rotY) {
    const panel = BABYLON.MeshBuilder.CreateBox(`secret-terminal-${root.name}`, { width: 0.62, height: 0.86, depth: 0.18 }, scene);
    panel.parent = root;
    panel.position = new BABYLON.Vector3(x, y, z);
    panel.rotation.y = rotY;
    panel.material = makePatchMaterial(`secret-terminal-mat-${root.name}`, '#27353d', '#72d9ff');
    const screen = BABYLON.MeshBuilder.CreateBox(`secret-terminal-screen-${root.name}`, { width: 0.42, height: 0.28, depth: 0.03 }, scene);
    screen.parent = root;
    screen.position = new BABYLON.Vector3(x, y + 0.12, z + (Math.abs(rotY) < 0.2 ? 0.11 : 0));
    screen.rotation.y = rotY;
    screen.material = makePatchMaterial(`secret-terminal-screen-mat-${root.name}`, '#67e6ff', '#9ff4ff', 0.92);
    registerStructureFeature(structureRegistry.easterEggs, root, {
      type: 'easterEgg',
      x: root.position.x + x,
      y,
      z: root.position.z + z,
      rotY,
      used: false,
      panel,
      screen,
    });
  }

  function createBillboard(root, x, y, z, rotY, width = 2.6, height = 1.2, face = '#d98a5f') {
    const panel = BABYLON.MeshBuilder.CreatePlane(`billboard-panel-${x}-${z}`, { width, height }, scene);
    panel.parent = root;
    panel.position = new BABYLON.Vector3(x, y, z);
    panel.rotation.y = rotY;
    panel.material = makePatchMaterial(`billboard-panel-mat-${x}-${z}`, face, shadeColor(face, -20), 0.94);

    const pole = BABYLON.MeshBuilder.CreateBox(`billboard-pole-${x}-${z}`, { width: 0.12, height: 1.4, depth: 0.12 }, scene);
    pole.parent = root;
    pole.position = new BABYLON.Vector3(x, y - 0.8, z);
    pole.material = makePatchMaterial(`billboard-pole-mat-${x}-${z}`, '#7b8d95', '#455159');
  }

  function decorateBuilding(obstacle, index = 0) {
    if (obstacle.w < 7 || obstacle.d < 7 || obstacle.h < 3.45) {
      return;
    }
    const root = new BABYLON.TransformNode(`decor-${obstacle.id}`, scene);
    root.parent = envRoot;
    root.position = new BABYLON.Vector3(obstacle.x, 0, obstacle.z);
    decorationRoots.push(root);

    const halfW = obstacle.w / 2;
    const halfD = obstacle.d / 2;
    const theme = themeForBuilding(obstacle, index);
    const roof = BABYLON.MeshBuilder.CreateBox(`roof-${obstacle.id}`, { width: obstacle.w + 0.8, height: 0.22, depth: obstacle.d + 0.8 }, scene);
    roof.parent = root;
    roof.position = new BABYLON.Vector3(0, obstacle.h + 0.18, 0);
    roof.material = makePatchMaterial(`roof-mat-${obstacle.id}`, '#2b3238', '#171c20');
    createTrimBand(root, Math.min(obstacle.h * 0.5, 3.18), obstacle.w, obstacle.d, theme.trim);

    if (theme === buildingThemes.warehouse || theme === buildingThemes.depot) {
      createBillboard(root, 0, obstacle.h + 1.08, halfD + 0.84, 0, Math.min(3.4, obstacle.w * 0.32), 1.12, theme.awning);
    }
    const stairRun = Math.max(3.8, (obstacle.h - 0.18) * 0.9);
    createStairRun(root, halfW + 0.9, 0.18, -halfD - stairRun - 0.65, obstacle.h, 0, 1, theme.trim);

    createWindowPanel(root, -halfW * 0.28, Math.min(2.0, obstacle.h * 0.38), halfD + 0.08, 0, 1.18, 0.86, theme.accent);
    createWindowPanel(root, halfW * 0.28, Math.min(2.0, obstacle.h * 0.38), -halfD - 0.08, Math.PI, 1.18, 0.86, theme.accent);
    if (obstacle.w >= 8 && obstacle.h >= 4.4) {
      createLadder(root, halfW + 0.08, 0.12, halfD * 0.18, obstacle.h + 0.16, Math.PI / 2);
    }
    if (obstacle.id === 'north-apartment') {
      createSecretTerminal(root, 0, 1.2, -halfD - 0.16, Math.PI);
    }

    const awning = BABYLON.MeshBuilder.CreateBox(`awning-${obstacle.id}`, { width: 2.8, height: 0.12, depth: 1.1 }, scene);
    awning.parent = root;
    awning.position = new BABYLON.Vector3(0, 2.72, halfD + 0.56);
    awning.material = makePatchMaterial(`awning-mat-${obstacle.id}`, theme.awning, shadeColor(theme.awning, -22));

    if (theme === buildingThemes.office || theme === buildingThemes.apartment) {
      createRoofUnit(root, -halfW * 0.28, obstacle.h + 0.5, -halfD * 0.2, 1.8, 1.2, 0.88, theme.trim);
      createRoofUnit(root, halfW * 0.26, obstacle.h + 0.46, halfD * 0.18, 1.46, 1.08, 0.78, theme.facade);
    }
    if (theme === buildingThemes.apartment) {
      createBalcony(root, -halfW * 0.38, 3.12, halfD + 0.52, 0, 1.88, 0.94, theme.trim);
      createBalcony(root, halfW * 0.38, 3.12, halfD + 0.52, 0, 1.88, 0.94, theme.trim);
      createStairRun(root, -halfW - 0.9, 0.18, halfD + stairRun + 0.65, obstacle.h, 0, -1, theme.trim);
    }
    if (theme === buildingThemes.utility) {
      createRoofUnit(root, 0, obstacle.h + 0.42, 0, 1.4, 1.1, 0.72, theme.trim);
    }
  }

  function createObstacleMesh(obstacle) {
    const box = BABYLON.MeshBuilder.CreateBox(obstacle.id, {
      width: obstacle.w,
      height: obstacle.h,
      depth: obstacle.d,
    }, scene);
    box.parent = envRoot;
    box.position = new BABYLON.Vector3(obstacle.x, obstacle.h / 2, obstacle.z);
    if (obstacle.w >= 7 && obstacle.d >= 6 && obstacle.h >= 3.45) {
      applyFacade(box, themeForBuilding(obstacle), classifyBuilding(obstacle));
    } else {
      box.material = makeMaterial(`${obstacle.id}-mat-extra`, obstacle.color, shadeColor(obstacle.color, -18));
      box.material.backFaceCulling = false;
    }
    box.metadata = { raycastTarget: 'obstacle', obstacleId: obstacle.id };
    world.obstacleMeshes.push(box);
    return box;
  }

  function registerExtraObstacle(def) {
    if (obstacleDefs.some((entry) => entry.id === def.id)) {
      return;
    }
    obstacleDefs.push(def);
    createObstacleMesh(def);
    if (def.decorate !== false) {
      decorateBuilding(def);
    }
  }

  function addExtraObstacles() {
    const extras = [
      { id: 'market-hall', x: -86, z: -18, w: 12, d: 9, h: 5.4, color: '#6f5e49', mapColor: '#6f5e49' },
      { id: 'blue-workshop', x: 78, z: -6, w: 10, d: 8, h: 5.8, color: '#4c6f86', mapColor: '#4c6f86' },
      { id: 'green-office', x: -76, z: 62, w: 11, d: 9, h: 6.2, color: '#54725c', mapColor: '#54725c' },
      { id: 'violet-depot', x: 82, z: 66, w: 12, d: 10, h: 5.6, color: '#68587c', mapColor: '#68587c' },
      { id: 'amber-garage', x: 8, z: 92, w: 9, d: 7, h: 4.8, color: '#8a6a48', mapColor: '#8a6a48' },
      { id: 'service-kiosk', x: 104, z: -56, w: 7, d: 6, h: 4.4, color: '#5a6674', mapColor: '#5a6674' },
      { id: 'north-apartment', x: -18, z: -108, w: 10, d: 8, h: 6.8, color: '#6c5c83', mapColor: '#6c5c83' },
      { id: 'yard-office', x: 54, z: 108, w: 9, d: 8, h: 6.1, color: '#617b85', mapColor: '#617b85' },
      { id: 'checkpoint-hub', x: -108, z: -62, w: 8, d: 8, h: 4.7, color: '#7d6848', mapColor: '#7d6848' },
      { id: 'repair-shed', x: -6, z: 108, w: 8, d: 7, h: 4.9, color: '#5d7a68', mapColor: '#5d7a68' },
      { id: 'red-storefront', x: 108, z: 56, w: 9, d: 7, h: 5.1, color: '#86565f', mapColor: '#86565f' },
      { id: 'cargo-stack-a', x: -24, z: -84, w: 5, d: 5, h: 2.6, color: '#7f5b46', mapColor: '#7f5b46', decorate: false },
      { id: 'cargo-stack-b', x: 42, z: -92, w: 4.5, d: 7, h: 2.8, color: '#4f6974', mapColor: '#4f6974', decorate: false },
      { id: 'cargo-stack-c', x: -102, z: 20, w: 5.2, d: 4.8, h: 2.7, color: '#5f7657', mapColor: '#5f7657', decorate: false },
      { id: 'cargo-stack-d', x: 98, z: 22, w: 6.2, d: 4.4, h: 2.5, color: '#7b5d6f', mapColor: '#7b5d6f', decorate: false },
      { id: 'cover-row-a', x: -58, z: 12, w: 10, d: 2.2, h: 1.7, color: '#626e74', mapColor: '#626e74', decorate: false },
      { id: 'cover-row-b', x: 22, z: 36, w: 2.2, d: 10, h: 1.6, color: '#626e74', mapColor: '#626e74', decorate: false },
      { id: 'cover-row-c', x: 62, z: -34, w: 8, d: 2.2, h: 1.7, color: '#6d645f', mapColor: '#6d645f', decorate: false },
      { id: 'cover-row-d', x: -84, z: 84, w: 2.4, d: 9, h: 1.8, color: '#5f6c74', mapColor: '#5f6c74', decorate: false },
      { id: 'cover-block-a', x: -42, z: 58, w: 4, d: 4, h: 1.9, color: '#705d48', mapColor: '#705d48', decorate: false },
      { id: 'cover-block-b', x: 18, z: -48, w: 4.4, d: 4.2, h: 1.9, color: '#576a74', mapColor: '#576a74', decorate: false },
      { id: 'cover-block-c', x: 90, z: -12, w: 4.2, d: 4.2, h: 1.9, color: '#6f5663', mapColor: '#6f5663', decorate: false },
      { id: 'barrier-line-a', x: -8, z: -102, w: 18, d: 2.4, h: 1.9, color: '#626e74', mapColor: '#626e74', decorate: false },
      { id: 'barrier-line-b', x: 96, z: 98, w: 2.6, d: 17, h: 1.9, color: '#626e74', mapColor: '#626e74', decorate: false },
    ];
    for (const def of extras) {
      registerExtraObstacle(def);
    }
  }

  function registerSolidEnvironmentProps() {
    const lampPositions = [
      [-PLAYABLE_HALF * 0.74, -PLAYABLE_HALF * 0.74],
      [PLAYABLE_HALF * 0.74, -PLAYABLE_HALF * 0.74],
      [-PLAYABLE_HALF * 0.74, PLAYABLE_HALF * 0.74],
      [PLAYABLE_HALF * 0.74, PLAYABLE_HALF * 0.74],
      [0, -PLAYABLE_HALF * 0.78],
      [0, PLAYABLE_HALF * 0.78],
    ];
    const towerPositions = [
      [-PLAYABLE_HALF * 0.9, -PLAYABLE_HALF * 0.9],
      [PLAYABLE_HALF * 0.9, -PLAYABLE_HALF * 0.9],
      [-PLAYABLE_HALF * 0.9, PLAYABLE_HALF * 0.9],
      [PLAYABLE_HALF * 0.9, PLAYABLE_HALF * 0.9],
    ];
    lampPositions.forEach(([x, z], index) => obstacleDefs.push({
      id: `lamp-collision-${index}`, x, z, w: 0.65, d: 0.65, h: 8.6, hiddenOnMap: true,
    }));
    towerPositions.forEach(([x, z], index) => obstacleDefs.push({
      id: `tower-collision-${index}`, x, z, w: 2.8, d: 2.8, h: 8, hiddenOnMap: true,
    }));
  }

  function refineViewModel() {
    if (typeof viewModel === 'undefined' || !viewModel?.root) return;
    const body = scene.getMeshByName('weapon-body-override');
    const receiver = scene.getMeshByName('weapon-receiver-override');
    if (!body || !receiver) return;
    body.material.diffuseColor = BABYLON.Color3.FromHexString('#34454c');
    body.material.emissiveColor = BABYLON.Color3.FromHexString('#152228');
    body.material.specularColor = new BABYLON.Color3(0.06, 0.07, 0.08);
    receiver.material.diffuseColor = BABYLON.Color3.FromHexString('#53646a');
    receiver.material.emissiveColor = BABYLON.Color3.FromHexString('#1a282d');
    receiver.material.specularColor = new BABYLON.Color3(0.08, 0.09, 0.1);
    const grip = scene.getMeshByName('weapon-hand-override');
    if (grip?.material) {
      grip.material.diffuseColor = BABYLON.Color3.FromHexString('#765d4d');
      grip.material.emissiveColor = BABYLON.Color3.FromHexString('#2c241d');
    }
    const addDetail = (name, dimensions, x, y, z, material) => {
      const mesh = BABYLON.MeshBuilder.CreateBox(name, dimensions, scene);
      mesh.parent = viewModel.root;
      mesh.position = new BABYLON.Vector3(x, y, z);
      mesh.material = material;
      mesh.isPickable = false;
      return mesh;
    };
    const darkMetal = makePatchMaterial('weapon-dark-metal', '#26343a', '#101b20');
    addDetail('weapon-magazine-detail', { width: 0.14, height: 0.28, depth: 0.17 }, 0.02, -0.21, 0.42, darkMetal).rotation.x = -0.18;
    addDetail('weapon-top-rail-detail', { width: 0.12, height: 0.035, depth: 0.56 }, 0.02, 0.16, 0.49, darkMetal);
    addDetail('weapon-handguard-detail', { width: 0.28, height: 0.16, depth: 0.35 }, 0.02, -0.01, 0.86, darkMetal);
    const muzzle = BABYLON.MeshBuilder.CreateCylinder('weapon-muzzle-brake-detail', {
      height: 0.14, diameter: 0.095, tessellation: 12,
    }, scene);
    muzzle.parent = viewModel.root;
    muzzle.position = new BABYLON.Vector3(0.03, 0.03, 1.34);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.material = darkMetal;
    muzzle.isPickable = false;
  }

  const originalDrawMapObstacles = drawMapObstacles;
  drawMapObstacles = function patchedDrawMapObstacles(ctx, size) {
    const pad = 18;
    for (const obstacle of obstacleDefs) {
      if (obstacle.hiddenOnMap) continue;
      const min = worldToMap(obstacle.x - obstacle.w / 2, obstacle.z - obstacle.d / 2, size, pad);
      const max = worldToMap(obstacle.x + obstacle.w / 2, obstacle.z + obstacle.d / 2, size, pad);
      ctx.fillStyle = obstacle.mapColor ?? obstacle.color ?? 'rgba(67, 88, 96, 0.85)';
      ctx.globalAlpha = 0.88;
      ctx.fillRect(min.x, min.y, max.x - min.x, max.y - min.y);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(225, 236, 240, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(min.x, min.y, max.x - min.x, max.y - min.y);
    }
  };
  drawMapObstacles.__original = originalDrawMapObstacles;

  function bootstrapEnvironmentPatch() {
    scene.fogDensity = 0.0085;
    scene.fogColor = new BABYLON.Color3(0.085, 0.105, 0.12);
    scene.clearColor = new BABYLON.Color4(0.085, 0.105, 0.12, 1);
    applyColorDistricts();
    recolorExistingBuildings();
    for (let index = 0; index < obstacleDefs.length; index += 1) {
      decorateBuilding(obstacleDefs[index], index);
    }
    addExtraObstacles();
    registerSolidEnvironmentProps();
    refineViewModel();
  }

  bootstrapEnvironmentPatch();
  };
  tryApplyEnvironmentPatch();
})();
