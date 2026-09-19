(() => {
  if (window.__sdrFunLoopPatch) return;

  const boot = () => {
    if (
      typeof state === 'undefined' ||
      typeof refs === 'undefined' ||
      typeof startRaid === 'undefined' ||
      typeof updateRaid === 'undefined' ||
      typeof finishRaid === 'undefined' ||
      typeof openLootPanel === 'undefined' ||
      typeof renderBasePanel === 'undefined' ||
      typeof L === 'undefined' ||
      typeof notify === 'undefined'
    ) {
      window.setTimeout(boot, 80);
      return;
    }

    window.__sdrFunLoopPatch = true;

    const BOUNTIES = {
      scavenge: {
        nameZh: '搜刮行动', nameEn: 'Scavenger Run',
        detailZh: '搜索 4 个物资箱', detailEn: 'Search 4 loot caches',
        target: 4, reward: 8000, kind: 'search',
      },
      hunter: {
        nameZh: '猎杀行动', nameEn: 'Hunter Run',
        detailZh: '击倒 6 名敌人', detailEn: 'Eliminate 6 hostiles',
        target: 6, reward: 10000, kind: 'kill',
      },
      haul: {
        nameZh: '高价值撤离', nameEn: 'High-Value Extract',
        detailZh: '带出价值 ¥12,000 的物资', detailEn: 'Extract with ¥12,000 of loot',
        target: 12000, reward: 15000, kind: 'haul',
      },
    };

    const getBounty = () => BOUNTIES[state.save?.funBountyId] ?? BOUNTIES.scavenge;
    const getBountyLabel = (def) => L(def.nameZh, def.nameEn);
    const getBountyDetail = (def) => L(def.detailZh, def.detailEn);
    const formatBountyProgress = (raid, def) => {
      const value = def.kind === 'search'
        ? Math.min(def.target, raid.funSearchCount ?? 0)
        : def.kind === 'kill'
          ? Math.min(def.target, raid.killCount ?? 0)
          : Math.min(def.target, Math.round(raid.bagValue ?? 0));
      return { value, text: def.kind === 'haul' ? `¥${value.toLocaleString()}` : `${value}/${def.target}` };
    };

    const ensureBountyPanel = () => {
      let panel = document.getElementById('funBountyPanel');
      if (panel) return panel;
      panel = document.createElement('section');
      panel.id = 'funBountyPanel';
      panel.className = 'base-section fun-bounty-base-panel';
      panel.innerHTML = `
        <div class="section-head">
          <h2>${L('本局悬赏', 'Raid Bounty')}</h2>
          <span class="section-note">${L('每局选择一个额外目标，完成后撤离可领取奖金', 'Choose one optional goal; extract to claim the bonus')}</span>
        </div>
        <div class="fun-bounty-options">
          ${Object.entries(BOUNTIES).map(([id, def]) => `
            <button class="ghost-button small" type="button" data-fun-bounty="${id}">
              <span>${getBountyLabel(def)}</span>
              <small>${getBountyDetail(def)} · ${L('奖金', 'Bonus')} ¥${def.reward.toLocaleString()}</small>
            </button>
          `).join('')}
        </div>
      `;
      const lobby = document.getElementById('lobbyPanel');
      if (lobby) lobby.insertAdjacentElement('afterend', panel);
      return panel;
    };

    const renderBountyBasePanel = () => {
      const panel = ensureBountyPanel();
      const selected = state.save?.funBountyId ?? 'scavenge';
      panel.querySelectorAll('[data-fun-bounty]').forEach((button) => {
        const active = button.dataset.funBounty === selected;
        button.classList.toggle('primary-button', active);
        button.classList.toggle('ghost-button', !active);
        button.setAttribute('aria-pressed', String(active));
      });
    };

    const ensureHudBounty = () => {
      if (!refs.hud || document.getElementById('raidBountyPanel')) return document.getElementById('raidBountyPanel');
      const panel = document.createElement('div');
      panel.id = 'raidBountyPanel';
      panel.className = 'raid-bounty-panel';
      refs.hud.querySelector('.hud-left')?.appendChild(panel);
      return panel;
    };

    const renderHudBounty = (raid) => {
      const panel = ensureHudBounty();
      if (!panel || !raid?.bounty) {
        if (panel) panel.hidden = true;
        return;
      }
      const def = raid.bounty;
      const progress = formatBountyProgress(raid, def);
      const complete = raid.bountyCompleted;
      panel.hidden = false;
      const key = `${def.kind}|${progress.value}|${complete}|${state.settings?.language ?? state.save?.language ?? ''}`;
      if (panel.dataset.key === key) return;
      panel.dataset.key = key;
      panel.innerHTML = `
        <div class="raid-bounty-kicker">${L('悬赏目标', 'BOUNTY')}</div>
        <strong>${getBountyLabel(def)}</strong>
        <span>${complete ? L('已完成 · 撤离后领取', 'Complete · extract to claim') : `${getBountyDetail(def)} · ${progress.text}`}</span>
        <em>+¥${def.reward.toLocaleString()}</em>
      `;
      panel.classList.toggle('is-complete', complete);
    };

    const updateBounty = (raid) => {
      if (!raid?.bounty) return;
      const def = raid.bounty;
      const progress = formatBountyProgress(raid, def);
      if (progress.value !== raid.bountyProgress) {
        raid.bountyProgress = progress.value;
        renderHudBounty(raid);
      }
      if (!raid.bountyCompleted && progress.value >= def.target) {
        raid.bountyCompleted = true;
        notify(L(`悬赏完成：${getBountyLabel(def)}。成功撤离可领取 ¥${def.reward.toLocaleString()}。`, `Bounty complete: ${getBountyLabel(def)}. Extract to claim ¥${def.reward.toLocaleString()}.`), 'success');
      }
      if (raid.bountyProgress === progress.value || raid.bountyCompleted) renderHudBounty(raid);
    };

    const initializeBounty = (raid) => {
      if (!raid || raid.isTrainingRange || raid.bounty) return;
      const def = getBounty();
      raid.bounty = { ...def };
      raid.funSearchCount = 0;
      raid.bountyProgress = 0;
      raid.bountyCompleted = false;
      raid.bountyRewardClaimed = false;
      renderHudBounty(raid);
    };

    const originalRenderBasePanel = renderBasePanel;
    renderBasePanel = function funLoopRenderBasePanel() {
      const result = originalRenderBasePanel();
      renderBountyBasePanel();
      return result;
    };

    const originalStartRaid = startRaid;
    startRaid = function funLoopStartRaid() {
      const result = originalStartRaid();
      initializeBounty(state.raid);
      return result;
    };

    const originalOpenLootPanel = openLootPanel;
    openLootPanel = function funLoopOpenLootPanel(container) {
      const wasOpened = Boolean(container?.opened);
      const result = originalOpenLootPanel(container);
      const raid = state.raid;
      if (raid && container && !wasOpened && !container.id.startsWith('drop-')) {
        raid.funSearchCount = (raid.funSearchCount ?? 0) + 1;
        updateBounty(raid);
      }
      return result;
    };

    const originalUpdateRaid = updateRaid;
    updateRaid = function funLoopUpdateRaid(dt) {
      const result = originalUpdateRaid(dt);
      if (state.raid) updateBounty(state.raid);
      return result;
    };

    const originalFinishRaid = finishRaid;
    finishRaid = function funLoopFinishRaid(success, reason, extracted) {
      const raid = state.raid;
      if (success && extracted && raid?.bountyCompleted && !raid.bountyRewardClaimed) {
        state.save.money += raid.bounty.reward;
        raid.bountyRewardClaimed = true;
        if (typeof persistSave === 'function') persistSave();
        notify(L(`悬赏奖金已到账：¥${raid.bounty.reward.toLocaleString()}。`, `Bounty bonus received: ¥${raid.bounty.reward.toLocaleString()}.`), 'success');
      }
      return originalFinishRaid(success, reason, extracted);
    };

    refs.basePanel?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-fun-bounty]');
      if (!button || state.mode !== 'base') return;
      state.save.funBountyId = BOUNTIES[button.dataset.funBounty] ? button.dataset.funBounty : 'scavenge';
      if (typeof persistSave === 'function') persistSave();
      renderBountyBasePanel();
      notify(L(`已选择悬赏：${getBountyLabel(getBounty())}。`, `Bounty selected: ${getBountyLabel(getBounty())}.`), 'success');
    });

    refs.deployButton?.addEventListener('click', () => {
      window.setTimeout(() => initializeBounty(state.raid), 0);
    });
    window.setInterval(() => {
      if (state.raid) {
        initializeBounty(state.raid);
        updateBounty(state.raid);
      }
    }, 250);

    if (window.SDRCombat?.eventSchedule && !window.__sdrFunLoopSchedulePatched) {
      window.__sdrFunLoopSchedulePatched = true;
      const originalEventSchedule = window.SDRCombat.eventSchedule;
      window.SDRCombat.eventSchedule = (random, loadRatio = 0) => {
        const rng = typeof random === 'function' ? random : Math.random;
        const schedule = originalEventSchedule(rng, loadRatio);
        if (schedule?.length) {
          schedule[0].at = 18 + rng() * 10;
          if (schedule[1]) schedule[1].at = schedule[0].at + 44 + rng() * 18;
          if (schedule[2]) schedule[2].at = schedule[1].at + 48 + rng() * 22;
        }
        return schedule;
      };
    }

    const style = document.createElement('style');
    style.textContent = `
      .fun-bounty-base-panel { border-color: rgba(239, 177, 95, .42); }
      .fun-bounty-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .fun-bounty-options button { min-height: 66px; text-align: left; display: flex; flex-direction: column; gap: 4px; }
      .fun-bounty-options small { color: rgba(231, 244, 244, .72); font-size: 12px; line-height: 1.3; }
      .raid-bounty-panel { width: min(420px, 100%); box-sizing: border-box; padding: 10px 13px; border: 1px solid rgba(239, 177, 95, .5); border-radius: 6px; background: rgba(13, 21, 24, .88); display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 9px; color: #f6faf9; }
      .raid-bounty-panel[hidden] { display: none; }
      .raid-bounty-panel strong { font-size: 15px; }
      .raid-bounty-panel span { flex: 1 1 100%; color: rgba(231, 244, 244, .76); font-size: 12px; }
      .raid-bounty-panel em { color: #f0c57d; font-size: 13px; font-style: normal; }
      .raid-bounty-kicker { color: #f0c57d; font-size: 11px; letter-spacing: .08em; font-weight: 700; }
      .raid-bounty-panel.is-complete { border-color: rgba(115, 218, 157, .78); box-shadow: 0 0 18px rgba(115, 218, 157, .12); }
      @media (max-width: 900px) { .fun-bounty-options { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
    renderBasePanel();
  };

  boot();
})();
