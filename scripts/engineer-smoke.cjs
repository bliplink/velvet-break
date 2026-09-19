const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5531/?v=engineer-smoke', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      state.save.engineerUnlocked = true;
      state.save.selectedOperatorId = 'engineer';
      startRaid();
      const player = state.raid.player;
      player.dropTimer = 0;
      player.pitch = 0.26;
      player.x = 0;
      player.z = 0;
      player.yaw = 0;
      syncPlayerCamera();
    });
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => ({ operator: state.raid.player.operatorId, utility: state.raid.player.utilityItems, fire: state.raid.player.incendiaryItems ?? 1,
      max: state.raid.player.utilityMaxItems, interval: state.raid.player.utilityGainInterval,
      hud: document.getElementById('operatorUtilityValue')?.textContent, button: document.getElementById('utilityActionButton')?.textContent }));
    await page.keyboard.press('g');
    const barrier = await page.evaluate(() => ({ count: state.raid.engineerBarriers?.length ?? 0, utility: state.raid.player.utilityItems, action: Boolean(state.raid.player.barrierDeployAction) }));
    await page.mouse.move(640, 620);
    await page.keyboard.press('i');
    const aiming = await page.evaluate(() => {
      const pick = scene.pick(640, 620, mesh => mesh?.name === 'ground' || mesh?.name?.startsWith('roof-') || mesh?.metadata?.raycastTarget === 'obstacle');
      const ray = camera.getForwardRay(80);
      return { active: Boolean(state.raid.incendiaryTargeting), target: state.raid.incendiaryTargeting?.target ?? null,
        player: { x: state.raid.player.x, z: state.raid.player.z, yaw: state.raid.player.yaw, pitch: state.raid.player.pitch },
        ray: { y: ray.direction.y, x: ray.direction.x, z: ray.direction.z },
        pointer: state.raid.mouseWorldPointer, pick: { hit: pick?.hit, mesh: pick?.pickedMesh?.name, point: pick?.pickedPoint?.asArray?.() },
        ground: scene.getMeshByName('ground')?.isPickable };
    });
    await page.waitForTimeout(200);
    await page.keyboard.press('i');
    const throwing = await page.evaluate(() => ({ active: Boolean(state.raid.player.incendiaryThrow), remaining: state.raid.player.incendiaryItems, target: state.raid.player.incendiaryThrow?.target ?? null }));
    await page.evaluate(() => { for (let i = 0; i < 35; i++) updateRaid(0.1); });
    const landed = await page.evaluate(() => ({ fields: state.raid.incendiaryFields?.length ?? 0, remaining: state.raid.player.incendiaryItems }));
    await page.evaluate(() => { state.raid.player.utilityItems = 0; state.raid.player.engineerUtilityGainTimer = 20; state.raid.player.utilityGainTimer = 999; });
    await page.evaluate(() => { for (let i = 0; i < 200; i++) updateRaid(0.1); });
    const refill = await page.evaluate(() => ({ utility: state.raid.player.utilityItems, engineerTimer: state.raid.player.engineerUtilityGainTimer, legacyTimer: state.raid.player.utilityGainTimer,
      hud: document.getElementById('operatorUtilityDetail')?.textContent }));
    console.log(JSON.stringify({ before, barrier, aiming, throwing, landed, refill, errors }, null, 2));
    if (before.max !== 10 || before.interval !== 20 || !before.hud?.includes('速凝掩体') || !before.button?.includes('速凝掩体') || refill.utility !== 1 || refill.engineerTimer < 19 || refill.engineerTimer > 20 || refill.hud?.includes('999')) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
