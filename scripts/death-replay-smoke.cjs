const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('http://127.0.0.1:5531/?v=death-replay-smoke', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      startRaid();
      state.raid.player.dropTimer = 0;
      for (let i = 0; i < 38; i++) update(0.08);

      const attacker = state.raid.enemies.find(enemy => !enemy.dead);
      if (attacker) {
        state.raid.replayAttackerId = attacker.id;
        attacker.x = state.raid.player.x + 18;
        attacker.z = state.raid.player.z + 4;
        attacker.heading = Math.atan2(
          state.raid.player.x - attacker.x,
          state.raid.player.z - attacker.z,
        );
      }

      state.input.fireHeld = true;
      state.raid.player.fireCooldown = 0.12;
      for (let i = 0; i < 10; i++) update(0.06);
      state.input.fireHeld = false;

      state.raid.player.reloadTimer = 0.9;
      for (let i = 0; i < 8; i++) update(0.06);

      state.raid.player.mobilityAction = {
        type: 'dodge',
        timer: 0.42,
        duration: 0.42,
        dirX: 1,
        dirZ: 0,
      };
      for (let i = 0; i < 5; i++) update(0.06);
      state.raid.player.mobilityAction = null;

      for (let i = 0; i < 10; i++) update(0.06);
      finishRaid(false, 'player_killed', false);
    });

    const active = await page.evaluate(() => ({
      mode: state.mode,
      replay: window.__sdrReplayDebug?.active,
      visible: !document.getElementById('deathReplayOverlay')?.classList.contains('hidden'),
      title: document.getElementById('deathReplayTitle')?.textContent,
      source: document.getElementById('deathReplaySource')?.textContent,
      distance: document.getElementById('deathReplayDistance')?.textContent,
      result: !refs.resultOverlay.classList.contains('hidden'),
      version: window.__sdrReplayDebug?.version,
      duration: window.__sdrReplayDebug?.duration,
      recordedActions: window.__sdrReplayDebug?.recordedPlayerActions ?? [],
      currentAction: window.__sdrReplayDebug?.currentPlayerAction ?? null,
      phase: document.getElementById('deathReplayPhase')?.textContent,
      impactText: document.getElementById('deathReplayImpactText')?.textContent,
    }));

    await page.evaluate(() => {
      let guard = 0;
      while (
        window.__sdrReplayDebug?.active &&
        window.__sdrReplayDebug.elapsed < window.__sdrReplayDebug.duration * 0.86 &&
        guard < 120
      ) {
        update(0.1);
        guard++;
      }
    });

    const impact = await page.evaluate(() => ({
      active: window.__sdrReplayDebug?.active,
      impactShown: window.__sdrReplayDebug?.impactShown,
      phase: document.getElementById('deathReplayPhase')?.textContent,
      progress: document.getElementById('deathReplayProgress')?.style.width,
      hudDimmed: document.getElementById('hud')?.classList.contains('replay-dim'),
      tracerShown: window.__sdrReplayDebug?.tracerShown,
      freezeShown: window.__sdrReplayDebug?.freezeShown,
      killerViewShown: window.__sdrReplayDebug?.killerViewShown,
      cameraCollisionChecks: window.__sdrReplayDebug?.cameraCollisionChecks,
      perspective: document.getElementById('deathReplayPerspective')?.textContent,
      impactText: document.getElementById('deathReplayImpactText')?.textContent,
      cameraFov: camera.fov,
    }));

    await page.screenshot({ path: 'screenshots/death-replay-killcam-v2.png' });

    if (impact.active) await page.keyboard.press('Escape');

    const skipped = await page.evaluate(() => ({
      mode: state.mode,
      replay: window.__sdrReplayDebug?.active,
      result: !refs.resultOverlay.classList.contains('hidden'),
      hudDimmed: document.getElementById('hud')?.classList.contains('replay-dim'),
    }));

    console.log(JSON.stringify({ active, impact, skipped, errors }, null, 2));

    if (
      active.mode !== 'replay' ||
      !active.replay ||
      !active.visible ||
      !active.title.includes('淘汰回放') ||
      active.result ||
      active.version !== '2026-10-03-killcam-v4' ||
      active.duration < 3.5 ||
      !active.recordedActions.some(action => /开火|FIRING/.test(action)) ||
      !active.recordedActions.some(action => /换弹|RELOADING/.test(action)) ||
      !active.recordedActions.some(action => /闪避|DODGING/.test(action)) ||
      !active.phase?.includes('玩家当时') ||
      !active.impactText ||
      !impact.impactShown ||
      !impact.tracerShown ||
      !impact.freezeShown ||
      !impact.killerViewShown ||
      !(impact.cameraCollisionChecks > 0) ||
      !impact.phase?.includes('致命一击') ||
      !impact.perspective ||
      !impact.impactText ||
      !(impact.cameraFov <= 0.64) ||
      !impact.progress ||
      skipped.mode !== 'result' ||
      skipped.replay ||
      !skipped.result ||
      skipped.hudDimmed ||
      errors.length
    ) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
