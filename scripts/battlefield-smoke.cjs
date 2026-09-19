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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      if ((await fetch(gameUrl)).ok) return;
    } catch {}
  }
  throw new Error('Local game server did not start on port 5531');
}

async function main() {
  await ensureServer();
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  const missingResources = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) missingResources.push(`${response.status()} ${response.url()}`); });

  await page.goto(`${gameUrl}?v=battlefield-smoke`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => renderBasePanel());
  const lobby = await page.evaluate(() => ({
    battlefieldCard: Boolean(document.querySelector('[data-mode-id="battlefield"]')),
    stashDirectory: Boolean(document.querySelector('#stashDirectory')),
    stashDirectoryRows: document.querySelectorAll('#stashDirectory .stash-directory-row').length,
  }));

  await page.locator('[data-mode-id="battlefield"]').click();
  await page.waitForTimeout(250);
  const selected = await page.evaluate(() => getSelectedLobbyModeId());
  await page.locator('#deployButton').click();
  await page.waitForTimeout(2600);
  const battlefield = await page.evaluate(() => ({
    mode: state.raid?.modeId,
    isBattlefield: Boolean(state.raid?.isBattlefield),
    configuredDuration: getLobbyModeDef('battlefield')?.duration,
    enemies: state.raid?.enemies?.length ?? 0,
    containers: state.raid?.containers?.length ?? 0,
    objectives: state.raid?.objectives?.length ?? 0,
    extractionCount: state.raid?.extractions?.length ?? 0,
    distinctEnemyPositions: new Set((state.raid?.enemies ?? []).map((enemy) => `${Math.round(enemy.x * 10)}:${Math.round(enemy.z * 10)}`)).size,
    allies: state.raid?.allies?.length ?? 0,
    allyOperators: (state.raid?.allies ?? []).map((ally) => ally.operatorId),
    mapScale: state.raid?.battlefieldScale,
  }));

  const squad = await page.evaluate(() => ({
    count: state.raid?.allies?.length ?? 0,
    operators: (state.raid?.allies ?? []).map((ally) => ally.operatorId),
    playerReviveAvailable: state.raid?.playerReviveUsed === false,
  }));

  await page.screenshot({ path: 'screenshots/playwright-battlefield.png' });
  const result = { lobby, selected, battlefield, squad, errors, missingResources };
  console.log(JSON.stringify(result, null, 2));
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 1200))]);
  testServer?.kill();
  const failed = errors.length > 0 || missingResources.length > 0 || !lobby.battlefieldCard || !lobby.stashDirectory ||
    selected !== 'battlefield' || battlefield.mode !== 'battlefield' || !battlefield.isBattlefield ||
    battlefield.configuredDuration !== 720 || battlefield.enemies !== 72 || battlefield.allies !== 6 ||
    battlefield.allyOperators.join(',') !== 'assault,assault,medic,medic,engineer,engineer' ||
    battlefield.mapScale !== 1.5 || battlefield.containers < 10 || battlefield.objectives !== 0 ||
    battlefield.extractionCount < 2 || battlefield.distinctEnemyPositions !== 72 || squad.count !== 6 ||
    squad.operators.join(',') !== 'assault,assault,medic,medic,engineer,engineer' || !squad.playerReviveAvailable;
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  testServer?.kill();
  process.exit(1);
});
