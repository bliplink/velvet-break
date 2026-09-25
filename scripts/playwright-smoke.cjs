const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');

const gameUrl = 'http://127.0.0.1:5531/';
let testServer = null;
async function ensureServer() {
  try {
    if ((await fetch(gameUrl)).ok) return;
  } catch {}
  testServer = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      if ((await fetch(gameUrl)).ok) return;
    } catch {}
  }
  throw new Error('Local game server did not start on port 5531');
}
process.on('exit', () => testServer?.kill());

async function main() {
  await ensureServer();
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  const missingResources = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) missingResources.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${gameUrl}?v=playwright-smoke`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const lobby = await page.evaluate(() => ({
    fps: Math.round(window.__sdrEngine?.getFps?.() ?? 0),
    meshes: window.__sdrScene?.meshes?.length ?? 0,
    ready: Boolean(window.__sdrScene && state),
    scaling: window.__sdrEngine?.getHardwareScalingLevel?.(),
  }));
  await page.locator('#deployButton').click();
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => ({
    mode: state.mode,
    fps: Math.round(window.__sdrEngine?.getFps?.() ?? 0),
    meshes: window.__sdrScene?.meshes?.length ?? 0,
    enemies: state.raid?.enemies?.length ?? 0,
    activeMeshes: window.__sdrScene?.getActiveMeshes().length ?? 0,
    activeCategories: window.__sdrScene?.getActiveMeshes().data.slice(0, window.__sdrScene.getActiveMeshes().length).reduce((counts, mesh) => {
      const category = mesh?.name?.startsWith('enemy-') ? 'enemy' : mesh?.name?.startsWith('stair-') ? 'stair' :
        mesh?.name?.startsWith('window-') ? 'window' : mesh?.name?.startsWith('roof-') ? 'roof' : 'other';
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {}),
    enemyDistances: state.raid.enemies.filter(enemy => !enemy.dead).map(enemy => Math.round(Math.hypot(enemy.x - state.raid.player.x, enemy.z - state.raid.player.z))),
    loadoutCollapsed: Boolean(state.ui.raidPanelCollapsed.raidLoadoutList),
    x: state.raid?.player?.x,
    z: state.raid?.player?.z,
  }));
  await page.screenshot({ path: 'screenshots/playwright-raid.png' });
  await page.evaluate(() => {
    window.__perfSample = { updateMs: 0, renderMs: 0, frames: 0 };
    const beforeUpdate = update;
    update = function measuredUpdate(dt) {
      const start = performance.now();
      try { return beforeUpdate(dt); } finally { window.__perfSample.updateMs += performance.now() - start; }
    };
    const renderScene = window.__sdrScene;
    const beforeRender = renderScene.render.bind(renderScene);
    renderScene.render = function measuredRender(...args) {
      const start = performance.now();
      try { return beforeRender(...args); } finally {
        window.__perfSample.renderMs += performance.now() - start;
        window.__perfSample.frames++;
      }
    };
  });
  await page.waitForTimeout(3500);
  const profile = await page.evaluate(() => ({
    updateMs: Math.round(window.__perfSample.updateMs / Math.max(1, window.__perfSample.frames)),
    renderMs: Math.round(window.__perfSample.renderMs / Math.max(1, window.__perfSample.frames)),
    frames: window.__perfSample.frames,
  }));
  await page.evaluate(() => {
    const player = state.raid.player;
    const candidates = [[0, 0], [60, 60], [-60, 60], [60, -60], [-60, -60], [0, 90]];
    const clear = ([x, z]) => !obstacleDefs.some((obstacle) =>
      Math.abs(x - obstacle.x) < obstacle.w / 2 + 2 && Math.abs(z - obstacle.z) < obstacle.d / 2 + 2);
    const [x, z] = candidates.find(clear) ?? [0, 0];
    player.x = x;
    player.z = z;
    player.onRoofBuildingId = null;
    player.insideBuildingId = null;
    player.dropTimer = 0;
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => ({
    fps: Math.round(window.__sdrEngine?.getFps?.() ?? 0),
    x: state.raid?.player?.x,
    z: state.raid?.player?.z,
    health: state.raid?.player?.health,
    walkSpeed: getPlayerMoveSpeed(state.raid.player, false),
    sprintSpeed: getPlayerMoveSpeed(state.raid.player, true),
  }));
  const ammoBeforeShot = await page.evaluate(() => {
    state.raid.player.dropTimer = 0;
    state.raid.player.fireCooldown = 0;
    return state.raid.player.ammoInMag;
  });
  await page.keyboard.press('f');
  const ammoAfterShot = await page.evaluate(() => state.raid.player.ammoInMag);
  const stairSetup = await page.evaluate(() => {
    window.__enemyStart = new Map(state.raid.enemies.map(enemy => [enemy.id, { x: enemy.x, z: enemy.z }]));
    const stair = window.__sdrStructureRegistry?.stairs?.find(entry => obstacleDefs.some(obstacle => obstacle.id === entry.obstacleId));
    if (!stair) return null;
    const player = state.raid.player;
    player.x = stair.x;
    player.z = stair.z;
    player.dropTimer = 0;
    player.onRoofBuildingId = null;
    player.insideBuildingId = null;
    player.structureAction = null;
    state.input.keys.clear();
    return { id: stair.obstacleId, height: obstacleDefs.find(obstacle => obstacle.id === stair.obstacleId).h };
  });
  let stairs = null;
  if (stairSetup) {
    await page.keyboard.press('e');
    const upStarted = await page.evaluate(() => state.raid.player.structureAction?.type === 'stairs');
    const upResult = await page.evaluate(() => {
      for (let index = 0; index < 45; index++) updateRaid(0.1);
      const player = state.raid.player;
      return { roof: player.onRoofBuildingId, x: player.x, z: player.z, eyeY: camera.position.y };
    });
    await page.keyboard.press('e');
    const downStarted = await page.evaluate(() => state.raid.player.structureAction?.type === 'stairs');
    const downResult = await page.evaluate(() => {
      for (let index = 0; index < 45; index++) updateRaid(0.1);
      const player = state.raid.player;
      return { roof: player.onRoofBuildingId, x: player.x, z: player.z, eyeY: camera.position.y };
    });
    stairs = { upStarted, upResult, downStarted, downResult };
  }
  const enemyMovement = await page.evaluate(() => {
    const enemies = state.raid.enemies.filter(enemy => !enemy.dead && !enemy.isRangeTarget);
    const moved = enemies.filter(enemy => {
      const start = window.__enemyStart.get(enemy.id);
      return start && Math.hypot(enemy.x - start.x, enemy.z - start.z) > 0.25;
    });
    return { active: enemies.length, moved: moved.length, stationary: enemies.length - moved.length };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'screenshots/playwright-raid-mobile.png' });
  const mobile = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } : null;
    };
    return { hud: box('#hud'), map: box('.hud-right'), controls: box('#touchControls'),
      movePad: box('.move-pad'), actionPad: box('.action-pad'), language: box('#languageSwitch'),
      notices: document.querySelectorAll('.notification').length };
  });
  const extractionSetup = await page.evaluate(() => {
    const zone = state.raid.extractions.find(entry => entry.kind !== 'switch' && !entry.requiresObjectives && entry.active);
    if (!zone) return null;
    const player = state.raid.player;
    player.x = zone.x;
    player.z = zone.z;
    player.health = player.maxHealth;
    player.damageImmunityTimer = 10;
    player.dropTimer = 0;
    player.onRoofBuildingId = null;
    player.insideBuildingId = null;
    state.input.keys.clear();
    return { id: zone.id, x: zone.x, z: zone.z };
  });
  let extraction = null;
  if (extractionSetup) {
    await page.keyboard.down('e');
    extraction = await page.evaluate(() => {
      for (let index = 0; index < 50; index++) updateRaid(0.1);
      const sequenceStarted = Boolean(state.raid?.extractionSequence);
      for (let index = 0; index < 20 && state.mode === 'raid'; index++) updateRaid(0.1);
      return { sequenceStarted, mode: state.mode, resultVisible: !refs.resultOverlay.classList.contains('hidden'), survived: state.raid?.result?.survived ?? false };
    });
    await page.keyboard.up('e');
  }
  await page.locator('#returnBaseButton').click();

  const stashSetup = await page.evaluate(() => {
    const ammoId = Object.keys(AMMO_DEFS)[0];
    const partId = Object.keys(PART_DEFS).find(id => !state.save.armory.ownedParts.includes(id)) ?? Object.keys(PART_DEFS)[0];
    const ammoBefore = Number(state.save.prepAmmo[ammoId] ?? 0);
    state.save.armory.ownedParts = state.save.armory.ownedParts.filter(id => id !== partId);
    const partOwnedBefore = state.save.armory.ownedParts.includes(partId);
    state.save.stash = [
      {
        uid: 'qa-stash-ammo',
        id: 'qa-stash-ammo',
        name: 'QA Ammo Stack',
        category: 'Ammo',
        rarity: 'common',
        value: 900,
        weight: 1.2,
        itemType: 'ammo',
        ammoId,
        rounds: 45,
      },
      {
        uid: 'qa-stash-part',
        id: 'qa-stash-part',
        name: 'QA New Part',
        category: 'Parts',
        rarity: 'rare',
        value: 5200,
        weight: 0.7,
        itemType: 'part',
        partId,
      },
      {
        uid: 'qa-stash-value',
        id: 'qa-stash-value',
        name: 'QA Valuable',
        category: 'Valuable',
        rarity: 'legendary',
        value: 12000,
        weight: 1.1,
        itemType: 'loot',
      },
    ];
    window.__qaStashAmmoId = ammoId;
    window.__qaStashPartId = partId;
    window.__qaStashAmmoBefore = ammoBefore;
    window.__qaStashPartOwnedBefore = partOwnedBefore;
    window.__sdrStashDirectoryState = { query: '', category: 'all', sort: 'value-desc' };
    renderBasePanel();
    return {
      debug: window.__sdrStashDirectoryDebug,
      summaryText: document.querySelector('.stash-directory-summary')?.textContent ?? '',
      controls: {
        search: Boolean(document.querySelector('.stash-directory-filter')),
        category: Boolean(document.querySelector('.stash-directory-category')),
        sort: Boolean(document.querySelector('.stash-directory-sort')),
        ammoBulk: Boolean(document.querySelector('[data-stash-bulk="ammo"]')),
        partsBulk: Boolean(document.querySelector('[data-stash-bulk="parts"]')),
        echoLoadout: Boolean(document.querySelector('[data-echo-melee-loadout]')),
        echoArmory: Boolean(document.querySelector('[data-echo-melee-armory]')),
      },
    };
  });

  await page.locator('.stash-directory-filter').fill('QA Valuable');
  const stashSearch = await page.evaluate(() => ({
    visibleGroups: window.__sdrStashDirectoryDebug?.visibleGroups ?? -1,
    visibleRows: Array.from(document.querySelectorAll('#stashDirectory .stash-directory-row')).filter(row => !row.hidden).length,
  }));

  await page.locator('.stash-directory-filter').fill('');
  await page.selectOption('.stash-directory-category', encodeURIComponent('Ammo'));
  const stashCategory = await page.evaluate(() => ({
    visibleGroups: window.__sdrStashDirectoryDebug?.visibleGroups ?? -1,
    category: window.__sdrStashDirectoryDebug?.category ?? null,
  }));

  await page.selectOption('.stash-directory-category', 'all');
  await page.selectOption('.stash-directory-sort', 'name-asc');
  const stashSort = await page.evaluate(() => {
    const names = Array.from(document.querySelectorAll('#stashDirectory .stash-directory-row:not([hidden]) .stash-directory-name strong'))
      .map(node => node.textContent.trim());
    const locale = getLanguage() === 'zh' ? 'zh-CN' : 'en';
    const sorted = names.slice().sort((left, right) => left.localeCompare(right, locale));
    return {
      sort: window.__sdrStashDirectoryDebug?.sort ?? null,
      names,
      isSorted: names.length === sorted.length && names.every((name, index) => name === sorted[index]),
    };
  });

  await page.locator('[data-stash-bulk="ammo"]').click();
  const stashAmmoBulk = await page.evaluate(() => ({
    stashCount: state.save.stash.length,
    ammoGain: Number(state.save.prepAmmo[window.__qaStashAmmoId] ?? 0) - window.__qaStashAmmoBefore,
    ammoItemsLeft: state.save.stash.filter(item => item.itemType === 'ammo').length,
  }));

  await page.locator('[data-stash-bulk="parts"]').click();
  const stashPartsBulk = await page.evaluate(() => ({
    stashCount: state.save.stash.length,
    ownsPart: state.save.armory.ownedParts.includes(window.__qaStashPartId),
    partItemsLeft: state.save.stash.filter(item => item.itemType === 'part' && item.partId === window.__qaStashPartId).length,
    version: window.__sdrStashDirectoryDebug?.version ?? null,
  }));

  await page.locator('#practiceSection [data-expansion-range-motion="moving"]').click();
  const movingSelected = await page.locator('#practiceSection [data-expansion-range-motion="moving"]').getAttribute('aria-pressed');
  await page.locator('#practiceSection [data-expansion-action="start-range"]').click();
  const rangeBefore = await page.evaluate(() => {
    const raid = state.raid;
    window.__rangeStart = raid.enemies.map(enemy => ({ id: enemy.id, x: enemy.x, z: enemy.z }));
    return {
      mode: state.mode,
      training: raid.isTrainingRange,
      motion: raid.rangeMotion,
      health: raid.player.health,
      maxHealth: raid.player.maxHealth,
      targetHealth: raid.enemies.map(enemy => enemy.maxHealth),
      attackers: raid.enemies.filter(enemy => !enemy.isRangeTarget || enemy.damage > 0).length,
      kaiKillHeal: getPlayerOperatorDef(raid.player).killHeal,
    };
  });
  const rangeAfter = await page.evaluate(() => {
    const raid = state.raid;
    applyDamageToPlayer(999);
    const healthAfterHit = raid.player.health;
    for (let index = 0; index < 30; index++) updateRaid(0.1);
    const moved = raid.enemies.filter(enemy => {
      const start = window.__rangeStart.find(entry => entry.id === enemy.id);
      return start && Math.hypot(enemy.x - start.x, enemy.z - start.z) > 0.3;
    }).length;
    raid.player.health = 1100;
    raid.player.dropTimer = 0;
    useMedkit();
    const startedHealing = raid.player.useAction?.flavor === 'medkit';
    for (let index = 0; index < 40; index++) updateRaid(0.1);
    return { moved, healthAfterHit, startedHealing, healthAfterMedkit: raid.player.health,
      targetCount: raid.enemies.length, bossCount: raid.enemies.filter(enemy => enemy.isNamelessBoss).length };
  });
  const persistencePage = await context.newPage();
  await persistencePage.goto(`${gameUrl}?v=persistence-reset-smoke`, { waitUntil: 'networkidle' });
  await persistencePage.waitForTimeout(700);

  const purchaseSetup = await persistencePage.evaluate(() => {
    state.save = defaultSave();
    state.save.money = 500000;
    persistSave();
    renderBasePanel();

    const prepProducts = getShopEntries().filter(entry => entry.kind === 'prep' || ['prep_medkit', 'prep_surgical', 'prep_armor'].includes(entry.id));
    buyShopEntry('weapon_smg');
    buyShopEntry('part_red_dot');
    renderBasePanel();

    const unlockButton = document.querySelector('[data-engineer-unlock]');
    const lockTextBefore = document.querySelector('.operator-lock-note')?.textContent ?? '';
    const moneyBeforeEngineer = state.save.money;
    unlockButton?.click();

    return {
      prepProductCount: prepProducts.length,
      unlocked: Boolean(state.save.engineerUnlocked),
      selectedOperatorId: state.save.selectedOperatorId,
      money: state.save.money,
      engineerUnlockCost: moneyBeforeEngineer - state.save.money,
      lockTextBefore,
      ownsSmg: state.save.armory.ownedWeapons.includes('smg'),
      ownsRedDot: state.save.armory.ownedParts.includes('red_dot'),
      unlockText: document.querySelector('.operator-lock-note')?.textContent ?? '',
      hasUnlockButtonAfter: Boolean(document.querySelector('[data-engineer-unlock]')),
    };
  });

  await persistencePage.reload({ waitUntil: 'networkidle' });
  await persistencePage.waitForTimeout(700);
  const purchaseReload = await persistencePage.evaluate(() => ({
    unlocked: Boolean(state.save.engineerUnlocked),
    selectedOperatorId: state.save.selectedOperatorId,
    money: state.save.money,
    ownsSmg: state.save.armory.ownedWeapons.includes('smg'),
    ownsRedDot: state.save.armory.ownedParts.includes('red_dot'),
    prepProductCount: getShopEntries().filter(entry => entry.kind === 'prep' || ['prep_medkit', 'prep_surgical', 'prep_armor'].includes(entry.id)).length,
    unlockButton: Boolean(document.querySelector('[data-engineer-unlock]')),
  }));

  const resetSecurity = await persistencePage.evaluate(() => {
    const resetDayKey = 'iron-extraction-reset-day-v1';
    localStorage.removeItem(resetDayKey);
    state.save.money = 345678;
    persistSave();

    const originalPrompt = window.prompt;
    window.prompt = () => 'wrong-password';
    const wrongResult = resetSave();
    const afterWrongMoney = state.save.money;
    const afterWrongDay = localStorage.getItem(resetDayKey);

    window.prompt = () => '20251001';
    const firstResult = resetSave();
    const afterFirstMoney = state.save.money;
    const dayAfterFirst = localStorage.getItem(resetDayKey);

    state.save.money = 456789;
    persistSave();
    const secondResult = resetSave();
    const afterSecondMoney = state.save.money;
    const dayAfterSecond = localStorage.getItem(resetDayKey);
    window.prompt = originalPrompt;

    return {
      wrongResult,
      afterWrongMoney,
      afterWrongDay,
      firstResult,
      afterFirstMoney,
      dayAfterFirst,
      secondResult,
      afterSecondMoney,
      dayAfterSecond,
      defaultMoney: defaultSave().money,
    };
  });
  await persistencePage.close();

  console.log(JSON.stringify({ lobby, before, profile, after, shot: { ammoBeforeShot, ammoAfterShot }, stairSetup, stairs, enemyMovement, mobile, extractionSetup, extraction, stashSetup, stashSearch, stashCategory, stashSort, stashAmmoBulk, stashPartsBulk, movingSelected, rangeBefore, rangeAfter, purchaseSetup, purchaseReload, resetSecurity, errors, missingResources }, null, 2));
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 2000))]);
  process.exit(errors.length || missingResources.length || before.mode !== 'raid' || !before.loadoutCollapsed ||
    Math.hypot(after.x - before.x, after.z - before.z) < 0.1 || ammoAfterShot >= ammoBeforeShot || !stairs?.upStarted ||
    stairs.upResult.roof !== stairSetup.id || !stairs.downStarted || stairs.downResult.roof ||
    mobile.map.x + mobile.map.width > 390 || mobile.language.x + mobile.language.width > 390 ||
    mobile.actionPad.x + mobile.actionPad.width > 390 || mobile.notices > 3 ||
    !extraction?.sequenceStarted || !extraction.resultVisible || !extraction.survived ||
    stashSetup.debug?.version !== '2026-09-25-stash-v2' ||
    stashSetup.debug?.itemCount !== 3 || stashSetup.debug?.groupCount !== 3 || stashSetup.debug?.categoryCount !== 3 ||
    !stashSetup.controls.search || !stashSetup.controls.category || !stashSetup.controls.sort ||
    !stashSetup.controls.ammoBulk || !stashSetup.controls.partsBulk ||
    !stashSetup.controls.echoLoadout || !stashSetup.controls.echoArmory ||
    stashSearch.visibleGroups !== 1 || stashSearch.visibleRows !== 1 ||
    stashCategory.visibleGroups !== 1 || stashCategory.category !== encodeURIComponent('Ammo') ||
    stashSort.sort !== 'name-asc' || stashSort.names.length !== 3 || !stashSort.isSorted ||
    stashAmmoBulk.ammoGain !== 45 || stashAmmoBulk.ammoItemsLeft !== 0 || stashAmmoBulk.stashCount !== 2 ||
    !stashPartsBulk.ownsPart || stashPartsBulk.partItemsLeft !== 0 || stashPartsBulk.stashCount !== 1 ||
    stashPartsBulk.version !== '2026-09-25-stash-v2' ||
    movingSelected !== 'true' || !rangeBefore.training || rangeBefore.motion !== 'moving' ||
    rangeBefore.maxHealth !== 1500 || rangeBefore.health !== 1500 ||
    rangeBefore.targetHealth.join(',') !== '100,200,300,400,500,600,700,800,900,1000' ||
    rangeBefore.attackers !== 0 || rangeBefore.kaiKillHeal !== 90 || rangeAfter.moved < 5 ||
    rangeAfter.bossCount !== 0 || rangeAfter.healthAfterHit !== 1500 ||
    !rangeAfter.startedHealing || rangeAfter.healthAfterMedkit !== 1250 ||
    purchaseSetup.prepProductCount !== 0 ||
    !purchaseSetup.unlocked || purchaseSetup.selectedOperatorId !== 'engineer' ||
    purchaseSetup.engineerUnlockCost !== 200000 || !/200,000/.test(purchaseSetup.lockTextBefore) ||
    purchaseSetup.money >= 300000 || purchaseSetup.money < 250000 ||
    !purchaseSetup.ownsSmg || !purchaseSetup.ownsRedDot || purchaseSetup.hasUnlockButtonAfter ||
    !purchaseReload.unlocked || purchaseReload.selectedOperatorId !== 'engineer' ||
    purchaseReload.money !== purchaseSetup.money ||
    !purchaseReload.ownsSmg || !purchaseReload.ownsRedDot ||
    purchaseReload.prepProductCount !== 0 || purchaseReload.unlockButton ||
    resetSecurity.wrongResult !== false ||
    resetSecurity.afterWrongMoney !== 345678 || resetSecurity.afterWrongDay !== null ||
    resetSecurity.firstResult !== true ||
    resetSecurity.afterFirstMoney !== resetSecurity.defaultMoney ||
    !/^\d{4}-\d{2}-\d{2}$/.test(resetSecurity.dayAfterFirst ?? '') ||
    resetSecurity.secondResult !== false ||
    resetSecurity.afterSecondMoney !== 456789 ||
    resetSecurity.dayAfterSecond !== resetSecurity.dayAfterFirst ? 1 : 0);
}

main().catch(error => { console.error(error); process.exit(1); });
