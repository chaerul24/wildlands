/**
 * ProfilePage - Player Profile, Statistics, Achievements & Customization
 */
export class ProfilePage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
    this.isEditing = false;
  }

  render() {
    const p = this.data.profile;
    const achievements = this.data.achievements;
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const xpPct = Math.min(100, Math.round((p.xp / p.xpNext) * 100));

    // Playtime formatting
    const hours = Math.floor((p.stats.playtimeMinutes || 0) / 60);
    const mins = (p.stats.playtimeMinutes || 0) % 60;
    const playtimeStr = hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} menit`;
    const activeClass = (typeof localStorage !== 'undefined' ? localStorage.getItem('wildlands_player_class') : null) || 'Warrior';

    return `
      <div class="page-container">
        <!-- PROFILE HERO HEADER -->
        <div class="profile-hero-card">
          <div class="profile-hero-left">
            <div class="profile-avatar-wrap">
              <div class="profile-avatar-large">
                <span class="avatar-emoji">🤠</span>
              </div>
              <div class="profile-level-badge">LV. ${p.level}</div>
            </div>

            <div class="profile-header-info">
              <div class="profile-name-row">
                <h2 class="profile-username">${p.username}</h2>
                <span class="profile-id-tag">${p.id}</span>
                <span class="profile-status-online">🟢 ONLINE</span>
              </div>

              <p class="profile-bio">${p.bio || 'Petualang alam bebas yang siap mengungkap rahasia tanah Wildlands.'}</p>

              <div class="profile-meta-row">
                <span>Bergabung: <strong>${p.joinDate || 'Oktober 2026'}</strong></span>
                <span>•</span>
                <span>Status: <strong>Penjelajah Aktif</strong></span>
              </div>
            </div>
          </div>

          <div class="profile-hero-right">
            <button class="btn-primary btn-sm" id="btn-open-edit-profile">✏️ Edit Profil</button>
          </div>
        </div>

        <!-- LEVEL & XP PROGRESSION BANNER -->
        <div class="level-progress-card">
          <div class="lp-top">
            <div class="lp-left">
              <span class="lp-title">TINGKAT EXP PENJELAJAH</span>
              <span class="lp-desc">Dapatkan EXP dari misi eksplorasi, penemuan landmark, dan event musiman.</span>
            </div>
            <div class="lp-xp-count">
              <strong>${p.xp}</strong> / ${p.xpNext} XP (${xpPct}%)
            </div>
          </div>

          <div class="progress-track large">
            <div class="progress-fill glow" style="width: ${xpPct}%"></div>
          </div>
        </div>

        <!-- 5 STATS CARDS -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="sc-icon">⏱️</span>
            <div class="sc-val">${playtimeStr}</div>
            <div class="sc-label">Total Waktu Bermain</div>
          </div>

          <div class="stat-card">
            <span class="sc-icon">👣</span>
            <div class="sc-val">${p.stats.distanceTraveled || 0} m</div>
            <div class="sc-label">Jarak Eksplorasi</div>
          </div>

          <div class="stat-card">
            <span class="sc-icon">📜</span>
            <div class="sc-val">${p.stats.missionsCompleted || 0}</div>
            <div class="sc-label">Misi Selesai</div>
          </div>

          <div class="stat-card">
            <span class="sc-icon">🎪</span>
            <div class="sc-val">${p.stats.eventsJoined || 0}</div>
            <div class="sc-label">Event Diikuti</div>
          </div>

          <div class="stat-card">
            <span class="sc-icon">👥</span>
            <div class="sc-val">${p.stats.friendsCount || 0}</div>
            <div class="sc-label">Total Teman</div>
          </div>
        </div>

        <!-- RPG CHARACTER CLASS SELECTOR -->
        <div class="class-selector-section" style="margin-bottom: 28px;">
          <div class="section-header-row">
            <div>
              <h3 class="section-title">PILIH KELAS KARAKTER (3D RPG MODEL)</h3>
              <p class="section-subtitle">Pilih model avatar 3D petualang Anda untuk tampil di Lobby dan Open World.</p>
            </div>
            <span class="ach-count-pill">Model RPG Quaternius</span>
          </div>

          <div class="rpg-classes-grid">
            <div class="rpg-class-card ${activeClass === 'Warrior' ? 'active' : ''}" data-model="/models/rpg/Warrior.gltf" data-class="Warrior">
              <div class="class-card-top">
                <span class="class-icon-badge">🗡️</span>
                <span class="class-badge-tag">${activeClass === 'Warrior' ? 'AKTIF' : 'PILIH'}</span>
              </div>
              <h4 class="class-name">Warrior</h4>
              <p class="class-desc">Pendekar zirah pelat baja dengan pedang bermata lebar. Tangguh di garis depan.</p>
            </div>

            <div class="rpg-class-card ${activeClass === 'Rogue' ? 'active' : ''}" data-model="/models/rpg/Rogue.gltf" data-class="Rogue">
              <div class="class-card-top">
                <span class="class-icon-badge">🥷</span>
                <span class="class-badge-tag">${activeClass === 'Rogue' ? 'AKTIF' : 'PILIH'}</span>
              </div>
              <h4 class="class-name">Rogue</h4>
              <p class="class-desc">Pembunuh berkerudung merah darah dengan belati melengkung ganda. Lincah & cepat.</p>
            </div>

            <div class="rpg-class-card ${activeClass === 'Ranger' ? 'active' : ''}" data-model="/models/rpg/Ranger.gltf" data-class="Ranger">
              <div class="class-card-top">
                <span class="class-icon-badge">🏹</span>
                <span class="class-badge-tag">${activeClass === 'Ranger' ? 'AKTIF' : 'PILIH'}</span>
              </div>
              <h4 class="class-name">Ranger</h4>
              <p class="class-desc">Pengintai hutan bertudung hijau bersenjata busur panah komposit jarak jauh.</p>
            </div>

            <div class="rpg-class-card ${activeClass === 'Wizard' ? 'active' : ''}" data-model="/models/rpg/Wizard.gltf" data-class="Wizard">
              <div class="class-card-top">
                <span class="class-icon-badge">🔮</span>
                <span class="class-badge-tag">${activeClass === 'Wizard' ? 'AKTIF' : 'PILIH'}</span>
              </div>
              <h4 class="class-name">Wizard</h4>
              <p class="class-desc">Penyihir berjubah biru tua berjanggut putih dengan tongkat permata sihir.</p>
            </div>

            <div class="rpg-class-card ${activeClass === 'Monk' ? 'active' : ''}" data-model="/models/rpg/Monk.gltf" data-class="Monk">
              <div class="class-card-top">
                <span class="class-icon-badge">🥊</span>
                <span class="class-badge-tag">${activeClass === 'Monk' ? 'AKTIF' : 'PILIH'}</span>
              </div>
              <h4 class="class-name">Monk</h4>
              <p class="class-desc">Petapa petarung bertangan kosong dengan sarung tinju batu tebal.</p>
            </div>

            <div class="rpg-class-card ${activeClass === 'Cleric' ? 'active' : ''}" data-model="/models/rpg/Cleric.gltf" data-class="Cleric">
              <div class="class-card-top">
                <span class="class-icon-badge">🎭</span>
                <span class="class-badge-tag">${activeClass === 'Cleric' ? 'AKTIF' : 'PILIH'}</span>
              </div>
              <h4 class="class-name">Cleric</h4>
              <p class="class-desc">Kultis bertopeng pucat mistis bersenjata tongkat relik roda matahari kuno.</p>
            </div>
          </div>
        </div>

        <!-- ACHIEVEMENTS SECTION -->
        <div class="achievements-section">
          <div class="section-header-row">
            <div>
              <h3 class="section-title">PENCAPAIAN & PRESTASI PENJELAJAH</h3>
              <p class="section-subtitle">Buka seluruh lencana prestasi dengan menjelajahi setiap sudut dunia Wildlands.</p>
            </div>
            <span class="ach-count-pill">${unlockedCount} / ${achievements.length} Terbuka</span>
          </div>

          <div class="achievements-grid">
            ${achievements.map(ach => `
              <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
                <div class="ach-icon-box">
                  <span class="ach-icon">${ach.icon}</span>
                  ${ach.unlocked ? '<span class="ach-check">✓</span>' : '<span class="ach-lock">🔒</span>'}
                </div>

                <div class="ach-info">
                  <h4 class="ach-title">${ach.title}</h4>
                  <p class="ach-desc">${ach.desc}</p>
                  <div class="ach-footer">
                    <span class="ach-reward">🎁 ${ach.reward}</span>
                    <span class="ach-progress">${ach.progress}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- EDIT PROFILE MODAL -->
        <div id="edit-profile-modal" class="modal-backdrop ${this.isEditing ? 'open' : ''}">
          ${this.isEditing ? this.renderEditModal() : ''}
        </div>
      </div>
    `;
  }

  renderEditModal() {
    const p = this.data.profile;
    const avatars = [
      { id: 'avatar_explorer', emoji: '🤠', label: 'Penjelajah' },
      { id: 'avatar_knight', emoji: '🛡️', label: 'Ksatria' },
      { id: 'avatar_mage', emoji: '🧙‍♂️', label: 'Penyihir' },
      { id: 'avatar_rogue', emoji: '🥷', label: 'Pengelana' },
      { id: 'avatar_farmer', emoji: '🌾', label: 'Petani' },
      { id: 'avatar_hermit', emoji: '🧘', label: 'Pertapa' }
    ];

    return `
      <div class="modal-box edit-profile-box">
        <div class="modal-header">
          <h3 class="modal-title">Edit Profil Petualang</h3>
          <button class="btn-close-modal" id="btn-close-edit-profile">✕</button>
        </div>

        <div class="modal-body">
          <!-- AVATAR SELECTION -->
          <div class="form-group">
            <label class="form-label">Pilih Avatar Karakter</label>
            <div class="avatar-select-grid">
              ${avatars.map(av => `
                <div class="avatar-choice ${p.avatar === av.id ? 'selected' : ''}" data-avatar="${av.id}">
                  <span class="av-emoji">${av.emoji}</span>
                  <span class="av-label">${av.label}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- USERNAME INPUT -->
          <div class="form-group">
            <label class="form-label" for="edit-profile-name">Nama Penjelajah (3-18 Karakter)</label>
            <input type="text" id="edit-profile-name" class="form-input" value="${p.username}" maxlength="18" placeholder="Nama karakter Anda..." />
            <span class="form-hint">Hanya huruf, angka, dan underscore (_). Tidak diperkenankan tag HTML.</span>
          </div>

          <!-- BIO INPUT -->
          <div class="form-group">
            <label class="form-label" for="edit-profile-bio">Bio Singkat (Maks. 120 Karakter)</label>
            <textarea id="edit-profile-bio" class="form-input textarea" maxlength="120" rows="3" placeholder="Tuliskan motto atau bio petualangan Anda...">${p.bio || ''}</textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="btn-cancel-edit-profile">Batal</button>
          <button class="btn-primary" id="btn-save-edit-profile">Simpan Perubahan</button>
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    const btnOpenEdit = container.querySelector('#btn-open-edit-profile');
    if (btnOpenEdit) {
      btnOpenEdit.addEventListener('click', () => {
        this.isEditing = true;
        this.mgr.rerenderCurrentTab();
      });
    }

    const btnClose = container.querySelector('#btn-close-edit-profile, #btn-cancel-edit-profile');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.isEditing = false;
        this.mgr.rerenderCurrentTab();
      });
    }

    // RPG Class Selection
    const classCards = container.querySelectorAll('.rpg-class-card');
    classCards.forEach(card => {
      card.addEventListener('click', () => {
        const modelUrl = card.getAttribute('data-model');
        const className = card.getAttribute('data-class');
        if (!modelUrl) return;

        localStorage.setItem('wildlands_player_model', modelUrl);
        localStorage.setItem('wildlands_player_class', className);

        // Update 3D hideout lobby character model if available
        if (window.__wildlandsGame && window.__wildlandsGame.hideout && window.__wildlandsGame.hideout.character) {
          window.__wildlandsGame.hideout.character.setModel(modelUrl);
        }

        // Update game player character if game is active
        if (window.__wildlandsGame && window.__wildlandsGame.player && window.__wildlandsGame.player.character) {
          window.__wildlandsGame.player.character.setModel(modelUrl);
        }

        this.mgr.showToast(`Karakter diubah ke ${className}!`, 'success');
        this.mgr.rerenderCurrentTab();
      });
    });

    // Avatar selection in edit modal
    let selectedAvatar = this.data.profile.avatar || 'avatar_explorer';
    const avatarChoices = container.querySelectorAll('.avatar-choice');
    avatarChoices.forEach(choice => {
      choice.addEventListener('click', (e) => {
        avatarChoices.forEach(c => c.classList.remove('selected'));
        choice.classList.add('selected');
        selectedAvatar = choice.getAttribute('data-avatar');
      });
    });

    // Save profile changes
    const btnSave = container.querySelector('#btn-save-edit-profile');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const nameInput = container.querySelector('#edit-profile-name');
        const bioInput = container.querySelector('#edit-profile-bio');

        const cleanName = nameInput.value.replace(/<[^>]*>/g, '').trim();
        const cleanBio = bioInput.value.replace(/<[^>]*>/g, '').trim();

        if (cleanName.length < 3) {
          this.mgr.showToast('Nama penjelajah minimal harus 3 karakter!', 'warning');
          return;
        }

        this.data.profile.username = cleanName;
        this.data.profile.bio = cleanBio;
        this.data.profile.avatar = selectedAvatar;
        this.data.saveProfile();

        this.isEditing = false;
        this.mgr.showToast('Profil penjelajah berhasil diperbarui!', 'success');
        this.mgr.updateLobbyPlayerCard();
        this.mgr.rerenderCurrentTab();
      });
    }
  }
}
