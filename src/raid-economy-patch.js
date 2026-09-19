(() => {
  if (window.__sdrRaidEconomyWaiting || window.__sdrRaidEconomyApplied) return;

  const boot = () => {
    if (typeof AMMO_DEFS === 'undefined' || typeof PART_DEFS === 'undefined' || typeof lootCatalog === 'undefined') {
      window.__sdrRaidEconomyWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }
    window.__sdrRaidEconomyWaiting = false;
    if (window.__sdrRaidEconomyApplied) return;
    window.__sdrRaidEconomyApplied = true;

    const buyMultiplier = 1.25;
    const sellMultiplier = 1.35;
    for (const ammo of Object.values(AMMO_DEFS)) {
      ammo.price = Math.round(ammo.price * buyMultiplier);
      ammo.sellValue = Math.round(ammo.sellValue * sellMultiplier);
    }
    for (const part of Object.values(PART_DEFS)) {
      part.price = Math.round(part.price * buyMultiplier);
      part.value = Math.round(part.value * sellMultiplier);
    }
    for (const item of lootCatalog) {
      if (item.itemType === 'ammo' && AMMO_DEFS[item.ammoId]) {
        item.value = AMMO_DEFS[item.ammoId].sellValue;
      } else if (item.itemType === 'part' && PART_DEFS[item.partId]) {
        item.value = PART_DEFS[item.partId].value;
      } else {
        item.value = Math.round(item.value * sellMultiplier);
      }
    }
    for (const item of state.save?.stash ?? []) {
      item.value = Math.round(Number(item.value ?? 0) * sellMultiplier);
    }
    if (typeof renderBasePanel === 'function' && state.mode === 'base') renderBasePanel();
  };

  boot();
})();
