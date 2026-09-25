const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:5531/?v=persistence-reset-smoke', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const seeded = await page.evaluate(() => {
      localStorage.removeItem('iron-extraction-reset-day-v1');
      state.save.money = 500000;
      state.save.engineerUnlocked = true;
      state.save.selectedOperatorId = 'engineer';
      state.save.upgrades.bagLevel = 2;
      state.save.upgrades.weaponLevel = 3;
      if (!state.save.armory.ownedWeapons.includes('smg')) state.save.armory.ownedWeapons.push('smg');
      if (!state.save.armory.ownedParts.includes('red_dot')) state.save.armory.ownedParts.push('red_dot');
      state.save.armory.selectedWeaponId = 'smg';
      persistSave();
      return JSON.parse(localStorage.getItem('iron-extraction-save-v1'));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const afterReload = await page.evaluate(() => ({
      engineerUnlocked: Boolean(state.save.engineerUnlocked),
      selectedOperatorId: state.save.selectedOperatorId,
      bagLevel: state.save.upgrades.bagLevel,
      weaponLevel: state.save.upgrades.weaponLevel,
      ownsSmg: state.save.armory.ownedWeapons.includes('smg'),
      ownsRedDot: state.save.armory.ownedParts.includes('red_dot'),
      selectedWeaponId: state.save.armory.selectedWeaponId,
      shopHasPrep: window.__sdrPersistenceDebug?.shopHasPrep?.() ?? true,
      renderedPrepProducts: Array.from(document.querySelectorAll('#shopList [data-shop-id]'))
        .some(button => String(button.dataset.shopId || '').startsWith('prep_')),
      emergencyFundingPresent: getShopEntries().some(entry => entry.id === 'emergency_funding') ||
        Boolean(document.querySelector('#shopList [data-shop-id="emergency_funding"]')),
      persistenceVersion: window.__sdrPersistenceDebug?.version ?? null,
    }));

    const wrongPassword = await page.evaluate(() => {
      const before = JSON.stringify(state.save);
      window.prompt = () => 'wrong-password';
      refs.saveResetButton.click();
      return {
        unchanged: JSON.stringify(state.save) === before,
        dayMarker: localStorage.getItem('iron-extraction-reset-day-v1'),
      };
    });

    const firstReset = await page.evaluate(() => {
      window.prompt = () => '20251001';
      refs.saveResetButton.click();
      return {
        money: state.save.money,
        engineerUnlocked: Boolean(state.save.engineerUnlocked),
        ownedWeapons: [...state.save.armory.ownedWeapons],
        ownedParts: [...state.save.armory.ownedParts],
        bagLevel: state.save.upgrades.bagLevel,
        weaponLevel: state.save.upgrades.weaponLevel,
        dayMarker: localStorage.getItem('iron-extraction-reset-day-v1'),
        today: window.__sdrPersistenceDebug?.getLocalDayKey?.() ?? null,
      };
    });

    const secondReset = await page.evaluate(() => {
      state.save.money = 999;
      persistSave();
      window.prompt = () => '20251001';
      refs.saveResetButton.click();
      return {
        money: state.save.money,
        dayMarker: localStorage.getItem('iron-extraction-reset-day-v1'),
      };
    });

    console.log(JSON.stringify({ seeded, afterReload, wrongPassword, firstReset, secondReset, errors }, null, 2));

    const ok = Boolean(
      seeded.engineerUnlocked === true &&
      seeded.selectedOperatorId === 'engineer' &&
      afterReload.engineerUnlocked === true &&
      afterReload.selectedOperatorId === 'engineer' &&
      afterReload.bagLevel === 2 &&
      afterReload.weaponLevel === 3 &&
      afterReload.ownsSmg &&
      afterReload.ownsRedDot &&
      afterReload.selectedWeaponId === 'smg' &&
      afterReload.shopHasPrep === true &&
      afterReload.renderedPrepProducts === true &&
      afterReload.emergencyFundingPresent === false &&
      afterReload.persistenceVersion === '2026-09-25-persistence-v2' &&
      wrongPassword.unchanged &&
      !wrongPassword.dayMarker &&
      firstReset.money === 18000 &&
      !firstReset.engineerUnlocked &&
      firstReset.ownedWeapons.length === 1 &&
      firstReset.ownedWeapons[0] === 'rifle' &&
      firstReset.ownedParts.length === 0 &&
      firstReset.bagLevel === 0 &&
      firstReset.weaponLevel === 0 &&
      firstReset.dayMarker === firstReset.today &&
      secondReset.money === 999 &&
      secondReset.dayMarker === firstReset.today &&
      errors.length === 0
    );

    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
