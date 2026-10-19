/**
 * MissionPage - Quests and Exploration Missions for Wildlands
 */
export class MissionPage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
    this.activeCategory = 'all';
  }

  render() {
    const missions = this.data.missions;
    const filtered = missions.filter(m => {
      if (this.activeCategory === 'all') return true;
      return m.type === this.activeCategory;
    });

    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.isClaimed).length;
    const readyToClaimMissions = missions.filter(m => m.progress >= m.target && !m.isClaimed).length;

    return `
      <div class="page-container">
        <!-- HEADER & STATS SUMMARY -->
        <div class="page-header">
          <div>
            <h2 class="page-title">PAPAN MISI & TANTANGAN</h2>
            <p class="page-subtitle">Selesaikan tugas harian, jelajahi landmark lembah pedesaan dan rumah tua, serta klaim XP dan Koin Emas.</p>
          </div>

          <div class="mission-stats-badge">
            <div class="stat-pill">
              <span class="num">${completedMissions}/${totalMissions}</span>
              <span class="lbl">Tuntas</span>
            </div>
            ${readyToClaimMissions > 0 ? `
              <div class="stat-pill highlight">
                <span class="num">${readyToClaimMissions}</span>
                <span class="lbl">Siap Klaim!</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- CATEGORY TABS -->
        <div class="filter-pills">
          <button class="pill-btn ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">Semua Misi</button>
          <button class="pill-btn ${this.activeCategory === 'daily' ? 'active' : ''}" data-cat="daily">Harian</button>
          <button class="pill-btn ${this.activeCategory === 'weekly' ? 'active' : ''}" data-cat="weekly">Mingguan</button>
          <button class="pill-btn ${this.activeCategory === 'exploration' ? 'active' : ''}" data-cat="exploration">Eksplorasi</button>
          <button class="pill-btn ${this.activeCategory === 'social' ? 'active' : ''}" data-cat="social">Sosial</button>
        </div>

        <!-- MISSIONS LIST -->
        <div class="missions-list">
          ${filtered.length > 0 ? filtered.map(m => {
            const isCompleted = m.progress >= m.target;
            const pct = Math.min(100, Math.round((m.progress / m.target) * 100));

            return `
              <div class="mission-card ${m.isClaimed ? 'claimed' : (isCompleted ? 'ready' : '')}">
                <div class="mission-icon-box">
                  ${m.type === 'daily' ? '☀️' : (m.type === 'weekly' ? '📅' : (m.type === 'exploration' ? '🗺️' : '🤝'))}
                </div>

                <div class="mission-info">
                  <div class="mission-top-row">
                    <span class="mission-type-pill ${m.type}">${m.type.toUpperCase()}</span>
                    <span class="mission-category-tag">${m.category}</span>
                    <h3 class="mission-name">${m.name}</h3>
                  </div>

                  <p class="mission-desc">${m.description}</p>

                  <div class="mission-progress-row">
                    <div class="progress-track">
                      <div class="progress-fill ${isCompleted && !m.isClaimed ? 'glow' : ''}" style="width: ${pct}%"></div>
                    </div>
                    <span class="progress-text">${m.progress} / ${m.target} ${m.unit} (${pct}%)</span>
                  </div>
                </div>

                <div class="mission-rewards-action">
                  <div class="mission-reward-box">
                    <span class="rew-label">Hadiah:</span>
                    <span class="rew-xp">+${m.reward.xp} XP</span>
                    <span class="rew-gold">🪙 +${m.reward.gold} Emas</span>
                  </div>

                  <div class="mission-action-wrap">
                    ${m.isClaimed ? `
                      <button class="btn-claimed" disabled>
                        <span>✓ Diklaim</span>
                      </button>
                    ` : (isCompleted ? `
                      <button class="btn-primary btn-claim-mission" data-id="${m.id}">
                        KLAIM HADIAH
                      </button>
                    ` : `
                      <button class="btn-secondary btn-sm" disabled style="opacity: 0.6;">
                        Sedang Berjalan
                      </button>
                    `)}
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty-state">
              <span>📜</span>
              <p>Tidak ada misi dalam kategori ini.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    // Category pills
    const pills = container.querySelectorAll('.pill-btn');
    pills.forEach(p => {
      p.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.getAttribute('data-cat');
        this.mgr.rerenderCurrentTab();
      });
    });

    // Claim mission buttons
    const claimBtns = container.querySelectorAll('.btn-claim-mission');
    claimBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const res = await this.data.claimMission(id);
        if (res.success) {
          this.mgr.showToast(`Hadiah berhasil diklaim: +${res.reward.xp} XP & +${res.reward.gold} Emas!`, 'success');
          this.mgr.rerenderCurrentTab();
        } else {
          this.mgr.showToast(res.error, 'warning');
        }
      });
    });
  }
}
