const { chromium } = require('playwright');

(async () => {
  const url = 'https://sou-da-che-fps-20260913.k-de-shuai.chatgpt.site/?v=public-check';
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const lobby = await page.evaluate(() => ({
    battlefield: Boolean(document.querySelector('[data-mode-id="battlefield"]')),
    modes: Array.from(document.querySelectorAll('[data-mode-id]')).map((button) => button.dataset.modeId),
    perfPatch: Boolean(window.__sdrPerformanceTuningApplied),
    contentPatch: Boolean(window.__sdrContentExpansionApplied),
    contentWaiting: Boolean(window.__sdrContentExpansionWaiting),
    types: ['getLobbyModeDefs', 'resolveStaticPlacement', 'chooseRaidExtractions', 'generateContainerLoot', 'createContainerVisual'].reduce((out, key) => ({ ...out, [key]: typeof window[key] }), {}),
  }));
  if (!lobby.battlefield) {
    await page.locator('[data-mode-id="raid"]').click();
    await page.locator('#deployButton').click();
    await page.waitForTimeout(2600);
  }
  const raid = await page.evaluate(() => ({
    mode: state.raid?.modeId ?? null,
    enemies: state.raid?.enemies?.length ?? 0,
    allies: state.raid?.allies?.length ?? 0,
    companion: Boolean(state.raid?.companion),
    fps: Math.round(engine.getFps()),
    meshes: scene.meshes.length,
    activeMeshes: scene.getActiveMeshes().length,
    scaling: engine.getHardwareScalingLevel(),
  }));
  console.log(JSON.stringify({ lobby, raid, errors }, null, 2));
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 1200))]);
  process.exit(errors.length || lobby.battlefield || raid.mode !== 'raid' || !raid.companion ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
