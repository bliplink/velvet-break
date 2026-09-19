(() => {
  function ensureHallRefs() {
    if (typeof refs === 'undefined') {
      return false;
    }
    refs.hallBoardTitle ??= document.getElementById('hallBoardTitle');
    refs.hallBoardNote ??= document.getElementById('hallBoardNote');
    refs.hallBoard ??= document.getElementById('hallBoard');
    refs.lobbyTitle ??= document.getElementById('lobbyTitle');
    refs.lobbyNote ??= document.getElementById('lobbyNote');
    refs.lobbyPanel ??= document.getElementById('lobbyPanel');
    return true;
  }

  function getSurvivalRateText() {
    const raids = state.save?.stats?.raids ?? 0;
    const survived = state.save?.stats?.survived ?? 0;
    if (!raids) {
      return '--';
    }
    return `${Math.round((survived / raids) * 100)}%`;
  }

  function getRareLootCount() {
    return (state.save?.stash ?? []).filter((item) => item.rarity === 'legendary' || item.rarity === 'red').length;
  }

  function getModeRuleText(modeDef) {
    if (modeDef?.id === 'contract') {
      return L(
        '单撤离点，完成清剿目标后开放，并在成功撤离时结算合约奖金。',
        'Single extraction. It opens after the purge objectives and pays a contract bonus on success.',
      );
    }
    return L(
      '普通撤离点开局开放，拉闸撤离仍需先前往拉闸点启动。',
      'Standard extraction opens at the start, while the lever exit still needs activation first.',
    );
  }

  function getDeploymentTip(modeDef, operatorId) {
    if (modeDef?.id === 'contract' && operatorId === 'recon') {
      return L(
        '侦察兵更适合先扫清一块安全扇区，再沿边线点掉猎手。',
        'Recon works best by securing one sector first, then removing hunters from the edge.',
      );
    }
    if (modeDef?.id === 'contract' && operatorId === 'assault') {
      return L(
        '突击兵适合中近距离连续清敌，但最好把过载留给猎手或重装单位。',
        'Assault is strong for chained close engagements. Save overdrive for hunters or bruisers.',
      );
    }
    if (modeDef?.id === 'contract') {
      return L(
        '医疗兵更稳，先清目标再去撤离，不要在满包前过早贴近唯一撤离点。',
        'Medic is steadier here. Clear the contract first, then rotate to the only extraction.',
      );
    }
    if (operatorId === 'recon') {
      return L(
        '侦察兵适合先判明局部敌情再决定搜点路线，技能结束前别贪深处。',
        'Recon should read one sector first, then choose loot routes before the scan ends.',
      );
    }
    if (operatorId === 'assault') {
      return L(
        '突击兵适合主动争夺高价值搜索区，但最好保留一个撤离方向作为退路。',
        'Assault can contest high-value zones, but keep one extraction lane as an exit path.',
      );
    }
    return L(
      '医疗兵更适合稳步推进，优先做中线搜索，再根据局势决定普通撤离还是拉闸撤离。',
      'Medic suits a steadier route: loot the midline first, then decide between standard or lever extraction.',
    );
  }

  function renderHallBoard() {
    if (!ensureHallRefs() || !refs.hallBoard) {
      return;
    }
    const modeDef = getLobbyModeDef();
    const operatorId = getSelectedOperatorId();
    const weaponId = getSelectedWeaponId();
    const ammoId = getSelectedAmmoIdForWeapon(weaponId);
    const stats = state.save?.stats ?? {};
    const funds = state.save?.money ?? 0;
    const stash = state.save?.stash ?? [];

    refs.hallBoardTitle.textContent = L('大厅简报', 'Lobby Brief');
    refs.hallBoardNote.textContent = L(
      '出击前情报、装备与仓库概况。',
      'Pre-deployment intel, equipment, and stash.',
    );

    refs.hallBoard.innerHTML = [
      `
        <article class="stash-row brief-card">
          <div>
            <div class="item-title">${L('行动概览', 'Operation Snapshot')}</div>
            <div class="item-meta brief-note">${L(modeDef.nameZh, modeDef.nameEn)} · ${getOperatorName(operatorId)} · ${getWeaponLabel(weaponId)}</div>
          </div>
          <div class="brief-actions">
            <span class="mode-pill">${L(`${Math.round(modeDef.duration / 60)} 分钟`, `${Math.round(modeDef.duration / 60)} min`)}</span>
            <span class="mode-pill ${modeDef.bonusReward > 0 ? 'is-hot' : ''}">${modeDef.bonusReward > 0 ? formatMoney(modeDef.bonusReward) : L('常规收益', 'Standard payout')}</span>
          </div>
          <div class="item-meta brief-note">${L(modeDef.summaryZh, modeDef.summaryEn)}</div>
        </article>
      `,
      `
        <article class="stash-row brief-card">
          <div class="item-title">${L('资源状态', 'Resource Status')}</div>
          <div class="brief-grid">
            <div class="brief-metric">
              <span>${L('资金', 'Funds')}</span>
              <strong>${formatMoney(funds)}</strong>
            </div>
            <div class="brief-metric">
              <span>${L('仓库总数', 'Stash Total')}</span>
              <strong>${formatItemCount(stash.length)}</strong>
            </div>
            <div class="brief-metric">
              <span>${L('高价值藏品', 'Rare Cache')}</span>
              <strong>${formatItemCount(getRareLootCount())}</strong>
            </div>
            <div class="brief-metric">
              <span>${L('当前主弹', 'Active Ammo')}</span>
              <strong>${getAmmoTierLabel(ammoId)}</strong>
            </div>
          </div>
        </article>
      `,
      `
        <article class="stash-row brief-card">
          <div class="item-title">${L('战绩概览', 'Combat Record')}</div>
          <div class="brief-grid">
            <div class="brief-metric">
              <span>${L('总局数', 'Raids')}</span>
              <strong>${stats.raids ?? 0}</strong>
            </div>
            <div class="brief-metric">
              <span>${L('撤离率', 'Survival')}</span>
              <strong>${getSurvivalRateText()}</strong>
            </div>
            <div class="brief-metric">
              <span>${L('总击倒', 'Kills')}</span>
              <strong>${stats.kills ?? 0}</strong>
            </div>
            <div class="brief-metric">
              <span>${L('最高带出', 'Best Haul')}</span>
              <strong>${formatMoney(stats.bestHaul ?? 0)}</strong>
            </div>
          </div>
        </article>
      `,
      `
        <article class="stash-row brief-card">
          <div class="item-title">${L('本次重点', 'Current Focus')}</div>
          <div class="item-meta brief-note">${getModeRuleText(modeDef)}</div>
          <div class="item-meta brief-note">${getDeploymentTip(modeDef, operatorId)}</div>
        </article>
      `,
    ].join('');
  }

  const originalRenderLobbyPanel = renderLobbyPanel;
  renderLobbyPanel = function patchedRenderLobbyPanel() {
    const selectedModeId = getSelectedLobbyModeId();
    return Object.values(getLobbyModeDefs())
      .map((mode) => {
        const active = mode.id === selectedModeId;
        const durationLabel = L(`${Math.round(mode.duration / 60)} 分钟`, `${Math.round(mode.duration / 60)} min`);
        const payoutLabel = mode.bonusReward > 0
          ? formatMoney(mode.bonusReward)
          : L('常规收益', 'Standard payout');
        const objectiveLabel = mode.id === 'contract'
          ? L('目标清剿', 'Objective Clear')
          : L('自由搜撤', 'Open Raid');
        return `
          <article class="prep-row lobby-card ${active ? 'is-active' : ''}">
            <div class="lobby-copy">
              <div class="item-title">${L(mode.nameZh, mode.nameEn)}</div>
              <div class="item-meta">${L(mode.summaryZh, mode.summaryEn)}</div>
              <div class="brief-actions">
                <span class="mode-pill">${objectiveLabel}</span>
                <span class="mode-pill">${durationLabel}</span>
                <span class="mode-pill ${mode.bonusReward > 0 ? 'is-hot' : ''}">${payoutLabel}</span>
              </div>
              <div class="item-meta brief-note">${L(mode.detailZh, mode.detailEn)}</div>
            </div>
            <div class="stack-list">
              <button class="${active ? 'primary-button' : 'ghost-button'} small" type="button" data-mode-id="${mode.id}">
                ${active ? L('当前模式', 'Active') : L('切换', 'Select')}
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  };
  renderLobbyPanel.__original = originalRenderLobbyPanel;

  const originalApplyStaticLanguage = applyStaticLanguage;
  applyStaticLanguage = function patchedApplyStaticLanguage() {
    originalApplyStaticLanguage();
    ensureHallRefs();
    const eyebrow = document.querySelector('#basePanel .eyebrow');
    if (eyebrow) eyebrow.textContent = L('战术行动', 'Tactical Operation');
    if (refs.lobbyTitle) {
      refs.lobbyTitle.textContent = L('大厅', 'Lobby');
    }
    if (refs.lobbyNote) {
      refs.lobbyNote.textContent = L(
        '确认行动模式与撤离规则。',
        'Confirm the operation mode and extraction rules.',
      );
    }
    if (refs.hallBoardTitle) {
      refs.hallBoardTitle.textContent = L('大厅简报', 'Lobby Brief');
    }
    if (refs.hallBoardNote) {
      refs.hallBoardNote.textContent = L(
        '出击前情报、装备与仓库概况。',
        'Pre-deployment intel, equipment, and stash.',
      );
    }
  };

  const originalRenderBasePanel = renderBasePanel;
  renderBasePanel = function patchedRenderBasePanel() {
    originalRenderBasePanel();
    renderHallBoard();
  };

  if (ensureHallRefs()) {
    applyStaticLanguage();
    renderBasePanel();
  }
})();
