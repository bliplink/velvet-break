const BABYLON = window.BABYLON;

if (!BABYLON) {
  throw new Error('Babylon.js failed to load.');
}

const STORAGE_KEY = 'iron-extraction-save-v1';
const SAVE_SCHEMA_VERSION = 3;
const MAP_HALF = 144;
const MAP_SIZE = MAP_HALF * 2;
const PLAYABLE_HALF = MAP_HALF - 6.1;
const PLAYER_RADIUS = 0.75;
const PLAYER_HEIGHT = 1.68;
const RAID_DURATION = 10 * 60;
const BASE_RESERVE_AMMO = 90;
const BASE_MEDKITS = 1;
const BASE_ARMOR = 30;
const PLAYER_BASE_HEALTH = 150;
const PLAYER_HEAL_AMOUNT = 75;
const PLAYER_HEAL_COOLDOWN = 1.6;
const EXTRACTION_HOLD_TIME = 3;
const SWITCH_EXTRACTION_WINDOW = 45;
const ENEMY_FALL_DURATION = 1.15;
const PRONE_TRANSITION_DURATION = 0.34;
const DEPLOY_ANIMATION_DURATION = 1.35;
const DEPLOY_START_HEIGHT = 8.4;
const SPAWN_SAFE_RADIUS = 84;
const SPAWN_SAFE_DURATION = 10;
const PLAYER_DODGE_SPEED = 10.2;
const PLAYER_DODGE_DURATION = 0.4;
const PLAYER_DODGE_COOLDOWN = 0.92;
const MAX_BAG_LEVEL = 3;
const MAX_WEAPON_LEVEL = 4;
const WORLD_SCALE = MAP_HALF / 72;
const debugMode = new URLSearchParams(window.location.search).get('debug') || '';
const WEAPON_ORDER = ['rifle', 'smg', 'shotgun', 'dmr'];
const WEAPON_DEFS = {
  rifle: {
    id: 'rifle',
    name: 'Ranger Rifle',
    caliber: '5.56',
    magSize: 30,
    baseReserve: 90,
    damage: 28,
    damageGain: 4,
    fireRate: 7.5,
    reload: 1.5,
    spread: 0.008,
    pellets: 1,
    range: 120,
    tracer: '#ffe091',
    defaultAmmoId: 'rifle_fmj',
    unlockPrice: 0,
  },
  smg: {
    id: 'smg',
    name: 'Viper SMG',
    caliber: '9mm',
    magSize: 36,
    baseReserve: 132,
    damage: 14,
    damageGain: 3,
    fireRate: 11.2,
    reload: 1.35,
    spread: 0.015,
    pellets: 1,
    range: 100,
    tracer: '#a7f1d9',
    defaultAmmoId: 'smg_ball',
    unlockPrice: 7800,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Breach Shotgun',
    caliber: '12g',
    magSize: 8,
    baseReserve: 32,
    damage: 15,
    damageGain: 2,
    fireRate: 1.15,
    reload: 1.9,
    spread: 0.06,
    pellets: 7,
    range: 62,
    tracer: '#ffd0a1',
    defaultAmmoId: 'shotgun_buck',
    unlockPrice: 9600,
  },
  dmr: {
    id: 'dmr',
    name: 'Sentinel DMR',
    caliber: '7.62',
    magSize: 20,
    baseReserve: 64,
    damage: 44,
    damageGain: 5,
    fireRate: 3.8,
    reload: 1.75,
    spread: 0.006,
    pellets: 1,
    range: 152,
    tracer: '#f7c39c',
    defaultAmmoId: 'dmr_fmj',
    unlockPrice: 11800,
  },
};

const AMMO_DEFS = {
  rifle_fmj: { id: 'rifle_fmj', name: '5.56 FMJ I', weaponIds: ['rifle'], caliber: '5.56', tierLabel: 'Tier I', price: 520, packSize: 45, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 600, weight: 1.0 },
  rifle_ap: { id: 'rifle_ap', name: '5.56 AP II', weaponIds: ['rifle'], caliber: '5.56', tierLabel: 'Tier II', price: 980, packSize: 40, damageBonus: 3, spreadMult: 0.96, rangeBonus: 4, rarity: 'uncommon', pool: 'weapon', sellValue: 1200, weight: 1.0 },
  rifle_match: { id: 'rifle_match', name: '5.56 Match III', weaponIds: ['rifle'], caliber: '5.56', tierLabel: 'Tier III', price: 1420, packSize: 36, damageBonus: 5, spreadMult: 0.84, rangeBonus: 8, rarity: 'rare', pool: 'valuable', sellValue: 1700, weight: 0.9 },
  smg_ball: { id: 'smg_ball', name: '9mm Ball I', weaponIds: ['smg'], caliber: '9mm', tierLabel: 'Tier I', price: 460, packSize: 60, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 540, weight: 1.1 },
  smg_plusp: { id: 'smg_plusp', name: '9mm +P II', weaponIds: ['smg'], caliber: '9mm', tierLabel: 'Tier II', price: 860, packSize: 54, damageBonus: 2, spreadMult: 0.94, rangeBonus: 6, rarity: 'uncommon', pool: 'weapon', sellValue: 1040, weight: 1.0 },
  shotgun_buck: { id: 'shotgun_buck', name: '12g Buck I', weaponIds: ['shotgun'], caliber: '12g', tierLabel: 'Tier I', price: 540, packSize: 20, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 620, weight: 1.2 },
  shotgun_slug: { id: 'shotgun_slug', name: '12g Slug II', weaponIds: ['shotgun'], caliber: '12g', tierLabel: 'Tier II', price: 940, packSize: 18, damageBonus: 4, spreadMult: 0.28, rangeBonus: 18, pelletsOverride: 1, rarity: 'uncommon', pool: 'valuable', sellValue: 1180, weight: 1.0 },
  dmr_fmj: { id: 'dmr_fmj', name: '7.62 FMJ I', weaponIds: ['dmr'], caliber: '7.62', tierLabel: 'Tier I', price: 760, packSize: 30, damageBonus: 0, spreadMult: 1, rangeBonus: 0, rarity: 'common', pool: 'weapon', sellValue: 900, weight: 0.9 },
  dmr_ap: { id: 'dmr_ap', name: '7.62 AP III', weaponIds: ['dmr'], caliber: '7.62', tierLabel: 'Tier III', price: 1580, packSize: 24, damageBonus: 6, spreadMult: 0.88, rangeBonus: 10, rarity: 'rare', pool: 'valuable', sellValue: 1860, weight: 0.8 },
};

const PART_DEFS = {
  red_dot: { id: 'red_dot', name: 'Red Dot', slot: 'optic', compatibleWeapons: ['rifle', 'smg', 'dmr'], price: 1900, value: 1500, weight: 0.4, rarity: 'uncommon', category: 'Gun Part', spreadMult: 0.88, pool: 'weapon' },
  extended_mag: { id: 'extended_mag', name: 'Extended Mag', slot: 'mag', compatibleWeapons: ['rifle', 'smg', 'dmr'], price: 2400, value: 1900, weight: 0.7, rarity: 'rare', category: 'Gun Part', magBonus: 8, pool: 'weapon' },
  muzzle_brake: { id: 'muzzle_brake', name: 'Muzzle Brake', slot: 'muzzle', compatibleWeapons: ['rifle', 'smg', 'dmr'], price: 2100, value: 1700, weight: 0.5, rarity: 'uncommon', category: 'Gun Part', spreadMult: 0.9, fireRateBonus: 0.25, pool: 'tech' },
  recoil_pad: { id: 'recoil_pad', name: 'Recoil Pad', slot: 'stock', compatibleWeapons: ['rifle', 'shotgun', 'dmr'], price: 1800, value: 1450, weight: 0.5, rarity: 'common', category: 'Gun Part', reloadMult: 0.88, spreadMult: 0.94, pool: 'weapon' },
  laser_rail: { id: 'laser_rail', name: 'Laser Rail', slot: 'rail', compatibleWeapons: ['rifle', 'smg'], price: 1650, value: 1320, weight: 0.3, rarity: 'common', category: 'Gun Part', spreadMult: 0.95, fireRateBonus: 0.18, pool: 'tech' },
  tight_choke: { id: 'tight_choke', name: 'Tight Choke', slot: 'shotgunMuzzle', compatibleWeapons: ['shotgun'], price: 1750, value: 1440, weight: 0.4, rarity: 'uncommon', category: 'Gun Part', spreadMult: 0.72, damageBonus: 2, pool: 'weapon' },
  marksman_bipod: { id: 'marksman_bipod', name: 'Marksman Bipod', slot: 'dmrRail', compatibleWeapons: ['dmr'], price: 2250, value: 1840, weight: 0.6, rarity: 'rare', category: 'Gun Part', spreadMult: 0.82, damageBonus: 3, pool: 'tech' },
};

const CORE_LOOT_ITEMS = [
  { id: 'field_bandage', name: 'Field Bandage', category: 'Medical', rarity: 'common', value: 650, weight: 0.4, pools: ['med'], spawnWeight: 20, itemType: 'usable', useAction: 'heal', healAmount: 16, useTime: 1.3 },
  { id: 'painkiller_kit', name: 'Painkiller Kit', category: 'Medical', rarity: 'uncommon', value: 1500, weight: 0.5, pools: ['med'], spawnWeight: 14, itemType: 'usable', useAction: 'heal', healAmount: 28, useTime: 1.75 },
  { id: 'combat_stim', name: 'Combat Stim', category: 'Medical', rarity: 'rare', value: 3200, weight: 0.4, pools: ['med', 'valuable'], spawnWeight: 8, itemType: 'usable', useAction: 'heal', healAmount: 42, useTime: 2.1 },
  { id: 'spare_medkit', name: 'Spare Medkit', category: 'Medical', rarity: 'uncommon', value: 1900, weight: 0.8, pools: ['med'], spawnWeight: 11, itemType: 'usable', useAction: 'medkit', medkitAmount: 1, useTime: 1.5 },
  { id: 'armor_patch', name: 'Armor Patch', category: 'Support', rarity: 'uncommon', value: 2100, weight: 1.0, pools: ['weapon', 'med'], spawnWeight: 10, itemType: 'usable', useAction: 'armor', armorAmount: 20, useTime: 2.4 },
  { id: 'plate_bundle', name: 'Plate Bundle', category: 'Support', rarity: 'rare', value: 3400, weight: 1.8, pools: ['weapon', 'valuable'], spawnWeight: 6, itemType: 'usable', useAction: 'armor', armorAmount: 38, useTime: 3.1 },
  { id: 'circuit', name: 'Circuit Board', category: 'Tech', rarity: 'common', value: 900, weight: 0.6, pools: ['tech'], spawnWeight: 18 },
  { id: 'sensor', name: 'Thermal Sensor', category: 'Tech', rarity: 'rare', value: 4100, weight: 0.9, pools: ['tech', 'valuable'], spawnWeight: 7 },
  { id: 'dronecore', name: 'Drone Core', category: 'Tech', rarity: 'epic', value: 7600, weight: 1.4, pools: ['tech', 'valuable'], spawnWeight: 4 },
  { id: 'weaponparts', name: 'Receiver Parts', category: 'Hardware', rarity: 'common', value: 1100, weight: 1.0, pools: ['weapon'], spawnWeight: 18 },
  { id: 'intel', name: 'Intel Drive', category: 'Data', rarity: 'epic', value: 9800, weight: 0.3, pools: ['valuable'], spawnWeight: 4 },
  { id: 'coin', name: 'Collector Coin', category: 'Valuable', rarity: 'rare', value: 3900, weight: 0.2, pools: ['valuable'], spawnWeight: 8 },
  { id: 'watch', name: 'Tactical Watch', category: 'Valuable', rarity: 'uncommon', value: 2400, weight: 0.5, pools: ['valuable'], spawnWeight: 12 },
  { id: 'artifact', name: 'Archive Artifact', category: 'Relic', rarity: 'legendary', value: 16800, weight: 2.2, pools: ['valuable'], spawnWeight: 2 },
  { id: 'crimson_archive', name: 'Crimson Archive', category: 'Relic', rarity: 'red', value: 42000, weight: 1.6, pools: ['valuable'], spawnWeight: 0.35 },
];

const refs = {
  canvas: document.getElementById('gameCanvas'),
  basePanel: document.getElementById('basePanel'),
  deployButton: document.getElementById('deployButton'),
  saveResetButton: document.getElementById('saveResetButton'),
  sellAllButton: document.getElementById('sellAllButton'),
  summaryStrip: document.getElementById('summaryStrip'),
  lobbyTitle: document.getElementById('lobbyTitle'),
  lobbyNote: document.getElementById('lobbyNote'),
  lobbyPanel: document.getElementById('lobbyPanel'),
  loadoutPrep: document.getElementById('loadoutPrep'),
  armoryPanel: document.getElementById('armoryPanel'),
  shopList: document.getElementById('shopList'),
  stashList: document.getElementById('stashList'),
  hud: document.getElementById('hud'),
  healthValue: document.getElementById('healthValue'),
  weaponValue: document.getElementById('weaponValue'),
  armorValue: document.getElementById('armorValue'),
  ammoValue: document.getElementById('ammoValue'),
  medkitValue: document.getElementById('medkitValue'),
  bagValue: document.getElementById('bagValue'),
  weightValue: document.getElementById('weightValue'),
  haulValue: document.getElementById('haulValue'),
  timeValue: document.getElementById('timeValue'),
  objectiveLabel: document.getElementById('objectiveLabel'),
  objectiveValue: document.getElementById('objectiveValue'),
  objectiveDetail: document.getElementById('objectiveDetail'),
  threatLabel: document.getElementById('threatLabel'),
  threatValue: document.getElementById('threatValue'),
  abilityLabel: document.getElementById('abilityLabel'),
  abilityValue: document.getElementById('abilityValue'),
  abilityDetail: document.getElementById('abilityDetail'),
  abilityMeterFill: document.getElementById('abilityMeterFill'),
  raidStatus: document.getElementById('raidStatus'),
  interactionPrompt: document.getElementById('interactionPrompt'),
  supportPrompt: document.getElementById('supportPrompt'),
  minimapCanvas: document.getElementById('minimapCanvas'),
  extractList: document.getElementById('extractList'),
  lootPanel: document.getElementById('lootPanel'),
  lootTitle: document.getElementById('lootTitle'),
  lootMeta: document.getElementById('lootMeta'),
  lootItems: document.getElementById('lootItems'),
  takeAllButton: document.getElementById('takeAllButton'),
  closeLootButton: document.getElementById('closeLootButton'),
  mapOverlay: document.getElementById('mapOverlay'),
  mapCanvas: document.getElementById('mapCanvas'),
  closeMapButton: document.getElementById('closeMapButton'),
  mapLoadoutList: document.getElementById('mapLoadoutList'),
  mapAmmoList: document.getElementById('mapAmmoList'),
  bagList: document.getElementById('bagList'),
  bagGrid: document.getElementById('bagGrid'),
  touchControls: document.getElementById('touchControls'),
  mapExtractList: document.getElementById('mapExtractList'),
  resultOverlay: document.getElementById('resultOverlay'),
  resultTitle: document.getElementById('resultTitle'),
  resultSummary: document.getElementById('resultSummary'),
  returnBaseButton: document.getElementById('returnBaseButton'),
  notificationHost: document.getElementById('notificationHost'),
  damageOverlay: document.getElementById('damageOverlay'),
  hitMarker: document.getElementById('hitMarker'),
};

/*
const lootCatalog = [
  { id: 'bandage', name: 'æ­¢è¡ç»·å¸¦', category: 'å»ç', rarity: 'common', value: 650, weight: 0.4, pools: ['med'], spawnWeight: 20 },
  { id: 'painkiller', name: 'æ­¢çéå', category: 'å»ç', rarity: 'uncommon', value: 1500, weight: 0.5, pools: ['med'], spawnWeight: 14 },
  { id: 'medinjector', name: 'æå°æ³¨å°å¨', category: 'å»ç', rarity: 'rare', value: 3200, weight: 0.4, pools: ['med', 'valuable'], spawnWeight: 8 },
  { id: 'circuit', name: 'çº¿è·¯æ¿', category: 'çµå­', rarity: 'common', value: 900, weight: 0.6, pools: ['tech'], spawnWeight: 18 },
  { id: 'sensor', name: 'ç­æä¼ æå¨', category: 'çµå­', rarity: 'rare', value: 4100, weight: 0.9, pools: ['tech', 'valuable'], spawnWeight: 7 },
  { id: 'dronecore', name: 'æ äººæºæ ¸å¿', category: 'çµå­', rarity: 'epic', value: 7600, weight: 1.4, pools: ['tech', 'valuable'], spawnWeight: 4 },
  { id: 'weaponparts', name: 'æªæºé¶ä»¶', category: 'æ­¦å¤', rarity: 'common', value: 1100, weight: 1.0, pools: ['weapon'], spawnWeight: 18 },
  { id: 'optics', name: 'ç²¾å¯çå·', category: 'æ­¦å¤', rarity: 'rare', value: 4600, weight: 1.1, pools: ['weapon', 'valuable'], spawnWeight: 7 },
  { id: 'armorplate', name: 'é¶ç·æ¤ç²æ¿', category: 'æ­¦å¤', rarity: 'uncommon', value: 2100, weight: 2.8, pools: ['weapon'], spawnWeight: 12 },
  { id: 'intel', name: 'ææ¥å­å¨å¡', category: 'ææ¥', rarity: 'epic', value: 9800, weight: 0.3, pools: ['valuable'], spawnWeight: 4 },
  { id: 'coin', name: 'çºªå¿µéå¸', category: 'è´µé', rarity: 'rare', value: 3900, weight: 0.2, pools: ['valuable'], spawnWeight: 8 },
  { id: 'watch', name: 'ææ¯èè¡¨', category: 'è´µé', rarity: 'uncommon', value: 2400, weight: 0.5, pools: ['valuable'], spawnWeight: 12 },
  { id: 'artifact', name: 'è¾ç§æ ·å', category: 'æ ·å', rarity: 'legendary', value: 16800, weight: 2.2, pools: ['valuable'], spawnWeight: 2 },
];

const containerSpawns = [
  { id: 'locker-a', name: 'å·¥å·æ', x: -34, z: -18, pool: 'tech', tier: 1 },
  { id: 'locker-b', name: 'å·¥å·æ', x: -29, z: 16, pool: 'tech', tier: 1 },
  { id: 'med-a', name: 'å»çç®±', x: -12, z: 31, pool: 'med', tier: 2 },
  { id: 'med-b', name: 'å»çç®±', x: 16, z: 10, pool: 'med', tier: 2 },
  { id: 'cache-a', name: 'éèè¡¥ç»ç®±', x: 34, z: 25, pool: 'valuable', tier: 3 },
  { id: 'cache-b', name: 'éèè¡¥ç»ç®±', x: 22, z: -30, pool: 'valuable', tier: 3 },
  { id: 'weapon-a', name: 'æ­¦å¨ç®±', x: 8, z: -22, pool: 'weapon', tier: 2 },
  { id: 'weapon-b', name: 'æ­¦å¨ç®±', x: -42, z: 4, pool: 'weapon', tier: 2 },
  { id: 'crate-a', name: 'åéç®±', x: 43, z: -8, pool: 'tech', tier: 2 },
  { id: 'crate-b', name: 'åéç®±', x: -4, z: -40, pool: 'weapon', tier: 1 },
  { id: 'crate-c', name: 'åéç®±', x: 4, z: 42, pool: 'med', tier: 1 },
  { id: 'stash-a', name: 'å°ä¸ææ ¼', x: -48, z: -28, pool: 'valuable', tier: 3 },
  { id: 'stash-b', name: 'å°ä¸ææ ¼', x: 50, z: 13, pool: 'valuable', tier: 3 },
  { id: 'supply-a', name: 'æç©ç®±', x: -18, z: -4, pool: 'tech', tier: 1 },
  { id: 'supply-b', name: 'Field Cache', x: -60, z: 22, pool: 'weapon', tier: 2 },
  { id: 'supply-c', name: 'Field Cache', x: 58, z: -24, pool: 'tech', tier: 2 },
  { id: 'med-c', name: 'Medical Case', x: 12, z: 56, pool: 'med', tier: 2 },
  { id: 'vault-a', name: 'Secure Vault', x: 60, z: 40, pool: 'valuable', tier: 3 },
];

const extractionZones = [
  { id: 'north-gate', name: 'åé¨é¸å£', x: 0, z: -52, radius: 4.5 },
  { id: 'west-tunnel', name: 'è¥¿ä¾§é§é', x: -52, z: -8, radius: 4.5 },
  { id: 'east-wire', name: 'ä¸ä¾§éä¸ç½', x: 52, z: 10, radius: 4.5 },
  { id: 'south-sewer', name: 'åé¨ä¸æ°´é', x: -20, z: 52, radius: 4.5 },
];

*/

const lootCatalog = buildLootCatalog();

function scaleWorldValue(value, factor = WORLD_SCALE) {
  return Math.round(value * factor * 100) / 100;
}

function scaleContainerSpawns(spawns) {
  return spawns.map((spawn) => ({
    ...spawn,
    x: scaleWorldValue(spawn.x),
    z: scaleWorldValue(spawn.z),
  }));
}

function scaleObstacleDefs(obstacles) {
  return obstacles.map((obstacle) => ({
    ...obstacle,
    x: scaleWorldValue(obstacle.x),
    z: scaleWorldValue(obstacle.z),
    w: scaleWorldValue(obstacle.w),
    d: scaleWorldValue(obstacle.d),
    h: Math.round((obstacle.h * 1.18) * 100) / 100,
  }));
}

function expandEnemySpawns(baseSpawns) {
  const offsetScale = scaleWorldValue(4);
  return baseSpawns.flatMap((spawn, index) => {
    const variants = [
      { ox: 0, oz: 0, bias: 0 },
      { ox: index % 2 === 0 ? offsetScale : -offsetScale, oz: index % 3 === 0 ? -offsetScale : offsetScale, bias: 0.8 },
      { ox: index % 2 === 0 ? -offsetScale : offsetScale, oz: index % 3 === 1 ? -offsetScale : offsetScale, bias: 1.6 },
      { ox: index % 2 === 0 ? offsetScale * 1.25 : -offsetScale * 1.25, oz: index % 3 === 2 ? offsetScale * 1.25 : -offsetScale * 1.25, bias: 2.4 },
    ];
    return variants.map((variant, variantIndex) => ({
      x: Math.max(-PLAYABLE_HALF + 10, Math.min(PLAYABLE_HALF - 10, scaleWorldValue(spawn.x) + variant.ox)),
      z: Math.max(-PLAYABLE_HALF + 10, Math.min(PLAYABLE_HALF - 10, scaleWorldValue(spawn.z) + variant.oz)),
      route: spawn.route.map((point, routeIndex) => ({
        x: Math.max(
          -PLAYABLE_HALF + 8,
          Math.min(
            PLAYABLE_HALF - 8,
            scaleWorldValue(point.x) + variant.ox + Math.cos(routeIndex + variant.bias + variantIndex * 0.35) * offsetScale * 0.8,
          ),
        ),
        z: Math.max(
          -PLAYABLE_HALF + 8,
          Math.min(
            PLAYABLE_HALF - 8,
            scaleWorldValue(point.z) + variant.oz + Math.sin(routeIndex + variant.bias + variantIndex * 0.35) * offsetScale * 0.8,
          ),
        ),
      })),
    }));
  });
}

const containerSpawns = [
  ...scaleContainerSpawns([
    { id: 'locker-a', name: 'Tool Locker', x: -34, z: -18, pool: 'tech', tier: 1 },
    { id: 'locker-b', name: 'Tool Locker', x: -29, z: 16, pool: 'tech', tier: 1 },
    { id: 'med-a', name: 'Medical Case', x: -12, z: 31, pool: 'med', tier: 2 },
    { id: 'med-b', name: 'Medical Case', x: 16, z: 10, pool: 'med', tier: 2 },
    { id: 'cache-a', name: 'Hidden Supply Cache', x: 34, z: 25, pool: 'valuable', tier: 3 },
    { id: 'cache-b', name: 'Hidden Supply Cache', x: 22, z: -30, pool: 'valuable', tier: 3 },
    { id: 'weapon-a', name: 'Weapon Crate', x: 8, z: -22, pool: 'weapon', tier: 2 },
    { id: 'weapon-b', name: 'Weapon Crate', x: -42, z: 4, pool: 'weapon', tier: 2 },
    { id: 'crate-a', name: 'Field Crate', x: 43, z: -8, pool: 'tech', tier: 2 },
    { id: 'crate-b', name: 'Field Crate', x: -4, z: -40, pool: 'weapon', tier: 1 },
    { id: 'crate-c', name: 'Field Crate', x: 4, z: 42, pool: 'med', tier: 1 },
    { id: 'stash-a', name: 'Underground Stash', x: -48, z: -28, pool: 'valuable', tier: 3 },
    { id: 'stash-b', name: 'Underground Stash', x: 50, z: 13, pool: 'valuable', tier: 3 },
    { id: 'supply-a', name: 'Supply Case', x: -18, z: -4, pool: 'tech', tier: 1 },
    { id: 'supply-b', name: 'Field Cache', x: -60, z: 22, pool: 'weapon', tier: 2 },
    { id: 'supply-c', name: 'Field Cache', x: 58, z: -24, pool: 'tech', tier: 2 },
    { id: 'med-c', name: 'Medical Case', x: 12, z: 56, pool: 'med', tier: 2 },
    { id: 'vault-a', name: 'Secure Vault', x: 60, z: 40, pool: 'valuable', tier: 3 },
  ]),
  { id: 'med-d', name: 'Medical Case', x: 96, z: -78, pool: 'med', tier: 2 },
  { id: 'stash-c', name: 'Underground Stash', x: -104, z: 88, pool: 'valuable', tier: 3 },
  { id: 'weapon-c', name: 'Weapon Crate', x: -112, z: -70, pool: 'weapon', tier: 2 },
  { id: 'supply-d', name: 'Supply Case', x: 84, z: 102, pool: 'tech', tier: 1 },
  { id: 'cache-c', name: 'Hidden Supply Cache', x: 118, z: 58, pool: 'valuable', tier: 3 },
  { id: 'field-d', name: 'Field Cache', x: -18, z: 118, pool: 'weapon', tier: 2 },
];

const extractionZones = [
  { id: 'north-gate', nameZh: 'åé¸å£', nameEn: 'North Gate', x: 0, z: -126, radius: 5.6, kind: 'standard' },
  { id: 'north-ridge', nameZh: 'åå²­æ¤ç¦»', nameEn: 'North Ridge', x: 74, z: -122, radius: 5.6, kind: 'standard' },
  { id: 'west-tunnel', nameZh: 'è¥¿ä¾§é§é', nameEn: 'West Tunnel', x: -124, z: -16, radius: 5.8, kind: 'standard' },
  { id: 'west-yard', nameZh: 'è¥¿è´§åº', nameEn: 'West Yard', x: -122, z: 82, radius: 5.8, kind: 'standard' },
  { id: 'east-wire', nameZh: 'ä¸ä¾§éä¸ç½', nameEn: 'East Wire', x: 124, z: 18, radius: 5.8, kind: 'standard' },
  { id: 'east-depot', nameZh: 'ä¸ä»è½¬è¿å£', nameEn: 'East Depot', x: 118, z: -84, radius: 5.6, kind: 'task' },
  { id: 'north-relay', nameZh: 'åä¸­ç»§ç«', nameEn: 'North Relay', x: -88, z: -122, radius: 5.6, kind: 'switch' },
  { id: 'south-sewer', nameZh: 'åé¨ä¸æ°´é', nameEn: 'South Sewer', x: -42, z: 122, radius: 5.8, kind: 'standard' },
  { id: 'south-yard', nameZh: 'åè´§è¿å¹³å°', nameEn: 'South Yard', x: 52, z: 124, radius: 5.8, kind: 'switch' },
];

const switchPointCandidates = [
  { id: 'switch-west', nameZh: 'è¥¿éçµæé¸ç¹', nameEn: 'West Power Lever', x: -86, z: 26, radius: 2.3 },
  { id: 'switch-east', nameZh: 'ä¸éçµæé¸ç¹', nameEn: 'East Power Lever', x: 88, z: -34, radius: 2.3 },
  { id: 'switch-south', nameZh: 'åä¾§æ»é¸', nameEn: 'South Grid Lever', x: 12, z: 92, radius: 2.3 },
  { id: 'switch-north', nameZh: 'åä¾§æ»é¸', nameEn: 'North Grid Lever', x: -18, z: -94, radius: 2.3 },
];

const raidSpawnCandidates = [
  { id: 'spawn-nw', x: -104, z: -86 },
  { id: 'spawn-ne', x: 102, z: -78 },
  { id: 'spawn-e', x: 112, z: 8 },
  { id: 'spawn-se', x: 88, z: 96 },
  { id: 'spawn-s', x: -8, z: 110 },
  { id: 'spawn-sw', x: -110, z: 78 },
  { id: 'spawn-w', x: -116, z: -2 },
  { id: 'spawn-n', x: 12, z: -112 },
];

const enemySpawnDefs = expandEnemySpawns([
  { x: -40, z: -34, route: [{ x: -40, z: -34 }, { x: -30, z: -24 }, { x: -46, z: -18 }] },
  { x: -18, z: -42, route: [{ x: -18, z: -42 }, { x: -4, z: -36 }, { x: -10, z: -22 }] },
  { x: 16, z: -44, route: [{ x: 16, z: -44 }, { x: 30, z: -34 }, { x: 24, z: -20 }] },
  { x: 44, z: -18, route: [{ x: 44, z: -18 }, { x: 34, z: -6 }, { x: 48, z: 6 }] },
  { x: 36, z: 28, route: [{ x: 36, z: 28 }, { x: 24, z: 20 }, { x: 42, z: 38 }] },
  { x: 10, z: 44, route: [{ x: 10, z: 44 }, { x: -4, z: 36 }, { x: 16, z: 30 }] },
  { x: -26, z: 34, route: [{ x: -26, z: 34 }, { x: -40, z: 26 }, { x: -14, z: 24 }] },
  { x: -46, z: 8, route: [{ x: -46, z: 8 }, { x: -34, z: -2 }, { x: -50, z: -14 }] },
  { x: 0, z: 20, route: [{ x: 0, z: 20 }, { x: 10, z: 6 }, { x: -12, z: 8 }] },
  { x: 18, z: 0, route: [{ x: 18, z: 0 }, { x: 30, z: 8 }, { x: 8, z: -6 }] },
  { x: -60, z: -18, route: [{ x: -60, z: -18 }, { x: -54, z: -2 }, { x: -48, z: -22 }] },
  { x: -58, z: 34, route: [{ x: -58, z: 34 }, { x: -44, z: 44 }, { x: -36, z: 28 }] },
  { x: 58, z: -32, route: [{ x: 58, z: -32 }, { x: 46, z: -18 }, { x: 34, z: -30 }] },
  { x: 60, z: 24, route: [{ x: 60, z: 24 }, { x: 48, z: 38 }, { x: 38, z: 18 }] },
  { x: -8, z: 58, route: [{ x: -8, z: 58 }, { x: 12, z: 50 }, { x: -18, z: 42 }] },
  { x: 28, z: 58, route: [{ x: 28, z: 58 }, { x: 42, z: 50 }, { x: 18, z: 40 }] },
]);

const obstacleDefs = scaleObstacleDefs([
  { id: 'center-depot', x: 0, z: -16, w: 18, d: 10, h: 6.5, color: '#23333b' },
  { id: 'west-barracks', x: -28, z: 12, w: 14, d: 12, h: 5.8, color: '#263841' },
  { id: 'east-fuel', x: 28, z: 16, w: 12, d: 12, h: 5.4, color: '#29343c' },
  { id: 'south-freight', x: 0, z: 30, w: 22, d: 8, h: 4.4, color: '#2d3839' },
  { id: 'north-crates', x: -22, z: -28, w: 10, d: 8, h: 3.2, color: '#43505a' },
  { id: 'east-crates', x: 24, z: -30, w: 12, d: 10, h: 3.4, color: '#455562' },
  { id: 'west-cover', x: -42, z: -4, w: 6, d: 18, h: 2.8, color: '#3d484f' },
  { id: 'east-cover', x: 42, z: -2, w: 6, d: 18, h: 2.8, color: '#3e494d' },
  { id: 'far-west-yard', x: -58, z: 28, w: 8, d: 14, h: 3.0, color: '#324048' },
  { id: 'far-east-yard', x: 58, z: -26, w: 8, d: 14, h: 3.0, color: '#324048' },
  { id: 'south-fence-stack', x: 18, z: 52, w: 12, d: 6, h: 2.8, color: '#42515b' },
  { id: 'north-silo', x: 44, z: -50, w: 10, d: 8, h: 5.2, color: '#41515b' },
  { id: 'west-bunker', x: -52, z: -30, w: 9, d: 10, h: 4.4, color: '#394950' },
  { id: 'east-hangar', x: 50, z: 26, w: 12, d: 10, h: 4.8, color: '#34434d' },
  { id: 'south-yard-2', x: -34, z: 44, w: 12, d: 12, h: 4.6, color: '#3a4b55' },
]);

const state = {
  mode: 'base',
  overlay: null,
  pointerLocked: false,
  baseCameraAngle: 0.8,
  save: loadSave(),
  raid: null,
  ui: {
    currentContainerId: null,
    raidPanelCollapsed: {
      raidLoadoutList: false,
      raidAmmoRail: false,
      raidBagList: false,
    },
  },
  input: {
    keys: new Set(),
    fireHeld: false,
    mouseDown: false,
    firePointerId: null,
    interactHeld: false,
    aimHeld: false,
    lookDragging: false,
    lookPointerId: null,
    lastPointerX: 0,
    lastPointerY: 0,
  },
};

window.__ironExtractionState = state;
window.__ironExtractionGetAudioDebug = () => ({
  hasCtx: Boolean(audioState.ctx),
  ctxState: audioState.ctx?.state ?? 'none',
  musicStarted: Boolean(audioState.musicStarted),
});

let engine;
let scene;
let camera;
let viewModel;
let world;
let lastFrame = performance.now();
let audioState = {
  ctx: null,
  master: null,
  sfx: null,
  music: null,
  noiseBuffer: null,
  musicStarted: false,
  nextMusicAt: 0,
  musicStep: 0,
  unlockPrimed: false,
};
let lastRaidSpawnId = '';
let raidSpawnRotation = [];

function createNoiseBuffer(ctx, duration = 2.4) {
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * (1 - i / frameCount * 0.18);
  }
  return buffer;
}

function ensureAudioState() {
  if (audioState.ctx) {
    return audioState;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  const ctx = new AudioCtor();
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  const music = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 14800;
  lowpass.Q.value = 0.45;

  compressor.threshold.value = -20;
  compressor.knee.value = 16;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.22;

  master.gain.value = 0.92;
  sfx.gain.value = 1.08;
  music.gain.value = 0.36;

  sfx.connect(compressor);
  music.connect(compressor);
  compressor.connect(lowpass);
  lowpass.connect(master);
  master.connect(ctx.destination);

  audioState = {
    ...audioState,
    ctx,
    master,
    sfx,
    music,
    noiseBuffer: createNoiseBuffer(ctx),
  };
  return audioState;
}

function unlockAudioContext() {
  const audio = ensureAudioState();
  if (!audio) {
    return;
  }
  resumeAudioContext(audio);
  if (!audio.musicStarted) {
    audio.musicStarted = true;
    audio.nextMusicAt = audio.ctx.currentTime + 0.12;
    audio.musicStep = 0;
  }
}

function getPlayableAudioState() {
  const audio = audioState.ctx ? audioState : ensureAudioState();
  if (!audio?.ctx) {
    return null;
  }
  resumeAudioContext(audio);
  return audio;
}

function resumeAudioContext(audio) {
  if (!audio?.ctx) {
    return;
  }
  if (audio.ctx.state === 'running') {
    primeAudioContext(audio);
    return;
  }
  audio.ctx.resume()
    .then(() => {
      primeAudioContext(audio);
    })
    .catch(() => {});
}

function primeAudioContext(audio) {
  if (!audio?.ctx || audio.unlockPrimed || audio.ctx.state !== 'running') {
    return;
  }
  const now = audio.ctx.currentTime;
  const tone = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(440, now);
  gain.gain.setValueAtTime(0.0001, now);
  tone.connect(gain);
  gain.connect(audio.master ?? audio.ctx.destination);
  tone.onended = () => {
    tone.disconnect();
    gain.disconnect();
  };
  tone.start(now);
  tone.stop(now + 0.012);
  audio.unlockPrimed = true;
}

function createAudioPanner(ctx, pan, destination) {
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    panner.connect(destination);
    return panner;
  }
  const fallback = ctx.createGain();
  fallback.connect(destination);
  return fallback;
}

function scheduleTone({
  destination,
  time,
  type = 'sine',
  startFreq = 220,
  endFreq = startFreq,
  peakGain = 0.06,
  attack = 0.003,
  duration = 0.08,
  release = 0.08,
  sustain = 0.36,
  detune = 0,
  pan = 0,
}) {
  const audio = audioState.ctx ? audioState : ensureAudioState();
  if (!audio?.ctx) {
    return;
  }
  const ctx = audio.ctx;
  const when = time ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = createAudioPanner(ctx, pan, destination ?? audio.sfx);

  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(Math.max(20, startFreq), when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), when + duration + release);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(peakGain, when + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain * sustain), when + duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);

  osc.connect(gain);
  gain.connect(panner);
  osc.start(when);
  osc.stop(when + duration + release + 0.04);
}

function scheduleNoiseBurst({
  destination,
  time,
  duration = 0.08,
  peakGain = 0.1,
  attack = 0.001,
  release = 0.08,
  lowpass = 3200,
  highpass = 180,
  pan = 0,
}) {
  const audio = audioState.ctx ? audioState : ensureAudioState();
  if (!audio?.ctx || !audio.noiseBuffer) {
    return;
  }
  const ctx = audio.ctx;
  const when = time ?? ctx.currentTime;
  const source = ctx.createBufferSource();
  const high = ctx.createBiquadFilter();
  const low = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const panner = createAudioPanner(ctx, pan, destination ?? audio.sfx);

  source.buffer = audio.noiseBuffer;
  high.type = 'highpass';
  high.frequency.value = Math.max(30, highpass);
  low.type = 'lowpass';
  low.frequency.value = Math.max(high.frequency.value + 40, lowpass);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(peakGain, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);

  source.connect(high);
  high.connect(low);
  low.connect(gain);
  gain.connect(panner);
  source.start(when);
  source.stop(when + duration + release + 0.04);
}

function getWorldSoundMix(x, z) {
  const player = state.raid?.player;
  if (!player) {
    return { pan: 0, gain: 1 };
  }
  const distance = distance2D(x, z, player.x, player.z);
  const angle = Math.atan2(x - player.x, z - player.z) - player.yaw;
  return {
    pan: clamp(Math.sin(angle), -1, 1),
    gain: clamp(1 - distance / 84, 0.18, 1),
  };
}

function playGunshotAudio(weapon, options = {}) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const worldMix = options.world ? getWorldSoundMix(options.world.x, options.world.z) : { pan: 0, gain: 1 };
  const pan = options.pan ?? worldMix.pan;
  const gainScale = (options.gain ?? 1) * worldMix.gain;
  const caliber = weapon.caliber ?? '';
  const power =
    weapon.pellets > 1 ? 1.24 :
    caliber === '7.62' ? 1.15 :
    caliber === '9mm' ? 0.82 :
    1;

  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'triangle',
    startFreq: 180 * power,
    endFreq: 58,
    peakGain: 0.17 * gainScale,
    duration: 0.07,
    release: 0.12,
    pan,
  });
  scheduleTone({
    time: now + 0.003,
    destination: audio.sfx,
    type: 'square',
    startFreq: 920 * power,
    endFreq: 270,
    peakGain: 0.06 * gainScale,
    duration: 0.04,
    release: 0.08,
    pan,
  });
  scheduleNoiseBurst({
    time: now,
    destination: audio.sfx,
    peakGain: 0.25 * gainScale * power,
    duration: 0.08 + power * 0.03,
    release: 0.12,
    lowpass: 3200,
    highpass: 380,
    pan,
  });
  if (weapon.pellets > 1) {
    scheduleTone({
      time: now + 0.01,
      destination: audio.sfx,
      type: 'sine',
      startFreq: 96,
      endFreq: 48,
      peakGain: 0.08 * gainScale,
      duration: 0.12,
      release: 0.16,
      pan,
    });
  }
}

function playImpactAudio(position, flavor = 'hard') {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const mix = getWorldSoundMix(position.x, position.z);

  if (flavor === 'flesh') {
    scheduleNoiseBurst({
      time: now,
      destination: audio.sfx,
      peakGain: 0.08 * mix.gain,
      duration: 0.09,
      release: 0.08,
      lowpass: 920,
      highpass: 90,
      pan: mix.pan,
    });
    scheduleTone({
      time: now,
      destination: audio.sfx,
      type: 'sine',
      startFreq: 132,
      endFreq: 76,
      peakGain: 0.04 * mix.gain,
      duration: 0.06,
      release: 0.08,
      pan: mix.pan,
    });
    return;
  }

  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'square',
    startFreq: 1500,
    endFreq: 460,
    peakGain: 0.03 * mix.gain,
    duration: 0.03,
    release: 0.05,
    pan: mix.pan,
  });
  scheduleNoiseBurst({
    time: now,
    destination: audio.sfx,
    peakGain: 0.06 * mix.gain,
    duration: 0.045,
    release: 0.05,
    lowpass: 4200,
    highpass: 720,
    pan: mix.pan,
  });
}

function playHitConfirmAudio(kill = false) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'triangle',
    startFreq: kill ? 920 : 760,
    endFreq: kill ? 1180 : 940,
    peakGain: kill ? 0.06 : 0.045,
    duration: 0.03,
    release: 0.05,
  });
}

function playDamageAudio(amount, blocked = 0) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const impact = clamp(amount / 24, 0.55, 1.2);

  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'sine',
    startFreq: 120 * impact,
    endFreq: 54,
    peakGain: 0.13 * impact,
    duration: 0.08,
    release: 0.18,
  });
  scheduleNoiseBurst({
    time: now,
    destination: audio.sfx,
    peakGain: 0.09 * impact,
    duration: 0.12,
    release: 0.18,
    lowpass: blocked > 0 ? 1200 : 900,
    highpass: 60,
  });
  if (blocked > 0) {
    scheduleTone({
      time: now + 0.012,
      destination: audio.sfx,
      type: 'square',
      startFreq: 980,
      endFreq: 540,
      peakGain: 0.025,
      duration: 0.03,
      release: 0.05,
    });
  }
}

function playReloadAudio(weapon, completed = false) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const shift = completed ? 0.04 : 0;
  scheduleTone({
    time: now + shift,
    destination: audio.sfx,
    type: 'square',
    startFreq: completed ? 460 : 340,
    endFreq: 180,
    peakGain: completed ? 0.05 : 0.035,
    duration: 0.025,
    release: 0.04,
    pan: completed ? 0.08 : -0.08,
  });
  scheduleNoiseBurst({
    time: now + shift + 0.015,
    destination: audio.sfx,
    peakGain: completed ? 0.05 : 0.04,
    duration: 0.02,
    release: 0.03,
    lowpass: 3600,
    highpass: 1100,
    pan: completed ? -0.1 : 0.1,
  });
  if (!completed) {
    scheduleTone({
      time: now + 0.08,
      destination: audio.sfx,
      type: 'square',
      startFreq: weapon.pellets > 1 ? 240 : 280,
      endFreq: 160,
      peakGain: 0.03,
      duration: 0.02,
      release: 0.04,
      pan: 0.12,
    });
  }
}

function playContainerOpenAudio(position) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const mix = getWorldSoundMix(position.x, position.z);
  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'square',
    startFreq: 240,
    endFreq: 126,
    peakGain: 0.05 * mix.gain,
    duration: 0.028,
    release: 0.06,
    pan: mix.pan - 0.08,
  });
  scheduleNoiseBurst({
    time: now + 0.01,
    destination: audio.sfx,
    peakGain: 0.05 * mix.gain,
    duration: 0.03,
    release: 0.06,
    lowpass: 2200,
    highpass: 160,
    pan: mix.pan,
  });
  scheduleTone({
    time: now + 0.035,
    destination: audio.sfx,
    type: 'triangle',
    startFreq: 460,
    endFreq: 280,
    peakGain: 0.035 * mix.gain,
    duration: 0.04,
    release: 0.08,
    pan: mix.pan + 0.06,
  });
}

function playSwitchAudio(position, completed = false) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const mix = getWorldSoundMix(position.x, position.z);
  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'square',
    startFreq: completed ? 220 : 150,
    endFreq: completed ? 520 : 110,
    peakGain: 0.05 * mix.gain,
    duration: completed ? 0.08 : 0.06,
    release: 0.12,
    pan: mix.pan,
  });
  scheduleNoiseBurst({
    time: now + 0.012,
    destination: audio.sfx,
    peakGain: 0.045 * mix.gain,
    duration: 0.05,
    release: 0.1,
    lowpass: completed ? 3200 : 1800,
    highpass: 240,
    pan: mix.pan - 0.04,
  });
}

function playUseActionAudio(position, flavor = 'heal', completed = false) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const mix = getWorldSoundMix(position.x, position.z);
  const colorFreq = flavor === 'armor' ? 180 : flavor === 'medkit' ? 210 : 250;
  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: completed ? 'triangle' : 'sine',
    startFreq: colorFreq,
    endFreq: completed ? colorFreq * 2.2 : colorFreq * 0.9,
    peakGain: 0.04 * mix.gain,
    duration: completed ? 0.12 : 0.08,
    release: 0.16,
    pan: mix.pan,
  });
  scheduleNoiseBurst({
    time: now + 0.01,
    destination: audio.sfx,
    peakGain: (completed ? 0.03 : 0.02) * mix.gain,
    duration: 0.05,
    release: 0.08,
    lowpass: flavor === 'armor' ? 2200 : 3200,
    highpass: 180,
    pan: mix.pan + 0.05,
  });
}

function playExtractionAudio(position) {
  const audio = getPlayableAudioState();
  if (!audio?.ctx) {
    return;
  }
  const now = audio.ctx.currentTime;
  const mix = getWorldSoundMix(position.x, position.z);
  scheduleTone({
    time: now,
    destination: audio.sfx,
    type: 'triangle',
    startFreq: 110,
    endFreq: 196,
    peakGain: 0.09 * mix.gain,
    duration: 0.2,
    release: 0.24,
    pan: mix.pan,
  });
  scheduleTone({
    time: now + 0.08,
    destination: audio.sfx,
    type: 'sine',
    startFreq: 220,
    endFreq: 660,
    peakGain: 0.08 * mix.gain,
    duration: 0.34,
    release: 0.36,
    pan: mix.pan,
  });
  scheduleNoiseBurst({
    time: now,
    destination: audio.sfx,
    peakGain: 0.06 * mix.gain,
    duration: 0.22,
    release: 0.28,
    lowpass: 2800,
    highpass: 120,
    pan: mix.pan,
  });
  scheduleTone({
    time: now + 0.22,
    destination: audio.music,
    type: 'triangle',
    startFreq: 392,
    endFreq: 784,
    peakGain: 0.022,
    duration: 0.42,
    release: 0.42,
    pan: mix.pan * 0.5,
  });
}

function tickMusic() {
  const audio = getPlayableAudioState();
  if (!audio?.ctx || !audio.musicStarted) {
    return;
  }
  const pattern = [73.42, 87.31, 65.41, 55.0, 73.42, 98.0, 82.41, 65.41];
  while (audio.nextMusicAt < audio.ctx.currentTime + 3.2) {
    const time = audio.nextMusicAt;
    const note = pattern[audio.musicStep % pattern.length];
    const pan = Math.sin(audio.musicStep * 0.68) * 0.22;

    scheduleTone({
      time,
      destination: audio.music,
      type: 'triangle',
      startFreq: note,
      endFreq: note * 0.992,
      peakGain: 0.022,
      attack: 0.16,
      duration: 1.1,
      release: 0.75,
      sustain: 0.62,
      pan,
    });
    scheduleTone({
      time: time + 0.12,
      destination: audio.music,
      type: 'sine',
      startFreq: note * 1.5,
      endFreq: note * 1.49,
      peakGain: 0.012,
      attack: 0.28,
      duration: 1.25,
      release: 0.9,
      sustain: 0.68,
      pan: -pan * 0.8,
    });
    if (audio.musicStep % 2 === 0) {
      scheduleNoiseBurst({
        time,
        destination: audio.music,
        peakGain: 0.005,
        duration: 0.9,
        release: 0.4,
        lowpass: 1200,
        highpass: 120,
        pan: randomBetween(-0.26, 0.26),
      });
    }
    if (audio.musicStep % 4 === 0) {
      scheduleTone({
        time,
        destination: audio.music,
        type: 'sine',
        startFreq: note / 2,
        endFreq: note / 2,
        peakGain: 0.028,
        attack: 0.012,
        duration: 0.24,
        release: 0.24,
        sustain: 0.75,
      });
    }

    audio.nextMusicAt += 1.45;
    audio.musicStep += 1;
  }
}

function syncScreenEffects() {
  if (!refs.damageOverlay || !refs.hitMarker) {
    return;
  }
  if (state.mode !== 'raid' || !state.raid) {
    refs.damageOverlay.style.opacity = '0';
    refs.hitMarker.style.opacity = '0';
    refs.hitMarker.style.transform = 'scale(0.88)';
    return;
  }

  const raid = state.raid;
  const player = raid.player;
  const healthRatio = player.maxHealth > 0 ? player.health / player.maxHealth : 0;
  const damageAlpha = clamp((player.damageFlash ?? 0) * 0.9 + (1 - healthRatio) * 0.22, 0, 0.9);
  const hitAlpha = clamp((raid.hitConfirmTimer ?? 0) * 4.6, 0, 1);

  refs.damageOverlay.style.opacity = damageAlpha.toFixed(3);
  refs.hitMarker.style.opacity = hitAlpha.toFixed(3);
  refs.hitMarker.style.transform = `scale(${lerp(0.88, 1.08, clamp(raid.hitConfirmTimer ?? 0, 0, 1)).toFixed(3)})`;
}

function buildLootCatalog() {
  return [
    ...CORE_LOOT_ITEMS,
    ...Object.values(AMMO_DEFS).map(makeAmmoLootDef),
    ...Object.values(PART_DEFS).map(makePartLootDef),
  ];
}

function makeAmmoLootDef(ammo) {
  return {
    id: `${ammo.id}_box`,
    name: `${ammo.name} Box`,
    category: 'Ammo',
    rarity: ammo.rarity,
    value: ammo.sellValue,
    weight: ammo.weight,
    pools: [ammo.pool, ammo.pool === 'valuable' ? 'weapon' : 'valuable'],
    spawnWeight: ammo.rarity === 'rare' ? 5 : ammo.rarity === 'uncommon' ? 9 : 14,
    itemType: 'ammo',
    ammoId: ammo.id,
    rounds: ammo.packSize,
  };
}

function makePartLootDef(part) {
  return {
    id: part.id,
    name: part.name,
    category: part.category,
    rarity: part.rarity,
    value: part.value,
    weight: part.weight,
    pools: [part.pool, 'valuable'],
    spawnWeight: part.rarity === 'rare' ? 4 : part.rarity === 'uncommon' ? 7 : 11,
    itemType: 'part',
    partId: part.id,
    slot: part.slot,
  };
}

function loadSave() {
  const fallback = defaultSave();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const stash = Array.isArray(parsed.stash)
      ? parsed.stash.map((item) => normalizeItemInstance(item)).filter(Boolean)
      : fallback.stash;
    const ownedWeapons = Array.isArray(parsed.armory?.ownedWeapons)
      ? Array.from(new Set(parsed.armory.ownedWeapons.filter((id) => WEAPON_DEFS[id])))
      : [...fallback.armory.ownedWeapons];
    if (!ownedWeapons.includes('rifle')) {
      ownedWeapons.unshift('rifle');
    }
    const selectedWeaponId = ownedWeapons.includes(parsed.armory?.selectedWeaponId)
      ? parsed.armory.selectedWeaponId
      : 'rifle';
    const legacyAmmoBonus = Math.max(0, Number(parsed.prep?.ammoBonus ?? 0));
    const prepAmmo = defaultPrepAmmo();
    for (const ammoId of Object.keys(prepAmmo)) {
      prepAmmo[ammoId] = Math.max(0, Number(parsed.prepAmmo?.[ammoId] ?? 0));
    }
    prepAmmo.rifle_fmj += legacyAmmoBonus;
    const ownedParts = Array.isArray(parsed.armory?.ownedParts)
      ? Array.from(new Set(parsed.armory.ownedParts.filter((id) => PART_DEFS[id])))
      : [];
    const isLegacySave = Number(parsed.version ?? 0) < SAVE_SCHEMA_VERSION;
    const startingMoney = Number.isFinite(parsed.money) ? parsed.money : fallback.money;
    const engineerUnlocked = Boolean(parsed.engineerUnlocked);
    const selectedOperatorId = engineerUnlocked && parsed.selectedOperatorId === 'engineer'
      ? 'engineer'
      : sanitizeOperatorId(parsed.selectedOperatorId);
    return {
      version: SAVE_SCHEMA_VERSION,
      money: isLegacySave ? Math.max(startingMoney, fallback.money) : startingMoney,
      stash,
      upgrades: {
        bagLevel: clamp(Number(parsed.upgrades?.bagLevel ?? 0), 0, MAX_BAG_LEVEL),
        weaponLevel: clamp(Number(parsed.upgrades?.weaponLevel ?? 0), 0, MAX_WEAPON_LEVEL),
      },
      prep: {
        medkitBonus: Math.max(0, Number(parsed.prep?.medkitBonus ?? 0)),
        ammoBonus: legacyAmmoBonus,
        armorBonus: Math.max(0, Number(parsed.prep?.armorBonus ?? 0)),
      },
      prepAmmo,
      armory: {
        ownedWeapons,
        selectedWeaponId,
        selectedAmmoByWeapon: sanitizeSelectedAmmoByWeapon(parsed.armory?.selectedAmmoByWeapon, ownedWeapons),
        ownedParts,
        equippedPartsByWeapon: sanitizeEquippedPartsByWeapon(parsed.armory?.equippedPartsByWeapon, ownedParts),
      },
      stats: {
        raids: Math.max(0, Number(parsed.stats?.raids ?? 0)),
        survived: Math.max(0, Number(parsed.stats?.survived ?? 0)),
        kills: Math.max(0, Number(parsed.stats?.kills ?? 0)),
        bestHaul: Math.max(0, Number(parsed.stats?.bestHaul ?? 0)),
      },
    };
  } catch (error) {
    console.warn('Failed to load save, using defaults.', error);
    return fallback;
  }
}

function getLobbyModeDefs() {
  return {
    raid: {
      id: 'raid',
      nameZh: 'å°éçªå¥',
      nameEn: 'Lockdown Raid',
      summaryZh: 'ç»å¸æææ¤ãæ®éæ¤ç¦»ç¹ç´æ¥å¼æ¾ï¼æé¸æ¤ç¦»ä»éåå¯å¨æé¸ç¹ã',
      summaryEn: 'Classic extraction. Standard exit opens immediately, while the lever exit still needs its switch.',
      detailZh: '10 åéä½æï¼åæ¤ç¦»ç»æï¼éåç¨³å®æå®ä¸æ´å¤æé¿ã',
      detailEn: '10-minute raid with two extraction routes, built for steady looting and progression.',
      deployZh: 'è¿å¥å°éåº',
      deployEn: 'Enter Lockdown',
      duration: RAID_DURATION,
      bonusReward: 0,
      objectiveFactory: () => [],
      buildLayout(playerSpawn) {
        return chooseRaidExtractions(playerSpawn);
      },
      getStartInteractionText() {
        return L('æ®éæ¤ç¦»ç¹å·²å¼æ¾ï¼æé¸æ¤ç¦»éåæé¸ã', 'Standard extraction is open. Pull the lever to use the gated exit.');
      },
      getStartNotice() {
        return L('å·²è¿å¥å°éåºãæ®éæ¤ç¦»ç¹å·²å¼æ¾ï¼æé¸æ¤ç¦»éååå¾æé¸ç¹ã', 'Raid started. The standard exit is open, and the gated exit needs its lever first.');
      },
    },
    contract: {
      id: 'contract',
      nameZh: 'æ¸å¿åçº¦',
      nameEn: 'Purge Contract',
      summaryZh: 'ç®æ ç©æ³ãåå®ææ¸å¿ç®æ ï¼åä»å¯ä¸æ¤ç¦»ç¹å¸¦çæå©åæ¤åºã',
      summaryEn: 'Objective mode. Finish the purge contract first, then escape through the only extraction point.',
      detailZh: '7 åééæ¶ï¼å»å 10 åæäººå¹¶æ¸æ 2 åçæï¼æåæ¤ç¦»å¯é¢å¤è·å¾å¥éã',
      detailEn: '7-minute contract. Eliminate 10 enemies including 2 hunters. Successful extraction grants a direct bonus.',
      deployZh: 'æ¥åæ¸å¿åçº¦',
      deployEn: 'Accept Contract',
      duration: 7 * 60,
      bonusReward: 9600,
      objectiveFactory: () => ([
        { id: 'kill', label: 'kill', target: 10, progress: 0 },
        { id: 'hunter', label: 'hunter', target: 2, progress: 0 },
      ]),
      buildLayout(playerSpawn) {
        const standard = extractionZones
          .filter((zone) => zone.kind === 'standard')
          .slice()
          .sort((a, b) => distance2D(b.x, b.z, playerSpawn.x, playerSpawn.z) - distance2D(a.x, a.z, playerSpawn.x, playerSpawn.z))[0];
        return {
          extractions: standard
            ? [{
                ...standard,
                kind: 'task',
                active: true,
                requiresObjectives: true,
                pulse: Math.random() * Math.PI * 2,
              }]
            : [],
          switchPoints: [],
        };
      },
      getStartInteractionText() {
        return L('æ¸å¿ç®æ æªå®æåï¼å¯ä¸æ¤ç¦»ç¹ä¸ä¼å¼æ¾ã', 'The only extraction stays locked until purge objectives are done.');
      },
      getStartNotice() {
        return L('æ¸å¿åçº¦å¼å§ãåå®æç®æ ï¼ååå¾å¯ä¸æ¤ç¦»ç¹ã', 'Purge contract started. Finish the objectives, then move to the only extraction.');
      },
    },
  };
}

function sanitizeLobbyModeId(modeId) {
  return getLobbyModeDefs()[modeId] ? modeId : 'raid';
}

function getSelectedLobbyModeId() {
  return sanitizeLobbyModeId(state.save?.selectedModeId);
}

function getLobbyModeDef(modeId = getSelectedLobbyModeId()) {
  const defs = getLobbyModeDefs();
  return defs[sanitizeLobbyModeId(modeId)] ?? defs.raid;
}

function setSelectedLobbyMode(modeId) {
  const nextModeId = sanitizeLobbyModeId(modeId);
  if (state.mode !== 'base') {
    notify(L('è¡å¨æ¨¡å¼åªè½å¨å±å¤åæ¢ã', 'Modes can only be changed in base.'), 'warning');
    return;
  }
  if (nextModeId === getSelectedLobbyModeId()) {
    return;
  }
  state.save.selectedModeId = nextModeId;
  persistSave();
  renderBasePanel();
  notify(
    L(`å·²éæ©è¡å¨æ¨¡å¼ï¼${getLobbyModeDef(nextModeId).nameZh}ã`, `Selected mode: ${getLobbyModeDef(nextModeId).nameEn}.`),
    'success',
  );
}

function renderLobbyPanel() {
  const selectedModeId = getSelectedLobbyModeId();
  return Object.values(getLobbyModeDefs())
    .map((mode) => {
      const active = mode.id === selectedModeId;
      const durationLabel = L(`${Math.round(mode.duration / 60)} åé`, `${Math.round(mode.duration / 60)} min`);
      const bonusLabel = mode.bonusReward > 0
        ? formatMoney(mode.bonusReward)
        : L('æ é¢å¤å¥é', 'No direct bonus');
      return `
        <article class="prep-row lobby-card ${active ? 'is-active' : ''}">
          <div class="lobby-copy">
            <div class="item-title">${L(mode.nameZh, mode.nameEn)}</div>
            <div class="item-meta">${L(mode.summaryZh, mode.summaryEn)}</div>
            <div class="item-meta">${L(mode.detailZh, mode.detailEn)}</div>
            <div class="inline-actions">
              <span class="mode-pill">${durationLabel}</span>
              <span class="mode-pill ${mode.bonusReward > 0 ? 'is-hot' : ''}">${L('å¥é ', 'Bonus ')}${bonusLabel}</span>
            </div>
          </div>
          <div class="stack-list">
            <button class="${active ? 'primary-button' : 'ghost-button'} small" type="button" data-mode-id="${mode.id}">
              ${active ? L('å½åæ¨¡å¼', 'Active') : L('åæ¢', 'Select')}
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function defaultSave() {
  return {
    version: SAVE_SCHEMA_VERSION,
    money: 18000,
    stash: [],
    upgrades: {
      bagLevel: 0,
      weaponLevel: 0,
    },
    prep: {
      medkitBonus: 0,
      ammoBonus: 0,
      armorBonus: 0,
    },
    prepAmmo: defaultPrepAmmo(),
    armory: {
      ownedWeapons: ['rifle'],
      selectedWeaponId: 'rifle',
      selectedAmmoByWeapon: defaultSelectedAmmoByWeapon(),
      ownedParts: [],
      equippedPartsByWeapon: defaultEquippedPartsByWeapon(),
    },
    stats: {
      raids: 0,
      survived: 0,
      kills: 0,
      bestHaul: 0,
    },
  };
}

function defaultPrepAmmo() {
  return Object.fromEntries(Object.keys(AMMO_DEFS).map((ammoId) => [ammoId, 0]));
}

function defaultSelectedAmmoByWeapon() {
  return Object.fromEntries(
    Object.values(WEAPON_DEFS).map((weapon) => [weapon.id, weapon.defaultAmmoId]),
  );
}

function defaultEquippedPartsByWeapon() {
  return Object.fromEntries(
    Object.values(WEAPON_DEFS).map((weapon) => [weapon.id, {}]),
  );
}

function sanitizeSelectedAmmoByWeapon(source, ownedWeapons) {
  const selected = defaultSelectedAmmoByWeapon();
  for (const weaponId of ownedWeapons) {
    const requested = source?.[weaponId];
    const compatible = getAmmoChoicesForWeapon(weaponId).map((ammo) => ammo.id);
    if (compatible.includes(requested)) {
      selected[weaponId] = requested;
    }
  }
  return selected;
}

function sanitizeEquippedPartsByWeapon(source, ownedParts) {
  const equipped = defaultEquippedPartsByWeapon();
  const ownedPartSet = new Set(ownedParts);
  for (const weaponId of Object.keys(equipped)) {
    const candidate = source?.[weaponId];
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    for (const [slot, partId] of Object.entries(candidate)) {
      const part = PART_DEFS[partId];
      if (
        part &&
        part.slot === slot &&
        part.compatibleWeapons.includes(weaponId) &&
        ownedPartSet.has(partId)
      ) {
        equipped[weaponId][slot] = partId;
      }
    }
  }
  return equipped;
}

function persistSave() {
  if (debugMode) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.save));
}

function resetSave() {
  state.save = defaultSave();
  persistSave();
  renderBasePanel();
  notify('æ¬å°å­æ¡£å·²éç½®ã', 'warning');
}

function formatMoney(value) {
  return `â¿${Math.round(value).toLocaleString('zh-CN')}`;
}

function formatWeight(value) {
  return `${value.toFixed(1)}kg`;
}

function formatTime(seconds) {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const remain = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}

function getBagCapacity() {
  return 18 + state.save.upgrades.bagLevel * 6;
}

function getBagSlots() {
  return 8 + state.save.upgrades.bagLevel * 4;
}

function findLootDefById(id) {
  return lootCatalog.find((item) => item.id === id) ?? null;
}

function normalizeItemInstance(item) {
  if (!item) {
    return null;
  }
  const def =
    findLootDefById(item.id) ??
    (item.ammoId && AMMO_DEFS[item.ammoId] ? makeAmmoLootDef(AMMO_DEFS[item.ammoId]) : null) ??
    (item.partId && PART_DEFS[item.partId] ? makePartLootDef(PART_DEFS[item.partId]) : null);
  return {
    uid: item.uid ?? `${item.id ?? 'loot'}-${Math.random().toString(36).slice(2, 10)}`,
    id: item.id ?? def?.id ?? 'unknown',
    name: item.name ?? def?.name ?? 'Unknown Item',
    category: item.category ?? def?.category ?? 'Misc',
    rarity: item.rarity ?? def?.rarity ?? 'common',
    value: Number.isFinite(item.value) ? item.value : def?.value ?? 0,
    weight: Number.isFinite(item.weight) ? item.weight : def?.weight ?? 0,
    itemType: item.itemType ?? def?.itemType ?? 'loot',
    useAction: item.useAction ?? def?.useAction ?? null,
    healAmount: Number(item.healAmount ?? def?.healAmount ?? 0),
    medkitAmount: Number(item.medkitAmount ?? def?.medkitAmount ?? 0),
    armorAmount: Number(item.armorAmount ?? def?.armorAmount ?? 0),
    useTime: Number(item.useTime ?? def?.useTime ?? 0),
    ammoId: item.ammoId ?? def?.ammoId ?? null,
    rounds: Number(item.rounds ?? def?.rounds ?? 0),
    partId: item.partId ?? def?.partId ?? null,
    slot: item.slot ?? def?.slot ?? null,
  };
}

function getAmmoChoicesForWeapon(weaponId) {
  return Object.values(AMMO_DEFS).filter((ammo) => ammo.weaponIds.includes(weaponId));
}

function getSelectedWeaponId() {
  return state.save.armory?.selectedWeaponId ?? 'rifle';
}

function getSelectedAmmoIdForWeapon(weaponId) {
  const selected = state.save.armory?.selectedAmmoByWeapon?.[weaponId];
  return getAmmoChoicesForWeapon(weaponId).some((ammo) => ammo.id === selected)
    ? selected
    : (WEAPON_DEFS[weaponId] ?? WEAPON_DEFS.rifle).defaultAmmoId;
}

function getEquippedPartMapForWeapon(weaponId) {
  return state.save.armory?.equippedPartsByWeapon?.[weaponId] ?? {};
}

function getActivePartIds(weaponId, player = null) {
  const activeBySlot = new Map();
  for (const [slot, partId] of Object.entries(getEquippedPartMapForWeapon(weaponId))) {
    const part = PART_DEFS[partId];
    if (part) {
      activeBySlot.set(slot, partId);
    }
  }
  if (player?.weapon === weaponId) {
    for (const [slot, partId] of Object.entries(player.tempAttachments ?? {})) {
      const part = PART_DEFS[partId];
      if (part && part.compatibleWeapons.includes(weaponId)) {
        activeBySlot.set(slot, partId);
      }
    }
  }
  return Array.from(activeBySlot.values());
}

function getWeaponStats(weaponId = 'rifle', options = {}) {
  const base = WEAPON_DEFS[weaponId] ?? WEAPON_DEFS.rifle;
  const ammo = options.ammoId ? AMMO_DEFS[options.ammoId] ?? null : null;
  const partIds = options.partIds ?? getActivePartIds(weaponId, options.player ?? null);
  const projectileBaseDamage = base.damage + state.save.upgrades.weaponLevel * base.damageGain;
  const stats = {
    ...base,
    projectileDamage: projectileBaseDamage,
    damage: projectileBaseDamage * (base.pellets ?? 1),
    ammoId: ammo?.id ?? base.defaultAmmoId,
  };
  for (const partId of partIds) {
    const part = PART_DEFS[partId];
    if (!part) {
      continue;
    }
    if (part.magBonus) {
      stats.magSize += part.magBonus;
    }
    if (part.damageBonus) {
      stats.projectileDamage += part.damageBonus;
    }
    if (part.fireRateBonus) {
      stats.fireRate += part.fireRateBonus;
    }
    if (part.reloadMult) {
      stats.reload *= part.reloadMult;
    }
    if (part.spreadMult) {
      stats.spread *= part.spreadMult;
    }
  }
  if (ammo) {
    stats.projectileDamage += ammo.damageBonus ?? 0;
    stats.spread *= ammo.spreadMult ?? 1;
    stats.range += ammo.rangeBonus ?? 0;
    if (ammo.pelletsOverride) {
      stats.pellets = ammo.pelletsOverride;
    }
  }
  stats.damage = Math.round(stats.projectileDamage * (stats.pellets ?? 1));
  return stats;
}

function getWeaponDamage(weaponId = 'rifle', options = {}) {
  return getWeaponStats(weaponId, options).projectileDamage;
}

function getCurrentPlayerWeaponStats(player = state.raid?.player) {
  if (!player) {
    return getWeaponStats(getSelectedWeaponId(), { ammoId: getSelectedAmmoIdForWeapon(getSelectedWeaponId()) });
  }
  return getWeaponStats(player.weapon, { ammoId: player.currentAmmoId, player });
}

function getCurrentReserveAmmo(player, ammoId = player?.currentAmmoId) {
  if (!player || !ammoId) {
    return 0;
  }
  return Math.max(0, Number(player.ammoInventory?.[ammoId] ?? 0));
}

function setSelectedWeapon(weaponId) {
  if (!state.save.armory.ownedWeapons.includes(weaponId)) {
    return;
  }
  state.save.armory.selectedWeaponId = weaponId;
  persistSave();
  renderBasePanel();
}

function setSelectedAmmoForWeapon(weaponId, ammoId) {
  if (!getAmmoChoicesForWeapon(weaponId).some((ammo) => ammo.id === ammoId)) {
    return;
  }
  state.save.armory.selectedAmmoByWeapon[weaponId] = ammoId;
  persistSave();
  renderBasePanel();
}

function setEquippedPartForWeapon(weaponId, partId) {
  const part = PART_DEFS[partId];
  if (!part || !part.compatibleWeapons.includes(weaponId) || !state.save.armory.ownedParts.includes(partId)) {
    return;
  }
  state.save.armory.equippedPartsByWeapon[weaponId][part.slot] = partId;
  persistSave();
  renderBasePanel();
}

function clearEquippedPartForWeapon(weaponId, slot) {
  if (state.save.armory.equippedPartsByWeapon[weaponId]) {
    delete state.save.armory.equippedPartsByWeapon[weaponId][slot];
    persistSave();
    renderBasePanel();
  }
}

function getShopEntries() {
  return [
    {
      id: 'medkit',
      name: 'æå°å»çå',
      description: 'ä¸æ¬¡åºå»æ¶å»çå +1',
      price: 900,
      type: 'consumable',
      disabled: false,
      status: `å·²å¤ ${state.save.prep.medkitBonus}`,
    },
    {
      id: 'ammo',
      name: 'ç©¿ç²å¼¹è¡¥ç»',
      description: 'ä¸æ¬¡åºå»æ¶å¤å¼¹ +60',
      price: 850,
      type: 'consumable',
      disabled: false,
      status: `å·²å¤ +${state.save.prep.ammoBonus}`,
    },
    {
      id: 'armor',
      name: 'å¤åæ¤ç²æ¿',
      description: 'ä¸æ¬¡åºå»æ¶åå§æ¤ç² +35',
      price: 1200,
      type: 'consumable',
      disabled: false,
      status: `å·²å¤ +${state.save.prep.armorBonus}`,
    },
    {
      id: 'bag',
      name: 'æ©å®¹èå',
      description: 'æ°¸ä¹æåèåééä¸æ ¼æ°',
      price: 4200 + state.save.upgrades.bagLevel * 2600,
      type: 'upgrade',
      disabled: state.save.upgrades.bagLevel >= MAX_BAG_LEVEL,
      status: state.save.upgrades.bagLevel >= MAX_BAG_LEVEL ? 'å·²æ»¡çº§' : `Lv.${state.save.upgrades.bagLevel}`,
    },
    {
      id: 'weapon',
      name: 'æªæºæ¹è£',
      description: 'æ°¸ä¹æåæ­¥æªä¼¤å®³',
      price: 3800 + state.save.upgrades.weaponLevel * 2400,
      type: 'upgrade',
      disabled: state.save.upgrades.weaponLevel >= MAX_WEAPON_LEVEL,
      status: state.save.upgrades.weaponLevel >= MAX_WEAPON_LEVEL ? 'å·²æ»¡çº§' : `Lv.${state.save.upgrades.weaponLevel}`,
    },
  ];
}

function renderBasePanel() {
  refs.basePanel.classList.toggle('hidden', state.mode !== 'base');

  const survivalRate =
    state.save.stats.raids > 0
      ? `${Math.round((state.save.stats.survived / state.save.stats.raids) * 100)}%`
      : '--';

  refs.summaryStrip.innerHTML = [
    summaryPill('èµé', formatMoney(state.save.money)),
    summaryPill('ä»åº', `${state.save.stash.length} ä»¶`),
    summaryPill('æ¤ç¦»ç', survivalRate),
    summaryPill('æä½³ haul', formatMoney(state.save.stats.bestHaul)),
  ].join('');

  refs.loadoutPrep.innerHTML = [
    prepRow('åå§å»çå', `${BASE_MEDKITS + state.save.prep.medkitBonus}`),
    prepRow('åå§å¤å¼¹', `${BASE_RESERVE_AMMO + state.save.prep.ammoBonus}`),
    prepRow('åå§æ¤ç²', `${BASE_ARMOR + state.save.prep.armorBonus}`),
    prepRow('èåå®¹é', `${getBagSlots()} æ ¼ / ${formatWeight(getBagCapacity())}`),
    prepRow('æ­¦å¨ä¼¤å®³', `${getWeaponDamage()}`),
  ].join('');

  refs.shopList.innerHTML = getShopEntries()
    .map((entry) => {
      const afford = state.save.money >= entry.price && !entry.disabled;
      return `
        <article class="shop-row">
          <div>
            <div class="item-title">${entry.name}</div>
            <div class="item-meta">${entry.description}</div>
            <div class="item-meta">${entry.status}</div>
          </div>
          <div class="stack-list">
            <button
              class="primary-button small"
              type="button"
              data-shop-id="${entry.id}"
              ${afford ? '' : 'disabled'}
            >
              ${entry.disabled ? 'æ»¡çº§' : formatMoney(entry.price)}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  refs.stashList.innerHTML = state.save.stash.length
    ? state.save.stash
        .slice()
        .sort((a, b) => b.value - a.value)
        .map(
          (item) => `
            <article class="stash-row">
              <div>
                <div class="item-title rarity-${item.rarity}">${item.name}</div>
                <div class="item-meta">${item.category} Â· ${formatWeight(item.weight)} Â· ${formatMoney(item.value)}</div>
              </div>
              <button class="ghost-button small" type="button" data-sell-id="${item.uid}">
                åºå®
              </button>
            </article>
          `,
        )
        .join('')
    : '<div class="item-meta">ä»åºè¿æ²¡æå¸¦åºæ¥çæå©åãè¿å¥å°éåºæç©èµï¼æåæ¤ç¦»åä¼åºç°å¨è¿éã</div>';
}

function summaryPill(label, value) {
  return `<div class="summary-pill"><span>${label}</span><strong>${value}</strong></div>`;
}

function prepRow(label, value) {
  return `
    <div class="prep-row">
      <div class="item-title">${label}</div>
      <div class="item-meta">${value}</div>
    </div>
  `;
}

function buyShopEntry(id) {
  const entry = getShopEntries().find((item) => item.id === id);
  if (!entry || entry.disabled) {
    return;
  }
  if (state.save.money < entry.price) {
    notify('èµéä¸è¶³ã', 'danger');
    return;
  }

  state.save.money -= entry.price;
  if (id === 'medkit') {
    state.save.prep.medkitBonus += 1;
  } else if (id === 'ammo') {
    state.save.prep.ammoBonus += 60;
  } else if (id === 'armor') {
    state.save.prep.armorBonus += 35;
  } else if (id === 'bag') {
    state.save.upgrades.bagLevel += 1;
  } else if (id === 'weapon') {
    state.save.upgrades.weaponLevel += 1;
  }

  persistSave();
  renderBasePanel();
  notify(`å·²è´­ä¹° ${entry.name}ã`, 'success');
}

function sellItem(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const [item] = state.save.stash.splice(index, 1);
  state.save.money += item.value;
  persistSave();
  renderBasePanel();
  notify(`å·²åºå® ${item.name}ï¼è·å¾ ${formatMoney(item.value)}ã`, 'success');
}

function sellAllStash() {
  if (!state.save.stash.length) {
    notify('ä»åºéæ²¡æå¯åºå®çæå©åã', 'warning');
    return;
  }
  const total = state.save.stash.reduce((sum, item) => sum + item.value, 0);
  const count = state.save.stash.length;
  state.save.money += total;
  state.save.stash = [];
  persistSave();
  renderBasePanel();
  notify(`å·²åºå® ${count} ä»¶æå©åï¼è·å¾ ${formatMoney(total)}ã`, 'success');
}

function createScene() {
  refs.canvas.tabIndex = 0;
  engine = new BABYLON.Engine(refs.canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    adaptToDeviceRatio: true,
  });
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.035, 0.055, 0.07, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.015;
  scene.fogColor = new BABYLON.Color3(0.035, 0.055, 0.07);
  if (typeof scene.setRenderingAutoClearDepthStencil === 'function') {
    scene.setRenderingAutoClearDepthStencil(3, true, true, true);
  }

  camera = new BABYLON.UniversalCamera('playerCamera', new BABYLON.Vector3(0, 22, -42), scene);
  camera.fov = 0.88;
  camera.minZ = 0.1;
  camera.maxZ = 300;
  camera.rotation.z = 0;
  camera.inputs.clear();

  const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
  ambient.intensity = 0.88;
  ambient.diffuse = new BABYLON.Color3(0.62, 0.76, 0.86);
  ambient.groundColor = new BABYLON.Color3(0.08, 0.1, 0.11);

  const keyLight = new BABYLON.DirectionalLight('keyLight', new BABYLON.Vector3(-0.4, -1, -0.2), scene);
  keyLight.position = new BABYLON.Vector3(24, 50, 10);
  keyLight.intensity = 1.05;
  keyLight.diffuse = new BABYLON.Color3(0.96, 0.9, 0.78);

  const rimLight = new BABYLON.DirectionalLight('rimLight', new BABYLON.Vector3(0.5, -0.9, 0.3), scene);
  rimLight.position = new BABYLON.Vector3(-28, 26, -30);
  rimLight.intensity = 0.36;
  rimLight.diffuse = new BABYLON.Color3(0.42, 0.62, 0.86);

  const glow = new BABYLON.GlowLayer('glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0.28;

  world = {
    obstacleMeshes: [],
    boundaryMeshes: [],
    dynamicRoots: [],
    extractMeshes: [],
    effects: [],
  };

  buildStaticWorld();
  createViewModel();

  engine.runRenderLoop(loop);
  window.addEventListener('resize', () => engine.resize());
}

function buildStaticWorld() {
  const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene);
  groundMaterial.diffuseColor = BABYLON.Color3.FromHexString('#121a1f');
  groundMaterial.emissiveColor = BABYLON.Color3.FromHexString('#0f171b');
  groundMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: MAP_SIZE + 10, height: MAP_SIZE + 10 }, scene);
  ground.material = groundMaterial;

  const laneMaterial = makeMaterial('laneMat', '#2a4647', '#183132');
  const laneExtent = PLAYABLE_HALF - 10;
  const laneLength = laneExtent * 2;
  for (let x = -laneExtent; x <= laneExtent; x += 8) {
    const line = BABYLON.MeshBuilder.CreateBox(`line-x-${x}`, { width: 0.08, height: 0.02, depth: laneLength }, scene);
    line.position = new BABYLON.Vector3(x, 0.01, 0);
    line.material = laneMaterial;
  }
  for (let z = -laneExtent; z <= laneExtent; z += 8) {
    const line = BABYLON.MeshBuilder.CreateBox(`line-z-${z}`, { width: laneLength, height: 0.02, depth: 0.08 }, scene);
    line.position = new BABYLON.Vector3(0, 0.01, z);
    line.material = laneMaterial;
  }

  const boundaryMaterial = makeMaterial('boundaryMat', '#24353d', '#1b272d');
  const boundarySpecs = [
    { x: 0, y: 2.6, z: -MAP_HALF - 1.5, w: MAP_SIZE + 8, h: 5.2, d: 2.6 },
    { x: 0, y: 2.6, z: MAP_HALF + 1.5, w: MAP_SIZE + 8, h: 5.2, d: 2.6 },
    { x: -MAP_HALF - 1.5, y: 2.6, z: 0, w: 2.6, h: 5.2, d: MAP_SIZE + 8 },
    { x: MAP_HALF + 1.5, y: 2.6, z: 0, w: 2.6, h: 5.2, d: MAP_SIZE + 8 },
  ];
  for (const spec of boundarySpecs) {
    const wall = BABYLON.MeshBuilder.CreateBox(`boundary-${spec.x}-${spec.z}`, {
      width: spec.w,
      height: spec.h,
      depth: spec.d,
    }, scene);
    wall.position = new BABYLON.Vector3(spec.x, spec.y, spec.z);
    wall.material = boundaryMaterial;
    wall.metadata = { raycastTarget: 'obstacle' };
    world.boundaryMeshes.push(wall);
  }

  addBoundaryFence();

  for (const obstacle of obstacleDefs) {
    const box = BABYLON.MeshBuilder.CreateBox(obstacle.id, {
      width: obstacle.w,
      height: obstacle.h,
      depth: obstacle.d,
    }, scene);
    box.position = new BABYLON.Vector3(obstacle.x, obstacle.h / 2, obstacle.z);
    box.material = makeMaterial(`${obstacle.id}-mat`, obstacle.color, shadeColor(obstacle.color, -18));
    box.metadata = { raycastTarget: 'obstacle', obstacleId: obstacle.id };
    world.obstacleMeshes.push(box);

    addRoofFrame(obstacle);
  }

  addEnvironmentProps();
}

function addBoundaryFence() {
  const fenceInset = MAP_HALF - 5.5;
  const segmentLength = 8;
  const postHeight = 2.8;
  const railHeights = [1.1, 2.0];
  const postMaterial = makeMaterial('fencePostMat', '#6d7f84', '#374247');
  const railMaterial = makeMaterial('fenceRailMat', '#81949a', '#3f4c51');

  const createPost = (x, z) => {
    const post = BABYLON.MeshBuilder.CreateBox(`fence-post-${x}-${z}`, {
      width: 0.34,
      height: postHeight,
      depth: 0.34,
    }, scene);
    post.position = new BABYLON.Vector3(x, postHeight / 2, z);
    post.material = postMaterial;
  };

  const createRail = (x, z, width, depth, height) => {
    const rail = BABYLON.MeshBuilder.CreateBox(`fence-rail-${x}-${z}-${height}`, {
      width,
      height: 0.12,
      depth,
    }, scene);
    rail.position = new BABYLON.Vector3(x, height, z);
    rail.material = railMaterial;
  };

  for (let x = -fenceInset; x <= fenceInset; x += segmentLength) {
    createPost(x, -fenceInset);
    createPost(x, fenceInset);
    if (x < fenceInset) {
      const centerX = x + segmentLength / 2;
      for (const height of railHeights) {
        createRail(centerX, -fenceInset, segmentLength - 0.5, 0.16, height);
        createRail(centerX, fenceInset, segmentLength - 0.5, 0.16, height);
      }
    }
  }

  for (let z = -fenceInset; z <= fenceInset; z += segmentLength) {
    createPost(-fenceInset, z);
    createPost(fenceInset, z);
    if (z < fenceInset) {
      const centerZ = z + segmentLength / 2;
      for (const height of railHeights) {
        createRail(-fenceInset, centerZ, 0.16, segmentLength - 0.5, height);
        createRail(fenceInset, centerZ, 0.16, segmentLength - 0.5, height);
      }
    }
  }
}

function addRoofFrame(obstacle) {
  const frameMaterial = makeMaterial(`${obstacle.id}-frame`, '#4e6469', '#34464b');
  const offsets = [
    { x: -obstacle.w / 2 + 0.4, z: -obstacle.d / 2 + 0.4 },
    { x: obstacle.w / 2 - 0.4, z: -obstacle.d / 2 + 0.4 },
    { x: -obstacle.w / 2 + 0.4, z: obstacle.d / 2 - 0.4 },
    { x: obstacle.w / 2 - 0.4, z: obstacle.d / 2 - 0.4 },
  ];
  for (const offset of offsets) {
    const pillar = BABYLON.MeshBuilder.CreateCylinder(`${obstacle.id}-pillar-${offset.x}-${offset.z}`, {
      height: obstacle.h + 0.8,
      diameter: 0.38,
      tessellation: 8,
    }, scene);
    pillar.position = new BABYLON.Vector3(obstacle.x + offset.x, (obstacle.h + 0.8) / 2, obstacle.z + offset.z);
    pillar.material = frameMaterial;
  }
}

function addEnvironmentProps() {
  const lampMaterial = makeMaterial('lampMat', '#9fd9f0', '#89e4ff');
  const poleMaterial = makeMaterial('poleMat', '#52656b', '#2f3a3f');
  const lampPositions = [
    [-PLAYABLE_HALF * 0.74, -PLAYABLE_HALF * 0.74],
    [PLAYABLE_HALF * 0.74, -PLAYABLE_HALF * 0.74],
    [-PLAYABLE_HALF * 0.74, PLAYABLE_HALF * 0.74],
    [PLAYABLE_HALF * 0.74, PLAYABLE_HALF * 0.74],
    [0, -PLAYABLE_HALF * 0.78],
    [0, PLAYABLE_HALF * 0.78],
  ];
  for (const [x, z] of lampPositions) {
    const pole = BABYLON.MeshBuilder.CreateCylinder(`lamp-pole-${x}-${z}`, { height: 8, diameter: 0.3, tessellation: 8 }, scene);
    pole.position = new BABYLON.Vector3(x, 4, z);
    pole.material = poleMaterial;
    const lamp = BABYLON.MeshBuilder.CreateSphere(`lamp-${x}-${z}`, { diameter: 0.9, segments: 10 }, scene);
    lamp.position = new BABYLON.Vector3(x, 8.2, z);
    lamp.material = lampMaterial;
  }

  const towerMaterial = makeMaterial('towerMat', '#4e5f66', '#2b3338');
  const towerPositions = [
    [-PLAYABLE_HALF * 0.9, -PLAYABLE_HALF * 0.9],
    [PLAYABLE_HALF * 0.9, -PLAYABLE_HALF * 0.9],
    [-PLAYABLE_HALF * 0.9, PLAYABLE_HALF * 0.9],
    [PLAYABLE_HALF * 0.9, PLAYABLE_HALF * 0.9],
  ];
  for (const [x, z] of towerPositions) {
    const base = BABYLON.MeshBuilder.CreateBox(`tower-base-${x}-${z}`, { width: 2.8, height: 7, depth: 2.8 }, scene);
    base.position = new BABYLON.Vector3(x, 3.5, z);
    base.material = towerMaterial;
    const top = BABYLON.MeshBuilder.CreateBox(`tower-top-${x}-${z}`, { width: 4, height: 1.2, depth: 4 }, scene);
    top.position = new BABYLON.Vector3(x, 7.4, z);
    top.material = makeMaterial(`tower-top-mat-${x}-${z}`, '#697d81', '#3a4548');
  }
}

function createViewModel() {
  const root = new BABYLON.TransformNode('viewModelRoot', scene);
  root.parent = camera;
  root.position = new BABYLON.Vector3(0.32, -0.34, 0.85);

  const body = BABYLON.MeshBuilder.CreateBox('weapon-body', { width: 0.22, height: 0.18, depth: 1.1 }, scene);
  body.parent = root;
  body.material = makeMaterial('weaponBodyMat', '#5a686f', '#2f3a3f');

  const barrel = BABYLON.MeshBuilder.CreateCylinder('weapon-barrel', {
    height: 0.94,
    diameterTop: 0.07,
    diameterBottom: 0.09,
    tessellation: 10,
  }, scene);
  barrel.parent = root;
  barrel.rotation.x = Math.PI / 2;
  barrel.position = new BABYLON.Vector3(0.05, 0.02, 0.86);
  barrel.material = makeMaterial('weaponBarrelMat', '#9bb4b8', '#5d7679');

  const hand = BABYLON.MeshBuilder.CreateBox('weapon-hand', { width: 0.18, height: 0.16, depth: 0.38 }, scene);
  hand.parent = root;
  hand.position = new BABYLON.Vector3(0.12, -0.18, 0.28);
  hand.rotation.z = -0.2;
  hand.material = makeMaterial('weaponHandMat', '#b0886c', '#5a4032');

  const muzzleFlash = BABYLON.MeshBuilder.CreatePlane('muzzleFlash', { size: 0.42 }, scene);
  muzzleFlash.parent = root;
  muzzleFlash.position = new BABYLON.Vector3(0.04, 0.02, 1.34);
  muzzleFlash.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  muzzleFlash.isPickable = false;
  const muzzleMaterial = new BABYLON.StandardMaterial('muzzleMaterial', scene);
  muzzleMaterial.diffuseColor = BABYLON.Color3.FromHexString('#ffd897');
  muzzleMaterial.emissiveColor = BABYLON.Color3.FromHexString('#ffe58c');
  muzzleMaterial.alpha = 0;
  muzzleMaterial.backFaceCulling = false;
  muzzleMaterial.disableLighting = true;
  muzzleFlash.material = muzzleMaterial;

  const muzzleCore = BABYLON.MeshBuilder.CreatePlane('muzzleCore', { size: 0.24 }, scene);
  muzzleCore.parent = root;
  muzzleCore.position = new BABYLON.Vector3(0.04, 0.02, 1.28);
  muzzleCore.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  muzzleCore.isPickable = false;
  const coreMaterial = new BABYLON.StandardMaterial('muzzleCoreMaterial', scene);
  coreMaterial.diffuseColor = BABYLON.Color3.FromHexString('#fff2c2');
  coreMaterial.emissiveColor = BABYLON.Color3.FromHexString('#fff8db');
  coreMaterial.alpha = 0;
  coreMaterial.backFaceCulling = false;
  coreMaterial.disableLighting = true;
  muzzleCore.material = coreMaterial;

  const muzzleSmoke = BABYLON.MeshBuilder.CreatePlane('muzzleSmoke', { size: 0.56 }, scene);
  muzzleSmoke.parent = root;
  muzzleSmoke.position = new BABYLON.Vector3(0.04, 0.03, 1.2);
  muzzleSmoke.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  muzzleSmoke.isPickable = false;
  const smokeMaterial = new BABYLON.StandardMaterial('muzzleSmokeMaterial', scene);
  smokeMaterial.diffuseColor = BABYLON.Color3.FromHexString('#b9c1c5');
  smokeMaterial.emissiveColor = BABYLON.Color3.FromHexString('#7f8b90');
  smokeMaterial.alpha = 0;
  smokeMaterial.backFaceCulling = false;
  smokeMaterial.disableLighting = true;
  muzzleSmoke.material = smokeMaterial;

  viewModel = {
    root,
    muzzleFlash,
    muzzleCore,
    muzzleSmoke,
    flashTimer: 0,
    smokeTimer: 0,
    recoil: 0,
  };
}

function setMode(mode) {
  state.mode = mode;
  refs.basePanel.classList.toggle('hidden', mode !== 'base');
  refs.hud.classList.toggle('hidden', mode !== 'raid');
}

function startRaid() {
  clearRaid();
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();

  state.save.stats.raids += 1;
  persistSave();

  const activeExtractionIds = shuffle(extractionZones.map((zone) => zone.id)).slice(0, 2);
  const starterWeapon = getWeaponStats('rifle');
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus;
  const reserveAmmo = starterWeapon.baseReserve + state.save.prep.ammoBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus;

  state.raid = {
    timeLeft: RAID_DURATION,
    statusText: 'WASD / Arrow keys move. Mouse drag looks around.',
    interactionText: 'Search 2 caches and clear 2 hostiles before extraction.',
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    overlayPaused: false,
    tasksComplete: false,
    objectives: [
      { id: 'search', label: 'Search', target: 2, progress: 0 },
      { id: 'kill', label: 'Clear', target: 2, progress: 0 },
    ],
    player: {
      x: -4,
      z: 0,
      yaw: Math.PI / 2,
      pitch: 0.16,
      weapon: 'rifle',
      radius: PLAYER_RADIUS,
      health: 100,
      maxHealth: 100,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      reserveAmmo,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => ({
      ...spawn,
      opened: false,
      items: generateContainerLoot(spawn),
      visual: null,
      highlight: 0,
    })),
    extractions: extractionZones.map((zone) => ({
      ...zone,
      active: activeExtractionIds.includes(zone.id),
      visual: null,
      pulse: Math.random() * Math.PI * 2,
    })),
    enemies: shuffle(enemySpawnDefs)
      .slice(0, 8)
      .map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify('Raid started. Finish the tasks to unlock extraction.', 'success');
}

function createEnemy(spawn, index) {
  const archetypes = [
    {
      type: 'scout',
      health:300,
      damage:12,
      speed: 3.68,
      preferredRange: 17,
      fireInterval: 0.96,
      detectRange: 35,
      color: '#c4d2d4',
      skill: 'dash',
      dashDuration: 1.35,
      dashCooldown: 3.6,
      dashSpeedMult: 2.25,
      accuracyBonus: -0.015,
      longFireRange: 28,
      combatSpeedMult: 1.18,
      strafeRadius: 4.6,
      retreatBias: 4.2,
      flankDistance: 1.9,
    },
    {
      type: 'hunter',
      health:400,
      damage: 16,
      speed: 2.82,
      preferredRange: 20,
      fireInterval: 0.82,
      detectRange: 30,
      color: '#8fba91',
      skill: 'markshot',
      accuracyBonus: 0.12,
      shotBurst: 2,
      burstInterval: 0.08,
      longFireRange: 38,
      combatSpeedMult: 1.12,
      strafeRadius: 3.4,
      retreatBias: 5.2,
      flankDistance: 1.5,
    },
    {
      type: 'bruiser',
      health: 500,
      damage: 22,
      speed: 2.16,
      preferredRange: 14,
      fireInterval: 1.34,
      detectRange: 23,
      color: '#c59b73',
      skill: 'fortify',
      damageReduction: 0.18,
      suppressionPulse: 0.38,
      armorShred: 0.15,
      accuracyBonus: 0.03,
      longFireRange: 29,
      combatSpeedMult: 1.06,
      strafeRadius: 2.1,
      retreatBias: 2.8,
      flankDistance: 0.9,
    },
  ];
  const base = archetypes[index % archetypes.length];
  return {
    id: `enemy-${index}`,
    name: base.type === 'scout' ? 'ä¾¦å¯åµ' : base.type === 'hunter' ? 'çæ' : 'éè£åµ',
    type: base.type,
    x: spawn.x,
    z: spawn.z,
    radius: 0.72,
    health: base.health,
    maxHealth: base.health,
    damage: base.damage,
    speed: base.speed,
    preferredRange: base.preferredRange,
    fireInterval: base.fireInterval,
    detectRange: base.detectRange,
    shootCooldown: 0.3 + Math.random() * 0.8,
    skill: base.skill,
    dashDuration: base.dashDuration ?? 0,
    dashCooldown: base.dashCooldown ?? 0,
    dashSpeedMult: base.dashSpeedMult ?? 1,
    dashTimer: 0,
    dashCooldownTimer: randomBetween(0.4, 1.6),
    strafeDirection: Math.random() < 0.5 ? -1 : 1,
    strafeTimer: randomBetween(0.4, 1.2),
    holdTimer: randomBetween(0.2, 0.8),
    investigateTimer: 0,
    broadcastCooldown: randomBetween(0.8, 1.6),
    lastKnownPlayerX: spawn.x,
    lastKnownPlayerZ: spawn.z,
    combatState: 'patrol',
    accuracyBonus: base.accuracyBonus ?? 0,
    shotBurst: base.shotBurst ?? 1,
    burstInterval: base.burstInterval ?? 0.1,
    damageReduction: base.damageReduction ?? 0,
    suppressionPulse: base.suppressionPulse ?? 0,
    armorShred: base.armorShred ?? 0,
    longFireRange: base.longFireRange ?? (base.preferredRange + 10),
    combatSpeedMult: base.combatSpeedMult ?? 1,
    strafeRadius: base.strafeRadius ?? 2.4,
    retreatBias: base.retreatBias ?? 3.2,
    flankDistance: base.flankDistance ?? 1.1,
    repositionTimer: randomBetween(0.24, 0.82),
    burstMoveTimer: randomBetween(0.08, 0.28),
    route: spawn.route.map((point) => ({ ...point })),
    routeIndex: 0,
    alertTimer: 0,
    mobilityAction: null,
    mobilityCooldown: randomBetween(0.2, 0.9),
    proneTimer: 0,
    proneCooldown: randomBetween(0.6, 1.8),
    proneBlend: 0,
    isProne: false,
    dead: false,
    corpseTimer: ENEMY_FALL_DURATION,
    despawned: false,
    dropPending: false,
    dropItem: null,
    visual: null,
    heading: 0,
    damageFlash: 0,
    muzzleTimer: 0,
    visualColor: base.color,
    fallTilt: randomBetween(-0.42, 0.42),
  };
}

function getRaidObjectiveStatus(raid = state.raid) {
  const objectives = raid?.objectives ?? [];
  if (!objectives.length) {
    const switchZone = raid?.extractions?.find((zone) => zone.kind === 'switch');
    if (switchZone?.switchArmed && (switchZone.switchTimer ?? 0) > 0) {
      return L('æ®éæ¤ç¦»å·²å¼æ¾ | æé¸æ¤ç¦»å·²å¼æ¾', 'Standard exit open | Lever exit open');
    }
    return L('æ®éæ¤ç¦»å·²å¼æ¾ | æé¸æ¤ç¦»å¾å¼å¯', 'Standard exit open | Lever exit locked');
  }
  return objectives
    .map((objective) => {
      const label = objective.id === 'search'
        ? L('\u641c\u7d22', 'Search')
        : objective.id === 'kill'
          ? L('\u6e05\u654c', 'Clear')
          : objective.label;
      return `${label} ${objective.progress}/${objective.target}`;
    })
    .join(' | ');
}

function areRaidObjectivesComplete(raid = state.raid) {
  const objectives = raid?.objectives ?? [];
  return objectives.length > 0 && objectives.every((objective) => objective.progress >= objective.target);
}

function advanceRaidObjective(objectiveId, amount = 1) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const objective = raid.objectives?.find((entry) => entry.id === objectiveId);
  if (!objective || objective.progress >= objective.target) {
    return;
  }
  objective.progress = Math.min(objective.target, objective.progress + amount);
  if (!raid.tasksComplete && areRaidObjectivesComplete(raid)) {
    raid.tasksComplete = true;
    notify(L('ä»»å¡å®æï¼ä»»å¡æ¤ç¦»ç¹å·²è§£éã', 'Tasks complete. Task-locked extraction is now available.'), 'success');
  }
}

function getSwitchPointLabel(point) {
  if (!point) {
    return L('æé¸ç¹', 'Lever Point');
  }
  return getLanguage() === 'zh' ? (point.nameZh ?? point.nameEn ?? point.id) : (point.nameEn ?? point.nameZh ?? point.id);
}

function getSwitchPointById(raid = state.raid, pointId = '') {
  return raid?.switchPoints?.find((point) => point.id === pointId) ?? null;
}

function isExtractionCurrentlyAvailable(zone, raid = state.raid) {
  if (!raid || !zone || !zone.active) {
    return false;
  }
  if (zone.kind === 'switch') {
    return Boolean(zone.switchArmed) && (zone.switchTimer ?? 0) > 0;
  }
  return true;
}

function getExtractionStatusLabel(zone, raid = state.raid) {
  if (!raid || !zone) {
    return '';
  }
  if (zone.kind === 'task') {
    return raid.tasksComplete
      ? L('ä»»å¡å·²è§£é', 'Task unlocked')
      : L(`éåå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Finish tasks first: ${getRaidObjectiveStatus(raid)}`);
  }
  if (zone.kind === 'switch') {
    if (zone.switchArmed && (zone.switchTimer ?? 0) > 0) {
      return L(`é¸é¨å·²å¼å¯ ${Math.ceil(zone.switchTimer)}s`, `Gate open ${Math.ceil(zone.switchTimer)}s`);
    }
    if (zone.switchExpired) {
      return L('é¸é¨å·²å³é­', 'Gate expired');
    }
    const point = getSwitchPointById(raid, zone.switchPointId);
    return point
      ? L(`éååå¾ ${getSwitchPointLabel(point)} æé¸`, `Pull ${getSwitchPointLabel(point)} first`)
      : L('éåæé¸', 'Lever required');
  }
  return L('å¯æ¤ç¦»', 'Ready');
}

function buildExtractionHeaderText(raid = state.raid) {
  if (!raid) {
    return '';
  }
  const readyCount = raid.extractions.filter((zone) => isExtractionCurrentlyAvailable(zone, raid)).length;
  const parts = [L(`æ¤ç¦» ${readyCount}/${raid.extractions.length}`, `Extract ${readyCount}/${raid.extractions.length}`)];
  const switchZone = raid.extractions.find((zone) => zone.kind === 'switch');
  if (switchZone) {
    parts.push(
      switchZone.switchArmed && (switchZone.switchTimer ?? 0) > 0
        ? L(`æé¸ ${Math.ceil(switchZone.switchTimer)}s`, `Lever ${Math.ceil(switchZone.switchTimer)}s`)
        : switchZone.switchExpired
          ? L('æé¸å·²å¤±æ', 'Lever expired')
          : L('æé¸æªå¯å¨', 'Lever idle'),
    );
  }
  if (!raid.tasksComplete) {
    parts.push(L(`ä»»å¡ ${getRaidObjectiveStatus(raid)}`, `Tasks ${getRaidObjectiveStatus(raid)}`));
  }
  return parts.join(' / ');
}

function getRaidEnemyStateCounts(raid = state.raid) {
  const counts = {
    patrol: 0,
    search: 0,
    alert: 0,
    engage: 0,
    flank: 0,
  };
  for (const enemy of raid?.enemies ?? []) {
    if (enemy.dead || enemy.despawned) {
      continue;
    }
    const stateName = enemy.combatState && Object.prototype.hasOwnProperty.call(counts, enemy.combatState)
      ? enemy.combatState
      : (enemy.alertTimer ?? 0) > 0
        ? 'alert'
        : 'patrol';
    counts[stateName] += 1;
  }
  return counts;
}

function getRaidThreatInfo(raid = state.raid) {
  const counts = getRaidEnemyStateCounts(raid);
  const engaged = counts.engage + counts.flank;
  const searching = counts.search + counts.alert;
  const player = raid?.player;

  if (engaged >= 4 || (engaged >= 2 && (player?.health ?? 100) <= 40)) {
    return { label: L('æé«', 'Critical'), color: '#ff7a72' };
  }
  if (engaged >= 2 || searching >= 5) {
    return { label: L('é«', 'High'), color: '#ffb36b' };
  }
  if (engaged >= 1 || searching >= 1) {
    return { label: L('ä¸­', 'Medium'), color: '#f0c57d' };
  }
  return { label: L('ä½', 'Low'), color: '#8fd6b3' };
}

function getRaidObjectiveDetailText(raid = state.raid) {
  const counts = getRaidEnemyStateCounts(raid);
  return L(
    `å·¡é» ${counts.patrol} | æç´¢ ${counts.search + counts.alert} | äº¤ç« ${counts.engage + counts.flank}`,
    `Patrol ${counts.patrol} | Search ${counts.search + counts.alert} | Engage ${counts.engage + counts.flank}`,
  );
}

function getRaidDefaultStatusText(raid = state.raid) {
  if (!raid) {
    return '';
  }
  const counts = getRaidEnemyStateCounts(raid);
  const hotContacts = counts.engage + counts.flank;
  const searching = counts.search + counts.alert;
  if (hotContacts > 0) {
    return L(`äº¤ç«ä¸­ï¼${hotContacts} åæäººæ­£å¨åå¶ä½ `, `${hotContacts} hostiles are actively engaging you.`);
  }
  if (searching > 0) {
    return L(`æäººå·²è­¦æï¼${searching} åæäººæ­£å¨æç´¢ä½ `, `${searching} hostiles are searching for you.`);
  }
  if (!(raid.objectives?.length ?? 0)) {
    const switchZone = raid.extractions?.find((zone) => zone.kind === 'switch');
    if (switchZone?.switchArmed && (switchZone.switchTimer ?? 0) > 0) {
      return L(
        `æ®éæ¤ç¦»å·²å¼æ¾ï¼æé¸æ¤ç¦»å©ä½ ${Math.ceil(switchZone.switchTimer)}s`,
        `Standard exit is open. Lever exit remains for ${Math.ceil(switchZone.switchTimer)}s.`,
      );
    }
    if (switchZone?.switchExpired) {
      return L('æ®éæ¤ç¦»å·²å¼æ¾ï¼æé¸æ¤ç¦»å·²å³é­ã', 'Standard exit is open. Lever exit has closed.');
    }
    return L('æ®éæ¤ç¦»å·²å¼æ¾ï¼æé¸æ¤ç¦»éååå¾æé¸ç¹ã', 'Standard exit is open. Pull the lever to unlock the gated exit.');
  }
  if (!raid.tasksComplete) {
    return L(`å½åä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Objectives: ${getRaidObjectiveStatus(raid)}`);
  }
  return L('ä»»å¡å®æï¼åå¾å·²å¼æ¾æ¤ç¦»ç¹ã', 'Objectives complete. Head to an open extraction.');
}

function broadcastEnemyAlert(sourceEnemy, raid = state.raid, player = raid?.player) {
  if (!raid || !player || !sourceEnemy) {
    return;
  }
  const relayRange = sourceEnemy.type === 'scout' ? 18 : 22;
  for (const ally of raid.enemies) {
    if (ally === sourceEnemy || ally.dead || ally.despawned) {
      continue;
    }
    if (distance2D(sourceEnemy.x, sourceEnemy.z, ally.x, ally.z) > relayRange) {
      continue;
    }
    ally.alertTimer = Math.max(ally.alertTimer ?? 0, 2.8);
    ally.investigateTimer = Math.max(ally.investigateTimer ?? 0, 4.5);
    ally.lastKnownPlayerX = player.x + randomBetween(-1.6, 1.6);
    ally.lastKnownPlayerZ = player.z + randomBetween(-1.6, 1.6);
    if ((ally.combatState ?? 'patrol') === 'patrol') {
      ally.combatState = 'search';
    }
  }
  sourceEnemy.broadcastCooldown = 2 + Math.random() * 0.8;
}

function alertEnemyToPlayer(enemy, player = state.raid?.player, options = {}) {
  if (!enemy || !player || enemy.dead || enemy.despawned) {
    return;
  }
  enemy.alertTimer = Math.max(enemy.alertTimer ?? 0, options.alertTimer ?? 4.8);
  enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, options.investigateTimer ?? 5.4);
  enemy.lastKnownPlayerX = (options.sourceX ?? player.x) + randomBetween(-0.8, 0.8);
  enemy.lastKnownPlayerZ = (options.sourceZ ?? player.z) + randomBetween(-0.8, 0.8);
  if ((enemy.combatState ?? 'patrol') === 'patrol') {
    enemy.combatState = 'search';
  }
}

function alertEnemiesToSound(sourceX, sourceZ, radius = 34, options = {}) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player) {
    return;
  }
  for (const enemy of raid.enemies) {
    if (enemy.dead || enemy.despawned) {
      continue;
    }
    const distance = distance2D(sourceX, sourceZ, enemy.x, enemy.z);
    if (distance > radius) {
      continue;
    }
    const scaledAlert = (options.alertTimer ?? 4.2) * clamp(1 - distance / Math.max(radius, 1), 0.35, 1);
    alertEnemyToPlayer(enemy, player, {
      alertTimer: scaledAlert,
      investigateTimer: options.investigateTimer ?? 5,
      sourceX,
      sourceZ,
    });
  }
}

function distancePointToSegment2D(px, pz, ax, az, bx, bz) {
  const abX = bx - ax;
  const abZ = bz - az;
  const apX = px - ax;
  const apZ = pz - az;
  const abLenSq = abX * abX + abZ * abZ;
  if (abLenSq <= 0.0001) {
    return Math.hypot(apX, apZ);
  }
  const t = clamp((apX * abX + apZ * abZ) / abLenSq, 0, 1);
  const closestX = ax + abX * t;
  const closestZ = az + abZ * t;
  return Math.hypot(px - closestX, pz - closestZ);
}

function triggerEnemyEvasionFromShot(origin, end, hitEnemyId = '') {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player) {
    return;
  }
  for (const enemy of raid.enemies) {
    if (enemy.dead || enemy.despawned || enemy.id === hitEnemyId) {
      continue;
    }
    const nearMiss = distancePointToSegment2D(enemy.x, enemy.z, origin.x, origin.z, end.x, end.z);
    const dodgeRadius = enemy.type === 'scout' ? 5.2 : enemy.type === 'hunter' ? 4.3 : 3.2;
    if (nearMiss > dodgeRadius) {
      continue;
    }
    alertEnemyToPlayer(enemy, player, { alertTimer: 4.6, investigateTimer: 5.2, sourceX: player.x, sourceZ: player.z });
    enemy.strafeDirection = Math.random() < 0.5 ? -1 : 1;
    enemy.strafeTimer = Math.max(enemy.strafeTimer ?? 0, enemy.type === 'scout' ? 1.35 : enemy.type === 'hunter' ? 1.05 : 0.82);
    enemy.repositionTimer = 0;
    enemy.burstMoveTimer = Math.max(enemy.burstMoveTimer ?? 0, enemy.type === 'scout' ? 0.62 : 0.46);
    if (enemy.type !== 'bruiser' && enemy.dashCooldownTimer <= 0) {
      enemy.dashTimer = Math.max(enemy.dashTimer ?? 0, enemy.dashDuration ? Math.min(enemy.dashDuration, 0.85) : 0.55);
      enemy.dashCooldownTimer = Math.max(enemy.dashCooldownTimer ?? 0, enemy.type === 'scout' ? 2.4 : 2.9);
    }
  }
}

function chooseRaidExtractions(playerSpawn) {
  const standardPool = extractionZones.filter((zone) => zone.kind === 'standard');
  const standard = standardPool
    .slice()
    .sort((a, b) => distance2D(b.x, b.z, playerSpawn.x, playerSpawn.z) - distance2D(a.x, a.z, playerSpawn.x, playerSpawn.z))[0];

  const switchZoneTemplate = extractionZones
    .filter((zone) => zone.kind === 'switch')
    .slice()
    .sort((a, b) => {
      const scoreA = Math.min(
        distance2D(a.x, a.z, playerSpawn.x, playerSpawn.z),
        standard ? distance2D(a.x, a.z, standard.x, standard.z) : Number.POSITIVE_INFINITY,
      );
      const scoreB = Math.min(
        distance2D(b.x, b.z, playerSpawn.x, playerSpawn.z),
        standard ? distance2D(b.x, b.z, standard.x, standard.z) : Number.POSITIVE_INFINITY,
      );
      return scoreB - scoreA;
    })[0];

  const selected = [
    standard ? { ...standard, active: true, pulse: Math.random() * Math.PI * 2 } : null,
    switchZoneTemplate
      ? {
          ...switchZoneTemplate,
          active: true,
          pulse: Math.random() * Math.PI * 2,
          switchArmed: false,
          switchTimer: 0,
          switchExpired: false,
          switchPointId: '',
        }
      : null,
  ].filter(Boolean);

  const switchPoints = [];
  for (const zone of selected.filter((entry) => entry.kind === 'switch')) {
    const leverChoices = shuffle(
      switchPointCandidates.filter((point) => distance2D(point.x, point.z, zone.x, zone.z) > MAP_HALF * 0.35),
    );
    const chosenPoint = {
      ...(leverChoices[0] ?? shuffle(switchPointCandidates)[0]),
      active: true,
      used: false,
      pulse: Math.random() * Math.PI * 2,
      zoneId: zone.id,
    };
    zone.switchPointId = chosenPoint.id;
    switchPoints.push(chosenPoint);
  }

  return {
    extractions: selected,
    switchPoints,
  };
}

function chooseRaidSpawnPoint() {
  if (!raidSpawnRotation.length) {
    const freshCycle = shuffle(raidSpawnCandidates.slice()).map((entry) => entry.id);
    if (freshCycle[0] === lastRaidSpawnId && freshCycle.length > 1) {
      freshCycle.push(freshCycle.shift());
    }
    raidSpawnRotation = freshCycle;
  }
  const nextSpawnId = raidSpawnRotation.shift() ?? raidSpawnCandidates[0]?.id;
  const selected = raidSpawnCandidates.find((entry) => entry.id === nextSpawnId) ?? raidSpawnCandidates[0];
  lastRaidSpawnId = selected.id;
  const resolved = resolveStaticPlacement(selected.x, selected.z, PLAYER_RADIUS + 0.2);
  return {
    ...resolved,
    id: selected.id,
    yaw: Math.atan2(-resolved.x, -resolved.z),
  };
}

function getSpawnPathMinDistance(spawn, targetX, targetZ) {
  let minDistance = distance2D(spawn.x, spawn.z, targetX, targetZ);
  for (const point of spawn.route ?? []) {
    minDistance = Math.min(minDistance, distance2D(point.x, point.z, targetX, targetZ));
  }
  return minDistance;
}

function chooseRaidEnemySpawns(playerSpawn) {
  const scored = shuffle(enemySpawnDefs.slice())
    .map((spawn) => ({
      spawn,
      safeDistance: getSpawnPathMinDistance(spawn, playerSpawn.x, playerSpawn.z),
    }))
    .sort((left, right) => right.safeDistance - left.safeDistance);
  const safeSpawns = scored
    .filter(({ safeDistance }) => safeDistance >= SPAWN_SAFE_RADIUS)
    .map(({ spawn }) => spawn);
  const fallbackSpawns = scored
    .filter(({ safeDistance }) => safeDistance < SPAWN_SAFE_RADIUS)
    .map(({ spawn }) => spawn);
  return safeSpawns.concat(fallbackSpawns).slice(0, Math.min(enemySpawnDefs.length, 64));
}

function resetRaidLoadout(player) {
  if (!player) {
    return;
  }
  const baseAmmoId = WEAPON_DEFS.rifle.defaultAmmoId;
  const baseWeapon = getWeaponStats('rifle', { ammoId: baseAmmoId });
  player.weapon = 'rifle';
  player.currentAmmoId = baseAmmoId;
  player.tempAttachments = {};
  player.health = 100;
  player.maxHealth = 100;
  player.armor = BASE_ARMOR;
  player.maxArmor = BASE_ARMOR;
  player.ammoInMag = baseWeapon.magSize;
  player.magSize = baseWeapon.magSize;
  player.ammoInventory = defaultPrepAmmo();
  player.ammoInventory[baseAmmoId] = baseWeapon.baseReserve;
  player.medkits = BASE_MEDKITS;
  player.fireCooldown = 0;
  player.reloadTimer = 0;
  player.healTimer = 0;
  player.useAction = null;
  player.useActionPulseTimer = 0;
  player.extractionProgress = 0;
  player.extractionZoneId = null;
  player.damageFlash = 0;
  player.recoilKick = 0;
  player.damageJolt = 0;
  player.nearHitPulse = 0;
  player.abilityCooldown = 0;
  player.abilityCooldownPending = false;
  player.abilityActiveTimer = 0;
  player.operatorEffectTimer = 0;
  player.damageReductionTimer = 0;
  player.damageReductionMult = 1;
  player.medicAutoUsed = false;
  player.medicFoamTimer = 0;
  player.medicFoamPulseTimer = 0;
  player.velocityBob = 0;
}

function generateContainerLoot(spawn) {
  const rollCount =
    spawn.tier === 3 ? randomInt(2, 4) :
    spawn.tier === 2 ? randomInt(2, 3) :
    randomInt(1, 3);
  const items = [];
  for (let i = 0; i < rollCount; i += 1) {
    const picked = weightedPick(
      lootCatalog.filter((item) => item.pools.includes(spawn.pool)),
      (item) => item.spawnWeight * rarityTierModifier(item.rarity, spawn.tier),
    );
    if (picked) {
      items.push(createLootInstance(picked));
    }
  }
  return items;
}

function rarityTierModifier(rarity, tier) {
  if (tier === 3) {
    return rarity === 'red' ? 2.8 : rarity === 'legendary' ? 2.2 : rarity === 'epic' ? 1.8 : rarity === 'rare' ? 1.35 : 1;
  }
  if (tier === 2) {
    return rarity === 'red' ? 1.9 : rarity === 'rare' ? 1.4 : rarity === 'epic' ? 1.2 : 1;
  }
  return rarity === 'common' ? 1.3 : 1;
}

function createLootInstance(item) {
  return {
    uid: `${item.id}-${Math.random().toString(36).slice(2, 10)}`,
    id: item.id,
    name: item.name,
    category: item.category,
    rarity: item.rarity,
    value: item.value,
    weight: item.weight,
  };
}

function spawnRaidVisuals() {
  const raid = state.raid;
  if (!raid) {
    return;
  }

  for (const container of raid.containers) {
    container.visual = createContainerVisual(container);
  }
  for (const zone of raid.extractions) {
    zone.visual = createExtractionVisual(zone);
  }
  for (const point of raid.switchPoints ?? []) {
    point.visual = createSwitchVisual(point);
  }
  for (const enemy of raid.enemies) {
    enemy.visual = createEnemyVisual(enemy);
  }
}

function clearRaid() {
  if (!state.raid) {
    return;
  }
  for (const collection of [state.raid.containers, state.raid.extractions, state.raid.switchPoints ?? [], state.raid.enemies]) {
    for (const entity of collection) {
      disposeVisual(entity.visual);
      entity.visual = null;
    }
  }
  for (const effect of state.raid.effects ?? []) {
    disposeVisual(effect);
  }
  releasePointerLock();
  state.raid = null;
  state.overlay = null;
}

function disposeVisual(visual) {
  if (!visual) {
    return;
  }
  if (Array.isArray(visual)) {
    for (const entry of visual) {
      disposeVisual(entry);
    }
    return;
  }
  if (visual.root?.dispose) {
    visual.root.dispose(false, true);
  }
  if (visual.line?.dispose) {
    visual.line.dispose(false, true);
  }
  if (visual.mesh?.dispose) {
    visual.mesh.dispose(false, true);
  }
  if (visual.dispose) {
    visual.dispose(false, true);
  }
}

function createContainerVisual(container) {
  const root = new BABYLON.TransformNode(`container-${container.id}`, scene);
  root.position = new BABYLON.Vector3(container.x, 0, container.z);
  const base = BABYLON.MeshBuilder.CreateBox(`container-base-${container.id}`, {
    width: 1.8,
    height: 1.1,
    depth: 1.2,
  }, scene);
  base.parent = root;
  base.position.y = 0.55;
  base.material = makeMaterial(`container-base-mat-${container.id}`, container.pool === 'med' ? '#5b7c75' : container.pool === 'valuable' ? '#82694e' : '#53636d', '#2a3439');

  const lid = BABYLON.MeshBuilder.CreateBox(`container-lid-${container.id}`, {
    width: 1.72,
    height: 0.18,
    depth: 1.08,
  }, scene);
  lid.parent = root;
  lid.position.y = 1.16;
  lid.material = makeMaterial(`container-lid-mat-${container.id}`, '#9eb3b8', '#51656c');

  const beacon = BABYLON.MeshBuilder.CreateCylinder(`container-beacon-${container.id}`, {
    height: 1.2,
    diameterTop: 0.08,
    diameterBottom: 0.4,
    tessellation: 10,
  }, scene);
  beacon.parent = root;
  beacon.position.y = 1.9;
  beacon.material = makeMaterial(`container-beacon-mat-${container.id}`, container.pool === 'valuable' ? '#f1c66d' : '#82d1bf', '#8ceadd');
  beacon.material.alpha = 0.52;

  return { root, base, lid, beacon };
}

function createExtractionVisual(zone) {
  const root = new BABYLON.TransformNode(`extract-${zone.id}`, scene);
  root.position = new BABYLON.Vector3(zone.x, 0, zone.z);

  const pad = BABYLON.MeshBuilder.CreateCylinder(`extract-pad-${zone.id}`, {
    height: 0.24,
    diameter: zone.radius * 2.34,
    tessellation: 28,
  }, scene);
  pad.parent = root;
  pad.position.y = 0.12;
  pad.material = makeMaterial(`extract-pad-mat-${zone.id}`, zone.active ? '#263a37' : '#20292d', '#10181b');

  const ring = BABYLON.MeshBuilder.CreateTorus(`extract-ring-${zone.id}`, {
    diameter: zone.radius * 2.08,
    thickness: 0.2,
    tessellation: 36,
  }, scene);
  ring.parent = root;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.18;
  ring.material = makeMaterial(`extract-ring-mat-${zone.id}`, zone.active ? '#8fd6b3' : '#4b5a5c', zone.active ? '#9af0c0' : '#293438');

  const innerRing = BABYLON.MeshBuilder.CreateTorus(`extract-inner-${zone.id}`, {
    diameter: zone.radius * 1.26,
    thickness: 0.08,
    tessellation: 26,
  }, scene);
  innerRing.parent = root;
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.32;
  innerRing.material = makeMaterial(`extract-inner-mat-${zone.id}`, zone.active ? '#d5f2de' : '#48585d', zone.active ? '#dfffe8' : '#273338');

  const pillar = BABYLON.MeshBuilder.CreateCylinder(`extract-pillar-${zone.id}`, {
    height: 7.2,
    diameterTop: 0.18,
    diameterBottom: 0.9,
    tessellation: 14,
  }, scene);
  pillar.parent = root;
  pillar.position.y = 3.6;
  pillar.material = makeMaterial(`extract-pillar-mat-${zone.id}`, zone.active ? '#7fd7b4' : '#556366', zone.active ? '#a5ffd6' : '#334144');
  pillar.material.alpha = zone.active ? 0.18 : 0.06;

  const core = BABYLON.MeshBuilder.CreateCylinder(`extract-core-${zone.id}`, {
    height: 6.2,
    diameter: 0.36,
    tessellation: 10,
  }, scene);
  core.parent = root;
  core.position.y = 3.2;
  core.material = makeMaterial(`extract-core-mat-${zone.id}`, zone.active ? '#dcffe8' : '#698085', zone.active ? '#effff5' : '#344247');
  core.material.alpha = zone.active ? 0.32 : 0.08;

  const pylons = [];
  const pylonCaps = [];
  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * 2 * index) / 4 + Math.PI / 4;
    const pylon = BABYLON.MeshBuilder.CreateBox(`extract-pylon-${zone.id}-${index}`, {
      width: 0.6,
      height: 2.5,
      depth: 0.6,
    }, scene);
    pylon.parent = root;
    pylon.position = new BABYLON.Vector3(Math.cos(angle) * (zone.radius * 0.82), 1.25, Math.sin(angle) * (zone.radius * 0.82));
    pylon.rotation.y = angle;
    pylon.material = makeMaterial(`extract-pylon-mat-${zone.id}-${index}`, '#4c5d62', '#263238');
    pylons.push(pylon);

    const cap = BABYLON.MeshBuilder.CreateSphere(`extract-cap-${zone.id}-${index}`, { diameter: 0.42, segments: 8 }, scene);
    cap.parent = root;
    cap.position = new BABYLON.Vector3(Math.cos(angle) * (zone.radius * 0.82), 2.6, Math.sin(angle) * (zone.radius * 0.82));
    cap.material = makeMaterial(`extract-cap-mat-${zone.id}-${index}`, zone.active ? '#baf3d0' : '#64767c', zone.active ? '#e2fff0' : '#364247');
    pylonCaps.push(cap);
  }

  const gateLeft = BABYLON.MeshBuilder.CreateBox(`extract-gate-left-${zone.id}`, {
    width: 0.7,
    height: 3.4,
    depth: 0.8,
  }, scene);
  gateLeft.parent = root;
  gateLeft.position = new BABYLON.Vector3(-(zone.radius + 1.5), 1.7, 0);
  gateLeft.material = makeMaterial(`extract-gate-left-mat-${zone.id}`, '#56666d', '#2a3438');

  const gateRight = BABYLON.MeshBuilder.CreateBox(`extract-gate-right-${zone.id}`, {
    width: 0.7,
    height: 3.4,
    depth: 0.8,
  }, scene);
  gateRight.parent = root;
  gateRight.position = new BABYLON.Vector3(zone.radius + 1.5, 1.7, 0);
  gateRight.material = makeMaterial(`extract-gate-right-mat-${zone.id}`, '#56666d', '#2a3438');

  const gateBeam = BABYLON.MeshBuilder.CreateBox(`extract-gate-beam-${zone.id}`, {
    width: zone.radius * 2.7,
    height: 0.44,
    depth: 0.7,
  }, scene);
  gateBeam.parent = root;
  gateBeam.position = new BABYLON.Vector3(0, 3.2, 0);
  gateBeam.material = makeMaterial(`extract-gate-beam-mat-${zone.id}`, '#7d9097', '#39464a');

  return { root, pad, ring, innerRing, pillar, core, pylons, pylonCaps, gateLeft, gateRight, gateBeam };
}

function createSwitchVisual(point) {
  const root = new BABYLON.TransformNode(`switch-${point.id}`, scene);
  root.position = new BABYLON.Vector3(point.x, 0, point.z);

  const base = BABYLON.MeshBuilder.CreateBox(`switch-base-${point.id}`, {
    width: 2.2,
    height: 1.2,
    depth: 1.8,
  }, scene);
  base.parent = root;
  base.position.y = 0.6;
  base.material = makeMaterial(`switch-base-mat-${point.id}`, '#37464c', '#1f2a2f');

  const consoleBody = BABYLON.MeshBuilder.CreateBox(`switch-console-${point.id}`, {
    width: 1.4,
    height: 1.6,
    depth: 0.8,
  }, scene);
  consoleBody.parent = root;
  consoleBody.position = new BABYLON.Vector3(0, 1.55, -0.32);
  consoleBody.rotation.x = -0.16;
  consoleBody.material = makeMaterial(`switch-console-mat-${point.id}`, '#586a72', '#28343a');

  const leverPivot = new BABYLON.TransformNode(`switch-pivot-${point.id}`, scene);
  leverPivot.parent = root;
  leverPivot.position = new BABYLON.Vector3(0, 1.72, 0.42);

  const leverArm = BABYLON.MeshBuilder.CreateCylinder(`switch-arm-${point.id}`, {
    height: 1.15,
    diameter: 0.14,
    tessellation: 10,
  }, scene);
  leverArm.parent = leverPivot;
  leverArm.rotation.x = Math.PI / 2;
  leverArm.position.z = 0.34;
  leverArm.material = makeMaterial(`switch-arm-mat-${point.id}`, '#b9c9ce', '#66757b');

  const leverHandle = BABYLON.MeshBuilder.CreateSphere(`switch-handle-${point.id}`, { diameter: 0.28, segments: 10 }, scene);
  leverHandle.parent = leverPivot;
  leverHandle.position.z = 0.9;
  leverHandle.material = makeMaterial(`switch-handle-mat-${point.id}`, '#d9896f', '#744539');

  const lamp = BABYLON.MeshBuilder.CreateSphere(`switch-lamp-${point.id}`, { diameter: 0.32, segments: 10 }, scene);
  lamp.parent = root;
  lamp.position = new BABYLON.Vector3(0.46, 2.18, -0.58);
  lamp.material = makeMaterial(`switch-lamp-mat-${point.id}`, '#5b7178', '#2e3b40');

  const glow = BABYLON.MeshBuilder.CreatePlane(`switch-glow-${point.id}`, { size: 0.54 }, scene);
  glow.parent = root;
  glow.position = new BABYLON.Vector3(0.46, 2.18, -0.1);
  glow.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const glowMat = new BABYLON.StandardMaterial(`switch-glow-mat-${point.id}`, scene);
  glowMat.diffuseColor = BABYLON.Color3.FromHexString('#8fd6b3');
  glowMat.emissiveColor = BABYLON.Color3.FromHexString('#d9ffe9');
  glowMat.alpha = 0.18;
  glowMat.backFaceCulling = false;
  glowMat.disableLighting = true;
  glow.material = glowMat;

  return { root, base, consoleBody, leverPivot, leverArm, leverHandle, lamp, glow };
}

function drawEnemyClassLabel(texture, labelText) {
  if (!texture) {
    return;
  }
  const context = texture.getContext();
  const size = texture.getSize();
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = 'rgba(7, 18, 24, 0.78)';
  context.fillRect(10, 12, size.width - 20, size.height - 24);
  context.strokeStyle = 'rgba(121, 245, 255, 0.95)';
  context.lineWidth = 6;
  context.strokeRect(10, 12, size.width - 20, size.height - 24);
  context.fillStyle = 'rgba(226, 250, 255, 0.98)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 56px Segoe UI';
  context.fillText(labelText, size.width / 2, size.height / 2 + 2);
  texture.update();
}

function createEnemyVisual(enemy) {
  const root = new BABYLON.TransformNode(`enemy-root-${enemy.id}`, scene);
  root.position = new BABYLON.Vector3(enemy.x, 0, enemy.z);

  const bodyMat = makeMaterial(`enemy-body-mat-${enemy.id}`, enemy.visualColor ?? enemyColorForType(enemy.type), shadeColor(enemyColorForType(enemy.type), -24));
  const armorMat = makeMaterial(`enemy-armor-mat-${enemy.id}`, shadeColor(enemyColorForType(enemy.type), 8), shadeColor(enemyColorForType(enemy.type), -18));
  const gearMat = makeMaterial(`enemy-gear-mat-${enemy.id}`, '#5e6d73', '#2a3439');
  const headMat = makeMaterial(`enemy-head-mat-${enemy.id}`, '#d7b69d', '#654c40');
  const gunMat = makeMaterial(`enemy-gun-mat-${enemy.id}`, '#85969d', '#47555b');
  const revealMat = makeRevealMaterial(`enemy-reveal-mat-${enemy.id}`);
  const flashMat = new BABYLON.StandardMaterial(`enemy-flash-mat-${enemy.id}`, scene);
  flashMat.diffuseColor = BABYLON.Color3.FromHexString('#ffd98a');
  flashMat.emissiveColor = BABYLON.Color3.FromHexString('#ffe490');
  flashMat.alpha = 0;
  flashMat.backFaceCulling = false;
  flashMat.disableLighting = true;

  const body = BABYLON.MeshBuilder.CreateCapsule(`enemy-body-${enemy.id}`, {
    radius: 0.42,
    height: enemy.type === 'bruiser' ? 1.7 : 1.5,
    tessellation: 10,
  }, scene);
  body.parent = root;
  body.position.y = enemy.type === 'bruiser' ? 1.15 : 1.02;
  body.material = bodyMat;

  const chestRig = BABYLON.MeshBuilder.CreateBox(`enemy-rig-${enemy.id}`, {
    width: enemy.type === 'bruiser' ? 0.92 : 0.8,
    height: enemy.type === 'bruiser' ? 0.78 : 0.68,
    depth: 0.42,
  }, scene);
  chestRig.parent = root;
  chestRig.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 1.36 : 1.22, 0.14);
  chestRig.material = armorMat;

  const head = BABYLON.MeshBuilder.CreateSphere(`enemy-head-${enemy.id}`, { diameter: 0.54, segments: 12 }, scene);
  head.parent = root;
  head.position.y = enemy.type === 'bruiser' ? 2.12 : 1.94;
  head.material = headMat;

  const helmet = BABYLON.MeshBuilder.CreateSphere(`enemy-helmet-${enemy.id}`, { diameter: 0.62, segments: 10 }, scene);
  helmet.parent = root;
  helmet.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 2.2 : 2.0, 0);
  helmet.scaling.y = 0.7;
  helmet.material = armorMat;

  const visor = BABYLON.MeshBuilder.CreateBox(`enemy-visor-${enemy.id}`, {
    width: 0.34,
    height: 0.1,
    depth: 0.18,
  }, scene);
  visor.parent = root;
  visor.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 2.13 : 1.94, 0.23);
  visor.material = makeMaterial(`enemy-visor-mat-${enemy.id}`, '#9ee6f8', '#cfffff');

  const backpack = BABYLON.MeshBuilder.CreateBox(`enemy-pack-${enemy.id}`, {
    width: enemy.type === 'bruiser' ? 0.74 : 0.62,
    height: enemy.type === 'bruiser' ? 0.82 : 0.7,
    depth: 0.34,
  }, scene);
  backpack.parent = root;
  backpack.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 1.3 : 1.18, -0.34);
  backpack.material = gearMat;

  const leftArm = BABYLON.MeshBuilder.CreateCylinder(`enemy-arm-l-${enemy.id}`, {
    height: enemy.type === 'bruiser' ? 0.94 : 0.86,
    diameter: 0.18,
    tessellation: 8,
  }, scene);
  leftArm.parent = root;
  leftArm.position = new BABYLON.Vector3(-(enemy.type === 'bruiser' ? 0.56 : 0.48), enemy.type === 'bruiser' ? 1.34 : 1.18, 0.02);
  leftArm.rotation.z = Math.PI * 0.08;
  leftArm.material = gearMat;

  const rightArm = BABYLON.MeshBuilder.CreateCylinder(`enemy-arm-r-${enemy.id}`, {
    height: enemy.type === 'bruiser' ? 0.9 : 0.82,
    diameter: 0.18,
    tessellation: 8,
  }, scene);
  rightArm.parent = root;
  rightArm.position = new BABYLON.Vector3(enemy.type === 'bruiser' ? 0.48 : 0.42, enemy.type === 'bruiser' ? 1.28 : 1.12, 0.18);
  rightArm.rotation.z = -Math.PI * 0.3;
  rightArm.rotation.x = Math.PI * 0.2;
  rightArm.material = gearMat;

  const leftLeg = BABYLON.MeshBuilder.CreateCylinder(`enemy-leg-l-${enemy.id}`, {
    height: enemy.type === 'bruiser' ? 1.08 : 0.96,
    diameter: 0.2,
    tessellation: 8,
  }, scene);
  leftLeg.parent = root;
  leftLeg.position = new BABYLON.Vector3(-0.18, enemy.type === 'bruiser' ? 0.5 : 0.44, 0);
  leftLeg.material = gearMat;

  const rightLeg = BABYLON.MeshBuilder.CreateCylinder(`enemy-leg-r-${enemy.id}`, {
    height: enemy.type === 'bruiser' ? 1.08 : 0.96,
    diameter: 0.2,
    tessellation: 8,
  }, scene);
  rightLeg.parent = root;
  rightLeg.position = new BABYLON.Vector3(0.18, enemy.type === 'bruiser' ? 0.5 : 0.44, 0);
  rightLeg.material = gearMat;

  const gun = BABYLON.MeshBuilder.CreateBox(`enemy-gun-${enemy.id}`, { width: 0.12, height: 0.12, depth: 0.8 }, scene);
  gun.parent = root;
  gun.position = new BABYLON.Vector3(0.18, enemy.type === 'bruiser' ? 1.36 : 1.22, 0.54);
  gun.material = gunMat;

  const revealBody = configureRevealGhostMesh(BABYLON.MeshBuilder.CreateCapsule(`enemy-reveal-body-${enemy.id}`, {
    radius: 0.5,
    height: enemy.type === 'bruiser' ? 1.84 : 1.64,
    tessellation: 10,
  }, scene));
  revealBody.parent = root;
  revealBody.position.copyFrom(body.position);
  revealBody.material = revealMat;

  const revealRig = configureRevealGhostMesh(BABYLON.MeshBuilder.CreateBox(`enemy-reveal-rig-${enemy.id}`, {
    width: enemy.type === 'bruiser' ? 1.1 : 0.96,
    height: enemy.type === 'bruiser' ? 0.94 : 0.82,
    depth: 0.58,
  }, scene));
  revealRig.parent = root;
  revealRig.position.copyFrom(chestRig.position);
  revealRig.material = revealMat;

  const revealHead = configureRevealGhostMesh(BABYLON.MeshBuilder.CreateSphere(`enemy-reveal-head-${enemy.id}`, {
    diameter: 0.74,
    segments: 12,
  }, scene));
  revealHead.parent = root;
  revealHead.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 2.12 : 1.94, 0.03);
  revealHead.material = revealMat;

  const revealGun = configureRevealGhostMesh(BABYLON.MeshBuilder.CreateBox(`enemy-reveal-gun-${enemy.id}`, {
    width: 0.18,
    height: 0.18,
    depth: 0.96,
  }, scene));
  revealGun.parent = root;
  revealGun.position.copyFrom(gun.position);
  revealGun.material = revealMat;

  const revealBeacon = configureRevealGhostMesh(BABYLON.MeshBuilder.CreatePlane(`enemy-reveal-beacon-${enemy.id}`, {
    width: 0.54,
    height: 1.3,
  }, scene));
  revealBeacon.parent = root;
  revealBeacon.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 2.4 : 2.2, 0);
  revealBeacon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  revealBeacon.material = revealMat;

  const classLabelTexture = new BABYLON.DynamicTexture(`enemy-class-label-tex-${enemy.id}`, { width: 512, height: 128 }, scene, true);
  classLabelTexture.hasAlpha = true;
  drawEnemyClassLabel(classLabelTexture, getEnemyTypeLabel(enemy.type));

  const classLabelMaterial = new BABYLON.StandardMaterial(`enemy-class-label-mat-${enemy.id}`, scene);
  classLabelMaterial.diffuseTexture = classLabelTexture;
  classLabelMaterial.opacityTexture = classLabelTexture;
  classLabelMaterial.useAlphaFromDiffuseTexture = true;
  classLabelMaterial.specularColor = BABYLON.Color3.Black();
  classLabelMaterial.emissiveColor = BABYLON.Color3.FromHexString('#dffaff');
  classLabelMaterial.disableLighting = true;
  classLabelMaterial.backFaceCulling = false;
  classLabelMaterial.alpha = 0;
  classLabelMaterial.disableDepthWrite = true;
  classLabelMaterial.depthFunction = BABYLON.ALWAYS ?? 519;

  const classLabel = configureRevealGhostMesh(BABYLON.MeshBuilder.CreatePlane(`enemy-class-label-${enemy.id}`, {
    width: enemy.type === 'bruiser' ? 3.05 : 2.7,
    height: 0.66,
  }, scene));
  classLabel.parent = root;
  classLabel.position = new BABYLON.Vector3(0, enemy.type === 'bruiser' ? 2.92 : 2.64, 0);
  classLabel.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  classLabel.material = classLabelMaterial;

  const flash = BABYLON.MeshBuilder.CreatePlane(`enemy-flash-${enemy.id}`, { size: 0.5 }, scene);
  flash.parent = root;
  flash.position = new BABYLON.Vector3(0.18, enemy.type === 'bruiser' ? 1.36 : 1.22, 1.0);
  flash.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  flash.material = flashMat;

  const hitbox = BABYLON.MeshBuilder.CreateCapsule(`enemy-hitbox-${enemy.id}`, {
    radius: enemy.radius,
    height: enemy.type === 'bruiser' ? 2.3 : 2.0,
    tessellation: 8,
  }, scene);
  hitbox.parent = root;
  hitbox.position.y = enemy.type === 'bruiser' ? 1.15 : 1.0;
  hitbox.isVisible = false;
  hitbox.isPickable = true;
  hitbox.metadata = {
    raycastTarget: 'enemy',
    enemyId: enemy.id,
  };

  return {
    root,
    body,
    chestRig,
    head,
    helmet,
    visor,
    backpack,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    gun,
    flash,
    hitbox,
    classLabel,
    classLabelMaterial,
    classLabelTexture,
    classLabelText: getEnemyTypeLabel(enemy.type),
    overlayMeshes: [body, chestRig, head, helmet, visor, backpack, leftArm, rightArm, leftLeg, rightLeg, gun],
    emissiveMeshes: [body, chestRig, helmet, visor, backpack],
    revealMaterial: revealMat,
    revealMeshes: [revealBody, revealRig, revealHead, revealGun, revealBeacon, classLabel],
  };
}

function enemyColorForType(type) {
  if (type === 'hunter') {
    return '#7ea982';
  }
  if (type === 'bruiser') {
    return '#b48f6e';
  }
  return '#afbcc0';
}

function loop(timestamp) {
  const now = Number.isFinite(timestamp) ? timestamp : performance.now();
  const rawDt = (now - lastFrame) / 1000;
  const dt = Math.min(0.033, Math.max(0, Number.isFinite(rawDt) ? rawDt : 0));
  lastFrame = now;

  update(dt);
  scene.render();
}

function update(dt) {
  state.baseCameraAngle += dt * 0.12;
  if (viewModel) {
    viewModel.flashTimer = Math.max(0, viewModel.flashTimer - dt * 14);
    viewModel.smokeTimer = Math.max(0, viewModel.smokeTimer - dt * 1.7);
    viewModel.recoil = Math.max(0, viewModel.recoil - dt * 7.2);
    viewModel.muzzleFlash.material.alpha = viewModel.flashTimer > 0 ? 0.16 + viewModel.flashTimer * 0.92 : 0;
    viewModel.muzzleFlash.scaling.x = 0.8 + viewModel.flashTimer * 1.25;
    viewModel.muzzleFlash.scaling.y = 0.48 + viewModel.flashTimer * 0.72;
    viewModel.muzzleFlash.rotation.z += dt * 20;
    viewModel.muzzleCore.material.alpha = viewModel.flashTimer > 0 ? 0.3 + viewModel.flashTimer * 0.95 : 0;
    viewModel.muzzleCore.scaling.setAll(0.82 + viewModel.flashTimer * 0.55);
    viewModel.muzzleSmoke.material.alpha = viewModel.smokeTimer > 0 ? 0.05 + viewModel.smokeTimer * 0.14 : 0;
    viewModel.muzzleSmoke.position.z = 1.16 + (1 - viewModel.smokeTimer) * 0.18;
    viewModel.muzzleSmoke.scaling.setAll(0.45 + (1 - viewModel.smokeTimer) * 0.78);
  }

  if (state.mode === 'raid' && state.raid) {
    updateRaid(dt);
  } else {
    updateBaseCamera(dt);
  }

  tickMusic();
  syncScreenEffects();
  drawMinimap();
  if (!refs.mapOverlay.classList.contains('hidden')) {
    drawFullMap();
  }
}

function updateBaseCamera() {
  if (viewModel) {
    viewModel.root.setEnabled(false);
  }
  camera.fov = lerp(camera.fov, 0.88, 0.08);
  camera.position = BABYLON.Vector3.Lerp(
    camera.position,
    new BABYLON.Vector3(Math.sin(state.baseCameraAngle) * 64, 36, Math.cos(state.baseCameraAngle) * 64),
    0.04,
  );
  camera.setTarget(BABYLON.Vector3.Lerp(camera.getTarget(), new BABYLON.Vector3(0, 5, 0), 0.05));
}

function updateRaid(dt) {
  const raid = state.raid;
  const player = raid.player;

  if (viewModel) {
    viewModel.root.setEnabled(true);
  }

  if (state.overlay) {
    syncPlayerCamera();
    animateRaidEntities(dt, true);
    syncHud();
    return;
  }

  raid.timeLeft = Math.max(0, raid.timeLeft - dt);
  if (raid.timeLeft <= 0) {
    finishRaid(false, 'Time expired. You were killed in the raid.', false);
    return;
  }

  const previousReload = player.reloadTimer;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.reloadTimer = Math.max(0, player.reloadTimer - dt);
  player.healTimer = Math.max(0, player.healTimer - dt);
  player.damageFlash = Math.max(0, player.damageFlash - dt * 2.4);
  player.recoilKick = Math.max(0, (player.recoilKick ?? 0) - dt * 6.6);
  player.damageJolt = Math.max(0, (player.damageJolt ?? 0) - dt * 4.4);
  player.nearHitPulse = Math.max(0, (player.nearHitPulse ?? 0) - dt * 3.4);
  raid.hitConfirmTimer = Math.max(0, (raid.hitConfirmTimer ?? 0) - dt * 4.8);

  if (previousReload > 0 && player.reloadTimer === 0) {
    completeReload();
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateEffects(dt);
  animateRaidEntities(dt, false);
  syncPlayerCamera();
  syncHud();

  refs.timeValue.style.color = raid.timeLeft < 45 ? '#f0c57d' : '';
}

function updatePlayer(dt) {
  const raid = state.raid;
  const player = raid.player;
  const forward = {
    x: Math.sin(player.yaw),
    z: Math.cos(player.yaw),
  };
  const right = {
    x: Math.cos(player.yaw),
    z: -Math.sin(player.yaw),
  };

  let moveX = 0;
  let moveZ = 0;
  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
    moveX -= right.x;
    moveZ -= right.z;
  }
  if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
    moveX += right.x;
    moveZ += right.z;
  }

  const movement = normalize2D(moveX, moveZ);
  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const speed = sprinting ? 9.2 : 5.8;

  moveEntityWithCollision(player, movement.x * speed * dt, movement.z * speed * dt, player.radius);
  player.velocityBob += magnitude(movement.x, movement.z) * (sprinting ? 18 : 11) * dt;

  if (state.input.mouseDown) {
    attemptShoot();
  }

  const interaction = getCurrentInteraction();
  if (interaction?.type === 'extract' && state.input.interactHeld) {
    if (!raid.tasksComplete) {
      player.extractionProgress = 0;
      raid.interactionText = `Finish tasks first: ${getRaidObjectiveStatus(raid)}`;
    } else {
      player.extractionZoneId = interaction.zone.id;
      player.extractionProgress += dt;
      raid.interactionText = `Extracting at ${interaction.zone.name} ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`;
      if (player.extractionProgress >= EXTRACTION_HOLD_TIME) {
        finishRaid(true, `Extracted from ${interaction.zone.name}.`, true);
        return;
      }
    }
  } else {
    player.extractionProgress = Math.max(0, player.extractionProgress - dt * 2.6);
    player.extractionZoneId = null;
  }

  if (interaction?.type === 'container') {
    raid.interactionText = `Press E to search ${interaction.container.name}`;
  } else if (interaction?.type === 'extract') {
    raid.interactionText = raid.tasksComplete
      ? `Hold E to extract from ${interaction.zone.name}`
      : `Finish tasks first: ${getRaidObjectiveStatus(raid)}`;
  } else {
    raid.interactionText = raid.tasksComplete
      ? 'Search for loot or head to an extraction point.'
      : `Complete tasks: ${getRaidObjectiveStatus(raid)}`;
  }

  if (player.health <= 0) {
    finishRaid(false, 'You were killed in the raid. Current loot was lost.', false);
  }
}

function attemptShoot() {
  const raid = state.raid;
  const player = raid.player;
  const weapon = getWeaponStats(player.weapon);
  if (player.fireCooldown > 0 || player.reloadTimer > 0 || player.healTimer > 0) {
    return;
  }
  if (player.ammoInMag <= 0) {
    if (player.reserveAmmo > 0) {
      reloadWeapon();
    } else {
      notify('?????', 'danger');
    }
    return;
  }

  player.fireCooldown = 1 / weapon.fireRate;
  player.ammoInMag -= 1;
  if (viewModel) {
    viewModel.flashTimer = 0.7;
  }

  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const baseSpread = sprinting ? weapon.spread * 1.8 : weapon.spread;
  const pelletCount = weapon.pellets ?? 1;
  const origin = new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z);
  let tracerEnd = null;

  for (let pellet = 0; pellet < pelletCount; pellet += 1) {
    const spread = pelletCount > 1 ? baseSpread : baseSpread * 0.8;
    const yaw = player.yaw + randomBetween(-spread, spread);
    const pitch = player.pitch + randomBetween(-spread * 0.65, spread * 0.65);
    const direction = new BABYLON.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(-pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    const ray = new BABYLON.Ray(origin, direction, weapon.range);
    const pick = scene.pickWithRay(ray, (mesh) => Boolean(mesh?.metadata?.raycastTarget));
    let end = origin.add(direction.scale(weapon.range * 0.7));

    if (pick?.hit && pick.pickedPoint) {
      end = pick.pickedPoint;
      if (pick.pickedMesh?.metadata?.raycastTarget === 'enemy') {
        const enemy = raid.enemies.find((entry) => entry.id === pick.pickedMesh.metadata.enemyId);
        if (enemy && !enemy.dead) {
          damageEnemy(enemy, getWeaponDamage(player.weapon));
        }
      } else {
        spawnPulse(end, '#8ad8ff', 0.2, 0.14);
      }
    }

    tracerEnd ??= end;
  }

  spawnTracer(origin, tracerEnd ?? origin, weapon.tracer, 0.08);
}

function completeReload() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  const needed = player.magSize - player.ammoInMag;
  const loaded = Math.min(needed, player.reserveAmmo);
  player.ammoInMag += loaded;
  player.reserveAmmo -= loaded;
  notify('?????', 'success');
}

function reloadWeapon() {
  const player = state.raid?.player;
  if (!player || player.reloadTimer > 0 || player.ammoInMag >= player.magSize || player.reserveAmmo <= 0) {
    return;
  }
  player.reloadTimer = getWeaponStats(player.weapon).reload;
  state.raid.statusText = '???';
}

function useMedkit() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  if (player.medkits <= 0) {
    notify('æ²¡æå»çåã', 'warning');
    return;
  }
  if (player.health >= player.maxHealth || player.healTimer > 0) {
    return;
  }
  player.medkits -= 1;
  player.health = Math.min(player.maxHealth, player.health + PLAYER_HEAL_AMOUNT);
  player.healTimer = PLAYER_HEAL_COOLDOWN;
  player.damageFlash = 0;
  notify('å·²ä½¿ç¨å»çåã', 'success');
}

function damageEnemy(enemy, damage, options = {}) {
  const effectiveDamage = Math.max(1, Math.round(damage * (1 - (enemy.damageReduction ?? 0))));
  enemy.health -= effectiveDamage;
  enemy.alertTimer = 5;
  if (enemy.health > 0) {
    alertEnemyToPlayer(enemy, state.raid?.player, { alertTimer: 5.2, investigateTimer: 6 });
    broadcastEnemyAlert(enemy, state.raid, state.raid?.player);
  }
  enemy.damageFlash = 0.55;
  state.raid.hitConfirmTimer = enemy.health <= 0 ? 0.34 : 0.2;
  spawnImpactBurst(new BABYLON.Vector3(enemy.x, 1.36, enemy.z), '#ffb29a', enemy.health <= 0 ? 1.2 : 0.95, 'flesh');
  playImpactAudio(new BABYLON.Vector3(enemy.x, 1.36, enemy.z), 'flesh');
  playHitConfirmAudio(enemy.health <= 0);
  if (enemy.health <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  persistSave();
  notify(`Target down: ${enemy.name}.`, 'success');

  if (Math.random() < 0.35) {
    const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
    const dropped = createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight));
    const container = {
      id: `drop-${enemy.id}`,
      name: 'Battlefield Drop',
      x: enemy.x + randomBetween(-0.6, 0.6),
      z: enemy.z + randomBetween(-0.6, 0.6),
      pool: 'valuable',
      tier: 2,
      opened: false,
      items: [dropped],
      visual: createContainerVisual({ id: `drop-${enemy.id}`, name: 'Battlefield Drop', x: enemy.x, z: enemy.z, pool: 'valuable' }),
      highlight: 0,
    };
    container.visual.root.position.x = container.x;
    container.visual.root.position.z = container.z;
    state.raid.containers.push(container);
  }
}

function applyDamageToPlayer(amount) {
  if (state.mode === 'result') {
    return;
  }
  const player = state.raid?.player;
  if (!player) {
    return;
  }

  let remaining = amount;
  let blocked = 0;
  if (player.armor > 0) {
    blocked = Math.min(player.armor, Math.round(amount * 0.65));
    player.armor -= blocked;
    remaining -= Math.round(blocked * 0.7);
  }
  player.health = Math.max(0, player.health - Math.max(1, remaining));
  player.damageFlash = Math.max(player.damageFlash ?? 0, 0.78);
  player.damageJolt = 1;
  player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, 0.8);
  spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#ff7e68', 0.08, 0.08);
  playDamageAudio(Math.max(1, remaining), blocked);
  notify(`åå° ${Math.max(1, remaining)} ç¹ä¼¤å®³ã`, 'danger');
}

function updateEnemies(dt) {
  const raid = state.raid;
  const player = raid.player;

  for (const enemy of raid.enemies) {
    enemy.damageFlash = Math.max(0, enemy.damageFlash - dt * 2.4);
    enemy.muzzleTimer = Math.max(0, enemy.muzzleTimer - dt * 10);

    if (enemy.dead) {
      enemy.corpseTimer = Math.max(0, enemy.corpseTimer - dt);
      if (enemy.visual) {
        enemy.visual.root.position.y = lerp(enemy.visual.root.position.y, -0.65, 0.08);
        enemy.visual.root.rotation.x = lerp(enemy.visual.root.rotation.x, Math.PI / 2, 0.08);
      }
      continue;
    }

    const distanceToPlayer = distance2D(enemy.x, enemy.z, player.x, player.z);
    const hasLineOfSight =
      distanceToPlayer < enemy.detectRange + 8 &&
      !lineOfSightBlocked(enemy.x, enemy.z, player.x, player.z);

    if (hasLineOfSight && distanceToPlayer < enemy.detectRange) {
      enemy.alertTimer = 4.5;
    } else {
      enemy.alertTimer = Math.max(0, enemy.alertTimer - dt);
    }

    let targetX = enemy.x;
    let targetZ = enemy.z;
    let moving = false;

    if (enemy.alertTimer > 0) {
      enemy.heading = lerpAngle(enemy.heading, Math.atan2(player.x - enemy.x, player.z - enemy.z), 0.12);
      if (distanceToPlayer > enemy.preferredRange || !hasLineOfSight) {
        targetX = player.x;
        targetZ = player.z;
        moving = true;
      }
      enemy.shootCooldown -= dt;
      if (hasLineOfSight && distanceToPlayer <= enemy.preferredRange + 4 && enemy.shootCooldown <= 0) {
        enemyShoot(enemy);
        enemy.shootCooldown = enemy.fireInterval + randomBetween(-0.15, 0.15);
      }
    } else {
      const patrolTarget = enemy.route[enemy.routeIndex];
      if (distance2D(enemy.x, enemy.z, patrolTarget.x, patrolTarget.z) < 1.2) {
        enemy.routeIndex = (enemy.routeIndex + 1) % enemy.route.length;
      }
      const activeTarget = enemy.route[enemy.routeIndex];
      targetX = activeTarget.x;
      targetZ = activeTarget.z;
      moving = true;
      enemy.heading = lerpAngle(enemy.heading, Math.atan2(targetX - enemy.x, targetZ - enemy.z), 0.08);
    }

    if (moving) {
      const direction = normalize2D(targetX - enemy.x, targetZ - enemy.z);
      moveEntityWithCollision(enemy, direction.x * enemy.speed * dt, direction.z * enemy.speed * dt, enemy.radius);
    }
  }
}

function enemyShoot(enemy, options = {}) {
  const raid = state.raid;
  const player = raid.player;
  const shotCount = Math.max(1, enemy.shotBurst ?? 1);
  enemy.muzzleTimer = 0.7;
  playGunshotAudio(
    { caliber: enemy.type === 'bruiser' ? '7.62' : '5.56', pellets: 1 },
    { world: { x: enemy.x, z: enemy.z }, gain: enemy.type === 'bruiser' ? 0.78 : 0.64 },
  );

  const enemyAimPoint = getEnemyAimPoint(enemy);
  const origin = new BABYLON.Vector3(enemy.x, Math.max(0.56, enemyAimPoint.y - 0.26), enemy.z);
  const distanceToPlayer = distance2D(enemy.x, enemy.z, player.x, player.z);
  const accuracyMult = options.accuracyMult ?? 1;
  const damageMult = options.damageMult ?? 1;
  const missSpread = options.missSpread ?? 1.8;
  const minHitChance = options.minHitChance ?? 0.34;
  const maxHitChance = options.maxHitChance ?? 0.92;

  for (let shotIndex = 0; shotIndex < shotCount; shotIndex += 1) {
    const rawHitChance = 0.82 - distanceToPlayer * 0.018 + (enemy.accuracyBonus ?? 0) - shotIndex * 0.08;
    const hitChance = clamp(rawHitChance * accuracyMult, minHitChance, maxHitChance);
    const hit = Math.random() < hitChance;
    const playerAimPoint = getPlayerAimPoint(player);
    const target = hit
      ? playerAimPoint
      : new BABYLON.Vector3(
          player.x + randomBetween(-missSpread, missSpread),
          getPlayerViewHeight(player) + randomBetween(-0.5, 0.6),
          player.z + randomBetween(-missSpread, missSpread),
        );

    spawnTracer(origin, target, enemy.type === 'hunter' ? '#c0ff9c' : '#ffb88c', 0.12);
    if (hit) {
      spawnImpactBurst(target, '#ff8c72', shotIndex === 0 ? 0.9 : 0.72, 'flesh');
      applyDamageToPlayer(Math.max(1, Math.round(enemy.damage * damageMult * (shotIndex === 0 ? 1 : 0.6))));
      if ((enemy.armorShred ?? 0) > 0 && player.armor > 0) {
        player.armor = Math.max(0, player.armor - Math.max(1, Math.round(enemy.damage * enemy.armorShred)));
      }
      if ((enemy.suppressionPulse ?? 0) > 0) {
        player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, enemy.suppressionPulse);
      }
    } else {
      spawnImpactBurst(target, '#ffc9a6', 0.65, 'hard');
      playImpactAudio(target, 'hard');
      if (distance2D(target.x, target.z, player.x, player.z) < 1.8) {
        player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, 0.42);
      }
    }
  }
}

function updateEffects(dt) {
  const effects = state.raid?.effects ?? [];
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.life -= dt;
    if (effect.line) {
      effect.line.alpha = Math.max(0, effect.life / effect.maxLife);
    }
    if (effect.mesh) {
      const alpha = Math.max(0, effect.life / effect.maxLife);
      effect.mesh.material.alpha = alpha * effect.alphaScale;
      effect.mesh.scaling.setAll(effect.baseScale + (1 - alpha) * effect.scaleGrow);
      if (effect.velocity) {
        effect.mesh.position.addInPlace(effect.velocity.scale(dt));
      }
      if (effect.spin) {
        effect.mesh.rotation.z += effect.spin * dt;
      }
    }
    if (effect.life <= 0) {
      disposeVisual(effect.line ?? effect.mesh);
      effects.splice(i, 1);
    }
  }
}

function animateRaidEntities(dt) {
  const raid = state.raid;
  if (!raid) {
    return;
  }

  for (const container of raid.containers) {
    if (!container.visual) {
      continue;
    }
    const isCurrent = state.ui.currentContainerId === container.id;
    container.highlight = lerp(container.highlight, isCurrent ? 1 : 0, 0.12);
    container.visual.root.rotation.y += dt * 0.45;
    container.visual.beacon.scaling.y = 0.9 + Math.sin(performance.now() * 0.003 + container.x * 0.2) * 0.08;
    container.visual.beacon.material.alpha = container.opened ? 0.08 : 0.28 + container.highlight * 0.18;
    container.visual.base.material.emissiveColor = BABYLON.Color3.FromHexString(container.opened ? '#223033' : '#38565e').scale(0.18 + container.highlight * 0.16);
    container.visual.lid.rotation.x = container.opened ? -0.9 : 0;
  }

  for (const zone of raid.extractions) {
    if (!zone.visual) {
      continue;
    }
    zone.pulse += dt * (zone.active ? 2.8 : 1.2);
    zone.visual.ring.rotation.z += dt * 0.6;
    zone.visual.pillar.scaling.y = zone.active ? 0.9 + Math.sin(zone.pulse) * 0.18 : 0.6;
    zone.visual.pillar.material.alpha = zone.active ? 0.14 + Math.sin(zone.pulse) * 0.08 : 0.04;
  }

  for (const enemy of raid.enemies) {
    if (!enemy.visual) {
      continue;
    }
    enemy.visual.root.position.x = enemy.x;
    enemy.visual.root.position.z = enemy.z;
    enemy.visual.root.rotation.y = enemy.heading;
    enemy.visual.root.position.y = enemy.dead ? enemy.visual.root.position.y : Math.sin(performance.now() * 0.005 + enemy.x) * 0.04;
    enemy.visual.body.material.emissiveColor = BABYLON.Color3.FromHexString(enemyColorForType(enemy.type)).scale(enemy.damageFlash > 0 ? 0.38 : 0.1);
    enemy.visual.flash.material.alpha = enemy.muzzleTimer > 0 ? 0.28 + enemy.muzzleTimer * 0.4 : 0;
  }
}

function syncPlayerCamera() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }

  const now = performance.now() * 0.018;
  const recoilKick = player.recoilKick ?? 0;
  const damageJolt = player.damageJolt ?? 0;
  const nearHitPulse = player.nearHitPulse ?? 0;
  const shakeX = Math.sin(now * 1.8) * damageJolt * 0.06 + Math.sin(now * 1.35) * nearHitPulse * 0.018;
  const shakeY = Math.cos(now * 1.55) * damageJolt * 0.03;
  const shakeZ = Math.cos(now * 1.22) * damageJolt * 0.05;

  camera.position.x = player.x + shakeX;
  camera.position.y = PLAYER_HEIGHT + shakeY - recoilKick * 0.02;
  camera.position.z = player.z + shakeZ;
  camera.rotation.x = player.pitch + Math.sin(player.velocityBob) * 0.01 - recoilKick * 0.05 + Math.sin(now) * damageJolt * 0.012;
  camera.rotation.y = player.yaw + Math.sin(now * 0.72) * damageJolt * 0.02 + Math.sin(now * 0.44) * nearHitPulse * 0.012;
  camera.rotation.z = (player.damageFlash > 0 ? Math.sin(now * 1.6) * player.damageFlash * 0.04 : 0) + nearHitPulse * 0.012;
  camera.fov = lerp(camera.fov, 0.88 + nearHitPulse * 0.015 - recoilKick * 0.012, 0.22);

  if (viewModel) {
    viewModel.root.position.x = 0.32 + Math.sin(player.velocityBob * 0.5) * 0.02 - recoilKick * 0.04;
    viewModel.root.position.y = -0.34 + Math.abs(Math.cos(player.velocityBob)) * 0.02 - recoilKick * 0.05;
    viewModel.root.position.z = 0.85 - recoilKick * 0.16;
    viewModel.root.rotation.x = recoilKick * 0.08;
    viewModel.root.rotation.y = -recoilKick * 0.06;
    viewModel.root.rotation.z = -player.damageFlash * 0.08 + recoilKick * 0.03;
  }
}

function syncHud() {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const player = raid.player;
  refs.healthValue.textContent = `${Math.round(player.health)} / ${player.maxHealth}`;
  refs.weaponValue.textContent = getWeaponStats(player.weapon).name;
  refs.armorValue.textContent = `${Math.round(player.armor)} / ${player.maxArmor}`;
  refs.ammoValue.textContent = `${player.ammoInMag} / ${player.reserveAmmo}`;
  refs.medkitValue.textContent = String(player.medkits);
  refs.bagValue.textContent = `${raid.bag.length} / ${getBagSlots()}`;
  refs.weightValue.textContent = `${formatWeight(raid.bagWeight)} / ${formatWeight(getBagCapacity())}`;
  refs.haulValue.textContent = formatMoney(raid.bagValue);
  refs.timeValue.textContent = formatTime(raid.timeLeft);
  refs.hud.dataset.playerX = player.x.toFixed(2);
  refs.hud.dataset.playerZ = player.z.toFixed(2);
  refs.hud.dataset.playerYaw = player.yaw.toFixed(2);
  refs.hud.dataset.tasksComplete = String(raid.tasksComplete);

  const activeExtractions = raid.extractions.filter((zone) => zone.active);
  refs.extractList.textContent = raid.tasksComplete
    ? activeExtractions.map((zone) => zone.name).join(' / ')
    : `Tasks: ${getRaidObjectiveStatus(raid)}`;

  let status = raid.tasksComplete
    ? (state.pointerLocked ? 'View locked.' : 'Move the mouse to look around.')
    : `WASD / Arrow keys move | Tasks: ${getRaidObjectiveStatus(raid)}`;
  if (player.reloadTimer > 0) {
    status = `Reloading ${player.reloadTimer.toFixed(1)}s`;
  } else if (player.healTimer > 0) {
    status = `Healing ${player.healTimer.toFixed(1)}s`;
  } else if (player.extractionProgress > 0) {
    status = `Extract progress ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`;
  } else if (state.input.lookDragging) {
    status = raid.tasksComplete ? 'Dragging view.' : `Tasks: ${getRaidObjectiveStatus(raid)}`;
  }

  refs.raidStatus.textContent = status;
  refs.interactionPrompt.textContent = raid.interactionText;
  refs.healthValue.style.color = player.health < 35 ? '#f1c073' : '';
  refs.armorValue.style.color = player.armor < 15 ? '#d98c7f' : '';

  if (!refs.mapOverlay.classList.contains('hidden')) {
    renderBagList();
    renderBagGrid();
    renderMapExtractionList();
  }
}

function getCurrentInteraction() {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player) {
    return null;
  }

  let nearestContainer = null;
  let nearestContainerDistance = Infinity;
  for (const container of raid.containers) {
    if (container.opened && container.items.length === 0) {
      continue;
    }
    const dist = distance2D(player.x, player.z, container.x, container.z);
    if (dist < 2.4 && dist < nearestContainerDistance) {
      nearestContainer = container;
      nearestContainerDistance = dist;
    }
  }
  if (nearestContainer) {
    return { type: 'container', container: nearestContainer };
  }

  let nearestSwitch = null;
  let nearestSwitchDistance = Infinity;
  for (const point of raid.switchPoints ?? []) {
    if (!point.active || point.used) {
      continue;
    }
    const dist = distance2D(player.x, player.z, point.x, point.z);
    if (dist < point.radius + 1.2 && dist < nearestSwitchDistance) {
      nearestSwitch = point;
      nearestSwitchDistance = dist;
    }
  }
  if (nearestSwitch) {
    return { type: 'switch', point: nearestSwitch };
  }

  let nearestZone = null;
  let nearestZoneDistance = Infinity;
  for (const zone of raid.extractions) {
    if (!zone.active) {
      continue;
    }
    const dist = distance2D(player.x, player.z, zone.x, zone.z);
    if (dist < zone.radius + 0.9 && dist < nearestZoneDistance) {
      nearestZone = zone;
      nearestZoneDistance = dist;
    }
  }
  if (nearestZone) {
    return { type: 'extract', zone: nearestZone };
  }

  return null;
}

function openLootPanel(container) {
  if (!container) {
    return;
  }
  if (!container.opened) {
    container.opened = true;
    if (!container.id.startsWith('drop-')) {
      advanceRaidObjective('search', 1);
    }
  }
  state.overlay = 'loot';
  state.ui.currentContainerId = container.id;
  refs.lootPanel.classList.remove('hidden');
  refs.lootTitle.textContent = container.name;
  renderLootPanel(container);
  releasePointerLock();
}

function closeLootPanel() {
  refs.lootPanel.classList.add('hidden');
  if (state.overlay === 'loot') {
    state.overlay = null;
  }
  state.ui.currentContainerId = null;
}

function renderLootPanel(container) {
  const bagSpace = `${state.raid.bag.length}/${getBagSlots()} æ ¼`;
  refs.lootMeta.textContent = `åå®¹ç© ${container.items.length} ä»¶ Â· å½åèå ${bagSpace} Â· éé ${formatWeight(state.raid.bagWeight)} / ${formatWeight(getBagCapacity())}`;
  refs.lootItems.innerHTML = container.items.length
    ? container.items
        .map(
          (item) => `
            <article class="loot-item">
              <div>
                <div class="item-title rarity-${item.rarity}">${item.name}</div>
                <div class="item-meta">${item.category} Â· ${formatWeight(item.weight)} Â· ${formatMoney(item.value)}</div>
              </div>
              <button class="ghost-button small" type="button" data-take-id="${item.uid}">
                æ¿èµ°
              </button>
            </article>
          `,
        )
        .join('')
    : '<div class="item-meta">è¿ä¸ªå®¹å¨å·²ç»ç©ºäºã</div>';
}

function takeLoot(containerId, itemId) {
  const container = state.raid?.containers.find((entry) => entry.id === containerId);
  if (!container) {
    return;
  }
  const index = container.items.findIndex((item) => item.uid === itemId);
  if (index === -1) {
    return;
  }
  const item = container.items[index];
  if (!canCarry(item)) {
    notify('èåç©ºé´æééä¸è¶³ã', 'warning');
    return;
  }
  container.items.splice(index, 1);
  container.opened = true;
  state.raid.bag.push(item);
  state.raid.bagValue += item.value;
  state.raid.bagWeight += item.weight;
  renderLootPanel(container);
  syncHud();
  notify(`å·²æ¿å ${item.name}ã`, 'success');
}

function takeAllCurrentContainer() {
  const container = state.raid?.containers.find((entry) => entry.id === state.ui.currentContainerId);
  if (!container || !container.items.length) {
    return;
  }
  const items = [...container.items];
  for (const item of items) {
    if (canCarry(item)) {
      takeLoot(container.id, item.uid);
    }
  }
  renderLootPanel(container);
}

function canCarry(item) {
  const raid = state.raid;
  if (!raid) {
    return false;
  }
  return raid.bag.length < getBagSlots() && raid.bagWeight + item.weight <= getBagCapacity();
}

function openMapOverlay() {
  if (!state.raid) {
    return;
  }
  state.overlay = 'map';
  refs.mapOverlay.classList.remove('hidden');
  renderBagList();
  renderBagGrid();
  renderMapExtractionList();
  drawFullMap();
  releasePointerLock();
}

function closeMapOverlay() {
  refs.mapOverlay.classList.add('hidden');
  if (state.overlay === 'map') {
    state.overlay = null;
  }
}

function renderBagList() {
  const bag = state.raid?.bag ?? [];
  refs.bagList.innerHTML = bag.length
    ? bag
        .slice()
        .sort((a, b) => b.value - a.value)
        .map(
          (item) => `
            <article class="stash-row">
              <div>
                <div class="item-title rarity-${item.rarity}">${item.name}</div>
                <div class="item-meta">${item.category} ? ${formatWeight(item.weight)} ? ${formatMoney(item.value)}</div>
              </div>
            </article>
          `,
        )
        .join('')
    : '<div class="item-meta">???????</div>';
}

function renderBagGrid() {
  const bag = state.raid?.bag ?? [];
  const totalSlots = getBagSlots();
  refs.bagGrid.innerHTML = Array.from({ length: totalSlots }, (_, index) => {
    const item = bag[index];
    if (!item) {
      return `
        <article class="bag-slot empty">
          <strong>???</strong>
          <span>???</span>
        </article>
      `;
    }
    return `
      <article class="bag-slot">
        <strong class="rarity-${item.rarity}">${item.name}</strong>
        <span>${item.category} ? ${formatWeight(item.weight)}</span>
      </article>
    `;
  }).join('');
}

function renderMapExtractionList() {
  const zones = state.raid?.extractions ?? [];
  refs.mapExtractList.innerHTML = zones
    .map((zone) => {
      const distance = state.raid ? distance2D(zone.x, zone.z, state.raid.player.x, state.raid.player.z) : 0;
      const status = !zone.active
        ? 'Unavailable'
        : state.raid?.tasksComplete
          ? 'Ready'
          : 'Locked by tasks';
      return `
        <article class="extract-row">
          <div>
            <div class="item-title ${zone.active && state.raid?.tasksComplete ? 'rarity-uncommon' : ''}">${zone.name}</div>
            <div class="item-meta">${status} | ${distance.toFixed(0)}m</div>
          </div>
        </article>
      `;
    })
    .join('');
}

function finishRaid(success, reason, extracted) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  releasePointerLock();
  closeLootPanel();
  closeMapOverlay();

  const survived = success && extracted;
  const haul = survived ? raid.bagValue : 0;
  const bagCount = survived ? raid.bag.length : 0;
  if (survived) {
    state.save.stash.push(...raid.bag);
    state.save.stats.survived += 1;
    state.save.stats.bestHaul = Math.max(state.save.stats.bestHaul, haul);
  } else {
    raid.bag = [];
    raid.bagValue = 0;
    raid.bagWeight = 0;
    resetRaidLoadout(raid.player);
    state.save.prep.medkitBonus = 0;
    state.save.prep.ammoBonus = 0;
    state.save.prep.armorBonus = 0;
  }
  persistSave();

  state.mode = 'result';
  refs.hud.classList.add('hidden');
  refs.resultTitle.textContent = survived ? 'Extraction Success' : 'Killed in Raid';
  refs.resultSummary.innerHTML = [
    resultItem('Result', reason),
    resultItem('Loot extracted', survived ? `${bagCount} items` : '0 items'),
    resultItem('Haul value', survived ? formatMoney(haul) : formatMoney(0)),
    resultItem('Enemies down', `${raid.killCount}`),
    resultItem('Time left', formatTime(raid.timeLeft)),
    resultItem('Stash total', `${state.save.stash.length} items`),
  ].join('');
  refs.resultOverlay.classList.remove('hidden');
  notify(
    survived ? 'Extraction complete. Loot returned to base.' : 'Raid failed. Current loot and temporary gear were reset.',
    survived ? 'success' : 'danger',
  );
}

function resultItem(label, value) {
  return `<div class="result-item"><span>${label}</span><strong>${value}</strong></div>`;
}

function returnToBase() {
  refs.resultOverlay.classList.add('hidden');
  clearRaid();
  setMode('base');
  renderBasePanel();
}

function requestPointerLock() {
  return;
}

function releasePointerLock() {
  if (document.pointerLockElement === refs.canvas) {
    document.exitPointerLock?.();
  }
}

function handlePointerLockChange() {
  state.pointerLocked = document.pointerLockElement === refs.canvas;
  if (state.mode === 'raid' && state.raid) {
    state.raid.statusText = state.pointerLocked ? '?????' : '???????????????';
    syncHud();
  }
}

function applyLookDelta(deltaX, deltaY) {
  if (state.mode !== 'raid' || !state.raid || state.overlay) {
    return;
  }
  const player = state.raid.player;
  player.yaw -= deltaX * 0.0036;
  player.pitch = clamp(player.pitch - deltaY * 0.0026, -1.16, 1.16);
}

function getReconVisibleEnemies(raid = state.raid) {
  const player = raid?.player;
  if (!raid || !player || player.operatorId !== 'recon' || (player.abilityActiveTimer ?? 0) <= 0) {
    return [];
  }
  return raid.enemies.filter((enemy) => !enemy.dead && (enemy.revealedTimer ?? 0) > 0.01);
}

function isPlayerSoundSuppressed(player = state.raid?.player) {
  if (!player) {
    return false;
  }
  return player.operatorId === 'recon' && (player.abilityActiveTimer ?? 0) > 0;
}

function getEnemyTypeLabel(type) {
  if (getLanguage() === 'zh') {
    if (type === 'hunter') {
      return '\u730e\u624b';
    }
    if (type === 'bruiser') {
      return '\u91cd\u88c5\u5175';
    }
    return '\u4fa6\u5bdf\u5175';
  }
  if (type === 'hunter') {
    return 'Hunter';
  }
  if (type === 'bruiser') {
    return 'Bruiser';
  }
  return 'Scout';
}

function getEnemyMapBadge(enemy) {
  if (!enemy) {
    return '';
  }
  return getLanguage() === 'zh'
    ? (enemy.type === 'scout' ? 'ä¾¦' : enemy.type === 'hunter' ? 'ç' : 'é')
    : (enemy.type === 'scout' ? 'S' : enemy.type === 'hunter' ? 'H' : 'B');
}

function drawMinimap() {
  const ctx = refs.minimapCanvas.getContext('2d');
  const size = refs.minimapCanvas.width;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(6, 11, 14, 0.92)';
  ctx.fillRect(0, 0, size, size);

  drawMapFrame(ctx, size);
  drawMapObstacles(ctx, size);

  if (state.raid) {
    drawMapSearchZones(ctx, size, state.raid.containers, 5);
    drawMapExtractions(ctx, size, state.raid.extractions, false, true);
    drawMapSwitchPoints(ctx, size, state.raid.switchPoints ?? [], false);
    drawMapEnemies(ctx, size, getReconVisibleEnemies(state.raid), 5, true);
    drawPlayerMarker(ctx, size, state.raid.player);
  }
}

function drawFullMap() {
  const ctx = refs.mapCanvas.getContext('2d');
  const size = refs.mapCanvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(7, 11, 14, 0.98)';
  ctx.fillRect(0, 0, size, size);
  drawMapFrame(ctx, size);
  drawMapObstacles(ctx, size);

  if (state.raid) {
    drawMapContainers(ctx, size, state.raid.containers, 8);
    drawMapExtractions(ctx, size, state.raid.extractions, true);
    drawMapSwitchPoints(ctx, size, state.raid.switchPoints ?? [], true);
    drawMapEnemies(ctx, size, getReconVisibleEnemies(state.raid), 7, true);
    drawPlayerMarker(ctx, size, state.raid.player, 10);
  }
}

function drawMapFrame(ctx, size) {
  ctx.strokeStyle = 'rgba(138, 170, 176, 0.24)';
  ctx.lineWidth = 1;
  const pad = 18;
  ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2);
  ctx.beginPath();
  ctx.moveTo(size / 2, pad);
  ctx.lineTo(size / 2, size - pad);
  ctx.moveTo(pad, size / 2);
  ctx.lineTo(size - pad, size / 2);
  ctx.stroke();
}

function drawMapObstacles(ctx, size) {
  const pad = 18;
  ctx.fillStyle = 'rgba(67, 88, 96, 0.85)';
  for (const obstacle of obstacleDefs) {
    const min = worldToMap(obstacle.x - obstacle.w / 2, obstacle.z - obstacle.d / 2, size, pad);
    const max = worldToMap(obstacle.x + obstacle.w / 2, obstacle.z + obstacle.d / 2, size, pad);
    ctx.fillRect(min.x, min.y, max.x - min.x, max.y - min.y);
  }
}

function drawMapContainers(ctx, size, containers, radius) {
  const pad = 18;
  for (const container of containers) {
    if (container.opened && !container.items.length) {
      continue;
    }
    const point = worldToMap(container.x, container.z, size, pad);
    ctx.fillStyle = container.pool === 'valuable' ? '#f0c57d' : container.pool === 'med' ? '#8ad0af' : '#89c4e2';
    ctx.fillRect(point.x - radius / 2, point.y - radius / 2, radius, radius);
  }
}

function drawMapSearchZones(ctx, size, containers, radius) {
  const pad = 18;
  ctx.save();
  ctx.font = 'bold 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const container of containers) {
    if (container.id.startsWith('drop-') || (container.opened && !container.items.length)) {
      continue;
    }
    const point = worldToMap(container.x, container.z, size, pad);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(240, 197, 125, 0.92)';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.strokeStyle = '#f8e4b1';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();

    ctx.fillStyle = '#122127';
    ctx.fillText('S', point.x, point.y + 0.5);
  }
  ctx.restore();
}

function drawMapSwitchPoints(ctx, size, points, drawLabels = false) {
  const pad = 18;
  ctx.save();
  ctx.font = 'bold 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const point of points) {
    const mapPoint = worldToMap(point.x, point.z, size, pad);
    ctx.beginPath();
    ctx.fillStyle = point.used ? '#9df0c4' : 'rgba(130, 190, 255, 0.95)';
    ctx.moveTo(mapPoint.x, mapPoint.y - 7);
    ctx.lineTo(mapPoint.x + 6, mapPoint.y);
    ctx.lineTo(mapPoint.x, mapPoint.y + 7);
    ctx.lineTo(mapPoint.x - 6, mapPoint.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#102028';
    ctx.fillText(getLanguage() === 'zh' ? 'é¸' : 'L', mapPoint.x, mapPoint.y + 0.4);
    if (drawLabels) {
      ctx.fillStyle = point.used ? '#caffdf' : '#a7d0ff';
      ctx.textAlign = 'left';
      ctx.fillText(getSwitchPointLabel(point), mapPoint.x + 10, mapPoint.y + 2);
      ctx.textAlign = 'center';
    }
  }
  ctx.restore();
}

function drawMapExtractions(ctx, size, zones, drawLabels, drawMarker = false) {
  const pad = 18;
  ctx.font = '12px "Segoe UI"';
  for (const zone of zones) {
    const point = worldToMap(zone.x, zone.z, size, pad);
    ctx.beginPath();
    ctx.strokeStyle = zone.active ? '#8fd6b3' : '#47585e';
    ctx.lineWidth = 2;
    ctx.arc(point.x, point.y, Math.max(10, zone.radius * (size / 200)), 0, Math.PI * 2);
    ctx.stroke();
    if (drawMarker) {
      ctx.beginPath();
      ctx.fillStyle = zone.active ? '#dff8e3' : '#6d7d82';
      ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.fillStyle = zone.active ? '#dff8e3' : '#90a0a5';
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('E', point.x, point.y - 7);
      ctx.restore();
    }
    if (drawLabels) {
      ctx.fillStyle = zone.active ? '#dff8e3' : '#90a0a5';
      ctx.fillText(zone.name, point.x + 12, point.y - 6);
    }
  }
}

function drawMapEnemies(ctx, size, enemies, radius, drawBadge = false) {
  const pad = 18;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(8, Math.round(radius * 1.5))}px "Segoe UI", sans-serif`;
  for (const enemy of enemies) {
    if (enemy.dead) {
      continue;
    }
    const point = worldToMap(enemy.x, enemy.z, size, pad);
    ctx.beginPath();
    ctx.fillStyle = enemy.type === 'bruiser' ? '#efb18a' : enemy.type === 'hunter' ? '#9ecf98' : '#df8e84';
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(7, 14, 18, 0.92)';
    ctx.stroke();
    if (drawBadge) {
      ctx.fillStyle = '#0f1b20';
      ctx.fillText(getEnemyMapBadge(enemy), point.x, point.y + 0.4);
    }
  }
  ctx.restore();
}

function drawPlayerMarker(ctx, size, player, radius = 7) {
  const pad = 18;
  const point = worldToMap(player.x, player.z, size, pad);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(-player.yaw);
  ctx.beginPath();
  ctx.fillStyle = '#85d5f0';
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.7, radius);
  ctx.lineTo(-radius * 0.7, radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function worldToMap(x, z, size, pad) {
  const usable = size - pad * 2;
  return {
    x: pad + ((x + MAP_HALF) / MAP_SIZE) * usable,
    y: pad + ((z + MAP_HALF) / MAP_SIZE) * usable,
  };
}

function moveEntityWithCollision(entity, deltaX, deltaZ, radius) {
  entity.x += deltaX;
  resolveObstacleCollisions(entity, radius);
  entity.z += deltaZ;
  resolveObstacleCollisions(entity, radius);
  entity.x = clamp(entity.x, -PLAYABLE_HALF + radius, PLAYABLE_HALF - radius);
  entity.z = clamp(entity.z, -PLAYABLE_HALF + radius, PLAYABLE_HALF - radius);
}

function resolveObstacleCollisions(entity, radius) {
  for (const obstacle of obstacleDefs) {
    const closestX = clamp(entity.x, obstacle.x - obstacle.w / 2, obstacle.x + obstacle.w / 2);
    const closestZ = clamp(entity.z, obstacle.z - obstacle.d / 2, obstacle.z + obstacle.d / 2);
    const dx = entity.x - closestX;
    const dz = entity.z - closestZ;
    const distance = Math.hypot(dx, dz);

    if (distance > 0 && distance < radius) {
      const push = (radius - distance) + 0.001;
      entity.x += (dx / distance) * push;
      entity.z += (dz / distance) * push;
    } else if (distance === 0) {
      const overlapX = Math.min(
        Math.abs(entity.x - (obstacle.x - obstacle.w / 2)),
        Math.abs(entity.x - (obstacle.x + obstacle.w / 2)),
      );
      const overlapZ = Math.min(
        Math.abs(entity.z - (obstacle.z - obstacle.d / 2)),
        Math.abs(entity.z - (obstacle.z + obstacle.d / 2)),
      );
      if (overlapX < overlapZ) {
        entity.x += entity.x < obstacle.x ? -radius : radius;
      } else {
        entity.z += entity.z < obstacle.z ? -radius : radius;
      }
    }
  }
}

function lineOfSightBlocked(ax, az, bx, bz) {
  const steps = Math.ceil(distance2D(ax, az, bx, bz) / 1.2);
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const x = lerp(ax, bx, t);
    const z = lerp(az, bz, t);
    if (pointInsideObstacle(x, z)) {
      return true;
    }
  }
  return false;
}

function pointInsideObstacle(x, z) {
  return obstacleDefs.some(
    (obstacle) =>
      x > obstacle.x - obstacle.w / 2 &&
      x < obstacle.x + obstacle.w / 2 &&
      z > obstacle.z - obstacle.d / 2 &&
      z < obstacle.z + obstacle.d / 2,
  );
}

function pointInsideObstaclePadding(x, z, padding = 0) {
  return obstacleDefs.some(
    (obstacle) =>
      x > obstacle.x - obstacle.w / 2 - padding &&
      x < obstacle.x + obstacle.w / 2 + padding &&
      z > obstacle.z - obstacle.d / 2 - padding &&
      z < obstacle.z + obstacle.d / 2 + padding,
  );
}

function resolveStaticPlacement(x, z, clearance = 1.4) {
  const entity = { x, z };
  for (let iteration = 0; iteration < 18; iteration += 1) {
    resolveObstacleCollisions(entity, clearance);
    entity.x = clamp(entity.x, -PLAYABLE_HALF + clearance, PLAYABLE_HALF - clearance);
    entity.z = clamp(entity.z, -PLAYABLE_HALF + clearance, PLAYABLE_HALF - clearance);
    if (!pointInsideObstaclePadding(entity.x, entity.z, clearance * 0.32)) {
      return { x: entity.x, z: entity.z };
    }
  }

  for (let radius = clearance; radius <= 14; radius += 0.8) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
      const candidateX = clamp(x + Math.cos(angle) * radius, -PLAYABLE_HALF + clearance, PLAYABLE_HALF - clearance);
      const candidateZ = clamp(z + Math.sin(angle) * radius, -PLAYABLE_HALF + clearance, PLAYABLE_HALF - clearance);
      if (!pointInsideObstaclePadding(candidateX, candidateZ, clearance * 0.32)) {
        return { x: candidateX, z: candidateZ };
      }
    }
  }

  return {
    x: clamp(entity.x, -PLAYABLE_HALF + clearance, PLAYABLE_HALF - clearance),
    z: clamp(entity.z, -PLAYABLE_HALF + clearance, PLAYABLE_HALF - clearance),
  };
}

function spawnTracer(from, to, color, maxLife) {
  const mesh = BABYLON.MeshBuilder.CreateTube(`tracer-${Math.random().toString(36).slice(2, 7)}`, {
    path: [from.clone(), to.clone()],
    radius: 0.026,
    tessellation: 6,
  }, scene);
  const material = new BABYLON.StandardMaterial(`tracer-mat-${Math.random().toString(36).slice(2, 7)}`, scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(color);
  material.emissiveColor = BABYLON.Color3.FromHexString(color);
  material.alpha = 0.95;
  material.disableLighting = true;
  material.backFaceCulling = false;
  mesh.material = material;
  state.raid.effects.push({
    mesh,
    life: maxLife,
    maxLife,
    alphaScale: 0.92,
    baseScale: 1,
    scaleGrow: 0.12,
  });
}

function spawnPulse(position, color, baseScale, maxLife) {
  const mesh = BABYLON.MeshBuilder.CreateSphere(`pulse-${Math.random().toString(36).slice(2, 7)}`, { diameter: 1, segments: 10 }, scene);
  mesh.position = position.clone();
  const material = makeMaterial(`pulse-mat-${Math.random().toString(36).slice(2, 7)}`, color, color);
  material.alpha = 0.45;
  mesh.material = material;
  mesh.scaling.setAll(baseScale);
  state.raid.effects.push({
    mesh,
    life: maxLife,
    maxLife,
    alphaScale: 0.55,
    baseScale,
    scaleGrow: baseScale * 2.2,
  });
}

function spawnSmokePuff(position, color = '#b8c0c4', baseScale = 0.16, maxLife = 0.24, velocity = null) {
  const mesh = BABYLON.MeshBuilder.CreateSphere(`smoke-${Math.random().toString(36).slice(2, 7)}`, { diameter: 1, segments: 8 }, scene);
  mesh.position = position.clone();
  const material = makeMaterial(`smoke-mat-${Math.random().toString(36).slice(2, 7)}`, color, color);
  material.alpha = 0.14;
  mesh.material = material;
  mesh.scaling.setAll(baseScale);
  state.raid.effects.push({
    mesh,
    life: maxLife,
    maxLife,
    alphaScale: 0.18,
    baseScale,
    scaleGrow: baseScale * 2.8,
    velocity,
    spin: randomBetween(-2.6, 2.6),
  });
}

function spawnImpactBurst(position, color, intensity = 1, flavor = 'hard') {
  const baseScale = 0.1 + intensity * 0.08;
  spawnPulse(position, color, baseScale, 0.1 + intensity * 0.04);
  spawnSmokePuff(
    position,
    flavor === 'flesh' ? '#9c5c54' : '#b8bec2',
    0.06 + intensity * 0.05,
    0.2 + intensity * 0.06,
    new BABYLON.Vector3(randomBetween(-0.08, 0.08), 0.18 + intensity * 0.12, randomBetween(-0.08, 0.08)),
  );

  const sparkCount = Math.round(4 + intensity * 3);
  for (let i = 0; i < sparkCount; i += 1) {
    const direction = new BABYLON.Vector3(
      randomBetween(-1, 1),
      randomBetween(flavor === 'flesh' ? 0.1 : 0.18, 0.95),
      randomBetween(-1, 1),
    ).normalize();
    const length = randomBetween(0.08, 0.24) * intensity;
    const line = BABYLON.MeshBuilder.CreateLines(`spark-${Math.random().toString(36).slice(2, 7)}`, {
      points: [position.clone(), position.add(direction.scale(length))],
    }, scene);
    line.color = BABYLON.Color3.FromHexString(flavor === 'flesh' ? '#ffb09a' : color);
    line.alpha = flavor === 'flesh' ? 0.62 : 0.86;
    state.raid.effects.push({
      line,
      life: 0.05 + intensity * 0.03,
      maxLife: 0.05 + intensity * 0.03,
    });
  }
}

function spawnMuzzleExhaust(origin, direction) {
  const muzzlePoint = origin.add(direction.scale(1.04));
  spawnPulse(muzzlePoint, '#ffdca5', 0.08, 0.06);
  spawnSmokePuff(
    muzzlePoint.add(new BABYLON.Vector3(randomBetween(-0.02, 0.02), randomBetween(-0.02, 0.03), randomBetween(-0.02, 0.02))),
    '#d4d0c8',
    0.08,
    0.18,
    direction.scale(0.46).add(new BABYLON.Vector3(randomBetween(-0.06, 0.06), 0.12, randomBetween(-0.06, 0.06))),
  );
}

function notify(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `notification ${type}`;
  node.textContent = message;
  refs.notificationHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  window.setTimeout(() => {
    node.classList.remove('show');
    window.setTimeout(() => node.remove(), 180);
  }, 2300);
}

function toggleRaidMap() {
  if (state.mode !== 'raid' || !state.raid) {
    return;
  }
  if (state.overlay === 'map') {
    closeMapOverlay();
  } else if (!state.overlay) {
    openMapOverlay();
  }
}

function triggerRaidInteract() {
  if (state.mode !== 'raid' || !state.raid || state.overlay) {
    return;
  }
  unlockAudioContext();
  const interaction = getCurrentInteraction();
  if (interaction?.type === 'container') {
    openLootPanel(interaction.container);
  } else if (interaction?.type === 'switch') {
    beginSwitchSequence(interaction.point);
  } else if (interaction?.type === 'extract') {
    state.input.interactHeld = true;
  }
}

function beginSwitchSequence(point) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player || !point || point.used || raid.switchSequence) {
    return false;
  }
  raid.switchSequence = {
    pointId: point.id,
    zoneId: point.zoneId,
    timer: 1.45,
    duration: 1.45,
  };
  state.input.fireHeld = false;
  state.input.aimHeld = false;
  state.input.interactHeld = false;
  playSwitchAudio({ x: point.x, z: point.z }, false);
  notify(L(`æ­£å¨æä¸ ${getSwitchPointLabel(point)}...`, `Pulling ${getSwitchPointLabel(point)}...`), 'warning');
  return true;
}

function finishSwitchSequence() {
  const raid = state.raid;
  const sequence = raid?.switchSequence;
  if (!raid || !sequence) {
    return;
  }
  const point = getSwitchPointById(raid, sequence.pointId);
  const zone = raid.extractions.find((entry) => entry.id === sequence.zoneId);
  raid.switchSequence = null;
  if (!point || !zone) {
    return;
  }
  point.used = true;
  zone.switchArmed = true;
  zone.switchTimer = SWITCH_EXTRACTION_WINDOW;
  zone.switchExpired = false;
  spawnPulse(new BABYLON.Vector3(point.x, 0.8, point.z), '#8bbdff', 0.28, 0.8);
  spawnPulse(new BABYLON.Vector3(zone.x, 0.8, zone.z), '#8fd6b3', zone.radius * 0.36, 1);
  playSwitchAudio({ x: point.x, z: point.z }, true);
  notify(
    L(`${getZoneLabel(zone)} å·²å¼å¯ï¼${SWITCH_EXTRACTION_WINDOW} ç§åå³é­ã`, `${getZoneLabel(zone)} is open for ${SWITCH_EXTRACTION_WINDOW}s.`),
    'success',
  );
}

function stepTouchMove(controlKey) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player || state.overlay || player.mobilityAction) {
    return;
  }

  const forward = {
    x: Math.sin(player.yaw),
    z: Math.cos(player.yaw),
  };
  const right = {
    x: Math.cos(player.yaw),
    z: -Math.sin(player.yaw),
  };

  let moveX = 0;
  let moveZ = 0;
  if (controlKey === 'ArrowUp') {
    moveX += forward.x;
    moveZ += forward.z;
  } else if (controlKey === 'ArrowDown') {
    moveX -= forward.x;
    moveZ -= forward.z;
  } else if (controlKey === 'ArrowLeft') {
    moveX -= right.x;
    moveZ -= right.z;
  } else if (controlKey === 'ArrowRight') {
    moveX += right.x;
    moveZ += right.z;
  }

  const movement = normalize2D(moveX, moveZ);
  if (!movement.x && !movement.z) {
    return;
  }

  moveEntityWithCollision(player, movement.x * 0.46, movement.z * 0.46, player.radius);
  player.velocityBob += magnitude(movement.x, movement.z) * 0.9;
  syncPlayerCamera();
  syncHud();
}

function bindEvents() {
  refs.deployButton.addEventListener('click', startRaid);
  refs.saveResetButton.addEventListener('click', resetSave);
  refs.sellAllButton.addEventListener('click', sellAllStash);
  refs.returnBaseButton.addEventListener('click', returnToBase);
  refs.closeLootButton.addEventListener('click', closeLootPanel);
  refs.takeAllButton.addEventListener('click', takeAllCurrentContainer);
  refs.closeMapButton.addEventListener('click', closeMapOverlay);

  refs.shopList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-id]');
    if (!button) {
      return;
    }
    buyShopEntry(button.dataset.shopId);
  });

  refs.stashList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sell-id]');
    if (!button) {
      return;
    }
    sellItem(button.dataset.sellId);
  });

  refs.lootItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-take-id]');
    if (!button) {
      return;
    }
    takeLoot(state.ui.currentContainerId, button.dataset.takeId);
  });

  refs.canvas.addEventListener('click', () => {
    if (state.mode === 'raid' && !state.overlay) {
      refs.canvas.focus?.({ preventScroll: true });
    }
  });

  refs.canvas.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'raid' || state.overlay) {
      return;
    }
    refs.canvas.focus?.({ preventScroll: true });
    state.input.lookDragging = true;
    state.input.lookPointerId = event.pointerId;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    refs.canvas.setPointerCapture?.(event.pointerId);
    if (event.button === 0) {
      state.input.mouseDown = true;
      state.input.firePointerId = event.pointerId;
    }
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (
      state.mode !== 'raid' ||
      !state.raid ||
      state.overlay ||
      state.pointerLocked ||
      !state.input.lookDragging ||
      state.input.lookPointerId !== event.pointerId
    ) {
      return;
    }
    const deltaX = event.clientX - state.input.lastPointerX;
    const deltaY = event.clientY - state.input.lastPointerY;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    applyLookDelta(deltaX, deltaY);
  });

  const stopLookDrag = (event) => {
    if (event.pointerId !== undefined && state.input.lookPointerId !== null && event.pointerId !== state.input.lookPointerId) {
      return;
    }
    if (event.pointerId === state.input.firePointerId) {
      state.input.mouseDown = false;
      state.input.firePointerId = null;
    }
    state.input.lookDragging = false;
    state.input.lookPointerId = null;
  };

  refs.canvas.addEventListener('pointerup', stopLookDrag);
  refs.canvas.addEventListener('pointercancel', stopLookDrag);
  refs.canvas.addEventListener('lostpointercapture', stopLookDrag);

  const activeControlPointers = new Map();
  refs.touchControls?.addEventListener('pointerdown', (event) => {
    const keyButton = event.target.closest('[data-control-key]');
    const actionButton = event.target.closest('[data-control-action]');
    if (!keyButton && !actionButton) {
      return;
    }
    event.preventDefault();
    refs.canvas.focus?.({ preventScroll: true });

    if (keyButton) {
      const key = keyButton.dataset.controlKey;
      if (!key) {
        return;
      }
      state.input.keys.add(key);
      stepTouchMove(key);
      const intervalId = window.setInterval(() => stepTouchMove(key), 50);
      keyButton.setPointerCapture?.(event.pointerId);
      activeControlPointers.set(event.pointerId, { type: 'key', value: key, intervalId });
      return;
    }

    const action = actionButton.dataset.controlAction;
    if (!action) {
      return;
    }
    actionButton.setPointerCapture?.(event.pointerId);
    if (action === 'interact') {
      triggerRaidInteract();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'reload') {
      reloadWeapon();
    } else if (action === 'heal') {
      useMedkit();
    } else if (action === 'map') {
      toggleRaidMap();
    }
  });

  const releaseControlPointer = (event) => {
    const active = activeControlPointers.get(event.pointerId);
    if (!active) {
      return;
    }
    if (active.type === 'key') {
      state.input.keys.delete(active.value);
      window.clearInterval(active.intervalId);
    } else if (active.type === 'action' && active.value === 'interact') {
      state.input.interactHeld = false;
    }
    activeControlPointers.delete(event.pointerId);
  };

  refs.touchControls?.addEventListener('pointerup', releaseControlPointer);
  refs.touchControls?.addEventListener('pointercancel', releaseControlPointer);
  refs.touchControls?.addEventListener('lostpointercapture', releaseControlPointer);

  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('mousemove', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay) {
      return;
    }
    applyLookDelta(event.movementX, event.movementY);
  });

  document.addEventListener('mousedown', (event) => {
    if (event.button === 0 && state.mode === 'raid' && !state.overlay && state.pointerLocked) {
      state.input.mouseDown = true;
      state.input.firePointerId = 'pointer-lock';
    }
  });

  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
      state.input.mouseDown = false;
      state.input.firePointerId = null;
    }
  });

  document.addEventListener('keydown', (event) => {
    state.input.keys.add(event.code);
    if (event.repeat) {
      return;
    }

    if (state.mode === 'raid' && state.raid) {
      if (event.code === 'KeyR') {
        reloadWeapon();
      }
      if (event.code === 'KeyQ') {
        useMedkit();
      }
      if (event.code === 'KeyM') {
        toggleRaidMap();
      }
      if (event.code === 'KeyE') {
        triggerRaidInteract();
      }
      if (event.code === 'Escape') {
        if (state.overlay === 'loot') {
          closeLootPanel();
        } else if (state.overlay === 'map') {
          closeMapOverlay();
        } else {
          releasePointerLock();
        }
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    state.input.keys.delete(event.code);
    if (event.code === 'KeyE') {
      state.input.interactHeld = false;
    }
  });
}

function runDebugMode() {
  if (!debugMode) {
    return;
  }

  window.setTimeout(() => {
    if (debugMode === 'raid') {
      renderBasePanel();
      return;
    }

    if (debugMode === 'recon') {
      setSelectedOperator('recon');
      startRaid();
      if (!state.raid) {
        return;
      }
      const player = state.raid.player;
      player.x = 0;
      player.z = -32;
      player.yaw = 0;
      player.pitch = 0;
      for (const [index, enemy] of state.raid.enemies.entries()) {
        if (index === 0) {
          enemy.x = 0;
          enemy.z = -3;
          enemy.heading = Math.PI;
          enemy.route = [
            { x: 0, z: -3 },
            { x: 6, z: -1 },
            { x: -6, z: -1 },
          ];
          enemy.routeIndex = 0;
        } else if (index === 1) {
          enemy.x = -26;
          enemy.z = 34;
        } else if (index === 2) {
          enemy.x = 36;
          enemy.z = 28;
        } else {
          enemy.x = 54 + index;
          enemy.z = 54 + index;
        }
        if (enemy.visual) {
          enemy.visual.root.position.x = enemy.x;
          enemy.visual.root.position.z = enemy.z;
          enemy.visual.root.rotation.y = enemy.heading;
        }
      }
      useOperatorAbility();
      syncPlayerCamera();
      syncHud();
      return;
    }

    if (debugMode === 'loot') {
      startRaid();
      const target = state.raid?.containers[0];
      if (target) {
        state.raid.player.x = target.x + 1.1;
        state.raid.player.z = target.z + 0.6;
        syncPlayerCamera();
        openLootPanel(target);
      }
      return;
    }

    if (debugMode === 'map') {
      startRaid();
      openMapOverlay();
      return;
    }

    if (debugMode === 'extract') {
      startRaid();
      if (!state.raid) {
        return;
      }
      for (const objective of state.raid.objectives) {
        objective.progress = objective.target;
      }
      state.raid.tasksComplete = true;
      const activeZone = state.raid.extractions.find((zone) => zone.active) ?? state.raid.extractions[0];
      if (activeZone) {
        state.raid.player.x = activeZone.x;
        state.raid.player.z = activeZone.z;
      }
      state.input.interactHeld = true;
      syncPlayerCamera();
      syncHud();
      return;
    }

    if (debugMode === 'result') {
      startRaid();
      const debugSamples = ['intel', 'sensor']
        .map((id) => lootCatalog.find((item) => item.id === id))
        .filter(Boolean);
      const sampleItems = debugSamples.map((item) => createLootInstance(item));
      state.raid.bag.push(...sampleItems);
      state.raid.bagValue = sampleItems.reduce((sum, item) => sum + item.value, 0);
      state.raid.bagWeight = sampleItems.reduce((sum, item) => sum + item.weight, 0);
      finishRaid(true, 'è°è¯æ¨¡å¼æ¤ç¦»æåã', true);
    }
  }, 80);
}

function isKeyDown(code) {
  return state.input.keys.has(code);
}

function makeMaterial(name, diffuseHex, emissiveHex) {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(diffuseHex);
  material.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex).scale(0.26);
  material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
  return material;
}

function makeRevealMaterial(name, baseHex = '#79f5ff') {
  const material = new BABYLON.StandardMaterial(name, scene);
  const baseColor = BABYLON.Color3.FromHexString(baseHex);
  material.diffuseColor = baseColor.scale(0.16);
  material.emissiveColor = baseColor.scale(0.9);
  material.specularColor = BABYLON.Color3.Black();
  material.alpha = 0;
  material.backFaceCulling = false;
  material.disableLighting = true;
  material.disableDepthWrite = true;
  material.forceDepthWrite = false;
  material.alphaMode = BABYLON.ALPHA_ADD ?? 1;
  material.depthFunction = BABYLON.ALWAYS ?? 519;
  return material;
}

function configureRevealGhostMesh(mesh) {
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.renderingGroupId = 3;
  mesh.setEnabled(false);
  mesh.onBeforeRenderObservable.add(() => {
    const activeEngine = scene?.getEngine?.();
    if (!activeEngine) {
      return;
    }
    mesh.metadata = mesh.metadata ?? {};
    mesh.metadata.prevDepthFunction = typeof activeEngine.getDepthFunction === 'function'
      ? activeEngine.getDepthFunction()
      : null;
    mesh.metadata.prevDepthWrite = typeof activeEngine.getDepthWrite === 'function'
      ? activeEngine.getDepthWrite()
      : null;
    if (typeof activeEngine.setDepthFunction === 'function') {
      activeEngine.setDepthFunction(BABYLON.ALWAYS ?? 519);
    }
    if (typeof activeEngine.setDepthWrite === 'function') {
      activeEngine.setDepthWrite(false);
    }
  });
  mesh.onAfterRenderObservable.add(() => {
    const activeEngine = scene?.getEngine?.();
    if (!activeEngine) {
      return;
    }
    const previousDepthFunction = mesh.metadata?.prevDepthFunction;
    const previousDepthWrite = mesh.metadata?.prevDepthWrite;
    if (previousDepthFunction != null && typeof activeEngine.setDepthFunction === 'function') {
      activeEngine.setDepthFunction(previousDepthFunction);
    } else if (typeof activeEngine.setDepthFunctionToLessOrEqual === 'function') {
      activeEngine.setDepthFunctionToLessOrEqual();
    }
    if (previousDepthWrite != null && typeof activeEngine.setDepthWrite === 'function') {
      activeEngine.setDepthWrite(previousDepthWrite);
    }
  });
  return mesh;
}

function shadeColor(hex, delta) {
  const color = BABYLON.Color3.FromHexString(hex);
  const adjust = delta / 255;
  const clampChannel = (value) => clamp(value, 0, 1);
  return new BABYLON.Color3(
    clampChannel(color.r + adjust),
    clampChannel(color.g + adjust),
    clampChannel(color.b + adjust),
  ).toHexString();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, alpha) {
  return from + (to - from) * alpha;
}

function lerpAngle(from, to, alpha) {
  let delta = to - from;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return from + delta * alpha;
}

function distance2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function normalize2D(x, z) {
  const length = Math.hypot(x, z);
  if (!length) {
    return { x: 0, z: 0 };
  }
  return { x: x / length, z: z / length };
}

function magnitude(x, z) {
  return Math.hypot(x, z);
}

function weightedPick(items, getWeight) {
  const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (!total) {
    return null;
  }
  let threshold = Math.random() * total;
  for (const item of items) {
    threshold -= Math.max(0, getWeight(item));
    if (threshold <= 0) {
      return item;
    }
  }
  return items[items.length - 1] ?? null;
}

function shuffle(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

renderBasePanel();
createScene();
bindEvents();
runDebugMode();

function ensureExtendedRefs() {
  refs.armoryPanel ??= document.getElementById('armoryPanel');
  refs.mapLoadoutList ??= document.getElementById('mapLoadoutList');
  refs.mapAmmoList ??= document.getElementById('mapAmmoList');
  refs.raidSidePanel ??= document.getElementById('raidSidePanel');
  refs.raidLoadoutList ??= document.getElementById('raidLoadoutList');
  refs.raidAmmoRail ??= document.getElementById('raidAmmoRail');
  refs.raidBagList ??= document.getElementById('raidBagList');
}

function setMarkupIfChanged(element, markup) {
  if (!element || element.innerHTML === markup) {
    return;
  }
  element.innerHTML = markup;
}

function syncRaidPanelCollapses() {
  state.ui.raidPanelCollapsed ??= {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  for (const button of document.querySelectorAll('[data-collapse-target]')) {
    const targetId = button.dataset.collapseTarget;
    const target = document.getElementById(targetId);
    if (!target) {
      continue;
    }
    const collapsed = Boolean(state.ui.raidPanelCollapsed[targetId]);
    target.classList.toggle('is-collapsed', collapsed);
    button.textContent = collapsed ? 'å±å¼' : 'æ¶èµ·';
    button.setAttribute('aria-expanded', String(!collapsed));
  }
}

function toggleRaidPanel(targetId) {
  if (!targetId) {
    return;
  }
  state.ui.raidPanelCollapsed ??= {};
  state.ui.raidPanelCollapsed[targetId] = !state.ui.raidPanelCollapsed[targetId];
  syncRaidPanelCollapses();
}

function getActivePartMapForWeapon(weaponId, player = null) {
  const active = { ...getEquippedPartMapForWeapon(weaponId) };
  if (player?.weapon === weaponId) {
    Object.assign(active, player.tempAttachments ?? {});
  }
  return active;
}

function getAmmoTierLabel(ammoId) {
  const ammo = AMMO_DEFS[ammoId];
  return ammo ? `${ammo.name} Â· ${ammo.tierLabel}` : 'Unknown Ammo';
}

function getCurrentAmmoInfo(player) {
  if (!player) {
    return null;
  }
  return AMMO_DEFS[player.currentAmmoId] ?? null;
}

function itemActionButtons(item, scope = 'raid') {
  const buttons = [];
  if (scope === 'base') {
    return renderBaseItemActions(item);
  }
  if (item.itemType === 'usable') {
    buttons.push(`<button class="ghost-button small" type="button" data-bag-action="use" data-item-id="${item.uid}">ä½¿ç¨</button>`);
  }
  if (item.itemType === 'part' && item.partId && PART_DEFS[item.partId]?.compatibleWeapons.includes(state.raid?.player?.weapon)) {
    const equipped = Object.values(state.raid?.player?.tempAttachments ?? {}).includes(item.partId);
    buttons.push(`<button class="ghost-button small" type="button" data-bag-action="${equipped ? 'unequip' : 'equip'}" data-item-id="${item.uid}">${equipped ? 'å¸ä¸' : 'è£å¤'}</button>`);
  }
  if (item.itemType === 'ammo') {
    buttons.push(`<button class="ghost-button small" type="button" data-bag-action="load-ammo" data-item-id="${item.uid}">è£å¡«åºå­</button>`);
  }
  buttons.push(`<button class="ghost-button small" type="button" data-bag-action="drop" data-item-id="${item.uid}">ä¸¢å¼</button>`);
  return buttons.join('');
}

function renderBaseItemActions(item) {
  const buttons = [];
  if (item.itemType === 'ammo') {
    buttons.push(`<button class="ghost-button small" type="button" data-stash-action="stock-ammo" data-stash-id="${item.uid}">å¥å¼¹è¯åº</button>`);
  }
  if (item.itemType === 'part' && item.partId && !state.save.armory.ownedParts.includes(item.partId)) {
    buttons.push(`<button class="ghost-button small" type="button" data-stash-action="learn-part" data-stash-id="${item.uid}">æ¶å¥åæ¢°åº</button>`);
  }
  buttons.push(`<button class="ghost-button small" type="button" data-stash-action="discard" data-stash-id="${item.uid}">ä¸¢å¼</button>`);
  buttons.push(`<button class="ghost-button small" type="button" data-stash-action="sell" data-stash-id="${item.uid}">åºå®</button>`);
  return buttons.join('');
}

function itemMetaLine(item) {
  const details = [item.category, formatWeight(item.weight), formatMoney(item.value)];
  if (item.itemType === 'usable') {
    details.push(describeUsableItem(item));
  }
  if (item.itemType === 'ammo' && item.ammoId) {
    details.push(`${getAmmoTierLabel(item.ammoId)} Â· ${item.rounds} å`);
  }
  if (item.itemType === 'part' && item.partId) {
    details.push(describePartBonus(PART_DEFS[item.partId]));
  }
  return details.join(' Â· ');
}

function describeUsableItem(item) {
  if (item.useAction === 'heal') {
    return `æ¢å¤ ${item.healAmount} çå½`;
  }
  if (item.useAction === 'medkit') {
    return `è¡¥å ${item.medkitAmount} å»çå`;
  }
  if (item.useAction === 'armor') {
    return `æ¢å¤ ${item.armorAmount} æ¤ç²`;
  }
  return 'å¯ä½¿ç¨';
}

function describePartBonus(part) {
  if (!part) {
    return 'é¶ä»¶';
  }
  const stats = [];
  if (part.magBonus) {
    stats.push(`å¼¹å£ +${part.magBonus}`);
  }
  if (part.damageBonus) {
    stats.push(`ä¼¤å®³ +${part.damageBonus}`);
  }
  if (part.fireRateBonus) {
    stats.push(`å°é +${part.fireRateBonus.toFixed(2)}`);
  }
  if (part.reloadMult) {
    stats.push('æ´å¿«æ¢å¼¹');
  }
  if (part.spreadMult) {
    stats.push('ç²¾åº¦æå');
  }
  return stats.join(' Â· ') || part.slot;
}

function getShopEntries() {
  const entries = [
    {
      id: 'prep_medkit',
      kind: 'prep',
      name: 'æå°å»çå',
      description: 'ä¸æ¬¡åºå»æ¶å»çå +1',
      price: 900,
      status: `å·²å¤ ${state.save.prep.medkitBonus}`,
      disabled: false,
    },
    {
      id: 'prep_surgical',
      kind: 'prep',
      name: 'ææ¯å',
      description: 'ä¸æ¬¡åºå»æ¶å»çåé¢å¤ +2',
      price: 1700,
      status: 'éåå»çè¡¥ç»',
      disabled: false,
    },
    {
      id: 'prep_armor',
      kind: 'prep',
      name: 'å¤åæ¤ç²æ¿',
      description: 'ä¸æ¬¡åºå»æ¶åå§æ¤ç² +35',
      price: 1200,
      status: `å·²å¤ +${state.save.prep.armorBonus}`,
      disabled: false,
    },
    {
      id: 'upgrade_bag',
      kind: 'upgrade',
      name: 'æ©å®¹èå',
      description: 'æ°¸ä¹æåèåæ ¼æ°ä¸æ¿é',
      price: 4200 + state.save.upgrades.bagLevel * 2600,
      status: state.save.upgrades.bagLevel >= MAX_BAG_LEVEL ? 'å·²æ»¡çº§' : `Lv.${state.save.upgrades.bagLevel}`,
      disabled: state.save.upgrades.bagLevel >= MAX_BAG_LEVEL,
    },
    {
      id: 'upgrade_weapon',
      kind: 'upgrade',
      name: 'æªæºæ¹è£',
      description: 'æ°¸ä¹æåæ­¦å¨åºç¡ä¼¤å®³',
      price: 3800 + state.save.upgrades.weaponLevel * 2400,
      status: state.save.upgrades.weaponLevel >= MAX_WEAPON_LEVEL ? 'å·²æ»¡çº§' : `Lv.${state.save.upgrades.weaponLevel}`,
      disabled: state.save.upgrades.weaponLevel >= MAX_WEAPON_LEVEL,
    },
  ];
  for (const weapon of Object.values(WEAPON_DEFS)) {
    if (weapon.id === 'rifle') {
      continue;
    }
    entries.push({
      id: `weapon_${weapon.id}`,
      kind: 'weapon',
      weaponId: weapon.id,
      name: weapon.name,
      description: `${weapon.caliber} æ­¦å¨ Â· ${weapon.magSize} åå¼¹å£ Â· ${weapon.fireRate.toFixed(1)} å/ç§`,
      price: weapon.unlockPrice,
      status: state.save.armory.ownedWeapons.includes(weapon.id)
        ? (getSelectedWeaponId() === weapon.id ? 'å·²è£å¤' : 'å·²è§£é')
        : 'æªè§£é',
      disabled: false,
    });
  }
  for (const ammo of Object.values(AMMO_DEFS)) {
    entries.push({
      id: `ammo_${ammo.id}`,
      kind: 'ammo',
      ammoId: ammo.id,
      name: ammo.name,
      description: `${ammo.caliber} Â· ${ammo.tierLabel} Â· ${ammo.packSize} å`,
      price: ammo.price,
      status: `åºå­ ${state.save.prepAmmo[ammo.id] ?? 0}`,
      disabled: false,
    });
  }
  for (const part of Object.values(PART_DEFS)) {
    entries.push({
      id: `part_${part.id}`,
      kind: 'part',
      partId: part.id,
      name: part.name,
      description: `${part.slot} Â· ${part.compatibleWeapons.map((id) => WEAPON_DEFS[id].name).join(' / ')}`,
      price: part.price,
      status: state.save.armory.ownedParts.includes(part.id) ? 'å·²æ¥æ' : 'å¯è´­ä¹°',
      disabled: state.save.armory.ownedParts.includes(part.id),
    });
  }
  return entries;
}

function renderArmoryPanel(selectedWeaponId) {
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const stats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });
  const activeParts = getActivePartMapForWeapon(selectedWeaponId);
  const ownedWeapons = state.save.armory.ownedWeapons
    .map((weaponId) => {
      const weapon = WEAPON_DEFS[weaponId];
      return `
        <article class="stash-row">
          <div>
            <div class="item-title ${weaponId === selectedWeaponId ? 'rarity-uncommon' : ''}">${weapon.name}</div>
            <div class="item-meta">${weapon.caliber} Â· ${weapon.magSize} åå¼¹å£ Â· ${weapon.fireRate.toFixed(1)} å/ç§</div>
          </div>
          <button class="ghost-button small" type="button" data-armory-action="select-weapon" data-weapon-id="${weaponId}">
            ${weaponId === selectedWeaponId ? 'å·²è£å¤' : 'è£å¤'}
          </button>
        </article>
      `;
    })
    .join('');
  const ammoChoices = getAmmoChoicesForWeapon(selectedWeaponId)
    .map((ammo) => `
      <article class="stash-row">
        <div>
          <div class="item-title ${ammo.id === selectedAmmoId ? 'rarity-uncommon' : ''}">${ammo.name}</div>
          <div class="item-meta">${ammo.caliber} Â· ${ammo.tierLabel} Â· åºå­ ${state.save.prepAmmo[ammo.id] ?? 0}</div>
        </div>
        <button class="ghost-button small" type="button" data-armory-action="select-ammo" data-weapon-id="${selectedWeaponId}" data-ammo-id="${ammo.id}">
          ${ammo.id === selectedAmmoId ? 'å·²éæ©' : 'åæ¢'}
        </button>
      </article>
    `)
    .join('');
  const ownedParts = Object.values(PART_DEFS)
    .filter((part) => state.save.armory.ownedParts.includes(part.id) && part.compatibleWeapons.includes(selectedWeaponId))
    .map((part) => `
      <article class="stash-row">
        <div>
          <div class="item-title ${activeParts[part.slot] === part.id ? 'rarity-rare' : ''}">${part.name}</div>
          <div class="item-meta">${describePartBonus(part)}</div>
        </div>
        <button class="ghost-button small" type="button" data-armory-action="${activeParts[part.slot] === part.id ? 'unequip-part' : 'equip-part'}" data-weapon-id="${selectedWeaponId}" data-part-id="${part.id}" data-part-slot="${part.slot}">
          ${activeParts[part.slot] === part.id ? 'å¸ä¸' : 'å®è£'}
        </button>
      </article>
    `)
    .join('');
  return [
    prepRow('å½åä¸»æ­¦å¨', `${stats.name} Â· ${stats.damage} ä¼¤å®³`),
    prepRow('å½åå­å¼¹ç­çº§', getAmmoTierLabel(selectedAmmoId)),
    `<div class="section-note">å·²æ¥ææ­¦å¨</div>${ownedWeapons}`,
    `<div class="section-note">å­å¼¹åæ¢</div>${ammoChoices}`,
    `<div class="section-note">å¯ç¨é¶ä»¶</div>${ownedParts || '<div class="item-meta">å½åæ­¦å¨æ²¡æå·²æ¥æçé¶ä»¶ã</div>'}`,
  ].join('');
}

function renderBasePanel() {
  ensureExtendedRefs();
  refs.basePanel.classList.toggle('hidden', state.mode !== 'base');
  const survivalRate = state.save.stats.raids > 0
    ? `${Math.round((state.save.stats.survived / state.save.stats.raids) * 100)}%`
    : '--';
  const selectedWeaponId = getSelectedWeaponId();
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const selectedStats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });

  refs.summaryStrip.innerHTML = [
    summaryPill('èµé', formatMoney(state.save.money)),
    summaryPill('ä»åº', `${state.save.stash.length} ä»¶`),
    summaryPill('æ¤ç¦»ç', survivalRate),
    summaryPill('æä½³ haul', formatMoney(state.save.stats.bestHaul)),
  ].join('');

  if (refs.lobbyPanel) {
    refs.lobbyPanel.innerHTML = renderLobbyPanel();
  }
  if (refs.deployButton) {
    refs.deployButton.textContent = L(selectedMode.deployZh, selectedMode.deployEn);
  }

  refs.loadoutPrep.innerHTML = [
    prepRow('åºå»æ­¦å¨', `${selectedStats.name} Â· ${selectedStats.caliber}`),
    prepRow('é¦éå­å¼¹', `${getAmmoTierLabel(selectedAmmoId)} Â· åºå­ ${state.save.prepAmmo[selectedAmmoId] ?? 0}`),
    prepRow('åå§å»çå', `${BASE_MEDKITS + state.save.prep.medkitBonus}`),
    prepRow('åå§æ¤ç²', `${BASE_ARMOR + state.save.prep.armorBonus}`),
    prepRow('èåå®¹é', `${getBagSlots()} æ ¼ / ${formatWeight(getBagCapacity())}`),
    prepRow('æ­¦å¨ä¼¤å®³', `${selectedStats.damage}`),
  ].join('');

  if (refs.armoryPanel) {
    refs.armoryPanel.innerHTML = renderArmoryPanel(selectedWeaponId);
  }

  refs.shopList.innerHTML = getShopEntries()
    .map((entry) => {
      const afford = state.save.money >= entry.price && !entry.disabled;
      return `
        <article class="shop-row">
          <div>
            <div class="item-title">${entry.name}</div>
            <div class="item-meta">${entry.description}</div>
            <div class="item-meta">${entry.status}</div>
          </div>
          <div class="stack-list">
            <button class="primary-button small" type="button" data-shop-id="${entry.id}" ${afford ? '' : 'disabled'}>
              ${entry.disabled ? 'å·²æ¥æ' : formatMoney(entry.price)}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  refs.stashList.innerHTML = state.save.stash.length
    ? state.save.stash
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${item.name}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${renderBaseItemActions(item)}
            </div>
          </article>
        `)
        .join('')
    : '<div class="item-meta">ä»åºéè¿æ²¡æå¸¦åºæ¥çæå©åãæ¤ç¦»æååï¼ç©èµãå­å¼¹åæªæ¢°é¶ä»¶é½ä¼åºç°å¨è¿éã</div>';
}

function buyShopEntry(id) {
  const entry = getShopEntries().find((item) => item.id === id);
  if (!entry || entry.disabled) {
    return;
  }
  if (state.save.money < entry.price) {
    notify('èµéä¸è¶³ã', 'danger');
    return;
  }

  state.save.money -= entry.price;
  if (id === 'prep_medkit') {
    state.save.prep.medkitBonus += 1;
  } else if (id === 'prep_surgical') {
    state.save.prep.medkitBonus += 2;
  } else if (id === 'prep_armor') {
    state.save.prep.armorBonus += 35;
  } else if (id === 'upgrade_bag') {
    state.save.upgrades.bagLevel += 1;
  } else if (id === 'upgrade_weapon') {
    state.save.upgrades.weaponLevel += 1;
  } else if (entry.kind === 'weapon' && entry.weaponId) {
    if (!state.save.armory.ownedWeapons.includes(entry.weaponId)) {
      state.save.armory.ownedWeapons.push(entry.weaponId);
      state.save.armory.selectedAmmoByWeapon[entry.weaponId] = WEAPON_DEFS[entry.weaponId].defaultAmmoId;
      state.save.armory.equippedPartsByWeapon[entry.weaponId] = {};
    }
  } else if (entry.kind === 'ammo' && entry.ammoId) {
    state.save.prepAmmo[entry.ammoId] = (state.save.prepAmmo[entry.ammoId] ?? 0) + (AMMO_DEFS[entry.ammoId]?.packSize ?? 0);
  } else if (entry.kind === 'part' && entry.partId) {
    if (!state.save.armory.ownedParts.includes(entry.partId)) {
      state.save.armory.ownedParts.push(entry.partId);
    }
  }

  persistSave();
  renderBasePanel();
  notify(`å·²è´­ä¹° ${entry.name}ã`, 'success');
}

function sellItem(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const [item] = state.save.stash.splice(index, 1);
  state.save.money += item.value;
  persistSave();
  renderBasePanel();
  notify(`å·²åºå® ${item.name}ï¼è·å¾ ${formatMoney(item.value)}ã`, 'success');
}

function discardStashItem(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const [item] = state.save.stash.splice(index, 1);
  persistSave();
  renderBasePanel();
  notify(`å·²ä¸¢å¼ ${item.name}ã`, 'warning');
}

function stockAmmoFromStash(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const item = state.save.stash[index];
  if (item.itemType !== 'ammo' || !item.ammoId) {
    return;
  }
  state.save.prepAmmo[item.ammoId] = (state.save.prepAmmo[item.ammoId] ?? 0) + item.rounds;
  state.save.stash.splice(index, 1);
  persistSave();
  renderBasePanel();
  notify(`å·²å° ${item.name} å­å¥å¼¹è¯åºã`, 'success');
}

function learnPartFromStash(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const item = state.save.stash[index];
  if (item.itemType !== 'part' || !item.partId || state.save.armory.ownedParts.includes(item.partId)) {
    return;
  }
  state.save.armory.ownedParts.push(item.partId);
  state.save.stash.splice(index, 1);
  persistSave();
  renderBasePanel();
  notify(`å·²å° ${item.name} æ¶å¥åæ¢°åºã`, 'success');
}

function sellAllStash() {
  if (!state.save.stash.length) {
    notify('ä»åºéæ²¡æå¯åºå®çç©åã', 'warning');
    return;
  }
  const total = state.save.stash.reduce((sum, item) => sum + item.value, 0);
  const count = state.save.stash.length;
  state.save.money += total;
  state.save.stash = [];
  persistSave();
  renderBasePanel();
  notify(`å·²åºå® ${count} ä»¶ç©åï¼è·å¾ ${formatMoney(total)}ã`, 'success');
}

function createLootInstance(item) {
  return normalizeItemInstance({
    ...item,
    uid: `${item.id}-${Math.random().toString(36).slice(2, 10)}`,
  });
}

function startRaid() {
  unlockAudioContext();
  clearRaid();
  ensureExtendedRefs();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();

  state.save.stats.raids += 1;
  const activeExtractionIds = shuffle(extractionZones.map((zone) => zone.id)).slice(0, 2);
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus;
  const ammoInventory = defaultPrepAmmo();
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    timeLeft: RAID_DURATION,
    statusText: 'WASD ç§»å¨ï¼é¼ æ è½¬åï¼æ F å¼ç«ã',
    interactionText: 'åå®ææç´¢åæ¸æä»»å¡ï¼åå»æ¤ç¦»ç¹ã',
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: false,
    extractionSequence: null,
    objectives: [
      { id: 'search', label: 'Search', target: 2, progress: 0 },
      { id: 'kill', label: 'Clear', target: 2, progress: 0 },
    ],
    player: {
      x: -4,
      z: 0,
      yaw: 2.9,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      radius: PLAYER_RADIUS,
      health: 100,
      maxHealth: 100,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: extractionZones.map((zone) => ({
      ...zone,
      active: activeExtractionIds.includes(zone.id),
      visual: null,
      pulse: Math.random() * Math.PI * 2,
    })),
    enemies: shuffle(enemySpawnDefs)
      .slice(0, 8)
      .map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify('å·²è¿å¥å°éåºãå®æä»»å¡åæè½æ¤ç¦»ã', 'success');
}

function resetRaidLoadout(player) {
  if (!player) {
    return;
  }
  const operator = getPlayerOperatorDef(player);
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const weapon = getWeaponStats(weaponId, { ammoId });
  player.weapon = weaponId;
  player.currentAmmoId = ammoId;
  player.ammoInventory = defaultPrepAmmo();
  player.tempAttachments = {};
  player.health = PLAYER_BASE_HEALTH;
  player.maxHealth = PLAYER_BASE_HEALTH;
  player.armor = BASE_ARMOR;
  player.maxArmor = BASE_ARMOR;
  player.ammoInMag = weapon.magSize;
  player.magSize = weapon.magSize;
  player.medkits = BASE_MEDKITS;
  player.abilityCharges = operator.utilityCharges ?? 1;
  player.abilityCooldown = 0;
  player.abilityCooldownPending = false;
  player.abilityActiveTimer = 0;
  player.operatorEffectTimer = 0;
  player.damageReductionTimer = 0;
  player.damageReductionMult = 1;
  player.medicAutoUsed = false;
  player.medicFoamTimer = 0;
  player.medicFoamPulseTimer = 0;
  player.damageImmunityTimer = 0;
  player.medicSpeedBoostTimer = 0;
  player.medicPostShieldPending = false;
  player.reconZone = null;
  player.fireCooldown = 0;
  player.reloadTimer = 0;
  player.healTimer = 0;
  player.mobilityAction = null;
  player.mobilityCooldown = 0;
  player.proneCooldown = 0;
  player.proneTimer = 0;
  player.proneBlend = 0;
  player.isProne = false;
  player.lastDodgeSide = 1;
  player.dropTimer = 0;
  player.dropDuration = DEPLOY_ANIMATION_DURATION;
  player.dropStartHeight = DEPLOY_START_HEIGHT;
  player.dropLandingPulseDone = true;
  player.extractionProgress = 0;
  player.extractionZoneId = null;
  player.damageFlash = 0;
  player.recoilKick = 0;
  player.damageJolt = 0;
  player.nearHitPulse = 0;
  player.velocityBob = 0;
}

function getReserveAmmoLabel(player) {
  const ammo = getCurrentAmmoInfo(player);
  return `${player.ammoInMag} / ${getCurrentReserveAmmo(player)} Â· ${ammo?.name ?? 'Ammo'}`;
}

function renderRaidLoadoutMarkup() {
  const player = state.raid?.player;
  if (!player) {
    return '';
  }
  const stats = getCurrentPlayerWeaponStats(player);
  const partLines = getActivePartIds(player.weapon, player)
    .map((partId) => PART_DEFS[partId]?.name)
    .filter(Boolean);
  return [
    prepRow('å½åæ­¦å¨', `${stats.name} Â· ${stats.damage} ä¼¤å®³`),
    prepRow('å½åå­å¼¹', getAmmoTierLabel(player.currentAmmoId)),
    prepRow('å¼¹å£ / å¤å¼¹', getReserveAmmoLabel(player)),
    prepRow('æªæ¢°é¶ä»¶', partLines.length ? partLines.join(' / ') : 'æ '),
  ].join('');
}

function renderRaidAmmoMarkup() {
  const player = state.raid?.player;
  if (!player) {
    return '';
  }
  return getAmmoChoicesForWeapon(player.weapon)
    .map((ammo) => `
      <article class="stash-row">
        <div>
          <div class="item-title ${player.currentAmmoId === ammo.id ? 'rarity-uncommon' : ''}">${ammo.name}</div>
          <div class="item-meta">${ammo.caliber} Â· ${ammo.tierLabel} Â· åºå­ ${getCurrentReserveAmmo(player, ammo.id)} å</div>
        </div>
        <button class="ghost-button small" type="button" data-raid-ammo="${ammo.id}">
          ${player.currentAmmoId === ammo.id ? 'æ­£å¨ä½¿ç¨' : 'åæ¢'}
        </button>
      </article>
    `)
    .join('');
}

function syncHud() {
  ensureExtendedRefs();
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const player = raid.player;
  const weaponStats = getCurrentPlayerWeaponStats(player);
  refs.healthValue.textContent = `${Math.round(player.health)} / ${player.maxHealth}`;
  refs.weaponValue.textContent = weaponStats.name;
  refs.armorValue.textContent = `${Math.round(player.armor)} / ${player.maxArmor}`;
  refs.ammoValue.textContent = getReserveAmmoLabel(player);
  refs.medkitValue.textContent = String(player.medkits);
  refs.bagValue.textContent = `${raid.bag.length} / ${getBagSlots()}`;
  refs.weightValue.textContent = `${formatWeight(raid.bagWeight)} / ${formatWeight(getBagCapacity())}`;
  refs.haulValue.textContent = formatMoney(raid.bagValue);
  refs.timeValue.textContent = formatTime(raid.timeLeft);
  refs.hud.dataset.playerX = player.x.toFixed(2);
  refs.hud.dataset.playerZ = player.z.toFixed(2);
  refs.hud.dataset.playerYaw = player.yaw.toFixed(2);
  refs.hud.dataset.tasksComplete = String(raid.tasksComplete);

  const activeExtractions = raid.extractions.filter((zone) => zone.active);
  refs.extractList.textContent = raid.tasksComplete
    ? activeExtractions.map((zone) => zone.name).join(' / ')
    : `Tasks: ${getRaidObjectiveStatus(raid)}`;

  let status = raid.tasksComplete
    ? 'é¼ æ è½¬åï¼æä½ E æ¤ç¦»ã'
    : `åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`;
  if (player.reloadTimer > 0) {
    status = `æ¢å¼¹ä¸­ ${player.reloadTimer.toFixed(1)}s`;
  } else if (player.healTimer > 0) {
    status = `æ²»çä¸­ ${player.healTimer.toFixed(1)}s`;
  } else if (player.extractionProgress > 0) {
    status = `æ¤ç¦»è¯»æ¡ ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`;
  }
  refs.raidStatus.textContent = status;
  refs.interactionPrompt.textContent = raid.interactionText;

  const loadoutMarkup = renderRaidLoadoutMarkup();
  const ammoMarkup = renderRaidAmmoMarkup();
  setMarkupIfChanged(refs.mapLoadoutList, loadoutMarkup);
  setMarkupIfChanged(refs.raidLoadoutList, loadoutMarkup);
  setMarkupIfChanged(refs.mapAmmoList, ammoMarkup);
  setMarkupIfChanged(refs.raidAmmoRail, ammoMarkup);
  syncRaidPanelCollapses();
  renderBagList();
  renderBagGrid();
  renderMapExtractionList();
}

function updatePlayer(dt) {
  const raid = state.raid;
  const player = raid.player;
  const forward = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
  const right = { x: Math.cos(player.yaw), z: -Math.sin(player.yaw) };

  let moveX = 0;
  let moveZ = 0;
  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
    moveX -= right.x;
    moveZ -= right.z;
  }
  if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
    moveX += right.x;
    moveZ += right.z;
  }

  const movement = normalize2D(moveX, moveZ);
  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const speed = sprinting ? 9.2 : 5.8;

  moveEntityWithCollision(player, movement.x * speed * dt, movement.z * speed * dt, player.radius);
  player.velocityBob += magnitude(movement.x, movement.z) * (sprinting ? 18 : 11) * dt;

  if (state.input.fireHeld) {
    attemptShoot();
  }

  const interaction = getCurrentInteraction();
  if (interaction?.type === 'extract' && state.input.interactHeld) {
    if (!raid.tasksComplete) {
      player.extractionProgress = 0;
      raid.interactionText = `åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`;
    } else {
      player.extractionZoneId = interaction.zone.id;
      player.extractionProgress += dt;
      raid.interactionText = `æ­£å¨ä» ${interaction.zone.name} æ¤ç¦» ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`;
      if (player.extractionProgress >= EXTRACTION_HOLD_TIME) {
        finishRaid(true, `Extracted from ${interaction.zone.name}.`, true);
        return;
      }
    }
  } else {
    player.extractionProgress = Math.max(0, player.extractionProgress - dt * 2.6);
    player.extractionZoneId = null;
  }

  if (interaction?.type === 'container') {
    raid.interactionText = `æ E æç´¢ ${interaction.container.name}`;
  } else if (interaction?.type === 'extract') {
    raid.interactionText = raid.tasksComplete
      ? `æä½ E ä» ${interaction.zone.name} æ¤ç¦»`
      : `åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`;
  } else {
    raid.interactionText = raid.tasksComplete
      ? 'å¯ä»¥ç»§ç»­æç´¢æå©åï¼æèåå¾æ¤ç¦»ç¹ã'
      : `å½åä»»å¡ï¼${getRaidObjectiveStatus(raid)}`;
  }

  if (player.health <= 0) {
    finishRaid(false, 'You were killed in the raid. Current loot was lost.', false);
  }
}

function attemptShoot() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  unlockAudioContext();
  const weapon = getCurrentPlayerWeaponStats(player);
  if (player.fireCooldown > 0 || player.reloadTimer > 0 || player.healTimer > 0) {
    return;
  }
  if (player.ammoInMag <= 0) {
    if (getCurrentReserveAmmo(player) > 0) {
      reloadWeapon();
    } else {
      notify('å½åå­å¼¹å·²ç»æç©ºã', 'danger');
    }
    return;
  }

  player.fireCooldown = 1 / weapon.fireRate;
  player.ammoInMag -= 1;
  if (viewModel) {
    viewModel.flashTimer = 1;
    viewModel.smokeTimer = 1;
    viewModel.recoil = Math.min(1.35, (viewModel.recoil ?? 0) + (weapon.pellets > 1 ? 1.05 : 0.72));
  }
  player.recoilKick = Math.min(1.2, (player.recoilKick ?? 0) + (weapon.pellets > 1 ? 1.04 : 0.62));
  player.pitch = clamp(player.pitch - (weapon.pellets > 1 ? 0.018 : 0.008), -1.16, 1.16);
  playGunshotAudio(weapon, { gain: 1 });

  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const baseSpread = sprinting ? weapon.spread * 1.8 : weapon.spread;
  const pelletCount = weapon.pellets ?? 1;
  const origin = new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z);
  let tracerEnd = null;

  for (let pellet = 0; pellet < pelletCount; pellet += 1) {
    const spread = pelletCount > 1 ? baseSpread : baseSpread * 0.8;
    const yaw = player.yaw + randomBetween(-spread, spread);
    const pitch = player.pitch + randomBetween(-spread * 0.65, spread * 0.65);
    const direction = new BABYLON.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(-pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    if (pellet === 0) {
      spawnMuzzleExhaust(origin, direction);
    }
    const ray = new BABYLON.Ray(origin, direction, weapon.range);
    const pick = scene.pickWithRay(ray, (mesh) => Boolean(mesh?.metadata?.raycastTarget));
    let end = origin.add(direction.scale(weapon.range * 0.7));

    if (pick?.hit && pick.pickedPoint) {
      end = pick.pickedPoint;
      if (pick.pickedMesh?.metadata?.raycastTarget === 'enemy') {
        const enemy = state.raid.enemies.find((entry) => entry.id === pick.pickedMesh.metadata.enemyId);
        if (enemy && !enemy.dead) {
          damageEnemy(enemy, getWeaponDamage(player.weapon, { ammoId: player.currentAmmoId, player }));
        }
      } else {
        spawnImpactBurst(end, '#8ad8ff', weapon.pellets > 1 ? 1 : 0.78, 'hard');
        playImpactAudio(end, 'hard');
      }
    }
    tracerEnd ??= end;
  }

  spawnTracer(origin, tracerEnd ?? origin, weapon.tracer, 0.08);
}

function completeReload() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  const needed = player.magSize - player.ammoInMag;
  const reserve = getCurrentReserveAmmo(player);
  const loaded = Math.min(needed, reserve);
  player.ammoInMag += loaded;
  player.ammoInventory[player.currentAmmoId] = reserve - loaded;
  playReloadAudio(getCurrentPlayerWeaponStats(player), true);
  notify('æ¢å¼¹å®æã', 'success');
}

function reloadWeapon() {
  const player = state.raid?.player;
  if (!player || player.reloadTimer > 0 || player.ammoInMag >= player.magSize || getCurrentReserveAmmo(player) <= 0) {
    return;
  }
  player.reloadTimer = getCurrentPlayerWeaponStats(player).reload;
  playReloadAudio(getCurrentPlayerWeaponStats(player), false);
}

function useMedkit() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  if (player.medkits <= 0) {
    notify('æ²¡æå»çåã', 'warning');
    return;
  }
  if (player.health >= player.maxHealth || player.healTimer > 0) {
    return;
  }
  player.medkits -= 1;
  player.health = Math.min(player.maxHealth, player.health + PLAYER_HEAL_AMOUNT);
  player.healTimer = PLAYER_HEAL_COOLDOWN;
  player.damageFlash = 0;
  notify('å·²ä½¿ç¨å»çåã', 'success');
}

function addItemToBag(item) {
  const normalized = normalizeItemInstance(item);
  state.raid.bag.push(normalized);
  state.raid.bagValue += normalized.value;
  state.raid.bagWeight += normalized.weight;
  return normalized;
}

function removeBagItem(uid) {
  const index = state.raid?.bag.findIndex((item) => item.uid === uid) ?? -1;
  if (index === -1) {
    return null;
  }
  const [item] = state.raid.bag.splice(index, 1);
  state.raid.bagValue -= item.value;
  state.raid.bagWeight -= item.weight;
  return item;
}

function spawnDroppedContainer(items, label = 'Dropped Gear') {
  const player = state.raid?.player;
  if (!player || !items.length) {
    return;
  }
  const dropX = clamp(player.x + Math.sin(player.yaw) * 1.4, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1);
  const dropZ = clamp(player.z + Math.cos(player.yaw) * 1.4, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1);
  const container = {
    id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: label,
    x: dropX,
    z: dropZ,
    pool: 'valuable',
    tier: 1,
    opened: false,
    items,
    visual: createContainerVisual({ id: label, name: label, x: dropX, z: dropZ, pool: 'valuable' }),
    highlight: 0,
  };
  container.visual.root.position.x = dropX;
  container.visual.root.position.z = dropZ;
  state.raid.containers.push(container);
}

function applyUsableItemToPlayer(item) {
  const player = state.raid?.player;
  if (!player) {
    return false;
  }
  if (item.useAction === 'heal') {
    if (player.health >= player.maxHealth) {
      return false;
    }
    player.health = Math.min(player.maxHealth, player.health + item.healAmount);
    notify(`å·²ä½¿ç¨ ${item.name}ã`, 'success');
    return true;
  }
  if (item.useAction === 'medkit') {
    player.medkits += item.medkitAmount;
    notify(`å·²è¡¥å ${item.medkitAmount} ä¸ªå»çåã`, 'success');
    return true;
  }
  if (item.useAction === 'armor') {
    if (player.armor >= player.maxArmor) {
      return false;
    }
    player.armor = Math.min(player.maxArmor, player.armor + item.armorAmount);
    notify(`å·²ä¿®å¤ ${item.armorAmount} ç¹æ¤ç²ã`, 'success');
    return true;
  }
  return false;
}

function loadAmmoItemToRaid(item) {
  const player = state.raid?.player;
  if (!player || item.itemType !== 'ammo' || !item.ammoId) {
    return false;
  }
  player.ammoInventory[item.ammoId] = (player.ammoInventory[item.ammoId] ?? 0) + item.rounds;
  notify(`å·²è£å¡« ${item.rounds} å ${AMMO_DEFS[item.ammoId]?.name ?? 'Ammo'}ã`, 'success');
  return true;
}

function equipPartItemToRaid(item) {
  const player = state.raid?.player;
  const part = PART_DEFS[item.partId];
  if (!player || !part || !part.compatibleWeapons.includes(player.weapon)) {
    return false;
  }
  player.tempAttachments[part.slot] = part.id;
  const stats = getCurrentPlayerWeaponStats(player);
  player.magSize = stats.magSize;
  player.ammoInMag = Math.min(player.ammoInMag, player.magSize);
  notify(`å·²è£å¤ ${part.name}ã`, 'success');
  return true;
}

function unequipPartItemFromRaid(item) {
  const player = state.raid?.player;
  const part = PART_DEFS[item.partId];
  if (!player || !part) {
    return false;
  }
  if (player.tempAttachments[part.slot] === part.id) {
    delete player.tempAttachments[part.slot];
    const stats = getCurrentPlayerWeaponStats(player);
    player.magSize = stats.magSize;
    player.ammoInMag = Math.min(player.ammoInMag, player.magSize);
    notify(`å·²å¸ä¸ ${part.name}ã`, 'warning');
    return true;
  }
  return false;
}

function canCarry(item) {
  const raid = state.raid;
  if (!raid) {
    return false;
  }
  return raid.bag.length < getBagSlots() && raid.bagWeight + item.weight <= getBagCapacity();
}

function renderLootPanel(container) {
  const bagSpace = `${state.raid.bag.length}/${getBagSlots()} æ ¼`;
  refs.lootMeta.textContent = `åå®¹ç© ${container.items.length} ä»¶ Â· å½åèå ${bagSpace} Â· éé ${formatWeight(state.raid.bagWeight)} / ${formatWeight(getBagCapacity())}`;
  refs.lootItems.innerHTML = container.items.length
    ? container.items
        .map((item) => `
          <article class="loot-item">
            <div>
              <div class="item-title rarity-${item.rarity}">${item.name}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              <button class="ghost-button small" type="button" data-loot-action="take" data-loot-id="${item.uid}">æ¿èµ°</button>
              ${item.itemType === 'usable' ? `<button class="ghost-button small" type="button" data-loot-action="use" data-loot-id="${item.uid}">ç´æ¥ä½¿ç¨</button>` : ''}
              ${item.itemType === 'part' && PART_DEFS[item.partId]?.compatibleWeapons.includes(state.raid.player.weapon) ? `<button class="ghost-button small" type="button" data-loot-action="equip" data-loot-id="${item.uid}">ç´æ¥è£å¤</button>` : ''}
              ${item.itemType === 'ammo' ? `<button class="ghost-button small" type="button" data-loot-action="load" data-loot-id="${item.uid}">ç´æ¥è£å¡«</button>` : ''}
            </div>
          </article>
        `)
        .join('')
    : '<div class="item-meta">è¿ä¸ªå®¹å¨å·²ç»ç©ºäºã</div>';
}

function takeLoot(containerId, itemId) {
  const container = state.raid?.containers.find((entry) => entry.id === containerId);
  if (!container) {
    return;
  }
  const index = container.items.findIndex((item) => item.uid === itemId);
  if (index === -1) {
    return;
  }
  const item = normalizeItemInstance(container.items[index]);
  if (!canCarry(item)) {
    notify('èåç©ºé´æééä¸è¶³ã', 'warning');
    return;
  }
  container.items.splice(index, 1);
  container.opened = true;
  addItemToBag(item);
  renderLootPanel(container);
  syncHud();
  notify(`å·²æ¿èµ· ${item.name}ã`, 'success');
}

function useLootItem(containerId, itemId) {
  const container = state.raid?.containers.find((entry) => entry.id === containerId);
  if (!container) {
    return;
  }
  const index = container.items.findIndex((item) => item.uid === itemId);
  if (index === -1) {
    return;
  }
  const item = normalizeItemInstance(container.items[index]);
  let used = false;
  if (item.itemType === 'usable') {
    used = applyUsableItemToPlayer(item, {
      onConsume: () => {
        const liveContainer = state.raid?.containers.find((entry) => entry.id === containerId);
        if (!liveContainer) {
          return;
        }
        const liveIndex = liveContainer.items.findIndex((entry) => entry.uid === itemId);
        if (liveIndex !== -1) {
          liveContainer.items.splice(liveIndex, 1);
        }
        if (state.ui.currentContainerId === containerId && state.overlay === 'loot') {
          renderLootPanel(liveContainer);
        }
        syncHud();
      },
    });
  } else if (item.itemType === 'ammo') {
    used = loadAmmoItemToRaid(item);
  }
  if (!used) {
    return;
  }
  if (item.itemType !== 'usable') {
    container.items.splice(index, 1);
    renderLootPanel(container);
    syncHud();
  }
}

function equipLootItem(containerId, itemId) {
  takeLoot(containerId, itemId);
  equipBagItem(itemId);
}

function loadLootAmmo(containerId, itemId) {
  useLootItem(containerId, itemId);
}

function takeAllCurrentContainer() {
  const container = state.raid?.containers.find((entry) => entry.id === state.ui.currentContainerId);
  if (!container || !container.items.length) {
    return;
  }
  const items = [...container.items];
  for (const item of items) {
    if (canCarry(item)) {
      takeLoot(container.id, item.uid);
    }
  }
  renderLootPanel(container);
}

function renderBagList() {
  const bag = state.raid?.bag ?? [];
  const markup = bag.length
    ? bag
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${item.name}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${itemActionButtons(item)}
            </div>
          </article>
        `)
        .join('')
    : '<div class="item-meta">èåéè¿æ²¡æå¸¦èµ°çç©åã</div>';
  setMarkupIfChanged(refs.bagList, markup);
  setMarkupIfChanged(refs.raidBagList, markup);
}

function renderBagGrid() {
  const bag = state.raid?.bag ?? [];
  const totalSlots = getBagSlots();
  const markup = Array.from({ length: totalSlots }, (_, index) => {
    const item = bag[index];
    if (!item) {
      return `
        <article class="bag-slot empty">
          <strong>ç©ºæ§½ä½</strong>
          <span>å¯æ¾ç©å</span>
        </article>
      `;
    }
    return `
      <article class="bag-slot">
        <strong class="rarity-${item.rarity}">${item.name}</strong>
        <span>${item.category}</span>
      </article>
    `;
  }).join('');
  setMarkupIfChanged(refs.bagGrid, markup);
}

function renderMapExtractionList() {
  const zones = state.raid?.extractions ?? [];
  const markup = zones
    .map((zone) => {
      const distance = state.raid ? distance2D(zone.x, zone.z, state.raid.player.x, state.raid.player.z) : 0;
      const status = !zone.active
        ? 'Unavailable'
        : state.raid?.tasksComplete
          ? 'Ready'
          : 'Locked by tasks';
      return `
        <article class="extract-row">
          <div>
            <div class="item-title ${zone.active && state.raid?.tasksComplete ? 'rarity-uncommon' : ''}">${zone.name}</div>
            <div class="item-meta">${status} Â· ${distance.toFixed(0)}m</div>
          </div>
        </article>
      `;
    })
    .join('');
  setMarkupIfChanged(refs.mapExtractList, markup);
}

function openMapOverlay() {
  ensureExtendedRefs();
  if (!state.raid) {
    return;
  }
  state.overlay = 'map';
  refs.mapOverlay.classList.remove('hidden');
  renderBagList();
  renderBagGrid();
  renderMapExtractionList();
  if (refs.mapLoadoutList) {
    setMarkupIfChanged(refs.mapLoadoutList, renderRaidLoadoutMarkup());
  }
  if (refs.mapAmmoList) {
    setMarkupIfChanged(refs.mapAmmoList, renderRaidAmmoMarkup());
  }
  drawFullMap();
  releasePointerLock();
}

function useBagItem(uid) {
  const item = state.raid?.bag.find((entry) => entry.uid === uid);
  if (!item) {
    return;
  }
  let success = false;
  if (item.itemType === 'usable') {
    success = applyUsableItemToPlayer(item, {
      onConsume: () => {
        removeBagItem(uid);
        syncHud();
      },
    });
  } else if (item.itemType === 'ammo') {
    success = loadAmmoItemToRaid(item);
  }
  if (!success) {
    return;
  }
  if (item.itemType !== 'usable') {
    removeBagItem(uid);
    syncHud();
  }
}

function equipBagItem(uid) {
  const item = state.raid?.bag.find((entry) => entry.uid === uid);
  if (!item || item.itemType !== 'part') {
    return;
  }
  if (equipPartItemToRaid(item)) {
    syncHud();
  }
}

function dropBagItem(uid) {
  const item = removeBagItem(uid);
  if (!item) {
    return;
  }
  if (item.itemType === 'part') {
    unequipPartItemFromRaid(item);
  }
  spawnDroppedContainer([item], 'Dropped Gear');
  syncHud();
  notify(`å·²ä¸¢å¼ ${item.name}ã`, 'warning');
}

function selectRaidAmmo(ammoId) {
  const player = state.raid?.player;
  if (!player || !getAmmoChoicesForWeapon(player.weapon).some((ammo) => ammo.id === ammoId)) {
    return;
  }
  player.currentAmmoId = ammoId;
  player.magSize = getCurrentPlayerWeaponStats(player).magSize;
  player.ammoInMag = Math.min(player.ammoInMag, player.magSize);
  syncHud();
}

function bindEvents() {
  ensureExtendedRefs();
  refs.canvas.setAttribute('tabindex', '0');
  window.addEventListener('pointerdown', unlockAudioContext, { passive: true });
  window.addEventListener('keydown', unlockAudioContext);
  refs.deployButton.addEventListener('click', startRaid);
  refs.saveResetButton.addEventListener('click', resetSave);
  refs.sellAllButton.addEventListener('click', sellAllStash);
  refs.returnBaseButton.addEventListener('click', returnToBase);
  refs.closeLootButton.addEventListener('click', closeLootPanel);
  refs.takeAllButton.addEventListener('click', takeAllCurrentContainer);
  refs.closeMapButton.addEventListener('click', closeMapOverlay);

  refs.shopList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-id]');
    if (button) {
      buyShopEntry(button.dataset.shopId);
    }
  });

  refs.armoryPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-armory-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.armoryAction;
    const weaponId = button.dataset.weaponId;
    const ammoId = button.dataset.ammoId;
    const partId = button.dataset.partId;
    const slot = button.dataset.partSlot;
    if (action === 'select-weapon' && weaponId) {
      setSelectedWeapon(weaponId);
    } else if (action === 'select-ammo' && weaponId && ammoId) {
      setSelectedAmmoForWeapon(weaponId, ammoId);
    } else if (action === 'equip-part' && weaponId && partId) {
      setEquippedPartForWeapon(weaponId, partId);
    } else if (action === 'unequip-part' && weaponId && slot) {
      clearEquippedPartForWeapon(weaponId, slot);
    }
  });

  refs.raidSidePanel?.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-collapse-target]');
    if (toggle) {
      toggleRaidPanel(toggle.dataset.collapseTarget);
    }
  });

  refs.stashList.addEventListener('click', (event) => {
    const stashButton = event.target.closest('[data-stash-action]');
    if (stashButton) {
      const action = stashButton.dataset.stashAction;
      const uid = stashButton.dataset.stashId;
      if (action === 'sell') {
        sellItem(uid);
      } else if (action === 'discard') {
        discardStashItem(uid);
      } else if (action === 'stock-ammo') {
        stockAmmoFromStash(uid);
      } else if (action === 'learn-part') {
        learnPartFromStash(uid);
      }
      return;
    }
    const sellButton = event.target.closest('[data-sell-id]');
    if (sellButton) {
      sellItem(sellButton.dataset.sellId);
    }
  });

  refs.lootItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-loot-action]');
    if (!button) {
      const takeButton = event.target.closest('[data-take-id]');
      if (takeButton) {
        takeLoot(state.ui.currentContainerId, takeButton.dataset.takeId);
      }
      return;
    }
    const itemId = button.dataset.lootId;
    const action = button.dataset.lootAction;
    if (action === 'take') {
      takeLoot(state.ui.currentContainerId, itemId);
    } else if (action === 'use') {
      useLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'equip') {
      equipLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'load') {
      loadLootAmmo(state.ui.currentContainerId, itemId);
    }
  });

  const handleBagClick = (event) => {
    const button = event.target.closest('[data-bag-action]');
    if (!button) {
      return;
    }
    const uid = button.dataset.itemId;
    const action = button.dataset.bagAction;
    if (action === 'use' || action === 'load-ammo') {
      useBagItem(uid);
    } else if (action === 'equip') {
      equipBagItem(uid);
    } else if (action === 'unequip') {
      const item = state.raid?.bag.find((entry) => entry.uid === uid);
      if (item) {
        unequipPartItemFromRaid(item);
        syncHud();
      }
    } else if (action === 'drop') {
      dropBagItem(uid);
    }
  };
  refs.bagList?.addEventListener('click', handleBagClick);
  refs.raidBagList?.addEventListener('click', handleBagClick);

  const handleAmmoRailClick = (event) => {
    const button = event.target.closest('[data-raid-ammo]');
    if (button) {
      selectRaidAmmo(button.dataset.raidAmmo);
    }
  };
  refs.mapAmmoList?.addEventListener('click', handleAmmoRailClick);
  refs.raidAmmoRail?.addEventListener('click', handleAmmoRailClick);

  refs.canvas.addEventListener('click', () => {
    if (state.mode === 'raid' && !state.overlay) {
      refs.canvas.focus?.({ preventScroll: true });
    }
  });

  refs.canvas.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'raid' || state.overlay) {
      return;
    }
    refs.canvas.focus?.({ preventScroll: true });
    requestPointerLock();
    if (event.button === 0) {
      if (!state.input.fireHeld) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    } else if (event.button === 2) {
      state.input.aimHeld = true;
      event.preventDefault();
    }
    state.input.lookDragging = true;
    state.input.lookPointerId = event.pointerId;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    refs.canvas.setPointerCapture?.(event.pointerId);
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (
      state.mode !== 'raid' ||
      !state.raid ||
      state.overlay ||
      state.pointerLocked ||
      !state.input.lookDragging ||
      state.input.lookPointerId !== event.pointerId
    ) {
      return;
    }
    const deltaX = event.clientX - state.input.lastPointerX;
    const deltaY = event.clientY - state.input.lastPointerY;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    applyLookDelta(deltaX, deltaY);
  });

  const stopLookDrag = (event) => {
    if (event.pointerId !== undefined && state.input.lookPointerId !== null && event.pointerId !== state.input.lookPointerId) {
      return;
    }
    if (event.button === 0) {
      state.input.fireHeld = false;
    } else if (event.button === 2) {
      state.input.aimHeld = false;
    }
    state.input.lookDragging = false;
    state.input.lookPointerId = null;
  };
  refs.canvas.addEventListener('pointerup', stopLookDrag);
  refs.canvas.addEventListener('pointercancel', stopLookDrag);
  refs.canvas.addEventListener('lostpointercapture', stopLookDrag);

  const activeControlPointers = new Map();
  refs.touchControls?.addEventListener('pointerdown', (event) => {
    const keyButton = event.target.closest('[data-control-key]');
    const actionButton = event.target.closest('[data-control-action]');
    if (!keyButton && !actionButton) {
      return;
    }
    event.preventDefault();
    refs.canvas.focus?.({ preventScroll: true });

    if (keyButton) {
      const key = keyButton.dataset.controlKey;
      state.input.keys.add(key);
      stepTouchMove(key);
      const intervalId = window.setInterval(() => stepTouchMove(key), 50);
      keyButton.setPointerCapture?.(event.pointerId);
      activeControlPointers.set(event.pointerId, { type: 'key', value: key, intervalId });
      return;
    }

    const action = actionButton.dataset.controlAction;
    actionButton.setPointerCapture?.(event.pointerId);
    if (action === 'interact') {
      triggerRaidInteract();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'fire') {
      state.input.fireHeld = true;
      attemptShoot();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'reload') {
      reloadWeapon();
    } else if (action === 'heal') {
      useMedkit();
    } else if (action === 'map') {
      toggleRaidMap();
    }
  });

  const releaseControlPointer = (event) => {
    const active = activeControlPointers.get(event.pointerId);
    if (!active) {
      return;
    }
    if (active.type === 'key') {
      state.input.keys.delete(active.value);
      window.clearInterval(active.intervalId);
    } else if (active.type === 'action') {
      if (active.value === 'interact') {
        state.input.interactHeld = false;
      }
      if (active.value === 'fire') {
        state.input.fireHeld = false;
      }
    }
    activeControlPointers.delete(event.pointerId);
  };

  refs.touchControls?.addEventListener('pointerup', releaseControlPointer);
  refs.touchControls?.addEventListener('pointercancel', releaseControlPointer);
  refs.touchControls?.addEventListener('lostpointercapture', releaseControlPointer);

  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('mousemove', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay || !state.pointerLocked) {
      return;
    }
    applyLookDelta(event.movementX, event.movementY);
  });

  window.addEventListener('keydown', (event) => {
    state.input.keys.add(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    const isFireKey = event.code === 'KeyF' || lowerKey === 'f';
    const isReloadKey = event.code === 'KeyR' || lowerKey === 'r';
    const isHealKey = event.code === 'KeyQ' || lowerKey === 'q';
    const isMapKey = event.code === 'KeyM' || lowerKey === 'm';
    const isInteractKey = event.code === 'KeyE' || lowerKey === 'e';

    if (isFireKey) {
      if (!state.input.fireHeld && state.mode === 'raid' && state.raid && !state.overlay) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    }
    if (event.repeat) {
      return;
    }
    if (state.mode === 'raid' && state.raid) {
      refs.canvas.focus?.({ preventScroll: true });
      if (isReloadKey) {
        reloadWeapon();
      }
      if (isHealKey) {
        useMedkit();
      }
      if (isMapKey) {
        toggleRaidMap();
      }
      if (isInteractKey) {
        triggerRaidInteract();
      }
      if (event.code === 'Escape') {
        if (state.overlay === 'loot') {
          closeLootPanel();
        } else if (state.overlay === 'map') {
          closeMapOverlay();
        } else {
          releasePointerLock();
        }
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    state.input.keys.delete(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    if (event.code === 'KeyE' || lowerKey === 'e') {
      state.input.interactHeld = false;
    }
    if (event.code === 'KeyF' || lowerKey === 'f') {
      state.input.fireHeld = false;
    }
  });

  syncRaidPanelCollapses();
}

function readLanguagePreference() {
  try {
    return localStorage.getItem('iron-extraction-language-v1') === 'en' ? 'en' : 'zh';
  } catch (error) {
    return 'zh';
  }
}

function getLanguage() {
  state.ui.language = state.ui.language === 'en' ? 'en' : (state.ui.language ?? readLanguagePreference());
  return state.ui.language;
}

function L(zh, en) {
  return getLanguage() === 'zh' ? zh : en;
}

function getLocalizationData() {
  if (!window.__ironExtractionLocalizationData) {
    window.__ironExtractionLocalizationData = {
      staticText: {
        zh: {
          'brand.name': 'é¢éæ¤ç¦»',
          'base.eyebrow': 'æ¤ç¦»æ¸éåå',
          'base.deploy': 'è¿å¥å°éåº',
          'base.prepTitle': 'åºå»åå¤',
          'base.resetSave': 'éç½®å­æ¡£',
          'base.armoryTitle': 'åæ¢°åº',
          'base.armoryNote': 'æ¥çæ­¦å¨ãå­å¼¹ç­çº§ãæªæ¢°é¶ä»¶åå½åéç½®',
          'base.shopTitle': 'ååº',
          'base.shopNote': 'è¯åãæªæ¢°ãå­å¼¹åéä»¶é½è½å¨è¿éè¡¥é½',
          'base.stashTitle': 'ä»åºä¸æå©å',
          'base.sellAll': 'å¨é¨åºå®',
          'tips.move': 'WASD / æ¹åé®ç§»å¨',
          'tips.look': 'é¼ æ è´è´£è½¬å¨è§é',
          'tips.fire': 'F å¼ç«ï¼R æ¢å¼¹',
          'tips.action': 'Q æ²»çï¼E æç´¢ / æ¤ç¦»ï¼M å°å¾',
          'hud.health': 'çå½',
          'hud.weapon': 'æ­¦å¨',
          'hud.armor': 'æ¤ç²',
          'hud.ammo': 'å¼¹è¯',
          'hud.medkits': 'å»çå',
          'hud.bag': 'èå',
          'hud.weight': 'éé',
          'hud.haul': 'é¢ä¼°ä»·å¼',
          'hud.time': 'å©ä½æ¶é´',
          'raid.loadoutTitle': 'å±åè£å¤',
          'raid.ammoTitle': 'å­å¼¹ç­çº§',
          'raid.bagTitle': 'å±åèå',
          'raid.mapTitle': 'ææ¯å°å¾',
          'raid.extractLoading': 'æ¤ç¦»ç¹è½½å¥ä¸­',
          'raid.statusDefault': 'é¼ æ è½¬åï¼æ F å°å»',
          'raid.interactionDefault': 'é è¿ç©èµç®±ææ¤ç¦»ç¹åæä½ E',
          'loot.eyebrow': 'æç´¢',
          'loot.takeAll': 'å¨é¨æ¿èµ°',
          'map.eyebrow': 'ææ¯æ»è§',
          'map.title': 'å°éåºå°å¾',
          'map.currentLoadout': 'å½åè£å¤',
          'map.ammoGrades': 'å­å¼¹åçº§',
          'map.currentBag': 'å½åèå',
          'map.extractionPoints': 'æ¤ç¦»ç¹',
          'result.eyebrow': 'æå±æ¥å',
          'result.returnBase': 'è¿ååºå°',
          'common.close': 'å³é­',
        },
        en: {
          'brand.name': 'Iron Extraction',
          'base.eyebrow': 'EXTRACTION RAID PROTOTYPE',
          'base.deploy': 'Enter Raid',
          'base.prepTitle': 'Raid Prep',
          'base.resetSave': 'Reset Save',
          'base.armoryTitle': 'Armory',
          'base.armoryNote': 'View weapons, ammo tiers, parts, and the active build',
          'base.shopTitle': 'Market',
          'base.shopNote': 'Restock meds, weapons, ammo, and attachments here',
          'base.stashTitle': 'Stash & Loot',
          'base.sellAll': 'Sell All',
          'tips.move': 'WASD / Arrow keys move',
          'tips.look': 'Mouse controls view',
          'tips.fire': 'F fire, R reload',
          'tips.action': 'Q heal, E search / extract, M map',
          'hud.health': 'Health',
          'hud.weapon': 'Weapon',
          'hud.armor': 'Armor',
          'hud.ammo': 'Ammo',
          'hud.medkits': 'Medkits',
          'hud.bag': 'Bag',
          'hud.weight': 'Weight',
          'hud.haul': 'Haul Value',
          'hud.time': 'Time Left',
          'raid.loadoutTitle': 'Raid Loadout',
          'raid.ammoTitle': 'Ammo Grades',
          'raid.bagTitle': 'Raid Bag',
          'raid.mapTitle': 'Tactical Map',
          'raid.extractLoading': 'Loading extraction points',
          'raid.statusDefault': 'Mouse looks, press F to fire',
          'raid.interactionDefault': 'Hold E near loot or extraction points',
          'loot.eyebrow': 'SEARCH',
          'loot.takeAll': 'Take All',
          'map.eyebrow': 'TACTICAL OVERVIEW',
          'map.title': 'Lockdown Zone Map',
          'map.currentLoadout': 'Current Loadout',
          'map.ammoGrades': 'Ammo Grades',
          'map.currentBag': 'Current Bag',
          'map.extractionPoints': 'Extraction Points',
          'result.eyebrow': 'RAID REPORT',
          'result.returnBase': 'Return to Base',
          'common.close': 'Close',
        },
      },
      zh: {
        weapons: {
          rifle: 'æ¸¸éªåµæ­¥æª',
          smg: 'è°èå²éæª',
          shotgun: 'ç ´é¨é°å¼¹æª',
          dmr: 'å¨åµå°ææ­¥æª',
        },
        ammo: {
          rifle_fmj: '5.56 FMJ I',
          rifle_ap: '5.56 AP II',
          rifle_match: '5.56 ç²¾ç¡®å¼¹ III',
          smg_ball: '9mm æ®éå¼¹ I',
          smg_plusp: '9mm +P II',
          shotgun_buck: '12g é¹¿å¼¹ I',
          shotgun_slug: '12g ç¬å¤´å¼¹ II',
          dmr_fmj: '7.62 FMJ I',
          dmr_ap: '7.62 AP III',
        },
        parts: {
          red_dot: 'çº¢ç¹çå·',
          extended_mag: 'æ©å®¹å¼¹å£',
          muzzle_brake: 'å¶éå¨',
          recoil_pad: 'ååç¼å²å«',
          laser_rail: 'æ¿åå¯¼è½¨',
          tight_choke: 'ç´§ç¼©åç¼©',
          marksman_bipod: 'å°æä¸¤èæ¶',
        },
        loot: {
          field_bandage: 'æå°ç»·å¸¦',
          painkiller_kit: 'æ­¢çå¥ä»¶',
          combat_stim: 'ææå´å¥å',
          spare_medkit: 'å¤ç¨å»çå',
          armor_patch: 'æ¤ç²è¡¥ç',
          plate_bundle: 'æ¤æ¿å',
          circuit: 'çµè·¯æ¿',
          sensor: 'ç­æåä¼ æå¨',
          dronecore: 'æ äººæºæ ¸å¿',
          weaponparts: 'æºå£é¶ä»¶',
          intel: 'ææ¥ç¡¬ç',
          coin: 'æ¶èå¸',
          watch: 'ææ¯èè¡¨',
          artifact: 'æ¡£æ¡æç©',
          bandage: 'æ­¢è¡ç»·å¸¦',
          painkiller: 'æ­¢çéå',
          medinjector: 'æå°æ³¨å°å¨',
          optics: 'ç²¾å¯çå·',
          armorplate: 'é¶ç·æ¤ç²æ¿',
        },
        categories: {
          Medical: 'å»ç',
          Support: 'æ¯æ´',
          Tech: 'çµå­',
          Hardware: 'ç¡¬ä»¶',
          Data: 'æ°æ®',
          Valuable: 'è´µéå',
          Relic: 'æç©',
          Ammo: 'å¼¹è¯',
          'Gun Part': 'æªæ¢°é¶ä»¶',
          Weapon: 'æ­¦å¨',
        },
        containers: {
          'Tool Locker': 'å·¥å·æ',
          'Medical Case': 'å»çç®±',
          'Hidden Supply Cache': 'éèè¡¥ç»ç®±',
          'Weapon Crate': 'æ­¦å¨ç®±',
          'Field Crate': 'åéç®±',
          'Underground Stash': 'å°ä¸ææ ¼',
          'Supply Case': 'æç©ç®±',
          'Field Cache': 'éå¤è¡¥ç»ç®±',
          'Secure Vault': 'ä¿é©åº',
          'Battlefield Drop': 'æåºæè½',
          'Dropped Gear': 'ä¸¢å¼ç©èµ',
        },
        zones: {
          'North Gate': 'åé¨é¸å£',
          'West Tunnel': 'è¥¿ä¾§é§é',
          'East Wire': 'ä¸ä¾§éä¸ç½',
          'South Sewer': 'åé¨ä¸æ°´é',
        },
        enemyTypes: {
          scout: 'ä¾¦å¯åµ',
          hunter: 'çæ',
          bruiser: 'éè£åµ',
        },
        slots: {
          optic: 'çå·',
          mag: 'å¼¹å£',
          muzzle: 'æªå£',
          stock: 'æªæ',
          rail: 'å¯¼è½¨',
          shotgunMuzzle: 'é°å¼¹æªæªå£',
          dmrRail: 'å°æå¯¼è½¨',
        },
        tiers: {
          'Tier I': 'Içº§',
          'Tier II': 'IIçº§',
          'Tier III': 'IIIçº§',
        },
      },
      en: {
        enemyTypes: {
          scout: 'Scout',
          hunter: 'Hunter',
          bruiser: 'Bruiser',
        },
        slots: {
          optic: 'Optic',
          mag: 'Magazine',
          muzzle: 'Muzzle',
          stock: 'Stock',
          rail: 'Rail',
          shotgunMuzzle: 'Shotgun Muzzle',
          dmrRail: 'DMR Rail',
        },
        tiers: {
          'Tier I': 'Tier I',
          'Tier II': 'Tier II',
          'Tier III': 'Tier III',
        },
      },
    };
  }
  return window.__ironExtractionLocalizationData;
}

function t(key) {
  const data = getLocalizationData();
  return data.staticText[getLanguage()]?.[key] ?? data.staticText.zh[key] ?? key;
}

function lookupLocalizedValue(group, key, fallback = key) {
  const data = getLocalizationData();
  return data[getLanguage()]?.[group]?.[key] ?? fallback;
}

function canonicalCategory(category) {
  const aliases = {
    å»ç: 'Medical',
    æ¯æ´: 'Support',
    çµå­: 'Tech',
    ç¡¬ä»¶: 'Hardware',
    æ°æ®: 'Data',
    è´µéå: 'Valuable',
    æç©: 'Relic',
    å¼¹è¯: 'Ammo',
    æªæ¢°é¶ä»¶: 'Gun Part',
    æ­¦å¨: 'Weapon',
  };
  return aliases[category] ?? category;
}

function formatItemCount(count) {
  return L(`${count} ä»¶`, `${count} item${count === 1 ? '' : 's'}`);
}

function getWeaponLabel(weaponId) {
  return lookupLocalizedValue('weapons', weaponId, WEAPON_DEFS[weaponId]?.name ?? weaponId);
}

function getAmmoLabel(ammoId) {
  return lookupLocalizedValue('ammo', ammoId, AMMO_DEFS[ammoId]?.name ?? ammoId);
}

function getPartLabel(partId) {
  return lookupLocalizedValue('parts', partId, PART_DEFS[partId]?.name ?? partId);
}

function getTierLabel(tierLabel) {
  return lookupLocalizedValue('tiers', tierLabel, tierLabel);
}

function getPartSlotLabel(slot) {
  return lookupLocalizedValue('slots', slot, slot);
}

function getCategoryLabel(category) {
  const normalized = canonicalCategory(category);
  return lookupLocalizedValue('categories', normalized, normalized);
}

function getContainerLabel(container) {
  return lookupLocalizedValue('containers', container?.name, container?.name ?? '');
}

function getZoneLabel(zone) {
  if (!zone) {
    return '';
  }
  if (zone.nameZh || zone.nameEn) {
    return getLanguage() === 'zh' ? (zone.nameZh ?? zone.nameEn ?? zone.name ?? zone.id) : (zone.nameEn ?? zone.nameZh ?? zone.name ?? zone.id);
  }
  return lookupLocalizedValue('zones', zone?.name, zone?.name ?? '');
}

function getEnemyLabel(enemy) {
  return lookupLocalizedValue('enemyTypes', enemy?.type, enemy?.name ?? L('æäºº', 'Enemy'));
}

function getItemLabel(item) {
  if (!item) {
    return '';
  }
  if (item.itemType === 'ammo' && item.ammoId) {
    return L(`${getAmmoLabel(item.ammoId)} å­å¼¹ç`, `${getAmmoLabel(item.ammoId)} Box`);
  }
  if (item.itemType === 'part' && item.partId) {
    return getPartLabel(item.partId);
  }
  return lookupLocalizedValue('loot', item.id, item.name ?? item.id);
}

function formatMoney(value) {
  return `Â¥${Math.round(value).toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-US')}`;
}

function ensureExtendedRefs() {
  refs.armoryPanel ??= document.getElementById('armoryPanel');
  refs.mapLoadoutList ??= document.getElementById('mapLoadoutList');
  refs.mapAmmoList ??= document.getElementById('mapAmmoList');
  refs.raidSidePanel ??= document.getElementById('raidSidePanel');
  refs.raidLoadoutList ??= document.getElementById('raidLoadoutList');
  refs.raidAmmoRail ??= document.getElementById('raidAmmoRail');
  refs.raidBagList ??= document.getElementById('raidBagList');
  refs.languageSwitch ??= document.getElementById('languageSwitch');
  refs.langZhButton ??= document.getElementById('langZhButton');
  refs.langEnButton ??= document.getElementById('langEnButton');
}

function applyStaticLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('brand.name');
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key) {
      element.textContent = t(key);
    }
  }
  refs.langZhButton?.classList.toggle('is-active', getLanguage() === 'zh');
  refs.langEnButton?.classList.toggle('is-active', getLanguage() === 'en');
}

function applyLanguage() {
  ensureExtendedRefs();
  applyStaticLanguage();
  syncRaidPanelCollapses();
  renderBasePanel();
  if (state.raid) {
    syncHud();
    drawMinimap();
    if (state.overlay === 'loot') {
      const container = state.raid.containers.find((entry) => entry.id === state.ui.currentContainerId);
      if (container) {
        renderLootPanel(container);
      }
    }
    if (state.overlay === 'map') {
      drawFullMap();
    }
  }
  if (state.mode === 'result' && state.raid?.result) {
    renderRaidResultOverlay(state.raid.result);
  }
}

function setLanguage(language) {
  state.ui.language = language === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem('iron-extraction-language-v1', state.ui.language);
  } catch (error) {
    console.warn('Failed to persist language preference.', error);
  }
  applyLanguage();
}

function resetSave() {
  const resetDayKey = 'iron-extraction-reset-day-v1';
  const now = new Date();
  const dayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  let lastResetDay = '';
  try {
    lastResetDay = localStorage.getItem(resetDayKey) ?? '';
  } catch (error) {
    console.warn('Failed to read reset limiter.', error);
  }
  if (lastResetDay === dayKey) {
    notify(L('\u4eca\u5929\u5df2\u7ecf\u91cd\u7f6e\u8fc7\u4e00\u6b21\u5b58\u6863\uff0c\u8bf7\u660e\u5929\u518d\u8bd5\u3002', 'The save has already been reset once today. Try again tomorrow.'), 'warning');
    return false;
  }

  const password = window.prompt(L('\u8f93\u5165\u91cd\u7f6e\u5bc6\u7801\uff1a', 'Enter reset password:'));
  if (password == null) return false;
  if (password !== '20251001') {
    notify(L('\u91cd\u7f6e\u5bc6\u7801\u9519\u8bef\u3002', 'Incorrect reset password.'), 'danger');
    return false;
  }

  state.save = defaultSave();
  try {
    localStorage.setItem(resetDayKey, dayKey);
  } catch (error) {
    console.warn('Failed to persist reset limiter.', error);
  }
  persistSave();
  renderBasePanel();
  notify(L('\u672c\u5730\u5b58\u6863\u5df2\u91cd\u7f6e\u3002\u4eca\u5929\u4e0d\u80fd\u518d\u6b21\u91cd\u7f6e\u3002', 'Local save reset. Another reset is not allowed today.'), 'warning');
  return true;
}

function syncRaidPanelCollapses() {
  state.ui.raidPanelCollapsed ??= {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  for (const button of document.querySelectorAll('[data-collapse-target]')) {
    const targetId = button.dataset.collapseTarget;
    const target = document.getElementById(targetId);
    if (!target) {
      continue;
    }
    const collapsed = Boolean(state.ui.raidPanelCollapsed[targetId]);
    target.classList.toggle('is-collapsed', collapsed);
    button.textContent = collapsed ? L('å±å¼', 'Expand') : L('æ¶èµ·', 'Collapse');
    button.setAttribute('aria-expanded', String(!collapsed));
  }
}

function getAmmoTierLabel(ammoId) {
  const ammo = AMMO_DEFS[ammoId];
  return ammo ? `${getAmmoLabel(ammoId)} Â· ${getTierLabel(ammo.tierLabel)}` : L('æªç¥å¼¹è¯', 'Unknown ammo');
}

function describeWeaponLine(weapon) {
  return L(
    `${weapon.caliber} Â· ${weapon.magSize} åå¼¹å£ Â· ${weapon.fireRate.toFixed(1)} å/ç§`,
    `${weapon.caliber} Â· ${weapon.magSize}-round mag Â· ${weapon.fireRate.toFixed(1)} rps`,
  );
}

function itemActionButtons(item, scope = 'raid') {
  const buttons = [];
  if (scope === 'base') {
    return renderBaseItemActions(item);
  }
  if (item.itemType === 'usable') {
    buttons.push(`<button class="ghost-button small" type="button" data-bag-action="use" data-item-id="${item.uid}">${L('ä½¿ç¨', 'Use')}</button>`);
  }
  if (item.itemType === 'part' && item.partId && PART_DEFS[item.partId]?.compatibleWeapons.includes(state.raid?.player?.weapon)) {
    const equipped = Object.values(state.raid?.player?.tempAttachments ?? {}).includes(item.partId);
    buttons.push(`<button class="ghost-button small" type="button" data-bag-action="${equipped ? 'unequip' : 'equip'}" data-item-id="${item.uid}">${equipped ? L('å¸ä¸', 'Remove') : L('è£å¤', 'Equip')}</button>`);
  }
  if (item.itemType === 'ammo') {
    buttons.push(`<button class="ghost-button small" type="button" data-bag-action="load-ammo" data-item-id="${item.uid}">${L('è£å¡«åºå­', 'Load Reserve')}</button>`);
  }
  buttons.push(`<button class="ghost-button small" type="button" data-bag-action="drop" data-item-id="${item.uid}">${L('ä¸¢å¼', 'Drop')}</button>`);
  return buttons.join('');
}

function renderBaseItemActions(item) {
  const buttons = [];
  if (item.itemType === 'ammo') {
    buttons.push(`<button class="ghost-button small" type="button" data-stash-action="stock-ammo" data-stash-id="${item.uid}">${L('å¥å¼¹è¯åº', 'Stock Ammo')}</button>`);
  }
  if (item.itemType === 'part' && item.partId && !state.save.armory.ownedParts.includes(item.partId)) {
    buttons.push(`<button class="ghost-button small" type="button" data-stash-action="learn-part" data-stash-id="${item.uid}">${L('æ¶å¥åæ¢°åº', 'Store Part')}</button>`);
  }
  buttons.push(`<button class="ghost-button small" type="button" data-stash-action="discard" data-stash-id="${item.uid}">${L('ä¸¢å¼', 'Discard')}</button>`);
  buttons.push(`<button class="ghost-button small" type="button" data-stash-action="sell" data-stash-id="${item.uid}">${L('åºå®', 'Sell')}</button>`);
  return buttons.join('');
}

function describeUsableItem(item) {
  if (item.useAction === 'heal') {
    return L(`æ¢å¤ ${item.healAmount} ç¹çå½`, `Restore ${item.healAmount} health`);
  }
  if (item.useAction === 'medkit') {
    return L(`è¡¥å ${item.medkitAmount} ä¸ªå»çå`, `Add ${item.medkitAmount} medkit${item.medkitAmount === 1 ? '' : 's'}`);
  }
  if (item.useAction === 'armor') {
    return L(`ä¿®å¤ ${item.armorAmount} ç¹æ¤ç²`, `Restore ${item.armorAmount} armor`);
  }
  return L('å¯ä½¿ç¨', 'Usable');
}

function describePartBonus(part) {
  if (!part) {
    return L('é¶ä»¶', 'Part');
  }
  const stats = [];
  if (part.magBonus) {
    stats.push(L(`å¼¹å£ +${part.magBonus}`, `Magazine +${part.magBonus}`));
  }
  if (part.damageBonus) {
    stats.push(L(`ä¼¤å®³ +${part.damageBonus}`, `Damage +${part.damageBonus}`));
  }
  if (part.fireRateBonus) {
    stats.push(L(`å°é +${part.fireRateBonus.toFixed(2)}`, `Fire rate +${part.fireRateBonus.toFixed(2)}`));
  }
  if (part.reloadMult) {
    stats.push(L('æ´å¿«æ¢å¼¹', 'Faster reload'));
  }
  if (part.spreadMult) {
    stats.push(L('ç²¾åº¦æå', 'Tighter spread'));
  }
  return stats.join(' Â· ') || getPartSlotLabel(part.slot);
}

function itemMetaLine(item) {
  const details = [getCategoryLabel(item.category), formatWeight(item.weight), formatMoney(item.value)];
  if (item.itemType === 'usable') {
    details.push(describeUsableItem(item));
  }
  if (item.itemType === 'ammo' && item.ammoId) {
    details.push(L(`${getAmmoTierLabel(item.ammoId)} Â· ${item.rounds} å`, `${getAmmoTierLabel(item.ammoId)} Â· ${item.rounds} rnd`));
  }
  if (item.itemType === 'part' && item.partId) {
    details.push(describePartBonus(PART_DEFS[item.partId]));
  }
  return details.join(' Â· ');
}

function getShopEntries() {
  const entries = [
    {
      id: 'upgrade_bag',
      kind: 'upgrade',
      name: L('æ©å®¹èå', 'Expanded Bag'),
      description: L('æ°¸ä¹æåèåæ ¼æ°ä¸æ¿é', 'Permanently increases bag slots and carry weight'),
      price: 4200 + state.save.upgrades.bagLevel * 2600,
      status: state.save.upgrades.bagLevel >= MAX_BAG_LEVEL ? L('å·²æ»¡çº§', 'Maxed') : `Lv.${state.save.upgrades.bagLevel}`,
      disabled: state.save.upgrades.bagLevel >= MAX_BAG_LEVEL,
    },
    {
      id: 'upgrade_weapon',
      kind: 'upgrade',
      name: L('æªæºæ¹è£', 'Weapon Tuning'),
      description: L('æ°¸ä¹æåæ­¦å¨åºç¡ä¼¤å®³', 'Permanently increases base weapon damage'),
      price: 3800 + state.save.upgrades.weaponLevel * 2400,
      status: state.save.upgrades.weaponLevel >= MAX_WEAPON_LEVEL ? L('å·²æ»¡çº§', 'Maxed') : `Lv.${state.save.upgrades.weaponLevel}`,
      disabled: state.save.upgrades.weaponLevel >= MAX_WEAPON_LEVEL,
    },
  ];

  for (const weapon of Object.values(WEAPON_DEFS)) {
    if (weapon.id === 'rifle') {
      continue;
    }
    entries.push({
      id: `weapon_${weapon.id}`,
      kind: 'weapon',
      weaponId: weapon.id,
      name: getWeaponLabel(weapon.id),
      description: describeWeaponLine(weapon),
      price: weapon.unlockPrice,
      status: state.save.armory.ownedWeapons.includes(weapon.id)
        ? (getSelectedWeaponId() === weapon.id ? L('å·²è£å¤', 'Equipped') : L('å·²è§£é', 'Unlocked'))
        : L('æªè§£é', 'Locked'),
      disabled: false,
    });
  }

  for (const ammo of Object.values(AMMO_DEFS)) {
    entries.push({
      id: `ammo_${ammo.id}`,
      kind: 'ammo',
      ammoId: ammo.id,
      name: getAmmoLabel(ammo.id),
      description: L(
        `${ammo.caliber} Â· ${getTierLabel(ammo.tierLabel)} Â· ${ammo.packSize} å`,
        `${ammo.caliber} Â· ${getTierLabel(ammo.tierLabel)} Â· ${ammo.packSize} rounds`,
      ),
      price: ammo.price,
      status: L(`åºå­ ${state.save.prepAmmo[ammo.id] ?? 0}`, `Stock ${state.save.prepAmmo[ammo.id] ?? 0}`),
      disabled: false,
    });
  }

  for (const part of Object.values(PART_DEFS)) {
    entries.push({
      id: `part_${part.id}`,
      kind: 'part',
      partId: part.id,
      name: getPartLabel(part.id),
      description: `${getPartSlotLabel(part.slot)} Â· ${part.compatibleWeapons.map((id) => getWeaponLabel(id)).join(' / ')}`,
      price: part.price,
      status: state.save.armory.ownedParts.includes(part.id) ? L('å·²æ¥æ', 'Owned') : L('å¯è´­ä¹°', 'Available'),
      disabled: state.save.armory.ownedParts.includes(part.id),
    });
  }

  return entries;
}

function renderArmoryPanel(selectedWeaponId) {
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const stats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });
  const activeParts = getActivePartMapForWeapon(selectedWeaponId);
  const ownedWeapons = state.save.armory.ownedWeapons
    .map((weaponId) => {
      const weapon = WEAPON_DEFS[weaponId];
      return `
        <article class="stash-row">
          <div>
            <div class="item-title ${weaponId === selectedWeaponId ? 'rarity-uncommon' : ''}">${getWeaponLabel(weaponId)}</div>
            <div class="item-meta">${describeWeaponLine(weapon)}</div>
          </div>
          <button class="ghost-button small" type="button" data-armory-action="select-weapon" data-weapon-id="${weaponId}">
            ${weaponId === selectedWeaponId ? L('å·²è£å¤', 'Equipped') : L('è£å¤', 'Equip')}
          </button>
        </article>
      `;
    })
    .join('');

  const ammoChoices = getAmmoChoicesForWeapon(selectedWeaponId)
    .map((ammo) => `
      <article class="stash-row">
        <div>
          <div class="item-title ${ammo.id === selectedAmmoId ? 'rarity-uncommon' : ''}">${getAmmoLabel(ammo.id)}</div>
          <div class="item-meta">${L(`${ammo.caliber} Â· ${getTierLabel(ammo.tierLabel)} Â· åºå­ ${state.save.prepAmmo[ammo.id] ?? 0}`, `${ammo.caliber} Â· ${getTierLabel(ammo.tierLabel)} Â· stock ${state.save.prepAmmo[ammo.id] ?? 0}`)}</div>
        </div>
        <button class="ghost-button small" type="button" data-armory-action="select-ammo" data-weapon-id="${selectedWeaponId}" data-ammo-id="${ammo.id}">
          ${ammo.id === selectedAmmoId ? L('å·²éæ©', 'Selected') : L('åæ¢', 'Switch')}
        </button>
      </article>
    `)
    .join('');

  const ownedParts = Object.values(PART_DEFS)
    .filter((part) => state.save.armory.ownedParts.includes(part.id) && part.compatibleWeapons.includes(selectedWeaponId))
    .map((part) => `
      <article class="stash-row">
        <div>
          <div class="item-title ${activeParts[part.slot] === part.id ? 'rarity-rare' : ''}">${getPartLabel(part.id)}</div>
          <div class="item-meta">${describePartBonus(part)}</div>
        </div>
        <button class="ghost-button small" type="button" data-armory-action="${activeParts[part.slot] === part.id ? 'unequip-part' : 'equip-part'}" data-weapon-id="${selectedWeaponId}" data-part-id="${part.id}" data-part-slot="${part.slot}">
          ${activeParts[part.slot] === part.id ? L('å¸ä¸', 'Remove') : L('å®è£', 'Install')}
        </button>
      </article>
    `)
    .join('');

  return [
    prepRow(L('å½åä¸»æ­¦å¨', 'Current Weapon'), `${getWeaponLabel(selectedWeaponId)} Â· ${stats.damage} ${L('ä¼¤å®³', 'damage')}`),
    prepRow(L('å½åå­å¼¹ç­çº§', 'Current Ammo Tier'), getAmmoTierLabel(selectedAmmoId)),
    `<div class="section-note">${L('å·²æ¥ææ­¦å¨', 'Owned Weapons')}</div>${ownedWeapons}`,
    `<div class="section-note">${L('å­å¼¹åæ¢', 'Ammo Switching')}</div>${ammoChoices}`,
    `<div class="section-note">${L('å¯ç¨é¶ä»¶', 'Available Parts')}</div>${ownedParts || `<div class="item-meta">${L('å½åæ­¦å¨æ²¡æå¯ç¨çå·²æ¥æé¶ä»¶ã', 'No owned parts match the current weapon.')}</div>`}`,
  ].join('');
}

function renderBasePanel() {
  ensureExtendedRefs();
  refs.basePanel.classList.toggle('hidden', state.mode !== 'base');
  const survivalRate = state.save.stats.raids > 0
    ? `${Math.round((state.save.stats.survived / state.save.stats.raids) * 100)}%`
    : '--';
  const selectedWeaponId = getSelectedWeaponId();
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const selectedStats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });

  refs.summaryStrip.innerHTML = [
    summaryPill(L('èµé', 'Funds'), formatMoney(state.save.money)),
    summaryPill(L('ä»åº', 'Stash'), formatItemCount(state.save.stash.length)),
    summaryPill(L('æ¤ç¦»ç', 'Survival'), survivalRate),
    summaryPill(L('æé«å¸¦åº', 'Best Haul'), formatMoney(state.save.stats.bestHaul)),
  ].join('');

  refs.loadoutPrep.innerHTML = [
    prepRow(L('åºå»æ­¦å¨', 'Raid Weapon'), `${getWeaponLabel(selectedWeaponId)} Â· ${selectedStats.caliber}`),
    prepRow(L('é¦éå­å¼¹', 'Preferred Ammo'), L(`${getAmmoTierLabel(selectedAmmoId)} Â· åºå­ ${state.save.prepAmmo[selectedAmmoId] ?? 0}`, `${getAmmoTierLabel(selectedAmmoId)} Â· stock ${state.save.prepAmmo[selectedAmmoId] ?? 0}`)),
    prepRow(L('åå§å»çå', 'Starting Medkits'), `${BASE_MEDKITS + state.save.prep.medkitBonus}`),
    prepRow(L('åå§æ¤ç²', 'Starting Armor'), `${BASE_ARMOR + state.save.prep.armorBonus}`),
    prepRow(L('èåå®¹é', 'Bag Capacity'), `${getBagSlots()} ${L('æ ¼', 'slots')} / ${formatWeight(getBagCapacity())}`),
    prepRow(L('æ­¦å¨ä¼¤å®³', 'Weapon Damage'), `${selectedStats.damage}`),
  ].join('');

  if (refs.armoryPanel) {
    refs.armoryPanel.innerHTML = renderArmoryPanel(selectedWeaponId);
  }

  refs.shopList.innerHTML = getShopEntries()
    .map((entry) => {
      const afford = state.save.money >= entry.price && !entry.disabled;
      return `
        <article class="shop-row">
          <div>
            <div class="item-title">${entry.name}</div>
            <div class="item-meta">${entry.description}</div>
            <div class="item-meta">${entry.status}</div>
          </div>
          <div class="stack-list">
            <button class="primary-button small" type="button" data-shop-id="${entry.id}" ${afford ? '' : 'disabled'}>
              ${entry.disabled ? L('å·²æ¥æ', 'Owned') : formatMoney(entry.price)}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  refs.stashList.innerHTML = state.save.stash.length
    ? state.save.stash
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${getItemLabel(item)}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${renderBaseItemActions(item)}
            </div>
          </article>
        `)
        .join('')
    : `<div class="item-meta">${L('ä»åºéè¿æ²¡æå¸¦åºæ¥çæå©åãæ¤ç¦»æååï¼ç©èµãå­å¼¹åæªæ¢°é¶ä»¶é½ä¼åºç°å¨è¿éã', 'The stash is empty. Loot, ammo, and weapon parts show up here after a successful extraction.')}</div>`;
}

function buyShopEntry(id) {
  const entry = getShopEntries().find((item) => item.id === id);
  if (!entry || entry.disabled) {
    return;
  }
  if (state.save.money < entry.price) {
    notify(L('èµéä¸è¶³ã', 'Not enough funds.'), 'danger');
    return;
  }

  state.save.money -= entry.price;
  if (id === 'prep_medkit') {
    state.save.prep.medkitBonus += 1;
  } else if (id === 'prep_surgical') {
    state.save.prep.medkitBonus += 2;
  } else if (id === 'prep_armor') {
    state.save.prep.armorBonus += 35;
  } else if (id === 'upgrade_bag') {
    state.save.upgrades.bagLevel += 1;
  } else if (id === 'upgrade_weapon') {
    state.save.upgrades.weaponLevel += 1;
  } else if (entry.kind === 'weapon' && entry.weaponId) {
    if (!state.save.armory.ownedWeapons.includes(entry.weaponId)) {
      state.save.armory.ownedWeapons.push(entry.weaponId);
      state.save.armory.selectedAmmoByWeapon[entry.weaponId] = WEAPON_DEFS[entry.weaponId].defaultAmmoId;
      state.save.armory.equippedPartsByWeapon[entry.weaponId] = {};
    }
  } else if (entry.kind === 'ammo' && entry.ammoId) {
    state.save.prepAmmo[entry.ammoId] = (state.save.prepAmmo[entry.ammoId] ?? 0) + (AMMO_DEFS[entry.ammoId]?.packSize ?? 0);
  } else if (entry.kind === 'part' && entry.partId) {
    if (!state.save.armory.ownedParts.includes(entry.partId)) {
      state.save.armory.ownedParts.push(entry.partId);
    }
  }

  persistSave();
  renderBasePanel();
  notify(L(`å·²è´­ä¹° ${entry.name}ã`, `Purchased ${entry.name}.`), 'success');
}

function sellItem(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const [item] = state.save.stash.splice(index, 1);
  state.save.money += item.value;
  persistSave();
  renderBasePanel();
  notify(L(`å·²åºå® ${getItemLabel(item)}ï¼è·å¾ ${formatMoney(item.value)}ã`, `Sold ${getItemLabel(item)} for ${formatMoney(item.value)}.`), 'success');
}

function discardStashItem(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const [item] = state.save.stash.splice(index, 1);
  persistSave();
  renderBasePanel();
  notify(L(`å·²ä¸¢å¼ ${getItemLabel(item)}ã`, `Discarded ${getItemLabel(item)}.`), 'warning');
}

function stockAmmoFromStash(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const item = state.save.stash[index];
  if (item.itemType !== 'ammo' || !item.ammoId) {
    return;
  }
  state.save.prepAmmo[item.ammoId] = (state.save.prepAmmo[item.ammoId] ?? 0) + item.rounds;
  state.save.stash.splice(index, 1);
  persistSave();
  renderBasePanel();
  notify(L(`å·²å° ${getItemLabel(item)} å­å¥å¼¹è¯åºã`, `Moved ${getItemLabel(item)} into ammo storage.`), 'success');
}

function learnPartFromStash(uid) {
  const index = state.save.stash.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }
  const item = state.save.stash[index];
  if (item.itemType !== 'part' || !item.partId || state.save.armory.ownedParts.includes(item.partId)) {
    return;
  }
  state.save.armory.ownedParts.push(item.partId);
  state.save.stash.splice(index, 1);
  persistSave();
  renderBasePanel();
  notify(L(`å·²å° ${getItemLabel(item)} æ¶å¥åæ¢°åºã`, `Stored ${getItemLabel(item)} in the armory.`), 'success');
}

function sellAllStash() {
  if (!state.save.stash.length) {
    notify(L('ä»åºéæ²¡æå¯åºå®çç©åã', 'There is nothing in the stash to sell.'), 'warning');
    return;
  }
  const total = state.save.stash.reduce((sum, item) => sum + item.value, 0);
  const count = state.save.stash.length;
  state.save.money += total;
  state.save.stash = [];
  persistSave();
  renderBasePanel();
  notify(L(`å·²åºå® ${count} ä»¶ç©åï¼è·å¾ ${formatMoney(total)}ã`, `Sold ${formatItemCount(count)} for ${formatMoney(total)}.`), 'success');
}

function getRaidObjectiveStatus(raid = state.raid) {
  const objectives = raid?.objectives ?? [];
  if (!objectives.length) {
    const standardZone = raid?.extractions?.find((zone) => zone.kind === 'standard');
    const switchZone = raid?.extractions?.find((zone) => zone.kind === 'switch');
    const standardText = standardZone && isExtractionCurrentlyAvailable(standardZone, raid)
      ? L('æ®éæ¤ç¦»å¼æ¾', 'Standard open')
      : L('æ®éæ¤ç¦»å³é­', 'Standard closed');
    let switchText = L('æé¸æ¤ç¦»å¾å¼å¯', 'Lever exit idle');
    if (switchZone?.switchArmed && (switchZone.switchTimer ?? 0) > 0) {
      switchText = L(`æé¸æ¤ç¦» ${Math.ceil(switchZone.switchTimer)}s`, `Lever exit ${Math.ceil(switchZone.switchTimer)}s`);
    } else if (switchZone?.switchExpired) {
      switchText = L('æé¸æ¤ç¦»å³é­', 'Lever exit closed');
    }
    return `${standardText} | ${switchText}`;
  }
  return objectives
    .map((objective) => `${objective.id === 'search' ? L('æç´¢', 'Search') : L('æ¸æ', 'Clear')} ${objective.progress}/${objective.target}`)
    .join(' | ');
}

function advanceRaidObjective(objectiveId, amount = 1) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const objective = raid.objectives?.find((entry) => entry.id === objectiveId);
  if (!objective || objective.progress >= objective.target) {
    return;
  }
  objective.progress = Math.min(objective.target, objective.progress + amount);
  if (!raid.tasksComplete && areRaidObjectivesComplete(raid)) {
    raid.tasksComplete = true;
    notify(L('ä»»å¡å®æï¼æ¤ç¦»å·²è§£éã', 'Tasks complete. Extraction unlocked.'), 'success');
  }
}

function startRaid() {
  clearRaid();
  ensureExtendedRefs();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();

  state.save.stats.raids += 1;
  const activeExtractionIds = shuffle(extractionZones.map((zone) => zone.id)).slice(0, 2);
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus;
  const ammoInventory = defaultPrepAmmo();
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    timeLeft: RAID_DURATION,
    statusText: L('WASD ç§»å¨ï¼é¼ æ è½¬åï¼æ F å¼ç«ã', 'WASD to move, mouse to look, press F to fire.'),
    interactionText: L('åå®ææç´¢åæ¸æä»»å¡ï¼åå»æ¤ç¦»ç¹ã', 'Finish the search and kill tasks before heading to extraction.'),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: false,
    extractionSequence: null,
    objectives: [
      { id: 'search', label: 'search', target: 2, progress: 0 },
      { id: 'kill', label: 'kill', target: 2, progress: 0 },
    ],
    player: {
      x: -4,
      z: 0,
      yaw: 2.9,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      radius: PLAYER_RADIUS,
      health: 100,
      maxHealth: 100,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: extractionZones.map((zone) => ({
      ...zone,
      active: activeExtractionIds.includes(zone.id),
      visual: null,
      pulse: Math.random() * Math.PI * 2,
    })),
    enemies: shuffle(enemySpawnDefs)
      .slice(0, 8)
      .map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(L('å·²è¿å¥å°éåºãå®æä»»å¡åæè½æ¤ç¦»ã', 'Raid started. Finish the tasks to unlock extraction.'), 'success');
}

function updateRaid(dt) {
  const raid = state.raid;
  const player = raid.player;

  if (viewModel) {
    viewModel.root.setEnabled(true);
  }

  if (state.overlay) {
    syncPlayerCamera();
    animateRaidEntities(dt, true);
    syncHud();
    return;
  }

  raid.timeLeft = Math.max(0, raid.timeLeft - dt);
  if (raid.timeLeft <= 0) {
    finishRaid(false, 'time_expired', false);
    return;
  }

  const previousReload = player.reloadTimer;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.reloadTimer = Math.max(0, player.reloadTimer - dt);
  player.healTimer = Math.max(0, player.healTimer - dt);
  player.damageFlash = Math.max(0, player.damageFlash - dt * 2.4);
  player.recoilKick = Math.max(0, (player.recoilKick ?? 0) - dt * 6.6);
  player.damageJolt = Math.max(0, (player.damageJolt ?? 0) - dt * 4.4);
  player.nearHitPulse = Math.max(0, (player.nearHitPulse ?? 0) - dt * 3.4);
  raid.hitConfirmTimer = Math.max(0, (raid.hitConfirmTimer ?? 0) - dt * 4.8);

  if (previousReload > 0 && player.reloadTimer === 0) {
    completeReload();
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateEffects(dt);
  animateRaidEntities(dt, false);
  syncPlayerCamera();
  syncHud();

  refs.timeValue.style.color = raid.timeLeft < 45 ? '#f0c57d' : '';
}

function getReserveAmmoLabel(player) {
  const ammo = getCurrentAmmoInfo(player);
  return `${player.ammoInMag} / ${getCurrentReserveAmmo(player)} Â· ${ammo ? getAmmoLabel(ammo.id) : L('æªç¥å¼¹è¯', 'Unknown ammo')}`;
}

function renderRaidLoadoutMarkup() {
  const player = state.raid?.player;
  if (!player) {
    return '';
  }
  const stats = getCurrentPlayerWeaponStats(player);
  const partLines = getActivePartIds(player.weapon, player)
    .map((partId) => getPartLabel(partId))
    .filter(Boolean);
  return [
    prepRow(L('å½åæ­¦å¨', 'Current Weapon'), `${getWeaponLabel(player.weapon)} Â· ${stats.damage} ${L('ä¼¤å®³', 'damage')}`),
    prepRow(L('å½åå­å¼¹', 'Current Ammo'), getAmmoTierLabel(player.currentAmmoId)),
    prepRow(L('å¼¹å£ / å¤å¼¹', 'Mag / Reserve'), getReserveAmmoLabel(player)),
    prepRow(L('æªæ¢°é¶ä»¶', 'Weapon Parts'), partLines.length ? partLines.join(' / ') : L('æ ', 'None')),
  ].join('');
}

function renderRaidAmmoMarkup() {
  const player = state.raid?.player;
  if (!player) {
    return '';
  }
  return getAmmoChoicesForWeapon(player.weapon)
    .map((ammo) => `
      <article class="stash-row">
        <div>
          <div class="item-title ${player.currentAmmoId === ammo.id ? 'rarity-uncommon' : ''}">${getAmmoLabel(ammo.id)}</div>
          <div class="item-meta">${L(`${ammo.caliber} Â· ${getTierLabel(ammo.tierLabel)} Â· åºå­ ${getCurrentReserveAmmo(player, ammo.id)} å`, `${ammo.caliber} Â· ${getTierLabel(ammo.tierLabel)} Â· reserve ${getCurrentReserveAmmo(player, ammo.id)} rounds`)}</div>
        </div>
        <button class="ghost-button small" type="button" data-raid-ammo="${ammo.id}">
          ${player.currentAmmoId === ammo.id ? L('æ­£å¨ä½¿ç¨', 'In Use') : L('åæ¢', 'Switch')}
        </button>
      </article>
    `)
    .join('');
}

function syncHud() {
  ensureExtendedRefs();
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const player = raid.player;
  const activeOperator = getPlayerOperatorDef(player);
  refs.healthValue.textContent = Math.round(player.health) + ' / ' + player.maxHealth;
  refs.weaponValue.textContent = getWeaponLabel(player.weapon);
  refs.armorValue.textContent = Math.round(player.armor) + ' / ' + player.maxArmor;
  refs.ammoValue.textContent = getReserveAmmoLabel(player);
  refs.medkitValue.textContent = String(player.medkits);
  refs.bagValue.textContent = raid.bag.length + ' / ' + getBagSlots();
  refs.weightValue.textContent = formatWeight(raid.bagWeight) + ' / ' + formatWeight(getBagCapacity());
  refs.haulValue.textContent = formatMoney(raid.bagValue);
  refs.timeValue.textContent = formatTime(raid.timeLeft);
  refs.hud.dataset.playerX = player.x.toFixed(2);
  refs.hud.dataset.playerZ = player.z.toFixed(2);
  refs.hud.dataset.playerYaw = player.yaw.toFixed(2);
  refs.hud.dataset.tasksComplete = String(raid.tasksComplete);

  refs.extractList.textContent = buildExtractionHeaderText(raid);
  const threatInfo = getRaidThreatInfo(raid);
  const abilityUi = getOperatorAbilityUiState(player);
  if (refs.objectiveValue) {
    refs.objectiveValue.textContent = getRaidObjectiveStatus(raid);
    refs.objectiveValue.style.color = raid.tasksComplete ? '#8fd6b3' : '';
  }
  if (refs.objectiveDetail) {
    refs.objectiveDetail.textContent = getRaidObjectiveDetailText(raid);
  }
  if (refs.threatValue) {
    refs.threatValue.textContent = threatInfo.label;
    refs.threatValue.style.color = threatInfo.color;
  }
  if (refs.abilityValue) {
    refs.abilityValue.textContent = abilityUi.summary;
    refs.abilityValue.style.color = abilityUi.color;
  }
  if (refs.abilityDetail) {
    refs.abilityDetail.textContent = abilityUi.detail;
  }
  if (refs.abilityMeterFill) {
    refs.abilityMeterFill.style.width = `${Math.round(clamp(abilityUi.fill, 0, 1) * 100)}%`;
    refs.abilityMeterFill.style.background = abilityUi.color;
  }

  let status = getRaidDefaultStatusText(raid) || L('\u9f20\u6807\u63a7\u5236\u89c6\u89d2\uff0cF \u5f00\u706b\uff0cE \u4ea4\u4e92\u3002', 'Mouse looks, F fires, E interacts.');
  if (raid.switchSequence) {
    status = L('\u62c9\u95f8\u4e2d ' + raid.switchSequence.timer.toFixed(1) + 's', 'Pulling lever ' + raid.switchSequence.timer.toFixed(1) + 's');
  } else if (player.reloadTimer > 0) {
    status = L('\u6362\u5f39\u4e2d ' + player.reloadTimer.toFixed(1) + 's', 'Reloading ' + player.reloadTimer.toFixed(1) + 's');
  } else if (player.healTimer > 0 && player.useAction) {
    status = L(player.useAction.labelZh, player.useAction.labelEn) + ' ' + player.healTimer.toFixed(1) + 's';
  } else if (player.healTimer > 0) {
    status = L('\u4f7f\u7528\u4e2d ' + player.healTimer.toFixed(1) + 's', 'Using ' + player.healTimer.toFixed(1) + 's');
  } else if (player.extractionProgress > 0) {
    status = L(
      '\u64a4\u79bb\u4e2d ' + Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1) + ' / ' + EXTRACTION_HOLD_TIME + 's',
      'Extracting ' + Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1) + ' / ' + EXTRACTION_HOLD_TIME + 's'
    );
  }
  refs.raidStatus.textContent = status;
  refs.interactionPrompt.textContent = raid.interactionText;
  if (refs.supportPrompt) {
    refs.supportPrompt.textContent = buildSupportPromptText(raid);
  }

  const loadoutMarkup = renderRaidLoadoutMarkup();
  const ammoMarkup = renderRaidAmmoMarkup();
  setMarkupIfChanged(refs.mapLoadoutList, loadoutMarkup);
  setMarkupIfChanged(refs.raidLoadoutList, loadoutMarkup);
  setMarkupIfChanged(refs.mapAmmoList, ammoMarkup);
  setMarkupIfChanged(refs.raidAmmoRail, ammoMarkup);
  syncRaidPanelCollapses();
  renderBagList();
  renderBagGrid();
  renderMapExtractionList();
}

function updatePlayer(dt) {
  const raid = state.raid;
  const player = raid.player;
  const forward = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
  const right = { x: Math.cos(player.yaw), z: -Math.sin(player.yaw) };

  let moveX = 0;
  let moveZ = 0;
  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
    moveX -= right.x;
    moveZ -= right.z;
  }
  if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
    moveX += right.x;
    moveZ += right.z;
  }

  const movement = normalize2D(moveX, moveZ);
  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const speed = sprinting ? 9.2 : 5.8;

  moveEntityWithCollision(player, movement.x * speed * dt, movement.z * speed * dt, player.radius);
  player.velocityBob += magnitude(movement.x, movement.z) * (sprinting ? 18 : 11) * dt;

  if (state.input.fireHeld) {
    attemptShoot();
  }

  const interaction = getCurrentInteraction();
  if (interaction?.type === 'extract' && state.input.interactHeld) {
    if (!raid.tasksComplete) {
      player.extractionProgress = 0;
      raid.interactionText = L(`åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Finish tasks first: ${getRaidObjectiveStatus(raid)}`);
    } else {
      player.extractionZoneId = interaction.zone.id;
      player.extractionProgress += dt;
      raid.interactionText = L(
        `æ­£å¨ä» ${getZoneLabel(interaction.zone)} æ¤ç¦» ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`,
        `Extracting at ${getZoneLabel(interaction.zone)} ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`,
      );
      if (player.extractionProgress >= EXTRACTION_HOLD_TIME) {
        finishRaid(true, `extract:${interaction.zone.id}`, true);
        return;
      }
    }
  } else {
    player.extractionProgress = Math.max(0, player.extractionProgress - dt * 2.6);
    player.extractionZoneId = null;
  }

  if (interaction?.type === 'container') {
    raid.interactionText = L(`æ E æç´¢ ${getContainerLabel(interaction.container)}`, `Press E to search ${getContainerLabel(interaction.container)}`);
  } else if (interaction?.type === 'extract') {
    raid.interactionText = raid.tasksComplete
      ? L(`æä½ E ä» ${getZoneLabel(interaction.zone)} æ¤ç¦»`, `Hold E to extract from ${getZoneLabel(interaction.zone)}`)
      : L(`åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Finish tasks first: ${getRaidObjectiveStatus(raid)}`);
  } else {
    raid.interactionText = raid.tasksComplete
      ? L('å¯ä»¥ç»§ç»­æç´¢æå©åï¼æèåå¾æ¤ç¦»ç¹ã', 'Search for loot or head to an extraction point.')
      : L(`å½åä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Current tasks: ${getRaidObjectiveStatus(raid)}`);
  }

  if (player.health <= 0) {
    finishRaid(false, 'player_killed', false);
  }
}

function attemptShoot() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  const weapon = getCurrentPlayerWeaponStats(player);
  if (player.fireCooldown > 0 || player.reloadTimer > 0 || player.healTimer > 0) {
    return;
  }
  if (player.ammoInMag <= 0) {
    if (getCurrentReserveAmmo(player) > 0) {
      reloadWeapon();
    } else {
      notify(L('å½åå­å¼¹å·²ç»æç©ºã', 'The current ammo is empty.'), 'danger');
    }
    return;
  }

  player.fireCooldown = 1 / weapon.fireRate;
  player.ammoInMag -= 1;
  if (viewModel) {
    viewModel.flashTimer = 1;
    viewModel.smokeTimer = 1;
    viewModel.recoil = Math.min(1.35, (viewModel.recoil ?? 0) + (weapon.pellets > 1 ? 1.05 : 0.72));
  }
  player.recoilKick = Math.min(1.2, (player.recoilKick ?? 0) + (weapon.pellets > 1 ? 1.04 : 0.62));
  player.pitch = clamp(player.pitch - (weapon.pellets > 1 ? 0.018 : 0.008), -1.16, 1.16);
  playGunshotAudio(weapon, { gain: 1 });

  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const baseSpread = sprinting ? weapon.spread * 1.8 : weapon.spread;
  const pelletCount = weapon.pellets ?? 1;
  const origin = new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z);
  let tracerEnd = null;

  for (let pellet = 0; pellet < pelletCount; pellet += 1) {
    const spread = pelletCount > 1 ? baseSpread : baseSpread * 0.8;
    const yaw = player.yaw + randomBetween(-spread, spread);
    const pitch = player.pitch + randomBetween(-spread * 0.65, spread * 0.65);
    const direction = new BABYLON.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(-pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    if (pellet === 0) {
      spawnMuzzleExhaust(origin, direction);
    }
    const ray = new BABYLON.Ray(origin, direction, weapon.range);
    const pick = scene.pickWithRay(ray, (mesh) => Boolean(mesh?.metadata?.raycastTarget));
    let end = origin.add(direction.scale(weapon.range * 0.7));

    if (pick?.hit && pick.pickedPoint) {
      end = pick.pickedPoint;
      if (pick.pickedMesh?.metadata?.raycastTarget === 'enemy') {
        const enemy = state.raid.enemies.find((entry) => entry.id === pick.pickedMesh.metadata.enemyId);
        if (enemy && !enemy.dead) {
          damageEnemy(enemy, getWeaponDamage(player.weapon, { ammoId: player.currentAmmoId, player }));
        }
      } else {
        spawnImpactBurst(end, '#8ad8ff', weapon.pellets > 1 ? 1 : 0.78, 'hard');
        playImpactAudio(end, 'hard');
      }
    }
    tracerEnd ??= end;
  }

  spawnTracer(origin, tracerEnd ?? origin, weapon.tracer, 0.08);
}

function completeReload() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  const needed = player.magSize - player.ammoInMag;
  const reserve = getCurrentReserveAmmo(player);
  const loaded = Math.min(needed, reserve);
  player.ammoInMag += loaded;
  player.ammoInventory[player.currentAmmoId] = reserve - loaded;
  playReloadAudio(getCurrentPlayerWeaponStats(player), true);
  notify(L('æ¢å¼¹å®æã', 'Reload complete.'), 'success');
}

function useMedkit() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  if (player.medkits <= 0) {
    notify(L('æ²¡æå»çåã', 'No medkits available.'), 'warning');
    return;
  }
  if (player.health >= player.maxHealth || player.healTimer > 0) {
    return;
  }
  player.medkits -= 1;
  player.health = Math.min(player.maxHealth, player.health + PLAYER_HEAL_AMOUNT);
  player.healTimer = PLAYER_HEAL_COOLDOWN;
  player.damageFlash = 0;
  notify(L('å·²ä½¿ç¨å»çåã', 'Medkit used.'), 'success');
}

function getUsableItemDuration(item, player = state.raid?.player) {
  const baseTime = Number(item?.useTime ?? 0);
  const actionTime =
    item?.useAction === 'armor' ? 2.4 :
    item?.useAction === 'medkit' ? 1.6 :
    item?.useAction === 'heal' ? 1.4 :
    1.2;
  const duration = Math.max(0.8, baseTime || actionTime);
  if (item?.useAction === 'heal' || item?.useAction === 'medkit') {
    return duration * (getPlayerOperatorDef(player).healCooldownMult ?? 1);
  }
  return duration;
}

function spawnUseActionPulse(player, action) {
  if (!state.raid || !player || !action) {
    return;
  }
  const flavor = action.flavor ?? 'heal';
  const color = flavor === 'armor' ? '#93c9ff' : flavor === 'medkit' ? '#82f2b2' : '#72d9ff';
  spawnPulse(new BABYLON.Vector3(player.x, 0.9, player.z), color, 0.14, 0.34);
  const smokeColor = flavor === 'armor' ? '#c8d6e4' : '#86e5a9';
  spawnSmokePuff(
    new BABYLON.Vector3(player.x + randomBetween(-0.2, 0.2), 0.72, player.z + randomBetween(-0.2, 0.2)),
    smokeColor,
    0.14,
    0.42,
    new BABYLON.Vector3(randomBetween(-0.04, 0.04), randomBetween(0.08, 0.14), randomBetween(-0.04, 0.04)),
  );
}

function beginPlayerUseAction(config) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player || !config) {
    return false;
  }
  if (player.healTimer > 0 || player.reloadTimer > 0 || raid.switchSequence) {
    return false;
  }
  player.healTimer = Math.max(0.8, config.duration ?? 1.2);
  player.useAction = {
    flavor: config.flavor ?? 'heal',
    labelZh: config.labelZh ?? '???',
    labelEn: config.labelEn ?? 'Using',
    onComplete: config.onComplete ?? null,
    duration: Math.max(0.8, config.duration ?? 1.2),
  };
  player.useActionPulseTimer = 0;
  state.input.fireHeld = false;
  state.input.aimHeld = false;
  playUseActionAudio({ x: player.x, z: player.z }, player.useAction.flavor, false);
  spawnUseActionPulse(player, player.useAction);
  return true;
}

function finishPlayerUseAction(player = state.raid?.player) {
  if (!player?.useAction) {
    return;
  }
  const action = player.useAction;
  player.useAction = null;
  player.useActionPulseTimer = 0;
  action.onComplete?.();
  playUseActionAudio({ x: player.x, z: player.z }, action.flavor, true);
}

function applyUsableItemToPlayer(item, options = {}) {
  const player = state.raid?.player;
  if (!player) {
    return false;
  }
  if (item.useAction === 'heal') {
    if (player.health >= player.maxHealth) {
      return false;
    }
    return beginPlayerUseAction({
      duration: getUsableItemDuration(item, player),
      flavor: 'heal',
      labelZh: '\u4f7f\u7528 ' + getItemLabel(item),
      labelEn: 'Using ' + getItemLabel(item),
      onComplete: () => {
        player.health = Math.min(player.maxHealth, player.health + item.healAmount);
        options.onConsume?.();
        notify(L('\u5df2\u4f7f\u7528 ' + getItemLabel(item) + '\u3002', 'Used ' + getItemLabel(item) + '.'), 'success');
      },
    });
  }
  if (item.useAction === 'medkit') {
    return beginPlayerUseAction({
      duration: getUsableItemDuration(item, player),
      flavor: 'medkit',
      labelZh: '\u6574\u7406 ' + getItemLabel(item),
      labelEn: 'Packing ' + getItemLabel(item),
      onComplete: () => {
        player.medkits += item.medkitAmount;
        options.onConsume?.();
        notify(L('\u5df2\u65b0\u589e ' + item.medkitAmount + ' \u4e2a\u533b\u7597\u5305\u3002', 'Added ' + item.medkitAmount + ' medkit' + (item.medkitAmount === 1 ? '' : 's') + '.'), 'success');
      },
    });
  }
  if (item.useAction === 'armor') {
    if (player.armor >= player.maxArmor) {
      return false;
    }
    return beginPlayerUseAction({
      duration: getUsableItemDuration(item, player),
      flavor: 'armor',
      labelZh: '\u7ef4\u4fee ' + getItemLabel(item),
      labelEn: 'Repairing with ' + getItemLabel(item),
      onComplete: () => {
        player.armor = Math.min(player.maxArmor, player.armor + item.armorAmount);
        options.onConsume?.();
        notify(L('\u5df2\u6062\u590d ' + item.armorAmount + ' \u70b9\u62a4\u7532\u3002', 'Restored ' + item.armorAmount + ' armor.'), 'success');
      },
    });
  }
  return false;
}
function loadAmmoItemToRaid(item) {
  const player = state.raid?.player;
  if (!player || item.itemType !== 'ammo' || !item.ammoId) {
    return false;
  }
  player.ammoInventory[item.ammoId] = (player.ammoInventory[item.ammoId] ?? 0) + item.rounds;
  notify(L(`å·²è£å¡« ${item.rounds} å ${getAmmoLabel(item.ammoId)}ã`, `Loaded ${item.rounds} rounds of ${getAmmoLabel(item.ammoId)}.`), 'success');
  return true;
}

function equipPartItemToRaid(item) {
  const player = state.raid?.player;
  const part = PART_DEFS[item.partId];
  if (!player || !part || !part.compatibleWeapons.includes(player.weapon)) {
    return false;
  }
  player.tempAttachments[part.slot] = part.id;
  const stats = getCurrentPlayerWeaponStats(player);
  player.magSize = stats.magSize;
  player.ammoInMag = Math.min(player.ammoInMag, player.magSize);
  notify(L(`å·²è£å¤ ${getPartLabel(part.id)}ã`, `Equipped ${getPartLabel(part.id)}.`), 'success');
  return true;
}

function unequipPartItemFromRaid(item) {
  const player = state.raid?.player;
  const part = PART_DEFS[item.partId];
  if (!player || !part) {
    return false;
  }
  if (player.tempAttachments[part.slot] === part.id) {
    delete player.tempAttachments[part.slot];
    const stats = getCurrentPlayerWeaponStats(player);
    player.magSize = stats.magSize;
    player.ammoInMag = Math.min(player.ammoInMag, player.magSize);
    notify(L(`å·²å¸ä¸ ${getPartLabel(part.id)}ã`, `Removed ${getPartLabel(part.id)}.`), 'warning');
    return true;
  }
  return false;
}

function openLootPanel(container) {
  if (!container) {
    return;
  }
  const firstOpen = !container.opened;
  if (!container.opened) {
    container.opened = true;
    if (!container.id.startsWith('drop-')) {
      advanceRaidObjective('search', 1);
    }
  }
  if (firstOpen) {
    playContainerOpenAudio({ x: container.x, z: container.z });
  }
  state.overlay = 'loot';
  state.ui.currentContainerId = container.id;
  refs.lootPanel.classList.remove('hidden');
  refs.lootTitle.textContent = getContainerLabel(container);
  renderLootPanel(container);
  releasePointerLock();
}

function renderLootPanel(container) {
  const bagSpace = `${state.raid.bag.length}/${getBagSlots()} ${L('æ ¼', 'slots')}`;
  refs.lootTitle.textContent = getContainerLabel(container);
  refs.lootMeta.textContent = L(
    `åå®¹ç© ${container.items.length} ä»¶ Â· å½åèå ${bagSpace} Â· éé ${formatWeight(state.raid.bagWeight)} / ${formatWeight(getBagCapacity())}`,
    `${container.items.length} items Â· bag ${bagSpace} Â· weight ${formatWeight(state.raid.bagWeight)} / ${formatWeight(getBagCapacity())}`,
  );
  refs.lootItems.innerHTML = container.items.length
    ? container.items
        .map((item) => `
          <article class="loot-item">
            <div>
              <div class="item-title rarity-${item.rarity}">${getItemLabel(item)}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              <button class="ghost-button small" type="button" data-loot-action="take" data-loot-id="${item.uid}">${L('æ¿èµ°', 'Take')}</button>
              ${item.itemType === 'usable' ? `<button class="ghost-button small" type="button" data-loot-action="use" data-loot-id="${item.uid}">${L('ç´æ¥ä½¿ç¨', 'Use now')}</button>` : ''}
              ${item.itemType === 'part' && PART_DEFS[item.partId]?.compatibleWeapons.includes(state.raid.player.weapon) ? `<button class="ghost-button small" type="button" data-loot-action="equip" data-loot-id="${item.uid}">${L('ç´æ¥è£å¤', 'Equip now')}</button>` : ''}
              ${item.itemType === 'ammo' ? `<button class="ghost-button small" type="button" data-loot-action="load" data-loot-id="${item.uid}">${L('ç´æ¥è£å¡«', 'Load now')}</button>` : ''}
            </div>
          </article>
        `)
        .join('')
    : `<div class="item-meta">${L('è¿ä¸ªå®¹å¨å·²ç»ç©ºäºã', 'This container is empty.')}</div>`;
}

function takeLoot(containerId, itemId) {
  const container = state.raid?.containers.find((entry) => entry.id === containerId);
  if (!container) {
    return;
  }
  const index = container.items.findIndex((item) => item.uid === itemId);
  if (index === -1) {
    return;
  }
  const item = normalizeItemInstance(container.items[index]);
  if (!canCarry(item)) {
    notify(L('èåç©ºé´æééä¸è¶³ã', 'Not enough bag space or carry weight.'), 'warning');
    return;
  }
  container.items.splice(index, 1);
  container.opened = true;
  addItemToBag(item);
  renderLootPanel(container);
  syncHud();
  notify(L(`å·²æ¿èµ· ${getItemLabel(item)}ã`, `Picked up ${getItemLabel(item)}.`), 'success');
}

function renderBagList() {
  const bag = state.raid?.bag ?? [];
  const markup = bag.length
    ? bag
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${getItemLabel(item)}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${itemActionButtons(item)}
            </div>
          </article>
        `)
        .join('')
    : `<div class="item-meta">${L('èåéè¿æ²¡æå¸¦èµ°çç©åã', 'The bag is still empty.')}</div>`;
  setMarkupIfChanged(refs.bagList, markup);
  setMarkupIfChanged(refs.raidBagList, markup);
}

function renderBagGrid() {
  const bag = state.raid?.bag ?? [];
  const totalSlots = getBagSlots();
  const markup = Array.from({ length: totalSlots }, (_, index) => {
    const item = bag[index];
    if (!item) {
      return `
        <article class="bag-slot empty">
          <strong>${L('ç©ºæ§½ä½', 'Empty Slot')}</strong>
          <span>${L('å¯æ¾ç©å', 'Available')}</span>
        </article>
      `;
    }
    return `
      <article class="bag-slot">
        <strong class="rarity-${item.rarity}">${getItemLabel(item)}</strong>
        <span>${getCategoryLabel(item.category)}</span>
      </article>
    `;
  }).join('');
  setMarkupIfChanged(refs.bagGrid, markup);
}

function renderMapExtractionList() {
  const raid = state.raid;
  const zones = raid?.extractions ?? [];
  const markup = zones
    .map((zone) => {
      const distance = raid ? distance2D(zone.x, zone.z, raid.player.x, raid.player.z) : 0;
      const available = isExtractionCurrentlyAvailable(zone, raid);
      const status = zone.active ? getExtractionStatusLabel(zone, raid) : L('\u4e0d\u53ef\u7528', 'Unavailable');
      let titleClass = '';
      if (available) {
        titleClass = zone.kind === 'switch'
          ? 'rarity-rare'
          : zone.kind === 'task'
            ? 'rarity-legendary'
            : 'rarity-uncommon';
      } else if (zone.kind === 'task') {
        titleClass = 'rarity-legendary';
      } else if (zone.kind === 'switch') {
        titleClass = 'rarity-rare';
      }
      return '' +
        '<article class="extract-row">' +
          '<div>' +
            '<div class="item-title ' + titleClass + '">' + getZoneLabel(zone) + '</div>' +
            '<div class="item-meta">' + status + ' ? ' + distance.toFixed(0) + 'm</div>' +
          '</div>' +
        '</article>';
    })
    .join('');
  setMarkupIfChanged(refs.mapExtractList, markup);
}

function beginExtractionSequence(zone) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player || !zone || raid.extractionSequence) {
    return;
  }

  raid.extractionSequence = {
    zoneId: zone.id,
    timer: 1.65,
    duration: 1.65,
  };
  player.extractionProgress = EXTRACTION_HOLD_TIME;
  player.extractionZoneId = zone.id;
  state.input.fireHeld = false;
  state.input.aimHeld = false;
  state.input.interactHeld = false;
  spawnPulse(new BABYLON.Vector3(zone.x, 0.4, zone.z), '#9af0c0', zone.radius * 0.46, 1.2);
  spawnPulse(new BABYLON.Vector3(zone.x, 1.1, zone.z), '#d8fff0', zone.radius * 0.22, 0.9);
  playExtractionAudio({ x: zone.x, z: zone.z });
  notify(
    L(`æ­£å¨ä» ${getZoneLabel(zone)} æ¤ç¦»â¦â¦`, `Extracting from ${getZoneLabel(zone)}...`),
    'success',
  );
}

function drawMapSearchZones(ctx, size, containers, radius) {
  const pad = 18;
  ctx.save();
  ctx.font = 'bold 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const container of containers) {
    if (container.id.startsWith('drop-') || (container.opened && !container.items.length)) {
      continue;
    }
    const point = worldToMap(container.x, container.z, size, pad);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(240, 197, 125, 0.92)';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.strokeStyle = '#f8e4b1';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();

    ctx.fillStyle = '#122127';
    ctx.fillText(getLanguage() === 'zh' ? 'æ' : 'S', point.x, point.y + 0.5);
  }
  ctx.restore();
}

function drawMapExtractions(ctx, size, zones, drawLabels, drawMarker = false) {
  const pad = 18;
  ctx.font = '12px "Segoe UI"';
  for (const zone of zones) {
    const point = worldToMap(zone.x, zone.z, size, pad);
    const available = isExtractionCurrentlyAvailable(zone, state.raid);
    const armedSwitch = zone.kind === 'switch' && zone.switchArmed && (zone.switchTimer ?? 0) > 0;
    const strokeColor = available
      ? '#8fd6b3'
      : zone.kind === 'task'
        ? '#f0c57d'
        : zone.kind === 'switch'
          ? (zone.switchExpired ? '#6a7378' : '#8bbdff')
          : '#47585e';
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.arc(point.x, point.y, Math.max(10, zone.radius * (size / 200)), 0, Math.PI * 2);
    ctx.stroke();
    if (drawMarker) {
      ctx.beginPath();
      ctx.fillStyle = available ? '#dff8e3' : armedSwitch ? '#d7e8ff' : zone.kind === 'task' ? '#ffe2aa' : '#6d7d82';
      ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.fillStyle = available ? '#dff8e3' : armedSwitch ? '#d7e8ff' : zone.kind === 'task' ? '#ffe2aa' : '#90a0a5';
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(getLanguage() === 'zh' ? '?' : 'E', point.x, point.y - 7);
      ctx.restore();
    }
    if (drawLabels) {
      ctx.fillStyle = available ? '#dff8e3' : armedSwitch ? '#d7e8ff' : zone.kind === 'task' ? '#ffe2aa' : '#90a0a5';
      ctx.fillText(getZoneLabel(zone) + ' ? ' + getExtractionStatusLabel(zone), point.x + 12, point.y - 6);
    }
  }
}
function killEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  persistSave();
  notify(L(`ç®æ å·²å»åï¼${getEnemyLabel(enemy)}ã`, `Target down: ${getEnemyLabel(enemy)}.`), 'success');

  if (Math.random() < 0.35) {
    const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
    const dropped = createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight));
    const dropName = L('æåºæè½', 'Battlefield Drop');
    const container = {
      id: `drop-${enemy.id}`,
      name: dropName,
      x: enemy.x + randomBetween(-0.6, 0.6),
      z: enemy.z + randomBetween(-0.6, 0.6),
      pool: 'valuable',
      tier: 2,
      opened: false,
      items: [dropped],
      visual: createContainerVisual({ id: `drop-${enemy.id}`, name: dropName, x: enemy.x, z: enemy.z, pool: 'valuable' }),
      highlight: 0,
    };
    container.visual.root.position.x = container.x;
    container.visual.root.position.z = container.z;
    state.raid.containers.push(container);
  }
}

function applyDamageToPlayer(amount) {
  const player = state.raid?.player;
  if (!player) {
    return;
  }

  let remaining = amount;
  let blocked = 0;
  if (player.armor > 0) {
    blocked = Math.min(player.armor, Math.round(amount * 0.65));
    player.armor -= blocked;
    remaining -= Math.round(blocked * 0.7);
  }
  player.health = Math.max(0, player.health - Math.max(1, remaining));
  player.damageFlash = Math.max(player.damageFlash ?? 0, 0.78);
  player.damageJolt = 1;
  player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, 0.8);
  spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#ff7e68', 0.08, 0.08);
  playDamageAudio(Math.max(1, remaining), blocked);
  notify(L(`åå° ${Math.max(1, remaining)} ç¹ä¼¤å®³ã`, `Took ${Math.max(1, remaining)} damage.`), 'danger');
}

function spawnDroppedContainer(items, label = L('ä¸¢å¼ç©èµ', 'Dropped Gear')) {
  const player = state.raid?.player;
  if (!player || !items.length) {
    return;
  }
  const dropX = clamp(player.x + Math.sin(player.yaw) * 1.4, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1);
  const dropZ = clamp(player.z + Math.cos(player.yaw) * 1.4, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1);
  const container = {
    id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: label,
    x: dropX,
    z: dropZ,
    pool: 'valuable',
    tier: 1,
    opened: false,
    items,
    visual: createContainerVisual({ id: label, name: label, x: dropX, z: dropZ, pool: 'valuable' }),
    highlight: 0,
  };
  container.visual.root.position.x = dropX;
  container.visual.root.position.z = dropZ;
  state.raid.containers.push(container);
}

function dropBagItem(uid) {
  const item = removeBagItem(uid);
  if (!item) {
    return;
  }
  if (item.itemType === 'part') {
    unequipPartItemFromRaid(item);
  }
  spawnDroppedContainer([item], L('ä¸¢å¼ç©èµ', 'Dropped Gear'));
  syncHud();
  notify(L(`å·²ä¸¢å¼ ${getItemLabel(item)}ã`, `Dropped ${getItemLabel(item)}.`), 'warning');
}

function localizeRaidReason(reason) {
  if (reason === 'time_expired' || reason === 'Time expired. You were killed in the raid.') {
    return L('æ¶é´ç»æï¼ä½ å·²éµäº¡ã', 'Time expired. You were killed in the raid.');
  }
  if (reason === 'player_killed' || reason === 'You were killed in the raid. Current loot was lost.') {
    return L('ä½ å¨å°éåºä¸­éµäº¡ï¼å½åæå©åå·²ä¸¢å¤±ã', 'You were killed in the raid. Current loot was lost.');
  }
  if (reason === 'è°è¯æ¨¡å¼æ¤ç¦»æåã' || reason === 'debug_success') {
    return L('è°è¯æ¨¡å¼æ¤ç¦»æåã', 'Debug extraction successful.');
  }
  if (typeof reason === 'string' && reason.startsWith('extract:')) {
    const zoneId = reason.slice('extract:'.length);
    const zone = extractionZones.find((entry) => entry.id === zoneId) ?? state.raid?.extractions?.find((entry) => entry.id === zoneId);
    const zoneName = zone ? getZoneLabel(zone) : zoneId;
    return L(`å·²ä» ${zoneName} æ¤ç¦»ã`, `Extracted from ${zoneName}.`);
  }
  return reason;
}

function renderRaidResultOverlay(result) {
  const raid = state.raid;
  if (!raid || !result) {
    return;
  }
  refs.resultTitle.textContent = result.survived ? L('æ¤ç¦»æå', 'Extraction Success') : L('è¡å¨å¤±è´¥', 'Killed in Raid');
  refs.resultSummary.innerHTML = [
    resultItem(L('ç»æ', 'Result'), localizeRaidReason(result.reason)),
    resultItem(L('å¸¦åºç©èµ', 'Loot Extracted'), result.survived ? formatItemCount(result.bagCount) : formatItemCount(0)),
    resultItem(L('æå©åä»·å¼', 'Haul Value'), result.survived ? formatMoney(result.haul) : formatMoney(0)),
    resultItem(L('å»åæäºº', 'Enemies Down'), `${raid.killCount}`),
    resultItem(L('å©ä½æ¶é´', 'Time Left'), formatTime(raid.timeLeft)),
    resultItem(L('ä»åºæ»æ°', 'Stash Total'), formatItemCount(state.save.stash.length)),
  ].join('');
}

function finishRaid(success, reason, extracted) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  releasePointerLock();
  closeLootPanel();
  closeMapOverlay();

  const survived = success && extracted;
  const haul = survived ? raid.bagValue : 0;
  const bagCount = survived ? raid.bag.length : 0;
  if (survived) {
    state.save.stash.push(...raid.bag);
    state.save.stats.survived += 1;
    state.save.stats.bestHaul = Math.max(state.save.stats.bestHaul, haul);
  } else {
    raid.bag = [];
    raid.bagValue = 0;
    raid.bagWeight = 0;
    resetRaidLoadout(raid.player);
    state.save.prep.medkitBonus = 0;
    state.save.prep.ammoBonus = 0;
    state.save.prep.armorBonus = 0;
  }
  persistSave();

  raid.result = {
    survived,
    reason,
    haul,
    bagCount,
  };

  state.mode = 'result';
  refs.hud.classList.add('hidden');
  renderRaidResultOverlay(raid.result);
  refs.resultOverlay.classList.remove('hidden');
  notify(
    survived
      ? L('æ¤ç¦»å®æï¼æå©åå·²å¸¦ååºå°ã', 'Extraction complete. Loot returned to base.')
      : L('è¡å¨å¤±è´¥ï¼å½åæå©ååä¸´æ¶è£å¤å·²éç½®ã', 'Raid failed. Current loot and temporary gear were reset.'),
    survived ? 'success' : 'danger',
  );
}

function bindEvents() {
  ensureExtendedRefs();
  refs.canvas.setAttribute('tabindex', '0');
  window.addEventListener('pointerdown', unlockAudioContext, { passive: true });
  window.addEventListener('keydown', unlockAudioContext);
  refs.deployButton.addEventListener('click', startRaid);
  refs.saveResetButton.addEventListener('click', resetSave);
  refs.sellAllButton.addEventListener('click', sellAllStash);
  refs.returnBaseButton.addEventListener('click', returnToBase);
  refs.closeLootButton.addEventListener('click', closeLootPanel);
  refs.takeAllButton.addEventListener('click', takeAllCurrentContainer);
  refs.closeMapButton.addEventListener('click', closeMapOverlay);
  refs.languageSwitch?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-language-option]');
    if (button) {
      setLanguage(button.dataset.languageOption);
    }
  });

  refs.shopList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-id]');
    if (button) {
      buyShopEntry(button.dataset.shopId);
    }
  });

  refs.armoryPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-armory-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.armoryAction;
    const weaponId = button.dataset.weaponId;
    const ammoId = button.dataset.ammoId;
    const partId = button.dataset.partId;
    const slot = button.dataset.partSlot;
    if (action === 'select-weapon' && weaponId) {
      setSelectedWeapon(weaponId);
    } else if (action === 'select-ammo' && weaponId && ammoId) {
      setSelectedAmmoForWeapon(weaponId, ammoId);
    } else if (action === 'equip-part' && weaponId && partId) {
      setEquippedPartForWeapon(weaponId, partId);
    } else if (action === 'unequip-part' && weaponId && slot) {
      clearEquippedPartForWeapon(weaponId, slot);
    }
  });

  refs.raidSidePanel?.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-collapse-target]');
    if (toggle) {
      toggleRaidPanel(toggle.dataset.collapseTarget);
    }
  });

  refs.stashList.addEventListener('click', (event) => {
    const stashButton = event.target.closest('[data-stash-action]');
    if (stashButton) {
      const action = stashButton.dataset.stashAction;
      const uid = stashButton.dataset.stashId;
      if (action === 'sell') {
        sellItem(uid);
      } else if (action === 'discard') {
        discardStashItem(uid);
      } else if (action === 'stock-ammo') {
        stockAmmoFromStash(uid);
      } else if (action === 'learn-part') {
        learnPartFromStash(uid);
      }
      return;
    }
    const sellButton = event.target.closest('[data-sell-id]');
    if (sellButton) {
      sellItem(sellButton.dataset.sellId);
    }
  });

  refs.lootItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-loot-action]');
    if (!button) {
      const takeButton = event.target.closest('[data-take-id]');
      if (takeButton) {
        takeLoot(state.ui.currentContainerId, takeButton.dataset.takeId);
      }
      return;
    }
    const itemId = button.dataset.lootId;
    const action = button.dataset.lootAction;
    if (action === 'take') {
      takeLoot(state.ui.currentContainerId, itemId);
    } else if (action === 'use') {
      useLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'equip') {
      equipLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'load') {
      loadLootAmmo(state.ui.currentContainerId, itemId);
    }
  });

  const handleBagClick = (event) => {
    const button = event.target.closest('[data-bag-action]');
    if (!button) {
      return;
    }
    const uid = button.dataset.itemId;
    const action = button.dataset.bagAction;
    if (action === 'use' || action === 'load-ammo') {
      useBagItem(uid);
    } else if (action === 'equip') {
      equipBagItem(uid);
    } else if (action === 'unequip') {
      const item = state.raid?.bag.find((entry) => entry.uid === uid);
      if (item) {
        unequipPartItemFromRaid(item);
        syncHud();
      }
    } else if (action === 'drop') {
      dropBagItem(uid);
    }
  };
  refs.bagList?.addEventListener('click', handleBagClick);
  refs.raidBagList?.addEventListener('click', handleBagClick);

  const handleAmmoRailClick = (event) => {
    const button = event.target.closest('[data-raid-ammo]');
    if (button) {
      selectRaidAmmo(button.dataset.raidAmmo);
    }
  };
  refs.mapAmmoList?.addEventListener('click', handleAmmoRailClick);
  refs.raidAmmoRail?.addEventListener('click', handleAmmoRailClick);

  refs.canvas.addEventListener('click', () => {
    if (state.mode === 'raid' && !state.overlay) {
      refs.canvas.focus?.({ preventScroll: true });
    }
  });

  refs.canvas.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'raid' || state.overlay) {
      return;
    }
    refs.canvas.focus?.({ preventScroll: true });
    requestPointerLock();
    if (event.button === 0) {
      if (!state.input.fireHeld) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    } else if (event.button === 2) {
      state.input.aimHeld = true;
      event.preventDefault();
    }
    state.input.lookDragging = true;
    state.input.lookPointerId = event.pointerId;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    refs.canvas.setPointerCapture?.(event.pointerId);
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (
      state.mode !== 'raid' ||
      !state.raid ||
      state.overlay ||
      state.pointerLocked ||
      !state.input.lookDragging ||
      state.input.lookPointerId !== event.pointerId
    ) {
      return;
    }
    const deltaX = event.clientX - state.input.lastPointerX;
    const deltaY = event.clientY - state.input.lastPointerY;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    applyLookDelta(deltaX, deltaY);
  });

  const stopLookDrag = (event) => {
    if (event.pointerId !== undefined && state.input.lookPointerId !== null && event.pointerId !== state.input.lookPointerId) {
      return;
    }
    if (event.button === 0) {
      state.input.fireHeld = false;
    } else if (event.button === 2) {
      state.input.aimHeld = false;
    }
    state.input.lookDragging = false;
    state.input.lookPointerId = null;
  };
  refs.canvas.addEventListener('pointerup', stopLookDrag);
  refs.canvas.addEventListener('pointercancel', stopLookDrag);
  refs.canvas.addEventListener('lostpointercapture', stopLookDrag);

  const activeControlPointers = new Map();
  refs.touchControls?.addEventListener('pointerdown', (event) => {
    const keyButton = event.target.closest('[data-control-key]');
    const actionButton = event.target.closest('[data-control-action]');
    if (!keyButton && !actionButton) {
      return;
    }
    event.preventDefault();
    refs.canvas.focus?.({ preventScroll: true });

    if (keyButton) {
      const key = keyButton.dataset.controlKey;
      state.input.keys.add(key);
      stepTouchMove(key);
      const intervalId = window.setInterval(() => stepTouchMove(key), 50);
      keyButton.setPointerCapture?.(event.pointerId);
      activeControlPointers.set(event.pointerId, { type: 'key', value: key, intervalId });
      return;
    }

    const action = actionButton.dataset.controlAction;
    actionButton.setPointerCapture?.(event.pointerId);
    if (action === 'interact') {
      triggerRaidInteract();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'fire') {
      state.input.fireHeld = true;
      attemptShoot();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'reload') {
      reloadWeapon();
    } else if (action === 'heal') {
      useMedkit();
    } else if (action === 'map') {
      toggleRaidMap();
    }
  });

  const releaseControlPointer = (event) => {
    const active = activeControlPointers.get(event.pointerId);
    if (!active) {
      return;
    }
    if (active.type === 'key') {
      state.input.keys.delete(active.value);
      window.clearInterval(active.intervalId);
    } else if (active.type === 'action') {
      if (active.value === 'interact') {
        state.input.interactHeld = false;
      }
      if (active.value === 'fire') {
        state.input.fireHeld = false;
      }
    }
    activeControlPointers.delete(event.pointerId);
  };

  refs.touchControls?.addEventListener('pointerup', releaseControlPointer);
  refs.touchControls?.addEventListener('pointercancel', releaseControlPointer);
  refs.touchControls?.addEventListener('lostpointercapture', releaseControlPointer);

  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('mousemove', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay || !state.pointerLocked) {
      return;
    }
    applyLookDelta(event.movementX, event.movementY);
  });

  window.addEventListener('keydown', (event) => {
    state.input.keys.add(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    const isFireKey = event.code === 'KeyF' || lowerKey === 'f';
    const isReloadKey = event.code === 'KeyR' || lowerKey === 'r';
    const isHealKey = event.code === 'KeyQ' || lowerKey === 'q';
    const isMapKey = event.code === 'KeyM' || lowerKey === 'm';
    const isInteractKey = event.code === 'KeyE' || lowerKey === 'e';

    if (isFireKey) {
      if (!state.input.fireHeld && state.mode === 'raid' && state.raid && !state.overlay) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    }
    if (event.repeat) {
      return;
    }
    if (state.mode === 'raid' && state.raid) {
      refs.canvas.focus?.({ preventScroll: true });
      if (isReloadKey) {
        reloadWeapon();
      }
      if (isHealKey) {
        useMedkit();
      }
      if (isMapKey) {
        toggleRaidMap();
      }
      if (isInteractKey) {
        triggerRaidInteract();
      }
      if (event.code === 'Escape') {
        if (state.overlay === 'loot') {
          closeLootPanel();
        } else if (state.overlay === 'map') {
          closeMapOverlay();
        } else {
          releasePointerLock();
        }
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    state.input.keys.delete(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    if (event.code === 'KeyE' || lowerKey === 'e') {
      state.input.interactHeld = false;
    }
    if (event.code === 'KeyF' || lowerKey === 'f') {
      state.input.fireHeld = false;
    }
  });

  applyLanguage();
}

function getOperatorDefs() {
  return {
    assault: {
      id: 'assault',
      nameZh: 'çªå»åµ',
      nameEn: 'Assault',
      passiveZh: 'è¢«å¨ï¼è£ç²æ´åï¼ååä¸æ¢å¼¹æ´ç¨³ã',
      passiveEn: 'Passive: extra armor with steadier recoil and reloads.',
      skillNameZh: 'è¿è½½çªè¿',
      skillNameEn: 'Overdrive',
      skillTextZh: 'ç­æ¶é´æåç§»éãæ§æªåå²åºåå¶åã',
      skillTextEn: 'A short burst of speed, control, and aggressive pressure.',
      itemNameZh: 'è¿è½½æ³¨å°å¨',
      itemNameEn: 'Overdrive Injector',
      moveMult: 1,
      spreadMult: 0.92,
      reloadMult: 0.92,
      detectMult: 1,
      healBonus: 0,
      healCooldownMult: 1,
      startArmorBonus: 12,
      startMedkitBonus: 0,
      utilityCharges: 1,
      abilityDuration: 7,
      abilityCooldown: 28,
      abilityColor: '#ff9a62',
    },
    recon: {
      id: 'recon',
      nameZh: 'ä¾¦å¯åµ',
      nameEn: 'Recon',
      passiveZh: 'è¢«å¨ï¼ç§»å¨æ´å¿«ï¼æ´é¾è¢«æäººæååç°ã',
      passiveEn: 'Passive: faster movement and lower enemy detection.',
      skillNameZh: 'èå²æ«æ',
      skillNameEn: 'Pulse Scan',
      skillTextZh: 'æ«æéè¿æäººå¹¶é«äº®æ¾ç¤ºï¼ä½ä¸ä¼æ è®°å°å°å°å¾ã',
      skillTextEn: 'Scans nearby enemies and highlights them without minimap markers.',
      itemNameZh: 'èå²æ«æå¨',
      itemNameEn: 'Pulse Scanner',
      moveMult: 1.06,
      spreadMult: 0.96,
      reloadMult: 1,
      detectMult: 0.78,
      healBonus: 0,
      healCooldownMult: 1,
      startArmorBonus: 0,
      startMedkitBonus: 0,
      utilityCharges: 1,
      abilityDuration: 8,
      abilityCooldown: 26,
      scanRadius: 34,
      abilityColor: '#72d9ff',
    },
    medic: {
      id: 'medic',
      nameZh: 'å»çåµ',
      nameEn: 'Medic',
      passiveZh: 'è¢«å¨ï¼é¢å¤æºå¸¦å»çåï¼æ²»çæ´é«æã',
      passiveEn: 'Passive: extra medkits with stronger, faster healing.',
      skillNameZh: 'åºæ¥æ²»ç',
      skillNameEn: 'Rapid Triage',
      skillTextZh: 'ç«å»æ¢å¤çå½ä¸æ¤ç²ï¼å¹¶è§¦åç»¿è²æ²»çèå²ã',
      skillTextEn: 'Instantly restores health and armor with a healing pulse.',
      itemNameZh: 'æ¥ææ³¡æ²«å',
      itemNameEn: 'Trauma Foam',
      moveMult: 0.98,
      spreadMult: 1,
      reloadMult: 0.96,
      detectMult: 1,
      healBonus: 14,
      healCooldownMult: 0.72,
      startArmorBonus: 6,
      startMedkitBonus: 1,
      utilityCharges: 1,
      abilityDuration: 1.2,
      abilityCooldown: 22,
      skillHeal: 34,
      skillArmor: 18,
      abilityColor: '#74e0a0',
    },
  };
}

function getOperatorOrder() {
  return ['assault', 'recon', 'medic'];
}

function getDefaultOperatorId() {
  return 'assault';
}

function sanitizeOperatorId(operatorId) {
  return getOperatorDefs()[operatorId] ? operatorId : getDefaultOperatorId();
}

function getSelectedOperatorId() {
  state.save.selectedOperatorId = sanitizeOperatorId(state.save.selectedOperatorId);
  return state.save.selectedOperatorId;
}

function getOperatorDef(operatorId = getSelectedOperatorId()) {
  return getOperatorDefs()[sanitizeOperatorId(operatorId)];
}

function getPlayerOperatorDef(player = state.raid?.player) {
  return getOperatorDef(player?.operatorId ?? getSelectedOperatorId());
}

function getOperatorName(operatorId = getSelectedOperatorId()) {
  const operator = getOperatorDef(operatorId);
  return getLanguage() === 'zh' ? operator.nameZh : operator.nameEn;
}

function getOperatorSkillName(operatorId = getSelectedOperatorId()) {
  const operator = getOperatorDef(operatorId);
  return getLanguage() === 'zh' ? operator.skillNameZh : operator.skillNameEn;
}

function getOperatorSkillText(operatorId = getSelectedOperatorId()) {
  const operator = getOperatorDef(operatorId);
  return getLanguage() === 'zh' ? operator.skillTextZh : operator.skillTextEn;
}

function getOperatorPassiveText(operatorId = getSelectedOperatorId()) {
  const operator = getOperatorDef(operatorId);
  return getLanguage() === 'zh' ? operator.passiveZh : operator.passiveEn;
}

function getOperatorItemName(operatorId = getSelectedOperatorId()) {
  const operator = getOperatorDef(operatorId);
  return getLanguage() === 'zh' ? operator.itemNameZh : operator.itemNameEn;
}

function setSelectedOperator(operatorId) {
  const nextOperatorId = sanitizeOperatorId(operatorId);
  if (state.mode !== 'base') {
    notify(L('åµç§åªè½å¨å±å¤åæ¢ã', 'Operators can only be changed in base.'), 'warning');
    return;
  }
  if (nextOperatorId === getSelectedOperatorId()) {
    return;
  }
  state.save.selectedOperatorId = nextOperatorId;
  persistSave();
  renderBasePanel();
  notify(L(`å·²éæ©åµç§ï¼${getOperatorName(nextOperatorId)}ã`, `Selected operator: ${getOperatorName(nextOperatorId)}.`), 'success');
}

function defaultSave() {
  return {
    version: SAVE_SCHEMA_VERSION,
    money: 18000,
    stash: [],
    selectedOperatorId: getDefaultOperatorId(),
    selectedModeId: 'raid',
    engineerUnlocked: false,
    funBountyId: null,
    upgrades: {
      bagLevel: 0,
      weaponLevel: 0,
    },
    prep: {
      medkitBonus: 0,
      ammoBonus: 0,
      armorBonus: 0,
    },
    prepAmmo: defaultPrepAmmo(),
    armory: {
      ownedWeapons: ['rifle'],
      selectedWeaponId: 'rifle',
      selectedAmmoByWeapon: defaultSelectedAmmoByWeapon(),
      ownedParts: [],
      equippedPartsByWeapon: defaultEquippedPartsByWeapon(),
    },
    stats: {
      raids: 0,
      survived: 0,
      kills: 0,
      bestHaul: 0,
    },
  };
}

function loadSave() {
  const fallback = defaultSave();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const stash = Array.isArray(parsed.stash)
      ? parsed.stash.map((item) => normalizeItemInstance(item)).filter(Boolean)
      : fallback.stash;
    const ownedWeapons = Array.isArray(parsed.armory?.ownedWeapons)
      ? Array.from(new Set(parsed.armory.ownedWeapons.filter((id) => WEAPON_DEFS[id])))
      : [...fallback.armory.ownedWeapons];
    if (!ownedWeapons.includes('rifle')) {
      ownedWeapons.unshift('rifle');
    }
    const selectedWeaponId = ownedWeapons.includes(parsed.armory?.selectedWeaponId)
      ? parsed.armory.selectedWeaponId
      : 'rifle';
    const legacyAmmoBonus = Math.max(0, Number(parsed.prep?.ammoBonus ?? 0));
    const prepAmmo = defaultPrepAmmo();
    for (const ammoId of Object.keys(prepAmmo)) {
      prepAmmo[ammoId] = Math.max(0, Number(parsed.prepAmmo?.[ammoId] ?? 0));
    }
    prepAmmo.rifle_fmj += legacyAmmoBonus;
    const ownedParts = Array.isArray(parsed.armory?.ownedParts)
      ? Array.from(new Set(parsed.armory.ownedParts.filter((id) => PART_DEFS[id])))
      : [];
    const isLegacySave = Number(parsed.version ?? 0) < SAVE_SCHEMA_VERSION;
    const startingMoney = Number.isFinite(parsed.money) ? parsed.money : fallback.money;
    return {
      version: SAVE_SCHEMA_VERSION,
      money: isLegacySave ? Math.max(startingMoney, fallback.money) : startingMoney,
      stash,
      selectedOperatorId,
      selectedModeId: sanitizeLobbyModeId(parsed.selectedModeId),
      engineerUnlocked,
      funBountyId: typeof parsed.funBountyId === 'string' ? parsed.funBountyId : null,
      upgrades: {
        bagLevel: clamp(Number(parsed.upgrades?.bagLevel ?? 0), 0, MAX_BAG_LEVEL),
        weaponLevel: clamp(Number(parsed.upgrades?.weaponLevel ?? 0), 0, MAX_WEAPON_LEVEL),
      },
      prep: {
        medkitBonus: Math.max(0, Number(parsed.prep?.medkitBonus ?? 0)),
        ammoBonus: legacyAmmoBonus,
        armorBonus: Math.max(0, Number(parsed.prep?.armorBonus ?? 0)),
      },
      prepAmmo,
      armory: {
        ownedWeapons,
        selectedWeaponId,
        selectedAmmoByWeapon: sanitizeSelectedAmmoByWeapon(parsed.armory?.selectedAmmoByWeapon, ownedWeapons),
        ownedParts,
        equippedPartsByWeapon: sanitizeEquippedPartsByWeapon(parsed.armory?.equippedPartsByWeapon, ownedParts),
      },
      stats: {
        raids: Math.max(0, Number(parsed.stats?.raids ?? 0)),
        survived: Math.max(0, Number(parsed.stats?.survived ?? 0)),
        kills: Math.max(0, Number(parsed.stats?.kills ?? 0)),
        bestHaul: Math.max(0, Number(parsed.stats?.bestHaul ?? 0)),
      },
    };
  } catch (error) {
    console.warn('Failed to load save, using defaults.', error);
    return fallback;
  }
}

function ensureExtendedRefs() {
  refs.armoryPanel ??= document.getElementById('armoryPanel');
  refs.mapLoadoutList ??= document.getElementById('mapLoadoutList');
  refs.mapAmmoList ??= document.getElementById('mapAmmoList');
  refs.raidSidePanel ??= document.getElementById('raidSidePanel');
  refs.raidLoadoutList ??= document.getElementById('raidLoadoutList');
  refs.raidAmmoRail ??= document.getElementById('raidAmmoRail');
  refs.raidBagList ??= document.getElementById('raidBagList');
  refs.languageSwitch ??= document.getElementById('languageSwitch');
  refs.langZhButton ??= document.getElementById('langZhButton');
  refs.langEnButton ??= document.getElementById('langEnButton');
  refs.brandTitle ??= document.getElementById('brandTitle');
  refs.lobbyTitle ??= document.getElementById('lobbyTitle');
  refs.lobbyNote ??= document.getElementById('lobbyNote');
  refs.lobbyPanel ??= document.getElementById('lobbyPanel');
  refs.operatorPanel ??= document.getElementById('operatorPanel');
  refs.operatorTitle ??= document.getElementById('operatorTitle');
  refs.operatorNote ??= document.getElementById('operatorNote');
  refs.tipMove ??= document.getElementById('tipMove');
  refs.tipLook ??= document.getElementById('tipLook');
  refs.tipFire ??= document.getElementById('tipFire');
  refs.tipAction ??= document.getElementById('tipAction');
  refs.objectiveLabel ??= document.getElementById('objectiveLabel');
  refs.objectiveValue ??= document.getElementById('objectiveValue');
  refs.objectiveDetail ??= document.getElementById('objectiveDetail');
  refs.threatLabel ??= document.getElementById('threatLabel');
  refs.threatValue ??= document.getElementById('threatValue');
  refs.abilityLabel ??= document.getElementById('abilityLabel');
  refs.abilityValue ??= document.getElementById('abilityValue');
  refs.abilityDetail ??= document.getElementById('abilityDetail');
  refs.abilityMeterFill ??= document.getElementById('abilityMeterFill');
  refs.crosshair ??= document.getElementById('crosshair');
  refs.supportPrompt ??= document.getElementById('supportPrompt');
  refs.aimActionButton ??= document.getElementById('aimActionButton');
  refs.skillActionButton ??= document.getElementById('skillActionButton');
}

function applyStaticLanguage() {
  ensureExtendedRefs();
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key) {
      element.textContent = t(key);
    }
  }
  if (refs.brandTitle) {
    refs.brandTitle.textContent = 'æææ¤';
  }
  document.title = 'æææ¤';
  if (refs.operatorTitle) {
    refs.operatorTitle.textContent = L('åµç§', 'Operators');
  }
  if (refs.operatorNote) {
    refs.operatorNote.textContent = L('ä»è½å¨å±å¤éæ©ï¼ä¸ååµç§æ¥æç¬ç¹æè½ãç¹æåä¸å±éå·', 'Choose operators only in base. Each one has a unique skill, effect, and signature item.');
  }
  if (refs.tipMove) {
    refs.tipMove.textContent = L('WASD / æ¹åé®ç§»å¨', 'WASD / Arrow keys move');
  }
  if (refs.tipLook) {
    refs.tipLook.textContent = L('é¼ æ è½¬åï¼å³é®çå', 'Mouse looks, right mouse aims');
  }
  if (refs.tipFire) {
    refs.tipFire.textContent = L('å·¦é® / F å¼ç«ï¼R æ¢å¼¹', 'Left mouse / F fires, R reloads');
  }
  if (refs.tipAction) {
    refs.tipAction.textContent = L('Q æ²»çï¼E æç´¢ / æ¤ç¦»ï¼M å°å¾ï¼C æè½', 'Q heal, E search / extract, M map, C skill');
  }
  if (refs.aimActionButton) {
    refs.aimActionButton.textContent = L('çå', 'Aim');
  }
  if (refs.skillActionButton) {
    refs.skillActionButton.textContent = L('æè½', 'Skill');
  }
  refs.langZhButton?.classList.toggle('is-active', getLanguage() === 'zh');
  refs.langEnButton?.classList.toggle('is-active', getLanguage() === 'en');
}

function renderOperatorPanel() {
  const selectedOperatorId = getSelectedOperatorId();
  const selectedMode = getLobbyModeDef();
  return getOperatorOrder()
    .map((operatorId) => {
      const operator = getOperatorDef(operatorId);
      const isActive = operatorId === selectedOperatorId;
      return `
        <article class="shop-row operator-card ${isActive ? 'is-active' : ''}">
          <div>
            <div class="item-title">${getOperatorName(operatorId)}</div>
            <div class="item-meta">${getOperatorPassiveText(operatorId)}</div>
            <div class="item-meta">${L(`æè½ï¼${getOperatorSkillName(operatorId)} Â· ${getOperatorSkillText(operatorId)}`, `Skill: ${getOperatorSkillName(operatorId)} Â· ${getOperatorSkillText(operatorId)}`)}</div>
            <div class="item-meta">${L(`ä¸å±éå·ï¼${getOperatorItemName(operatorId)} x${operator.utilityCharges}`, `Signature item: ${getOperatorItemName(operatorId)} x${operator.utilityCharges}`)}</div>
          </div>
          <div class="stack-list">
            <button class="ghost-button small" type="button" data-operator-id="${operatorId}">
              ${isActive ? L('å·²éæ©', 'Selected') : L('éæ©', 'Select')}
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function createViewModel() {
  const root = new BABYLON.TransformNode('viewModelRoot', scene);
  root.parent = camera;
  root.position = new BABYLON.Vector3(0.32, -0.34, 0.85);

  const bodyMat = makeMaterial('weaponBodyMatOverride', '#5d6a70', '#303a40');
  const detailMat = makeMaterial('weaponDetailMatOverride', '#8fa3aa', '#536268');
  const gripMat = makeMaterial('weaponGripMatOverride', '#b0886c', '#5a4032');
  const opticMat = makeMaterial('weaponOpticMatOverride', '#8eb2bd', '#80b9cb');
  opticMat.alpha = 0.24;
  opticMat.backFaceCulling = false;

  const body = BABYLON.MeshBuilder.CreateBox('weapon-body-override', { width: 0.24, height: 0.18, depth: 1.05 }, scene);
  body.parent = root;
  body.position = new BABYLON.Vector3(0.02, 0, 0.34);
  body.material = bodyMat;

  const receiver = BABYLON.MeshBuilder.CreateBox('weapon-receiver-override', { width: 0.18, height: 0.12, depth: 0.38 }, scene);
  receiver.parent = root;
  receiver.position = new BABYLON.Vector3(0.02, 0.11, 0.54);
  receiver.material = detailMat;

  const stock = BABYLON.MeshBuilder.CreateBox('weapon-stock-override', { width: 0.14, height: 0.2, depth: 0.44 }, scene);
  stock.parent = root;
  stock.position = new BABYLON.Vector3(0.02, -0.02, -0.08);
  stock.material = bodyMat;

  const barrel = BABYLON.MeshBuilder.CreateCylinder('weapon-barrel-override', {
    height: 0.94,
    diameterTop: 0.06,
    diameterBottom: 0.08,
    tessellation: 12,
  }, scene);
  barrel.parent = root;
  barrel.rotation.x = Math.PI / 2;
  barrel.position = new BABYLON.Vector3(0.03, 0.03, 0.92);
  barrel.material = detailMat;

  const hand = BABYLON.MeshBuilder.CreateBox('weapon-hand-override', { width: 0.18, height: 0.16, depth: 0.36 }, scene);
  hand.parent = root;
  hand.position = new BABYLON.Vector3(0.14, -0.19, 0.22);
  hand.rotation.z = -0.2;
  hand.material = gripMat;

  const offHand = BABYLON.MeshBuilder.CreateBox('weapon-offhand-override', { width: 0.14, height: 0.12, depth: 0.3 }, scene);
  offHand.parent = root;
  offHand.position = new BABYLON.Vector3(-0.1, -0.08, 0.55);
  offHand.rotation.z = 0.18;
  offHand.material = gripMat;

  const opticRoot = new BABYLON.TransformNode('weapon-optic-root', scene);
  opticRoot.parent = root;
  opticRoot.position = new BABYLON.Vector3(0, 0.17, 0.56);

  const opticBase = BABYLON.MeshBuilder.CreateBox('weapon-optic-base', { width: 0.16, height: 0.08, depth: 0.18 }, scene);
  opticBase.parent = opticRoot;
  opticBase.position.y = -0.03;
  opticBase.material = bodyMat;

  const opticTube = BABYLON.MeshBuilder.CreateCylinder('weapon-optic-tube', {
    height: 0.34,
    diameterTop: 0.16,
    diameterBottom: 0.18,
    tessellation: 16,
  }, scene);
  opticTube.parent = opticRoot;
  opticTube.rotation.x = Math.PI / 2;
  opticTube.position.z = 0.08;
  opticTube.material = opticMat;

  const lensMaterial = new BABYLON.StandardMaterial('weapon-optic-lens-mat', scene);
  lensMaterial.diffuseColor = BABYLON.Color3.FromHexString('#6bb7d4');
  lensMaterial.emissiveColor = BABYLON.Color3.FromHexString('#8ef0ff');
  lensMaterial.alpha = 0.04;
  lensMaterial.backFaceCulling = false;
  lensMaterial.disableLighting = true;

  const rearLens = BABYLON.MeshBuilder.CreatePlane('weapon-optic-rear-lens', { size: 0.13 }, scene);
  rearLens.parent = opticRoot;
  rearLens.position.z = -0.07;
  rearLens.material = lensMaterial;

  const frontLens = BABYLON.MeshBuilder.CreatePlane('weapon-optic-front-lens', { size: 0.11 }, scene);
  frontLens.parent = opticRoot;
  frontLens.position.z = 0.22;
  frontLens.material = lensMaterial;

  const reticleMaterial = new BABYLON.StandardMaterial('weapon-optic-reticle-mat', scene);
  reticleMaterial.diffuseColor = BABYLON.Color3.FromHexString('#ff6c59');
  reticleMaterial.emissiveColor = BABYLON.Color3.FromHexString('#ffb59d');
  reticleMaterial.alpha = 0;

  const reticleH = BABYLON.MeshBuilder.CreateBox('weapon-optic-reticle-h', { width: 0.036, height: 0.003, depth: 0.003 }, scene);
  reticleH.parent = opticRoot;
  reticleH.position.z = -0.01;
  reticleH.material = reticleMaterial;

  const reticleV = BABYLON.MeshBuilder.CreateBox('weapon-optic-reticle-v', { width: 0.003, height: 0.036, depth: 0.003 }, scene);
  reticleV.parent = opticRoot;
  reticleV.position.z = -0.01;
  reticleV.material = reticleMaterial;

  const reticleDotMaterial = new BABYLON.StandardMaterial('weapon-optic-reticle-dot-mat', scene);
  reticleDotMaterial.diffuseColor = BABYLON.Color3.FromHexString('#ff4d4d');
  reticleDotMaterial.emissiveColor = BABYLON.Color3.FromHexString('#ff7a7a');
  reticleDotMaterial.alpha = 0;
  reticleDotMaterial.disableLighting = true;

  const reticleDot = BABYLON.MeshBuilder.CreateDisc('weapon-optic-reticle-dot', {
    radius: 0.008,
    tessellation: 24,
  }, scene);
  reticleDot.parent = opticRoot;
  reticleDot.position.z = -0.012;
  reticleDot.material = reticleDotMaterial;

  const muzzleFlash = BABYLON.MeshBuilder.CreatePlane('muzzleFlash-override', { size: 0.42 }, scene);
  muzzleFlash.parent = root;
  muzzleFlash.position = new BABYLON.Vector3(0.04, 0.02, 1.34);
  muzzleFlash.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  muzzleFlash.isPickable = false;
  const muzzleMaterial = new BABYLON.StandardMaterial('muzzleMaterialOverride', scene);
  muzzleMaterial.diffuseColor = BABYLON.Color3.FromHexString('#ffd897');
  muzzleMaterial.emissiveColor = BABYLON.Color3.FromHexString('#ffe58c');
  muzzleMaterial.alpha = 0;
  muzzleMaterial.backFaceCulling = false;
  muzzleMaterial.disableLighting = true;
  muzzleFlash.material = muzzleMaterial;

  const muzzleCore = BABYLON.MeshBuilder.CreatePlane('muzzleCore-override', { size: 0.24 }, scene);
  muzzleCore.parent = root;
  muzzleCore.position = new BABYLON.Vector3(0.04, 0.02, 1.28);
  muzzleCore.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  muzzleCore.isPickable = false;
  const coreMaterial = new BABYLON.StandardMaterial('muzzleCoreMaterialOverride', scene);
  coreMaterial.diffuseColor = BABYLON.Color3.FromHexString('#fff2c2');
  coreMaterial.emissiveColor = BABYLON.Color3.FromHexString('#fff8db');
  coreMaterial.alpha = 0;
  coreMaterial.backFaceCulling = false;
  coreMaterial.disableLighting = true;
  muzzleCore.material = coreMaterial;

  const muzzleSmoke = BABYLON.MeshBuilder.CreatePlane('muzzleSmoke-override', { size: 0.56 }, scene);
  muzzleSmoke.parent = root;
  muzzleSmoke.position = new BABYLON.Vector3(0.04, 0.03, 1.2);
  muzzleSmoke.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  muzzleSmoke.isPickable = false;
  const smokeMaterial = new BABYLON.StandardMaterial('muzzleSmokeMaterialOverride', scene);
  smokeMaterial.diffuseColor = BABYLON.Color3.FromHexString('#b9c1c5');
  smokeMaterial.emissiveColor = BABYLON.Color3.FromHexString('#7f8b90');
  smokeMaterial.alpha = 0;
  smokeMaterial.backFaceCulling = false;
  smokeMaterial.disableLighting = true;
  muzzleSmoke.material = smokeMaterial;

  viewModel = {
    root,
    body,
    receiver,
    stock,
    barrel,
    opticRoot,
    opticBase,
    opticTube,
    rearLens,
    frontLens,
    reticleH,
    reticleV,
    reticleDot,
    muzzleFlash,
    muzzleCore,
    muzzleSmoke,
    flashTimer: 0,
    smokeTimer: 0,
    recoil: 0,
  };
}

function hasPlayerOptic(player = state.raid?.player) {
  if (!player) {
    return false;
  }
  const activeParts = getActivePartMapForWeapon(player.weapon, player);
  return Boolean(activeParts.optic && PART_DEFS[activeParts.optic]);
}

function getOperatorAbilitySummary(player = state.raid?.player) {
  if (!player) {
    return '';
  }
  if ((player.abilityActiveTimer ?? 0) > 0) {
    return L(`æ¿æ´»ä¸­ ${player.abilityActiveTimer.toFixed(1)}s`, `Active ${player.abilityActiveTimer.toFixed(1)}s`);
  }
  if ((player.abilityCooldown ?? 0) > 0) {
    return L(`å·å´ ${player.abilityCooldown.toFixed(1)}s`, `Cooldown ${player.abilityCooldown.toFixed(1)}s`);
  }
  const charges = Math.max(0, Number(player.abilityCharges ?? 0));
  return L(`å°±ç»ª Â· ${charges} æ¬¡`, `Ready Â· ${charges} charge${charges === 1 ? '' : 's'}`);
}

function getOperatorAbilityUiState(player = state.raid?.player) {
  if (!player) {
    return {
      summary: '',
      detail: '',
      fill: 0,
      color: '#8fd6b3',
    };
  }
  const operator = getPlayerOperatorDef(player);
  const activeDuration = Math.max(0.01, operator.abilityDuration ?? 1);
  const cooldownDuration = Math.max(0.01, operator.abilityCooldown ?? 10);
  const charges = Math.max(0, Number(player.abilityCharges ?? 0));

  if ((player.abilityActiveTimer ?? 0) > 0) {
    return {
      summary: getOperatorAbilitySummary(player),
      detail: L(`æç»­ ${Math.ceil(activeDuration)}sï¼ç»æåå·å´ ${Math.ceil(cooldownDuration)}s`, `Active ${Math.ceil(activeDuration)}s, then ${Math.ceil(cooldownDuration)}s cooldown`),
      fill: clamp((player.abilityActiveTimer ?? 0) / activeDuration, 0, 1),
      color: operator.abilityColor ?? '#8fd6b3',
    };
  }
  if ((player.abilityCooldownPending ?? false) && charges <= 0) {
    return {
      summary: L('ææç»æä¸­', 'Effect ending'),
      detail: L(`ç»æåè¿å¥ ${Math.ceil(cooldownDuration)}s å·å´`, `A ${Math.ceil(cooldownDuration)}s cooldown starts after the effect ends`),
      fill: 0.08,
      color: '#d1b46f',
    };
  }
  if ((player.abilityCooldown ?? 0) > 0) {
    return {
      summary: getOperatorAbilitySummary(player),
      detail: L(`å©ä½åè½ ${charges}ï¼å·å´åæ¢å¤`, `${charges} charge${charges === 1 ? '' : 's'} left, returns after cooldown`),
      fill: clamp((player.abilityCooldown ?? 0) / cooldownDuration, 0, 1),
      color: '#d1b46f',
    };
  }
  return {
    summary: getOperatorAbilitySummary(player),
    detail: L(`æç»­ ${Math.ceil(activeDuration)}s / å·å´ ${Math.ceil(cooldownDuration)}s`, `${Math.ceil(activeDuration)}s active / ${Math.ceil(cooldownDuration)}s cooldown`),
    fill: charges > 0 ? 1 : 0.12,
    color: charges > 0 ? '#8fd6b3' : '#8c98a4',
  };
}

function getNearestRaidZone(raid = state.raid, predicate = () => true) {
  if (!raid?.player) {
    return null;
  }
  let bestZone = null;
  let bestDistance = Infinity;
  for (const zone of raid.extractions ?? []) {
    if (!predicate(zone)) {
      continue;
    }
    const distance = distance2D(raid.player.x, raid.player.z, zone.x, zone.z);
    if (distance < bestDistance) {
      bestZone = zone;
      bestDistance = distance;
    }
  }
  return bestZone ? { zone: bestZone, distance: bestDistance } : null;
}

function buildSupportPromptText(raid = state.raid) {
  if (!raid?.player) {
    return '';
  }
  const parts = [];
  if ((raid.spawnSafeTimer ?? 0) > 0) {
    parts.push(L(`è½å°ä¿æ¤ ${raid.spawnSafeTimer.toFixed(1)}s`, `Spawn shield ${raid.spawnSafeTimer.toFixed(1)}s`));
  }
  const nearestReady = getNearestRaidZone(raid, (zone) => isExtractionCurrentlyAvailable(zone, raid));
  if (nearestReady) {
    parts.push(L(`æè¿æ¤ç¦» ${getZoneLabel(nearestReady.zone)} ${nearestReady.distance.toFixed(0)}m`, `Nearest extract ${getZoneLabel(nearestReady.zone)} ${nearestReady.distance.toFixed(0)}m`));
  } else {
    const nearestSwitch = getNearestRaidZone(raid, (zone) => zone.kind === 'switch');
    if (nearestSwitch) {
      parts.push(L(`${getZoneLabel(nearestSwitch.zone)}ï¼${getExtractionStatusLabel(nearestSwitch.zone, raid)}`, `${getZoneLabel(nearestSwitch.zone)}: ${getExtractionStatusLabel(nearestSwitch.zone, raid)}`));
    }
  }
  if (!parts.length) {
    return L('ç»§ç»­æç´¢å¹¶åå¤æ¤ç¦»ã', 'Keep looting and prepare to extract.');
  }
  return parts.join(' | ');
}

function useOperatorAbility() {
  const raid = state.raid;
  const player = raid?.player;
  if (!player) {
    return;
  }
  const operator = getPlayerOperatorDef(player);
  if ((player.abilityCharges ?? 0) <= 0) {
    notify(L(`æ²¡æå¯ç¨ç ${getOperatorItemName(player.operatorId)}ã`, `No ${getOperatorItemName(player.operatorId)} charges left.`), 'warning');
    return;
  }
  if ((player.abilityCooldown ?? 0) > 0) {
    notify(L(`æè½å·å´ä¸­ ${player.abilityCooldown.toFixed(1)}sã`, `Ability is cooling down for ${player.abilityCooldown.toFixed(1)}s.`), 'warning');
    return;
  }

  if (operator.id === 'medic' && player.health >= player.maxHealth && player.armor >= player.maxArmor) {
    notify(L('çå½ä¸æ¤ç²é½å¤äºæ»¡å¼ã', 'Health and armor are already full.'), 'warning');
    return;
  }

  player.abilityCharges -= 1;
  player.abilityCooldown = operator.abilityCooldown;
  player.abilityActiveTimer = operator.abilityDuration;
  player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, operator.abilityDuration);

  if (operator.id === 'assault') {
    spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor, 0.1, 0.12);
    notify(L(`å·²æ¿æ´» ${getOperatorSkillName(player.operatorId)}ã`, `Activated ${getOperatorSkillName(player.operatorId)}.`), 'success');
  } else if (operator.id === 'recon') {
    const radius = operator.scanRadius ?? 30;
    let revealedCount = 0;
    for (const enemy of raid.enemies) {
      if (enemy.dead) {
        continue;
      }
      if (distance2D(enemy.x, enemy.z, player.x, player.z) <= radius) {
        enemy.revealedTimer = Math.max(enemy.revealedTimer ?? 0, operator.abilityDuration);
        revealedCount += 1;
      }
    }
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, 1.4);
    spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor, 0.14, 0.14);
    notify(
      L(`èå²æ«æå·²å¯å¨ï¼åç° ${revealedCount} åæäººã`, `Pulse scan activated. ${revealedCount} enemies revealed.`),
      'success',
    );
  } else if (operator.id === 'medic') {
    player.health = Math.min(player.maxHealth, player.health + (operator.skillHeal ?? 28));
    player.armor = Math.min(player.maxArmor, player.armor + (operator.skillArmor ?? 16));
    player.damageFlash = 0;
    player.healTimer = 0;
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, 1.5);
    spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor, 0.12, 0.16);
    notify(L(`å·²ä½¿ç¨ ${getOperatorSkillName(player.operatorId)}ã`, `Used ${getOperatorSkillName(player.operatorId)}.`), 'success');
  }

  syncHud();
}

function renderBasePanel() {
  ensureExtendedRefs();
  refs.basePanel.classList.toggle('hidden', state.mode !== 'base');
  const survivalRate = state.save.stats.raids > 0
    ? `${Math.round((state.save.stats.survived / state.save.stats.raids) * 100)}%`
    : '--';
  const selectedWeaponId = getSelectedWeaponId();
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const selectedStats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });
  const selectedOperatorId = getSelectedOperatorId();
  const selectedMode = getLobbyModeDef();

  refs.summaryStrip.innerHTML = [
    summaryPill(L('èµé', 'Funds'), formatMoney(state.save.money)),
    summaryPill(L('ä»åº', 'Stash'), formatItemCount(state.save.stash.length)),
    summaryPill(L('æ¤ç¦»ç', 'Survival'), survivalRate),
    summaryPill(L('æé«å¸¦åº', 'Best Haul'), formatMoney(state.save.stats.bestHaul)),
  ].join('');

  refs.loadoutPrep.innerHTML = [
    prepRow(L('åµç§', 'Operator'), `${getOperatorName(selectedOperatorId)} Â· ${getOperatorSkillName(selectedOperatorId)}`),
    prepRow(L('ä¸å±éå·', 'Signature Item'), getOperatorItemName(selectedOperatorId)),
    prepRow(L('åºå»æ­¦å¨', 'Raid Weapon'), `${getWeaponLabel(selectedWeaponId)} Â· ${selectedStats.caliber}`),
    prepRow(L('é¦éå­å¼¹', 'Preferred Ammo'), L(`${getAmmoTierLabel(selectedAmmoId)} Â· åºå­ ${state.save.prepAmmo[selectedAmmoId] ?? 0}`, `${getAmmoTierLabel(selectedAmmoId)} Â· stock ${state.save.prepAmmo[selectedAmmoId] ?? 0}`)),
    prepRow(L('åå§å»çå', 'Starting Medkits'), `${BASE_MEDKITS + state.save.prep.medkitBonus + getOperatorDef(selectedOperatorId).startMedkitBonus}`),
    prepRow(L('åå§æ¤ç²', 'Starting Armor'), `${BASE_ARMOR + state.save.prep.armorBonus + getOperatorDef(selectedOperatorId).startArmorBonus}`),
    prepRow(L('èåå®¹é', 'Bag Capacity'), `${getBagSlots()} ${L('æ ¼', 'slots')} / ${formatWeight(getBagCapacity())}`),
    prepRow(L('æ­¦å¨ä¼¤å®³', 'Weapon Damage'), `${selectedStats.damage}`),
  ].join('');

  if (refs.operatorPanel) {
    refs.operatorPanel.innerHTML = renderOperatorPanel();
  }

  if (refs.armoryPanel) {
    refs.armoryPanel.innerHTML = renderArmoryPanel(selectedWeaponId);
  }

  refs.shopList.innerHTML = getShopEntries()
    .map((entry) => {
      const afford = state.save.money >= entry.price && !entry.disabled;
      return `
        <article class="shop-row">
          <div>
            <div class="item-title">${entry.name}</div>
            <div class="item-meta">${entry.description}</div>
            <div class="item-meta">${entry.status}</div>
          </div>
          <div class="stack-list">
            <button class="primary-button small" type="button" data-shop-id="${entry.id}" ${afford ? '' : 'disabled'}>
              ${entry.disabled ? L('å·²æ¥æ', 'Owned') : formatMoney(entry.price)}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  refs.stashList.innerHTML = state.save.stash.length
    ? state.save.stash
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${getItemLabel(item)}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${renderBaseItemActions(item)}
            </div>
          </article>
        `)
        .join('')
    : `<div class="item-meta">${L('ä»åºéè¿æ²¡æå¸¦åºæ¥çæå©åãæ¤ç¦»æååï¼ç©èµãå­å¼¹åæªæ¢°é¶ä»¶é½ä¼åºç°å¨è¿éã', 'The stash is empty. Loot, ammo, and weapon parts show up here after a successful extraction.')}</div>`;
}

function startRaid() {
  clearRaid();
  ensureExtendedRefs();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();
  state.input.aimHeld = false;

  state.save.stats.raids += 1;
  const activeExtractionIds = shuffle(extractionZones.map((zone) => zone.id)).slice(0, 2);
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const operator = getOperatorDef(getSelectedOperatorId());
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus + operator.startMedkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus + operator.startArmorBonus;
  const ammoInventory = defaultPrepAmmo();
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    timeLeft: RAID_DURATION,
    statusText: L('WASD ç§»å¨ï¼é¼ æ è½¬åï¼å·¦é® / F å¼ç«ã', 'WASD to move, mouse to look, left mouse / F to fire.'),
    interactionText: L('åå®ææç´¢åæ¸æä»»å¡ï¼åå»æ¤ç¦»ç¹ã', 'Finish the search and kill tasks before heading to extraction.'),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: false,
    extractionSequence: null,
    objectives: [
      { id: 'search', label: 'search', target: 2, progress: 0 },
      { id: 'kill', label: 'kill', target: 2, progress: 0 },
    ],
    player: {
      x: -4,
      z: 0,
      yaw: 2.9,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      operatorId: operator.id,
      abilityCharges: operator.utilityCharges,
      abilityCooldown: 0,
      abilityCooldownPending: false,
      abilityActiveTimer: 0,
      operatorEffectTimer: 0,
      isAiming: false,
      aimBlend: 0,
      radius: PLAYER_RADIUS,
      health: 100,
      maxHealth: 100,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: extractionZones.map((zone) => ({
      ...zone,
      active: activeExtractionIds.includes(zone.id),
      visual: null,
      pulse: Math.random() * Math.PI * 2,
    })),
    enemies: shuffle(enemySpawnDefs)
      .slice(0, 8)
      .map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(L('å·²è¿å¥å°éåºãå®æä»»å¡åæè½æ¤ç¦»ã', 'Raid started. Finish the tasks to unlock extraction.'), 'success');
}

function updateRaid(dt) {
  const raid = state.raid;
  const player = raid.player;

  if (viewModel) {
    viewModel.root.setEnabled(true);
  }

  player.abilityCooldown = Math.max(0, (player.abilityCooldown ?? 0) - dt);
  player.abilityActiveTimer = Math.max(0, (player.abilityActiveTimer ?? 0) - dt);
  player.operatorEffectTimer = Math.max(0, (player.operatorEffectTimer ?? 0) - dt);
  player.isAiming = Boolean((state.input.aimHeld ?? false) && !state.overlay && player.reloadTimer <= 0 && player.healTimer <= 0);
  player.aimBlend = lerp(player.aimBlend ?? 0, player.isAiming ? 1 : 0, 0.18);

  if (state.overlay) {
    syncPlayerCamera();
    animateRaidEntities(dt, true);
    syncHud();
    return;
  }

  raid.timeLeft = Math.max(0, raid.timeLeft - dt);
  if (raid.timeLeft <= 0) {
    finishRaid(false, 'time_expired', false);
    return;
  }

  const previousReload = player.reloadTimer;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.reloadTimer = Math.max(0, player.reloadTimer - dt);
  player.healTimer = Math.max(0, player.healTimer - dt);
  player.damageFlash = Math.max(0, player.damageFlash - dt * 2.4);
  player.recoilKick = Math.max(0, (player.recoilKick ?? 0) - dt * 6.6);
  player.damageJolt = Math.max(0, (player.damageJolt ?? 0) - dt * 4.4);
  player.nearHitPulse = Math.max(0, (player.nearHitPulse ?? 0) - dt * 3.4);
  raid.hitConfirmTimer = Math.max(0, (raid.hitConfirmTimer ?? 0) - dt * 4.8);

  if (previousReload > 0 && player.reloadTimer === 0) {
    completeReload();
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateEffects(dt);
  animateRaidEntities(dt, false);
  syncPlayerCamera();
  syncHud();

  refs.timeValue.style.color = raid.timeLeft < 45 ? '#f0c57d' : '';
}

function updatePlayer(dt) {
  const raid = state.raid;
  const player = raid.player;
  const forward = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
  const right = { x: Math.cos(player.yaw), z: -Math.sin(player.yaw) };
  const operator = getPlayerOperatorDef(player);

  let moveX = 0;
  let moveZ = 0;
  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
    moveX -= right.x;
    moveZ -= right.z;
  }
  if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
    moveX += right.x;
    moveZ += right.z;
  }

  const movement = normalize2D(moveX, moveZ);
  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  let speed = (sprinting ? 9.2 : 5.8) * (operator.moveMult ?? 1);
  if (player.isAiming) {
    speed *= 0.62;
  }
  if (operator.id === 'assault' && player.abilityActiveTimer > 0) {
    speed *= 1.34;
  }

  moveEntityWithCollision(player, movement.x * speed * dt, movement.z * speed * dt, player.radius);
  player.velocityBob += magnitude(movement.x, movement.z) * (sprinting ? 18 : 11) * dt;

  if (state.input.fireHeld) {
    attemptShoot();
  }

  const interaction = getCurrentInteraction();
  if (interaction?.type === 'extract' && state.input.interactHeld) {
    if (!raid.tasksComplete) {
      player.extractionProgress = 0;
      raid.interactionText = L(`åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Finish tasks first: ${getRaidObjectiveStatus(raid)}`);
    } else {
      player.extractionZoneId = interaction.zone.id;
      player.extractionProgress += dt;
      raid.interactionText = L(
        `æ­£å¨ä» ${getZoneLabel(interaction.zone)} æ¤ç¦» ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`,
        `Extracting at ${getZoneLabel(interaction.zone)} ${Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1)} / ${EXTRACTION_HOLD_TIME}s`,
      );
      if (player.extractionProgress >= EXTRACTION_HOLD_TIME) {
        finishRaid(true, `extract:${interaction.zone.id}`, true);
        return;
      }
    }
  } else {
    player.extractionProgress = Math.max(0, player.extractionProgress - dt * 2.6);
    player.extractionZoneId = null;
  }

  if (interaction?.type === 'container') {
    raid.interactionText = L(`æ E æç´¢ ${getContainerLabel(interaction.container)}`, `Press E to search ${getContainerLabel(interaction.container)}`);
  } else if (interaction?.type === 'extract') {
    raid.interactionText = raid.tasksComplete
      ? L(`æä½ E ä» ${getZoneLabel(interaction.zone)} æ¤ç¦»`, `Hold E to extract from ${getZoneLabel(interaction.zone)}`)
      : L(`åå®æä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Finish tasks first: ${getRaidObjectiveStatus(raid)}`);
  } else {
    raid.interactionText = raid.tasksComplete
      ? L('å¯ä»¥ç»§ç»­æç´¢æå©åï¼æèåå¾æ¤ç¦»ç¹ã', 'Search for loot or head to an extraction point.')
      : L(`å½åä»»å¡ï¼${getRaidObjectiveStatus(raid)}`, `Current tasks: ${getRaidObjectiveStatus(raid)}`);
  }

  if (player.health <= 0) {
    finishRaid(false, 'player_killed', false);
  }
}

function renderRaidLoadoutMarkup() {
  const player = state.raid?.player;
  if (!player) {
    return '';
  }
  const stats = getCurrentPlayerWeaponStats(player);
  const partLines = getActivePartIds(player.weapon, player)
    .map((partId) => getPartLabel(partId))
    .filter(Boolean);
  return [
    prepRow(L('åµç§', 'Operator'), getOperatorName(player.operatorId)),
    prepRow(L('æè½', 'Ability'), `${getOperatorSkillName(player.operatorId)} Â· ${getOperatorAbilitySummary(player)}`),
    prepRow(L('ä¸å±éå·', 'Signature Item'), `${getOperatorItemName(player.operatorId)} Ã ${Math.max(0, Number(player.abilityCharges ?? 0))}`),
    prepRow(L('å½åæ­¦å¨', 'Current Weapon'), `${getWeaponLabel(player.weapon)} Â· ${stats.damage} ${L('ä¼¤å®³', 'damage')}`),
    prepRow(L('å½åå­å¼¹', 'Current Ammo'), getAmmoTierLabel(player.currentAmmoId)),
    prepRow(L('å¼¹å£ / å¤å¼¹', 'Mag / Reserve'), getReserveAmmoLabel(player)),
    prepRow(L('æªæ¢°é¶ä»¶', 'Weapon Parts'), partLines.length ? partLines.join(' / ') : L('æ ', 'None')),
  ].join('');
}

function attemptShoot() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  const weapon = getCurrentPlayerWeaponStats(player);
  const operator = getPlayerOperatorDef(player);
  if (player.fireCooldown > 0 || player.reloadTimer > 0 || player.healTimer > 0) {
    return;
  }
  if (player.ammoInMag <= 0) {
    if (getCurrentReserveAmmo(player) > 0) {
      reloadWeapon();
    } else {
      notify(L('å½åå­å¼¹å·²ç»æç©ºã', 'The current ammo is empty.'), 'danger');
    }
    return;
  }

  const aiming = Boolean(player.isAiming);
  const hasOptic = hasPlayerOptic(player);
  const recoilMultiplier = (aiming ? 0.72 : 1) * (operator.id === 'assault' ? 0.92 : 1);
  const overdriveSpreadMult = operator.id === 'assault' && player.abilityActiveTimer > 0 ? 0.78 : 1;

  player.fireCooldown = 1 / weapon.fireRate;
  player.ammoInMag -= 1;
  if (viewModel) {
    viewModel.flashTimer = 1;
    viewModel.smokeTimer = 1;
    viewModel.recoil = Math.min(1.35, (viewModel.recoil ?? 0) + (weapon.pellets > 1 ? 1.05 : 0.72) * recoilMultiplier);
  }
  player.recoilKick = Math.min(1.2, (player.recoilKick ?? 0) + (weapon.pellets > 1 ? 1.04 : 0.62) * recoilMultiplier);
  player.pitch = clamp(player.pitch - (weapon.pellets > 1 ? 0.018 : 0.008) * recoilMultiplier, -1.16, 1.16);
  playGunshotAudio(weapon, { gain: 1 });

  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const aimSpreadMult = aiming ? (hasOptic ? 0.32 : 0.54) : 1;
  const baseSpread = (sprinting ? weapon.spread * 1.8 : weapon.spread) * (operator.spreadMult ?? 1) * aimSpreadMult * overdriveSpreadMult;
  const pelletCount = weapon.pellets ?? 1;
  const origin = new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z);
  let tracerEnd = null;

  for (let pellet = 0; pellet < pelletCount; pellet += 1) {
    const spread = pelletCount > 1 ? baseSpread : baseSpread * 0.8;
    const yaw = player.yaw + randomBetween(-spread, spread);
    const pitch = player.pitch + randomBetween(-spread * 0.65, spread * 0.65);
    const direction = new BABYLON.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(-pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    if (pellet === 0) {
      spawnMuzzleExhaust(origin, direction);
    }
    const ray = new BABYLON.Ray(origin, direction, weapon.range);
    const pick = scene.pickWithRay(ray, (mesh) => Boolean(mesh?.metadata?.raycastTarget));
    let end = origin.add(direction.scale(weapon.range * 0.7));

    if (pick?.hit && pick.pickedPoint) {
      end = pick.pickedPoint;
      if (pick.pickedMesh?.metadata?.raycastTarget === 'enemy') {
        const enemy = state.raid.enemies.find((entry) => entry.id === pick.pickedMesh.metadata.enemyId);
        if (enemy && !enemy.dead) {
          damageEnemy(enemy, getWeaponDamage(player.weapon, { ammoId: player.currentAmmoId, player }));
        }
      } else {
        spawnImpactBurst(end, '#8ad8ff', weapon.pellets > 1 ? 1 : 0.78, 'hard');
        playImpactAudio(end, 'hard');
      }
    }
    tracerEnd ??= end;
  }

  spawnTracer(origin, tracerEnd ?? origin, weapon.tracer, 0.08);
}

function reloadWeapon() {
  const player = state.raid?.player;
  if (!player || player.reloadTimer > 0 || player.healTimer > 0 || player.mobilityAction || player.ammoInMag >= player.magSize || getCurrentReserveAmmo(player) <= 0) {
    return;
  }
  unlockAudioContext();
  const operator = getPlayerOperatorDef(player);
  const reloadBoost = operator.id === 'assault' && player.abilityActiveTimer > 0 ? 0.84 : 1;
  player.reloadTimer = getCurrentPlayerWeaponStats(player).reload * (operator.reloadMult ?? 1) * reloadBoost;
  playReloadAudio(getCurrentPlayerWeaponStats(player), false);
}

function useMedkit() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  unlockAudioContext();
  if (player.medkits <= 0) {
    notify(L('\u6ca1\u6709\u53ef\u7528\u7684\u533b\u7597\u5305\u3002', 'No medkits available.'), 'warning');
    return;
  }
  if (player.health >= player.maxHealth || player.healTimer > 0 || player.mobilityAction) {
    return;
  }
  const operator = getPlayerOperatorDef(player);
  beginPlayerUseAction({
    duration: PLAYER_HEAL_COOLDOWN * (operator.healCooldownMult ?? 1),
    flavor: 'medkit',
    labelZh: '\u4f7f\u7528\u533b\u7597\u5305',
    labelEn: 'Using medkit',
    onComplete: () => {
      player.medkits -= 1;
      player.health = Math.min(player.maxHealth, player.health + PLAYER_HEAL_AMOUNT);
      player.damageFlash = 0;
      notify(L('\u533b\u7597\u5305\u5df2\u4f7f\u7528\u3002', 'Medkit used.'), 'success');
      syncHud();
    },
  });
}
function updateEnemies(dt) {
  const raid = state.raid;
  const player = raid.player;
  const operator = getPlayerOperatorDef(player);
  const detectMult = operator.detectMult ?? 1;
  const spawnSafeRadius = raid.spawnSafeRadius ?? SPAWN_SAFE_RADIUS;
  const spawnSafeActive =
    (raid.spawnSafeTimer ?? 0) > 0 &&
    distance2D(player.x, player.z, raid.spawnSafeCenterX ?? player.x, raid.spawnSafeCenterZ ?? player.z) <= spawnSafeRadius;

  for (const enemy of raid.enemies) {
    enemy.damageFlash = Math.max(0, enemy.damageFlash - dt * 2.4);
    enemy.muzzleTimer = Math.max(0, enemy.muzzleTimer - dt * 10);
    enemy.revealedTimer = Math.max(0, (enemy.revealedTimer ?? 0) - dt);
    enemy.dashTimer = Math.max(0, (enemy.dashTimer ?? 0) - dt);
    enemy.dashCooldownTimer = Math.max(0, (enemy.dashCooldownTimer ?? 0) - dt);
    enemy.strafeTimer = Math.max(0, (enemy.strafeTimer ?? 0) - dt);
    enemy.holdTimer = Math.max(0, (enemy.holdTimer ?? 0) - dt);
    enemy.investigateTimer = Math.max(0, (enemy.investigateTimer ?? 0) - dt);
    enemy.broadcastCooldown = Math.max(0, (enemy.broadcastCooldown ?? 0) - dt);
    enemy.repositionTimer = Math.max(0, (enemy.repositionTimer ?? 0) - dt);
    enemy.burstMoveTimer = Math.max(0, (enemy.burstMoveTimer ?? 0) - dt);
    enemy.mobilityCooldown = Math.max(0, (enemy.mobilityCooldown ?? 0) - dt);
    enemy.proneCooldown = Math.max(0, (enemy.proneCooldown ?? 0) - dt);
    enemy.proneTimer = Math.max(0, (enemy.proneTimer ?? 0) - dt);
    advanceProneBlend(enemy, dt);
    if ((enemy.proneTimer ?? 0) <= 0) {
      enemy.isProne = false;
    }

    if (enemy.dead) {
      enemy.corpseTimer = Math.max(0, (enemy.corpseTimer ?? 0) - dt);
      if (enemy.corpseTimer <= 0 && !enemy.despawned) {
        enemy.despawned = true;
        if (enemy.dropPending && enemy.dropItem) {
          const dropName = L('\u6218\u573a\u6389\u843d', 'Battlefield Drop');
          const container = {
            id: 'drop-' + enemy.id,
            name: dropName,
            x: enemy.x + randomBetween(-0.4, 0.4),
            z: enemy.z + randomBetween(-0.4, 0.4),
            pool: 'valuable',
            tier: 2,
            opened: false,
            items: [enemy.dropItem],
            visual: createContainerVisual({ id: 'drop-' + enemy.id, name: dropName, x: enemy.x, z: enemy.z, pool: 'valuable' }),
            highlight: 0,
          };
          container.visual.root.position.x = container.x;
          container.visual.root.position.z = container.z;
          raid.containers.push(container);
        }
      }
      continue;
    }

    const distanceToPlayer = distance2D(enemy.x, enemy.z, player.x, player.z);
    const canPassivelyDetectPlayer = !spawnSafeActive || distanceToPlayer > spawnSafeRadius;
    const hasLineOfSight =
      canPassivelyDetectPlayer &&
      distanceToPlayer < enemy.detectRange + 8 &&
      !lineOfSightBlocked(enemy.x, enemy.z, player.x, player.z);

    if (hasLineOfSight && distanceToPlayer < enemy.detectRange * detectMult) {
      enemy.alertTimer = Math.max(enemy.alertTimer ?? 0, 5.2);
      enemy.investigateTimer = Math.max(enemy.investigateTimer ?? 0, 5.4);
      enemy.lastKnownPlayerX = player.x;
      enemy.lastKnownPlayerZ = player.z;
      if ((enemy.broadcastCooldown ?? 0) <= 0) {
        broadcastEnemyAlert(enemy, raid, player);
      }
    } else {
      enemy.alertTimer = Math.max(0, (enemy.alertTimer ?? 0) - dt);
    }

    let targetX = enemy.x;
    let targetZ = enemy.z;
    let moving = false;
    enemy.combatState = 'patrol';

    if ((enemy.alertTimer ?? 0) > 0 || (enemy.investigateTimer ?? 0) > 0) {
      const pursuitX = hasLineOfSight ? player.x : (enemy.lastKnownPlayerX ?? player.x);
      const pursuitZ = hasLineOfSight ? player.z : (enemy.lastKnownPlayerZ ?? player.z);
      const pursuitDirection = normalize2D(pursuitX - enemy.x, pursuitZ - enemy.z);
      const lateral = (pursuitDirection.x || pursuitDirection.z)
        ? { x: -pursuitDirection.z, z: pursuitDirection.x }
        : { x: enemy.strafeDirection ?? 1, z: 0 };
      enemy.heading = lerpAngle(enemy.heading, Math.atan2(pursuitX - enemy.x, pursuitZ - enemy.z), hasLineOfSight ? 0.14 : 0.08);

      if (hasLineOfSight) {
        const inFireRange = distanceToPlayer <= enemy.preferredRange + 5;
        const inLongFireRange = distanceToPlayer <= (enemy.longFireRange ?? enemy.preferredRange + 10);
        const wantsReposition = (enemy.repositionTimer ?? 0) <= 0;
        if (wantsReposition) {
          enemy.repositionTimer = enemy.type === 'scout'
            ? randomBetween(0.22, 0.52)
            : enemy.type === 'hunter'
              ? randomBetween(0.32, 0.68)
              : randomBetween(0.4, 0.82);
          enemy.burstMoveTimer = enemy.type === 'scout'
            ? randomBetween(0.22, 0.48)
            : enemy.type === 'hunter'
              ? randomBetween(0.18, 0.38)
              : randomBetween(0.12, 0.26);
          if (Math.random() < (enemy.type === 'bruiser' ? 0.42 : 0.76)) {
            enemy.strafeDirection *= -1;
          }
        }
        tryEnemyMobilityAction(enemy, pursuitDirection, lateral, distanceToPlayer, hasLineOfSight, wantsReposition);
        if (enemy.type === 'scout') {
          if (enemy.strafeTimer <= 0 || wantsReposition) {
            enemy.strafeTimer = randomBetween(0.22, 0.58);
            if (Math.random() < 0.82) {
              enemy.strafeDirection *= -1;
            }
          }
          if (
            enemy.skill === 'dash' &&
            enemy.dashCooldownTimer <= 0 &&
            enemy.dashTimer <= 0 &&
            (distanceToPlayer > enemy.preferredRange * 0.78 || wantsReposition)
          ) {
            enemy.dashTimer = enemy.dashDuration ?? 1.1;
            enemy.dashCooldownTimer = enemy.dashCooldown ?? 4.5;
            spawnPulse(new BABYLON.Vector3(enemy.x, 0.7, enemy.z), '#9dd8ef', 0.18, 0.28);
          }
          const strafeRadius = enemy.strafeRadius ?? 4.6;
          if (distanceToPlayer > enemy.preferredRange * 1.16) {
            targetX = player.x + lateral.x * enemy.strafeDirection * (strafeRadius * 0.88) - pursuitDirection.x * enemy.flankDistance;
            targetZ = player.z + lateral.z * enemy.strafeDirection * (strafeRadius * 0.88) - pursuitDirection.z * enemy.flankDistance;
            enemy.combatState = 'alert';
          } else if (distanceToPlayer < enemy.preferredRange * 0.7) {
            targetX = enemy.x - pursuitDirection.x * enemy.retreatBias + lateral.x * enemy.strafeDirection * (strafeRadius * 0.9);
            targetZ = enemy.z - pursuitDirection.z * enemy.retreatBias + lateral.z * enemy.strafeDirection * (strafeRadius * 0.9);
            enemy.combatState = 'flank';
          } else {
            targetX = player.x + lateral.x * enemy.strafeDirection * strafeRadius - pursuitDirection.x * enemy.flankDistance;
            targetZ = player.z + lateral.z * enemy.strafeDirection * strafeRadius - pursuitDirection.z * enemy.flankDistance;
            enemy.combatState = enemy.dashTimer > 0 ? 'flank' : 'engage';
          }
          moving = true;
        } else if (enemy.type === 'hunter') {
          if (enemy.strafeTimer <= 0 || wantsReposition) {
            enemy.strafeTimer = randomBetween(0.34, 0.82);
            if (Math.random() < 0.8) {
              enemy.strafeDirection *= -1;
            }
          }
          const strafeRadius = enemy.strafeRadius ?? 3.4;
          if (distanceToPlayer > enemy.preferredRange * 1.2) {
            targetX = player.x + lateral.x * enemy.strafeDirection * (strafeRadius * 0.8) - pursuitDirection.x * 0.9;
            targetZ = player.z + lateral.z * enemy.strafeDirection * (strafeRadius * 0.8) - pursuitDirection.z * 0.9;
            moving = true;
            enemy.combatState = 'alert';
          } else if (distanceToPlayer < enemy.preferredRange * 0.72) {
            targetX = enemy.x - pursuitDirection.x * enemy.retreatBias + lateral.x * enemy.strafeDirection * (strafeRadius * 0.86);
            targetZ = enemy.z - pursuitDirection.z * enemy.retreatBias + lateral.z * enemy.strafeDirection * (strafeRadius * 0.86);
            moving = true;
            enemy.combatState = 'flank';
          } else {
            targetX = player.x + lateral.x * enemy.strafeDirection * strafeRadius - pursuitDirection.x * enemy.flankDistance;
            targetZ = player.z + lateral.z * enemy.strafeDirection * strafeRadius - pursuitDirection.z * enemy.flankDistance;
            moving = true;
            enemy.combatState = 'engage';
          }
        } else {
          if (distanceToPlayer > enemy.preferredRange * 0.78) {
            targetX = player.x + lateral.x * enemy.strafeDirection * 1.05 - pursuitDirection.x * 0.45;
            targetZ = player.z + lateral.z * enemy.strafeDirection * 1.05 - pursuitDirection.z * 0.45;
            moving = true;
            enemy.combatState = distanceToPlayer > enemy.preferredRange ? 'alert' : 'engage';
          } else {
            if (enemy.holdTimer <= 0 || wantsReposition) {
              enemy.holdTimer = randomBetween(0.26, 0.68);
              if (Math.random() < 0.58) {
                enemy.strafeDirection *= -1;
              }
            }
            targetX = enemy.x + lateral.x * enemy.strafeDirection * (enemy.strafeRadius ?? 2.1);
            targetZ = enemy.z + lateral.z * enemy.strafeDirection * (enemy.strafeRadius ?? 2.1);
            moving = true;
            enemy.combatState = 'engage';
          }
        }

        if (enemy.isProne) {
          moving = false;
          enemy.combatState = 'engage';
        }

        enemy.shootCooldown -= dt;
        const useLongShot = !inFireRange && inLongFireRange;
        if ((inFireRange || useLongShot) && enemy.shootCooldown <= 0 && canShootDuringMobilityAction(enemy.mobilityAction)) {
          enemyShoot(enemy, useLongShot
            ? {
                accuracyMult: enemy.type === 'hunter' ? 0.88 : enemy.type === 'bruiser' ? 0.76 : 0.64,
                damageMult: enemy.type === 'hunter' ? 0.82 : enemy.type === 'bruiser' ? 0.9 : 0.72,
                missSpread: enemy.type === 'hunter' ? 3.4 : enemy.type === 'bruiser' ? 3.1 : 4.2,
                minHitChance: enemy.type === 'hunter' ? 0.22 : 0.16,
                maxHitChance: enemy.type === 'hunter' ? 0.74 : enemy.type === 'bruiser' ? 0.68 : 0.6,
              }
            : {});
          enemy.shootCooldown = enemy.fireInterval * (useLongShot ? (enemy.type === 'hunter' ? 1.16 : 1.34) : 1) + randomBetween(useLongShot ? -0.06 : -0.15, useLongShot ? 0.24 : 0.18);
          if (enemy.combatState === 'alert' && !useLongShot) {
            enemy.combatState = 'engage';
          }
        }
      } else if ((enemy.investigateTimer ?? 0) > 0) {
        const lastKnownX = enemy.lastKnownPlayerX ?? enemy.x;
        const lastKnownZ = enemy.lastKnownPlayerZ ?? enemy.z;
        const distanceToLastKnown = distance2D(enemy.x, enemy.z, lastKnownX, lastKnownZ);
        enemy.combatState = 'search';
        if (distanceToLastKnown > 1.1) {
          targetX = lastKnownX;
          targetZ = lastKnownZ;
          moving = true;
        } else {
          if (enemy.strafeTimer <= 0) {
            enemy.strafeTimer = randomBetween(0.45, 1);
            if (Math.random() < 0.5) {
              enemy.strafeDirection *= -1;
            }
          }
          targetX = enemy.x + lateral.x * enemy.strafeDirection * 1.4;
          targetZ = enemy.z + lateral.z * enemy.strafeDirection * 1.4;
          moving = enemy.strafeTimer > 0.35;
        }
      }
    }

    if (!moving && enemy.combatState === 'patrol') {
      const patrolTarget = enemy.route[enemy.routeIndex];
      if (distance2D(enemy.x, enemy.z, patrolTarget.x, patrolTarget.z) < 1.2) {
        enemy.routeIndex = (enemy.routeIndex + 1) % enemy.route.length;
      }
      const activeTarget = enemy.route[enemy.routeIndex];
      targetX = activeTarget.x;
      targetZ = activeTarget.z;
      moving = true;
      enemy.heading = lerpAngle(enemy.heading, Math.atan2(targetX - enemy.x, targetZ - enemy.z), 0.08);
    }

    if (moving) {
      const direction = normalize2D(targetX - enemy.x, targetZ - enemy.z);
      let speedMult = (enemy.combatSpeedMult ?? 1) * (enemy.dashTimer > 0 ? (enemy.dashSpeedMult ?? 1.6) : 1);
      if ((enemy.burstMoveTimer ?? 0) > 0) {
        speedMult *= enemy.type === 'scout' ? 1.22 : enemy.type === 'hunter' ? 1.14 : 1.08;
      }
      if (enemy.combatState === 'search') {
        speedMult *= 0.94;
      } else if (enemy.type === 'hunter' && enemy.combatState === 'engage') {
        speedMult *= 0.98;
      }
      if (!updateMobilityActionMotion(enemy, dt, enemy.radius)) {
        moveEntityWithCollision(enemy, direction.x * enemy.speed * speedMult * dt, direction.z * enemy.speed * speedMult * dt, enemy.radius);
      }
    } else {
      updateMobilityActionMotion(enemy, dt, enemy.radius);
    }
  }
}
function animateRaidEntities(dt) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const allowReconReveal = raid.player?.operatorId === 'recon' && (raid.player?.abilityActiveTimer ?? 0) > 0;

  for (const container of raid.containers) {
    if (!container.visual) {
      continue;
    }
    const isCurrent = state.ui.currentContainerId === container.id;
    container.highlight = lerp(container.highlight, isCurrent ? 1 : 0, 0.12);
    container.visual.root.rotation.y += dt * 0.45;
    container.visual.beacon.scaling.y = 0.9 + Math.sin(performance.now() * 0.003 + container.x * 0.2) * 0.08;
    container.visual.beacon.material.alpha = container.opened ? 0.08 : 0.28 + container.highlight * 0.18;
    container.visual.base.material.emissiveColor = BABYLON.Color3.FromHexString(container.opened ? '#223033' : '#38565e').scale(0.18 + container.highlight * 0.16);
    container.visual.lid.rotation.x = container.opened ? -0.9 : 0;
  }

  for (const zone of raid.extractions) {
    if (!zone.visual) {
      continue;
    }
    const extractingHere = raid.extractionSequence?.zoneId === zone.id;
    const available = isExtractionCurrentlyAvailable(zone, raid);
    const armedSwitch = zone.kind === 'switch' && zone.switchArmed && (zone.switchTimer ?? 0) > 0;
    const zoneColor = available ? '#8fd6b3' : zone.kind === 'task' ? '#f0c57d' : armedSwitch ? '#8bbdff' : zone.switchExpired ? '#677177' : '#5c686d';
    zone.pulse += dt * (available ? 2.8 : 1.4);
    zone.visual.ring.rotation.z += dt * (extractingHere ? 3.2 : 0.9);
    zone.visual.innerRing.rotation.z -= dt * (extractingHere ? 4.6 : 1.5);
    zone.visual.pillar.scaling.y = 0.74 + Math.sin(zone.pulse) * 0.15 + (extractingHere ? 0.52 : 0);
    zone.visual.pillar.material.alpha = (available ? 0.16 : 0.08) + Math.sin(zone.pulse) * 0.06 + (extractingHere ? 0.18 : 0);
    zone.visual.core.material.alpha = (available ? 0.24 : 0.1) + Math.sin(zone.pulse * 1.3) * 0.08 + (extractingHere ? 0.2 : 0);
    zone.visual.pad.material.emissiveColor = BABYLON.Color3.FromHexString(zoneColor).scale(extractingHere ? 0.62 : available ? 0.22 : 0.1);
    zone.visual.core.material.emissiveColor = BABYLON.Color3.FromHexString(zoneColor).scale(extractingHere ? 0.78 : available ? 0.34 : 0.12);
    zone.visual.gateBeam.material.emissiveColor = BABYLON.Color3.FromHexString(zoneColor).scale(available ? 0.18 : 0.06);
    for (let index = 0; index < zone.visual.pylons.length; index += 1) {
      const pylon = zone.visual.pylons[index];
      const cap = zone.visual.pylonCaps[index];
      pylon.position.y = 1.25 + Math.sin(zone.pulse + index * 0.9) * 0.05;
      cap.position.y = 2.6 + Math.sin(zone.pulse * 1.6 + index) * 0.1;
      cap.material.emissiveColor = BABYLON.Color3.FromHexString(zoneColor).scale(extractingHere ? 0.8 : available ? 0.24 : 0.08);
    }
  }

  for (const point of raid.switchPoints ?? []) {
    if (!point.visual) {
      continue;
    }
    const activeSequence = raid.switchSequence?.pointId === point.id ? raid.switchSequence : null;
    const progress = activeSequence ? clamp(1 - activeSequence.timer / activeSequence.duration, 0, 1) : 0;
    point.pulse = (point.pulse ?? 0) + dt * (point.used ? 2.4 : 1.3);
    point.visual.root.rotation.y = Math.sin(point.pulse * 0.45) * 0.04;
    point.visual.leverPivot.rotation.x = point.used ? -1.02 : progress > 0 ? -1.02 * progress : 0;
    const lampColor = point.used ? '#8fd6b3' : activeSequence ? '#d7b56d' : '#8bbdff';
    point.visual.lamp.material.emissiveColor = BABYLON.Color3.FromHexString(lampColor).scale(point.used ? 0.36 : activeSequence ? 0.28 : 0.14 + Math.sin(point.pulse * 2.1) * 0.04);
    point.visual.glow.material.emissiveColor = BABYLON.Color3.FromHexString(lampColor);
    point.visual.glow.material.alpha = point.used ? 0.28 : activeSequence ? 0.24 : 0.12;
  }

  for (const enemy of raid.enemies) {
    if (!enemy.visual) {
      continue;
    }
    if (enemy.despawned) {
      enemy.visual.root.setEnabled(false);
      continue;
    }
    enemy.visual.root.setEnabled(true);
    enemy.visual.root.position.x = enemy.x;
    enemy.visual.root.position.z = enemy.z;
    enemy.visual.root.rotation.y = enemy.heading;
    if (enemy.dead) {
      enemy.visual.root.position.y = lerp(enemy.visual.root.position.y, 0.06, 0.12);
      enemy.visual.root.rotation.x = lerp(enemy.visual.root.rotation.x, Math.PI / 2 * 0.92, 0.14);
      enemy.visual.root.rotation.z = lerp(enemy.visual.root.rotation.z, enemy.fallTilt ?? 0, 0.12);
      enemy.visual.flash.material.alpha = 0;
      continue;
    }
    const enemyPose = getActorMobilityPose(enemy, true);
    const baseBob = Math.sin(performance.now() * 0.005 + enemy.x) * 0.04;
    enemy.visual.root.rotation.x = lerp(enemy.visual.root.rotation.x, enemyPose.rootPitch, 0.18);
    enemy.visual.root.rotation.z = lerp(enemy.visual.root.rotation.z, enemyPose.rootRoll, 0.18);
    enemy.visual.root.position.y = Math.max(0.02, baseBob + enemyPose.visualYOffset);
    if (enemy.visual.hitbox) {
      const baseHitboxY = enemy.type === 'bruiser' ? 1.15 : 1.0;
      enemy.visual.hitbox.position.y = Math.max(0.42, baseHitboxY + enemyPose.hitboxYOffset);
      enemy.visual.hitbox.scaling.y = enemyPose.hitboxScaleY;
      enemy.visual.hitbox.scaling.x = enemyPose.hitboxScaleXZ;
      enemy.visual.hitbox.scaling.z = enemyPose.hitboxScaleXZ;
    }
    const baseGlow = BABYLON.Color3.FromHexString(enemyColorForType(enemy.type)).scale(enemy.damageFlash > 0 ? 0.38 : 0.1);
    const revealGlow = allowReconReveal
      ? BABYLON.Color3.FromHexString('#84e6ff').scale(Math.min(0.48, (enemy.revealedTimer ?? 0) * 0.18))
      : BABYLON.Color3.Black();
    for (const mesh of enemy.visual.emissiveMeshes ?? [enemy.visual.body]) {
      mesh.material.emissiveColor = baseGlow.add(revealGlow);
    }
    enemy.visual.flash.material.alpha = enemy.muzzleTimer > 0 ? 0.28 + enemy.muzzleTimer * 0.4 : 0;
  }
}
function syncPlayerCamera() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }

  const operator = getPlayerOperatorDef(player);
  const extractionSequence = state.raid?.extractionSequence;
  const extractionBlend = extractionSequence
    ? clamp(1 - extractionSequence.timer / extractionSequence.duration, 0, 1)
    : 0;
  const hasOptic = hasPlayerOptic(player);
  const aimBlend = player.aimBlend ?? 0;
  const now = performance.now() * 0.018;
  const recoilKick = player.recoilKick ?? 0;
  const damageJolt = player.damageJolt ?? 0;
  const nearHitPulse = player.nearHitPulse ?? 0;
  const playerPose = getActorMobilityPose(player, false);
  const proneBlend = clamp(player.proneBlend ?? (player.isProne ? 1 : 0), 0, 1);
  const action = player.mobilityAction;
  const actionProgress = action ? clamp(1 - action.timer / Math.max(action.duration, 0.001), 0, 1) : 0;
  const slideBlend = action?.type === 'slide' ? 1 : 0;
  const rollWave = action?.type === 'roll' ? Math.sin(actionProgress * Math.PI * 2) : 0;
  const dodgeWave = action?.type === 'dodge' ? Math.sin(actionProgress * Math.PI) : 0;
  const jumpLift = action?.type === 'jump' ? Math.sin(actionProgress * Math.PI) * 0.08 : 0;
  const dropBlend = clamp((player.dropTimer ?? 0) / Math.max(player.dropDuration ?? DEPLOY_ANIMATION_DURATION, 0.001), 0, 1);
  const dropOffset = (player.dropStartHeight ?? DEPLOY_START_HEIGHT) * dropBlend * dropBlend;
  const shakeX = Math.sin(now * 1.8) * damageJolt * 0.06 + Math.sin(now * 1.35) * nearHitPulse * 0.018;
  const shakeY = Math.cos(now * 1.55) * damageJolt * 0.03;
  const shakeZ = Math.cos(now * 1.22) * damageJolt * 0.05;

  camera.position.x = player.x + shakeX;
  camera.position.y = getPlayerViewHeight(player) + dropOffset + shakeY - recoilKick * 0.02 + extractionBlend * 1.2;
  camera.position.z = player.z + shakeZ - extractionBlend * 0.1;
  camera.rotation.x = player.pitch + Math.sin(player.velocityBob) * 0.01 * (1 - aimBlend) - recoilKick * 0.05 + Math.sin(now) * damageJolt * 0.012 - extractionBlend * 0.14 - dropBlend * 0.12;
  camera.rotation.y = player.yaw;
  camera.rotation.z = (player.damageFlash > 0 ? Math.sin(now * 1.6) * player.damageFlash * 0.04 : 0) + nearHitPulse * 0.012 + Math.sin(now * 1.1) * extractionBlend * 0.026 + playerPose.cameraRoll;

  let fovTarget = 0.88 - aimBlend * (hasOptic ? 0.18 : 0.1) + nearHitPulse * 0.015 - recoilKick * 0.012;
  if (operator.id === 'assault' && player.abilityActiveTimer > 0) {
    fovTarget += 0.018;
  }
  if (extractionBlend > 0) {
    fovTarget -= extractionBlend * 0.07;
  }
  camera.fov = lerp(camera.fov, fovTarget, 0.22);

  if (viewModel) {
    const baseX = 0.32 + Math.sin(player.velocityBob * 0.5) * 0.02 - recoilKick * 0.04;
    const baseY = -0.34 + Math.abs(Math.cos(player.velocityBob)) * 0.02 - recoilKick * 0.05;
    const baseZ = 0.85 - recoilKick * 0.16;
    const aimX = hasOptic ? 0 : 0.08;
    const aimY = hasOptic ? -0.18 : -0.22;
    const aimZ = hasOptic ? 0.52 : 0.62;
    const stanceX = -0.03 * proneBlend;
    const stanceY = -0.28 * proneBlend;
    const stanceZ = -0.2 * proneBlend;

    viewModel.root.position.x = lerp(baseX + stanceX, aimX + stanceX * 0.3, aimBlend) + rollWave * 0.04 + dodgeWave * 0.03 * (action?.dirX ?? 0);
    viewModel.root.position.y = lerp(baseY + stanceY, aimY + stanceY * 0.4, aimBlend) - slideBlend * 0.14 + jumpLift - dropBlend * 0.18;
    viewModel.root.position.z = lerp(baseZ + stanceZ, aimZ + stanceZ * 0.28, aimBlend) - slideBlend * 0.18;
    viewModel.root.rotation.x = lerp(recoilKick * 0.08, recoilKick * 0.02, aimBlend) + 0.16 * proneBlend + slideBlend * 0.14 + dropBlend * 0.05;
    viewModel.root.rotation.y = lerp(-recoilKick * 0.06, recoilKick * 0.01, aimBlend);
    viewModel.root.rotation.z = lerp(-player.damageFlash * 0.08 + recoilKick * 0.03, -player.damageFlash * 0.04, aimBlend) + playerPose.cameraRoll * 0.82;

    const effectColor = operator.id === 'assault' && player.abilityActiveTimer > 0
      ? '#ff9a62'
      : operator.id === 'recon' && player.operatorEffectTimer > 0
        ? '#72d9ff'
        : operator.id === 'medic' && player.operatorEffectTimer > 0
          ? '#74e0a0'
          : '#303a40';
    viewModel.receiver.material.emissiveColor = BABYLON.Color3.FromHexString(effectColor).scale(player.operatorEffectTimer > 0 ? 0.28 : 0.08);
    viewModel.opticTube.material.emissiveColor = BABYLON.Color3.FromHexString(effectColor).scale(player.operatorEffectTimer > 0 ? 0.12 : 0.03);
    viewModel.opticTube.material.alpha = hasOptic ? lerp(0.18, 0.1, aimBlend) : 0;
    viewModel.opticRoot.setEnabled(hasOptic);
    viewModel.rearLens.material.alpha = hasOptic ? 0.03 + aimBlend * 0.05 : 0;
    viewModel.frontLens.material.alpha = hasOptic ? 0.02 + aimBlend * 0.04 : 0;
    const reticleAlpha = hasOptic ? clamp((aimBlend - 0.18) * 1.3, 0, 0.92) : 0;
    const reticleDotAlpha = hasOptic ? clamp((aimBlend - 0.08) * 1.45, 0, 1) : 0;
    viewModel.reticleH.material.alpha = reticleAlpha;
    viewModel.reticleV.material.alpha = reticleAlpha;
    viewModel.reticleDot.material.alpha = reticleDotAlpha;
  }

  if (refs.crosshair) {
    refs.crosshair.style.opacity = String(
      hasOptic
        ? clamp(1 - aimBlend * 1.5, 0, 1)
        : clamp(1 - aimBlend * 0.56, 0.08, 1),
    );
    refs.crosshair.style.transform = `scale(${(1 - aimBlend * 0.18).toFixed(3)})`;
  }
}

function bindEvents() {
  ensureExtendedRefs();
  refs.canvas.setAttribute('tabindex', '0');
  window.addEventListener('pointerdown', unlockAudioContext, { passive: true });
  window.addEventListener('keydown', unlockAudioContext);
  refs.deployButton.addEventListener('click', startRaid);
  refs.saveResetButton.addEventListener('click', resetSave);
  refs.sellAllButton.addEventListener('click', sellAllStash);
  refs.returnBaseButton.addEventListener('click', returnToBase);
  refs.closeLootButton.addEventListener('click', closeLootPanel);
  refs.takeAllButton.addEventListener('click', takeAllCurrentContainer);
  refs.closeMapButton.addEventListener('click', closeMapOverlay);
  refs.languageSwitch?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-language-option]');
    if (button) {
      setLanguage(button.dataset.languageOption);
    }
  });

  refs.operatorPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-operator-id]');
    if (button) {
      setSelectedOperator(button.dataset.operatorId);
    }
  });

  refs.shopList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-id]');
    if (button) {
      buyShopEntry(button.dataset.shopId);
    }
  });

  refs.armoryPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-armory-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.armoryAction;
    const weaponId = button.dataset.weaponId;
    const ammoId = button.dataset.ammoId;
    const partId = button.dataset.partId;
    const slot = button.dataset.partSlot;
    if (action === 'select-weapon' && weaponId) {
      setSelectedWeapon(weaponId);
    } else if (action === 'select-ammo' && weaponId && ammoId) {
      setSelectedAmmoForWeapon(weaponId, ammoId);
    } else if (action === 'equip-part' && weaponId && partId) {
      setEquippedPartForWeapon(weaponId, partId);
    } else if (action === 'unequip-part' && weaponId && slot) {
      clearEquippedPartForWeapon(weaponId, slot);
    }
  });

  refs.raidSidePanel?.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-collapse-target]');
    if (toggle) {
      toggleRaidPanel(toggle.dataset.collapseTarget);
    }
  });

  refs.stashList.addEventListener('click', (event) => {
    const stashButton = event.target.closest('[data-stash-action]');
    if (stashButton) {
      const action = stashButton.dataset.stashAction;
      const uid = stashButton.dataset.stashId;
      if (action === 'sell') {
        sellItem(uid);
      } else if (action === 'discard') {
        discardStashItem(uid);
      } else if (action === 'stock-ammo') {
        stockAmmoFromStash(uid);
      } else if (action === 'learn-part') {
        learnPartFromStash(uid);
      }
      return;
    }
    const sellButton = event.target.closest('[data-sell-id]');
    if (sellButton) {
      sellItem(sellButton.dataset.sellId);
    }
  });

  refs.lootItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-loot-action]');
    if (!button) {
      const takeButton = event.target.closest('[data-take-id]');
      if (takeButton) {
        takeLoot(state.ui.currentContainerId, takeButton.dataset.takeId);
      }
      return;
    }
    const itemId = button.dataset.lootId;
    const action = button.dataset.lootAction;
    if (action === 'take') {
      takeLoot(state.ui.currentContainerId, itemId);
    } else if (action === 'use') {
      useLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'equip') {
      equipLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'load') {
      loadLootAmmo(state.ui.currentContainerId, itemId);
    }
  });

  const handleBagClick = (event) => {
    const button = event.target.closest('[data-bag-action]');
    if (!button) {
      return;
    }
    const uid = button.dataset.itemId;
    const action = button.dataset.bagAction;
    if (action === 'use' || action === 'load-ammo') {
      useBagItem(uid);
    } else if (action === 'equip') {
      equipBagItem(uid);
    } else if (action === 'unequip') {
      const item = state.raid?.bag.find((entry) => entry.uid === uid);
      if (item) {
        unequipPartItemFromRaid(item);
        syncHud();
      }
    } else if (action === 'drop') {
      dropBagItem(uid);
    }
  };
  refs.bagList?.addEventListener('click', handleBagClick);
  refs.raidBagList?.addEventListener('click', handleBagClick);

  const handleAmmoRailClick = (event) => {
    const button = event.target.closest('[data-raid-ammo]');
    if (button) {
      selectRaidAmmo(button.dataset.raidAmmo);
    }
  };
  refs.mapAmmoList?.addEventListener('click', handleAmmoRailClick);
  refs.raidAmmoRail?.addEventListener('click', handleAmmoRailClick);

  refs.canvas.addEventListener('click', () => {
    if (state.mode === 'raid' && !state.overlay) {
      refs.canvas.focus?.({ preventScroll: true });
      requestPointerLock();
    }
  });

  refs.canvas.addEventListener('contextmenu', (event) => {
    if (state.mode === 'raid') {
      event.preventDefault();
    }
  });

  refs.canvas.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'raid' || state.overlay) {
      return;
    }
    refs.canvas.focus?.({ preventScroll: true });
    requestPointerLock();
    if (event.button === 0) {
      if (!state.input.fireHeld) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    } else if (event.button === 2) {
      state.input.aimHeld = true;
      event.preventDefault();
    }
    state.input.lookDragging = true;
    state.input.lookPointerId = event.pointerId;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    refs.canvas.setPointerCapture?.(event.pointerId);
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (
      state.mode !== 'raid' ||
      !state.raid ||
      state.overlay ||
      state.pointerLocked ||
      !state.input.lookDragging ||
      state.input.lookPointerId !== event.pointerId
    ) {
      return;
    }
    const deltaX = event.clientX - state.input.lastPointerX;
    const deltaY = event.clientY - state.input.lastPointerY;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    applyLookDelta(deltaX, deltaY);
  });

  const stopLookDrag = (event) => {
    if (event.pointerId !== undefined && state.input.lookPointerId !== null && event.pointerId !== state.input.lookPointerId) {
      return;
    }
    if (event.button === 0) {
      state.input.fireHeld = false;
    } else if (event.button === 2) {
      state.input.aimHeld = false;
    }
    state.input.lookDragging = false;
    state.input.lookPointerId = null;
  };
  refs.canvas.addEventListener('pointerup', stopLookDrag);
  refs.canvas.addEventListener('pointercancel', stopLookDrag);
  refs.canvas.addEventListener('lostpointercapture', stopLookDrag);

  const activeControlPointers = new Map();
  refs.touchControls?.addEventListener('pointerdown', (event) => {
    const keyButton = event.target.closest('[data-control-key]');
    const actionButton = event.target.closest('[data-control-action]');
    if (!keyButton && !actionButton) {
      return;
    }
    event.preventDefault();
    refs.canvas.focus?.({ preventScroll: true });

    if (keyButton) {
      const key = keyButton.dataset.controlKey;
      state.input.keys.add(key);
      stepTouchMove(key);
      const intervalId = window.setInterval(() => stepTouchMove(key), 50);
      keyButton.setPointerCapture?.(event.pointerId);
      activeControlPointers.set(event.pointerId, { type: 'key', value: key, intervalId });
      return;
    }

    const action = actionButton.dataset.controlAction;
    actionButton.setPointerCapture?.(event.pointerId);
    if (action === 'interact') {
      triggerRaidInteract();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'fire') {
      state.input.fireHeld = true;
      attemptShoot();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'aim') {
      state.input.aimHeld = true;
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'reload') {
      reloadWeapon();
    } else if (action === 'heal') {
      useMedkit();
    } else if (action === 'skill') {
      useOperatorAbility();
    } else if (action === 'map') {
      toggleRaidMap();
    }
  });

  const releaseControlPointer = (event) => {
    const active = activeControlPointers.get(event.pointerId);
    if (!active) {
      return;
    }
    if (active.type === 'key') {
      state.input.keys.delete(active.value);
      window.clearInterval(active.intervalId);
    } else if (active.type === 'action') {
      if (active.value === 'interact') {
        state.input.interactHeld = false;
      }
      if (active.value === 'fire') {
        state.input.fireHeld = false;
      }
      if (active.value === 'aim') {
        state.input.aimHeld = false;
      }
    }
    activeControlPointers.delete(event.pointerId);
  };

  refs.touchControls?.addEventListener('pointerup', releaseControlPointer);
  refs.touchControls?.addEventListener('pointercancel', releaseControlPointer);
  refs.touchControls?.addEventListener('lostpointercapture', releaseControlPointer);

  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('mousemove', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay || !state.pointerLocked) {
      return;
    }
    applyLookDelta(event.movementX, event.movementY);
  });

  window.addEventListener('mousedown', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay) {
      return;
    }
    const onCanvas = event.target === refs.canvas;
    if (!state.pointerLocked && !onCanvas) {
      return;
    }
    if (event.button === 2) {
      refs.canvas.focus?.({ preventScroll: true });
      requestPointerLock();
      state.input.aimHeld = true;
      event.preventDefault();
    }
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      state.input.aimHeld = false;
    }
  });

  window.addEventListener('blur', () => {
    state.input.fireHeld = false;
    state.input.aimHeld = false;
    state.input.interactHeld = false;
  });

  window.addEventListener('keydown', (event) => {
    state.input.keys.add(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    const isFireKey = event.code === 'KeyF' || lowerKey === 'f';
    const isReloadKey = event.code === 'KeyR' || lowerKey === 'r';
    const isHealKey = event.code === 'KeyQ' || lowerKey === 'q';
    const isMapKey = event.code === 'KeyM' || lowerKey === 'm';
    const isInteractKey = event.code === 'KeyE' || lowerKey === 'e';
    const isSkillKey = event.code === 'KeyC' || lowerKey === 'c';
    const isProneKey = event.code === 'KeyZ' || lowerKey === 'z';
    const isRollKey = event.code === 'KeyV' || lowerKey === 'v';
    const isDodgeKey = event.code === 'KeyX' || lowerKey === 'x';
    const isJumpKey = event.code === 'Space';
    const isSlideKey = event.code === 'ControlLeft' || event.code === 'ControlRight';

    if (isFireKey) {
      if (!state.input.fireHeld && state.mode === 'raid' && state.raid && !state.overlay) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    }
    if (event.repeat) {
      return;
    }
    if (state.mode === 'raid' && state.raid) {
      refs.canvas.focus?.({ preventScroll: true });
      if (isReloadKey) {
        reloadWeapon();
      }
      if (isHealKey) {
        useMedkit();
      }
      if (isMapKey) {
        toggleRaidMap();
      }
      if (isInteractKey) {
        triggerRaidInteract();
      }
      if (isSkillKey) {
        useOperatorAbility();
      }
      if (isJumpKey) {
        tryPlayerMobilityAction('jump');
        event.preventDefault();
      }
      if (isSlideKey) {
        tryPlayerMobilityAction('slide');
        event.preventDefault();
      }
      if (isRollKey) {
        tryPlayerMobilityAction('roll');
      }
      if (isProneKey) {
        tryPlayerMobilityAction('prone');
      }
      if (event.code === 'Escape') {
        if (state.overlay === 'loot') {
          closeLootPanel();
        } else if (state.overlay === 'map') {
          closeMapOverlay();
        } else {
          releasePointerLock();
        }
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    state.input.keys.delete(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    if (event.code === 'KeyE' || lowerKey === 'e') {
      state.input.interactHeld = false;
    }
    if (event.code === 'KeyF' || lowerKey === 'f') {
      state.input.fireHeld = false;
    }
  });

  syncRaidPanelCollapses();
  applyLanguage();
}

window.__sdrPatchedStartRaid = function patchedStartRaid() {
  clearRaid();
  ensureExtendedRefs();
  unlockAudioContext();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();
  state.input.aimHeld = false;

  state.save.stats.raids += 1;
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const operator = getOperatorDef(getSelectedOperatorId());
  const modeDef = getLobbyModeDef();
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus + operator.startMedkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus + operator.startArmorBonus;
  const playerSpawn = chooseRaidSpawnPoint();
  const raidEnemySpawns = chooseRaidEnemySpawns(playerSpawn);
  const raidLayout = modeDef.buildLayout(playerSpawn);
  const ammoInventory = defaultPrepAmmo();
  const objectives = modeDef.objectiveFactory().map((objective) => ({ ...objective }));
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    modeId: modeDef.id,
    bonusReward: modeDef.bonusReward ?? 0,
    timeLeft: modeDef.duration,
    statusText: L('WASD ç§»å¨ï¼é¼ æ è½¬åï¼F å¼ç«ã', 'WASD to move, mouse to look, F to fire.'),
    interactionText: modeDef.getStartInteractionText(),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: objectives.length === 0,
    extractionSequence: null,
    switchSequence: null,
    objectives,
    spawnSafeTimer: SPAWN_SAFE_DURATION,
    spawnSafeCenterX: playerSpawn.x,
    spawnSafeCenterZ: playerSpawn.z,
    spawnSafeRadius: SPAWN_SAFE_RADIUS,
    player: {
      x: playerSpawn.x,
      z: playerSpawn.z,
      yaw: playerSpawn.yaw ?? Math.PI / 2,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      operatorId: operator.id,
      abilityCharges: operator.utilityCharges,
      abilityCooldown: 0,
      abilityCooldownPending: false,
      abilityActiveTimer: 0,
      operatorEffectTimer: 0,
      damageReductionTimer: 0,
      damageReductionMult: 1,
      medicAutoUsed: false,
      medicFoamTimer: 0,
      medicFoamPulseTimer: 0,
      damageImmunityTimer: 0,
      medicSpeedBoostTimer: 0,
      medicPostShieldPending: false,
      reconZone: null,
      isAiming: false,
      aimBlend: 0,
      radius: PLAYER_RADIUS,
      health: PLAYER_BASE_HEALTH,
      maxHealth: PLAYER_BASE_HEALTH,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      useAction: null,
      useActionPulseTimer: 0,
      mobilityAction: null,
      mobilityCooldown: 0,
      proneCooldown: 0,
      proneTimer: 0,
      proneBlend: 0,
      isProne: false,
      lastDodgeSide: 1,
      dropTimer: DEPLOY_ANIMATION_DURATION,
      dropDuration: DEPLOY_ANIMATION_DURATION,
      dropStartHeight: DEPLOY_START_HEIGHT,
      dropLandingPulseDone: false,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: raidLayout.extractions.map((zone) => ({
      ...zone,
      visual: null,
    })),
    switchPoints: raidLayout.switchPoints.map((point) => ({
      ...point,
      visual: null,
    })),
    enemies: raidEnemySpawns.map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(modeDef.getStartNotice(), 'success');
};

killEnemy = function patchedKillEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.revealedTimer = 0;
  enemy.muzzleTimer = 0;
  enemy.shootCooldown = Number.POSITIVE_INFINITY;
  enemy.alertTimer = 0;
  enemy.dashTimer = 0;
  enemy.corpseTimer = ENEMY_FALL_DURATION;
  enemy.despawned = false;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  if (enemy.type === 'hunter') {
    advanceRaidObjective('hunter', 1);
  }
  const player = state.raid?.player;
  const operator = player ? getPlayerOperatorDef(player) : null;
  if (player && operator?.id === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
    const bonusSeconds = operator.killExtendSeconds ?? 1.5;
    const killHeal = operator.killHeal ?? 20;
    const previousHealth = player.health;
    player.abilityActiveTimer += bonusSeconds;
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);
    player.health = Math.min(player.maxHealth, player.health + killHeal);
    const recovered = Math.max(0, Math.round(player.health - previousHealth));
    notify(
      L(
        'è¿è½½å»¶é¿ +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? 'ï¼æ¢å¤ ' + recovered + ' çå½ã' : 'ã'),
        'Overdrive extended by +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? ` and restored ${recovered} HP.` : '.'),
      ),
      'success',
    );
  }
  const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
  enemy.dropPending = Math.random() < 0.42;
  enemy.dropItem = enemy.dropPending ? createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight)) : null;
  persistSave();
  notify(L('å·²å»å ' + getEnemyLabel(enemy) + 'ã', 'Target down: ' + getEnemyLabel(enemy) + '.'), 'success');
};

if (refs.deployButton && !refs.deployButton.dataset.boundPatchedRaid) {
  refs.deployButton.dataset.boundPatchedRaid = 'true';
  refs.deployButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.__sdrPatchedStartRaid();
  }, true);
}

function getRaidObjectiveLabel(objective) {
  if (!objective) {
    return '';
  }
  if (objective.id === 'search') {
    return L('æç´¢', 'Search');
  }
  if (objective.id === 'kill') {
    return L('æ¸æ', 'Clear');
  }
  if (objective.id === 'hunter') {
    return L('çæ', 'Hunters');
  }
  return objective.labelZh
    ? L(objective.labelZh, objective.labelEn ?? objective.labelZh)
    : objective.label ?? objective.id;
}

function getRaidObjectiveStatus(raid = state.raid) {
  const objectives = raid?.objectives ?? [];
  if (!objectives.length) {
    const switchZone = raid?.extractions?.find((zone) => zone.kind === 'switch');
    if (switchZone?.switchArmed && (switchZone.switchTimer ?? 0) > 0) {
      return L('æ®éæ¤ç¦»å·²å¼æ¾ | æé¸æ¤ç¦»å·²å¼æ¾', 'Standard exit open | Lever exit open');
    }
    return L('æ®éæ¤ç¦»å·²å¼æ¾ | æé¸æ¤ç¦»å¾å¼å¯', 'Standard exit open | Lever exit locked');
  }
  return objectives
    .map((objective) => `${getRaidObjectiveLabel(objective)} ${objective.progress}/${objective.target}`)
    .join(' | ');
}

function advanceRaidObjective(objectiveId, amount = 1) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const objective = raid.objectives?.find((entry) => entry.id === objectiveId);
  if (!objective || objective.progress >= objective.target) {
    return;
  }
  objective.progress = Math.min(objective.target, objective.progress + amount);
  if (!raid.tasksComplete && areRaidObjectivesComplete(raid)) {
    raid.tasksComplete = true;
    notify(L('ç®æ å®æï¼æ¤ç¦»ç¹å·²å¼æ¾ã', 'Objectives complete. Extraction is now open.'), 'success');
  }
}

function isExtractionCurrentlyAvailable(zone, raid = state.raid) {
  if (!raid || !zone || !zone.active) {
    return false;
  }
  if (zone.requiresObjectives && !raid.tasksComplete) {
    return false;
  }
  if (zone.kind === 'switch') {
    return Boolean(zone.switchArmed) && (zone.switchTimer ?? 0) > 0;
  }
  return true;
}

function getExtractionStatusLabel(zone, raid = state.raid) {
  if (!raid || !zone) {
    return '';
  }
  if (zone.requiresObjectives || zone.kind === 'task') {
    return raid.tasksComplete
      ? L('æ¤ç¦»å·²è§£é', 'Extraction unlocked')
      : L(`éåå®æç®æ ï¼${getRaidObjectiveStatus(raid)}`, `Finish objectives first: ${getRaidObjectiveStatus(raid)}`);
  }
  if (zone.kind === 'switch') {
    if (zone.switchArmed && (zone.switchTimer ?? 0) > 0) {
      return L(`é¸é¨å·²å¼å¯ ${Math.ceil(zone.switchTimer)}s`, `Gate open ${Math.ceil(zone.switchTimer)}s`);
    }
    if (zone.switchExpired) {
      return L('é¸é¨å·²å³é­', 'Gate expired');
    }
    const point = getSwitchPointById(raid, zone.switchPointId);
    return point
      ? L(`éååå¾ ${getSwitchPointLabel(point)} æé¸`, `Pull ${getSwitchPointLabel(point)} first`)
      : L('éåæé¸', 'Lever required');
  }
  return L('å¯æ¤ç¦»', 'Ready');
}

function renderBasePanel() {
  ensureExtendedRefs();
  refs.basePanel.classList.toggle('hidden', state.mode !== 'base');
  const survivalRate = state.save.stats.raids > 0
    ? `${Math.round((state.save.stats.survived / state.save.stats.raids) * 100)}%`
    : '--';
  const selectedWeaponId = getSelectedWeaponId();
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const selectedStats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });
  const selectedOperatorId = getSelectedOperatorId();
  const selectedMode = getLobbyModeDef();

  refs.summaryStrip.innerHTML = [
    summaryPill(L('èµé', 'Funds'), formatMoney(state.save.money)),
    summaryPill(L('ä»åº', 'Stash'), formatItemCount(state.save.stash.length)),
    summaryPill(L('æ¤ç¦»ç', 'Survival'), survivalRate),
    summaryPill(L('æé«å¸¦åº', 'Best Haul'), formatMoney(state.save.stats.bestHaul)),
  ].join('');

  if (refs.lobbyPanel) {
    refs.lobbyPanel.innerHTML = renderLobbyPanel();
  }
  if (refs.deployButton) {
    refs.deployButton.textContent = L(selectedMode.deployZh, selectedMode.deployEn);
  }

  refs.loadoutPrep.innerHTML = [
    prepRow(L('è¡å¨æ¨¡å¼', 'Mode'), L(selectedMode.nameZh, selectedMode.nameEn)),
    prepRow(L('åµç§', 'Operator'), `${getOperatorName(selectedOperatorId)} Â· ${getOperatorSkillName(selectedOperatorId)}`),
    prepRow(L('ä¸å±éå·', 'Signature Item'), getOperatorItemName(selectedOperatorId)),
    prepRow(L('åºå»æ­¦å¨', 'Raid Weapon'), `${getWeaponLabel(selectedWeaponId)} Â· ${selectedStats.caliber}`),
    prepRow(L('è¡å¨æ¶é¿', 'Operation Time'), L(`${Math.round(selectedMode.duration / 60)} åé`, `${Math.round(selectedMode.duration / 60)} min`)),
    prepRow(L('é¦éå­å¼¹', 'Preferred Ammo'), L(`${getAmmoTierLabel(selectedAmmoId)} Â· åºå­ ${state.save.prepAmmo[selectedAmmoId] ?? 0}`, `${getAmmoTierLabel(selectedAmmoId)} Â· stock ${state.save.prepAmmo[selectedAmmoId] ?? 0}`)),
    prepRow(L('åå§å»çå', 'Starting Medkits'), `${BASE_MEDKITS + state.save.prep.medkitBonus + getOperatorDef(selectedOperatorId).startMedkitBonus}`),
    prepRow(L('åå§æ¤ç²', 'Starting Armor'), `${BASE_ARMOR + state.save.prep.armorBonus + getOperatorDef(selectedOperatorId).startArmorBonus}`),
    prepRow(L('èåå®¹é', 'Bag Capacity'), `${getBagSlots()} ${L('æ ¼', 'slots')} / ${formatWeight(getBagCapacity())}`),
    prepRow(L('æ­¦å¨ä¼¤å®³', 'Weapon Damage'), `${selectedStats.damage}`),
    prepRow(L('æ¨¡å¼è¯´æ', 'Mode Brief'), L(selectedMode.summaryZh, selectedMode.summaryEn)),
  ].join('');

  if (refs.operatorPanel) {
    refs.operatorPanel.innerHTML = renderOperatorPanel();
  }

  if (refs.armoryPanel) {
    refs.armoryPanel.innerHTML = renderArmoryPanel(selectedWeaponId);
  }

  refs.shopList.innerHTML = getShopEntries()
    .map((entry) => {
      const afford = state.save.money >= entry.price && !entry.disabled;
      return `
        <article class="shop-row">
          <div>
            <div class="item-title">${entry.name}</div>
            <div class="item-meta">${entry.description}</div>
            <div class="item-meta">${entry.status}</div>
          </div>
          <div class="stack-list">
            <button class="primary-button small" type="button" data-shop-id="${entry.id}" ${afford ? '' : 'disabled'}>
              ${entry.disabled ? L('å·²æ¥æ', 'Owned') : formatMoney(entry.price)}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  refs.stashList.innerHTML = state.save.stash.length
    ? state.save.stash
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${getItemLabel(item)}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${renderBaseItemActions(item)}
            </div>
          </article>
        `)
        .join('')
    : `<div class="item-meta">${L('ä»åºéè¿æ²¡æå¸¦åºæ¥çæå©åãæ¤ç¦»æååï¼ç©èµãå­å¼¹åæªæ¢°é¶ä»¶é½ä¼åºç°å¨è¿éã', 'The stash is empty. Loot, ammo, and weapon parts show up here after a successful extraction.')}</div>`;
}

function startRaid() {
  clearRaid();
  ensureExtendedRefs();
  unlockAudioContext();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();
  state.input.aimHeld = false;

  state.save.stats.raids += 1;
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const operator = getOperatorDef(getSelectedOperatorId());
  const modeDef = getLobbyModeDef();
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus + operator.startMedkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus + operator.startArmorBonus;
  const playerSpawn = chooseRaidSpawnPoint();
  const raidEnemySpawns = chooseRaidEnemySpawns(playerSpawn);
  const raidLayout = modeDef.buildLayout(playerSpawn);
  const ammoInventory = defaultPrepAmmo();
  const objectives = modeDef.objectiveFactory().map((objective) => ({ ...objective }));
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    modeId: modeDef.id,
    bonusReward: modeDef.bonusReward ?? 0,
    timeLeft: modeDef.duration,
    statusText: L('WASD ç§»å¨ï¼é¼ æ è½¬åï¼F å¼ç«ã', 'WASD to move, mouse to look, F to fire.'),
    interactionText: modeDef.getStartInteractionText(),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: objectives.length === 0,
    extractionSequence: null,
    switchSequence: null,
    objectives,
    spawnSafeTimer: SPAWN_SAFE_DURATION,
    spawnSafeCenterX: playerSpawn.x,
    spawnSafeCenterZ: playerSpawn.z,
    spawnSafeRadius: SPAWN_SAFE_RADIUS,
    player: {
      x: playerSpawn.x,
      z: playerSpawn.z,
      yaw: playerSpawn.yaw ?? Math.PI / 2,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      operatorId: operator.id,
      abilityCharges: operator.utilityCharges,
      abilityCooldown: 0,
      abilityCooldownPending: false,
      abilityActiveTimer: 0,
      operatorEffectTimer: 0,
      damageReductionTimer: 0,
      damageReductionMult: 1,
      medicAutoUsed: false,
      medicFoamTimer: 0,
      medicFoamPulseTimer: 0,
      damageImmunityTimer: 0,
      medicSpeedBoostTimer: 0,
      medicPostShieldPending: false,
      reconZone: null,
      isAiming: false,
      aimBlend: 0,
      radius: PLAYER_RADIUS,
      health: PLAYER_BASE_HEALTH,
      maxHealth: PLAYER_BASE_HEALTH,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      useAction: null,
      useActionPulseTimer: 0,
      mobilityAction: null,
      mobilityCooldown: 0,
      proneCooldown: 0,
      proneTimer: 0,
      proneBlend: 0,
      isProne: false,
      lastDodgeSide: 1,
      dropTimer: DEPLOY_ANIMATION_DURATION,
      dropDuration: DEPLOY_ANIMATION_DURATION,
      dropStartHeight: DEPLOY_START_HEIGHT,
      dropLandingPulseDone: false,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: raidLayout.extractions.map((zone) => ({
      ...zone,
      visual: null,
    })),
    switchPoints: raidLayout.switchPoints.map((point) => ({
      ...point,
      visual: null,
    })),
    enemies: raidEnemySpawns.map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(modeDef.getStartNotice(), 'success');
}

function killEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.revealedTimer = 0;
  enemy.muzzleTimer = 0;
  enemy.shootCooldown = Number.POSITIVE_INFINITY;
  enemy.alertTimer = 0;
  enemy.dashTimer = 0;
  enemy.corpseTimer = ENEMY_FALL_DURATION;
  enemy.despawned = false;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  if (enemy.type === 'hunter') {
    advanceRaidObjective('hunter', 1);
  }
  const player = state.raid?.player;
  const operator = player ? getPlayerOperatorDef(player) : null;
  if (player && operator?.id === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
    const bonusSeconds = operator.killExtendSeconds ?? 1.5;
    const killHeal = operator.killHeal ?? 20;
    const previousHealth = player.health;
    player.abilityActiveTimer += bonusSeconds;
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);
    player.health = Math.min(player.maxHealth, player.health + killHeal);
    const recovered = Math.max(0, Math.round(player.health - previousHealth));
    notify(
      L(
        'è¿è½½å»¶é¿ +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? 'ï¼æ¢å¤ ' + recovered + ' çå½ã' : 'ã'),
        'Overdrive extended by +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? ` and restored ${recovered} HP.` : '.'),
      ),
      'success',
    );
  }
  const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
  enemy.dropPending = Math.random() < 0.42;
  enemy.dropItem = enemy.dropPending ? createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight)) : null;
  persistSave();
  notify(L('å·²å»å ' + getEnemyLabel(enemy) + 'ã', 'Target down: ' + getEnemyLabel(enemy) + '.'), 'success');
}

function renderRaidResultOverlay(result) {
  const raid = state.raid;
  if (!raid || !result) {
    return;
  }
  const modeDef = getLobbyModeDef(raid.modeId);
  refs.resultTitle.textContent = result.survived ? L('æ¤ç¦»æå', 'Extraction Success') : L('è¡å¨å¤±è´¥', 'Killed in Raid');
  const rows = [
    resultItem(L('æ¨¡å¼', 'Mode'), L(modeDef.nameZh, modeDef.nameEn)),
    resultItem(L('ç»æ', 'Result'), localizeRaidReason(result.reason)),
    resultItem(L('å¸¦åºç©èµ', 'Loot Extracted'), result.survived ? formatItemCount(result.bagCount) : formatItemCount(0)),
    resultItem(L('æå©åä»·å¼', 'Haul Value'), result.survived ? formatMoney(result.haul) : formatMoney(0)),
    resultItem(L('å»åæäºº', 'Enemies Down'), `${raid.killCount}`),
    resultItem(L('å©ä½æ¶é´', 'Time Left'), formatTime(raid.timeLeft)),
  ];
  if ((result.bonusReward ?? 0) > 0) {
    rows.push(resultItem(L('åçº¦å¥é', 'Contract Bonus'), formatMoney(result.bonusReward)));
  }
  rows.push(resultItem(L('ä»åºæ»æ°', 'Stash Total'), formatItemCount(state.save.stash.length)));
  refs.resultSummary.innerHTML = rows.join('');
}

function finishRaid(success, reason, extracted) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  releasePointerLock();
  closeLootPanel();
  closeMapOverlay();

  const survived = success && extracted;
  const haul = survived ? raid.bagValue : 0;
  const bagCount = survived ? raid.bag.length : 0;
  let bonusReward = 0;
  if (survived) {
    state.save.stash.push(...raid.bag);
    state.save.stats.survived += 1;
    state.save.stats.bestHaul = Math.max(state.save.stats.bestHaul, haul);
    bonusReward = Math.max(0, Number(raid.bonusReward ?? 0));
    if (bonusReward > 0) {
      state.save.money += bonusReward;
    }
  } else {
    raid.bag = [];
    raid.bagValue = 0;
    raid.bagWeight = 0;
    resetRaidLoadout(raid.player);
    state.save.prep.medkitBonus = 0;
    state.save.prep.ammoBonus = 0;
    state.save.prep.armorBonus = 0;
  }
  persistSave();

  raid.result = {
    survived,
    reason,
    haul,
    bagCount,
    bonusReward,
  };

  state.mode = 'result';
  refs.hud.classList.add('hidden');
  renderRaidResultOverlay(raid.result);
  refs.resultOverlay.classList.remove('hidden');
  notify(
    survived
      ? bonusReward > 0
        ? L('æ¤ç¦»å®æï¼æå©åååçº¦å¥éå·²å¸¦åå¤§åã', 'Extraction complete. Loot and contract bonus returned to base.')
        : L('æ¤ç¦»å®æï¼æå©åå·²å¸¦ååºå°ã', 'Extraction complete. Loot returned to base.')
      : L('è¡å¨å¤±è´¥ï¼å½åæå©ååä¸´æ¶è£å¤å·²éç½®ã', 'Raid failed. Current loot and temporary gear were reset.'),
    survived ? 'success' : 'danger',
  );
}

function renderMapExtractionList() {
  const raid = state.raid;
  const zones = raid?.extractions ?? [];
  const markup = zones
    .map((zone) => {
      const distance = raid ? distance2D(zone.x, zone.z, raid.player.x, raid.player.z) : 0;
      const available = isExtractionCurrentlyAvailable(zone, raid);
      const status = zone.active ? getExtractionStatusLabel(zone, raid) : L('ä¸å¯ç¨', 'Unavailable');
      let titleClass = '';
      if (available) {
        titleClass = zone.kind === 'switch'
          ? 'rarity-rare'
          : (zone.kind === 'task' || zone.requiresObjectives)
            ? 'rarity-legendary'
            : 'rarity-uncommon';
      } else if (zone.kind === 'task' || zone.requiresObjectives) {
        titleClass = 'rarity-legendary';
      } else if (zone.kind === 'switch') {
        titleClass = 'rarity-rare';
      }
      return '' +
        '<article class="extract-row">' +
          '<div>' +
            '<div class="item-title ' + titleClass + '">' + getZoneLabel(zone) + '</div>' +
            '<div class="item-meta">' + status + ' Â· ' + distance.toFixed(0) + 'm</div>' +
          '</div>' +
        '</article>';
    })
    .join('');
  setMarkupIfChanged(refs.mapExtractList, markup);
}

if (refs.lobbyPanel && !refs.lobbyPanel.dataset.boundModeSwitch) {
  refs.lobbyPanel.dataset.boundModeSwitch = 'true';
  refs.lobbyPanel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode-id]');
    if (button) {
      setSelectedLobbyMode(button.dataset.modeId);
    }
  });
}

function getRaidObjectiveLabel(objective) {
  if (!objective) {
    return '';
  }
  if (objective.id === 'search') {
    return L('æç´¢', 'Search');
  }
  if (objective.id === 'kill') {
    return L('æ¸æ', 'Clear');
  }
  if (objective.id === 'hunter') {
    return L('çæ', 'Hunters');
  }
  return objective.labelZh
    ? L(objective.labelZh, objective.labelEn ?? objective.labelZh)
    : objective.label ?? objective.id;
}

function getRaidObjectiveStatus(raid = state.raid) {
  const objectives = raid?.objectives ?? [];
  if (!objectives.length) {
    const switchZone = raid?.extractions?.find((zone) => zone.kind === 'switch');
    if (switchZone?.switchArmed && (switchZone.switchTimer ?? 0) > 0) {
      return L('æ®éæ¤ç¦»å·²å¼æ¾ | æé¸æ¤ç¦»å·²å¼æ¾', 'Standard exit open | Lever exit open');
    }
    return L('æ®éæ¤ç¦»å·²å¼æ¾ | æé¸æ¤ç¦»å¾å¼å¯', 'Standard exit open | Lever exit locked');
  }
  return objectives
    .map((objective) => `${getRaidObjectiveLabel(objective)} ${objective.progress}/${objective.target}`)
    .join(' | ');
}

function advanceRaidObjective(objectiveId, amount = 1) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const objective = raid.objectives?.find((entry) => entry.id === objectiveId);
  if (!objective || objective.progress >= objective.target) {
    return;
  }
  objective.progress = Math.min(objective.target, objective.progress + amount);
  if (!raid.tasksComplete && areRaidObjectivesComplete(raid)) {
    raid.tasksComplete = true;
    notify(L('ç®æ å®æï¼æ¤ç¦»ç¹å·²å¼æ¾ã', 'Objectives complete. Extraction is now open.'), 'success');
  }
}

function isExtractionCurrentlyAvailable(zone, raid = state.raid) {
  if (!raid || !zone || !zone.active) {
    return false;
  }
  if (zone.requiresObjectives && !raid.tasksComplete) {
    return false;
  }
  if (zone.kind === 'switch') {
    return Boolean(zone.switchArmed) && (zone.switchTimer ?? 0) > 0;
  }
  return true;
}

function getExtractionStatusLabel(zone, raid = state.raid) {
  if (!raid || !zone) {
    return '';
  }
  if (zone.requiresObjectives || zone.kind === 'task') {
    return raid.tasksComplete
      ? L('æ¤ç¦»å·²è§£é', 'Extraction unlocked')
      : L(`éåå®æç®æ ï¼${getRaidObjectiveStatus(raid)}`, `Finish objectives first: ${getRaidObjectiveStatus(raid)}`);
  }
  if (zone.kind === 'switch') {
    if (zone.switchArmed && (zone.switchTimer ?? 0) > 0) {
      return L(`é¸é¨å·²å¼å¯ ${Math.ceil(zone.switchTimer)}s`, `Gate open ${Math.ceil(zone.switchTimer)}s`);
    }
    if (zone.switchExpired) {
      return L('é¸é¨å·²å³é­', 'Gate expired');
    }
    const point = getSwitchPointById(raid, zone.switchPointId);
    return point
      ? L(`éååå¾ ${getSwitchPointLabel(point)} æé¸`, `Pull ${getSwitchPointLabel(point)} first`)
      : L('éåæé¸', 'Lever required');
  }
  return L('å¯æ¤ç¦»', 'Ready');
}

function renderBasePanel() {
  ensureExtendedRefs();
  refs.basePanel.classList.toggle('hidden', state.mode !== 'base');
  const survivalRate = state.save.stats.raids > 0
    ? `${Math.round((state.save.stats.survived / state.save.stats.raids) * 100)}%`
    : '--';
  const selectedWeaponId = getSelectedWeaponId();
  const selectedAmmoId = getSelectedAmmoIdForWeapon(selectedWeaponId);
  const selectedStats = getWeaponStats(selectedWeaponId, { ammoId: selectedAmmoId });
  const selectedOperatorId = getSelectedOperatorId();
  const selectedMode = getLobbyModeDef();

  refs.summaryStrip.innerHTML = [
    summaryPill(L('èµé', 'Funds'), formatMoney(state.save.money)),
    summaryPill(L('ä»åº', 'Stash'), formatItemCount(state.save.stash.length)),
    summaryPill(L('æ¤ç¦»ç', 'Survival'), survivalRate),
    summaryPill(L('æé«å¸¦åº', 'Best Haul'), formatMoney(state.save.stats.bestHaul)),
  ].join('');

  if (refs.lobbyPanel) {
    refs.lobbyPanel.innerHTML = renderLobbyPanel();
  }
  if (refs.deployButton) {
    refs.deployButton.textContent = L(selectedMode.deployZh, selectedMode.deployEn);
  }

  refs.loadoutPrep.innerHTML = [
    prepRow(L('è¡å¨æ¨¡å¼', 'Mode'), L(selectedMode.nameZh, selectedMode.nameEn)),
    prepRow(L('åµç§', 'Operator'), `${getOperatorName(selectedOperatorId)} Â· ${getOperatorSkillName(selectedOperatorId)}`),
    prepRow(L('ä¸å±éå·', 'Signature Item'), getOperatorItemName(selectedOperatorId)),
    prepRow(L('åºå»æ­¦å¨', 'Raid Weapon'), `${getWeaponLabel(selectedWeaponId)} Â· ${selectedStats.caliber}`),
    prepRow(L('è¡å¨æ¶é¿', 'Operation Time'), L(`${Math.round(selectedMode.duration / 60)} åé`, `${Math.round(selectedMode.duration / 60)} min`)),
    prepRow(L('é¦éå­å¼¹', 'Preferred Ammo'), L(`${getAmmoTierLabel(selectedAmmoId)} Â· åºå­ ${state.save.prepAmmo[selectedAmmoId] ?? 0}`, `${getAmmoTierLabel(selectedAmmoId)} Â· stock ${state.save.prepAmmo[selectedAmmoId] ?? 0}`)),
    prepRow(L('åå§å»çå', 'Starting Medkits'), `${BASE_MEDKITS + state.save.prep.medkitBonus + getOperatorDef(selectedOperatorId).startMedkitBonus}`),
    prepRow(L('åå§æ¤ç²', 'Starting Armor'), `${BASE_ARMOR + state.save.prep.armorBonus + getOperatorDef(selectedOperatorId).startArmorBonus}`),
    prepRow(L('èåå®¹é', 'Bag Capacity'), `${getBagSlots()} ${L('æ ¼', 'slots')} / ${formatWeight(getBagCapacity())}`),
    prepRow(L('æ­¦å¨ä¼¤å®³', 'Weapon Damage'), `${selectedStats.damage}`),
    prepRow(L('æ¨¡å¼è¯´æ', 'Mode Brief'), L(selectedMode.summaryZh, selectedMode.summaryEn)),
  ].join('');

  if (refs.operatorPanel) {
    refs.operatorPanel.innerHTML = renderOperatorPanel();
  }

  if (refs.armoryPanel) {
    refs.armoryPanel.innerHTML = renderArmoryPanel(selectedWeaponId);
  }

  refs.shopList.innerHTML = getShopEntries()
    .map((entry) => {
      const afford = state.save.money >= entry.price && !entry.disabled;
      return `
        <article class="shop-row">
          <div>
            <div class="item-title">${entry.name}</div>
            <div class="item-meta">${entry.description}</div>
            <div class="item-meta">${entry.status}</div>
          </div>
          <div class="stack-list">
            <button class="primary-button small" type="button" data-shop-id="${entry.id}" ${afford ? '' : 'disabled'}>
              ${entry.disabled ? L('å·²æ¥æ', 'Owned') : formatMoney(entry.price)}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  refs.stashList.innerHTML = state.save.stash.length
    ? state.save.stash
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((item) => `
          <article class="stash-row">
            <div>
              <div class="item-title rarity-${item.rarity}">${getItemLabel(item)}</div>
              <div class="item-meta">${itemMetaLine(item)}</div>
            </div>
            <div class="inline-actions">
              ${renderBaseItemActions(item)}
            </div>
          </article>
        `)
        .join('')
    : `<div class="item-meta">${L('ä»åºéè¿æ²¡æå¸¦åºæ¥çæå©åãæ¤ç¦»æååï¼ç©èµãå­å¼¹åæªæ¢°é¶ä»¶é½ä¼åºç°å¨è¿éã', 'The stash is empty. Loot, ammo, and weapon parts show up here after a successful extraction.')}</div>`;
}

function startRaid() {
  clearRaid();
  ensureExtendedRefs();
  unlockAudioContext();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();
  state.input.aimHeld = false;

  state.save.stats.raids += 1;
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const operator = getOperatorDef(getSelectedOperatorId());
  const modeDef = getLobbyModeDef();
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus + operator.startMedkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus + operator.startArmorBonus;
  const playerSpawn = chooseRaidSpawnPoint();
  const raidEnemySpawns = chooseRaidEnemySpawns(playerSpawn);
  const raidLayout = modeDef.buildLayout(playerSpawn);
  const ammoInventory = defaultPrepAmmo();
  const objectives = modeDef.objectiveFactory().map((objective) => ({ ...objective }));
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    modeId: modeDef.id,
    bonusReward: modeDef.bonusReward ?? 0,
    timeLeft: modeDef.duration,
    statusText: L('WASD ç§»å¨ï¼é¼ æ è½¬åï¼F å¼ç«ã', 'WASD to move, mouse to look, F to fire.'),
    interactionText: modeDef.getStartInteractionText(),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: objectives.length === 0,
    extractionSequence: null,
    switchSequence: null,
    objectives,
    spawnSafeTimer: SPAWN_SAFE_DURATION,
    spawnSafeCenterX: playerSpawn.x,
    spawnSafeCenterZ: playerSpawn.z,
    spawnSafeRadius: SPAWN_SAFE_RADIUS,
    player: {
      x: playerSpawn.x,
      z: playerSpawn.z,
      yaw: playerSpawn.yaw ?? Math.PI / 2,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      operatorId: operator.id,
      abilityCharges: operator.utilityCharges,
      abilityCooldown: 0,
      abilityCooldownPending: false,
      abilityActiveTimer: 0,
      operatorEffectTimer: 0,
      damageReductionTimer: 0,
      damageReductionMult: 1,
      medicAutoUsed: false,
      medicFoamTimer: 0,
      medicFoamPulseTimer: 0,
      damageImmunityTimer: 0,
      medicSpeedBoostTimer: 0,
      medicPostShieldPending: false,
      reconZone: null,
      isAiming: false,
      aimBlend: 0,
      radius: PLAYER_RADIUS,
      health: PLAYER_BASE_HEALTH,
      maxHealth: PLAYER_BASE_HEALTH,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      useAction: null,
      useActionPulseTimer: 0,
      mobilityAction: null,
      mobilityCooldown: 0,
      proneCooldown: 0,
      proneTimer: 0,
      proneBlend: 0,
      isProne: false,
      lastDodgeSide: 1,
      dropTimer: DEPLOY_ANIMATION_DURATION,
      dropDuration: DEPLOY_ANIMATION_DURATION,
      dropStartHeight: DEPLOY_START_HEIGHT,
      dropLandingPulseDone: false,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: raidLayout.extractions.map((zone) => ({
      ...zone,
      visual: null,
    })),
    switchPoints: raidLayout.switchPoints.map((point) => ({
      ...point,
      visual: null,
    })),
    enemies: raidEnemySpawns.map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(modeDef.getStartNotice(), 'success');
}

function killEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.revealedTimer = 0;
  enemy.muzzleTimer = 0;
  enemy.shootCooldown = Number.POSITIVE_INFINITY;
  enemy.alertTimer = 0;
  enemy.dashTimer = 0;
  enemy.corpseTimer = ENEMY_FALL_DURATION;
  enemy.despawned = false;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  if (enemy.type === 'hunter') {
    advanceRaidObjective('hunter', 1);
  }
  const player = state.raid?.player;
  const operator = player ? getPlayerOperatorDef(player) : null;
  if (player && operator?.id === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
    const bonusSeconds = operator.killExtendSeconds ?? 1.5;
    const killHeal = operator.killHeal ?? 20;
    const previousHealth = player.health;
    player.abilityActiveTimer += bonusSeconds;
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);
    player.health = Math.min(player.maxHealth, player.health + killHeal);
    const recovered = Math.max(0, Math.round(player.health - previousHealth));
    notify(
      L(
        'è¿è½½å»¶é¿ +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? 'ï¼æ¢å¤ ' + recovered + ' çå½ã' : 'ã'),
        'Overdrive extended by +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? ` and restored ${recovered} HP.` : '.'),
      ),
      'success',
    );
  }
  const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
  enemy.dropPending = Math.random() < 0.42;
  enemy.dropItem = enemy.dropPending ? createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight)) : null;
  persistSave();
  notify(L('å·²å»å ' + getEnemyLabel(enemy) + 'ã', 'Target down: ' + getEnemyLabel(enemy) + '.'), 'success');
}

function renderRaidResultOverlay(result) {
  const raid = state.raid;
  if (!raid || !result) {
    return;
  }
  const modeDef = getLobbyModeDef(raid.modeId);
  refs.resultTitle.textContent = result.survived ? L('æ¤ç¦»æå', 'Extraction Success') : L('è¡å¨å¤±è´¥', 'Killed in Raid');
  const rows = [
    resultItem(L('æ¨¡å¼', 'Mode'), L(modeDef.nameZh, modeDef.nameEn)),
    resultItem(L('ç»æ', 'Result'), localizeRaidReason(result.reason)),
    resultItem(L('å¸¦åºç©èµ', 'Loot Extracted'), result.survived ? formatItemCount(result.bagCount) : formatItemCount(0)),
    resultItem(L('æå©åä»·å¼', 'Haul Value'), result.survived ? formatMoney(result.haul) : formatMoney(0)),
    resultItem(L('å»åæäºº', 'Enemies Down'), `${raid.killCount}`),
    resultItem(L('å©ä½æ¶é´', 'Time Left'), formatTime(raid.timeLeft)),
  ];
  if ((result.bonusReward ?? 0) > 0) {
    rows.push(resultItem(L('åçº¦å¥é', 'Contract Bonus'), formatMoney(result.bonusReward)));
  }
  rows.push(resultItem(L('ä»åºæ»æ°', 'Stash Total'), formatItemCount(state.save.stash.length)));
  refs.resultSummary.innerHTML = rows.join('');
}

function finishRaid(success, reason, extracted) {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  releasePointerLock();
  closeLootPanel();
  closeMapOverlay();

  const survived = success && extracted;
  const haul = survived ? raid.bagValue : 0;
  const bagCount = survived ? raid.bag.length : 0;
  let bonusReward = 0;
  if (survived) {
    state.save.stash.push(...raid.bag);
    state.save.stats.survived += 1;
    state.save.stats.bestHaul = Math.max(state.save.stats.bestHaul, haul);
    bonusReward = Math.max(0, Number(raid.bonusReward ?? 0));
    if (bonusReward > 0) {
      state.save.money += bonusReward;
    }
  } else {
    raid.bag = [];
    raid.bagValue = 0;
    raid.bagWeight = 0;
    resetRaidLoadout(raid.player);
    state.save.prep.medkitBonus = 0;
    state.save.prep.ammoBonus = 0;
    state.save.prep.armorBonus = 0;
  }
  persistSave();

  raid.result = {
    survived,
    reason,
    haul,
    bagCount,
    bonusReward,
  };

  state.mode = 'result';
  refs.hud.classList.add('hidden');
  renderRaidResultOverlay(raid.result);
  refs.resultOverlay.classList.remove('hidden');
  notify(
    survived
      ? bonusReward > 0
        ? L('æ¤ç¦»å®æï¼æå©åååçº¦å¥éå·²å¸¦åå¤§åã', 'Extraction complete. Loot and contract bonus returned to base.')
        : L('æ¤ç¦»å®æï¼æå©åå·²å¸¦ååºå°ã', 'Extraction complete. Loot returned to base.')
      : L('è¡å¨å¤±è´¥ï¼å½åæå©ååä¸´æ¶è£å¤å·²éç½®ã', 'Raid failed. Current loot and temporary gear were reset.'),
    survived ? 'success' : 'danger',
  );
}

function renderMapExtractionList() {
  const raid = state.raid;
  const zones = raid?.extractions ?? [];
  const markup = zones
    .map((zone) => {
      const distance = raid ? distance2D(zone.x, zone.z, raid.player.x, raid.player.z) : 0;
      const available = isExtractionCurrentlyAvailable(zone, raid);
      const status = zone.active ? getExtractionStatusLabel(zone, raid) : L('ä¸å¯ç¨', 'Unavailable');
      let titleClass = '';
      if (available) {
        titleClass = zone.kind === 'switch'
          ? 'rarity-rare'
          : (zone.kind === 'task' || zone.requiresObjectives)
            ? 'rarity-legendary'
            : 'rarity-uncommon';
      } else if (zone.kind === 'task' || zone.requiresObjectives) {
        titleClass = 'rarity-legendary';
      } else if (zone.kind === 'switch') {
        titleClass = 'rarity-rare';
      }
      return '' +
        '<article class="extract-row">' +
          '<div>' +
            '<div class="item-title ' + titleClass + '">' + getZoneLabel(zone) + '</div>' +
            '<div class="item-meta">' + status + ' Â· ' + distance.toFixed(0) + 'm</div>' +
          '</div>' +
        '</article>';
    })
    .join('');
  setMarkupIfChanged(refs.mapExtractList, markup);
}

if (refs.lobbyPanel && !refs.lobbyPanel.dataset.boundModeSwitch) {
  refs.lobbyPanel.dataset.boundModeSwitch = 'true';
  refs.lobbyPanel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode-id]');
    if (button) {
      setSelectedLobbyMode(button.dataset.modeId);
    }
  });
}

function getFacingVectors(yaw) {
  return {
    forward: { x: Math.sin(yaw), z: Math.cos(yaw) },
    right: { x: Math.cos(yaw), z: -Math.sin(yaw) },
  };
}

function getMovementVectorFromKeysForYaw(yaw) {
  const { forward, right } = getFacingVectors(yaw);
  let moveX = 0;
  let moveZ = 0;
  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
    moveX -= right.x;
    moveZ -= right.z;
  }
  if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
    moveX += right.x;
    moveZ += right.z;
  }
  return {
    forward,
    right,
    movement: normalize2D(moveX, moveZ),
  };
}

function getActionDirection(dirX, dirZ, fallbackX, fallbackZ) {
  const direction = normalize2D(dirX, dirZ);
  if (direction.x || direction.z) {
    return direction;
  }
  return normalize2D(fallbackX, fallbackZ);
}

function beginMobilityAction(actor, type, dirX, dirZ, config = {}) {
  if (!actor) {
    return false;
  }
  const yaw = actor.yaw ?? actor.heading ?? 0;
  const fallback = getFacingVectors(yaw).forward;
  const direction = getActionDirection(dirX, dirZ, fallback.x, fallback.z);
  if (!direction.x && !direction.z) {
    return false;
  }
  const duration = config.duration ?? 0.5;
  actor.mobilityAction = {
    type,
    timer: duration,
    duration,
    dirX: direction.x,
    dirZ: direction.z,
    speed: config.speed ?? 8,
    height: config.height ?? 0,
    spinDir: config.spinDir ?? (direction.x >= 0 ? 1 : -1),
  };
  actor.mobilityCooldown = Math.max(actor.mobilityCooldown ?? 0, config.cooldown ?? duration * 1.1);
  actor.isProne = false;
  actor.proneTimer = 0;
  return true;
}

function beginEnemyProne(enemy, duration = 1.8) {
  if (!enemy) {
    return false;
  }
  enemy.mobilityAction = null;
  enemy.isProne = true;
  enemy.proneTimer = Math.max(enemy.proneTimer ?? 0, duration);
  enemy.mobilityCooldown = Math.max(enemy.mobilityCooldown ?? 0, duration * 0.7);
  return true;
}

function isRollMobilityAction(action) {
  return action?.type === 'roll';
}

function canShootDuringMobilityAction(action) {
  return !action || action.type !== 'roll';
}

function advanceProneBlend(actor, dt) {
  if (!actor) {
    return 0;
  }
  const target = actor.isProne ? 1 : 0;
  const current = clamp(actor.proneBlend ?? target, 0, 1);
  const step = dt / Math.max(PRONE_TRANSITION_DURATION, 0.001);
  const next = current < target
    ? Math.min(target, current + step)
    : Math.max(target, current - step);
  actor.proneBlend = next;
  return next;
}

function getActorMobilityPose(actor, isEnemy = false) {
  const action = actor?.mobilityAction;
  const progress = action ? clamp(1 - action.timer / Math.max(action.duration, 0.001), 0, 1) : 0;
  const proneBlend = clamp(actor?.proneBlend ?? (actor?.isProne ? 1 : 0), 0, 1);
  let visualYOffset = 0;
  let eyeYOffset = 0;
  let aimYOffset = 0;
  let hitboxYOffset = 0;
  let hitboxScaleY = 1;
  let hitboxScaleXZ = 1;
  let rootPitch = 0;
  let rootRoll = 0;
  let cameraRoll = 0;

  if (proneBlend > 0) {
    visualYOffset -= (isEnemy ? 0.22 : 0.26) * proneBlend;
    eyeYOffset -= 0.9 * proneBlend;
    aimYOffset -= (isEnemy ? 1.02 : 0.96) * proneBlend;
    hitboxYOffset -= 0.38 * proneBlend;
    hitboxScaleY *= lerp(1, 0.42, proneBlend);
    hitboxScaleXZ *= lerp(1, 1.18, proneBlend);
    rootPitch = 1.28 * proneBlend;
  }

  if (action?.type === 'slide') {
    visualYOffset -= isEnemy ? 0.12 : 0.16;
    eyeYOffset -= 0.46;
    aimYOffset -= isEnemy ? 0.54 : 0.48;
    hitboxYOffset -= 0.16;
    hitboxScaleY *= 0.62;
    hitboxScaleXZ *= 1.08;
    rootPitch = Math.max(rootPitch, 0.26);
  } else if (action?.type === 'dodge') {
    const dodgeWave = Math.sin(progress * Math.PI);
    visualYOffset -= (isEnemy ? 0.02 : 0.04) * dodgeWave;
    eyeYOffset -= 0.04 * dodgeWave;
    aimYOffset -= 0.03 * dodgeWave;
    rootRoll = (action.dirX >= 0 ? -1 : 1) * dodgeWave * 0.18;
    cameraRoll += rootRoll * 0.55;
  } else if (action?.type === 'roll') {
    const wave = Math.sin(progress * Math.PI * 2);
    visualYOffset -= isEnemy ? 0.08 : 0.1;
    eyeYOffset -= 0.28;
    aimYOffset -= isEnemy ? 0.3 : 0.26;
    hitboxYOffset -= 0.1;
    hitboxScaleY *= 0.76;
    hitboxScaleXZ *= 1.12;
    rootRoll = wave * (action.spinDir ?? 1) * 1.04;
    cameraRoll += wave * (action.spinDir ?? 1) * 0.12;
  }

  if (action?.type === 'jump') {
    const arc = Math.sin(progress * Math.PI) * (action.height ?? (isEnemy ? 0.92 : 1.04));
    visualYOffset += arc;
    eyeYOffset += arc;
    aimYOffset += arc;
    hitboxYOffset += arc * 0.42;
    cameraRoll += (action.dirX ?? 0) * 0.04 * Math.sin(progress * Math.PI);
  }

  return {
    progress,
    visualYOffset,
    eyeYOffset,
    aimYOffset,
    hitboxYOffset,
    hitboxScaleY,
    hitboxScaleXZ,
    rootPitch,
    rootRoll,
    cameraRoll,
  };
}

function getPlayerViewHeight(player = state.raid?.player) {
  if (!player) {
    return PLAYER_HEIGHT;
  }
  const pose = getActorMobilityPose(player, false);
  return clamp(PLAYER_HEIGHT + pose.eyeYOffset, 0.58, PLAYER_HEIGHT + 1.14);
}

function getPlayerAimPoint(player = state.raid?.player) {
  if (!player) {
    return new BABYLON.Vector3(0, PLAYER_HEIGHT, 0);
  }
  return new BABYLON.Vector3(player.x, getPlayerViewHeight(player) - 0.12, player.z);
}

function getReconZoneBoundsForPoint(x, z) {
  return {
    minX: x < 0 ? -MAP_HALF : 0,
    maxX: x < 0 ? 0 : MAP_HALF,
    minZ: z < 0 ? -MAP_HALF : 0,
    maxZ: z < 0 ? 0 : MAP_HALF,
  };
}

function isPointInsideBounds(x, z, bounds) {
  if (!bounds) {
    return false;
  }
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

function refreshReconZoneReveal(raid = state.raid, player = raid?.player, operator = getPlayerOperatorDef(player)) {
  if (!raid || !player || player.operatorId !== 'recon' || (player.abilityActiveTimer ?? 0) <= 0 || !player.reconZone) {
    return 0;
  }
  let revealedCount = 0;
  const revealWindow = Math.max(0.18, Math.min(operator.abilityDuration ?? 25, player.abilityActiveTimer ?? 0));
  for (const enemy of raid.enemies) {
    if (enemy.dead || !isPointInsideBounds(enemy.x, enemy.z, player.reconZone)) {
      continue;
    }
    enemy.revealedTimer = Math.max(enemy.revealedTimer ?? 0, revealWindow);
    revealedCount += 1;
  }
  return revealedCount;
}

function getEnemyPressureCount(player = state.raid?.player, raid = state.raid) {
  if (!raid || !player) {
    return 0;
  }
  let count = 0;
  for (const enemy of raid.enemies) {
    if (enemy.dead) {
      continue;
    }
    if ((enemy.alertTimer ?? 0) <= 0 && (enemy.investigateTimer ?? 0) <= 0) {
      continue;
    }
    if (distance2D(player.x, player.z, enemy.x, enemy.z) > 24) {
      continue;
    }
    if ((enemy.combatState ?? 'patrol') === 'patrol') {
      continue;
    }
    count += 1;
  }
  return count;
}

function updateMobilityActionMotion(actor, dt, radius) {
  const action = actor?.mobilityAction;
  if (!action) {
    return false;
  }
  action.timer = Math.max(0, action.timer - dt);
  const progress = 1 - action.timer / Math.max(action.duration, 0.001);
  let actionSpeed = action.speed ?? 8;
  if (action.type === 'roll') {
    actionSpeed *= 1 - progress * 0.34;
  } else if (action.type === 'dodge') {
    actionSpeed *= 1 - progress * 0.24;
  } else if (action.type === 'slide') {
    actionSpeed *= 1 - progress * 0.42;
  } else if (action.type === 'jump') {
    actionSpeed *= 0.86 + Math.sin(progress * Math.PI) * 0.22;
  }
  moveEntityWithCollision(actor, action.dirX * actionSpeed * dt, action.dirZ * actionSpeed * dt, radius);
  if (action.timer <= 0) {
    actor.mobilityAction = null;
  }
  return true;
}

function tryEnemyMobilityAction(enemy, pursuitDirection, lateral, distanceToPlayer, hasLineOfSight, wantsReposition) {
  if (!enemy || enemy.dead || enemy.despawned || enemy.mobilityAction || (enemy.mobilityCooldown ?? 0) > 0) {
    return false;
  }
  const lateralDirX = lateral.x * (enemy.strafeDirection ?? 1);
  const lateralDirZ = lateral.z * (enemy.strafeDirection ?? 1);

  if (enemy.isProne) {
    if (!hasLineOfSight || distanceToPlayer < enemy.preferredRange * 0.78 || wantsReposition) {
      enemy.isProne = false;
      enemy.proneTimer = 0;
      enemy.proneCooldown = Math.max(enemy.proneCooldown ?? 0, 0.9);
      return false;
    }
    return false;
  }

  if (
    hasLineOfSight &&
    distanceToPlayer > enemy.preferredRange * 0.92 &&
    distanceToPlayer < (enemy.longFireRange ?? enemy.preferredRange + 10) * 0.92 &&
    (enemy.proneCooldown ?? 0) <= 0
  ) {
    const proneChance = enemy.type === 'hunter' ? 0.18 : enemy.type === 'bruiser' ? 0.12 : 0.08;
    if (Math.random() < proneChance) {
      enemy.proneCooldown = randomBetween(2.6, 4.6);
      return beginEnemyProne(enemy, randomBetween(enemy.type === 'hunter' ? 1.4 : 1.1, enemy.type === 'hunter' ? 2.3 : 1.9));
    }
  }

  if (
    distanceToPlayer < enemy.preferredRange * 0.82 &&
    Math.random() < (enemy.type === 'scout' ? 0.48 : enemy.type === 'hunter' ? 0.36 : 0.22)
  ) {
    return beginMobilityAction(
      enemy,
      'roll',
      lateralDirX - pursuitDirection.x * 0.34,
      lateralDirZ - pursuitDirection.z * 0.34,
      {
        duration: 0.42,
        speed: enemy.type === 'scout' ? 11.8 : enemy.type === 'hunter' ? 10.2 : 8.8,
        cooldown: 0.94,
        spinDir: enemy.strafeDirection ?? 1,
      },
    );
  }

  if (wantsReposition && Math.random() < (enemy.type === 'scout' ? 0.54 : enemy.type === 'hunter' ? 0.42 : 0.28)) {
    const actionType = enemy.type === 'hunter'
      ? (Math.random() < 0.52 ? 'jump' : 'slide')
      : enemy.type === 'bruiser'
        ? (Math.random() < 0.68 ? 'slide' : 'jump')
        : (Math.random() < 0.58 ? 'jump' : 'slide');
    return beginMobilityAction(
      enemy,
      actionType,
      lateralDirX + pursuitDirection.x * (actionType === 'slide' ? 0.6 : 0.22),
      lateralDirZ + pursuitDirection.z * (actionType === 'slide' ? 0.6 : 0.22),
      {
        duration: actionType === 'jump' ? 0.58 : 0.5,
        speed: actionType === 'jump'
          ? (enemy.type === 'scout' ? 8.8 : enemy.type === 'hunter' ? 7.8 : 6.8)
          : (enemy.type === 'scout' ? 10.4 : enemy.type === 'hunter' ? 9.2 : 8.2),
        height: actionType === 'jump' ? (enemy.type === 'bruiser' ? 0.72 : 0.98) : 0,
        cooldown: 1.06,
        spinDir: enemy.strafeDirection ?? 1,
      },
    );
  }

  if (distanceToPlayer > enemy.preferredRange * 1.16 && hasLineOfSight && Math.random() < (enemy.type === 'scout' ? 0.28 : 0.18)) {
    return beginMobilityAction(
      enemy,
      'jump',
      pursuitDirection.x + lateralDirX * 0.28,
      pursuitDirection.z + lateralDirZ * 0.28,
      {
        duration: 0.56,
        speed: enemy.type === 'scout' ? 8.4 : 7.4,
        height: enemy.type === 'bruiser' ? 0.7 : 1.02,
        cooldown: 1.14,
      },
    );
  }

  return false;
}

function tryPlayerMobilityAction(type) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player || state.overlay || raid.switchSequence || player.useAction || player.reloadTimer > 0 || player.healTimer > 0) {
    return false;
  }

  if (type === 'prone') {
    if ((player.proneCooldown ?? 0) > 0 || player.mobilityAction) {
      return false;
    }
    player.isProne = !player.isProne;
    player.proneCooldown = 0.28;
    if (!player.isProne) {
      player.velocityBob = 0;
    }
    spawnPulse(new BABYLON.Vector3(player.x, 0.56, player.z), player.isProne ? '#8fd8ff' : '#dff6ff', 0.05, 0.06);
    raid.statusText = L(player.isProne ? '\u5df2\u5367\u5012\u3002' : '\u5df2\u8d77\u8eab\u3002', player.isProne ? 'Prone.' : 'Standing.');
    syncHud();
    return true;
  }

  if (player.mobilityAction || (player.mobilityCooldown ?? 0) > 0) {
    return false;
  }

  const { movement, right } = getMovementVectorFromKeysForYaw(player.yaw);
  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const leftHeld = isKeyDown('KeyA') || isKeyDown('ArrowLeft');
  const rightHeld = isKeyDown('KeyD') || isKeyDown('ArrowRight');
  if (player.isProne && type === 'roll') {
    return false;
  }
  if (player.isProne) {
    player.isProne = false;
    player.proneCooldown = Math.max(player.proneCooldown ?? 0, 0.22);
  }

  if (type === 'slide') {
    if (!movement.x && !movement.z) {
      return false;
    }
    return beginMobilityAction(player, 'slide', movement.x, movement.z, {
      duration: 0.52,
      speed: sprinting ? 14.2 : 10.6,
      cooldown: 0.78,
    });
  }
  if (type === 'roll') {
    return beginMobilityAction(player, 'roll', movement.x, movement.z, {
      duration: 0.44,
      speed: 11.4,
      cooldown: 0.62,
      spinDir: movement.x !== 0 ? (movement.x > 0 ? 1 : -1) : (Math.random() < 0.5 ? -1 : 1),
    });
  }
  if (type === 'dodge') {
    const sideSign = leftHeld ? -1 : rightHeld ? 1 : (player.lastDodgeSide ?? 1) * -1;
    player.lastDodgeSide = sideSign;
    const started = beginMobilityAction(player, 'dodge', right.x * sideSign, right.z * sideSign, {
      duration: PLAYER_DODGE_DURATION,
      speed: PLAYER_DODGE_SPEED,
      cooldown: PLAYER_DODGE_COOLDOWN,
    });
    if (started) {
      spawnPulse(new BABYLON.Vector3(player.x, 0.76, player.z), '#9cdcff', 0.05, 0.05);
      raid.statusText = L(sideSign < 0 ? '\u5de6\u8e32\u95ea\u907f\u3002' : '\u53f3\u8e32\u95ea\u907f\u3002', sideSign < 0 ? 'Dodged left.' : 'Dodged right.');
      syncHud();
    }
    return started;
  }
  if (type === 'jump') {
    if (!movement.x && !movement.z) {
      return false;
    }
    return beginMobilityAction(player, 'jump', movement.x, movement.z, {
      duration: 0.56,
      speed: 7.6,
      height: 1.08,
      cooldown: 0.66,
    });
  }
  return false;
}

function getPlayerMoveSpeed(player, sprinting = false) {
  const operator = getPlayerOperatorDef(player);
  let speed = (sprinting ? 9.2 : 5.8) * (operator.moveMult ?? 1);
  if (player.isAiming) {
    speed *= 0.62;
  }
  if (operator.id === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
    speed *= operator.speedBoostMult ?? 2;
  }
  if (player.healTimer > 0) {
    speed *= 0.58;
  }
  if (player.isProne) {
    speed *= 0.34;
  }
  if (operator.id === 'recon' && (player.abilityActiveTimer ?? 0) > 0) {
    speed *= operator.abilityMoveMult ?? 1.25;
    if (getEnemyPressureCount(player) >= 3) {
      speed *= (operator.pressureMoveMult ?? 1.5) / (operator.abilityMoveMult ?? 1.25);
    }
  }
  if ((player.medicSpeedBoostTimer ?? 0) > 0) {
    speed *= operator.id === 'medic' ? (operator.speedBoostMult ?? 1.35) : 1.35;
  }
  return speed;
}

function getAngleDeltaAbs(from, to) {
  let delta = to - from;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return Math.abs(delta);
}

function getEnemyAimPoint(enemy) {
  const height = enemy.type === 'bruiser' ? 1.96 : 1.78;
  const pose = getActorMobilityPose(enemy, true);
  return new BABYLON.Vector3(enemy.x, Math.max(0.52, height + pose.aimYOffset), enemy.z);
}

function getAssaultAutoAimTarget(player) {
  const raid = state.raid;
  if (!raid) {
    return null;
  }

  let bestEnemy = null;
  let bestScore = Infinity;
  for (const enemy of raid.enemies) {
    if (enemy.dead) {
      continue;
    }
    const distance = distance2D(player.x, player.z, enemy.x, enemy.z);
    if (distance > 42) {
      continue;
    }
    if (lineOfSightBlocked(player.x, player.z, enemy.x, enemy.z)) {
      continue;
    }
    const targetYaw = Math.atan2(enemy.x - player.x, enemy.z - player.z);
    const yawDelta = getAngleDeltaAbs(player.yaw, targetYaw);
    if (yawDelta > 1.1) {
      continue;
    }
    const score = distance + yawDelta * 10;
    if (score < bestScore) {
      bestScore = score;
      bestEnemy = enemy;
    }
  }

  return bestEnemy;
}

function spawnMedicFoamBurst(player, pulseScale = 0.22) {
  if (!state.raid) {
    return;
  }

  const center = new BABYLON.Vector3(player.x, 0.78, player.z);
  spawnPulse(center, '#74e0a0', pulseScale, 0.8);

  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10 + randomBetween(-0.18, 0.18);
    const radius = randomBetween(0.28, 1.1);
    const puffPosition = new BABYLON.Vector3(
      player.x + Math.cos(angle) * radius,
      randomBetween(0.35, 1.15),
      player.z + Math.sin(angle) * radius,
    );
    const velocity = new BABYLON.Vector3(
      Math.cos(angle) * randomBetween(0.12, 0.36),
      randomBetween(0.12, 0.28),
      Math.sin(angle) * randomBetween(0.12, 0.36),
    );
    spawnSmokePuff(puffPosition, '#74e0a0', randomBetween(0.18, 0.3), randomBetween(0.8, 1.3), velocity);
  }
}

function triggerMedicLastStand(player, operator = getPlayerOperatorDef(player)) {
  if (!player || operator.id !== 'medic') {
    return false;
  }
  if ((player.medicAutoUsed ?? false) || (player.abilityCharges ?? 0) <= 0) {
    return false;
  }
  if (player.health > (operator.lastStandThreshold ?? 15)) {
    return false;
  }

  const immunityDuration = operator.immunityDuration ?? 5;
  const reductionDuration = operator.postReductionDuration ?? 15;
  const speedDuration = operator.speedBoostDuration ?? 10;
  const duration = operator.foamDuration ?? (immunityDuration + reductionDuration);
  player.medicAutoUsed = true;
  player.abilityCharges = Math.max(0, (player.abilityCharges ?? 0) - 1);
  player.abilityCooldown = 0;
  player.abilityCooldownPending = duration > 0;
  player.abilityActiveTimer = Math.max(player.abilityActiveTimer ?? 0, duration);
  player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, duration);
  player.damageImmunityTimer = Math.max(player.damageImmunityTimer ?? 0, immunityDuration);
  player.medicSpeedBoostTimer = Math.max(player.medicSpeedBoostTimer ?? 0, speedDuration);
  player.medicPostShieldPending = true;
  player.damageReductionTimer = 0;
  player.damageReductionMult = 1;
  player.medicFoamTimer = Math.max(player.medicFoamTimer ?? 0, duration);
  player.medicFoamPulseTimer = 0;
  player.health = player.maxHealth;
  player.healTimer = 0;
  player.damageFlash = 0;
  player.damageJolt = 0;
  player.nearHitPulse = 0;
  spawnMedicFoamBurst(player, 0.32);
  notify(
    L(
      '\u533b\u7597\u6ce1\u6cab\u81ea\u52a8\u89e6\u53d1\uff1a\u7acb\u523b\u6ee1\u8840\uff0c5 \u79d2\u514d\u4f24\uff0c10 \u79d2\u52a0\u901f\uff0c\u968f\u540e 15 \u79d2\u4f24\u5bb3\u51cf\u534a\u3002',
      'Trauma Foam auto-triggered: full heal, 5s immunity, 10s speed boost, then 15s half damage.',
    ),
    'success',
  );
  return true;
}

function syncEnemyRevealOverlays() {
  const raid = state.raid;
  if (!raid) {
    return;
  }
  const allowReconReveal = raid.player?.operatorId === 'recon' && (raid.player?.abilityActiveTimer ?? 0) > 0;

  for (const enemy of raid.enemies) {
    if (!enemy.visual) {
      continue;
    }
    const revealStrength = allowReconReveal && !enemy.dead
      ? clamp((enemy.revealedTimer ?? 0) / 0.5, 0, 1)
      : 0;
    for (const mesh of enemy.visual.overlayMeshes ?? [enemy.visual.body, enemy.visual.head, enemy.visual.gun]) {
      if (!mesh) {
        continue;
      }
      mesh.renderOverlay = revealStrength > 0.01;
      mesh.overlayColor = BABYLON.Color3.FromHexString('#79f5ff');
      mesh.overlayAlpha = 0.18 + revealStrength * 0.28;
    }
    const revealMaterial = enemy.visual.revealMaterial;
    if (revealMaterial) {
      const pulse = 0.82 + Math.sin(performance.now() * 0.012 + enemy.id.length) * 0.08;
      const revealColor = BABYLON.Color3.FromHexString('#79f5ff').scale(0.88 + revealStrength * 0.44);
      revealMaterial.alpha = revealStrength > 0.01 ? 0.16 + revealStrength * 0.24 : 0;
      revealMaterial.emissiveColor = revealColor.scale(pulse);
      revealMaterial.diffuseColor = revealColor.scale(0.18);
      if (enemy.visual.classLabelMaterial) {
        enemy.visual.classLabelMaterial.alpha = revealStrength > 0.01 ? 0.82 + revealStrength * 0.18 : 0;
        enemy.visual.classLabelMaterial.emissiveColor = revealColor.scale(1.08 + revealStrength * 0.12);
      }
    }
    const nextClassLabelText = getEnemyTypeLabel(enemy.type);
    if (enemy.visual.classLabelTexture && enemy.visual.classLabelText !== nextClassLabelText) {
      drawEnemyClassLabel(enemy.visual.classLabelTexture, nextClassLabelText);
      enemy.visual.classLabelText = nextClassLabelText;
    }
    for (const mesh of enemy.visual.revealMeshes ?? []) {
      mesh.setEnabled(revealStrength > 0.01);
    }
  }
}

function getOperatorDefs() {
  return {
    assault: {
      id: 'assault',
      nameZh: '\u7a81\u51fb\u5175',
      nameEn: 'Assault',
      passiveZh: '\u88ab\u52a8\uff1a\u66f4\u539a\u7684\u88c5\u7532\uff0c\u540e\u5750\u4e0e\u6362\u5f39\u66f4\u7a33\u3002',
      passiveEn: 'Passive: extra armor with steadier recoil and reloads.',
      skillNameZh: '\u8fc7\u8f7d\u7a81\u8fdb',
      skillNameEn: 'Overdrive',
      skillTextZh: '20 \u79d2\u5185\u79fb\u901f x2 \u4e14\u4f24\u5bb3\u7ffb\u500d\uff0c\u51fb\u8d25\u654c\u4eba\u989d\u5916\u5ef6\u957f 1.5 \u79d2\u5e76\u56de\u590d 20 \u751f\u547d\u3002',
      skillTextEn: 'For 20s, movement speed doubles and damage is doubled. Each kill adds 1.5s and restores 20 HP.',
      itemNameZh: '\u8fc7\u8f7d\u6ce8\u5c04\u5668',
      itemNameEn: 'Overdrive Injector',
      moveMult: 1,
      spreadMult: 0.92,
      reloadMult: 0.92,
      detectMult: 1,
      healBonus: 0,
      healCooldownMult: 1,
      startArmorBonus: 12,
      startMedkitBonus: 0,
      utilityCharges: 1,
      abilityDuration: 20,
      abilityCooldown: 10,
      speedBoostMult: 2,
      damageBoostMult: 2,
      killExtendSeconds: 1.5,
      killHeal: 20,
      abilityColor: '#ff9a62',
    },
    recon: {
      id: 'recon',
      nameZh: '\u4fa6\u5bdf\u5175',
      nameEn: 'Recon',
      passiveZh: '\u88ab\u52a8\uff1a\u79fb\u52a8\u66f4\u5feb\uff0c\u66f4\u96be\u88ab\u654c\u4eba\u63d0\u524d\u53d1\u73b0\u3002',
      passiveEn: 'Passive: faster movement and lower enemy detection.',
      skillNameZh: '\u900f\u89c6\u626b\u63cf',
      skillNameEn: 'Ghost Scan',
      skillTextZh: '\u9501\u5b9a\u5f53\u524d\u56db\u5206\u4e4b\u4e00\u5730\u56fe\u533a\u57df\uff0c20 \u79d2\u5185\u900f\u89c6\u5176\u4e2d\u654c\u4eba\u5e76\u5728\u5730\u56fe\u4e0a\u663e\u793a\u5175\u79cd\uff1b\u671f\u95f4\u5f00\u706b\u4e0d\u4f1a\u56e0\u67aa\u58f0\u5438\u5f15\u654c\u4eba\uff0c\u79fb\u901f\u63d0\u5347\u81f3 1.25 \u500d\uff0c\u88ab 3 \u4eba\u4ee5\u4e0a\u56f4\u653b\u65f6\u63d0\u5347\u5230 1.5 \u500d\u3002',
      skillTextEn: 'Locks a quarter-map sector for 20s, revealing enemies and their class on the map. Gunshots no longer attract enemies by sound, speed rises to 1.25x, and reaches 1.5x when pressured by 3+ enemies.',
      itemNameZh: '\u900f\u89c6\u626b\u63cf\u5668',
      itemNameEn: 'Ghost Scanner',
      moveMult: 1.06,
      spreadMult: 0.96,
      reloadMult: 1,
      detectMult: 0.78,
      healBonus: 0,
      healCooldownMult: 1,
      startArmorBonus: 0,
      startMedkitBonus: 0,
      utilityCharges: 1,
      abilityDuration: 20,
      abilityCooldown: 10,
      abilityMoveMult: 1.25,
      pressureMoveMult: 1.5,
      abilityColor: '#72d9ff',
    },
    medic: {
      id: 'medic',
      nameZh: '\u533b\u7597\u5175',
      nameEn: 'Medic',
      passiveZh: '\u88ab\u52a8\uff1a\u989d\u5916\u643a\u5e26\u533b\u7597\u5305\uff0c\u4f7f\u7528\u901f\u5ea6\u66f4\u5feb\u3002',
      passiveEn: 'Passive: extra medkits with faster use speed.',
      skillNameZh: '\u521b\u4f24\u6ce1\u6cab',
      skillNameEn: 'Trauma Foam',
      skillTextZh: '\u751f\u547d\u503c\u5c0f\u4e8e\u7b49\u4e8e 15 \u65f6\u81ea\u52a8\u89e6\u53d1\uff1a\u6ee1\u8840\uff0c5 \u79d2\u514d\u4f24\uff0c10 \u79d2\u79fb\u901f\u63d0\u5347 0.35 \u500d\uff0c\u514d\u4f24\u7ed3\u675f\u540e 15 \u79d2\u4f24\u5bb3\u51cf\u534a\u3002',
      skillTextEn: 'Auto-triggers at 15 HP or lower: full heal, 5s immunity, 10s +35% movement speed, then 15s half damage.',
      itemNameZh: '\u521b\u4f24\u6ce1\u6cab\u5242',
      itemNameEn: 'Trauma Foam',
      moveMult: 0.98,
      spreadMult: 1,
      reloadMult: 0.96,
      detectMult: 1,
      healBonus: 0,
      healCooldownMult: 0.72,
      startArmorBonus: 6,
      startMedkitBonus: 1,
      utilityCharges: 1,
      abilityDuration: 20,
      abilityCooldown: 10,
      lastStandThreshold: 15,
      immunityDuration: 5,
      damageReductionMult: 0.5,
      postReductionDuration: 15,
      speedBoostDuration: 10,
      speedBoostMult: 1.35,
      foamDuration: 20,
      abilityColor: '#74e0a0',
    },
  };
}

function useOperatorAbility() {
  const raid = state.raid;
  const player = raid?.player;
  if (!player) {
    return;
  }
  unlockAudioContext();

  const operator = getPlayerOperatorDef(player);
  if ((player.abilityActiveTimer ?? 0) > 0) {
    notify(L('\u6280\u80fd\u5df2\u5728\u751f\u6548\u4e2d\u3002', 'The ability is already active.'), 'warning');
    return;
  }
  if ((player.abilityCooldown ?? 0) > 0) {
    notify(L(`\u6280\u80fd\u51b7\u5374\u4e2d ${player.abilityCooldown.toFixed(1)}s\u3002`, `Ability is cooling down for ${player.abilityCooldown.toFixed(1)}s.`), 'warning');
    return;
  }
  if ((player.abilityCharges ?? 0) <= 0) {
    notify(L(`\u6ca1\u6709\u53ef\u7528\u7684 ${getOperatorItemName(player.operatorId)}\u3002`, `No ${getOperatorItemName(player.operatorId)} charges left.`), 'warning');
    return;
  }

  if (operator.id === 'medic') {
    notify(
      L('\u533b\u7597\u5175\u9053\u5177\u4f1a\u5728\u8840\u91cf\u5c0f\u4e8e\u7b49\u4e8e 15 \u65f6\u81ea\u52a8\u89e6\u53d1\u3002', 'Medic item auto-triggers when health drops to 15 or lower.'),
      'warning',
    );
    return;
  }

  player.abilityCharges -= 1;
  player.abilityCooldown = 0;
  player.abilityCooldownPending = (operator.abilityDuration ?? 0) > 0;
  player.abilityActiveTimer = operator.abilityDuration;
  player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, operator.abilityDuration);

  if (operator.id === 'assault') {
    spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor, 0.1, 0.12);
    notify(L(`\u5df2\u6fc0\u6d3b ${getOperatorSkillName(player.operatorId)}\u3002`, `Activated ${getOperatorSkillName(player.operatorId)}.`), 'success');
  } else if (operator.id === 'recon') {
    player.reconZone = getReconZoneBoundsForPoint(player.x, player.z);
    const revealedCount = refreshReconZoneReveal(raid, player, operator);
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, operator.abilityDuration);
    spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), operator.abilityColor, 0.14, 0.18);
    notify(
      L(`\u900f\u89c6\u626b\u63cf\u5df2\u542f\u52a8\uff0c20 \u79d2\u5185\u5df2\u63ed\u793a\u672c\u533a\u57df ${revealedCount} \u540d\u654c\u4eba\u4e0e\u5175\u79cd\u3002`, `Ghost Scan activated. ${revealedCount} enemies and classes are revealed in this sector for 20s.`),
      'success',
    );
  }

  syncHud();
}

function startRaid() {
  clearRaid();
  ensureExtendedRefs();
  unlockAudioContext();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();
  state.input.aimHeld = false;

  state.save.stats.raids += 1;
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const operator = getOperatorDef(getSelectedOperatorId());
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus + operator.startMedkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus + operator.startArmorBonus;
  const playerSpawn = chooseRaidSpawnPoint();
  const raidEnemySpawns = chooseRaidEnemySpawns(playerSpawn);
  const raidLayout = chooseRaidExtractions(playerSpawn);
  const ammoInventory = defaultPrepAmmo();
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    timeLeft: RAID_DURATION,
    statusText: L('WASD \u79fb\u52a8\uff0c\u9f20\u6807\u8f6c\u5411\uff0cF \u5f00\u706b\u3002', 'WASD to move, mouse to look, F to fire.'),
    interactionText: L('\u666e\u901a\u64a4\u79bb\u70b9\u5df2\u5f00\u653e\uff0c\u62c9\u95f8\u64a4\u79bb\u9700\u5148\u62c9\u95f8\u3002', 'Standard extraction is open. Pull the lever to use the gated exit.'),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: true,
    extractionSequence: null,
    switchSequence: null,
    objectives: [],
    spawnSafeTimer: SPAWN_SAFE_DURATION,
    spawnSafeCenterX: playerSpawn.x,
    spawnSafeCenterZ: playerSpawn.z,
    spawnSafeRadius: SPAWN_SAFE_RADIUS,
    player: {
      x: playerSpawn.x,
      z: playerSpawn.z,
      yaw: playerSpawn.yaw ?? Math.PI / 2,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      operatorId: operator.id,
      abilityCharges: operator.utilityCharges,
      abilityCooldown: 0,
      abilityActiveTimer: 0,
      operatorEffectTimer: 0,
      damageReductionTimer: 0,
      damageReductionMult: 1,
      medicAutoUsed: false,
      medicFoamTimer: 0,
      medicFoamPulseTimer: 0,
      damageImmunityTimer: 0,
      medicSpeedBoostTimer: 0,
      medicPostShieldPending: false,
      reconZone: null,
      isAiming: false,
      aimBlend: 0,
      radius: PLAYER_RADIUS,
      health: PLAYER_BASE_HEALTH,
      maxHealth: PLAYER_BASE_HEALTH,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      useAction: null,
      useActionPulseTimer: 0,
      mobilityAction: null,
      mobilityCooldown: 0,
      proneCooldown: 0,
      proneTimer: 0,
      proneBlend: 0,
      isProne: false,
      lastDodgeSide: 1,
      dropTimer: DEPLOY_ANIMATION_DURATION,
      dropDuration: DEPLOY_ANIMATION_DURATION,
      dropStartHeight: DEPLOY_START_HEIGHT,
      dropLandingPulseDone: false,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: raidLayout.extractions.map((zone) => ({
      ...zone,
      visual: null,
    })),
    switchPoints: raidLayout.switchPoints.map((point) => ({
      ...point,
      visual: null,
    })),
    enemies: raidEnemySpawns.map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(L('\u5df2\u8fdb\u5165\u5c01\u9501\u533a\u3002\u666e\u901a\u64a4\u79bb\u70b9\u5df2\u5f00\u653e\uff0c\u62c9\u95f8\u64a4\u79bb\u9700\u5148\u524d\u5f80\u62c9\u95f8\u70b9\u3002', 'Raid started. The standard exit is open, and the gated exit needs its lever first.'), 'success');
}

function updateRaid(dt) {
  const raid = state.raid;
  const player = raid.player;
  const operator = getPlayerOperatorDef(player);

  if (viewModel) {
    viewModel.root.setEnabled(true);
  }

  player.abilityCooldown = Math.max(0, (player.abilityCooldown ?? 0) - dt);
  player.abilityActiveTimer = Math.max(0, (player.abilityActiveTimer ?? 0) - dt);
  player.operatorEffectTimer = Math.max(0, (player.operatorEffectTimer ?? 0) - dt);
  player.damageReductionTimer = Math.max(0, (player.damageReductionTimer ?? 0) - dt);
  player.damageImmunityTimer = Math.max(0, (player.damageImmunityTimer ?? 0) - dt);
  player.medicSpeedBoostTimer = Math.max(0, (player.medicSpeedBoostTimer ?? 0) - dt);
  player.medicFoamTimer = Math.max(0, (player.medicFoamTimer ?? 0) - dt);
  player.medicFoamPulseTimer = Math.max(0, (player.medicFoamPulseTimer ?? 0) - dt);
  player.useActionPulseTimer = Math.max(0, (player.useActionPulseTimer ?? 0) - dt);
  player.mobilityCooldown = Math.max(0, (player.mobilityCooldown ?? 0) - dt);
  player.proneCooldown = Math.max(0, (player.proneCooldown ?? 0) - dt);
  player.proneTimer = Math.max(0, (player.proneTimer ?? 0) - dt);
    player.dropTimer = Math.max(0, (player.dropTimer ?? 0) - dt);
  raid.spawnSafeTimer = Math.max(0, (raid.spawnSafeTimer ?? 0) - dt);
  advanceProneBlend(player, dt);
  if ((player.dropTimer ?? 0) <= 0 && !player.dropLandingPulseDone) {
    player.dropLandingPulseDone = true;
    spawnPulse(new BABYLON.Vector3(player.x, 0.7, player.z), '#8ad8ff', 0.12, 0.18);
    spawnImpactBurst(new BABYLON.Vector3(player.x, 0.08, player.z), '#9dd0e6', 0.8, 'hard');
    playImpactAudio(new BABYLON.Vector3(player.x, 0.08, player.z), 'hard');
  }
  if ((player.abilityActiveTimer ?? 0) <= 0 && player.reconZone) {
    player.reconZone = null;
    for (const enemy of raid.enemies) {
      enemy.revealedTimer = 0;
    }
  }
  if ((player.abilityActiveTimer ?? 0) <= 0 && (player.abilityCooldownPending ?? false)) {
    player.abilityCooldownPending = false;
    player.abilityCooldown = Math.max(player.abilityCooldown ?? 0, operator.abilityCooldown ?? 10);
  }
  if (operator.id === 'recon' && (player.abilityActiveTimer ?? 0) > 0) {
    refreshReconZoneReveal(raid, player, operator);
  }
  if ((player.damageImmunityTimer ?? 0) <= 0 && player.medicPostShieldPending) {
    player.medicPostShieldPending = false;
    player.damageReductionTimer = Math.max(player.damageReductionTimer ?? 0, operator.postReductionDuration ?? 15);
    player.damageReductionMult = operator.damageReductionMult ?? 0.5;
    notify(L('\u533b\u7597\u62a4\u76fe\u7ed3\u675f\uff0c\u63a5\u4e0b\u6765 15 \u79d2\u4f24\u5bb3\u51cf\u534a\u3002', 'Medic shield ended. Damage is halved for the next 15s.'), 'warning');
  }
  if (player.damageReductionTimer <= 0) {
    player.damageReductionMult = 1;
  }
  if (
    !(player.abilityCooldownPending ?? false) &&
    (player.abilityCooldown ?? 0) <= 0 &&
    (player.abilityCharges ?? 0) <= 0 &&
    (player.abilityActiveTimer ?? 0) <= 0
  ) {
    player.abilityCharges = operator.utilityCharges ?? 1;
    if (operator.id === 'medic') {
      player.medicAutoUsed = false;
    }
  }
  if (player.medicFoamTimer > 0 && player.medicFoamPulseTimer <= 0) {
    spawnMedicFoamBurst(player, 0.18);
    player.medicFoamPulseTimer = 0.55;
  }
  if (player.useAction && player.healTimer > 0 && player.useActionPulseTimer <= 0) {
    spawnUseActionPulse(player, player.useAction);
    player.useActionPulseTimer = 0.22;
  }
  player.isAiming = Boolean(
    (state.input.aimHeld ?? false) &&
    !state.overlay &&
    !raid.switchSequence &&
    player.reloadTimer <= 0 &&
    player.healTimer <= 0 &&
    canShootDuringMobilityAction(player.mobilityAction),
  );
  player.aimBlend = lerp(player.aimBlend ?? 0, player.isAiming ? 1 : 0, 0.18);

  if (raid.extractionSequence) {
    raid.extractionSequence.timer = Math.max(0, raid.extractionSequence.timer - dt);
    updateEffects(dt);
    animateRaidEntities(dt, false);
    syncEnemyRevealOverlays();
    syncPlayerCamera();
    syncHud();
    if (raid.extractionSequence.timer <= 0) {
      const zoneId = raid.extractionSequence.zoneId;
      raid.extractionSequence = null;
      finishRaid(true, 'extract:' + zoneId, true);
    }
    return;
  }

  if (state.overlay === 'map') {
    syncEnemyRevealOverlays();
    syncPlayerCamera();
    animateRaidEntities(dt, true);
    syncHud();
    return;
  }

  raid.timeLeft = Math.max(0, raid.timeLeft - dt);
  if (raid.timeLeft <= 0) {
    finishRaid(false, 'time_expired', false);
    return;
  }

  for (const zone of raid.extractions) {
    if (zone.kind === 'switch' && zone.switchArmed) {
      zone.switchTimer = Math.max(0, (zone.switchTimer ?? 0) - dt);
      if (zone.switchTimer <= 0) {
        zone.switchArmed = false;
        zone.switchExpired = true;
        notify(L(getZoneLabel(zone) + '\u5df2\u5173\u95ed\u3002', getZoneLabel(zone) + ' has closed.'), 'warning');
      }
    }
  }

  const previousReload = player.reloadTimer;
  const previousUse = player.healTimer;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.reloadTimer = Math.max(0, player.reloadTimer - dt);
  player.healTimer = Math.max(0, player.healTimer - dt);
  player.damageFlash = Math.max(0, player.damageFlash - dt * 2.4);
  player.recoilKick = Math.max(0, (player.recoilKick ?? 0) - dt * 6.6);
  player.damageJolt = Math.max(0, (player.damageJolt ?? 0) - dt * 4.4);
  player.nearHitPulse = Math.max(0, (player.nearHitPulse ?? 0) - dt * 3.4);
  raid.hitConfirmTimer = Math.max(0, (raid.hitConfirmTimer ?? 0) - dt * 4.8);

  if (previousReload > 0 && player.reloadTimer === 0) {
    completeReload();
  }
  if (previousUse > 0 && player.healTimer === 0 && player.useAction) {
    finishPlayerUseAction(player);
  }

  if (raid.switchSequence) {
    raid.switchSequence.timer = Math.max(0, raid.switchSequence.timer - dt);
    if (raid.switchSequence.timer <= 0) {
      finishSwitchSequence();
    }
  }

  if (state.overlay !== 'loot') {
    updatePlayer(dt);
  } else {
    player.extractionProgress = 0;
    player.extractionZoneId = null;
    state.input.interactHeld = false;
    raid.interactionText = L('\u641c\u7d22\u4e2d\uff0c\u654c\u4eba\u4ecd\u4f1a\u79fb\u52a8\u5e76\u653b\u51fb\u3002', 'Searching. Enemies keep moving and firing.');
  }
  updateEnemies(dt);
  updateEffects(dt);
  animateRaidEntities(dt, false);
  syncEnemyRevealOverlays();
  syncPlayerCamera();
  syncHud();

  const hotSwitch = raid.extractions.some((zone) => zone.kind === 'switch' && zone.switchArmed && (zone.switchTimer ?? 0) < 15);
  refs.timeValue.style.color = raid.timeLeft < 45 || hotSwitch ? '#f0c57d' : '';
}

function updatePlayer(dt) {
  const raid = state.raid;
  const player = raid.player;
  const { movement } = getMovementVectorFromKeysForYaw(player.yaw);
  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const speed = getPlayerMoveSpeed(player, sprinting);
  const movementLocked = Boolean(raid.switchSequence || (player.dropTimer ?? 0) > 0);

  if (!movementLocked) {
    const actionDir = player.mobilityAction
      ? { x: player.mobilityAction.dirX, z: player.mobilityAction.dirZ }
      : null;
    const actionMoving = updateMobilityActionMotion(player, dt, player.radius);
    if (!actionMoving) {
      moveEntityWithCollision(player, movement.x * speed * dt, movement.z * speed * dt, player.radius);
      player.velocityBob += magnitude(movement.x, movement.z) * (sprinting ? 18 : 11) * dt;
    } else {
      player.velocityBob += magnitude(actionDir?.x ?? 0, actionDir?.z ?? 0) * 15 * dt;
    }
    if (state.input.fireHeld && player.healTimer <= 0 && canShootDuringMobilityAction(player.mobilityAction)) {
      attemptShoot();
    }
  }

  if (raid.switchSequence) {
    const activePoint = getSwitchPointById(raid, raid.switchSequence.pointId);
    raid.interactionText = activePoint
      ? L('\u62c9\u95f8\u4e2d ' + getSwitchPointLabel(activePoint) + ' ' + raid.switchSequence.timer.toFixed(1) + 's', 'Pulling ' + getSwitchPointLabel(activePoint) + ' ' + raid.switchSequence.timer.toFixed(1) + 's')
      : L('\u62c9\u95f8\u4e2d...', 'Pulling lever...');
    player.extractionProgress = 0;
    player.extractionZoneId = null;
    if (player.health <= 0) {
      finishRaid(false, 'player_killed', false);
    }
    return;
  }

  const interaction = getCurrentInteraction();
  if (interaction?.type === 'extract' && state.input.interactHeld) {
    if (!isExtractionCurrentlyAvailable(interaction.zone, raid)) {
      player.extractionProgress = 0;
      raid.interactionText = getExtractionStatusLabel(interaction.zone, raid);
    } else {
      player.extractionZoneId = interaction.zone.id;
      player.extractionProgress += dt;
      raid.interactionText = L(
        '\u64a4\u79bb\u4e2d ' + getZoneLabel(interaction.zone) + ' ' + Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1) + ' / ' + EXTRACTION_HOLD_TIME + 's',
        'Extracting at ' + getZoneLabel(interaction.zone) + ' ' + Math.min(player.extractionProgress, EXTRACTION_HOLD_TIME).toFixed(1) + ' / ' + EXTRACTION_HOLD_TIME + 's'
      );
      if (player.extractionProgress >= EXTRACTION_HOLD_TIME) {
        beginExtractionSequence(interaction.zone);
        return;
      }
    }
  } else {
    player.extractionProgress = Math.max(0, player.extractionProgress - dt * 2.6);
    player.extractionZoneId = null;
  }

  if (interaction?.type === 'container') {
    raid.interactionText = L('\u6309 E \u641c\u7d22 ' + getContainerLabel(interaction.container), 'Press E to search ' + getContainerLabel(interaction.container));
  } else if (interaction?.type === 'switch') {
    raid.interactionText = L('\u6309 E \u62c9\u4e0b ' + getSwitchPointLabel(interaction.point), 'Press E to pull ' + getSwitchPointLabel(interaction.point));
  } else if (interaction?.type === 'extract') {
    raid.interactionText = isExtractionCurrentlyAvailable(interaction.zone, raid)
      ? L('\u6309\u4f4f E \u4ece ' + getZoneLabel(interaction.zone) + ' \u64a4\u79bb', 'Hold E to extract from ' + getZoneLabel(interaction.zone))
      : getExtractionStatusLabel(interaction.zone, raid);
  } else if (!raid.tasksComplete) {
    raid.interactionText = L('\u5f53\u524d\u4efb\u52a1\uff1a' + getRaidObjectiveStatus(raid), 'Current tasks: ' + getRaidObjectiveStatus(raid));
  } else if ((player.dropTimer ?? 0) > 0) {
    raid.interactionText = L('\u964d\u843d\u4e2d...', 'Deploying...');
  } else {
    raid.interactionText = L('\u53ef\u4ee5\u7ee7\u7eed\u641c\u7d22\u6218\u5229\u54c1\uff0c\u6216\u8005\u524d\u5f80\u5df2\u5f00\u653e\u7684\u64a4\u79bb\u70b9\u3002', 'Keep looting or head to an open extraction.');
  }

  if (player.health <= 0) {
    finishRaid(false, 'player_killed', false);
  }
}

function attemptShoot() {
  const player = state.raid?.player;
  if (!player) {
    return;
  }
  unlockAudioContext();
  const weapon = getCurrentPlayerWeaponStats(player);
  const operator = getPlayerOperatorDef(player);
  if (
    player.fireCooldown > 0 ||
    player.reloadTimer > 0 ||
    player.healTimer > 0 ||
    !canShootDuringMobilityAction(player.mobilityAction) ||
    (player.dropTimer ?? 0) > 0
  ) {
    return;
  }
  if (player.ammoInMag <= 0) {
    if (getCurrentReserveAmmo(player) > 0) {
      reloadWeapon();
    } else {
      notify(L('\u5f53\u524d\u5b50\u5f39\u5df2\u7ecf\u6253\u7a7a\u3002', 'The current ammo is empty.'), 'danger');
    }
    return;
  }

  const aiming = Boolean(player.isAiming);
  const hasOptic = hasPlayerOptic(player);
  const recoilMultiplier = (aiming ? 0.72 : 1) * (operator.id === 'assault' ? 0.92 : 1);
  const overdriveSpreadMult = operator.id === 'assault' && player.abilityActiveTimer > 0 ? 0.72 : 1;
  let aimYaw = player.yaw;
  let aimPitch = player.pitch;

  player.fireCooldown = 1 / weapon.fireRate;
  player.ammoInMag -= 1;
  if (viewModel) {
    viewModel.flashTimer = 1;
    viewModel.smokeTimer = 1;
    viewModel.recoil = Math.min(1.35, (viewModel.recoil ?? 0) + (weapon.pellets > 1 ? 1.05 : 0.72) * recoilMultiplier);
  }
  player.recoilKick = Math.min(1.2, (player.recoilKick ?? 0) + (weapon.pellets > 1 ? 1.04 : 0.62) * recoilMultiplier);
  player.pitch = clamp(player.pitch - (weapon.pellets > 1 ? 0.018 : 0.008) * recoilMultiplier, -1.16, 1.16);
  const silentShot = isPlayerSoundSuppressed(player);
  playGunshotAudio(weapon, { gain: 1 });
  if (!silentShot) {
    alertEnemiesToSound(player.x, player.z, 40, { alertTimer: 4.6, investigateTimer: 5.8 });
  }

  const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  const aimSpreadMult = aiming ? (hasOptic ? 0.32 : 0.54) : 1;
  const baseSpread = (sprinting ? weapon.spread * 1.8 : weapon.spread) * (operator.spreadMult ?? 1) * aimSpreadMult * overdriveSpreadMult;
  const pelletCount = weapon.pellets ?? 1;
  const origin = new BABYLON.Vector3(player.x, getPlayerViewHeight(player), player.z);
  let tracerEnd = null;

  for (let pellet = 0; pellet < pelletCount; pellet += 1) {
    const spread = pelletCount > 1 ? baseSpread : baseSpread * 0.8;
    const yaw = aimYaw + randomBetween(-spread, spread);
    const pitch = aimPitch + randomBetween(-spread * 0.65, spread * 0.65);
    const direction = new BABYLON.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(-pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    if (pellet === 0) {
      spawnMuzzleExhaust(origin, direction);
    }
    const ray = new BABYLON.Ray(origin, direction, weapon.range);
    const pick = scene.pickWithRay(ray, (mesh) => Boolean(mesh?.metadata?.raycastTarget));
    let end = origin.add(direction.scale(weapon.range * 0.7));
    let hitEnemyId = '';

    if (pick?.hit && pick.pickedPoint) {
      end = pick.pickedPoint;
      if (pick.pickedMesh?.metadata?.raycastTarget === 'enemy') {
        const enemy = state.raid.enemies.find((entry) => entry.id === pick.pickedMesh.metadata.enemyId);
        if (enemy && !enemy.dead) {
          hitEnemyId = enemy.id;
          const baseDamage = getWeaponDamage(player.weapon, { ammoId: player.currentAmmoId, player });
          const assaultDamageMult = operator.id === 'assault' && player.abilityActiveTimer > 0
            ? (operator.damageBoostMult ?? 2)
            : 1;
          damageEnemy(enemy, baseDamage * assaultDamageMult);
        }
      } else {
        spawnImpactBurst(end, '#8ad8ff', weapon.pellets > 1 ? 1 : 0.78, 'hard');
        playImpactAudio(end, 'hard');
      }
    }
    triggerEnemyEvasionFromShot(origin, end, hitEnemyId);
    tracerEnd ??= end;
  }

  spawnTracer(origin, tracerEnd ?? origin, weapon.tracer, 0.08);
}

function killEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.revealedTimer = 0;
  enemy.muzzleTimer = 0;
  enemy.shootCooldown = Number.POSITIVE_INFINITY;
  enemy.alertTimer = 0;
  enemy.dashTimer = 0;
  enemy.corpseTimer = ENEMY_FALL_DURATION;
  enemy.despawned = false;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  const player = state.raid?.player;
  const operator = player ? getPlayerOperatorDef(player) : null;
  if (player && operator?.id === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
    const bonusSeconds = operator.killExtendSeconds ?? 1.5;
    const killHeal = operator.killHeal ?? 20;
    const previousHealth = player.health;
    player.abilityActiveTimer += bonusSeconds;
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);
    player.health = Math.min(player.maxHealth, player.health + killHeal);
    const recovered = Math.max(0, Math.round(player.health - previousHealth));
    notify(
      L(
        '\u8fc7\u8f7d\u5ef6\u957f +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? '\uff0c\u56de\u590d ' + recovered + ' \u751f\u547d\u3002' : '\u3002'),
        'Overdrive extended by +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? ` and restored ${recovered} HP.` : '.'),
      ),
      'success',
    );
  }
  const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
  enemy.dropPending = Math.random() < 0.42;
  enemy.dropItem = enemy.dropPending ? createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight)) : null;
  persistSave();
  notify(L('\u5df2\u51fb\u5012 ' + getEnemyLabel(enemy) + '\u3002', 'Target down: ' + getEnemyLabel(enemy) + '.'), 'success');
}

function applyDamageToPlayer(amount) {
  const player = state.raid?.player;
  if (!player) {
    return;
  }

  if ((player.damageImmunityTimer ?? 0) > 0) {
    player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, 0.2);
    spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#74e0a0', 0.05, 0.05);
    return;
  }

  const operator = getPlayerOperatorDef(player);
  const incomingDamage = Math.max(1, Math.round(amount * (player.damageReductionTimer > 0 ? (player.damageReductionMult ?? 1) : 1)));
  let remaining = incomingDamage;
  let blocked = 0;
  if (player.armor > 0) {
    blocked = Math.min(player.armor, Math.round(incomingDamage * 0.65));
    player.armor -= blocked;
    remaining -= Math.round(blocked * 0.7);
  }
  const finalDamage = Math.max(1, remaining);
  player.health = Math.max(0, player.health - finalDamage);
  player.damageFlash = Math.max(player.damageFlash ?? 0, 0.78);
  player.damageJolt = 1;
  player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, 0.8);
  spawnPulse(new BABYLON.Vector3(player.x, PLAYER_HEIGHT, player.z), '#ff7e68', 0.08, 0.08);
  playDamageAudio(finalDamage, blocked);

  const lastStandTriggered = operator.id === 'medic' && triggerMedicLastStand(player, operator);
  notify(L(`\u53d7\u5230 ${finalDamage} \u70b9\u4f24\u5bb3\u3002`, `Took ${finalDamage} damage.`), lastStandTriggered ? 'warning' : 'danger');
  if (player.health <= 0) {
    finishRaid(false, 'player_killed', false);
  }
}

function stepTouchMove(controlKey) {
  const raid = state.raid;
  const player = raid?.player;
  if (!raid || !player || state.overlay || player.mobilityAction || raid.switchSequence) {
    return;
  }

  const forward = {
    x: Math.sin(player.yaw),
    z: Math.cos(player.yaw),
  };
  const right = {
    x: Math.cos(player.yaw),
    z: -Math.sin(player.yaw),
  };

  let moveX = 0;
  let moveZ = 0;
  if (controlKey === 'ArrowUp') {
    moveX += forward.x;
    moveZ += forward.z;
  } else if (controlKey === 'ArrowDown') {
    moveX -= forward.x;
    moveZ -= forward.z;
  } else if (controlKey === 'ArrowLeft') {
    moveX -= right.x;
    moveZ -= right.z;
  } else if (controlKey === 'ArrowRight') {
    moveX += right.x;
    moveZ += right.z;
  }

  const movement = normalize2D(moveX, moveZ);
  if (!movement.x && !movement.z) {
    return;
  }

  const dt = 0.05;
  const speed = getPlayerMoveSpeed(player, false);
  moveEntityWithCollision(player, movement.x * speed * dt, movement.z * speed * dt, player.radius);
  player.velocityBob += magnitude(movement.x, movement.z) * 11 * dt;
  syncPlayerCamera();
  syncHud();
}

function applyStaticLanguage() {
  ensureExtendedRefs();
  const nextTitle = getLanguage() === 'en' ? 'Search Fight Extract' : '\u641c\u6253\u64a4';
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key) {
      element.textContent = t(key);
    }
  }
  if (refs.brandTitle) {
    refs.brandTitle.textContent = nextTitle;
  }
  document.title = nextTitle;
  const titleNode = document.querySelector('title');
  if (titleNode) {
    titleNode.textContent = nextTitle;
  }
  if (refs.operatorTitle) {
    refs.operatorTitle.textContent = L('\u5175\u79cd', 'Operators');
  }
  if (refs.lobbyTitle) {
    refs.lobbyTitle.textContent = L('å¤§å', 'Lobby');
  }
  if (refs.lobbyNote) {
    refs.lobbyNote.textContent = L(
      'å¨è¿ééæ©è¡å¨æ¨¡å¼ï¼åå³å®è¿æ¬¡åºå»çèå¥ä¸ç®æ ã',
      'Choose the operation mode here before deciding how this run should play.',
    );
  }
  if (refs.operatorNote) {
    refs.operatorNote.textContent = L(
      '\u4ec5\u80fd\u5728\u5c40\u5916\u9009\u62e9\uff0c\u4e0d\u540c\u5175\u79cd\u62e5\u6709\u72ec\u7279\u6280\u80fd\u3001\u7279\u6548\u548c\u4e13\u5c5e\u9053\u5177',
      'Choose operators only in base. Each one has a unique skill, effect, and signature item.',
    );
  }
  if (refs.tipMove) {
    refs.tipMove.textContent = L('WASD / \u65b9\u5411\u952e\u79fb\u52a8\uff0cSpace \u79fb\u52a8\u8df3\u8dc3\uff0cCtrl \u6ed1\u94f2', 'WASD / Arrow keys move, Space jumps while moving, Ctrl slides');
  }
  if (refs.tipLook) {
    refs.tipLook.textContent = L('\u9f20\u6807\u8f6c\u5411\uff0c\u53f3\u952e\u7784\u51c6', 'Mouse looks, right mouse aims');
  }
  if (refs.tipFire) {
    refs.tipFire.textContent = L('F \u5f00\u706b\uff0cR \u6362\u5f39', 'F fires, R reloads');
  }
  if (refs.tipAction) {
    refs.tipAction.textContent = L(
      'Q \u6cbb\u7597\uff0cE \u641c\u7d22 / \u64a4\u79bb\uff0cZ \u8db4\u4e0b\uff0cV \u7ffb\u6eda\uff0cX \u8e32\u95ea\uff0cM \u5730\u56fe\uff0cC \u6280\u80fd',
      'Q heal, E search / extract, Z prone, V roll, X dodge, M map, C skill',
    );
  }
  if (refs.objectiveLabel) {
    refs.objectiveLabel.textContent = L('\u76ee\u6807', 'Objectives');
  }
  if (refs.threatLabel) {
    refs.threatLabel.textContent = L('\u5a01\u80c1', 'Threat');
  }
  if (refs.abilityLabel) {
    refs.abilityLabel.textContent = L('\u6280\u80fd', 'Ability');
  }
  if (refs.aimActionButton) {
    refs.aimActionButton.textContent = L('\u7784\u51c6', 'Aim');
  }
  if (refs.skillActionButton) {
    refs.skillActionButton.textContent = L('\u6280\u80fd', 'Skill');
  }
  refs.langZhButton?.classList.toggle('is-active', getLanguage() === 'zh');
  refs.langEnButton?.classList.toggle('is-active', getLanguage() === 'en');
}

function bindEvents() {
  ensureExtendedRefs();
  refs.canvas.setAttribute('tabindex', '0');
  window.addEventListener('pointerdown', unlockAudioContext, { passive: true });
  window.addEventListener('keydown', unlockAudioContext);
  refs.deployButton.addEventListener('click', startRaid);
  refs.saveResetButton.addEventListener('click', resetSave);
  refs.sellAllButton.addEventListener('click', sellAllStash);
  refs.returnBaseButton.addEventListener('click', returnToBase);
  refs.closeLootButton.addEventListener('click', closeLootPanel);
  refs.takeAllButton.addEventListener('click', takeAllCurrentContainer);
  refs.closeMapButton.addEventListener('click', closeMapOverlay);
  refs.languageSwitch?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-language-option]');
    if (button) {
      setLanguage(button.dataset.languageOption);
    }
  });

  refs.operatorPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-operator-id]');
    if (button) {
      setSelectedOperator(button.dataset.operatorId);
    }
  });

  refs.shopList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-id]');
    if (button) {
      buyShopEntry(button.dataset.shopId);
    }
  });

  refs.armoryPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-armory-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.armoryAction;
    const weaponId = button.dataset.weaponId;
    const ammoId = button.dataset.ammoId;
    const partId = button.dataset.partId;
    const slot = button.dataset.partSlot;
    if (action === 'select-weapon' && weaponId) {
      setSelectedWeapon(weaponId);
    } else if (action === 'select-ammo' && weaponId && ammoId) {
      setSelectedAmmoForWeapon(weaponId, ammoId);
    } else if (action === 'equip-part' && weaponId && partId) {
      setEquippedPartForWeapon(weaponId, partId);
    } else if (action === 'unequip-part' && weaponId && slot) {
      clearEquippedPartForWeapon(weaponId, slot);
    }
  });

  refs.raidSidePanel?.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-collapse-target]');
    if (toggle) {
      toggleRaidPanel(toggle.dataset.collapseTarget);
    }
  });

  refs.stashList.addEventListener('click', (event) => {
    const stashButton = event.target.closest('[data-stash-action]');
    if (stashButton) {
      const action = stashButton.dataset.stashAction;
      const uid = stashButton.dataset.stashId;
      if (action === 'sell') {
        sellItem(uid);
      } else if (action === 'discard') {
        discardStashItem(uid);
      } else if (action === 'stock-ammo') {
        stockAmmoFromStash(uid);
      } else if (action === 'learn-part') {
        learnPartFromStash(uid);
      }
      return;
    }
    const sellButton = event.target.closest('[data-sell-id]');
    if (sellButton) {
      sellItem(sellButton.dataset.sellId);
    }
  });

  refs.lootItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-loot-action]');
    if (!button) {
      const takeButton = event.target.closest('[data-take-id]');
      if (takeButton) {
        takeLoot(state.ui.currentContainerId, takeButton.dataset.takeId);
      }
      return;
    }
    const itemId = button.dataset.lootId;
    const action = button.dataset.lootAction;
    if (action === 'take') {
      takeLoot(state.ui.currentContainerId, itemId);
    } else if (action === 'use') {
      useLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'equip') {
      equipLootItem(state.ui.currentContainerId, itemId);
    } else if (action === 'load') {
      loadLootAmmo(state.ui.currentContainerId, itemId);
    }
  });

  const handleBagClick = (event) => {
    const button = event.target.closest('[data-bag-action]');
    if (!button) {
      return;
    }
    const uid = button.dataset.itemId;
    const action = button.dataset.bagAction;
    if (action === 'use' || action === 'load-ammo') {
      useBagItem(uid);
    } else if (action === 'equip') {
      equipBagItem(uid);
    } else if (action === 'unequip') {
      const item = state.raid?.bag.find((entry) => entry.uid === uid);
      if (item) {
        unequipPartItemFromRaid(item);
        syncHud();
      }
    } else if (action === 'drop') {
      dropBagItem(uid);
    }
  };
  refs.bagList?.addEventListener('click', handleBagClick);
  refs.raidBagList?.addEventListener('click', handleBagClick);

  const handleAmmoRailClick = (event) => {
    const button = event.target.closest('[data-raid-ammo]');
    if (button) {
      selectRaidAmmo(button.dataset.raidAmmo);
    }
  };
  refs.mapAmmoList?.addEventListener('click', handleAmmoRailClick);
  refs.raidAmmoRail?.addEventListener('click', handleAmmoRailClick);

  refs.canvas.addEventListener('click', () => {
    if (state.mode === 'raid' && !state.overlay) {
      refs.canvas.focus?.({ preventScroll: true });
      requestPointerLock();
    }
  });

  refs.canvas.addEventListener('contextmenu', (event) => {
    if (state.mode === 'raid') {
      event.preventDefault();
    }
  });

  refs.canvas.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'raid' || state.overlay) {
      return;
    }
    refs.canvas.focus?.({ preventScroll: true });
    if (event.button === 2) {
      state.input.aimHeld = true;
      event.preventDefault();
    }
    state.input.lookDragging = true;
    state.input.lookPointerId = event.pointerId;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    refs.canvas.setPointerCapture?.(event.pointerId);
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (
      state.mode !== 'raid' ||
      !state.raid ||
      state.overlay ||
      state.pointerLocked ||
      !state.input.lookDragging ||
      state.input.lookPointerId !== event.pointerId
    ) {
      return;
    }
    const deltaX = event.clientX - state.input.lastPointerX;
    const deltaY = event.clientY - state.input.lastPointerY;
    state.input.lastPointerX = event.clientX;
    state.input.lastPointerY = event.clientY;
    applyLookDelta(deltaX, deltaY);
  });

  const stopLookDrag = (event) => {
    if (event.pointerId !== undefined && state.input.lookPointerId !== null && event.pointerId !== state.input.lookPointerId) {
      return;
    }
    if (event.button === 2) {
      state.input.aimHeld = false;
    }
    state.input.lookDragging = false;
    state.input.lookPointerId = null;
  };
  refs.canvas.addEventListener('pointerup', stopLookDrag);
  refs.canvas.addEventListener('pointercancel', stopLookDrag);
  refs.canvas.addEventListener('lostpointercapture', stopLookDrag);

  const activeControlPointers = new Map();
  refs.touchControls?.addEventListener('pointerdown', (event) => {
    const keyButton = event.target.closest('[data-control-key]');
    const actionButton = event.target.closest('[data-control-action]');
    if (!keyButton && !actionButton) {
      return;
    }
    event.preventDefault();
    refs.canvas.focus?.({ preventScroll: true });

    if (keyButton) {
      const key = keyButton.dataset.controlKey;
      state.input.keys.add(key);
      stepTouchMove(key);
      const intervalId = window.setInterval(() => stepTouchMove(key), 50);
      keyButton.setPointerCapture?.(event.pointerId);
      activeControlPointers.set(event.pointerId, { type: 'key', value: key, intervalId });
      return;
    }

    const action = actionButton.dataset.controlAction;
    actionButton.setPointerCapture?.(event.pointerId);
    if (action === 'interact') {
      triggerRaidInteract();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'fire') {
      state.input.fireHeld = true;
      attemptShoot();
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'aim') {
      state.input.aimHeld = true;
      activeControlPointers.set(event.pointerId, { type: 'action', value: action });
    } else if (action === 'reload') {
      reloadWeapon();
    } else if (action === 'heal') {
      useMedkit();
    } else if (action === 'skill') {
      useOperatorAbility();
    } else if (action === 'map') {
      toggleRaidMap();
    }
  });

  const releaseControlPointer = (event) => {
    const active = activeControlPointers.get(event.pointerId);
    if (!active) {
      return;
    }
    if (active.type === 'key') {
      state.input.keys.delete(active.value);
      window.clearInterval(active.intervalId);
    } else if (active.type === 'action') {
      if (active.value === 'interact') {
        state.input.interactHeld = false;
      }
      if (active.value === 'fire') {
        state.input.fireHeld = false;
      }
      if (active.value === 'aim') {
        state.input.aimHeld = false;
      }
    }
    activeControlPointers.delete(event.pointerId);
  };

  refs.touchControls?.addEventListener('pointerup', releaseControlPointer);
  refs.touchControls?.addEventListener('pointercancel', releaseControlPointer);
  refs.touchControls?.addEventListener('lostpointercapture', releaseControlPointer);

  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('mousemove', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay || !state.pointerLocked) {
      return;
    }
    applyLookDelta(event.movementX, event.movementY);
  });

  window.addEventListener('mousedown', (event) => {
    if (state.mode !== 'raid' || !state.raid || state.overlay) {
      return;
    }
    const onCanvas = event.target === refs.canvas;
    if (!state.pointerLocked && !onCanvas) {
      return;
    }
    if (event.button === 2) {
      refs.canvas.focus?.({ preventScroll: true });
      state.input.aimHeld = true;
      event.preventDefault();
    }
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      state.input.aimHeld = false;
    }
  });

  window.addEventListener('blur', () => {
    state.input.fireHeld = false;
    state.input.aimHeld = false;
    state.input.interactHeld = false;
  });

  window.addEventListener('keydown', (event) => {
    state.input.keys.add(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    const isFireKey = event.code === 'KeyF' || lowerKey === 'f';
    const isReloadKey = event.code === 'KeyR' || lowerKey === 'r';
    const isHealKey = event.code === 'KeyQ' || lowerKey === 'q';
    const isMapKey = event.code === 'KeyM' || lowerKey === 'm';
    const isInteractKey = event.code === 'KeyE' || lowerKey === 'e';
    const isSkillKey = event.code === 'KeyC' || lowerKey === 'c';
    const isProneKey = event.code === 'KeyZ' || lowerKey === 'z';
    const isDodgeKey = event.code === 'KeyX' || lowerKey === 'x';
    const isRollKey = event.code === 'KeyV' || lowerKey === 'v';
    const isJumpKey = event.code === 'Space';
    const isSlideKey = event.code === 'ControlLeft' || event.code === 'ControlRight';

    if (isFireKey) {
      if (!state.input.fireHeld && state.mode === 'raid' && state.raid && !state.overlay) {
        attemptShoot();
      }
      state.input.fireHeld = true;
      event.preventDefault();
    }
    if (event.repeat) {
      return;
    }
    if (state.mode === 'raid' && state.raid) {
      refs.canvas.focus?.({ preventScroll: true });
      if (isReloadKey) {
        reloadWeapon();
      }
      if (isHealKey) {
        useMedkit();
      }
      if (isMapKey) {
        toggleRaidMap();
      }
      if (isInteractKey) {
        triggerRaidInteract();
      }
      if (isSkillKey) {
        useOperatorAbility();
      }
      if (isJumpKey) {
        if (tryPlayerMobilityAction('jump')) {
          event.preventDefault();
        }
      }
      if (isSlideKey) {
        if (tryPlayerMobilityAction('slide')) {
          event.preventDefault();
        }
      }
      if (isRollKey) {
        if (tryPlayerMobilityAction('roll')) {
          event.preventDefault();
        }
      }
      if (isDodgeKey) {
        if (tryPlayerMobilityAction('dodge')) {
          event.preventDefault();
        }
      }
      if (isProneKey) {
        if (tryPlayerMobilityAction('prone')) {
          event.preventDefault();
        }
      }
      if (event.code === 'Escape') {
        if (state.overlay === 'loot') {
          closeLootPanel();
        } else if (state.overlay === 'map') {
          closeMapOverlay();
        } else {
          releasePointerLock();
        }
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    state.input.keys.delete(event.code);
    const lowerKey = event.key?.toLowerCase?.() ?? '';
    if (event.code === 'KeyE' || lowerKey === 'e') {
      state.input.interactHeld = false;
    }
    if (event.code === 'KeyF' || lowerKey === 'f') {
      state.input.fireHeld = false;
    }
  });

  syncRaidPanelCollapses();
  applyLanguage();
}

// Final runtime overrides for lobby mode flow.
window.__sdrPatchedStartRaid = function patchedStartRaid() {
  clearRaid();
  ensureExtendedRefs();
  unlockAudioContext();
  state.input.fireHeld = false;
  state.input.mouseDown = false;
  state.input.interactHeld = false;
  state.input.lookDragging = false;
  state.input.lookPointerId = null;
  state.input.keys.clear();
  state.input.aimHeld = false;

  state.save.stats.raids += 1;
  const weaponId = getSelectedWeaponId();
  const ammoId = getSelectedAmmoIdForWeapon(weaponId);
  const starterWeapon = getWeaponStats(weaponId, { ammoId });
  const operator = getOperatorDef(getSelectedOperatorId());
  const modeDef = getLobbyModeDef();
  const medkits = BASE_MEDKITS + state.save.prep.medkitBonus + operator.startMedkitBonus;
  const initialArmor = BASE_ARMOR + state.save.prep.armorBonus + operator.startArmorBonus;
  const playerSpawn = chooseRaidSpawnPoint();
  const raidEnemySpawns = chooseRaidEnemySpawns(playerSpawn);
  const raidLayout = modeDef.buildLayout(playerSpawn);
  const ammoInventory = defaultPrepAmmo();
  const objectives = modeDef.objectiveFactory().map((objective) => ({ ...objective }));
  for (const key of Object.keys(ammoInventory)) {
    ammoInventory[key] = Math.max(0, Number(state.save.prepAmmo[key] ?? 0));
  }
  ammoInventory[WEAPON_DEFS[weaponId].defaultAmmoId] += WEAPON_DEFS[weaponId].baseReserve;

  state.raid = {
    modeId: modeDef.id,
    bonusReward: modeDef.bonusReward ?? 0,
    timeLeft: modeDef.duration,
    statusText: L('WASD ÒÆ¶¯£¬Êó±ê×ªÏò£¬F ¿ª»ð¡£', 'WASD to move, mouse to look, F to fire.'),
    interactionText: modeDef.getStartInteractionText(),
    bag: [],
    bagValue: 0,
    bagWeight: 0,
    killCount: 0,
    hitConfirmTimer: 0,
    overlayPaused: false,
    tasksComplete: objectives.length === 0,
    extractionSequence: null,
    switchSequence: null,
    objectives,
    spawnSafeTimer: SPAWN_SAFE_DURATION,
    spawnSafeCenterX: playerSpawn.x,
    spawnSafeCenterZ: playerSpawn.z,
    spawnSafeRadius: SPAWN_SAFE_RADIUS,
    player: {
      x: playerSpawn.x,
      z: playerSpawn.z,
      yaw: playerSpawn.yaw ?? Math.PI / 2,
      pitch: 0.16,
      weapon: weaponId,
      currentAmmoId: ammoId,
      ammoInventory,
      tempAttachments: {},
      operatorId: operator.id,
      abilityCharges: operator.utilityCharges,
      abilityCooldown: 0,
      abilityCooldownPending: false,
      abilityActiveTimer: 0,
      operatorEffectTimer: 0,
      damageReductionTimer: 0,
      damageReductionMult: 1,
      medicAutoUsed: false,
      medicFoamTimer: 0,
      medicFoamPulseTimer: 0,
      damageImmunityTimer: 0,
      medicSpeedBoostTimer: 0,
      medicPostShieldPending: false,
      reconZone: null,
      isAiming: false,
      aimBlend: 0,
      radius: PLAYER_RADIUS,
      health: PLAYER_BASE_HEALTH,
      maxHealth: PLAYER_BASE_HEALTH,
      armor: initialArmor,
      maxArmor: initialArmor,
      ammoInMag: starterWeapon.magSize,
      magSize: starterWeapon.magSize,
      medkits,
      fireCooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      useAction: null,
      useActionPulseTimer: 0,
      mobilityAction: null,
      mobilityCooldown: 0,
      proneCooldown: 0,
      proneTimer: 0,
      proneBlend: 0,
      isProne: false,
      lastDodgeSide: 1,
      dropTimer: DEPLOY_ANIMATION_DURATION,
      dropDuration: DEPLOY_ANIMATION_DURATION,
      dropStartHeight: DEPLOY_START_HEIGHT,
      dropLandingPulseDone: false,
      extractionProgress: 0,
      extractionZoneId: null,
      damageFlash: 0,
      recoilKick: 0,
      damageJolt: 0,
      nearHitPulse: 0,
      velocityBob: 0,
    },
    containers: containerSpawns.map((spawn) => {
      const resolved = resolveStaticPlacement(spawn.x, spawn.z, 1.5);
      return {
        ...spawn,
        x: resolved.x,
        z: resolved.z,
        opened: false,
        items: generateContainerLoot(spawn),
        visual: null,
        highlight: 0,
      };
    }),
    extractions: raidLayout.extractions.map((zone) => ({
      ...zone,
      visual: null,
    })),
    switchPoints: raidLayout.switchPoints.map((point) => ({
      ...point,
      visual: null,
    })),
    enemies: raidEnemySpawns.map((spawn, index) => createEnemy(spawn, index)),
    effects: [],
    result: null,
  };

  state.save.prep.medkitBonus = 0;
  state.save.prep.ammoBonus = 0;
  state.save.prep.armorBonus = 0;
  state.save.prepAmmo = defaultPrepAmmo();
  persistSave();

  spawnRaidVisuals();
  closeLootPanel();
  closeMapOverlay();
  refs.resultOverlay.classList.add('hidden');
  state.ui.currentContainerId = null;
  state.ui.raidPanelCollapsed = {
    raidLoadoutList: false,
    raidAmmoRail: false,
    raidBagList: false,
  };
  setMode('raid');
  refs.canvas.focus?.({ preventScroll: true });
  renderBasePanel();
  syncHud();
  notify(modeDef.getStartNotice(), 'success');
};
startRaid = window.__sdrPatchedStartRaid;

window.__sdrPatchedKillEnemy = function patchedKillEnemy(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.health = 0;
  enemy.revealedTimer = 0;
  enemy.muzzleTimer = 0;
  enemy.shootCooldown = Number.POSITIVE_INFINITY;
  enemy.alertTimer = 0;
  enemy.dashTimer = 0;
  enemy.corpseTimer = ENEMY_FALL_DURATION;
  enemy.despawned = false;
  enemy.visual?.hitbox?.setEnabled(false);
  state.raid.killCount += 1;
  state.save.stats.kills += 1;
  advanceRaidObjective('kill', 1);
  if (enemy.type === 'hunter') {
    advanceRaidObjective('hunter', 1);
  }
  const player = state.raid?.player;
  const operator = player ? getPlayerOperatorDef(player) : null;
  if (player && operator?.id === 'assault' && (player.abilityActiveTimer ?? 0) > 0) {
    const bonusSeconds = operator.killExtendSeconds ?? 1.5;
    const killHeal = operator.killHeal ?? 20;
    const previousHealth = player.health;
    player.abilityActiveTimer += bonusSeconds;
    player.operatorEffectTimer = Math.max(player.operatorEffectTimer ?? 0, player.abilityActiveTimer);
    player.health = Math.min(player.maxHealth, player.health + killHeal);
    const recovered = Math.max(0, Math.round(player.health - previousHealth));
    notify(
      L(
        '¹ýÔØÑÓ³¤ +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? '£¬»Ö¸´ ' + recovered + ' ÉúÃü¡£' : '¡£'),
        'Overdrive extended by +' + bonusSeconds.toFixed(1) + 's' + (recovered > 0 ? ` and restored ${recovered} HP.` : '.'),
      ),
      'success',
    );
  }
  const bonusPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon'));
  enemy.dropPending = Math.random() < 0.42;
  enemy.dropItem = enemy.dropPending ? createLootInstance(weightedPick(bonusPool, (item) => item.spawnWeight)) : null;
  persistSave();
  notify(L('ÒÑ»÷µ¹ ' + getEnemyLabel(enemy) + '¡£', 'Target down: ' + getEnemyLabel(enemy) + '.'), 'success');
};
killEnemy = window.__sdrPatchedKillEnemy;

if (refs.deployButton && !refs.deployButton.dataset.boundPatchedRaidFinal) {
  refs.deployButton.dataset.boundPatchedRaidFinal = 'true';
  refs.deployButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.__sdrPatchedStartRaid();
  }, true);
}

function isEnemyActivelyReconRevealed(enemy, raid = state.raid) {
  const player = raid?.player;
  if (
    !raid ||
    !player ||
    player.operatorId !== 'recon' ||
    (player.abilityActiveTimer ?? 0) <= 0 ||
    !player.reconZone ||
    !enemy ||
    enemy.dead
  ) {
    return false;
  }
  if (!isPointInsideBounds(enemy.x, enemy.z, player.reconZone)) {
    return false;
  }
  return (enemy.revealedTimer ?? 0) > 0.01;
}

refreshReconZoneReveal = function patchedRefreshReconZoneReveal(raid = state.raid, player = raid?.player, operator = getPlayerOperatorDef(player)) {
  if (!raid || !player || player.operatorId !== 'recon' || (player.abilityActiveTimer ?? 0) <= 0 || !player.reconZone) {
    return 0;
  }
  let revealedCount = 0;
  const revealWindow = Math.max(0.18, Math.min(operator.abilityDuration ?? 25, player.abilityActiveTimer ?? 0));
  for (const enemy of raid.enemies) {
    if (enemy.dead) {
      enemy.revealedTimer = 0;
      continue;
    }
    if (!isPointInsideBounds(enemy.x, enemy.z, player.reconZone)) {
      enemy.revealedTimer = 0;
      continue;
    }
    enemy.revealedTimer = revealWindow;
    revealedCount += 1;
  }
  return revealedCount;
};

getReconVisibleEnemies = function patchedGetReconVisibleEnemies(raid = state.raid) {
  if (!raid?.enemies?.length) {
    return [];
  }
  return raid.enemies.filter((enemy) => isEnemyActivelyReconRevealed(enemy, raid));
};

syncEnemyRevealOverlays = function patchedSyncEnemyRevealOverlays() {
  const raid = state.raid;
  if (!raid) {
    return;
  }

  for (const enemy of raid.enemies) {
    if (!enemy.visual) {
      continue;
    }
    const revealStrength = isEnemyActivelyReconRevealed(enemy, raid)
      ? clamp((enemy.revealedTimer ?? 0) / 0.5, 0, 1)
      : 0;
    for (const mesh of enemy.visual.overlayMeshes ?? [enemy.visual.body, enemy.visual.head, enemy.visual.gun]) {
      if (!mesh) {
        continue;
      }
      mesh.renderOverlay = revealStrength > 0.01;
      mesh.overlayColor = BABYLON.Color3.FromHexString('#79f5ff');
      mesh.overlayAlpha = 0.18 + revealStrength * 0.28;
    }
    const revealMaterial = enemy.visual.revealMaterial;
    if (revealMaterial) {
      const pulse = 0.82 + Math.sin(performance.now() * 0.012 + enemy.id.length) * 0.08;
      const revealColor = BABYLON.Color3.FromHexString('#79f5ff').scale(0.88 + revealStrength * 0.44);
      revealMaterial.alpha = revealStrength > 0.01 ? 0.16 + revealStrength * 0.24 : 0;
      revealMaterial.emissiveColor = revealColor.scale(pulse);
      revealMaterial.diffuseColor = revealColor.scale(0.18);
      if (enemy.visual.classLabelMaterial) {
        enemy.visual.classLabelMaterial.alpha = revealStrength > 0.01 ? 0.82 + revealStrength * 0.18 : 0;
        enemy.visual.classLabelMaterial.emissiveColor = revealColor.scale(1.08 + revealStrength * 0.12);
      }
    }
    const nextClassLabelText = getEnemyTypeLabel(enemy.type);
    if (enemy.visual.classLabelTexture && enemy.visual.classLabelText !== nextClassLabelText) {
      drawEnemyClassLabel(enemy.visual.classLabelTexture, nextClassLabelText);
      enemy.visual.classLabelText = nextClassLabelText;
    }
    for (const mesh of enemy.visual.revealMeshes ?? []) {
      mesh.setEnabled(revealStrength > 0.01);
    }
  }
};
