const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=enemy-occlusion-smoke', { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      state.save.selectedOperatorId = 'assault';
      state.save.selectedModeId = 'raid';
      startRaid();
      const raid = state.raid;
      raid.player.dropTimer = 0;
      for (let i = 0; i < 5; i++) updateRaid(0.05);

      const normal = raid.enemies.filter(e => !e.dead && e.visual);
      const normalViolations = normal.flatMap(enemy => {
        const issues = [];
        for (const mesh of enemy.visual.overlayMeshes ?? []) {
          if (mesh?.renderOverlay || (mesh?.overlayAlpha ?? 0) > 0.001 || mesh?.renderingGroupId !== 0) {
            issues.push(`${enemy.id}:overlay:${mesh?.name}`);
          }
        }
        for (const mesh of enemy.visual.revealMeshes ?? []) {
          if (mesh?.isEnabled?.() !== false || mesh?.isVisible !== false || mesh?.renderingGroupId !== 0) {
            issues.push(`${enemy.id}:reveal:${mesh?.name}`);
          }
        }
        if ((enemy.visual.revealMaterial?.alpha ?? 0) > 0.001) issues.push(`${enemy.id}:revealMaterial`);
        if ((enemy.visual.classLabelMaterial?.alpha ?? 0) > 0.001) issues.push(`${enemy.id}:classLabelMaterial`);
        return issues;
      });

      return {
        enemyCount: normal.length,
        violations: normalViolations.slice(0, 30),
      };
    });

    console.log(JSON.stringify({ result, errors }, null, 2));
    if (result.enemyCount < 1 || result.violations.length || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
