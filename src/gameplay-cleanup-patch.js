(() => {
  if (window.__sdrGameplayCleanupPatchApplied || window.__sdrGameplayCleanupPatchWaiting) return;

  const boot = () => {
    if (
      typeof state === 'undefined' || typeof getLobbyModeDefs === 'undefined' ||
      typeof renderBasePanel === 'undefined' || typeof persistSave === 'undefined' ||
      typeof createContainerVisual === 'undefined' || typeof createSwitchVisual === 'undefined' ||
      typeof createExtractionVisual === 'undefined' || typeof clearRaid === 'undefined' ||
      typeof applyStaticLanguage === 'undefined' || typeof startRaid === 'undefined' ||
      typeof syncRaidPanelCollapses === 'undefined'
    ) {
      window.__sdrGameplayCleanupPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrGameplayCleanupPatchWaiting = false;
    if (window.__sdrGameplayCleanupPatchApplied) return;
    window.__sdrGameplayCleanupPatchApplied = true;

    const getModesBeforeCleanup = getLobbyModeDefs;
    getLobbyModeDefs = function getModesWithoutPurgeContract() {
      const modes = getModesBeforeCleanup();
      if (modes && Object.prototype.hasOwnProperty.call(modes, 'contract')) {
        delete modes.contract;
      }
      if (modes?.raid && !modes.battlefield) {
        const raid = modes.raid;
        modes.battlefield = {
          ...raid,
          id: 'battlefield',
          nameZh: '大战场',
          nameEn: 'Battlefield',
          summaryZh: '高密度大型交战。44 名敌人分布在整张地图，完成清敌目标后撤离。',
          summaryEn: 'Large-scale combat with 44 hostiles across the map. Clear the combat objective, then extract.',
          detailZh: '12 分钟大型战斗，保留双撤离结构；与封锁区使用独立的人机数量预算。',
          detailEn: '12-minute large battle with dual extractions and a separate AI population budget from Lockdown.',
          deployZh: '进入大战场',
          deployEn: 'Enter Battlefield',
          duration: 12 * 60,
          bonusReward: 5200,
          objectiveFactory: () => ([
            { id: 'kill', label: L('击倒', 'Eliminate'), target: 20, progress: 0 },
          ]),
          buildLayout: raid.buildLayout,
          getStartInteractionText() {
            return L('大战场目标：击倒 20 名敌人后前往撤离点。', 'Battlefield objective: eliminate 20 hostiles, then extract.');
          },
          getStartNotice() {
            return L('已进入大战场：44 名敌人已部署，完成 20 次击倒后撤离。', 'Battlefield entered: 44 hostiles deployed. Eliminate 20, then extract.');
          },
        };
      }
      return modes;
    };

    const addSolidProp = (id, x, z, w, d, h) => {
      if (!Number.isFinite(x) || !Number.isFinite(z) || obstacleDefs.some((entry) => entry.id === id)) return;
      obstacleDefs.push({ id, x, z, w, d, h, hiddenOnMap: true, temporaryProp: true });
    };
    const createSwitchBeforeSolids = createSwitchVisual;
    createSwitchVisual = function createSolidSwitch(point) {
      const visual = createSwitchBeforeSolids(point);
      addSolidProp(`prop-switch-${point.id}`, point.x, point.z, 0.85, 0.85, 1.6);
      return visual;
    };
    const createExtractionBeforeSolids = createExtractionVisual;
    createExtractionVisual = function createSolidExtraction(zone) {
      const visual = createExtractionBeforeSolids(zone);
      for (let index = 0; index < 4; index++) {
        const angle = Math.PI * 2 * index / 4 + Math.PI / 4;
        addSolidProp(`prop-extract-pylon-${zone.id}-${index}`,
          zone.x + Math.cos(angle) * zone.radius * 0.82,
          zone.z + Math.sin(angle) * zone.radius * 0.82, 0.6, 0.6, 2.5);
      }
      addSolidProp(`prop-extract-gate-left-${zone.id}`, zone.x - zone.radius - 1.5, zone.z, 0.7, 0.8, 3.4);
      addSolidProp(`prop-extract-gate-right-${zone.id}`, zone.x + zone.radius + 1.5, zone.z, 0.7, 0.8, 3.4);
      return visual;
    };
    const clearRaidBeforeSolids = clearRaid;
    clearRaid = function clearTemporaryPropColliders() {
      for (let index = obstacleDefs.length - 1; index >= 0; index--) {
        if (obstacleDefs[index].temporaryProp) obstacleDefs.splice(index, 1);
      }
      return clearRaidBeforeSolids();
    };

    const polishVisibleCopy = () => {
      if (typeof document === 'undefined') return;
      const set = (id, zh, en) => {
        const element = document.getElementById(id);
        if (element) element.textContent = L(zh, en);
      };
      set('operatorNote', '干员仅可在大厅切换；技能与专属道具随干员变化。',
        'Operators can only be changed in the lobby. Skills and utility vary by operator.');
      set('tipAction', 'Q 治疗 · E 交互/撤离 · Z 趴下 · V 翻滚 · X 躲闪 · M 地图 · C 技能 · B 处决',
        'Q heal · E interact/extract · Z prone · V roll · X dodge · M map · C skill · B execute');
    };
    const applyLanguageBeforeCopy = applyStaticLanguage;
    applyStaticLanguage = function applyPolishedCopy() {
      const result = applyLanguageBeforeCopy();
      polishVisibleCopy();
      return result;
    };
    const renderBaseBeforeCopy = renderBasePanel;
    renderBasePanel = function renderPolishedBase() {
      const result = renderBaseBeforeCopy();
      polishVisibleCopy();
      return result;
    };
    const startRaidBeforeLayout = startRaid;
    startRaid = function startWithCompactPanels(...args) {
      const result = startRaidBeforeLayout(...args);
      if (state.mode === 'raid' && state.ui) {
        state.ui.raidPanelCollapsed = { raidLoadoutList: true, raidAmmoRail: true, raidBagList: false };
        syncRaidPanelCollapses();
      }
      return result;
    };
    window.__sdrPatchedStartRaid = startRaid;

    if (state.save?.selectedModeId === 'contract') {
      state.save.selectedModeId = 'raid';
      persistSave();
    }
    if (state.mode === 'base') renderBasePanel();
  };

  boot();
})();
