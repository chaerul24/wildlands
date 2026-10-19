/**
 * LobbyView - Home / Beranda Dashboard for Wildlands
 */
export class LobbyView {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
  }

  render() {
    const profile = this.data.profile;
    const activeEvents = this.data.events.filter(e => e.computedStatus === 'active' || !e.computedStatus);
    const featuredEvent = activeEvents[0] || this.data.events[0];
    const dailyMissions = this.data.missions.filter(m => m.type === 'daily').slice(0, 3);
    const featuredNews = this.data.news.find(n => n.featured) || this.data.news[0];
    const onlineFriends = this.data.friends.filter(f => f.isFriend && (f.status === 'online' || f.status === 'in_game'));

    const xpPct = Math.min(100, Math.round((profile.xp / profile.xpNext) * 100));

    return `
      <div class="lobby-dashboard">
        <!-- TOP WELCOME & HERO BANNER -->
        <div class="dashboard-hero">
          <div class="hero-left">
            <div class="hero-badge">OPEN WORLD MULTIPLAYER 3D</div>
            <h1 class="hero-title">DUNIA WILDLANDS MENANTI</h1>
            <p class="hero-desc">
              Jelajahi lembah permukiman pedesaan, temui 10 warga desa dengan ragam aktivitas, telusuri rumah tua tersembunyi, dan ukir petualangan bersama pemain lain.
            </p>

            <div class="hero-actions">
              <button id="btn-lobby-play" class="btn-play-hero">
                <span class="btn-play-icon">⚔️</span>
                <div class="btn-play-text">
                  <span class="title">MASUK DUNIA</span>
                  <span class="sub">Klik untuk Mulai Eksplorasi [ENTER]</span>
                </div>
              </button>

              <button id="btn-hero-fullscreen" class="btn-glass-icon" title="Toggle Fullscreen">
                ⛶
              </button>
            </div>
          </div>

          <div class="hero-right">
            <!-- PLAYER SHOWCASE CARD -->
            <div class="player-hero-card">
              <div class="hero-avatar-wrap">
                <div class="avatar-ring">
                  <span class="avatar-icon">🤠</span>
                </div>
                <div class="hero-level-badge">LV. ${profile.level}</div>
              </div>

              <div class="hero-player-info">
                <div class="hero-player-name">${profile.username}</div>
                <div class="hero-player-id">${profile.id} • <span class="badge-online">ONLINE</span></div>
              </div>

              <div class="hero-xp-bar-wrap">
                <div class="xp-labels">
                  <span>EXP</span>
                  <span>${profile.xp} / ${profile.xpNext} XP (${xpPct}%)</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width: ${xpPct}%"></div>
                </div>
              </div>

              <div class="hero-currency-row">
                <div class="currency-item">
                  <span class="cur-icon">🪙</span>
                  <span class="cur-val">${profile.gold} Emas</span>
                </div>
                <div class="currency-item">
                  <span class="cur-icon">👣</span>
                  <span class="cur-val">${profile.stats.distanceTraveled}m Terjelajah</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3-COLUMN SUMMARY GRID -->
        <div class="dashboard-grid">
          <!-- 1. EVENT HIGHLIGHT -->
          <div class="dash-card">
            <div class="dash-card-header">
              <div class="dash-card-title">
                <span>🎪</span>
                <h3>EVENT AKTIF</h3>
              </div>
              <button class="dash-link-btn" data-tab="events">Lihat Semua →</button>
            </div>

            ${featuredEvent ? `
              <div class="event-summary-box">
                <div class="event-summary-badge">${featuredEvent.badge || 'EVENT UTAMA'}</div>
                <h4 class="event-summary-title">${featuredEvent.title}</h4>
                <p class="event-summary-desc">${featuredEvent.description}</p>
                <div class="event-summary-footer">
                  <span class="reward-pill">🎁 ${featuredEvent.rewards?.title || '500 XP'}</span>
                  <button class="btn-sm-primary" data-event-id="${featuredEvent.id}">Detail Event</button>
                </div>
              </div>
            ` : `<div class="dash-empty">Tidak ada event aktif saat ini.</div>`}
          </div>

          <!-- 2. DAILY MISSIONS -->
          <div class="dash-card">
            <div class="dash-card-header">
              <div class="dash-card-title">
                <span>📜</span>
                <h3>MISI HARIAN</h3>
              </div>
              <button class="dash-link-btn" data-tab="missions">Buka Misi →</button>
            </div>

            <div class="missions-summary-list">
              ${dailyMissions.map(m => {
                const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                const readyToClaim = m.progress >= m.target && !m.isClaimed;
                return `
                  <div class="mini-mission-item">
                    <div class="mini-m-top">
                      <span class="mini-m-name">${m.name}</span>
                      <span class="mini-m-reward">+${m.reward.xp} XP</span>
                    </div>
                    <div class="mini-m-bar">
                      <div class="progress-track sm">
                        <div class="progress-fill ${readyToClaim ? 'glow' : ''}" style="width: ${pct}%"></div>
                      </div>
                      <span class="mini-m-count">${m.progress}/${m.target}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 3. ONLINE FRIENDS & SERVER PING -->
          <div class="dash-card">
            <div class="dash-card-header">
              <div class="dash-card-title">
                <span>👥</span>
                <h3>TEMAN & SERVER</h3>
              </div>
              <button class="dash-link-btn" data-tab="friends">Daftar Teman →</button>
            </div>

            <div class="server-status-box">
              <div class="srv-indicator">
                <div class="srv-dot online"></div>
                <span>Server Asia (Jakarta 20Hz)</span>
              </div>
              <span class="srv-ping">32 ms</span>
            </div>

            <div class="mini-friends-list">
              <div class="friends-sub-title">TEMAN AKTIF (${onlineFriends.length})</div>
              ${onlineFriends.length > 0 ? onlineFriends.map(f => `
                <div class="mini-friend-item">
                  <div class="friend-avatar-sm">👤</div>
                  <div class="friend-info-sm">
                    <div class="friend-name-sm">${f.username}</div>
                    <div class="friend-status-sm">${f.statusText}</div>
                  </div>
                </div>
              `).join('') : `
                <div class="dash-empty-sm">Belum ada teman online. Gunakan menu Teman untuk menambahkan petualang lain!</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    const btnPlay = container.querySelector('#btn-lobby-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.mgr.enterWorld();
      });
    }

    const btnFs = container.querySelector('#btn-hero-fullscreen');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        this.mgr.toggleFullscreen();
      });
    }

    // Detail Event shortcut
    const eventBtns = container.querySelectorAll('[data-event-id]');
    eventBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-event-id');
        this.mgr.switchTab('events', { openEventId: id });
      });
    });

    // Tab navigation buttons inside cards
    const linkBtns = container.querySelectorAll('[data-tab]');
    linkBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.mgr.switchTab(tab);
      });
    });
  }
}
