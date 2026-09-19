(() => {
  if (window.__sdrNamelessBossPatch) return;

  const boot = () => {
    if (typeof state === 'undefined' || typeof updateRaid === 'undefined' || typeof updateEnemies === 'undefined' || typeof createEnemy === 'undefined') {
      window.setTimeout(boot, 80);
      return;
    }
    window.__sdrNamelessBossPatch = true;

    const BOSS_RADIUS = 68;
    const BOSS_DETECT_RANGE = 40;
    const BOSS_REGEN_INTERVAL = 5;
    const BOSS_REGEN_AMOUNT = 150;
    const nativeMusic = { lobby: null, raid: null, underground: null, active: 'base', audible: null, primed: false };
    const nativeSfx = { pools: {}, primed: false, lastExplosionAt: 0 };

    const createNativeTrack = (file, volume, loop = true) => {
      const track = document.createElement('audio');
      track.src = `./assets/${file}?v=${file === 'raid-combat.wav' ? '20260912chamber' : '20260909a'}`;
      track.loop = loop;
      track.preload = 'auto';
      track.volume = volume;
      track.setAttribute('aria-hidden', 'true');
      track.style.display = 'none';
      document.body.appendChild(track);
      return track;
    };

    const ensureNativeMusic = () => {
      if (!nativeMusic.lobby) nativeMusic.lobby = createNativeTrack('raid-ambient.wav', 0);
      if (!nativeMusic.raid) nativeMusic.raid = createNativeTrack('raid-combat.wav', 0);
      if (!nativeMusic.underground) nativeMusic.underground = createNativeTrack('underground.wav', 0);
      return nativeMusic;
    };

    const syncNativeMusicTheme = (theme = nativeMusic.active) => {
      nativeMusic.active = theme;
      const tracks = ensureNativeMusic();
      if (!tracks.primed) return;
      const audible = theme === 'underground' ? 'underground' : state.mode === 'raid' ? 'raid' : 'lobby';
      tracks.lobby.volume = audible === 'lobby' ? 0.3 : 0;
      tracks.raid.volume = audible === 'raid' ? 0.22 : 0;
      tracks.underground.volume = audible === 'underground' ? 0.52 : 0;
      tracks.audible = audible;
    };

    const primeNativeMusic = () => {
      const tracks = ensureNativeMusic();
      if (tracks.primed) return;
      tracks.primed = true;
      // Prime all tracks in one player gesture; screen state selects the audible track later.
      for (const track of [tracks.lobby, tracks.raid, tracks.underground]) {
        track.volume = 0;
        track.play().catch(() => {});
      }
      syncNativeMusicTheme();
    };

    const getNativeSfxPool = (name, size = 4) => {
      if (nativeSfx.pools[name]) return nativeSfx.pools[name];
      const pool = Array.from({ length: size }, () => createNativeTrack(`${name}.wav`, 0, false));
      nativeSfx.pools[name] = pool;
      return pool;
    };

    const primeNativeSfx = () => {
      if (nativeSfx.primed) return;
      nativeSfx.primed = true;
      for (const [name, size] of [['gunshot', 6], ['impact', 5], ['explosion', 3], ['damage', 3]]) {
        getNativeSfxPool(name, size);
      }
    };

    const playNativeSfx = (name, volume = 0.6) => {
      const pool = getNativeSfxPool(name);
      const voice = pool.find((entry) => entry.paused || entry.ended) ?? pool[0];
      voice.pause();
      voice.currentTime = 0;
      voice.volume = Math.max(0, Math.min(1, volume));
      voice.play().catch(() => {});
    };

    const getRaidMusicBus = (audio) => {
      if (!audio?.ctx) return null;
      if (!audio.raidMusicBus) {
        const bus = audio.ctx.createGain();
        bus.gain.value = 0.78;
        // Keep music independent from the combat compressor so gunfire cannot mute it.
        bus.connect(audio.master ?? audio.ctx.destination);
        audio.raidMusicBus = bus;
        if (audio.music) audio.music.gain.value = 0.001;
      }
      return audio.raidMusicBus;
    };

    const reviveSfxChannel = () => {
      const audio = getPlayableAudioState();
      if (!audio?.ctx) return;
      if (audio.ctx.state !== 'running') {
        audio.ctx.resume().catch(() => {});
        return;
      }
      if (audio.sfx?.gain) audio.sfx.gain.value = 1.08;
    };

    const ensureRaidAudio = () => {
      const audio = getPlayableAudioState();
      if (!audio?.ctx || audio.ctx.state !== 'running') return null;
      getRaidMusicBus(audio);
      if (!audio.musicStarted) {
        audio.musicStarted = true;
        audio.nextMusicAt = audio.ctx.currentTime + 0.05;
        audio.musicStep = 0;
      }
      return audio;
    };

    const scheduleRaidAmbience = (audio) => {
      const destination = getRaidMusicBus(audio);
      if (!destination || (audio.raidAmbienceNext ?? 0) > audio.ctx.currentTime + 1.1) return;
      const bass = [65.41, 73.42, 82.41, 73.42, 61.74, 65.41, 55, 61.74];
      const melody = [261.63, 293.66, 329.63, 293.66, 246.94, 261.63, 220, 246.94];
      let time = Math.max(audio.ctx.currentTime + 0.04, audio.raidAmbienceNext ?? 0);
      while (time < audio.ctx.currentTime + 2.2) {
        const step = audio.raidAmbienceStep ?? 0;
        const index = step % bass.length;
        const note = bass[index];
        scheduleTone({
          destination,
          time,
          type: 'triangle',
          startFreq: note,
          endFreq: note * 0.985,
          peakGain: 0.14,
          duration: 0.38,
          release: 0.34,
          sustain: 0.42,
        });
        if (index % 2 === 0) {
          scheduleTone({
            destination,
            time: time + 0.1,
            type: 'sine',
            startFreq: melody[index],
            endFreq: melody[index] * 0.998,
            peakGain: 0.082,
            attack: 0.025,
            duration: 0.3,
            release: 0.38,
            sustain: 0.5,
          });
        }
        audio.raidAmbienceStep = step + 1;
        time += 0.52;
      }
      audio.raidAmbienceNext = time;
    };

    // This is an original procedural underground theme, not an external music track.
    const scheduleUndergroundTheme = (audio) => {
      const destination = getRaidMusicBus(audio);
      if (!destination || (audio.undergroundNext ?? 0) > audio.ctx.currentTime + 1.1) return;
      const bass = [46.25, 46.25, 51.91, 55, 43.65, 46.25, 51.91, 41.2];
      const melody = [138.59, 155.56, 164.81, 185, 130.81, 138.59, 155.56, 123.47];
      let time = Math.max(audio.ctx.currentTime + 0.04, audio.undergroundNext ?? 0);
      while (time < audio.ctx.currentTime + 2.2) {
        const step = audio.undergroundStep ?? 0;
        const index = step % bass.length;
        scheduleTone({
          destination,
          time,
          type: 'triangle',
          startFreq: bass[index],
          endFreq: bass[index] * 0.975,
          peakGain: 0.082,
          attack: 0.018,
          duration: 0.34,
          release: 0.3,
          sustain: 0.42,
        });
        scheduleTone({
          destination,
          time: time + 0.12,
          type: 'sine',
          startFreq: melody[index],
          endFreq: melody[index] * 0.99,
          peakGain: 0.048,
          attack: 0.02,
          duration: 0.24,
          release: 0.46,
          sustain: 0.45,
        });
        audio.undergroundStep = step + 1;
        time += 0.42;
      }
      audio.undergroundNext = time;
    };

    const unlockFromPlayerGesture = () => {
      const audio = getPlayableAudioState();
      if (audio?.ctx) {
        const beginMusic = () => {
          audio.musicStarted = true;
          audio.nextMusicAt = audio.ctx.currentTime + 0.05;
          audio.musicStep = 0;
          audio.raidAmbienceNext = audio.ctx.currentTime + 0.05;
        };
        if (audio.ctx.state === 'running') {
          beginMusic();
        } else {
          audio.ctx.resume().then(beginMusic).catch(() => {});
        }
      }
      // Web Audio must be resumed first in this gesture so weapon and impact effects stay available.
      primeNativeMusic();
      primeNativeSfx();
    };
    window.addEventListener('pointerdown', unlockFromPlayerGesture, { capture: true, passive: true });
    window.addEventListener('keydown', unlockFromPlayerGesture, { capture: true });
    window.addEventListener('touchstart', unlockFromPlayerGesture, { capture: true, passive: true });
    window.addEventListener('pointerdown', reviveSfxChannel, { capture: true, passive: true });
    window.addEventListener('keydown', reviveSfxChannel, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) reviveSfxChannel();
    });

    const originalTryPlayerMobilityAction = tryPlayerMobilityAction;
    tryPlayerMobilityAction = function stablePlayerMobilityAction(type) {
      if (type !== 'jump') return originalTryPlayerMobilityAction(type);
      const started = originalTryPlayerMobilityAction(type);
      if (started) return true;
      const raid = state.raid;
      const player = raid?.player;
      if (!raid || !player || state.overlay || raid.switchSequence || player.useAction || player.reloadTimer > 0 || player.healTimer > 0 || player.mobilityAction || (player.mobilityCooldown ?? 0) > 0) {
        return false;
      }
      if (player.isProne) {
        player.isProne = false;
        player.proneCooldown = Math.max(player.proneCooldown ?? 0, 0.22);
      }
      const fallback = getFacingVectors(player.yaw ?? 0).forward;
      return beginMobilityAction(player, 'jump', fallback.x, fallback.z, {
        duration: 0.56,
        speed: 6.8,
        height: 1.02,
        cooldown: 0.66,
      });
    };

    const inBossTerritory = (boss, x, z) => distance2D(boss.territoryX, boss.territoryZ, x, z) <= BOSS_RADIUS;
    const bossCandidates = (raid) => {
      const half = MAP_HALF * 0.5;
      return [-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => ({ x: xSign * half, z: zSign * half }))).filter((candidate) => {
        const playerFar = distance2D(candidate.x, candidate.z, raid.player.x, raid.player.z) > BOSS_RADIUS + 30;
        const noExit = !(raid.extractions ?? []).some((zone) => distance2D(candidate.x, candidate.z, zone.x, zone.z) <= BOSS_RADIUS + 12);
        return playerFar && noExit;
      });
    };

    const createNamelessBoss = (raid) => {
      const candidates = bossCandidates(raid);
      const territory = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : { x: -MAP_HALF * 0.5, z: MAP_HALF * 0.5 };
      const resolved = resolveStaticPlacement(territory.x, territory.z, 2.2);
      const bossHealth = raid.player?.operatorId === 'assault' ? 2000 : 1500;
      const boss = createEnemy({ x: resolved.x, z: resolved.z, route: [{ x: resolved.x, z: resolved.z }] }, 2);
      Object.assign(boss, {
        id: 'boss-nameless',
        name: '',
        type: 'boss',
        isNamelessBoss: true,
        health: bossHealth,
        maxHealth: bossHealth,
        damage: 30,
        speed: 5,
        preferredRange: 30,
        longFireRange: 30,
        detectRange: BOSS_DETECT_RANGE,
        fireInterval: 0.42,
        shotBurst: 4,
        burstInterval: 0.06,
        accuracyBonus: 0.23,
        radius: 0.92,
        territoryX: territory.x,
        territoryZ: territory.z,
        territoryRadius: BOSS_RADIUS,
        regenTimer: BOSS_REGEN_INTERVAL,
        tacticalTimer: 1.2,
        evasionTimer: 0.1,
        coverTimer: 0,
        lastHitTimer: 0,
        flashTimer: 4,
        elbowTimer: 0,
        utilityHits: 0,
        utilityImmune: false,
        enraged: false,
        enrageTimer: 0,
        baseDamageReduction: 0.18,
        bossDropAwarded: false,
        visualColor: '#303943',
      });
      boss.visual = createEnemyVisual(boss);
      boss.visual.root.scaling.setAll(1.3);
      const visorMat = new BABYLON.StandardMaterial('nameless-visor', scene);
      visorMat.diffuseColor = BABYLON.Color3.FromHexString('#801b25');
      visorMat.emissiveColor = BABYLON.Color3.FromHexString('#ff364b').scale(0.7);
      const visor = BABYLON.MeshBuilder.CreateBox('nameless-visor', { width: 0.42, height: 0.09, depth: 0.06 }, scene);
      visor.parent = boss.visual.root;
      visor.position.set(0, 1.65, 0.38);
      visor.material = visorMat;
      boss.visual.bossVisor = visor;
      return boss;
    };

    const summonNamelessMinions = (raid, boss) => {
      for (let index = 0; index < 5; index += 1) {
        const angle = (Math.PI * 2 * index) / 5 + Math.random() * 0.35;
        const spawn = resolveStaticPlacement(boss.x + Math.cos(angle) * 4.2, boss.z + Math.sin(angle) * 4.2, 1.1);
        const minion = createEnemy({ x: spawn.x, z: spawn.z, route: [{ x: spawn.x, z: spawn.z }] }, index);
        Object.assign(minion, {
          id: `nameless-minion-${Date.now()}-${index}`,
          name: '无名护卫',
          isNamelessMinion: true,
          health: 180,
          maxHealth: 180,
          damage: 18,
          speed: 4.4,
          detectRange: 36,
          preferredRange: 18,
          territoryX: boss.territoryX,
          territoryZ: boss.territoryZ,
          territoryRadius: boss.territoryRadius,
          visualColor: '#673940',
        });
        minion.visual = createEnemyVisual(minion);
        raid.enemies.push(minion);
      }
    };

    const triggerNamelessEnrage = (boss, raid = state.raid) => {
      if (!boss || boss.dead || boss.enraged || boss.health > 1000 || !raid) return;
      boss.enraged = true;
      boss.enrageTimer = 10;
      boss.damage *= 2;
      boss.damageReduction = 1;
      summonNamelessMinions(raid, boss);
      spawnPulse(new BABYLON.Vector3(boss.x, 1.35, boss.z), '#ff4758', 0.22, 0.34);
      notify(L('无名进入狂暴：伤害翻倍，10 秒免伤并召唤 5 名护卫。', 'Nameless enraged: double damage, 10s immunity, and five guards summoned.'), 'danger');
    };

    const clearBossTerritory = (raid, boss) => {
      const removed = (raid.enemies ?? []).filter((enemy) => !enemy.isNamelessBoss && inBossTerritory(boss, enemy.x, enemy.z));
      raid.enemies = (raid.enemies ?? []).filter((enemy) => enemy.isNamelessBoss || !inBossTerritory(boss, enemy.x, enemy.z));
      for (const enemy of removed) disposeVisual(enemy.visual);
    };

    const constrainToBossTerritory = (enemy, boss) => {
      if (!enemy || !boss) return;
      const limit = BOSS_RADIUS - Math.max(1.25, enemy.radius ?? 0.7);
      const offsetX = enemy.x - boss.territoryX;
      const offsetZ = enemy.z - boss.territoryZ;
      const distance = Math.hypot(offsetX, offsetZ);
      if (distance <= limit) return;
      const fallbackAngle = enemy.heading ?? 0;
      const nx = distance > 0.001 ? offsetX / distance : Math.sin(fallbackAngle);
      const nz = distance > 0.001 ? offsetZ / distance : Math.cos(fallbackAngle);
      const angle = Math.atan2(nz, nx);
      let position = null;
      for (const inset of [1, 4, 9, 16, 28]) {
        for (let step = 0; step < 12; step++) {
          const offset = step === 0 ? 0 : (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 0.22;
          const candidateX = boss.territoryX + Math.cos(angle + offset) * (limit - inset);
          const candidateZ = boss.territoryZ + Math.sin(angle + offset) * (limit - inset);
          if (Math.abs(candidateX) > PLAYABLE_HALF - 1 || Math.abs(candidateZ) > PLAYABLE_HALF - 1) continue;
          if (!pointInsideObstaclePadding(candidateX, candidateZ, enemy.radius ?? 0.7)) {
            position = { x: candidateX, z: candidateZ };
            break;
          }
        }
        if (position) break;
      }
      if (!position) return;
      enemy.x = position.x;
      enemy.z = position.z;
      enemy.mobilityAction = null;
      enemy.navPath = [];
      enemy.navRepathTimer = 0;
      enemy.route = [];
      enemy.routeIndex = 0;
    };

    const expelRegularEnemiesFromTerritory = (raid, boss) => {
      for (const enemy of raid.enemies ?? []) {
        if (enemy.dead || enemy.isNamelessBoss || enemy.isNamelessMinion || !inBossTerritory(boss, enemy.x, enemy.z)) continue;
        const offsetX = enemy.x - boss.territoryX;
        const offsetZ = enemy.z - boss.territoryZ;
        const distance = Math.hypot(offsetX, offsetZ);
        const angle = distance > 0.001 ? Math.atan2(offsetZ, offsetX) : Math.random() * Math.PI * 2;
        const safeRadius = BOSS_RADIUS + 2.2 + (enemy.radius ?? 0.7);
        let outside = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidateAngle = angle + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 0.22;
          const candidateX = clamp(boss.territoryX + Math.cos(candidateAngle) * safeRadius, -PLAYABLE_HALF + 2, PLAYABLE_HALF - 2);
          const candidateZ = clamp(boss.territoryZ + Math.sin(candidateAngle) * safeRadius, -PLAYABLE_HALF + 2, PLAYABLE_HALF - 2);
          if (!pointInsideObstaclePadding(candidateX, candidateZ, enemy.radius ?? 0.7)
            && !inBossTerritory(boss, candidateX, candidateZ)) {
            outside = { x: candidateX, z: candidateZ };
            break;
          }
        }
        if (!outside) continue;
        enemy.x = outside.x;
        enemy.z = outside.z;
        enemy.mobilityAction = null;
        enemy.combatState = 'patrol';
        enemy.alertTimer = 0;
        enemy.route = [{ x: enemy.x, z: enemy.z }];
        enemy.routeIndex = 0;
      }
    };

    const bossDropItems = () => {
      const purple = lootCatalog.filter((item) => item.rarity === 'epic');
      const gold = lootCatalog.filter((item) => item.rarity === 'legendary');
      const red = lootCatalog.filter((item) => item.rarity === 'red');
      const roll = Math.random();
      const pool = roll < 0.08 && red.length ? red : roll < 0.32 && gold.length ? gold : purple;
      const count = roll < 0.08 ? 1 : roll < 0.32 ? 2 : 3;
      const fallback = [...purple, ...gold, ...red];
      return Array.from({ length: count }, () => createLootInstance(weightedPick(pool.length ? pool : fallback, (item) => item.spawnWeight)));
    };

    // Raise raid value without turning every container into a guaranteed jackpot.
    const baseGenerateContainerLoot = generateContainerLoot;
    generateContainerLoot = function boostedContainerLoot(spawn) {
      const items = baseGenerateContainerLoot(spawn);
      const extraCount = spawn.tier >= 3 ? 2 : 1;
      const candidates = lootCatalog.filter((item) => item.pools.includes(spawn.pool));
      for (let index = 0; index < extraCount; index += 1) {
        const item = weightedPick(candidates, (candidate) => {
          const rarityBoost = candidate.rarity === 'red' ? 0.8
            : candidate.rarity === 'legendary' ? 1.45
              : candidate.rarity === 'epic' ? 1.7
                : candidate.rarity === 'rare' ? 1.45
                  : candidate.rarity === 'uncommon' ? 1.1 : 0.72;
          return candidate.spawnWeight * rarityTierModifier(candidate.rarity, Math.min(3, spawn.tier + 1)) * rarityBoost;
        });
        if (item) items.push(createLootInstance(item));
      }
      return items;
    };

    const spawnBossLoot = (boss) => {
      if (boss.bossDropAwarded || !state.raid) return;
      boss.bossDropAwarded = true;
      const items = bossDropItems();
      const container = {
        id: `nameless-cache-${Date.now()}`,
        name: L('无名战利品箱', 'Nameless Cache'),
        x: boss.x,
        z: boss.z,
        pool: 'valuable',
        opened: false,
        items,
        visual: createContainerVisual({ id: `nameless-cache-${Date.now()}`, name: 'Nameless Cache', x: boss.x, z: boss.z, pool: 'valuable' }),
        highlight: 0,
      };
      state.raid.containers.push(container);
      notify(L(`无名已被击败，掉落 ${items.length} 件高价值战利品。`, `Nameless defeated. Dropped ${items.length} high-value items.`), 'success');
    };

    const originalDamageEnemy = damageEnemy;
    damageEnemy = function namelessDamageGate(enemy, damage, options = {}) {
      const healthBefore = enemy?.health ?? 0;
      let result;
      if (enemy?.isNamelessBoss && options.utilityKind) {
        if ((enemy.enrageTimer ?? 0) > 0) return;
        // Utility resistance replaces ordinary armor; apply the 50% reduction once.
        const reduction = enemy.damageReduction;
        enemy.damageReduction = 0;
        try { result = originalDamageEnemy(enemy, damage * 0.5, options); }
        finally { enemy.damageReduction = reduction; }
      } else {
        result = originalDamageEnemy(enemy, damage, options);
      }
      if (enemy?.isNamelessBoss && enemy.health < healthBefore) {
        enemy.lastHitTimer = 3;
        enemy.regenTimer = BOSS_REGEN_INTERVAL;
      }
      if (enemy?.isNamelessBoss) triggerNamelessEnrage(enemy);
      return result;
    };

    const originalKillEnemy = killEnemy;
    killEnemy = function namelessLoot(enemy) {
      const result = originalKillEnemy(enemy);
      if (enemy?.isNamelessBoss) spawnBossLoot(enemy);
      return result;
    };

    const killEnemyWithLootBoost = killEnemy;
    killEnemy = function boostedEnemyLoot(enemy) {
      const result = killEnemyWithLootBoost(enemy);
      if (enemy?.dead && !enemy.isNamelessBoss && !enemy.isNamelessMinion) {
        const dropPool = lootCatalog.filter((item) => item.pools.includes('valuable') || item.pools.includes('weapon') || item.pools.includes('tech'));
        enemy.dropPending = Math.random() < 0.72;
        if (enemy.dropPending) {
          enemy.dropItem = createLootInstance(weightedPick(dropPool, (item) => {
            const rarityBoost = item.rarity === 'epic' ? 1.65 : item.rarity === 'rare' ? 1.45 : item.rarity === 'uncommon' ? 1.15 : 0.8;
            return item.spawnWeight * rarityBoost;
          }));
        }
      }
      return result;
    };

    const killEnemyWithCleanNotice = killEnemy;
    killEnemy = function cleanKillNotice(enemy) {
      if (!enemy || enemy.dead) return;
      const player = state.raid?.player;
      const abilityBefore = player?.abilityActiveTimer ?? 0;
      const healthBefore = player?.health ?? 0;
      const originalNotify = notify;
      notify = () => {};
      let result;
      try {
        result = killEnemyWithCleanNotice(enemy);
      } finally {
        notify = originalNotify;
      }
      if (!enemy.dead) return result;
      const abilityGain = Math.max(0, (player?.abilityActiveTimer ?? 0) - abilityBefore);
      const healthGain = Math.max(0, Math.round((player?.health ?? 0) - healthBefore));
      if (abilityGain > 0) {
        originalNotify(L(`过载延长 +${abilityGain.toFixed(1)} 秒${healthGain > 0 ? `，恢复 ${healthGain} 生命。` : '。'}`, `Overdrive extended by +${abilityGain.toFixed(1)}s${healthGain > 0 ? ` and restored ${healthGain} HP.` : '.'}`), 'success');
      }
      if (enemy.isNamelessBoss) {
        originalNotify(L('无名已被击败，高价值战利品已掉落。', 'Nameless defeated. High-value loot has dropped.'), 'success');
      } else {
        originalNotify(L(`已击败 ${getEnemyLabel(enemy)}。`, `Target down: ${getEnemyLabel(enemy)}.`), 'success');
      }
      return result;
    };

    // Native sound voices provide reliable combat feedback across browsers.
    playGunshotAudio = function nativeGunshotAudio(weapon, options = {}) {
      const caliber = weapon?.caliber ?? '';
      const power = weapon?.pellets > 1 ? 0.9 : caliber === '7.62' ? 0.76 : caliber === '9mm' ? 0.56 : 0.66;
      playNativeSfx('gunshot', power * (options.gain ?? 1));
    };
    playImpactAudio = function nativeImpactAudio(position, flavor = 'hard') {
      playNativeSfx('impact', flavor === 'flesh' ? 0.46 : 0.58);
    };
    playDamageAudio = function nativeDamageAudio(amount) {
      playNativeSfx('damage', Math.min(0.72, 0.32 + amount / 90));
    };
    playHitConfirmAudio = function nativeHitConfirmAudio(kill = false) {
      playNativeSfx('impact', kill ? 0.66 : 0.38);
    };
    playReloadAudio = function nativeReloadAudio(weapon, completed = false) {
      playNativeSfx('impact', completed ? 0.44 : 0.28);
    };
    playContainerOpenAudio = function nativeContainerAudio(position) {
      playNativeSfx('impact', 0.5);
    };
    playSwitchAudio = function nativeSwitchAudio(position, completed = false) {
      playNativeSfx('impact', completed ? 0.58 : 0.38);
    };
    playUseActionAudio = function nativeUseActionAudio(position, flavor = 'heal', completed = false) {
      playNativeSfx('damage', completed ? 0.3 : 0.2);
    };
    playExtractionAudio = function nativeExtractionAudio(position) {
      playNativeSfx('explosion', 0.36);
    };
    const damageEnemyWithNativeExplosion = damageEnemy;
    damageEnemy = function nativeExplosionDamage(enemy, damage, options = {}) {
      if (options.utilityKind === 'grenade' && performance.now() - nativeSfx.lastExplosionAt > 220) {
        nativeSfx.lastExplosionAt = performance.now();
        playNativeSfx('explosion', 0.86);
      }
      return damageEnemyWithNativeExplosion(enemy, damage, options);
    };

    const canBossMoveTo = (boss, dirX, dirZ, distance = 6) => {
      const probe = { x: boss.x + dirX * distance, z: boss.z + dirZ * distance };
      resolveObstacleCollisions(probe, boss.radius ?? 0.92);
      return !pointInsideObstaclePadding(probe.x, probe.z, (boss.radius ?? 0.92) * 0.55)
        && inBossTerritory(boss, probe.x, probe.z)
        && distance2D(probe.x, probe.z, boss.x + dirX * distance, boss.z + dirZ * distance) < 0.8;
    };

    const chooseBossEvasion = (boss, primaryX, primaryZ, fallbackX, fallbackZ, distance = 6) => {
      const primary = normalize2D(primaryX, primaryZ);
      const fallback = normalize2D(fallbackX, fallbackZ);
      const candidates = [
        primary,
        normalize2D(primary.x * 0.7 + fallback.x * 0.7, primary.z * 0.7 + fallback.z * 0.7),
        normalize2D(primary.x * 0.7 - fallback.x * 0.7, primary.z * 0.7 - fallback.z * 0.7),
        fallback,
        normalize2D(-primary.x, -primary.z),
      ];
      return candidates.find((candidate) => canBossMoveTo(boss, candidate.x, candidate.z, distance)) ?? primary;
    };

    const forceNamelessDodge = (boss, origin, end) => {
      if (!boss || boss.dead || !state.raid?.player || !inBossTerritory(boss, state.raid.player.x, state.raid.player.z)) return;
      if (boss.mobilityAction || boss.dodgeReaction || boss.flashAction || (boss.recoveryTimer ?? 0) > 0 || (boss.engineerStunTimer ?? 0) > 0) return;
      const vx = end.x - origin.x;
      const vz = end.z - origin.z;
      const length = Math.hypot(vx, vz);
      if (length < 0.001) return;
      const progress = clamp(((boss.x - origin.x) * vx + (boss.z - origin.z) * vz) / (length * length), 0, 1);
      const nearX = origin.x + vx * progress;
      const nearZ = origin.z + vz * progress;
      if (distance2D(boss.x, boss.z, nearX, nearZ) > 8.5) return;
      const side = ((boss.x - nearX) * -vz + (boss.z - nearZ) * vx) >= 0 ? 1 : -1;
      const direction = chooseBossEvasion(boss, -vz / length * side, vx / length * side, vz / length * side, -vx / length * side, 7.2);
      boss.dodgeReaction = { timer: 0.22, direction, side };
    };
    const triggerEvasionWithNameless = triggerEnemyEvasionFromShot;
    triggerEnemyEvasionFromShot = function namelessBulletEvasion(origin, end, hitEnemyId = '') {
      const boss = state.raid?.enemies?.find((enemy) => enemy.isNamelessBoss);
      forceNamelessDodge(boss, origin, end);
      return triggerEvasionWithNameless(origin, end, hitEnemyId);
    };

    const originalMoveSpeed = getPlayerMoveSpeed;
    getPlayerMoveSpeed = function namelessSuppressionSpeed(player, sprinting) {
      const speed = originalMoveSpeed(player, sprinting);
      const slowed = (player?.namelessSuppressionTimer ?? 0) > 0;
      const flashed = (player?.namelessFlashTimer ?? 0) > 0;
      return speed * (slowed ? 0.7 : 1) * (flashed ? 0.72 : 1);
    };

    const originalLookDelta = applyLookDelta;
    applyLookDelta = function namelessSuppressionLook(deltaX, deltaY) {
      const player = state.raid?.player;
      const multiplier = ((player?.namelessSuppressionTimer ?? 0) > 0 ? 0.7 : 1) * ((player?.namelessFlashTimer ?? 0) > 0 ? 0.6 : 1);
      return originalLookDelta(deltaX * multiplier, deltaY * multiplier);
    };

    const syncNamelessBlackout = (player) => {
      let overlay = document.getElementById('namelessBlackout');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'namelessBlackout';
        Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '90', background: '#000', pointerEvents: 'none', opacity: '0', transition: 'opacity 90ms linear' });
        document.body.appendChild(overlay);
      }
      const active = state.mode === 'raid' && (player?.health ?? 0) > 0 && (player?.namelessBlackoutTimer ?? 0) > 0;
      overlay.style.opacity = active ? '1' : '0';
      overlay.style.visibility = active ? 'visible' : 'hidden';
    };

    const finishRaidBeforeBlackoutFix = finishRaid;
    finishRaid = function finishRaidWithoutBlackout(...args) {
      const player = state.raid?.player;
      if (player) {
        player.namelessFlashTimer = 0;
        player.namelessBlackoutTimer = 0;
      }
      syncNamelessBlackout(null);
      const result = finishRaidBeforeBlackoutFix(...args);
      syncNamelessBlackout(null);
      syncNativeMusicTheme('base');
      return result;
    };

    const createNamelessFlashGrenade = () => {
      const mesh = BABYLON.MeshBuilder.CreateCylinder(`nameless-flash-${Math.random().toString(36).slice(2, 7)}`, { height: 0.24, diameter: 0.12, tessellation: 10 }, scene);
      const material = new BABYLON.StandardMaterial(`nameless-flash-mat-${Math.random().toString(36).slice(2, 7)}`, scene);
      material.diffuseColor = BABYLON.Color3.FromHexString('#e8e3d2');
      material.emissiveColor = BABYLON.Color3.FromHexString('#fff7ba').scale(0.65);
      mesh.material = material;
      mesh.isPickable = false;
      return mesh;
    };

    const resolveNamelessFlash = (boss, player) => {
      const action = boss.flashAction;
      if (!action) return;
      disposeVisual(action.mesh);
      boss.flashAction = null;
      boss.recoveryTimer = 0.8;
      spawnPulse(new BABYLON.Vector3(action.targetX, 0.38, action.targetZ), '#fff5b0', 0.18, 0.24);
      spawnImpactBurst(new BABYLON.Vector3(action.targetX, 0.38, action.targetZ), '#fff5b0', 1.1, 'hard');
      if (distance2D(player.x, player.z, action.targetX, action.targetZ) > 4.8) return;
      if (lineOfSightBlocked(action.targetX, action.targetZ, player.x, player.z)) return;
      player.namelessFlashTimer = 3;
      player.namelessBlackoutTimer = 3;
      player.damageFlash = Math.max(player.damageFlash ?? 0, 0.95);
      player.nearHitPulse = Math.max(player.nearHitPulse ?? 0, 1);
      notify(L('闪光弹命中：视觉受阻 3 秒。', 'Flash grenade hit: vision impaired for 3 seconds.'), 'warning');
    };

    const updateBoss = (raid, dt) => {
      const boss = raid.enemies?.find((enemy) => enemy.isNamelessBoss);
      const player = raid.player;
      const raidAudio = ensureRaidAudio();
      if (raidAudio?.raidMusicBus) {
        raidAudio.raidMusicBus.gain.value = 0.001;
      }
      if (!boss || boss.dead || !player) {
        if (player) {
          player.namelessBlackoutTimer = Math.max(0, (player.namelessBlackoutTimer ?? 0) - dt);
          syncNamelessBlackout(player);
        }
        syncNativeMusicTheme('base');
        if (audioState.raidMusicBus) audioState.raidMusicBus.gain.value = 0.001;
        return;
      }
      player.bossCloakTimer = Math.max(0, (player.bossCloakTimer ?? 0) - dt);
      player.namelessFlashTimer = Math.max(0, (player.namelessFlashTimer ?? 0) - dt);
      player.namelessBlackoutTimer = Math.max(0, (player.namelessBlackoutTimer ?? 0) - dt);
      syncNamelessBlackout(player);
      const canRegenerate = boss.health < boss.maxHealth && (boss.lastHitTimer ?? 0) <= 0 && !boss.mobilityAction && !boss.flashAction && (boss.engineerStunTimer ?? 0) <= 0 && lineOfSightBlocked(boss.x, boss.z, player.x, player.z);
      if (canRegenerate) boss.regenTimer -= dt;
      if (boss.regenTimer <= 0) {
        boss.regenTimer += BOSS_REGEN_INTERVAL;
        boss.health = Math.min(boss.maxHealth, boss.health + BOSS_REGEN_AMOUNT);
        spawnPulse(new BABYLON.Vector3(boss.x, 1.2, boss.z), '#e86b76', 0.08, 0.1);
      }
      triggerNamelessEnrage(boss, raid);
      if (boss.enrageTimer > 0) {
        boss.enrageTimer = Math.max(0, boss.enrageTimer - dt);
        if (boss.enrageTimer <= 0) boss.damageReduction = boss.baseDamageReduction ?? 0;
      }
      const playerInside = inBossTerritory(boss, player.x, player.z);
      const distance = distance2D(boss.x, boss.z, player.x, player.z);
      boss.directFireTimer = Math.max(0, (boss.directFireTimer ?? 0) - dt);
      if ((boss.muzzleTimer ?? 0) > 0.05) boss.directFireTimer = Math.max(boss.directFireTimer, 0.42);
      if (
        playerInside && distance <= (boss.longFireRange ?? 40) &&
        boss.directFireTimer <= 0 && !boss.flashAction && !boss.dodgeReaction &&
        (boss.engineerStunTimer ?? 0) <= 0 &&
        boss.mobilityAction?.type !== 'roll' &&
        !lineOfSightBlocked(boss.x, boss.z, player.x, player.z)
      ) {
        enemyShoot(boss, { accuracyMult: 0.86, maxHitChance: 0.82 });
        boss.directFireTimer = 0.95;
        boss.shootCooldown = Math.max(boss.shootCooldown ?? 0, 0.7);
      }
      if (playerInside) {
        player.namelessSuppressionTimer = 0.25;
        syncNativeMusicTheme('underground');
      } else {
        syncNativeMusicTheme('base');
      }
      player.namelessSuppressionTimer = Math.max(0, (player.namelessSuppressionTimer ?? 0) - dt);
      boss.recoveryTimer = Math.max(0, (boss.recoveryTimer ?? 0) - dt);
      if ((boss.engineerStunTimer ?? 0) > 0) return;
      if (boss.dodgeReaction) {
        boss.dodgeReaction.timer -= dt;
        if (boss.dodgeReaction.timer <= 0) {
          const reaction = boss.dodgeReaction;
          boss.dodgeReaction = null;
          beginMobilityAction(boss, 'dodge', reaction.direction.x, reaction.direction.z, { duration: 0.34, speed: 14.2, cooldown: 0.8, spinDir: reaction.side });
          boss.recoveryTimer = 0.8;
          boss.evasionTimer = 1.2;
        }
      }
      if (distance <= BOSS_DETECT_RANGE && playerInside) player.namelessSuppressionTimer = 0.25;
      if (
        (player.invisibilityTimer ?? 0) > 0 &&
        (player.bossCloakTimer ?? 0) <= 0 &&
        playerInside &&
        distance <= BOSS_DETECT_RANGE &&
        (boss.bossCloakShotTimer ?? 0) <= 0 &&
        !lineOfSightBlocked(boss.x, boss.z, player.x, player.z)
      ) {
        enemyShoot(boss, { accuracyMult: 0.74, maxHitChance: 0.62 });
        boss.bossCloakShotTimer = boss.fireInterval;
      }
      boss.bossCloakShotTimer = Math.max(0, (boss.bossCloakShotTimer ?? 0) - dt);
      boss.elbowTimer = Math.max(0, boss.elbowTimer - dt);
      if (distance < 2.2 && boss.elbowTimer <= 0 && (boss.recoveryTimer ?? 0) <= 0 && !boss.flashAction && !lineOfSightBlocked(boss.x, boss.z, player.x, player.z)) {
        boss.elbowTimer = 1.5;
        applyDamageToPlayer(55);
        spawnPulse(new BABYLON.Vector3(player.x, 1, player.z), '#ff7e68', 0.08, 0.1);
      }
      boss.lastHitTimer = Math.max(0, (boss.lastHitTimer ?? 0) - dt);
      boss.evasionTimer = Math.max(0, (boss.evasionTimer ?? 0) - dt);
      if (boss.evasionTimer <= 0 && playerInside && !boss.mobilityAction && !boss.dodgeReaction && !boss.flashAction && boss.recoveryTimer <= 0) {
        boss.evasionTimer = 1.3 + Math.random() * 0.7;
        const towardX = (player.x - boss.x) / Math.max(distance, 1);
        const towardZ = (player.z - boss.z) / Math.max(distance, 1);
        const side = Math.random() < 0.5 ? -1 : 1;
        const pressured = (boss.lastHitTimer ?? 0) > 0 || distance < 13;
        const move = pressured
          ? (Math.random() < 0.5 ? 'roll' : Math.random() < 0.82 ? 'slide' : 'dodge')
          : (Math.random() < 0.68 ? 'dodge' : 'jump');
        const direction = chooseBossEvasion(
          boss,
          towardZ * side - towardX * (pressured ? 0.46 : 0.08),
          -towardX * side - towardZ * (pressured ? 0.46 : 0.08),
          -towardX,
          -towardZ,
          pressured ? 6.6 : 4.8,
        );
        const started = beginMobilityAction(boss, move, direction.x, direction.z, {
          duration: move === 'roll' ? 0.4 : move === 'slide' ? 0.46 : move === 'dodge' ? 0.34 : 0.5,
          speed: move === 'roll' ? 15.6 : move === 'slide' ? 14.8 : move === 'dodge' ? 14.2 : 10.2,
          height: move === 'jump' ? 1.05 : 0,
          cooldown: 0.34,
          spinDir: side,
        });
        if (started) boss.recoveryTimer = Math.max(boss.recoveryTimer, 0.68);
      }
      boss.tacticalTimer = Math.max(0, boss.tacticalTimer - dt);
      boss.flashTimer = Math.max(0, boss.flashTimer - dt);
      if (boss.flashAction) {
        const action = boss.flashAction;
        action.timer = Math.max(0, action.timer - dt);
        const elapsed = action.duration - action.timer;
        const progress = clamp((elapsed - 0.45) / (action.duration - 0.45), 0, 1);
        if (elapsed <= 0.45) {
          action.startX = boss.x; action.startZ = boss.z;
        }
        action.mesh.position.x = lerp(action.startX, action.targetX, progress);
        action.mesh.position.z = lerp(action.startZ, action.targetZ, progress);
        action.mesh.position.y = lerp(1.35, 0.16, progress) + Math.sin(progress * Math.PI) * 1.35;
        action.mesh.rotation.x += dt * 15;
        action.mesh.rotation.z += dt * 9;
        if (action.timer <= 0) resolveNamelessFlash(boss, player);
      }
      if (boss.flashTimer <= 0 && !boss.flashAction && !boss.mobilityAction && boss.recoveryTimer <= 0 && playerInside && distance > 5 && distance < 24 && Math.random() < 0.58) {
        boss.flashTimer = 6 + Math.random() * 3;
        const targetLead = Math.min(3.4, distance * 0.14);
        const targetX = clamp(player.x + Math.sin(player.yaw) * targetLead, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1);
        const targetZ = clamp(player.z + Math.cos(player.yaw) * targetLead, -PLAYABLE_HALF + 1, PLAYABLE_HALF - 1);
        const mesh = createNamelessFlashGrenade();
        mesh.position.set(boss.x, 1.35, boss.z);
        boss.flashAction = { mesh, timer: 1.2, duration: 1.2, startX: boss.x, startZ: boss.z, targetX, targetZ };
        playImpactAudio(new BABYLON.Vector3(boss.x, 1.4, boss.z), 'hard');
        notify(L('无名正在准备闪光弹，寻找掩体！', 'Nameless is preparing a flash grenade. Find cover!'), 'warning');
      } else if (boss.flashTimer <= 0) {
        boss.flashTimer = 1.1;
      }
      if (boss.tacticalTimer <= 0 && playerInside && !boss.mobilityAction && !boss.flashAction && !boss.dodgeReaction && boss.recoveryTimer <= 0) {
        boss.tacticalTimer = 2 + Math.random();
        const retreat = boss.health < boss.maxHealth * 0.55 || distance < 9;
        const dirX = (boss.x - player.x) / Math.max(distance, 1);
        const dirZ = (boss.z - player.z) / Math.max(distance, 1);
        const direction = chooseBossEvasion(boss, retreat ? dirX : -dirZ, retreat ? dirZ : dirX, dirX, dirZ, 5.8);
        const started = beginMobilityAction(boss, retreat ? (Math.random() < 0.6 ? 'roll' : 'slide') : (Math.random() < 0.64 ? 'dodge' : 'jump'), direction.x, direction.z, { duration: 0.44, speed: 13.4, cooldown: 0.55 });
        if (started) boss.recoveryTimer = Math.max(boss.recoveryTimer, 0.78);
      }
      const offsetX = boss.x - boss.territoryX;
      const offsetZ = boss.z - boss.territoryZ;
      const territoryDistance = Math.hypot(offsetX, offsetZ);
      if (territoryDistance > BOSS_RADIUS) {
        constrainToBossTerritory(boss, boss);
      }
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function namelessRaidUpdate(dt) {
      const raid = state.raid;
      if (raid && !raid.namelessSpawned) {
        raid.namelessSpawned = true;
        const boss = createNamelessBoss(raid);
        raid.enemies.push(boss);
        clearBossTerritory(raid, boss);
      }
      const bossBeforeUpdate = raid?.enemies?.find((enemy) => enemy.isNamelessBoss);
      if (bossBeforeUpdate && !bossBeforeUpdate.dead) {
        constrainToBossTerritory(bossBeforeUpdate, bossBeforeUpdate);
        for (const guard of raid.enemies) if (guard.isNamelessMinion && !guard.dead) constrainToBossTerritory(guard, bossBeforeUpdate);
        expelRegularEnemiesFromTerritory(raid, bossBeforeUpdate);
      }
      const result = originalUpdateRaid(dt);
      if (state.raid) {
        updateBoss(state.raid, dt);
        const bossAfterUpdate = state.raid.enemies?.find((enemy) => enemy.isNamelessBoss);
        if (bossAfterUpdate && !bossAfterUpdate.dead) {
          constrainToBossTerritory(bossAfterUpdate, bossAfterUpdate);
          for (const guard of state.raid.enemies) if (guard.isNamelessMinion && !guard.dead) constrainToBossTerritory(guard, bossAfterUpdate);
          expelRegularEnemiesFromTerritory(state.raid, bossAfterUpdate);
        }
      }
      return result;
    };
  };
  boot();
})();
