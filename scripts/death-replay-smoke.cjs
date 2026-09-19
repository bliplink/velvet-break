const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5531/?v=death-replay-smoke', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      for (let i = 0; i < 12; i++) update(0.08);
      finishRaid(false, 'player_killed', false);
    });
    const active = await page.evaluate(() => ({ mode: state.mode, replay: window.__sdrReplayDebug?.active, visible: !document.getElementById('deathReplayOverlay')?.classList.contains('hidden'), title: document.getElementById('deathReplayTitle')?.textContent, result: !refs.resultOverlay.classList.contains('hidden') }));
    await page.keyboard.press('Escape');
    const skipped = await page.evaluate(() => ({ mode: state.mode, replay: window.__sdrReplayDebug?.active, result: !refs.resultOverlay.classList.contains('hidden') }));
    console.log(JSON.stringify({ active, skipped, errors }, null, 2));
    if (active.mode !== 'replay' || !active.replay || !active.visible || !active.title.includes('第三人称') || active.result || skipped.mode !== 'result' || skipped.replay || !skipped.result || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
