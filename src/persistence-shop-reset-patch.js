(() => {
  if (window.__sdrPersistenceShopResetPatchApplied) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof persistSave === 'undefined' ||
      typeof getShopEntries === 'undefined' ||
      typeof buyShopEntry === 'undefined' ||
      typeof defaultSave === 'undefined' ||
      typeof renderBasePanel === 'undefined' ||
      typeof notify === 'undefined' ||
      typeof L === 'undefined'
    ) {
      window.setTimeout(boot, 40);
      return;
    }

    if (window.__sdrPersistenceShopResetPatchApplied) return;
    window.__sdrPersistenceShopResetPatchApplied = true;

    const SAVE_KEY = 'iron-extraction-save-v1';
    const ENGINEER_UNLOCK_KEY = 'iron-extraction-engineer-unlocked-v1';
    const RESET_DAY_KEY = 'iron-extraction-reset-day-v1';
    const RESET_PASSWORD = '20251001';
    const REMOVED_PREP_IDS = new Set(['prep_medkit', 'prep_surgical', 'prep_armor']);

    const readStoredSave = () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn('Failed to read purchase persistence snapshot.', error);
        return null;
      }
    };

    const stored = readStoredSave();
    let engineerUnlocked = false;
    try {
      engineerUnlocked =
        localStorage.getItem(ENGINEER_UNLOCK_KEY) === '1' ||
        Boolean(stored?.engineerUnlocked);
    } catch (error) {
      engineerUnlocked = Boolean(stored?.engineerUnlocked);
    }

    if (engineerUnlocked) {
      state.save.engineerUnlocked = true;
      if (stored?.selectedOperatorId === 'engineer') {
        state.save.selectedOperatorId = 'engineer';
      }
    }
    if (typeof stored?.funBountyId === 'string') {
      state.save.funBountyId = stored.funBountyId;
    }

    const persistBefore = persistSave;
    persistSave = function persistPurchasesAcrossRefresh(...args) {
      try {
        if (state.save?.engineerUnlocked) {
          localStorage.setItem(ENGINEER_UNLOCK_KEY, '1');
        } else {
          localStorage.removeItem(ENGINEER_UNLOCK_KEY);
        }
      } catch (error) {
        console.warn('Failed to persist engineer unlock.', error);
      }
      return persistBefore.apply(this, args);
    };

    const shopBefore = getShopEntries;
    getShopEntries = function shopWithoutPrepSubsidies(...args) {
      return shopBefore.apply(this, args).filter((entry) =>
        entry?.kind !== 'prep' && !REMOVED_PREP_IDS.has(entry?.id)
      );
    };

    const buyBefore = buyShopEntry;
    buyShopEntry = function persistentShopPurchase(id, ...args) {
      const result = buyBefore.call(this, id, ...args);
      persistSave();
      window.__sdrPersistenceShopResetDebug.lastPurchasedId = id ?? null;
      return result;
    };

    const localDayKey = () => {
      const now = new Date();
      return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
    };

    const readResetDay = () => {
      try {
        return localStorage.getItem(RESET_DAY_KEY) ?? '';
      } catch (error) {
        console.warn('Failed to read reset limiter.', error);
        return '';
      }
    };

    const secureResetSave = () => {
      const today = localDayKey();
      if (readResetDay() === today) {
        notify(
          L(
            '\u4eca\u5929\u5df2\u7ecf\u91cd\u7f6e\u8fc7\u4e00\u6b21\u5b58\u6863\uff0c\u8bf7\u660e\u5929\u518d\u8bd5\u3002',
            'The save has already been reset once today. Try again tomorrow.',
          ),
          'warning',
        );
        return false;
      }

      const password = window.prompt(
        L('\u8f93\u5165\u91cd\u7f6e\u5bc6\u7801\uff1a', 'Enter reset password:'),
      );
      if (password == null) return false;
      if (password !== RESET_PASSWORD) {
        notify(L('\u91cd\u7f6e\u5bc6\u7801\u9519\u8bef\u3002', 'Incorrect reset password.'), 'danger');
        return false;
      }

      state.save = defaultSave();
      try {
        localStorage.setItem(RESET_DAY_KEY, today);
        localStorage.removeItem(ENGINEER_UNLOCK_KEY);
      } catch (error) {
        console.warn('Failed to persist reset limiter.', error);
      }
      persistSave();
      renderBasePanel();
      notify(
        L(
          '\u672c\u5730\u5b58\u6863\u5df2\u91cd\u7f6e\u3002\u4eca\u5929\u4e0d\u80fd\u518d\u6b21\u91cd\u7f6e\u3002',
          'Local save reset. Another reset is not allowed today.',
        ),
        'warning',
      );
      window.__sdrPersistenceShopResetDebug.resetDay = today;
      return true;
    };

    resetSave = secureResetSave;

    const resetButton = refs?.saveResetButton ?? document.getElementById('saveResetButton');
    resetButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      secureResetSave();
    }, true);

    window.__sdrPersistenceShopResetDebug = {
      version: '2026-09-25-persistence-v1',
      restoredEngineerUnlock: engineerUnlocked,
      removedPrepIds: [...REMOVED_PREP_IDS],
      resetPasswordRequired: true,
      resetDay: readResetDay(),
      lastPurchasedId: null,
      get shopEntries() {
        return getShopEntries().map((entry) => entry.id);
      },
    };

    window.setTimeout(() => {
      if (state.mode === 'base') renderBasePanel();
    }, 0);
  };

  boot();
})();
