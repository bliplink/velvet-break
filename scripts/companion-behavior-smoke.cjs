const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');

const gameUrl = process.env.GAME_URL ?? 'http://127.0.0.1:5531/';
let server = null;

async function ensureServer() {
  try {
    if ((await fetch(gameUrl)).ok) return;
  } catch {}
  server = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      if ((await fetch(gameUrl)).ok) return;
    } catch {}
  }
  throw new Error('Local game server did not start on port 5531');
}

process.on('exit', () => server?.kill());

async function main() {
  await ensureServer();
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${gameUrl}?v=companion-behavior-smoke`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1800);
  await page.locator('#deployButton').click();
  await page.waitForTimeout(1300);

  const baseline = await page.evaluate(() => {
    window.__testRandom = Math.random;
    Math.random = () => 0.05;
    const raid = state.raid;
    const companion = raid.companion;
    const enemy = raid.enemies.find((entry) => !entry.dead && !entry.isRangeTarget);
    enemy.x = companion.x + 4;
    enemy.z = companion.z;
    enemy.alertTimer = 10;
    enemy.investigateTimer = 10;
    enemy.combatState = 'combat';
    enemy.damage = 40;
    enemy.companionShootTimer = 0;
    companion.health = companion.maxHealth;
    companion.shootTimer = 0;
    return {
      companionHealth: companion.health,
      companionBlue: companion.visual?.body?.material?.diffuseColor?.toHexString?.(),
      statusVisible: !document.getElementById('companionStatusPanel')?.classList.contains('hidden'),
      noMedkits: companion.medkits === 0,
    };
  });
  const exchange = await page.evaluate(() => {
    const raid = state.raid;
    updateRaid(0.1);
    const companion = raid.companion;
    const enemy = raid.enemies.find((entry) => entry.id !== 'raid-companion-clone' && !entry.dead && !entry.isRangeTarget);
    return {
      healthAfterEnemyFire: companion.health,
      enemyHealthAfterCompanionFire: enemy?.health ?? null,
      straightTracer: raid.effects.some((effect) => effect.mesh?.name?.startsWith('tracer-')),
      mobilityAction: companion.mobilityAction?.type ?? null,
    };
  });

  const wallVisibility = await page.evaluate(() => {
    const raid = state.raid;
    const player = raid.player;
    const enemy = raid.enemies.find((entry) => !entry.dead && !entry.isRangeTarget);
    const obstacle = obstacleDefs.find((entry) => entry.w >= 8 && entry.d >= 8);
    if (!enemy || !obstacle || typeof syncEnemyRevealOverlays !== 'function') return { available: false };
    player.operatorId = 'assault';
    player.abilityActiveTimer = 0;
    player.reconZone = null;
    player.insideBuildingId = null;
    player.onRoofBuildingId = null;
    enemy.insideBuildingId = null;
    enemy.onRoofBuildingId = null;
    player.x = obstacle.x - obstacle.w / 2 - 2;
    player.z = obstacle.z;
    enemy.x = obstacle.x + obstacle.w / 2 + 2;
    enemy.z = obstacle.z;
    enemy.visual?.root?.setEnabled(true);
    syncEnemyRevealOverlays();
    const blocked = lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z);
    const hidden = enemy.visual?.root?.isEnabled() === false;
    enemy.visual?.root?.setEnabled(true);
    return { available: true, blocked, hidden };
  });

  const rescuePrompt = await page.evaluate(() => {
    const raid = state.raid;
    const player = raid.player;
    const companion = raid.companion;
    raid.playerDowned = false;
    player.downed = false;
    player.x = 0;
    player.z = 0;
    companion.dead = false;
    companion.despawned = false;
    companion.downed = true;
    companion.reviveUsed = false;
    companion.reviveProgress = 0;
    companion.x = 0.8;
    companion.z = 0;
    state.input.interactHeld = false;
    updateRaid(0.05);
    syncHud();
    const nearby = refs.interactionPrompt?.textContent ?? '';
    state.input.interactHeld = true;
    updateRaid(0.1);
    syncHud();
    const active = refs.interactionPrompt?.textContent ?? '';
    const progress = companion.reviveProgress ?? 0;
    state.input.interactHeld = false;
    companion.downed = false;
    companion.health = companion.maxHealth;
    return { nearby, active, progress };
  });

  const mobility = await page.evaluate(() => {
    const raid = state.raid;
    const companion = raid.companion;
    const enemy = raid.enemies.find((entry) => !entry.dead && !entry.isRangeTarget);
    companion.mobilityCooldown = 0;
    enemy.x = companion.x + 4;
    enemy.z = companion.z;
    updateRaid(0.1);
    return { action: companion.mobilityAction?.type ?? null };
  });

  const downedVisual = await page.evaluate(() => {
    const companion = state.raid.companion;
    companion.downed = true;
    updateRaid(0.1);
    const visible = companion.visual?.root?.isEnabled() === true;
    const y = companion.visual?.root?.position?.y ?? -1;
    companion.downed = false;
    companion.health = companion.maxHealth;
    return { visible, y };
  });

  const rescueOrder = await page.evaluate(() => {
    const raid = state.raid;
    const player = raid.player;
    const companion = raid.companion;
    const enemy = raid.enemies.find((entry) => !entry.dead && !entry.isRangeTarget);
    player.x = 0;
    player.z = 0;
    player.downed = true;
    raid.playerDowned = true;
    raid.playerReviveUsed = false;
    companion.x = 0;
    companion.z = 0;
    companion.reviveProgress = 0;
    companion.shootTimer = 0;
    enemy.x = 2.4;
    enemy.z = 0;
    enemy.dead = false;
    enemy.despawned = false;
    enemy.isRangeTarget = false;
    enemy.health = 1000;
    enemy.alertTimer = 10;
    return true;
  });
  await page.evaluate(() => { for (let index = 0; index < 12; index += 1) updateRaid(0.1); });
  const rescueState = await page.evaluate(() => ({
    reviveProgress: state.raid.companion.reviveProgress ?? 0,
    nearbyEnemyHealth: state.raid.enemies.find((entry) => !entry.dead && !entry.isRangeTarget)?.health ?? 0,
  }));

  const secondDown = await page.evaluate(() => {
    const raid = state.raid;
    raid.playerDowned = false;
    raid.playerReviveUsed = true;
    raid.player.downed = false;
    raid.player.health = raid.player.maxHealth;
    applyDamageToPlayer(raid.player.maxHealth + 1);
    return { downed: raid.playerDowned, health: raid.player.health };
  });
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const failure = await page.evaluate(() => ({
    mode: state.mode,
    resultVisible: !refs.resultOverlay.classList.contains('hidden'),
    failed: state.raid?.result?.survived === false,
    replayActive: Boolean(window.__sdrReplayDebug?.active),
  }));

  await page.locator('#returnBaseButton').click();
  await page.waitForTimeout(500);
  await page.locator('#deployButton').click();
  await page.waitForTimeout(900);
  const bothDown = await page.evaluate(() => {
    const raid = state.raid;
    raid.player.downed = true;
    raid.player.health = 1;
    raid.playerDowned = true;
    raid.playerDownedTimer = 20;
    raid.companion.dead = false;
    raid.companion.despawned = false;
    raid.companion.downed = true;
    updateRaid(0.1);
    return {
      mode: state.mode,
      resultVisible: !refs.resultOverlay.classList.contains('hidden'),
      failed: state.raid?.result?.survived === false,
      replayActive: Boolean(window.__sdrReplayDebug?.active),
    };
  });
  await page.evaluate(() => { if (window.__testRandom) Math.random = window.__testRandom; });

  const result = { baseline, exchange, wallVisibility, rescuePrompt, mobility, rescueOrder, rescueState, secondDown, failure, bothDown, errors };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  const passed = baseline.companionBlue?.toLowerCase() === '#268bd2' && baseline.statusVisible && baseline.noMedkits &&
    exchange.healthAfterEnemyFire < baseline.companionHealth &&
    exchange.enemyHealthAfterCompanionFire < 1000 &&
    exchange.straightTracer && wallVisibility.available && wallVisibility.blocked && wallVisibility.hidden &&
    rescuePrompt.nearby.includes('1') && rescuePrompt.active.includes('救援') && rescuePrompt.progress > 0 &&
    mobility.action !== null && downedVisual.visible && downedVisual.y >= 0 &&
    rescueState.reviveProgress < 0.4 && secondDown.downed && failure.resultVisible && failure.failed &&
    !failure.replayActive && bothDown.resultVisible && bothDown.failed && !bothDown.replayActive && errors.length === 0;
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
