(() => {
  if (window.__sdrDynamicEventsPatch) return;

  const boot = () => {
    if (typeof state === 'undefined' || typeof updateRaid === 'undefined' || typeof createEnemy === 'undefined') {
      window.setTimeout(boot, 80);
      return;
    }
    window.__sdrDynamicEventsPatch = true;

    const eventLabel = (event) => L(event.nameZh, event.nameEn);
    const eventColor = (type) => type === 'airdrop' ? '#e9b95e' : type === 'cache' ? '#80d8ff' : '#ff7c69';

    const ensureEventPanel = () => {
      let panel = document.getElementById('dynamicEventPanel');
      if (panel) return panel;
      panel = document.createElement('div');
      panel.id = 'dynamicEventPanel';
      Object.assign(panel.style, {
        position: 'static', width: 'min(270px, 100%)', boxSizing: 'border-box',
        padding: '10px 12px', border: '1px solid rgba(157, 203, 219, 0.48)', borderRadius: '6px',
        background: 'rgba(8, 16, 20, 0.82)', color: '#e8f4f5', font: '600 13px/1.4 Segoe UI, sans-serif',
        letterSpacing: '0', pointerEvents: 'none', display: 'none',
      });
      (document.querySelector('#hud .hud-right') ?? document.body).appendChild(panel);
      return panel;
    };

    const updateEventPanel = (raid) => {
      const panel = ensureEventPanel();
      const active = raid?.dynamicEvents?.filter((event) => !event.resolved) ?? [];
      if (!raid || state.mode !== 'raid' || !active.length) {
        panel.style.display = 'none';
        return;
      }
      panel.style.display = 'block';
      panel.innerHTML = active.map((event) => {
        const timer = event.expiresAt == null ? '' : ` <span style="color:#f0c57d">${Math.ceil(Math.max(0, event.expiresAt - raid.dynamicElapsed))}s</span>`;
        return `<div style="display:flex;gap:8px;align-items:center;margin:2px 0"><span style="width:8px;height:8px;border-radius:50%;background:${eventColor(event.type)};box-shadow:0 0 10px ${eventColor(event.type)}"></span><span>${eventLabel(event)}${timer}</span></div>`;
      }).join('');
    };

    const eventLocation = (raid, minDistance = 54) => {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const random = raid.eventRandom ?? Math.random;
        const angle = random() * Math.PI * 2;
        const radius = 62 + random() * Math.max(0, MAP_HALF - 78);
        const candidate = resolveStaticPlacement(Math.cos(angle) * radius, Math.sin(angle) * radius, 2.1);
        const farFromPlayer = distance2D(candidate.x, candidate.z, raid.player.x, raid.player.z) >= minDistance;
        const farFromExit = !(raid.extractions ?? []).some((zone) => distance2D(candidate.x, candidate.z, zone.x, zone.z) < 22);
        const farFromEvents = !(raid.dynamicEvents ?? []).some((event) => !event.resolved && distance2D(candidate.x, candidate.z, event.x, event.z) < 48);
        const boss = raid.enemies?.find((enemy) => enemy.isNamelessBoss && !enemy.dead);
        const outsideBoss = !boss || distance2D(candidate.x, candidate.z, boss.territoryX, boss.territoryZ) > (boss.territoryRadius ?? 68) + 12;
        if (farFromPlayer && farFromExit && farFromEvents && outsideBoss && !pointInsideObstaclePadding(candidate.x, candidate.z, 2.5)) return candidate;
      }
      return null;
    };

    const createEventBeacon = (event) => {
      const root = new BABYLON.TransformNode(`event-beacon-${event.id}`, scene);
      root.position = new BABYLON.Vector3(event.x, 0, event.z);
      const color = BABYLON.Color3.FromHexString(eventColor(event.type));
      const beam = BABYLON.MeshBuilder.CreateCylinder(`event-beam-${event.id}`, { height: 11, diameterTop: 0.16, diameterBottom: 0.75, tessellation: 12 }, scene);
      beam.parent = root;
      beam.position.y = 5.5;
      const material = new BABYLON.StandardMaterial(`event-beam-mat-${event.id}`, scene);
      material.diffuseColor = color;
      material.emissiveColor = color.scale(0.9);
      material.alpha = 0.22;
      beam.material = material;
      const cap = BABYLON.MeshBuilder.CreateSphere(`event-cap-${event.id}`, { diameter: 0.55, segments: 12 }, scene);
      cap.parent = root;
      cap.position.y = 1.4;
      cap.material = material;
      return { root, beam, cap, material };
    };

    const disposeEvent = (event, raid = state.raid) => {
      event.resolved = true;
      event.beacon?.root?.dispose();
      event.container?.visual?.root?.dispose();
      const containerIndex = raid?.containers?.indexOf(event.container) ?? -1;
      if (containerIndex >= 0) raid.containers.splice(containerIndex, 1);
    };

    const eventItems = (pool, count) => {
      const choices = lootCatalog.filter((item) => item.pools.includes(pool));
      return Array.from({ length: count }, () => createLootInstance(weightedPick(choices, (item) => {
        const bonus = item.rarity === 'red' ? 1.25 : item.rarity === 'legendary' ? 1.65 : item.rarity === 'epic' ? 1.85 : item.rarity === 'rare' ? 1.5 : 1;
        return item.spawnWeight * bonus;
      }))).filter(Boolean);
    };

    const spawnAirdrop = (raid) => {
      const point = eventLocation(raid);
      if (!point) return false;
      const event = { id: `event-airdrop-${Date.now()}`, type: 'airdrop', nameZh: '高价值空投', nameEn: 'High-value airdrop', x: point.x, z: point.z, resolved: false };
      const container = {
        id: `event-airdrop-cache-${Date.now()}`, name: event.nameZh, x: point.x, z: point.z, pool: 'valuable', tier: 3, opened: false,
        items: [...eventItems('valuable', 4), ...eventItems('weapon', 2)], highlight: 1,
      };
      container.visual = createContainerVisual(container);
      event.container = container;
      event.beacon = createEventBeacon(event);
      raid.containers.push(container);
      raid.dynamicEvents.push(event);
      notify(L('高价值空投已抵达，地图上已标出金色信标。', 'High-value airdrop inbound. A gold beacon is marked on the map.'), 'warning');
      return true;
    };

    const spawnTimedCache = (raid) => {
      const point = eventLocation(raid, 48);
      if (!point) return false;
      const travelWindow = clamp(distance2D(point.x, point.z, raid.player.x, raid.player.z) / 4 + 45, 75, 150);
      const event = { id: `event-cache-${Date.now()}`, type: 'cache', nameZh: '限时保险箱', nameEn: 'Timed vault', x: point.x, z: point.z, expiresAt: raid.dynamicElapsed + travelWindow, resolved: false };
      const container = {
        id: `event-vault-${Date.now()}`, name: event.nameZh, x: point.x, z: point.z, pool: 'valuable', tier: 3, opened: false,
        items: [...eventItems('valuable', 5), ...eventItems('tech', 2)], highlight: 1,
      };
      container.visual = createContainerVisual(container);
      event.container = container;
      event.beacon = createEventBeacon(event);
      raid.containers.push(container);
      raid.dynamicEvents.push(event);
      notify(L(`限时保险箱开启，${Math.ceil(travelWindow)} 秒后关闭。`, `Timed vault closes in ${Math.ceil(travelWindow)}s.`), 'warning');
      return true;
    };

    const spawnElitePatrol = (raid) => {
      const point = eventLocation(raid, 58);
      if (!point) return false;
      const event = { id: `event-patrol-${Date.now()}`, type: 'patrol', nameZh: '精英巡逻', nameEn: 'Elite patrol', x: point.x, z: point.z, resolved: false };
      const types = [0, 1, 2];
      types.forEach((type, index) => {
        const angle = (Math.PI * 2 * index) / types.length;
        const spawn = resolveStaticPlacement(point.x + Math.cos(angle) * 3.4, point.z + Math.sin(angle) * 3.4, 1.2);
        const enemy = createEnemy({ x: spawn.x, z: spawn.z, route: [{ x: point.x, z: point.z }] }, 900 + type);
        enemy.type = ['scout', 'hunter', 'bruiser'][type];
        enemy.name = L('精英 ' + getEnemyLabel(enemy), 'Elite ' + getEnemyLabel(enemy));
        enemy.health = Math.round(enemy.health * 1.32);
        enemy.maxHealth = enemy.health;
        enemy.damage = Math.round(enemy.damage * 1.2);
        enemy.speed *= 1.1;
        enemy.isEventElite = true;
        enemy.eventId = event.id;
        enemy.route = [{ x: point.x, z: point.z }];
        enemy.routeIndex = 0;
        enemy.visual = createEnemyVisual(enemy);
        raid.enemies.push(enemy);
      });
      event.beacon = createEventBeacon(event);
      raid.dynamicEvents.push(event);
      notify(L('精英巡逻进入区域，红色信标已标出。', 'Elite patrol entered the area. A red beacon is marked.'), 'danger');
      return true;
    };

    const spawnEvent = (raid, type) => {
      if (type === 'airdrop') return spawnAirdrop(raid);
      if (type === 'cache') return spawnTimedCache(raid);
      return spawnElitePatrol(raid);
    };

    const updateEvents = (raid, dt) => {
      if (!raid?.player || raid.isTrainingRange || state.mode !== 'raid' || raid.extractionSequence || state.overlay === 'map') return;
      if (!Array.isArray(raid.eventSchedule)) {
        raid.dynamicEvents ??= [];
        raid.dynamicElapsed = 0;
        raid.eventSeed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
        raid.eventRandom = window.SDRCombat.seededRandom(raid.eventSeed);
        raid.eventSchedule = window.SDRCombat.eventSchedule(raid.eventRandom, (raid.bagWeight ?? 0) / 18);
        raid.nextEventIndex = 0;
      }
      raid.dynamicElapsed += dt;
      const nextEvent = raid.eventSchedule[raid.nextEventIndex];
      if (nextEvent && raid.dynamicElapsed >= nextEvent.at) {
        if (spawnEvent(raid, nextEvent.type)) raid.nextEventIndex++;
        else nextEvent.at += 15;
      }
      for (const event of raid.dynamicEvents) {
        if (event.resolved) continue;
        if (event.container?.opened && !event.container.items.length) {
          disposeEvent(event, raid);
          continue;
        }
        if (event.expiresAt != null && raid.dynamicElapsed >= event.expiresAt) {
          disposeEvent(event, raid);
          notify(L('限时保险箱已关闭。', 'Timed vault has closed.'), 'warning');
        }
        if (event.type === 'patrol') {
          const active = raid.enemies.some((enemy) => enemy.eventId === event.id && !enemy.dead && !enemy.despawned);
          if (!active) disposeEvent(event, raid);
        }
        if (event.beacon?.root) {
          event.beacon.root.rotation.y += dt * 0.55;
          event.beacon.beam.scaling.y = 0.9 + Math.sin(performance.now() * 0.004) * 0.08;
        }
      }
      updateEventPanel(raid);
    };

    const drawEventMapMarkers = (ctx, size) => {
      const raid = state.raid;
      if (!raid?.dynamicEvents) return;
      const pad = 18;
      for (const event of raid.dynamicEvents) {
        if (event.resolved) continue;
        const point = worldToMap(event.x, event.z, size, pad);
        ctx.save();
        ctx.fillStyle = eventColor(event.type);
        ctx.strokeStyle = '#f6fbfb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function dynamicEventRaidUpdate(dt) {
      const result = originalUpdateRaid(dt);
      if (state.raid) updateEvents(state.raid, dt);
      else updateEventPanel(null);
      return result;
    };

    const originalDrawMinimap = drawMinimap;
    drawMinimap = function dynamicEventMinimap() {
      originalDrawMinimap();
      drawEventMapMarkers(refs.minimapCanvas.getContext('2d'), refs.minimapCanvas.width);
    };

    const originalDrawFullMap = drawFullMap;
    drawFullMap = function dynamicEventFullMap() {
      originalDrawFullMap();
      drawEventMapMarkers(refs.mapCanvas.getContext('2d'), refs.mapCanvas.width);
    };
  };
  boot();
})();
