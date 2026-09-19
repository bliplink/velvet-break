const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  try {
    await page.goto('https://sou-da-che-fps-20260913.k-de-shuai.chatgpt.site/?v=qa-bounty', { waitUntil: 'networkidle' });
    await page.locator('[data-fun-bounty="scavenge"]').click();
    await page.locator('#deployButton').click();
    await page.locator('#raidBountyPanel').waitFor({ state: 'visible' });
    const start = await page.evaluate(() => ({
      bounty: state.raid?.bounty?.kind,
      progress: state.raid?.bountyProgress,
      eventAt: state.raid?.eventSchedule?.[0]?.at,
      companion: Boolean(state.raid?.companion),
      enemies: state.raid?.enemies?.length,
      hud: document.querySelector('#raidBountyPanel')?.textContent,
    }));
    const search = await page.evaluate(() => {
      const beforeMoney = state.save.money;
      const containers = state.raid.containers.filter((entry) => !entry.opened && !entry.id.startsWith('drop-')).slice(0, 4);
      containers.forEach((container) => {
        openLootPanel(container);
        closeLootPanel();
      });
      const completed = state.raid.bountyCompleted;
      const progress = state.raid.bountyProgress;
      finishRaid(true, 'debug_success', true);
      return { containerCount: containers.length, completed, progress, reward: state.save.money - beforeMoney, resultVisible: !refs.resultOverlay.classList.contains('hidden') };
    });

    await page.locator('#returnBaseButton').click();
    await page.locator('[data-fun-bounty="hunter"]').click();
    await page.locator('#deployButton').click();
    await page.locator('#raidBountyPanel').waitFor({ state: 'visible' });
    const failure = await page.evaluate(() => {
      const beforeMoney = state.save.money;
      state.raid.killCount = 6;
      updateRaid(0.1);
      const completed = state.raid.bountyCompleted;
      finishRaid(false, 'player_killed', false);
      return { completed, reward: state.save.money - beforeMoney, replayVisible: !document.getElementById('deathReplayOverlay')?.classList.contains('hidden') };
    });
    await page.keyboard.press('Escape');
    failure.resultVisible = await page.locator('#resultOverlay').isVisible();

    const result = { start, search, failure, pageErrors, failedRequests, badResponses };
    console.log(JSON.stringify(result, null, 2));
    if (start.bounty !== 'search' || start.progress !== 0 || !start.companion || start.enemies < 30 ||
        !search.completed || search.progress !== 4 || search.reward !== 8000 || !search.resultVisible ||
        !failure.completed || failure.reward !== 0 || !failure.replayVisible || !failure.resultVisible || pageErrors.length || badResponses.length) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
