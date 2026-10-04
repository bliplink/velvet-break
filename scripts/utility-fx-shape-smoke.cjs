const fs = require('node:fs');
const { chromium } = require('playwright');

function between(text, start, end) {
  const a = text.indexOf(start);
  const b = a >= 0 ? text.indexOf(end, a) : -1;
  return a >= 0 && b > a ? text.slice(a, b) : '';
}

(async () => {
  const operator = fs.readFileSync('src/operator-utility-patch.js', 'utf8');
  const ai = fs.readFileSync('src/ai-combat-patch.js', 'utf8');
  const engineer = fs.readFileSync('src/engineer-patch.js', 'utf8');

  const operatorBurst = between(operator, 'const createUtilityBurst', 'const createSupportSmokeVisual');
  const aiImpact = between(ai, 'const resolveEnemyUtilityImpact', 'const beginEnemyUtilityThrow');
  const stunImpact = between(engineer, 'const detonateStunGrenade', 'const useStunGrenade');

  const staticFailures = [];
  if (/spawnPulse\s*\(/.test(operatorBurst) || /spawnImpactBurst\s*\(/.test(operatorBurst)) {
    staticFailures.push('operator utility still uses spherical pulse/impact burst');
  }
  if (/spawnSmokePuff\s*\(|spawnPulse\s*\(|spawnImpactBurst\s*\(/.test(aiImpact)) {
    staticFailures.push('AI utility impact still uses sphere-based FX');
  }
  if (/spawnPulse\s*\(|spawnImpactBurst\s*\(/.test(stunImpact)) {
    staticFailures.push('Yanfei stun impact still uses sphere-based FX');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=utility-fx-shape-smoke', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      state.save.selectedModeId = 'raid';
      startRaid();
      state.raid.player.dropTimer = 0;

      let sphereCalls = 0;
      const originalSphere = BABYLON.MeshBuilder.CreateSphere;
      BABYLON.MeshBuilder.CreateSphere = function (...args) {
        sphereCalls += 1;
        return originalSphere.apply(this, args);
      };

      let pulseCalls = 0;
      const originalPulse = window.spawnPulse;
      if (typeof originalPulse === 'function') {
        window.spawnPulse = function (...args) {
          pulseCalls += 1;
          return originalPulse.apply(this, args);
        };
      }

      const fx = window.__sdrSpawnUtilityImpactFx;
      const available = typeof fx === 'function';
      if (available) {
        fx(new BABYLON.Vector3(2, 0.08, 2), '#ff8a57', 1.3, 'impact', 4.2, 0.55);
        fx(new BABYLON.Vector3(-2, 0.08, -2), '#8d989d', 1.1, 'smoke', 10, 1.2);
        for (let i = 0; i < 10; i++) updateEffects(0.05);
      }

      BABYLON.MeshBuilder.CreateSphere = originalSphere;
      if (typeof originalPulse === 'function') window.spawnPulse = originalPulse;

      const utilityMeshes = scene.meshes.filter(m =>
        /utility-ring|utility-spark|utility-smoke-plane/.test(String(m.name || ''))
      );

      return {
        available,
        sphereCalls,
        pulseCalls,
        utilityMeshCount: utilityMeshes.length,
      };
    });

    console.log(JSON.stringify({ staticFailures, result, errors }, null, 2));

    if (
      staticFailures.length ||
      !result.available ||
      result.sphereCalls !== 0 ||
      result.pulseCalls !== 0 ||
      result.utilityMeshCount < 3 ||
      errors.length
    ) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
