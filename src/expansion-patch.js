(() => {
  if (window.__sdrExpansionPatchApplied || window.__sdrExpansionPatchWaiting) {
    return;
  }

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof refs === 'undefined' ||
      typeof startRaid === 'undefined' ||
      typeof clearRaid === 'undefined' ||
      typeof finishRaid === 'undefined' ||
      typeof setMode === 'undefined' ||
      typeof renderBasePanel === 'undefined' ||
      typeof renderOperatorPanel === 'undefined' ||
      typeof renderRaidLoadoutMarkup === 'undefined' ||
      typeof getOperatorDefs === 'undefined' ||
      typeof getOperatorOrder === 'undefined' ||
      typeof setSelectedOperator === 'undefined' ||
      typeof getPlayerOperatorDef === 'undefined' ||
      typeof getCurrentPlayerWeaponStats === 'undefined' ||
      typeof getPlayerMoveSpeed === 'undefined' ||
      typeof beginPlayerUseAction === 'undefined' ||
      typeof useOperatorAbility === 'undefined' ||
      typeof useOperatorUtility === 'undefined' ||
      typeof attemptShoot === 'undefined' ||
      typeof updateRaid === 'undefined' ||
      typeof updateEnemies === 'undefined' ||
      typeof updatePlayer === 'undefined' ||
      typeof damageEnemy === 'undefined' ||
      typeof applyDamageToPlayer === 'undefined' ||
      typeof createEnemy === 'undefined' ||
      typeof createEnemyVisual === 'undefined' ||
      typeof createExtractionVisual === 'undefined' ||
      typeof findLootDefById === 'undefined' ||
      typeof normalizeItemInstance === 'undefined' ||
      typeof makeAmmoLootDef === 'undefined' ||
      typeof makePartLootDef === 'undefined' ||
      typeof resolveStaticPlacement === 'undefined' ||
      typeof spawnPulse === 'undefined' ||
      typeof spawnImpactBurst === 'undefined' ||
      typeof playImpactAudio === 'undefined' ||
      typeof disposeVisual === 'undefined' ||
      typeof syncHud === 'undefined' ||
      typeof persistSave === 'undefined' ||
      typeof prepRow === 'undefined' ||
      typeof distance2D === 'undefined' ||
      typeof lineOfSightBlocked === 'undefined' ||
      typeof randomBetween === 'undefined' ||
      typeof clamp === 'undefined' ||
      typeof lerp === 'undefined' ||
      typeof getPlayerViewHeight === 'undefined' ||
      typeof syncPlayerCamera === 'undefined' ||
      typeof applyStaticLanguage === 'undefined' ||
      typeof formatMoney === 'undefined' ||
      typeof formatItemCount === 'undefined' ||
      typeof getWeaponLabel === 'undefined' ||
      typeof getAmmoTierLabel === 'undefined' ||
      typeof getCurrentReserveAmmo === 'undefined' ||
      typeof L === 'undefined' ||
      typeof BABYLON === 'undefined'
    ) {
      window.__sdrExpansionPatchWaiting = true;
      window.setTimeout(boot, 60);
      return;
    }

    window.__sdrExpansionPatchWaiting = false;
    if (window.__sdrExpansionPatchApplied) {
      return;
    }
    window.__sdrExpansionPatchApplied = true;

    const EXPANSION_STORAGE_KEY = 'sou-da-che-expansion-v1';
    const CUSTOM_OPERATOR_IDS = ['vanguard', 'saboteur', 'quartermaster'];
    const CUSTOM_RANGE_TARGET_COUNT = 10;
    const EXECUTION_KEY_CODE = 'KeyB';
    const EXECUTION_KEY_LABEL = 'B';
    const EXECUTION_RANGE = 2.45;
    const RANGE_EXIT_RADIUS = 4.4;
    const RANGE_DURATION = 30 * 60;
    const BATCH_SELECTION = new Set();

    const CUSTOM_WEAPONS = {
      carbine: {
        id: 'carbine',
        name: 'Falcon Carbine',
        caliber: '6.8',
        magSize: 28,
        baseReserve: 84,
        damage: 36,
        damageGain: 5,
        fireRate: 6.1,
        reload: 1.55,
        spread: 0.0075,
        pellets: 1,
        range: 132,
        tracer: '#ffe6a6',
        defaultAmmoId: 'carbine_fmj',
        unlockPrice: 13200,
      },
      pdw: {
        id: 'pdw',
        name: 'Wisp PDW',
        caliber: '.45',
        magSize: 42,
        baseReserve: 126,
        damage: 20,
        damageGain: 3,
        fireRate: 9.4,
        reload: 1.28,
        spread: 0.012,
        pellets: 1,
        range: 94,
        tracer: '#9df5cf',
        defaultAmmoId: 'pdw_ball',
        unlockPrice: 11600,
      },
      battle_rifle: {
        id: 'battle_rifle',
        name: 'Atlas Battle Rifle',
        caliber: '7.62x51',
        magSize: 24,
        baseReserve: 72,
        damage: 52,
        damageGain: 6,
        fireRate: 2.9,
        reload: 1.92,
        spread: 0.006,
        pellets: 1,
        range: 168,
        tracer: '#ffd2a4',
        defaultAmmoId: 'battle_fmj',
        unlockPrice: 15600,
      },
    };

    const CUSTOM_AMMO = {
      carbine_fmj: { id: 'carbine_fmj', name: '6.8 FMJ I', weaponIds: ['carbine'], caliber: '6.8', tierLabel: 'Tier I', price: 760, packSize: 40, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 900, weight: 1.0 },
      carbine_ap: { id: 'carbine_ap', name: '6.8 AP II', weaponIds: ['carbine'], caliber: '6.8', tierLabel: 'Tier II', price: 1280, packSize: 36, damageBonus: 4, spreadMult: 0.92, rangeBonus: 8, rarity: 'uncommon', pool: 'weapon', sellValue: 1520, weight: 0.9 },
      carbine_match: { id: 'carbine_match', name: '6.8 Match III', weaponIds: ['carbine'], caliber: '6.8', tierLabel: 'Tier III', price: 1760, packSize: 32, damageBonus: 6, spreadMult: 0.82, rangeBonus: 12, rarity: 'rare', pool: 'valuable', sellValue: 2040, weight: 0.85 },
      pdw_ball: { id: 'pdw_ball', name: '.45 Ball I', weaponIds: ['pdw'], caliber: '.45', tierLabel: 'Tier I', price: 620, packSize: 70, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 720, weight: 1.2 },
      pdw_jhp: { id: 'pdw_jhp', name: '.45 JHP II', weaponIds: ['pdw'], caliber: '.45', tierLabel: 'Tier II', price: 1040, packSize: 62, damageBonus: 3, spreadMult: 0.9, rangeBonus: 4, rarity: 'uncommon', pool: 'weapon', sellValue: 1220, weight: 1.1 },
      pdw_ap: { id: 'pdw_ap', name: '.45 AP III', weaponIds: ['pdw'], caliber: '.45', tierLabel: 'Tier III', price: 1540, packSize: 56, damageBonus: 5, spreadMult: 0.84, rangeBonus: 8, rarity: 'rare', pool: 'valuable', sellValue: 1800, weight: 1.0 },
      battle_fmj: { id: 'battle_fmj', name: '7.62x51 FMJ I', weaponIds: ['battle_rifle'], caliber: '7.62x51', tierLabel: 'Tier I', price: 840, packSize: 28, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 980, weight: 0.9 },
      battle_ap: { id: 'battle_ap', name: '7.62x51 AP II', weaponIds: ['battle_rifle'], caliber: '7.62x51', tierLabel: 'Tier II', price: 1480, packSize: 24, damageBonus: 6, spreadMult: 0.9, rangeBonus: 10, rarity: 'rare', pool: 'valuable', sellValue: 1780, weight: 0.82 },
    };

    const CUSTOM_PARTS = {
      holo_sight: { id: 'holo_sight', name: 'Holo Sight', slot: 'optic', compatibleWeapons: ['rifle', 'smg', 'carbine', 'pdw', 'battle_rifle', 'dmr'], price: 2600, value: 2060, weight: 0.4, rarity: 'rare', category: 'Gun Part', spreadMult: 0.82, pool: 'weapon' },
      drum_mag: { id: 'drum_mag', name: 'Drum Mag', slot: 'mag', compatibleWeapons: ['smg', 'pdw', 'carbine'], price: 3300, value: 2600, weight: 1.0, rarity: 'rare', category: 'Gun Part', magBonus: 18, pool: 'weapon' },
      suppressor: { id: 'suppressor', name: 'Suppressor', slot: 'muzzle', compatibleWeapons: ['rifle', 'carbine', 'pdw', 'battle_rifle', 'dmr'], price: 3100, value: 2460, weight: 0.6, rarity: 'rare', category: 'Gun Part', spreadMult: 0.86, rangeBonus: 6, pool: 'tech' },
      heavy_stock: { id: 'heavy_stock', name: 'Heavy Stock', slot: 'stock', compatibleWeapons: ['rifle', 'carbine', 'battle_rifle', 'dmr'], price: 2700, value: 2140, weight: 0.7, rarity: 'uncommon', category: 'Gun Part', spreadMult: 0.88, reloadMult: 0.94, pool: 'weapon' },
      angled_grip: { id: 'angled_grip', name: 'Angled Grip', slot: 'rail', compatibleWeapons: ['rifle', 'smg', 'carbine', 'pdw'], price: 2200, value: 1720, weight: 0.35, rarity: 'uncommon', category: 'Gun Part', spreadMult: 0.9, fireRateBonus: 0.2, pool: 'tech' },
    };

    const EXTRA_LOOT = [
      { id: 'signal_decoder', name: 'Signal Decoder', category: 'Tech', rarity: 'rare', value: 5200, weight: 0.7, pools: ['tech', 'valuable'], spawnWeight: 7 },
      { id: 'alloy_block', name: 'Alloy Block', category: 'Hardware', rarity: 'uncommon', value: 2600, weight: 1.2, pools: ['weapon', 'tech'], spawnWeight: 13 },
      { id: 'sealed_docket', name: 'Sealed Docket', category: 'Data', rarity: 'epic', value: 11200, weight: 0.3, pools: ['valuable'], spawnWeight: 4.2 },
      { id: 'stabilizer_core', name: 'Stabilizer Core', category: 'Tech', rarity: 'legendary', value: 18200, weight: 1.5, pools: ['tech', 'valuable'], spawnWeight: 2.3 },
      { id: 'blood_ruby_chip', name: 'Blood Ruby Chip', category: 'Relic', rarity: 'red', value: 56000, weight: 0.7, pools: ['valuable'], spawnWeight: 0.28 },
    ];

    const CUSTOM_OPERATOR_DEFS = {
      vanguard: {
        id: 'vanguard',
        nameZh: '维克托',
        nameEn: 'Victor',
        passiveZh: '男 · 装甲先锋，开局护甲更高，举枪推进更稳。',
        passiveEn: 'Male · Armored vanguard with a heavier opening armor stack and steadier aim on the push.',
        skillNameZh: '壁垒驱动',
        skillNameEn: 'Bulwark Drive',
        skillTextZh: '18 秒内立刻获得 220 护甲，受到伤害降低 40%，瞄准时不再减速。',
        skillTextEn: 'For 18s gain 220 armor instantly, reduce incoming damage by 40%, and remove ADS slow.',
        itemNameZh: '装甲拼接器',
        itemNameEn: 'Armor Splicer',
        moveMult: 0.98,
        spreadMult: 0.94,
        reloadMult: 0.98,
        detectMult: 1,
        healBonus: 0,
        healCooldownMult: 1,
        startArmorBonus: 54,
        startMedkitBonus: 0,
        utilityCharges: 1,
        abilityDuration: 18,
        abilityCooldown: 0,
        abilityColor: '#67bcff',
      },
      saboteur: {
        id: 'saboteur',
        nameZh: '露娜',
        nameEn: 'Luna',
        passiveZh: '女 · 破袭手，动作更轻，换弹更快，近身处决速度最快。',
        passiveEn: 'Female · Saboteur with lighter movement, faster reloads, and the quickest execution cadence.',
        skillNameZh: '猎链视窗',
        skillNameEn: 'Kill Chain Window',
        skillTextZh: '16 秒内移速提升、射速提升、散布收紧；每累计命中 3 次会返还 2 发备弹并恢复 15 生命。',
        skillTextEn: 'For 16s move faster, fire faster, and tighten spread. Every 3 hits refund 2 reserve rounds and restore 15 HP.',
        itemNameZh: '震荡信标',
        itemNameEn: 'Shock Beacon',
        moveMult: 1.05,
        spreadMult: 0.92,
        reloadMult: 0.88,
        detectMult: 0.95,
        healBonus: 0,
        healCooldownMult: 1,
        startArmorBonus: 8,
        startMedkitBonus: 0,
        utilityCharges: 1,
        abilityDuration: 16,
        abilityCooldown: 0,
        abilityColor: '#ff74ce',
      },
      quartermaster: {
        id: 'quartermaster',
        nameZh: '瑞亚',
        nameEn: 'Rhea',
        passiveZh: '女 · 战地军需官，带着更多补给上场，擅长长期作战。',
        passiveEn: 'Female · Field quartermaster who enters with deeper reserves and excels in long engagements.',
        skillNameZh: '补给网络',
        skillNameEn: 'Supply Web',
        skillTextZh: '20 秒内武器伤害提升 25%，射速略增，换弹与使用药品更快，并持续回体力与少量护甲。',
        skillTextEn: 'For 20s gain 25% weapon damage, a small fire-rate bump, faster reloads and heals, plus steady stamina and armor recovery.',
        itemNameZh: '战地补给箱',
        itemNameEn: 'Field Cache',
        moveMult: 1,
        spreadMult: 0.96,
        reloadMult: 0.94,
        detectMult: 1,
        healBonus: 0,
        healCooldownMult: 0.9,
        startArmorBonus: 18,
        startMedkitBonus: 1,
        utilityCharges: 1,
        abilityDuration: 20,
        abilityCooldown: 0,
        abilityColor: '#ffcf67',
      },
    };

    const CUSTOM_OPERATOR_UNLOCKS = {
      vanguard: {
        money: 28000,
        items: [
          { id: 'artifact', count: 1 },
          { id: 'dronecore', count: 2 },
        ],
      },
      saboteur: {
        money: 32000,
        items: [
          { id: 'intel', count: 1 },
          { id: 'sensor', count: 3 },
        ],
      },
      quartermaster: {
        money: 26000,
        items: [
          { id: 'coin', count: 4 },
          { id: 'watch', count: 3 },
          { id: 'signal_decoder', count: 1 },
        ],
      },
    };

    const CUSTOM_SHOP_STOCK = {
      emergency_funding: {
        id: 'emergency_funding',
        nameZh: '没钱了吧，我来助你',
        nameEn: 'Out of Money? I Can Help',
        descriptionZh: '购买后立即获得 10000 资金，可无限购买。',
        descriptionEn: 'Instantly grants 10,000 funds. Unlimited supply.',
        price: 0,
        grantMoney: 10000,
      },
    };

    const CUSTOM_UTILITY_META = {
      vanguard: {
        nameZh: '装甲拼接器',
        nameEn: 'Armor Splicer',
        detailZh: 'G 启动，恢复护甲并短暂稳住推进节奏。',
        detailEn: 'Press G to restore armor and steady your next push.',
        color: '#67bcff',
      },
      saboteur: {
        nameZh: '震荡信标',
        nameEn: 'Shock Beacon',
        detailZh: 'G 投掷前方信标，拖慢并牵引附近敌人。',
        detailEn: 'Press G to throw a beacon that slows and drags nearby enemies.',
        color: '#ff74ce',
      },
      quartermaster: {
        nameZh: '战地补给箱',
        nameEn: 'Field Cache',
        detailZh: 'G 投下补给，立刻补血甲、体力和备弹。',
        detailEn: 'Press G to drop supply that instantly restores armor, stamina, and reserve ammo.',
        color: '#ffcf67',
      },
    };

    const EXECUTION_PROFILES = {
      assault: {
        nameZh: '突击贯穿',
        nameEn: 'Breach Finish',
        duration: 1.04,
        color: '#ff8f62',
      },
      medic: {
        nameZh: '压制止血',
        nameEn: 'Control Finish',
        duration: 1.24,
        color: '#7fe2a2',
      },
      vanguard: {
        nameZh: '护板重击',
        nameEn: 'Shield Hammer',
        duration: 1.18,
        color: '#74c5ff',
      },
      saboteur: {
        nameZh: '裂隙切入',
        nameEn: 'Rift Cut',
        duration: 0.92,
        color: '#ff7cd0',
      },
      quartermaster: {
        nameZh: '回收扣杀',
        nameEn: 'Cache Break',
        duration: 1.12,
        color: '#ffd36f',
      },
      fallback: {
        nameZh: '处决',
        nameEn: 'Execution',
        duration: 1.1,
        color: '#ffd7a2',
      },
    };

    const ensureExpansionStyle = () => {
      if (document.getElementById('expansionPatchStyle')) {
        return;
      }
      const style = document.createElement('style');
      style.id = 'expansionPatchStyle';
      style.textContent = `
        .practice-row,
        .stash-batch-toolbar,
        .operator-card .unlock-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .practice-card {
          border: 1px solid rgba(244, 209, 127, 0.18);
          background: linear-gradient(135deg, rgba(28, 40, 54, 0.96), rgba(50, 62, 58, 0.92));
        }
        .practice-card .item-meta {
          max-width: 68ch;
        }
        .operator-card.is-locked {
          border-color: rgba(230, 171, 103, 0.22);
          background: rgba(22, 30, 37, 0.92);
        }
        .operator-card .operator-lock-note {
          color: rgba(240, 204, 152, 0.82);
        }
        .operator-card .mode-pill.locked-pill {
          background: rgba(240, 157, 93, 0.16);
          color: #f5c082;
        }
        .stash-batch-toolbar {
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(126, 154, 171, 0.16);
          border-radius: 8px;
          background: rgba(16, 24, 31, 0.72);
        }
        .stash-inventory-overview {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 8px;
          padding: 9px 10px;
          border: 1px solid rgba(126, 154, 171, 0.16);
          border-radius: 6px;
          background: rgba(10, 18, 24, 0.8);
        }
        .stash-overview-chip {
          display: inline-flex;
          gap: 5px;
          align-items: baseline;
          padding: 4px 7px;
          border: 1px solid rgba(167, 194, 207, 0.16);
          border-radius: 4px;
          color: rgba(221, 233, 239, 0.78);
          font-size: 11px;
        }
        .stash-overview-chip strong { color: #f2d18f; font-size: 12px; }
        .stash-batch-toolbar.hidden {
          display: none;
        }
        .stash-batch-summary {
          color: rgba(222, 232, 240, 0.82);
          font-size: 12px;
        }
        .stash-select-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 10px;
        }
        .stash-select-toggle input {
          width: 21px;
          height: 21px;
          accent-color: #f0b15f;
          cursor: pointer;
        }
        .expansion-stash-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 10px;
          align-items: start;
          cursor: pointer;
          transition: border-color .12s ease, background-color .12s ease;
        }
        .expansion-stash-row:hover { border-color: rgba(240, 177, 95, 0.32); }
        .expansion-stash-row.is-selected {
          border-color: rgba(240, 177, 95, 0.62);
          background: rgba(240, 177, 95, 0.11);
        }
        .expansion-stash-row > .stash-select-toggle {
          margin-top: 4px;
        }
        .range-stat-line {
          display: inline-flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .range-stat-line strong {
          color: #ffe09c;
        }
      `;
      document.head.appendChild(style);
    };

    const defaultExpansionProgress = () => ({
      unlockedOperators: ['assault', 'medic'],
      rangeBestBullseyes: 0,
      rangeSessions: 0,
      rangeMotion: 'static',
    });

    const loadExpansionProgress = () => {
      try {
        const raw = localStorage.getItem(EXPANSION_STORAGE_KEY);
        if (!raw) {
          return defaultExpansionProgress();
        }
        const parsed = JSON.parse(raw);
        const fallback = defaultExpansionProgress();
        return {
          unlockedOperators: Array.from(new Set(Array.isArray(parsed.unlockedOperators) ? parsed.unlockedOperators : fallback.unlockedOperators)),
          rangeBestBullseyes: Math.max(0, Number(parsed.rangeBestBullseyes ?? 0)),
          rangeSessions: Math.max(0, Number(parsed.rangeSessions ?? 0)),
          rangeMotion: parsed.rangeMotion === 'moving' ? 'moving' : 'static',
        };
      } catch (error) {
        console.warn('Failed to load expansion progression.', error);
        return defaultExpansionProgress();
      }
    };

    let expansionProgress = loadExpansionProgress();

    const saveExpansionProgress = () => {
      try {
        localStorage.setItem(EXPANSION_STORAGE_KEY, JSON.stringify(expansionProgress));
      } catch (error) {
        console.warn('Failed to save expansion progression.', error);
      }
    };

    const ensureExpansionProgress = () => {
      expansionProgress.unlockedOperators ??= ['assault', 'medic'];
      if (!expansionProgress.unlockedOperators.includes('assault')) expansionProgress.unlockedOperators.unshift('assault');
      if (!expansionProgress.unlockedOperators.includes('medic')) expansionProgress.unlockedOperators.push('medic');
      expansionProgress.rangeBestBullseyes = Math.max(0, Number(expansionProgress.rangeBestBullseyes ?? 0));
      expansionProgress.rangeSessions = Math.max(0, Number(expansionProgress.rangeSessions ?? 0));
      expansionProgress.rangeMotion = expansionProgress.rangeMotion === 'moving' ? 'moving' : 'static';
    };

    ensureExpansionProgress();

    const markDefsApplied = () => {
      if (window.__sdrExpansionDefsApplied) {
        return;
      }
      window.__sdrExpansionDefsApplied = true;

      Object.assign(WEAPON_DEFS, CUSTOM_WEAPONS);
      Object.assign(AMMO_DEFS, CUSTOM_AMMO);
      Object.assign(PART_DEFS, CUSTOM_PARTS);

      for (const item of EXTRA_LOOT) {
        if (!lootCatalog.some((entry) => entry.id === item.id)) {
          lootCatalog.push(item);
        }
      }
      for (const ammo of Object.values(CUSTOM_AMMO)) {
        if (!lootCatalog.some((entry) => entry.id === `${ammo.id}_box`)) {
          lootCatalog.push(makeAmmoLootDef(ammo));
        }
      }
      for (const part of Object.values(CUSTOM_PARTS)) {
        if (!lootCatalog.some((entry) => entry.id === part.id)) {
          lootCatalog.push(makePartLootDef(part));
        }
      }
    };

    const ensureSaveShape = () => {
      state.save.selectedOperatorId ??= 'assault';
      state.save.prepAmmo ??= {};
      state.save.armory ??= {};
      state.save.armory.ownedWeapons ??= ['rifle'];
      state.save.armory.selectedAmmoByWeapon ??= {};
      state.save.armory.equippedPartsByWeapon ??= {};
      state.save.armory.ownedParts ??= [];
      state.save.stash ??= [];
      state.save.stats ??= { raids: 0, survived: 0, kills: 0, bestHaul: 0 };
      for (const weapon of Object.values(WEAPON_DEFS)) {
        state.save.armory.selectedAmmoByWeapon[weapon.id] ??= weapon.defaultAmmoId;
        state.save.armory.equippedPartsByWeapon[weapon.id] ??= {};
      }
      for (const ammoId of Object.keys(AMMO_DEFS)) {
        state.save.prepAmmo[ammoId] = Math.max(0, Number(state.save.prepAmmo[ammoId] ?? 0));
      }
      if (!isOperatorUnlocked(state.save.selectedOperatorId)) {
        state.save.selectedOperatorId = 'assault';
      }
    };

    const isOperatorUnlocked = (operatorId) => !CUSTOM_OPERATOR_IDS.includes(operatorId) || expansionProgress.unlockedOperators.includes(operatorId);

    const getUnlockRequirementLabel = (requirement) => {
      const lootDef = findLootDefById(requirement.id);
      const label = lootDef?.name ?? requirement.id;
      return `${label} x${requirement.count}`;
    };

    const getUnlockRequirementText = (operatorId) => {
      const unlock = CUSTOM_OPERATOR_UNLOCKS[operatorId];
      if (!unlock) {
        return '';
      }
      return unlock.items.map(getUnlockRequirementLabel).join(' · ');
    };

    const getStashCountById = (id) => (state.save.stash ?? []).reduce(
      (count, item) => count + (item.id === id ? 1 : 0),
      0,
    );

    const hasUnlockItems = (operatorId) => {
      const unlock = CUSTOM_OPERATOR_UNLOCKS[operatorId];
      if (!unlock) {
        return false;
      }
      return unlock.items.every((requirement) => getStashCountById(requirement.id) >= requirement.count);
    };

    const consumeUnlockItems = (operatorId) => {
      const unlock = CUSTOM_OPERATOR_UNLOCKS[operatorId];
      if (!unlock || !hasUnlockItems(operatorId)) {
        return false;
      }
      for (const requirement of unlock.items) {
        let needed = requirement.count;
        for (let index = state.save.stash.length - 1; index >= 0 && needed > 0; index -= 1) {
          if (state.save.stash[index].id !== requirement.id) {
            continue;
          }
          BATCH_SELECTION.delete(state.save.stash[index].uid);
          state.save.stash.splice(index, 1);
          needed -= 1;
        }
      }
      return true;
    };

    const unlockOperator = (operatorId, method) => {
      if (!CUSTOM_OPERATOR_IDS.includes(operatorId) || isOperatorUnlocked(operatorId)) {
        return;
      }
      const unlock = CUSTOM_OPERATOR_UNLOCKS[operatorId];
      if (!unlock) {
        return;
      }
      if (method === 'money') {
        if (state.save.money < unlock.money) {
          notify(L('资金不足，无法解锁该干员。', 'Not enough funds to unlock this operator.'), 'danger');
          return;
        }
        state.save.money -= unlock.money;
      } else {
        if (!consumeUnlockItems(operatorId)) {
          notify(L('仓库材料不足，无法解锁该干员。', 'Not enough stash items to unlock this operator.'), 'danger');
          return;
        }
      }
      expansionProgress.unlockedOperators.push(operatorId);
      expansionProgress.unlockedOperators = Array.from(new Set(expansionProgress.unlockedOperators));
      saveExpansionProgress();
      ensureSaveShape();
      persistSave();
      renderBasePanel();
      notify(
        L(`已解锁干员 ${CUSTOM_OPERATOR_DEFS[operatorId].nameZh}。`, `Unlocked ${CUSTOM_OPERATOR_DEFS[operatorId].nameEn}.`),
        'success',
      );
    };

    const sanitizeBatchSelection = () => {
      const live = new Set((state.save.stash ?? []).map((item) => item.uid));
      for (const uid of Array.from(BATCH_SELECTION)) {
        if (!live.has(uid)) {
          BATCH_SELECTION.delete(uid);
        }
      }
    };

    const getBatchSelectionTotals = () => {
      sanitizeBatchSelection();
      let count = 0;
      let value = 0;
      for (const item of state.save.stash ?? []) {
        if (!BATCH_SELECTION.has(item.uid)) {
          continue;
        }
        count += 1;
        value += Number(item.value ?? 0);
      }
      return { count, value };
    };

    const sellSelectedStash = () => {
      const selection = getBatchSelectionTotals();
      if (!selection.count) {
        notify(L('先勾选需要出售的物资。', 'Select stash items to sell first.'), 'warning');
        return;
      }
      let soldCount = 0;
      let soldValue = 0;
      state.save.stash = state.save.stash.filter((item) => {
        if (!BATCH_SELECTION.has(item.uid)) {
          return true;
        }
        soldCount += 1;
        soldValue += Number(item.value ?? 0);
        return false;
      });
      BATCH_SELECTION.clear();
      state.save.money += soldValue;
      persistSave();
      renderBasePanel();
      notify(
        L(`已出售 ${formatItemCount(soldCount)}，获得 ${formatMoney(soldValue)}。`, `Sold ${formatItemCount(soldCount)} for ${formatMoney(soldValue)}.`),
        'success',
      );
    };

    const discardSelectedStash = () => {
      const selection = getBatchSelectionTotals();
      if (!selection.count) {
        notify(L('先勾选需要丢弃的物资。', 'Select stash items to discard first.'), 'warning');
        return;
      }
      state.save.stash = state.save.stash.filter((item) => !BATCH_SELECTION.has(item.uid));
      BATCH_SELECTION.clear();
      persistSave();
      renderBasePanel();
      notify(L('已丢弃所选物资。', 'Discarded the selected stash items.'), 'warning');
    };

    const selectAllStash = (checked) => {
      BATCH_SELECTION.clear();
      if (checked) {
        for (const item of state.save.stash ?? []) {
          BATCH_SELECTION.add(item.uid);
        }
      }
      syncBatchToolbar();
      syncStashSelectionMarks();
    };

    const syncStashSelectionMarks = () => {
      for (const input of refs.stashList?.querySelectorAll?.('[data-expansion-stash-select]') ?? []) {
        input.checked = BATCH_SELECTION.has(input.dataset.expansionStashSelect);
        input.closest('.expansion-stash-row')?.classList.toggle('is-selected', input.checked);
      }
    };

    const syncBatchToolbar = () => {
      const toolbar = document.getElementById('stashBatchToolbar');
      if (!toolbar) {
        return;
      }
      const totalItems = (state.save.stash ?? []).length;
      toolbar.classList.toggle('hidden', totalItems === 0);
      const summary = document.getElementById('stashBatchSummary');
      const toggleButton = toolbar.querySelector('[data-expansion-stash-action="toggle-all"]');
      const { count, value } = getBatchSelectionTotals();
      if (summary) {
        summary.textContent = count
          ? L(`已选 ${formatItemCount(count)} · 预计出售 ${formatMoney(value)}`, `Selected ${formatItemCount(count)} · sale ${formatMoney(value)}`)
          : L('勾选后可批量出售或丢弃仓库物资。', 'Select stash items to sell or discard them in batches.');
      }
      if (toggleButton) {
        toggleButton.textContent = count === totalItems && totalItems > 0
          ? L('取消全选', 'Clear All')
          : L('全选', 'Select All');
      }
    };

    const decorateStashSection = () => {
      if (!refs.stashList || state.mode !== 'base') {
        return;
      }
      const parent = refs.stashList.parentElement;
      if (!parent) {
        return;
      }
      let toolbar = document.getElementById('stashBatchToolbar');
      if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.id = 'stashBatchToolbar';
        toolbar.className = 'stash-batch-toolbar';
        toolbar.innerHTML = `
          <div id="stashBatchSummary" class="stash-batch-summary"></div>
          <div class="practice-row">
            <button class="ghost-button small" type="button" data-expansion-stash-action="toggle-all"></button>
            <button class="ghost-button small" type="button" data-expansion-stash-action="discard-selected">${L('丢弃所选', 'Discard Selected')}</button>
            <button class="primary-button small" type="button" data-expansion-stash-action="sell-selected">${L('出售所选', 'Sell Selected')}</button>
          </div>
        `;
        parent.insertBefore(toolbar, refs.stashList);
      }

      let overview = document.getElementById('stashInventoryOverview');
      if (!overview) {
        overview = document.createElement('div');
        overview.id = 'stashInventoryOverview';
        overview.className = 'stash-inventory-overview';
        parent.insertBefore(overview, toolbar);
      }
      const stash = state.save.stash ?? [];
      const categories = new Map();
      for (const item of stash) {
        const label = getCategoryLabel(item.category);
        categories.set(label, (categories.get(label) ?? 0) + 1);
      }
      const totalValue = stash.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
      overview.innerHTML = [
        `<span class="stash-overview-chip">${L('总数', 'Total')} <strong>${formatItemCount(stash.length)}</strong></span>`,
        `<span class="stash-overview-chip">${L('总价值', 'Value')} <strong>${formatMoney(totalValue)}</strong></span>`,
        ...Array.from(categories.entries()).map(([label, count]) => `<span class="stash-overview-chip">${label} <strong>${count}</strong></span>`),
      ].join('');
      overview.hidden = stash.length === 0;

      const rows = Array.from(refs.stashList.querySelectorAll('.stash-row'));
      const sorted = stash.slice().sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0));
      rows.forEach((row, index) => {
        const item = sorted[index];
        if (!item) {
          return;
        }
        row.classList.add('expansion-stash-row');
        let selector = row.querySelector('.stash-select-toggle');
        if (!selector) {
          selector = document.createElement('label');
          selector.className = 'stash-select-toggle';
          selector.innerHTML = `<input type="checkbox" data-expansion-stash-select="${item.uid}" />`;
          row.prepend(selector);
        }
        const input = selector.querySelector('input');
        if (input) {
          input.dataset.expansionStashSelect = item.uid;
          input.checked = BATCH_SELECTION.has(item.uid);
          input.setAttribute('aria-label', L(`选择 ${getItemLabel(item)}`, `Select ${getItemLabel(item)}`));
          row.classList.toggle('is-selected', input.checked);
          row.dataset.expansionStashUid = item.uid;
        }
      });
      syncBatchToolbar();
    };

    const ensurePracticeSection = () => {
      if (state.mode !== 'base') {
        return;
      }
      const hallSection = refs.hallBoard?.closest('.base-section');
      if (!hallSection?.parentElement) {
        return;
      }
      let section = document.getElementById('practiceSection');
      if (!section) {
        section = document.createElement('section');
        section.id = 'practiceSection';
        section.className = 'base-section';
        hallSection.insertAdjacentElement('afterend', section);
      }
      section.innerHTML = `
        <div class="section-head">
          <h2>${L('靶场', 'Shooting Range')}</h2>
          <span class="section-note">${L('不消耗战利品与准备物资，专门用来练枪、试配件和熟悉干员技能。', 'No loot or prep items are consumed here. Use it to test guns, parts, and operator skills.')}</span>
        </div>
        <article class="shop-row practice-card">
          <div>
            <div class="item-title">${L('训练靶场', 'Drill Range')}</div>
            <div class="item-meta">${L('十个不同血量的靶标与返回区；靶场内不会受到伤害。', 'Ten targets with different health values and a return zone. You cannot take damage here.')}</div>
            <div class="item-meta range-stat-line">
              <span>${L('最佳击倒', 'Best Bullseyes')} <strong>${expansionProgress.rangeBestBullseyes}</strong></span>
              <span>${L('训练次数', 'Sessions')} <strong>${expansionProgress.rangeSessions}</strong></span>
            </div>
          </div>
          <div class="stack-list">
            <div class="range-mode-options" role="group" aria-label="${L('靶标移动方式', 'Target movement')}">
              <button class="ghost-button small ${expansionProgress.rangeMotion === 'static' ? 'is-active' : ''}" type="button" data-expansion-range-motion="static" aria-pressed="${expansionProgress.rangeMotion === 'static'}">${L('固定靶', 'Static')}</button>
              <button class="ghost-button small ${expansionProgress.rangeMotion === 'moving' ? 'is-active' : ''}" type="button" data-expansion-range-motion="moving" aria-pressed="${expansionProgress.rangeMotion === 'moving'}">${L('移动靶', 'Moving')}</button>
            </div>
            <button class="primary-button small" type="button" data-expansion-action="start-range">${L('进入靶场', 'Enter Range')}</button>
          </div>
        </article>
      `;
    };

    const getOperatorUnlockStatus = (operatorId) => {
      if (!CUSTOM_OPERATOR_IDS.includes(operatorId)) {
        return '';
      }
      if (isOperatorUnlocked(operatorId)) {
        return L('已解锁', 'Unlocked');
      }
      const unlock = CUSTOM_OPERATOR_UNLOCKS[operatorId];
      return L(`资金 ${formatMoney(unlock.money)} 或材料解锁`, `Unlock with ${formatMoney(unlock.money)} or stash items`);
    };

    const originalGetOperatorDefs = getOperatorDefs;
    getOperatorDefs = function patchedGetOperatorDefs() {
      const defs = originalGetOperatorDefs();
      for (const [operatorId, def] of Object.entries(CUSTOM_OPERATOR_DEFS)) {
        defs[operatorId] = { ...def };
      }
      return defs;
    };

    const originalGetOperatorOrder = getOperatorOrder;
    getOperatorOrder = function patchedGetOperatorOrder() {
      const base = originalGetOperatorOrder().filter((operatorId) => operatorId !== 'recon');
      const ordered = [];
      for (const operatorId of ['assault', 'medic']) {
        if (base.includes(operatorId)) {
          ordered.push(operatorId);
        }
      }
      for (const operatorId of CUSTOM_OPERATOR_IDS) {
        ordered.push(operatorId);
      }
      for (const operatorId of base) {
        if (!ordered.includes(operatorId)) {
          ordered.push(operatorId);
        }
      }
      return ordered;
    };

    const originalSetSelectedOperator = setSelectedOperator;
    setSelectedOperator = function patchedSetSelectedOperator(operatorId) {
      if (!isOperatorUnlocked(operatorId)) {
        notify(L('该干员尚未解锁。', 'This operator is still locked.'), 'warning');
        return;
      }
      return originalSetSelectedOperator(operatorId);
    };

    renderOperatorPanel = function patchedRenderOperatorPanel() {
      const selectedOperatorId = state.save.selectedOperatorId ?? 'assault';
      return getOperatorOrder()
        .map((operatorId) => {
          const operator = getOperatorDefs()[operatorId];
          if (!operator) {
            return '';
          }
          const active = operatorId === selectedOperatorId;
          const unlocked = isOperatorUnlocked(operatorId);
          const unlock = CUSTOM_OPERATOR_UNLOCKS[operatorId];
          const itemReady = unlock ? hasUnlockItems(operatorId) : false;
          const requirementText = unlock ? getUnlockRequirementText(operatorId) : '';
          const moneyLabel = unlock ? formatMoney(unlock.money) : '';
          return `
            <article class="shop-row operator-card ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}">
              <div>
                <div class="item-title">${L(operator.nameZh, operator.nameEn)}</div>
                <div class="item-meta">${L(operator.passiveZh, operator.passiveEn)}</div>
                <div class="item-meta">${L(`技能：${L(operator.skillNameZh, operator.skillNameEn)} · ${L(operator.skillTextZh, operator.skillTextEn)}`, `Skill: ${operator.skillNameEn} · ${operator.skillTextEn}`)}</div>
                <div class="item-meta">${L(`专属道具：${L(operator.itemNameZh, operator.itemNameEn)} x${operator.utilityCharges}`, `Signature item: ${operator.itemNameEn} x${operator.utilityCharges}`)}</div>
                ${unlock ? `<div class="item-meta operator-lock-note">${getOperatorUnlockStatus(operatorId)}</div>` : ''}
                ${unlock ? `<div class="item-meta operator-lock-note">${L(`材料方案：${requirementText}`, `Item route: ${requirementText}`)}</div>` : ''}
              </div>
              <div class="stack-list">
                <div class="brief-actions">
                  <span class="mode-pill ${unlocked ? '' : 'locked-pill'}">${unlocked ? L('已解锁', 'Unlocked') : L('需解锁', 'Locked')}</span>
                </div>
                ${unlocked
                  ? `<button class="${active ? 'primary-button' : 'ghost-button'} small" type="button" data-operator-id="${operatorId}">${active ? L('已选择', 'Selected') : L('选择', 'Select')}</button>`
                  : `
                    <div class="unlock-row">
                      <button class="ghost-button small" type="button" data-expansion-operator-unlock="${operatorId}" data-expansion-unlock-mode="money" ${state.save.money >= unlock.money ? '' : 'disabled'}>${L(`资金 ${moneyLabel}`, `Funds ${moneyLabel}`)}</button>
                      <button class="primary-button small" type="button" data-expansion-operator-unlock="${operatorId}" data-expansion-unlock-mode="items" ${itemReady ? '' : 'disabled'}>${L('材料解锁', 'Item Unlock')}</button>
                    </div>
                  `}
              </div>
            </article>
          `;
        })
        .join('');
    };

    const createStashItem = (itemId) => {
      const def = findLootDefById(itemId);
      return def ? normalizeItemInstance(def) : null;
    };

    const addItemsToStash = (items) => {
      for (const entry of items) {
        for (let index = 0; index < entry.count; index += 1) {
          const item = createStashItem(entry.id);
          if (item) {
            state.save.stash.push(item);
          }
        }
      }
    };

    const originalGetShopEntries = getShopEntries;
    getShopEntries = function patchedGetShopEntries() {
      const entries = originalGetShopEntries();
      for (const stock of Object.values(CUSTOM_SHOP_STOCK)) {
        entries.push({
          id: stock.id,
          kind: 'expansion_supply',
          name: L(stock.nameZh, stock.nameEn),
          description: L(stock.descriptionZh, stock.descriptionEn),
          price: stock.price,
          status: stock.grantMoney
            ? L('无限供应 · 立即到账', 'Unlimited · instant credit')
            : L('直接送入仓库', 'Delivered to stash'),
          disabled: false,
        });
      }
      return entries;
    };

    const originalBuyShopEntry = buyShopEntry;
    buyShopEntry = function patchedBuyShopEntry(id) {
      const stock = CUSTOM_SHOP_STOCK[id];
      if (!stock) {
        return originalBuyShopEntry(id);
      }
      if (state.save.money < stock.price) {
        notify(L('资金不足。', 'Not enough funds.'), 'danger');
        return;
      }
      state.save.money -= stock.price;
      if (stock.grantMoney) state.save.money += stock.grantMoney;
      else addItemsToStash(stock.items ?? []);
      persistSave();
      renderBasePanel();
      notify(
        stock.grantMoney
          ? L(`援助到账：获得 ${formatMoney(stock.grantMoney)}。`, `Funding received: ${formatMoney(stock.grantMoney)}.`)
          : L(`已购买 ${stock.nameZh}。`, `Purchased ${stock.nameEn}.`),
        'success',
      );
    };

    const originalResetSave = resetSave;
    resetSave = function patchedResetSave() {
      expansionProgress = defaultExpansionProgress();
      saveExpansionProgress();
      BATCH_SELECTION.clear();
      return originalResetSave();
    };

    const originalRenderBasePanel = renderBasePanel;
    renderBasePanel = function patchedRenderBasePanel() {
      ensureSaveShape();
      const result = originalRenderBasePanel();
      ensurePracticeSection();
      decorateStashSection();
      return result;
    };

    const rangeTargetMaterial = (name, diffuse, emissive = diffuse, alpha = 1) => {
      const material = new BABYLON.StandardMaterial(name, scene);
      material.diffuseColor = BABYLON.Color3.FromHexString(diffuse);
      material.emissiveColor = BABYLON.Color3.FromHexString(emissive).scale(0.18);
      material.alpha = alpha;
      material.backFaceCulling = false;
      return material;
    };

    const createShockBeaconVisual = (x, z) => {
      const root = new BABYLON.TransformNode(`shock-beacon-${Math.random().toString(36).slice(2, 8)}`, scene);
      root.position.set(x, 0, z);
      const base = BABYLON.MeshBuilder.CreateCylinder(`shock-beacon-base-${Math.random().toString(36).slice(2, 8)}`, { height: 0.16, diameter: 0.42, tessellation: 12 }, scene);
      base.parent = root;
      base.position.y = 0.08;
      base.material = rangeTargetMaterial('shock-beacon-base-mat', '#48243f', '#f269db');
      const mast = BABYLON.MeshBuilder.CreateCylinder(`shock-beacon-mast-${Math.random().toString(36).slice(2, 8)}`, { height: 0.74, diameter: 0.12, tessellation: 10 }, scene);
      mast.parent = root;
      mast.position.y = 0.44;
      mast.material = rangeTargetMaterial('shock-beacon-mast-mat', '#241f38', '#f17ce2');
      const halo = BABYLON.MeshBuilder.CreateTorus(`shock-beacon-halo-${Math.random().toString(36).slice(2, 8)}`, { diameter: 1.5, thickness: 0.05, tessellation: 24 }, scene);
      halo.parent = root;
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.06;
      const haloMat = rangeTargetMaterial('shock-beacon-halo-mat', '#ff8fe5', '#ffc1f1', 0.7);
      haloMat.disableLighting = true;
      halo.material = haloMat;
      return { root, base, mast, halo, pulse: 0 };
    };

    const createFieldCacheVisual = (x, z) => {
      const root = new BABYLON.TransformNode(`field-cache-${Math.random().toString(36).slice(2, 8)}`, scene);
      root.position.set(x, 0, z);
      const base = BABYLON.MeshBuilder.CreateBox(`field-cache-base-${Math.random().toString(36).slice(2, 8)}`, { width: 0.9, height: 0.54, depth: 0.7 }, scene);
      base.parent = root;
      base.position.y = 0.27;
      base.material = rangeTargetMaterial('field-cache-base-mat', '#6d5d2e', '#d8b45e');
      const lid = BABYLON.MeshBuilder.CreateBox(`field-cache-lid-${Math.random().toString(36).slice(2, 8)}`, { width: 0.82, height: 0.12, depth: 0.62 }, scene);
      lid.parent = root;
      lid.position.y = 0.58;
      lid.material = rangeTargetMaterial('field-cache-lid-mat', '#b79045', '#ffe09a');
      return { root, base, lid, pulse: 0 };
    };

    const createRangeTarget = (spawn, index, forwardYaw) => {
      const enemy = createEnemy({ x: spawn.x, z: spawn.z, route: [{ x: spawn.x, z: spawn.z }] }, index);
      Object.assign(enemy, {
        id: `range-target-${index}`,
        name: 'Training Target',
        type: 'range',
        isRangeTarget: true,
        anchorX: spawn.x,
        anchorZ: spawn.z,
        rangeSide: index % 2 === 0 ? 1 : -1,
        rangeDecisionTimer: 0.15 + index * 0.07,
        rangeBurstTimer: 0,
        rangeDepth: 0,
        health: (index + 1) * 100,
        maxHealth: (index + 1) * 100,
        damage: 0,
        speed: 0,
        preferredRange: 999,
        fireInterval: 99,
        detectRange: -999,
        shootCooldown: Number.POSITIVE_INFINITY,
        alertTimer: 0,
        investigateTimer: 0,
        longFireRange: 999,
        combatState: 'patrol',
        route: [{ x: spawn.x, z: spawn.z }],
        routeIndex: 0,
        revealedTimer: 0,
        wallStuckTimer: 0,
        visualColor: index % 2 === 0 ? '#69c8ff' : '#f0b56a',
        heading: forwardYaw + Math.PI,
      });
      enemy.visual = createEnemyVisual(enemy);
      if (enemy.visual?.classLabel) {
        enemy.visual.classLabel.setEnabled(false);
      }
      if (enemy.visual?.root) {
        enemy.visual.root.scaling.set(0.94, 1, 0.94);
      }
      const plate = BABYLON.MeshBuilder.CreateCylinder(`range-target-plate-${index}`, { height: 0.08, diameter: 0.44, tessellation: 20 }, scene);
      plate.parent = enemy.visual?.root ?? null;
      plate.position.set(0, 1.4, 0.38);
      plate.rotation.x = Math.PI / 2;
      plate.material = rangeTargetMaterial(`range-target-plate-mat-${index}`, index % 2 === 0 ? '#0f1922' : '#402514', '#ffeaa8');
      const bullseye = BABYLON.MeshBuilder.CreateDisc(`range-target-bullseye-${index}`, { radius: 0.12, tessellation: 20 }, scene);
      bullseye.parent = enemy.visual?.root ?? null;
      bullseye.position.set(0, 1.4, 0.422);
      bullseye.material = rangeTargetMaterial(`range-target-bullseye-mat-${index}`, '#ff5f63', '#ffb0a4');
      enemy.visual.targetPlate = plate;
      enemy.visual.targetBullseye = bullseye;
      return enemy;
    };

    const buildRangeTargetSpawns = (player) => {
      const forward = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
      const right = { x: Math.cos(player.yaw), z: -Math.sin(player.yaw) };
      const layout = [
        { forward: 16, lateral: -8 },
        { forward: 18, lateral: -3 },
        { forward: 20, lateral: 4 },
        { forward: 24, lateral: -10 },
        { forward: 26, lateral: 0 },
        { forward: 28, lateral: 9 },
        { forward: 34, lateral: -6 },
        { forward: 36, lateral: 5 },
        { forward: 42, lateral: -12 },
        { forward: 45, lateral: 10 },
      ];
      return layout.slice(0, CUSTOM_RANGE_TARGET_COUNT).map((spec) => {
        const desiredX = clamp(player.x + forward.x * spec.forward + right.x * spec.lateral, -PLAYABLE_HALF + 2, PLAYABLE_HALF - 2);
        const desiredZ = clamp(player.z + forward.z * spec.forward + right.z * spec.lateral, -PLAYABLE_HALF + 2, PLAYABLE_HALF - 2);
        return resolveStaticPlacement(desiredX, desiredZ, 1.2);
      });
    };

    const clearRaidCollections = (raid) => {
      for (const collection of [raid.containers ?? [], raid.extractions ?? [], raid.switchPoints ?? [], raid.enemies ?? []]) {
        for (const entity of collection) {
          disposeVisual(entity.visual);
        }
      }
      raid.containers = [];
      raid.extractions = [];
      raid.switchPoints = [];
      raid.enemies = [];
      raid.dynamicEvents = [];
    };

    const configureTrainingRange = (raid) => {
      const player = raid?.player;
      if (!raid || !player) {
        return;
      }
      clearRaidCollections(raid);
      raid.isTrainingRange = true;
      raid.namelessSpawned = true;
      raid.rangeMotion = expansionProgress.rangeMotion;
      raid.modeId = 'range';
      raid.timeLeft = RANGE_DURATION;
      raid.objectives = [];
      raid.tasksComplete = true;
      raid.bonusReward = 0;
      raid.dynamicChoiceAt = Number.POSITIVE_INFINITY;
      raid.dynamicChoiceSpawned = true;
      raid.statusText = L(`靶场已开启：${raid.rangeMotion === 'moving' ? '移动靶' : '固定靶'}。F 开火，按住 E 返回大厅。`, `Range ready: ${raid.rangeMotion === 'moving' ? 'moving' : 'static'} targets. F to fire, hold E to leave.`);
      raid.interactionText = L('靶场不会消耗战利品。靠近返回区按住 E。', 'The range consumes no loot. Hold E near the return zone to leave.');
      raid.rangeStats = {
        hits: 0,
        bullseyes: 0,
      };

      const forward = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
      const exitPoint = resolveStaticPlacement(
        clamp(player.x - forward.x * 6.5, -PLAYABLE_HALF + 2, PLAYABLE_HALF - 2),
        clamp(player.z - forward.z * 6.5, -PLAYABLE_HALF + 2, PLAYABLE_HALF - 2),
        1.5,
      );
      raid.extractions = [{
        id: 'range-exit',
        name: L('返回区', 'Return Zone'),
        x: exitPoint.x,
        z: exitPoint.z,
        radius: RANGE_EXIT_RADIUS,
        active: true,
        kind: 'standard',
        visual: null,
      }];
      raid.extractions[0].visual = createExtractionVisual(raid.extractions[0]);

      const targets = buildRangeTargetSpawns(player);
      raid.enemies = targets.map((spawn, index) => createRangeTarget(spawn, index, player.yaw));
      syncHud();
    };

    const startTrainingRange = () => {
      const savedPrep = {
        prep: { ...(state.save.prep ?? {}) },
        prepAmmo: { ...(state.save.prepAmmo ?? {}) },
        stats: { ...(state.save.stats ?? {}) },
      };
      startRaid();
      if (!state.raid) {
        return;
      }
      state.save.prep = savedPrep.prep;
      state.save.prepAmmo = savedPrep.prepAmmo;
      state.save.stats = savedPrep.stats;
      persistSave();
      configureTrainingRange(state.raid);
      expansionProgress.rangeSessions += 1;
      saveExpansionProgress();
      notify(L('已进入靶场，不会消耗仓库与出击准备。', 'Entered the range. No stash or prep items are consumed.'), 'success');
    };

    const ensurePlayerExpansionState = (player) => {
      if (!player) {
        return;
      }
      player.vanguardBraceTimer ??= 0;
      player.vanguardArmorBase ??= null;
      player.saboteurHitChain ??= 0;
      player.quartermasterPulseTimer ??= 1;
      player.executionLocked ??= false;
    };

    const getExpansionUtilityMeta = (operatorId) => CUSTOM_UTILITY_META[operatorId] ?? null;

    const getForwardLanding = (player, distance = 8.2) => ({
      x: clamp(player.x + Math.sin(player.yaw) * distance, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
      z: clamp(player.z + Math.cos(player.yaw) * distance, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1),
    });

    const beginCustomUtilityAction = (player, config) => {
      const raid = state.raid;
      if (!raid || !player || state.overlay || player.utilityAction || (player.utilityItems ?? 0) <= 0 || (player.dropTimer ?? 0) > 0) {
        if (player && !player.utilityAction && (player.utilityItems ?? 0) <= 0) {
          notify(L('专属道具不足，等待补充。', 'No utility item available. Wait for a resupply.'), 'warning');
        }
        return;
      }
      player.utilityItems -= 1;
      if (player.utilityItems < (player.utilityMaxItems ?? 2) && (player.utilityGainTimer ?? 0) <= 0) {
        player.utilityGainTimer = player.utilityGainInterval ?? 20;
      }
      const flightMesh = config.meshFactory?.();
      if (flightMesh) {
        flightMesh.position.set(config.startX, config.startY, config.startZ);
      }
      player.utilityAction = {
        expansion: true,
        type: config.type,
        timer: config.duration,
        duration: config.duration,
        startX: config.startX,
        startY: config.startY,
        startZ: config.startZ,
        targetX: config.targetX,
        targetZ: config.targetZ,
        flightMesh,
      };
      state.raid.statusText = config.statusText;
      state.input.fireHeld = false;
      state.input.aimHeld = false;
      syncHud();
    };

    const applyCustomUtilityEffect = (action) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || !action) {
        return;
      }
      if (action.type === 'vanguard') {
        player.maxArmor = Math.max(player.maxArmor, Math.ceil(player.armor + 160));
        player.armor = Math.min(player.maxArmor, player.armor + 160);
        player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 0) + 40);
        player.vanguardBraceTimer = 6;
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#72c2ff', 0.14, 0.22);
        notify(L('装甲拼接器生效：恢复 160 护甲并补充体力。', 'Armor Splicer active: restored 160 armor and refilled stamina.'), 'success');
        return;
      }
      if (action.type === 'saboteur') {
        disposeVisual(raid.shockBeacon?.visual);
        raid.shockBeacon = {
          x: action.targetX,
          z: action.targetZ,
          timer: 8,
          pulseTimer: 0.5,
          visual: createShockBeaconVisual(action.targetX, action.targetZ),
        };
        spawnPulse(new BABYLON.Vector3(action.targetX, 0.72, action.targetZ), '#ff7cd0', 0.12, 0.2);
        notify(L('震荡信标已部署：附近敌人会被拖慢并被信标牵引。', 'Shock Beacon deployed: nearby enemies are slowed and pulled toward it.'), 'success');
        return;
      }
      if (action.type === 'quartermaster') {
        const landing = getForwardLanding(player, 1.6);
        disposeVisual(raid.fieldCache?.visual);
        raid.fieldCache = {
          x: landing.x,
          z: landing.z,
          timer: 10,
          visual: createFieldCacheVisual(landing.x, landing.z),
        };
        player.medkits += 1;
        player.armor = Math.min(player.maxArmor, player.armor + 35);
        player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 0) + 35);
        player.ammoInventory[player.currentAmmoId] = (player.ammoInventory[player.currentAmmoId] ?? 0) + 60;
        spawnPulse(new BABYLON.Vector3(landing.x, 0.62, landing.z), '#ffd56f', 0.12, 0.18);
        notify(L('战地补给箱已投下：补充 1 个医疗包、35 护甲、35 体力与 60 发备弹。', 'Field Cache deployed: +1 medkit, +35 armor, +35 stamina, and +60 reserve rounds.'), 'success');
      }
    };

    const createThrownDevice = (type) => {
      if (type === 'saboteur') {
        const mesh = BABYLON.MeshBuilder.CreateCylinder(`saboteur-beacon-throw-${Math.random().toString(36).slice(2, 7)}`, { height: 0.28, diameter: 0.12, tessellation: 10 }, scene);
        mesh.material = rangeTargetMaterial('saboteur-beacon-throw-mat', '#59294a', '#ff7bd7');
        return mesh;
      }
      if (type === 'quartermaster') {
        const mesh = BABYLON.MeshBuilder.CreateBox(`quartermaster-cache-throw-${Math.random().toString(36).slice(2, 7)}`, { width: 0.24, height: 0.16, depth: 0.18 }, scene);
        mesh.material = rangeTargetMaterial('quartermaster-cache-throw-mat', '#856733', '#ffd57c');
        return mesh;
      }
      return null;
    };

    const originalUseOperatorUtility = useOperatorUtility;
    useOperatorUtility = function patchedUseOperatorUtility() {
      const raid = state.raid;
      const player = raid?.player;
      if (!player) {
        return;
      }
      ensurePlayerExpansionState(player);
      if (!CUSTOM_OPERATOR_IDS.includes(player.operatorId)) {
        return originalUseOperatorUtility();
      }
      if (player.operatorId === 'vanguard') {
        beginCustomUtilityAction(player, {
          type: 'vanguard',
          duration: 0.9,
          startX: player.x,
          startY: getPlayerViewHeight(player) - 0.22,
          startZ: player.z,
          targetX: player.x,
          targetZ: player.z,
          statusText: L('装甲拼接器启动中...', 'Activating Armor Splicer...'),
        });
        return;
      }
      if (player.operatorId === 'saboteur') {
        const landing = getForwardLanding(player, 8.8);
        beginCustomUtilityAction(player, {
          type: 'saboteur',
          duration: 0.84,
          startX: player.x + Math.sin(player.yaw) * 0.72,
          startY: getPlayerViewHeight(player) - 0.2,
          startZ: player.z + Math.cos(player.yaw) * 0.72,
          targetX: landing.x,
          targetZ: landing.z,
          meshFactory: () => createThrownDevice('saboteur'),
          statusText: L('投掷震荡信标...', 'Throwing Shock Beacon...'),
        });
        return;
      }
      const landing = getForwardLanding(player, 1.4);
      beginCustomUtilityAction(player, {
        type: 'quartermaster',
        duration: 0.98,
        startX: player.x + Math.sin(player.yaw) * 0.66,
        startY: getPlayerViewHeight(player) - 0.18,
        startZ: player.z + Math.cos(player.yaw) * 0.66,
        targetX: landing.x,
        targetZ: landing.z,
        meshFactory: () => createThrownDevice('quartermaster'),
        statusText: L('投下战地补给箱...', 'Dropping Field Cache...'),
      });
    };

    const activateCustomAbility = (player) => {
      if (!player || state.overlay) {
        return;
      }
      ensurePlayerExpansionState(player);
      if ((player.abilityActiveTimer ?? 0) > 0) {
        notify(L('技能正在生效。', 'Skill is already active.'), 'warning');
        return;
      }
      if ((player.skillUses ?? 0) <= 0) {
        notify(L('本局 4 次技能均已使用。', 'All 4 skill uses have been spent this raid.'), 'warning');
        return;
      }

      const operator = getPlayerOperatorDef(player);
      player.skillUses -= 1;
      player.abilityCharges = player.skillUses;
      player.skillChargeTimer = 0;
      player.abilityCooldown = 0;
      player.abilityCooldownPending = false;
      player.abilityActiveTimer = operator.abilityDuration ?? 0;
      player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);

      if (player.operatorId === 'vanguard') {
        player.vanguardArmorBase = player.maxArmor;
        player.maxArmor = Math.max(player.maxArmor, 320);
        player.armor = Math.min(player.maxArmor, player.armor + 220);
        player.damageReductionTimer = Math.max(player.damageReductionTimer ?? 0, player.abilityActiveTimer);
        player.damageReductionMult = Math.min(player.damageReductionMult ?? 1, 0.6);
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#74c7ff', 0.16, 0.24);
        notify(L(`壁垒驱动已启动，剩余技能 ${player.skillUses}/4。`, `Bulwark Drive active. Skill uses left: ${player.skillUses}/4.`), 'success');
      } else if (player.operatorId === 'saboteur') {
        player.saboteurHitChain = 0;
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#ff7cd0', 0.16, 0.22);
        notify(L(`猎链视窗已启动，剩余技能 ${player.skillUses}/4。`, `Kill Chain Window active. Skill uses left: ${player.skillUses}/4.`), 'success');
      } else if (player.operatorId === 'quartermaster') {
        player.quartermasterPulseTimer = 1;
        player.ammoInventory[player.currentAmmoId] = (player.ammoInventory[player.currentAmmoId] ?? 0) + 30;
        player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 0) + 20);
        spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#ffd36f', 0.15, 0.22);
        notify(L(`补给网络已启动，剩余技能 ${player.skillUses}/4。`, `Supply Web active. Skill uses left: ${player.skillUses}/4.`), 'success');
      }
      syncHud();
    };

    const originalUseOperatorAbility = useOperatorAbility;
    useOperatorAbility = function patchedUseOperatorAbility() {
      const player = state.raid?.player;
      if (!player || !CUSTOM_OPERATOR_IDS.includes(player.operatorId)) {
        return originalUseOperatorAbility();
      }
      return activateCustomAbility(player);
    };

    const originalBeginPlayerUseAction = beginPlayerUseAction;
    beginPlayerUseAction = function patchedBeginPlayerUseAction(config) {
      const player = state.raid?.player;
      if (player?.operatorId === 'quartermaster' && (player.abilityActiveTimer ?? 0) > 0) {
        config = {
          ...config,
          duration: Math.max(0.7, Number(config?.duration ?? 1.2) * 0.65),
        };
      }
      return originalBeginPlayerUseAction(config);
    };

    const originalGetPlayerMoveSpeed = getPlayerMoveSpeed;
    getPlayerMoveSpeed = function patchedGetPlayerMoveSpeed(player, sprinting = false) {
      let speed = originalGetPlayerMoveSpeed(player, sprinting);
      if (!player) {
        return speed;
      }
      if (player.operatorId === 'vanguard' && (player.abilityActiveTimer ?? 0) > 0 && player.isAiming) {
        speed /= 0.62;
      }
      if (player.operatorId === 'saboteur' && (player.abilityActiveTimer ?? 0) > 0) {
        speed *= 1.14;
      }
      if (player.operatorId === 'quartermaster' && (player.abilityActiveTimer ?? 0) > 0) {
        speed *= 1.08;
      }
      if ((player.vanguardBraceTimer ?? 0) > 0) {
        speed *= 1.06;
      }
      return speed;
    };

    const originalAttemptShoot = attemptShoot;
    attemptShoot = function patchedAttemptShoot() {
      const player = state.raid?.player;
      if (player?.executionLocked || player?.utilityAction?.expansion) {
        return;
      }
      const ammoBefore = player?.ammoInMag ?? 0;
      if (player) {
        player.__expansionShotOperator = player.operatorId;
        player.__expansionAbilityShot = (player.abilityActiveTimer ?? 0) > 0 ? player.operatorId : '';
      }
      try {
        const result = originalAttemptShoot();
        if (player && player.ammoInMag < ammoBefore) {
          if (player.operatorId === 'saboteur' && (player.abilityActiveTimer ?? 0) > 0) {
            player.fireCooldown *= 0.72;
          }
          if (player.operatorId === 'quartermaster' && (player.abilityActiveTimer ?? 0) > 0) {
            player.fireCooldown *= 0.84;
          }
        }
        return result;
      } finally {
        if (player) {
          delete player.__expansionShotOperator;
          delete player.__expansionAbilityShot;
        }
      }
    };

    const handleRangeTargetHit = (enemy, damage) => {
      const raid = state.raid;
      if (!raid || enemy.dead) {
        return;
      }
      const dealt = Math.max(1, Math.round(damage));
      enemy.health -= dealt;
      enemy.damageFlash = 0.7;
      raid.hitConfirmTimer = enemy.health <= 0 ? 0.34 : 0.2;
      raid.rangeStats.hits += 1;
      spawnImpactBurst(new BABYLON.Vector3(enemy.x, 1.36, enemy.z), '#ffd79c', enemy.health <= 0 ? 1.16 : 0.9, 'flesh');
      playImpactAudio(new BABYLON.Vector3(enemy.x, 1.36, enemy.z), 'flesh');
      if (typeof playHitConfirmAudio === 'function') {
        playHitConfirmAudio(enemy.health <= 0);
      }
      if (enemy.health <= 0) {
        enemy.dead = true;
        enemy.rangeRespawnTimer = 1.4;
        enemy.visual?.hitbox?.setEnabled(false);
        raid.rangeStats.bullseyes += 1;
        expansionProgress.rangeBestBullseyes = Math.max(expansionProgress.rangeBestBullseyes, raid.rangeStats.bullseyes);
        saveExpansionProgress();
        notify(L('靶标击倒。', 'Target down.'), 'success');
      }
    };

    const originalDamageEnemy = damageEnemy;
    damageEnemy = function patchedDamageEnemy(enemy, damage, options = {}) {
      const player = state.raid?.player;
      if (enemy?.isRangeTarget) {
        return handleRangeTargetHit(enemy, damage);
      }

      let nextDamage = damage;
      if (player?.__expansionAbilityShot === 'quartermaster') {
        nextDamage *= 1.25;
      }
      const beforeHealth = Number(enemy?.health ?? 0);
      const wasDead = Boolean(enemy?.dead);
      const result = originalDamageEnemy(enemy, nextDamage, options);
      const afterHealth = Number(enemy?.health ?? beforeHealth);
      const dealt = Math.max(0, beforeHealth - Math.max(0, afterHealth));

      if (!wasDead && dealt > 0 && player?.__expansionAbilityShot === 'saboteur') {
        player.saboteurHitChain = (player.saboteurHitChain ?? 0) + 1;
        if (player.saboteurHitChain >= 3) {
          player.saboteurHitChain -= 3;
          player.health = Math.min(player.maxHealth, player.health + 15);
          player.ammoInventory[player.currentAmmoId] = (player.ammoInventory[player.currentAmmoId] ?? 0) + 2;
          notify(L('猎链回路触发：恢复 15 生命并返还 2 发备弹。', 'Kill chain triggered: restored 15 HP and refunded 2 reserve rounds.'), 'success');
        }
      }
      if (!wasDead && dealt > 0 && player?.__expansionAbilityShot === 'quartermaster') {
        player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 0) + 6);
      }
      return result;
    };

    const getExecutionProfile = (operatorId) => EXECUTION_PROFILES[operatorId] ?? EXECUTION_PROFILES.fallback;

    const isPlayerBehindEnemy = (player, enemy) => {
      const dist = distance2D(player.x, player.z, enemy.x, enemy.z);
      if (dist > EXECUTION_RANGE) {
        return false;
      }
      if (lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) {
        return false;
      }
      const dirToPlayerX = dist > 0.001 ? (player.x - enemy.x) / dist : 0;
      const dirToPlayerZ = dist > 0.001 ? (player.z - enemy.z) / dist : -1;
      const enemyForwardX = Math.sin(enemy.heading ?? 0);
      const enemyForwardZ = Math.cos(enemy.heading ?? 0);
      const rearDot = enemyForwardX * dirToPlayerX + enemyForwardZ * dirToPlayerZ;
      return rearDot <= -0.34;
    };

    const findExecutionTarget = (raid = state.raid) => {
      const player = raid?.player;
      if (!raid || !player || state.overlay || player.utilityAction || player.useAction || player.reloadTimer > 0 || player.healTimer > 0 || player.mobilityAction || raid.switchSequence || raid.extractionSequence) {
        return null;
      }
      const feet = (actor) => actor.onRoofBuildingId
        ? (obstacleDefs.find((entry) => entry.id === actor.onRoofBuildingId)?.h ?? 0) : 0;
      let best = null;
      let bestScore = Infinity;
      for (const enemy of raid.enemies ?? []) {
        if (!enemy || enemy.dead || enemy.despawned || enemy.isRangeTarget) {
          continue;
        }
        if (!window.SDRCombat.executionEligible(player, enemy, feet,
          (from, to) => lineOfSightBlocked(from.x, from.z, to.x, to.z))) continue;
        const score = distance2D(player.x, player.z, enemy.x, enemy.z);
        if (score < bestScore) {
          best = enemy;
          bestScore = score;
        }
      }
      return best;
    };

    const startExecution = (enemy) => {
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || !enemy || raid.execution || enemy.dead) {
        return;
      }
      const profile = getExecutionProfile(player.operatorId);
      raid.execution = {
        enemyId: enemy.id,
        timer: profile.duration,
        duration: profile.duration,
        profile,
        applied: false,
      };
      enemy.executionFrozen = true;
      enemy.mobilityAction = null;
      enemy.shootCooldown = Number.POSITIVE_INFINITY;
      enemy.alertTimer = 0;
      enemy.investigateTimer = 0;
      player.executionLocked = true;
      state.input.fireHeld = false;
      state.input.aimHeld = false;
      raid.statusText = L(`正在${profile.nameZh}，期间仍会受到伤害。`, `Executing ${profile.nameEn}. You can still take damage.`);
      spawnPulse(new BABYLON.Vector3(enemy.x, 1.1, enemy.z), profile.color, 0.14, 0.18);
      syncHud();
    };

    const updateExecution = (raid, dt) => {
      if (!raid?.execution || !raid.player) {
        return;
      }
      const player = raid.player;
      const execution = raid.execution;
      const enemy = raid.enemies.find((entry) => entry.id === execution.enemyId);
      if (!enemy || enemy.dead) {
        if (enemy) {
          enemy.executionFrozen = false;
        }
        player.executionLocked = false;
        raid.execution = null;
        return;
      }

      execution.timer = Math.max(0, execution.timer - dt);
      const progress = clamp(1 - execution.timer / Math.max(execution.duration, 0.001), 0, 1);
      const backX = -Math.sin(enemy.heading ?? 0);
      const backZ = -Math.cos(enemy.heading ?? 0);
      const targetX = enemy.x + backX * 1.02;
      const targetZ = enemy.z + backZ * 1.02;
      player.x = lerp(player.x, targetX, 0.36);
      player.z = lerp(player.z, targetZ, 0.36);
      player.yaw = lerp(player.yaw, enemy.heading ?? player.yaw, 0.28);
      player.pitch = lerp(player.pitch, 0.06, 0.18);
      player.velocityBob = 0;
      if (player.mobilityAction) {
        player.mobilityAction = null;
      }
      if (enemy.visual?.root) {
        const swing = Math.sin(progress * Math.PI);
        const profile = execution.profile;
        if (player.operatorId === 'assault') {
          enemy.visual.root.rotation.z = -0.1 - swing * 0.26;
          enemy.visual.root.position.y = swing * 0.05;
        } else if (player.operatorId === 'medic') {
          enemy.visual.root.rotation.x = swing * 0.16;
          enemy.visual.root.rotation.z = -swing * 0.18;
        } else if (player.operatorId === 'vanguard') {
          enemy.visual.root.rotation.z = -0.16 - swing * 0.32;
          enemy.visual.root.position.y = swing * 0.03;
        } else if (player.operatorId === 'saboteur') {
          enemy.visual.root.rotation.y = swing * 0.22;
          enemy.visual.root.rotation.z = -0.08 - swing * 0.14;
        } else if (player.operatorId === 'quartermaster') {
          enemy.visual.root.rotation.x = -swing * 0.2;
          enemy.visual.root.rotation.z = -swing * 0.16;
        } else {
          enemy.visual.root.rotation.z = -swing * 0.16;
        }
        if (!execution.applied && progress >= 0.58) {
          execution.applied = true;
          spawnImpactBurst(new BABYLON.Vector3(enemy.x, 1.3, enemy.z), profile.color, 1.5, 'flesh');
          playImpactAudio(new BABYLON.Vector3(enemy.x, 1.3, enemy.z), 'flesh');
          killEnemy(enemy);
        }
      }
      syncPlayerCamera();
      if (execution.timer <= 0) {
        enemy.executionFrozen = false;
        player.executionLocked = false;
        raid.execution = null;
        if (enemy.visual?.root) {
          enemy.visual.root.rotation.x = 0;
          enemy.visual.root.rotation.z = 0;
        }
      }
    };

    const updateRangeTargets = (raid, dt) => {
      for (const enemy of raid.enemies ?? []) {
        if (!enemy.isRangeTarget) {
          continue;
        }
        if (enemy.dead) {
          enemy.rangeRespawnTimer = Math.max(0, (enemy.rangeRespawnTimer ?? 1.2) - dt);
          if (enemy.visual?.root) {
            enemy.visual.root.rotation.z = lerp(enemy.visual.root.rotation.z, -0.92, 0.2);
          }
          if (enemy.rangeRespawnTimer <= 0) {
            enemy.dead = false;
            enemy.health = enemy.maxHealth;
            enemy.damageFlash = 0;
            enemy.visual?.hitbox?.setEnabled(true);
            if (enemy.visual?.root) {
              enemy.visual.root.rotation.z = 0;
              enemy.visual.root.position.y = 0;
            }
          }
          continue;
        }
        if (raid.rangeMotion === 'moving' && !enemy.executionFrozen) {
          const player = raid.player;
          const dx = enemy.anchorX - player.x;
          const dz = enemy.anchorZ - player.z;
          const length = Math.max(0.001, Math.hypot(dx, dz));
          const sideX = -dz / length;
          const sideZ = dx / length;
          enemy.rangeDecisionTimer -= dt;
          enemy.rangeBurstTimer = Math.max(0, enemy.rangeBurstTimer - dt);
          if (enemy.rangeDecisionTimer <= 0) {
            enemy.rangeDecisionTimer = 0.38 + Math.random() * 0.52;
            if (Math.random() < 0.75) enemy.rangeSide *= -1;
            enemy.rangeDepth = Math.random() * 2 - 1;
            if (Math.random() < 0.3) enemy.rangeBurstTimer = 0.24 + Math.random() * 0.22;
          }
          const sidestep = enemy.rangeSide * (1.5 + (enemy.rangeBurstTimer > 0 ? 1.4 : 0));
          const targetX = enemy.anchorX + sideX * sidestep + dx / length * enemy.rangeDepth;
          const targetZ = enemy.anchorZ + sideZ * sidestep + dz / length * enemy.rangeDepth;
          const offsetX = targetX - enemy.x;
          const offsetZ = targetZ - enemy.z;
          const travel = Math.hypot(offsetX, offsetZ);
          let moved = 0;
          if (travel > 0.04) {
            const step = Math.min(travel, dt * (enemy.rangeBurstTimer > 0 ? 7.4 : 4.2));
            const beforeX = enemy.x;
            const beforeZ = enemy.z;
            moveEntityWithCollision(enemy, offsetX / travel * step, offsetZ / travel * step, enemy.radius ?? 0.7);
            moved = Math.hypot(enemy.x - beforeX, enemy.z - beforeZ);
          }
          enemy.rangePhase = (enemy.rangePhase ?? 0) + moved * 5;
          enemy.heading = Math.atan2(player.x - enemy.x, player.z - enemy.z);
        } else if (!enemy.executionFrozen) {
          enemy.x = enemy.anchorX;
          enemy.z = enemy.anchorZ;
        }
        if (enemy.visual?.root) {
          enemy.visual.root.rotation.y = enemy.heading ?? 0;
          enemy.visual.root.position.y = Math.sin(performance.now() * 0.002 + enemy.anchorX * 0.1) * 0.02;
          if (enemy.visual.leftLeg && enemy.visual.rightLeg) {
            const stride = raid.rangeMotion === 'moving' ? Math.sin(enemy.rangePhase * 4.2) * 0.35 : 0;
            enemy.visual.leftLeg.rotation.x = stride;
            enemy.visual.rightLeg.rotation.x = -stride;
          }
        }
      }
    };

    const applyDamageBeforeRange = applyDamageToPlayer;
    applyDamageToPlayer = function applyDamageOutsideRange(amount) {
      if (state.raid?.isTrainingRange) return;
      return applyDamageBeforeRange(amount);
    };

    const updateWorldUtilities = (raid, dt) => {
      const beacon = raid?.shockBeacon;
      if (beacon?.visual?.halo) {
        beacon.timer = Math.max(0, beacon.timer - dt);
        beacon.pulseTimer = Math.max(0, (beacon.pulseTimer ?? 0) - dt);
        beacon.visual.pulse += dt;
        beacon.visual.halo.scaling.setAll(0.9 + Math.sin(beacon.visual.pulse * 7) * 0.1);
        beacon.visual.halo.material.alpha = 0.5 + Math.sin(beacon.visual.pulse * 6.5) * 0.16;
        if (beacon.pulseTimer <= 0) {
          beacon.pulseTimer += 0.5;
          spawnPulse(new BABYLON.Vector3(beacon.x, 0.34, beacon.z), '#ff8fe5', 0.08, 0.08);
        }
        if (beacon.timer <= 0) {
          disposeVisual(beacon.visual);
          raid.shockBeacon = null;
        }
      }

      const fieldCache = raid?.fieldCache;
      if (fieldCache?.visual?.lid) {
        fieldCache.timer = Math.max(0, fieldCache.timer - dt);
        fieldCache.visual.pulse += dt;
        fieldCache.visual.lid.position.y = 0.58 + Math.sin(fieldCache.visual.pulse * 3.2) * 0.02;
        if (fieldCache.timer <= 0) {
          disposeVisual(fieldCache.visual);
          raid.fieldCache = null;
        }
      }
    };

    const originalUpdateEnemies = updateEnemies;
    updateEnemies = function patchedUpdateEnemies(dt) {
      const raid = state.raid;
      if (!raid?.player) {
        return originalUpdateEnemies(dt);
      }

      const parked = [];
      const active = [];
      for (const enemy of raid.enemies ?? []) {
        if (enemy.isRangeTarget || enemy.executionFrozen) {
          parked.push(enemy);
        } else {
          active.push(enemy);
        }
      }

      const beacon = raid.shockBeacon;
      const altered = [];
      if (beacon) {
        for (const enemy of active) {
          const dist = distance2D(enemy.x, enemy.z, beacon.x, beacon.z);
          if (dist > 18 || enemy.dead || enemy.isNamelessBoss) {
            continue;
          }
          altered.push([enemy, enemy.speed, enemy.accuracyBonus]);
          enemy.speed *= 0.62;
          enemy.accuracyBonus = (enemy.accuracyBonus ?? 0) - 0.18;
          enemy.lastKnownPlayerX = beacon.x;
          enemy.lastKnownPlayerZ = beacon.z;
          enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 1.2);
        }
      }

      const originalList = raid.enemies;
      raid.enemies = active;
      try {
        originalUpdateEnemies(dt);
      } finally {
        for (const [enemy, speed, accuracyBonus] of altered) {
          enemy.speed = speed;
          enemy.accuracyBonus = accuracyBonus;
        }
        raid.enemies = active.concat(parked);
      }
    };

    const originalUpdatePlayer = updatePlayer;
    updatePlayer = function patchedUpdatePlayer(dt) {
      const raid = state.raid;
      const player = raid?.player;
      if (player?.executionLocked) {
        player.fireCooldown = Math.max(0, (player.fireCooldown ?? 0) - dt);
        player.reloadTimer = Math.max(0, (player.reloadTimer ?? 0) - dt);
        syncPlayerCamera();
        return;
      }
      if (player?.utilityAction?.expansion) {
        state.input.fireHeld = false;
      }
      return originalUpdatePlayer(dt);
    };

    const updateCustomUtilityAction = (player, dt) => {
      const action = player?.utilityAction;
      if (!action?.expansion) {
        return;
      }
      action.timer = Math.max(0, action.timer - dt);
      const mesh = action.flightMesh;
      if (mesh) {
        const progress = clamp(1 - action.timer / Math.max(action.duration, 0.001), 0, 1);
        mesh.position.x = lerp(action.startX, action.targetX, progress);
        mesh.position.z = lerp(action.startZ, action.targetZ, progress);
        mesh.position.y = lerp(action.startY, 0.24, progress) + Math.sin(progress * Math.PI) * (action.type === 'saboteur' ? 0.9 : 0.5);
        mesh.rotation.x += dt * 14;
        mesh.rotation.z += dt * 9;
      }
      if (action.timer <= 0) {
        disposeVisual(action.flightMesh);
        player.utilityAction = null;
        applyCustomUtilityEffect(action);
      }
    };

    const syncUtilityUi = (player) => {
      const meta = getExpansionUtilityMeta(player?.operatorId);
      if (!player || !meta) {
        return;
      }
      const panel = document.getElementById('operatorUtilityPanel');
      const button = document.getElementById('utilityActionButton');
      if (panel) {
        const label = panel.querySelector('#operatorUtilityLabel');
        const value = panel.querySelector('#operatorUtilityValue');
        const detail = panel.querySelector('#operatorUtilityDetail');
        const fill = panel.querySelector('#operatorUtilityFill');
        const count = Math.max(0, Number(player.utilityItems ?? 0));
        const gainTime = Math.max(1, Number(player.utilityGainInterval ?? 20));
        const timer = Math.max(0, Number(player.utilityGainTimer ?? gainTime));
        if (label) label.textContent = L('专属道具', 'Utility');
        if (value) value.textContent = `${L(meta.nameZh, meta.nameEn)} ${count}/${player.utilityMaxItems ?? 2}`;
        if (detail) {
          detail.textContent = player.utilityAction?.expansion
            ? L('使用中...', 'Using...')
            : count > 0
              ? L(meta.detailZh, meta.detailEn)
              : L(`${timer.toFixed(0)} 秒后补充 1 个`, `+1 in ${timer.toFixed(0)}s`);
        }
        if (fill) {
          fill.style.background = meta.color;
          fill.style.width = `${count >= (player.utilityMaxItems ?? 2) ? 100 : Math.max(0, Math.min(100, (1 - timer / gainTime) * 100))}%`;
        }
      }
      if (button) {
        button.textContent = `${L(meta.nameZh, meta.nameEn)} G`;
        button.title = L(`使用${meta.nameZh}`, `Use ${meta.nameEn}`);
        button.disabled = (player.utilityItems ?? 0) <= 0 || Boolean(player.utilityAction) || state.mode !== 'raid';
      }
    };

    const originalRenderRaidLoadoutMarkup = renderRaidLoadoutMarkup;
    renderRaidLoadoutMarkup = function patchedRenderRaidLoadoutMarkup() {
      const player = state.raid?.player;
      const meta = getExpansionUtilityMeta(player?.operatorId);
      if (!player || !meta) {
        return originalRenderRaidLoadoutMarkup();
      }
      const stats = getCurrentPlayerWeaponStats(player);
      const reserve = getCurrentReserveAmmo(player);
      return [
        prepRow(L('兵种', 'Operator'), L(getPlayerOperatorDef(player).nameZh, getPlayerOperatorDef(player).nameEn)),
        prepRow(L('技能', 'Skill'), `${L(getPlayerOperatorDef(player).skillNameZh, getPlayerOperatorDef(player).skillNameEn)} · ${Math.max(0, player.skillUses ?? 0)}/4 · ${Math.ceil(player.abilityActiveTimer ?? 0)}s`),
        prepRow(L('专属道具', 'Utility'), `${L(meta.nameZh, meta.nameEn)} · ${Math.max(0, player.utilityItems ?? 0)}/${player.utilityMaxItems ?? 2} · G`),
        prepRow(L('当前武器', 'Current Weapon'), `${getWeaponLabel(player.weapon)} · ${stats.damage} ${L('伤害', 'damage')}`),
        prepRow(L('当前子弹', 'Current Ammo'), getAmmoTierLabel(player.currentAmmoId)),
        prepRow(L('弹匣 / 备弹', 'Mag / Reserve'), `${player.ammoInMag} / ${reserve}`),
        prepRow(L('处决键', 'Execution'), EXECUTION_KEY_LABEL),
      ].join('');
    };

    const originalSyncHud = syncHud;
    syncHud = function patchedSyncHud() {
      const result = originalSyncHud();
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player) {
        return result;
      }
      ensurePlayerExpansionState(player);
      syncUtilityUi(player);

      if (refs.raidStatus && !player.utilityAction && !raid.execution) {
        refs.raidStatus.textContent = raid.isTrainingRange
          ? L('靶场进行中 · 鼠标转向 · F 开火 · C 技能 · G 道具 · B 处决 · E 返回', 'Range active · Mouse look · F fire · C skill · G utility · B execute · E leave')
          : L('鼠标转向 · F 开火 · C 技能 · G 道具 · B 处决 · E 交互', 'Mouse look · F fire · C skill · G utility · B execute · E interact');
      }

      if (refs.supportPrompt) {
        const executionTarget = findExecutionTarget(raid);
        if (raid.execution) {
          refs.supportPrompt.textContent = L('处决中，期间不会无敌。', 'Executing. You are not invulnerable.');
          refs.supportPrompt.classList.remove('muted');
        } else if (executionTarget) {
          refs.supportPrompt.textContent = L(`按 ${EXECUTION_KEY_LABEL} 处决`, `Press ${EXECUTION_KEY_LABEL} to execute`);
          refs.supportPrompt.classList.remove('muted');
        } else if (raid.isTrainingRange) {
          refs.supportPrompt.textContent = L(
            `靶场命中 ${raid.rangeStats?.hits ?? 0} 次 · 击倒 ${raid.rangeStats?.bullseyes ?? 0} 个靶标`,
            `Range hits ${raid.rangeStats?.hits ?? 0} · bullseyes ${raid.rangeStats?.bullseyes ?? 0}`,
          );
          refs.supportPrompt.classList.remove('muted');
        }
      }
      return result;
    };

    const originalApplyStaticLanguage = applyStaticLanguage;
    applyStaticLanguage = function patchedApplyStaticLanguage() {
      const result = originalApplyStaticLanguage();
      if (refs.tipAction) {
        refs.tipAction.textContent = L('Q 治疗，E 搜索 / 撤离，M 地图，C 技能，B 处决', 'Q heal, E search / extract, M map, C skill, B execute');
      }
      if (state.mode === 'base') {
        renderBasePanel();
      }
      return result;
    };

    const originalFinishRaid = finishRaid;
    finishRaid = function patchedFinishRaid(success, reason, extracted) {
      const raid = state.raid;
      if (!raid?.isTrainingRange) {
        return originalFinishRaid(success, reason, extracted);
      }
      const bullseyes = raid.rangeStats?.bullseyes ?? 0;
      expansionProgress.rangeBestBullseyes = Math.max(expansionProgress.rangeBestBullseyes, bullseyes);
      saveExpansionProgress();
      clearRaid();
      setMode('base');
      renderBasePanel();
      notify(
        L(`已离开靶场，本次击倒 ${bullseyes} 个靶标。`, `Left the range with ${bullseyes} bullseyes this session.`),
        success ? 'success' : 'warning',
      );
    };

    const originalStartRaid = startRaid;
    startRaid = function patchedStartRaid() {
      ensureSaveShape();
      const result = originalStartRaid();
      ensurePlayerExpansionState(state.raid?.player);
      return result;
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function patchedUpdateRaid(dt) {
      const raid = state.raid;
      if (raid?.player) {
        ensurePlayerExpansionState(raid.player);
      }

      const result = originalUpdateRaid(dt);
      const currentRaid = state.raid;
      const player = currentRaid?.player;
      if (!currentRaid || !player) {
        return result;
      }

      ensurePlayerExpansionState(player);
      player.vanguardBraceTimer = Math.max(0, (player.vanguardBraceTimer ?? 0) - dt);
      if ((player.abilityActiveTimer ?? 0) <= 0 && player.vanguardArmorBase != null) {
        player.maxArmor = Math.max(player.vanguardArmorBase, Math.round(Math.max(player.armor, player.vanguardArmorBase)));
        player.vanguardArmorBase = null;
      }

      if (player.operatorId === 'quartermaster' && (player.abilityActiveTimer ?? 0) > 0) {
        player.quartermasterPulseTimer = Math.max(0, (player.quartermasterPulseTimer ?? 1) - dt);
        if (player.quartermasterPulseTimer <= 0) {
          player.quartermasterPulseTimer += 1;
          player.stamina = Math.min(player.maxStamina ?? 100, (player.stamina ?? 0) + 12);
          player.armor = Math.min(player.maxArmor, player.armor + 6);
        }
      }

      updateCustomUtilityAction(player, dt);
      updateWorldUtilities(currentRaid, dt);
      updateExecution(currentRaid, dt);
      if (currentRaid.isTrainingRange) {
        updateRangeTargets(currentRaid, dt);
        currentRaid.dynamicChoiceSpawned = true;
        currentRaid.dynamicChoiceAt = Number.POSITIVE_INFINITY;
      }
      syncHud();
      return result;
    };

    if (!refs.basePanel?.dataset.expansionBound) {
      refs.basePanel.dataset.expansionBound = 'true';
      refs.basePanel.addEventListener('click', (event) => {
        const rangeMotionButton = event.target.closest('[data-expansion-range-motion]');
        if (rangeMotionButton) {
          expansionProgress.rangeMotion = rangeMotionButton.dataset.expansionRangeMotion === 'moving' ? 'moving' : 'static';
          saveExpansionProgress();
          renderBasePanel();
          return;
        }
        const unlockButton = event.target.closest('[data-expansion-operator-unlock]');
        if (unlockButton) {
          unlockOperator(unlockButton.dataset.expansionOperatorUnlock, unlockButton.dataset.expansionUnlockMode);
          return;
        }

        const stashAction = event.target.closest('[data-expansion-stash-action]');
        if (stashAction) {
          const action = stashAction.dataset.expansionStashAction;
          if (action === 'toggle-all') {
            const { count } = getBatchSelectionTotals();
            selectAllStash(count !== (state.save.stash ?? []).length);
          } else if (action === 'sell-selected') {
            sellSelectedStash();
          } else if (action === 'discard-selected') {
            discardSelectedStash();
          }
          return;
        }

        const actionButton = event.target.closest('[data-expansion-action]');
        if (actionButton?.dataset.expansionAction === 'start-range') {
          startTrainingRange();
        }
      });

      refs.stashList?.addEventListener('change', (event) => {
        const input = event.target.closest('[data-expansion-stash-select]');
        if (!input) {
          return;
        }
        if (input.checked) {
          BATCH_SELECTION.add(input.dataset.expansionStashSelect);
        } else {
          BATCH_SELECTION.delete(input.dataset.expansionStashSelect);
        }
        input.closest('.expansion-stash-row')?.classList.toggle('is-selected', input.checked);
        syncBatchToolbar();
      });

      refs.stashList?.addEventListener('click', (event) => {
        if (event.target.closest('button, input, label')) return;
        const row = event.target.closest('.expansion-stash-row');
        const input = row?.querySelector('[data-expansion-stash-select]');
        input?.click();
      });
    }

    window.addEventListener('keydown', (event) => {
      if (event.repeat || state.mode !== 'raid' || !state.raid || state.overlay) {
        return;
      }
      if (event.code !== EXECUTION_KEY_CODE && event.key?.toLowerCase?.() !== 'b') {
        return;
      }
      const target = findExecutionTarget(state.raid);
      if (!target) {
        notify(L('附近没有可处决目标；需同层贴近且无遮挡。', 'No valid execution target nearby. Get close on the same floor with a clear path.'), 'warning');
        return;
      }
      event.preventDefault();
      startExecution(target);
    });

    markDefsApplied();
    ensureSaveShape();
    ensureExpansionStyle();
    renderBasePanel();
  };

  boot();
})();
