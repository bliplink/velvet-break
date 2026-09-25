(() => {
  if (window.__sdrBlackTidePreloadApplied) return;
  window.__sdrBlackTidePreloadApplied = true;
  const preload = {
    selectedOperatorId: null,
    selectedModeId: null,
    lingshuangUnlocked: false,
  };
  try {
    const raw = localStorage.getItem('iron-extraction-save-v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      preload.selectedOperatorId = parsed?.selectedOperatorId ?? null;
      preload.selectedModeId = parsed?.selectedModeId ?? null;
      preload.lingshuangUnlocked = Boolean(parsed?.lingshuangUnlocked);
      if (typeof state !== 'undefined' && state?.save) {
        if (preload.lingshuangUnlocked) state.save.lingshuangUnlocked = true;
        if (preload.selectedModeId === 'blacktide') state.save.selectedModeId = 'blacktide';
      }
    }
  } catch (error) {
    console.warn('Black Tide preload restore failed.', error);
  }
  window.__sdrBlackTidePreload = preload;
})();
