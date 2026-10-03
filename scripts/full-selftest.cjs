const { spawnSync } = require('node:child_process');

const checks = [
  ['browser', 'npm', ['run', 'test:browser']],
  ['death-replay', 'node', ['scripts/death-replay-smoke.cjs']],
  ['visual-overhaul', 'node', ['scripts/visual-overhaul-smoke.cjs']],
  ['window-opacity', 'node', ['scripts/window-opacity-smoke.cjs']],
  ['performance-rescue', 'node', ['scripts/performance-rescue-smoke.cjs']],
  ['fair-vision-canister', 'node', ['scripts/fair-vision-canister-smoke.cjs']],
  ['polish-v2', 'node', ['scripts/polish-v2-smoke.cjs']],
  ['operator-regression', 'node', ['scripts/operator-regression.cjs']],
  ['operator-power-live', 'node', ['scripts/operator-power-smoke.cjs']],
  ['combat-polish', 'node', ['scripts/combat-polish-smoke.cjs']],
  ['echo-persistence', 'node', ['scripts/echo-persistence-smoke.cjs']],
  ['persistence-reset', 'node', ['scripts/persistence-reset-smoke.cjs']],
  ['raid-loop-v2', 'node', ['scripts/raid-loop-v2-smoke.cjs']],
  ['tactical-loop', 'node', ['scripts/tactical-loop-smoke.cjs']],
  ['performance-blitz', 'node', ['scripts/performance-blitz-smoke.cjs']],
  ['lockdown-easter-egg', 'node', ['scripts/lockdown-easter-egg-smoke.cjs']],
  ['nameless-reset', 'node', ['scripts/nameless-reset-smoke.cjs']],
  ['black-tide', 'node', ['scripts/black-tide-content-smoke.cjs']],
];

const results = [];
for (const [name, cmd, args] of checks) {
  process.stdout.write(`\n===== SELFTEST ${name} =====\n`);
  const started = Date.now();
  const run = spawnSync(cmd, args, { encoding: 'utf8', env: process.env, maxBuffer: 20 * 1024 * 1024 });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  const ok = run.status === 0;
  results.push({ name, ok, exitCode: run.status, ms: Date.now() - started });
  process.stdout.write(`===== ${name}: ${ok ? 'PASS' : 'FAIL'} =====\n`);
}
process.stdout.write('\n===== FULL SELFTEST SUMMARY =====\n');
for (const row of results) {
  process.stdout.write(`${row.ok ? 'PASS' : 'FAIL'}\t${row.name}\t${(row.ms / 1000).toFixed(1)}s\n`);
}
const failed = results.filter(r => !r.ok);
process.stdout.write(`TOTAL ${results.length} | PASS ${results.length - failed.length} | FAIL ${failed.length}\n`);
if (failed.length) {
  process.stdout.write(`FAILED: ${failed.map(r => r.name).join(', ')}\n`);
  process.exitCode = 1;
}
