const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=echo-persistence-smoke', { waitUntil: 'networkidle' });

    const purchase = await page.evaluate(() => {
      state.mode = 'base';
      state.save.money = 250000;
      state.save.echoUnlocked = false;
      state.save.selectedModeId = 'battlefield';
      persistSave();
      renderBasePanel();
      const before = state.save.money;
      const entry = getShopEntries().find(item => item.id === 'echo_unlock');
      const bought = buyShopEntry('echo_unlock');
      return {
        entry: Boolean(entry),
        mode: state.save.selectedModeId,
        bought,
        unlocked: state.save.echoUnlocked,
        moneyDelta: before - state.save.money,
      };
    });

    await page.reload({ waitUntil: 'networkidle' });

    const reload = await page.evaluate(() => ({
      unlocked: state.save.echoUnlocked,
      entryDisabled: getShopEntries().find(item => item.id === 'echo_unlock')?.disabled ?? null,
    }));

    const inRaid = await page.evaluate(() => {
      state.save.selectedModeId = 'battlefield';
      renderBasePanel();
      startRaid();
      const player = state.raid.player;
      player.dropTimer = 0;
      player.echoKnifeCooldown = 0;
      player.utilityAction = null;
      player.useAction = null;
      player.executionLocked = false;
      const started = window.__sdrUseEchoKnife?.() ?? false;
      const slashMeshes = scene.meshes.filter(mesh => String(mesh.name).startsWith('echo-slash-')).length;
      return {
        modeId: state.raid.modeId,
        equipped: Boolean(player.echoKnifeEquipped),
        started,
        action: Boolean(player.echoKnifeAction),
        slashMeshes,
        debugVersion: window.__sdrCombatPolishDebug?.version ?? null,
      };
    });

    console.log(JSON.stringify({ purchase, reload, inRaid, errors }, null, 2));

    const ok = Boolean(
      purchase.entry &&
      purchase.mode === 'battlefield' &&
      purchase.bought === true &&
      purchase.unlocked &&
      purchase.moneyDelta === 100000 &&
      reload.unlocked &&
      reload.entryDisabled === true &&
      inRaid.modeId === 'battlefield' &&
      inRaid.equipped &&
      inRaid.started &&
      inRaid.action &&
      inRaid.slashMeshes >= 1 &&
      inRaid.debugVersion === '2026-10-03-combat-polish-v5' &&
      errors.length === 0
    );
    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
