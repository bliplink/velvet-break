const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {
  window: { setTimeout: () => { throw new Error('cleanup patch failed to initialize'); } },
  state: { mode: 'base', save: { selectedModeId: 'contract' }, ui: {} },
  getLobbyModeDefs: () => ({ raid: { id: 'raid' }, contract: { id: 'contract' } }),
  renderCount: 0,
  persistCount: 0,
  obstacleDefs: [],
};
context.renderBasePanel = () => { context.renderCount += 1; };
context.persistSave = () => { context.persistCount += 1; };
context.applyStaticLanguage = () => {};
context.startRaid = () => { context.state.mode = 'raid'; };
context.syncRaidPanelCollapses = () => {};
context.createContainerVisual = () => ({});
context.createSwitchVisual = () => ({});
context.createExtractionVisual = () => ({});
context.clearRaid = () => {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/gameplay-cleanup-patch.js'), 'utf8'), context);

assert.deepEqual(Object.keys(context.getLobbyModeDefs()), ['raid']);
assert.equal(context.state.save.selectedModeId, 'raid');
assert.equal(context.persistCount, 1);
assert.equal(context.renderCount, 1);
context.createContainerVisual({ id: 'loot-a', x: 2, z: 3 });
context.createSwitchVisual({ id: 'lever-a', x: 8, z: 9 });
context.createExtractionVisual({ id: 'extract-a', x: 12, z: 14, radius: 5 });
assert.equal(context.obstacleDefs.length, 8, 'search boxes, switch, and extraction pillars should all be solid');
context.clearRaid();
assert.equal(context.obstacleDefs.length, 0, 'temporary colliders must not leak into the next raid');
context.startRaid();
assert.equal(context.state.ui.raidPanelCollapsed.raidLoadoutList, true);
assert.equal(context.state.ui.raidPanelCollapsed.raidAmmoRail, true);
console.log('PASS: purge contract removed, old saves migrate, prop collision clears, raid panels default compact.');
