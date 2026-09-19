const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5531/?downed-smoke', { waitUntil: 'networkidle' });
  await page.locator('#deployButton').click();
  await page.waitForTimeout(1800);
  const downed = await page.evaluate(() => {
    const raid = state.raid;
    raid.companion.x = raid.player.x;
    raid.companion.z = raid.player.z;
    applyDamageToPlayer(999999);
    return {
      playerDowned: raid.playerDowned,
      playerFlag: raid.player.downed,
      companionName: raid.companion.name,
      inputLocked: state.input.keys.size === 0 && !state.input.fireHeld,
      cameraY: camera.position.y,
    };
  });
  await page.waitForTimeout(3000);
  const cameraDuringDowned = await page.evaluate(() => camera.position.y);
  await page.evaluate(() => { state.raid.companion.reviveProgress = 9.9; });
  await page.waitForTimeout(1800);
  const revived = await page.evaluate(() => ({
    mode: state.mode,
    playerDowned: state.raid?.playerDowned ?? null,
    playerHealth: state.raid?.player.health ?? 0,
    reviveUsed: state.raid?.playerReviveUsed ?? false,
  }));
  console.log(JSON.stringify({ downed, cameraDuringDowned, revived, errors }, null, 2));
  await browser.close();
  process.exit(errors.length || !downed.playerDowned || !downed.playerFlag || downed.companionName !== '克隆' || revived.playerDowned || !revived.reviveUsed ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
