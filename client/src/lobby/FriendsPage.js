/**
 * FriendsPage - Social and Multiplayer Friends System for Wildlands
 */
export class FriendsPage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
    this.activeSubTab = 'online';
    this.friendToRemove = null;
  }

  render() {
    const allFriends = this.data.friends.filter(f => f.isFriend);
    const onlineFriends = allFriends.filter(f => f.status === 'online' || f.status === 'in_game');
    const incomingRequests = this.data.friends.filter(f => !f.isFriend && f.requestIncoming);
    const outgoingRequests = this.data.friends.filter(f => !f.isFriend && f.requestSent);

    return `
      <div class="page-container">
        <!-- HEADER -->
        <div class="page-header">
          <div>
            <h2 class="page-title">SISTEM TEMAN & KOMUNITAS SOSIAL</h2>
            <p class="page-subtitle">Terhubung dengan penjelajah lain, bentuk tim penjelajah, dan pantau status petualang di dunia Wildlands.</p>
          </div>

          <div class="friend-stats-badge">
            <span class="fs-badge">👥 ${allFriends.length} Teman</span>
            <span class="fs-badge online">🟢 ${onlineFriends.length} Online</span>
          </div>
        </div>

        <!-- SUB-NAVIGATION TABS -->
        <div class="filter-pills">
          <button class="pill-btn ${this.activeSubTab === 'online' ? 'active' : ''}" data-subtab="online">Online (${onlineFriends.length})</button>
          <button class="pill-btn ${this.activeSubTab === 'all' ? 'active' : ''}" data-subtab="all">Semua (${allFriends.length})</button>
          <button class="pill-btn ${this.activeSubTab === 'requests' ? 'active' : ''}" data-subtab="requests">Permintaan (${incomingRequests.length})</button>
          <button class="pill-btn ${this.activeSubTab === 'outgoing' ? 'active' : ''}" data-subtab="outgoing">Terkirim (${outgoingRequests.length})</button>
          <button class="pill-btn ${this.activeSubTab === 'add' ? 'active' : ''}" data-subtab="add">➕ Tambah Teman</button>
        </div>

        <!-- SUB-TAB CONTENT -->
        <div class="friends-content-area">
          ${this.renderSubTabContent({ allFriends, onlineFriends, incomingRequests, outgoingRequests })}
        </div>

        <!-- REMOVE CONFIRMATION MODAL -->
        <div id="friend-confirm-modal" class="modal-backdrop ${this.friendToRemove ? 'open' : ''}">
          ${this.friendToRemove ? `
            <div class="modal-box confirm-modal">
              <div class="modal-header">
                <h3 class="modal-title">Hapus Teman</h3>
                <button class="btn-close-modal" id="btn-cancel-remove">✕</button>
              </div>
              <div class="modal-body">
                <p>Apakah Anda yakin ingin menghapus <strong>${this.friendToRemove.username}</strong> (${this.friendToRemove.id}) dari daftar teman Anda?</p>
              </div>
              <div class="modal-footer">
                <button class="btn-secondary" id="btn-cancel-remove-btn">Batal</button>
                <button class="btn-danger" id="btn-confirm-remove-btn" data-id="${this.friendToRemove.id}">Hapus Teman</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderSubTabContent({ allFriends, onlineFriends, incomingRequests, outgoingRequests }) {
    if (this.activeSubTab === 'online') {
      return this.renderFriendList(onlineFriends, 'Tidak ada teman yang sedang online saat ini.');
    } else if (this.activeSubTab === 'all') {
      return this.renderFriendList(allFriends, 'Daftar teman Anda masih kosong. Tambahkan teman di tab "Tambah Teman"!');
    } else if (this.activeSubTab === 'requests') {
      if (incomingRequests.length === 0) {
        return `<div class="empty-state"><span>📬</span><p>Tidak ada permintaan pertemanan masuk.</p></div>`;
      }
      return `
        <div class="friends-grid">
          ${incomingRequests.map(r => `
            <div class="friend-card">
              <div class="friend-card-left">
                <div class="friend-avatar">👤</div>
                <div class="friend-card-info">
                  <div class="friend-name-row">
                    <span class="friend-name">${r.username}</span>
                    <span class="friend-id-pill">${r.id}</span>
                  </div>
                  <div class="friend-sub-text">Ingin berteman dengan Anda</div>
                </div>
              </div>
              <div class="friend-card-actions">
                <button class="btn-sm-primary btn-accept-friend" data-id="${r.id}">Terima</button>
                <button class="btn-sm-secondary btn-reject-friend" data-id="${r.id}">Tolak</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (this.activeSubTab === 'outgoing') {
      if (outgoingRequests.length === 0) {
        return `<div class="empty-state"><span>📤</span><p>Tidak ada permintaan pertemanan yang tertunda.</p></div>`;
      }
      return `
        <div class="friends-grid">
          ${outgoingRequests.map(r => `
            <div class="friend-card">
              <div class="friend-card-left">
                <div class="friend-avatar">👤</div>
                <div class="friend-card-info">
                  <div class="friend-name-row">
                    <span class="friend-name">${r.username}</span>
                    <span class="friend-id-pill">${r.id}</span>
                  </div>
                  <div class="friend-sub-text">Menunggu konfirmasi penerima</div>
                </div>
              </div>
              <div class="friend-card-actions">
                <button class="btn-sm-secondary btn-cancel-request" data-id="${r.id}">Batalkan</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (this.activeSubTab === 'add') {
      return `
        <div class="add-friend-panel">
          <div class="add-friend-card">
            <h3>Cari & Tambah Penjelajah</h3>
            <p>Masukkan Username atau Player ID (contoh: <code>WL-1082</code> atau <code>Ranger_Bima</code>) untuk mengirimkan permintaan pertemanan:</p>

            <div class="add-friend-input-row">
              <input type="text" id="input-friend-search" class="form-input" placeholder="Ketik Username atau Player ID..." maxlength="20" />
              <button class="btn-primary" id="btn-submit-add-friend">Kirim Permintaan</button>
            </div>

            <div class="friend-id-hint">
              <span>Player ID Anda sendiri: <strong>${this.data.profile.id}</strong> (Bagikan ke teman Anda untuk diundang)</span>
            </div>
          </div>

          <!-- SUGGESTED DISCOVERIES -->
          <div class="suggested-friends-box">
            <h4>Penjelajah yang Disarankan</h4>
            <div class="suggested-list">
              ${this.data.friends.filter(f => !f.isFriend && !f.requestSent).slice(0, 4).map(s => `
                <div class="suggested-item">
                  <div class="sugg-left">
                    <div class="friend-avatar sm">👤</div>
                    <div class="sugg-info">
                      <span class="sugg-name">${s.username}</span>
                      <span class="sugg-id">${s.id} • Lv. ${s.level}</span>
                    </div>
                  </div>
                  <button class="btn-sm-primary btn-quick-add" data-id="${s.id}">+ Tambah</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  }

  renderFriendList(list, emptyText) {
    if (!list || list.length === 0) {
      return `<div class="empty-state"><span>👥</span><p>${emptyText}</p></div>`;
    }

    return `
      <div class="friends-grid">
        ${list.map(f => {
          const isOnline = f.status === 'online' || f.status === 'in_game';
          return `
            <div class="friend-card">
              <div class="friend-card-left">
                <div class="friend-avatar-wrap">
                  <div class="friend-avatar">👤</div>
                  <div class="status-indicator-dot ${isOnline ? 'online' : 'offline'}"></div>
                </div>

                <div class="friend-card-info">
                  <div class="friend-name-row">
                    <span class="friend-name">${f.username}</span>
                    <span class="friend-level-tag">Lv. ${f.level}</span>
                    <span class="friend-id-pill">${f.id}</span>
                  </div>
                  <div class="friend-status-desc ${isOnline ? 'active' : ''}">${f.statusText || (isOnline ? 'Online di Wildlands' : 'Offline')}</div>
                </div>
              </div>

              <div class="friend-card-actions">
                ${isOnline ? `
                  <button class="btn-sm-primary btn-join-session" data-name="${f.username}">Gabung Sesi</button>
                ` : ''}
                <button class="btn-sm-danger btn-remove-friend" data-id="${f.id}" title="Hapus Teman">Hapus</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  attachEvents(container) {
    // Sub-tab navigation
    const subtabs = container.querySelectorAll('.pill-btn[data-subtab]');
    subtabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeSubTab = e.currentTarget.getAttribute('data-subtab');
        this.mgr.rerenderCurrentTab();
      });
    });

    // Add friend input
    const inputSearch = container.querySelector('#input-friend-search');
    const btnAdd = container.querySelector('#btn-submit-add-friend');

    const handleSendRequest = (query) => {
      const res = this.data.sendFriendRequest(query);
      if (res.success) {
        this.mgr.showToast(res.message, 'success');
        this.activeSubTab = 'outgoing';
        this.mgr.rerenderCurrentTab();
      } else {
        this.mgr.showToast(res.error, 'warning');
      }
    };

    if (btnAdd && inputSearch) {
      btnAdd.addEventListener('click', () => handleSendRequest(inputSearch.value));
      inputSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSendRequest(inputSearch.value);
      });
    }

    // Quick add from suggested
    const quickAddBtns = container.querySelectorAll('.btn-quick-add');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        handleSendRequest(id);
      });
    });

    // Accept friend
    const acceptBtns = container.querySelectorAll('.btn-accept-friend');
    acceptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const res = this.data.acceptFriend(id);
        if (res.success) {
          this.mgr.showToast(`Berhasil menerima pertemanan dengan ${res.friend.username}!`, 'success');
          this.mgr.rerenderCurrentTab();
        }
      });
    });

    // Reject or Cancel
    const rejectBtns = container.querySelectorAll('.btn-reject-friend, .btn-cancel-request');
    rejectBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.data.removeFriend(id);
        this.mgr.showToast('Permintaan pertemanan dibatalkan.', 'info');
        this.mgr.rerenderCurrentTab();
      });
    });

    // Remove friend confirmation
    const removeBtns = container.querySelectorAll('.btn-remove-friend');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.friendToRemove = this.data.friends.find(x => x.id === id);
        this.mgr.rerenderCurrentTab();
      });
    });

    // Confirm remove modal
    const btnCancelRemove = container.querySelector('#btn-cancel-remove, #btn-cancel-remove-btn');
    if (btnCancelRemove) {
      btnCancelRemove.addEventListener('click', () => {
        this.friendToRemove = null;
        this.mgr.rerenderCurrentTab();
      });
    }

    const btnConfirmRemove = container.querySelector('#btn-confirm-remove-btn');
    if (btnConfirmRemove) {
      btnConfirmRemove.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.data.removeFriend(id);
        this.friendToRemove = null;
        this.mgr.showToast('Teman berhasil dihapus dari daftar.', 'info');
        this.mgr.rerenderCurrentTab();
      });
    }

    // Join session shortcut
    const joinSessionBtns = container.querySelectorAll('.btn-join-session');
    joinSessionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.currentTarget.getAttribute('data-name');
        this.mgr.showToast(`Menghubungkan ke sesi petualangan bersama ${name}...`, 'info');
        setTimeout(() => this.mgr.enterWorld(), 600);
      });
    });
  }
}
