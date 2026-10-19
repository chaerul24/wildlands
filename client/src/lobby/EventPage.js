/**
 * EventPage - Events and Seasonal Challenges for Wildlands
 */
export class EventPage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
    this.activeFilter = 'all';
    this.selectedEvent = null;
  }

  render(params = {}) {
    const events = this.data.events;
    const now = new Date();

    const processed = events.map(e => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      let status = 'active';
      let statusLabel = 'AKTIF';
      let statusClass = 'badge-active';

      if (now < start) {
        status = 'upcoming';
        statusLabel = 'MENDATANG';
        statusClass = 'badge-upcoming';
      } else if (now > end) {
        status = 'ended';
        statusLabel = 'BERAKHIR';
        statusClass = 'badge-ended';
      }

      // Format date
      const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

      return {
        ...e,
        computedStatus: status,
        statusLabel,
        statusClass,
        dateRangeStr: `${startStr} - ${endStr}`
      };
    });

    const filtered = processed.filter(e => {
      if (this.activeFilter === 'all') return true;
      return e.computedStatus === this.activeFilter;
    });

    return `
      <div class="page-container">
        <!-- HEADER -->
        <div class="page-header">
          <div>
            <h2 class="page-title">EVENT & FESTIVAL MUSIMAN</h2>
            <p class="page-subtitle">Ikuti tantangan musiman di seluruh penjuru Wildlands untuk mengklaim hadiah spesial dan gelar kehormatan.</p>
          </div>

          <!-- FILTER TABS -->
          <div class="filter-pills">
            <button class="pill-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">Semua</button>
            <button class="pill-btn ${this.activeFilter === 'active' ? 'active' : ''}" data-filter="active">Sedang Berlangsung</button>
            <button class="pill-btn ${this.activeFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">Mendatang</button>
            <button class="pill-btn ${this.activeFilter === 'ended' ? 'active' : ''}" data-filter="ended">Selesai</button>
          </div>
        </div>

        <!-- EVENTS GRID -->
        <div class="events-grid">
          ${filtered.length > 0 ? filtered.map(ev => `
            <div class="event-card" data-card-id="${ev.id}">
              <div class="event-card-banner" style="background: ${ev.bannerColor || 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)'};">
                <span class="event-type-badge">${ev.category || 'EVENT'}</span>
                <span class="event-status-tag ${ev.statusClass}">${ev.statusLabel}</span>
              </div>

              <div class="event-card-body">
                <h3 class="event-title">${ev.title}</h3>
                <div class="event-date">📅 ${ev.dateRangeStr}</div>
                <p class="event-desc">${ev.description}</p>

                <div class="event-rewards-box">
                  <span class="lbl">Hadiah Partisipasi:</span>
                  <div class="rewards-tags">
                    <span class="tag-gold">✨ +${ev.rewards?.xp || 500} XP</span>
                    <span class="tag-gold">🪙 +${ev.rewards?.gold || 300} Koin</span>
                    ${ev.rewards?.title ? `<span class="tag-title">🏆 Gelar: "${ev.rewards.title}"</span>` : ''}
                  </div>
                </div>

                <div class="event-card-footer">
                  <button class="btn-secondary btn-sm btn-event-detail" data-id="${ev.id}">Lihat Detail</button>
                  ${ev.computedStatus === 'active' ? `
                    <button class="btn-primary btn-sm btn-event-join" data-id="${ev.id}">
                      ${ev.isJoined ? '✓ Terdaftar' : 'Ikut Event'}
                    </button>
                  ` : `
                    <button class="btn-secondary btn-sm" disabled style="opacity: 0.5;">
                      ${ev.computedStatus === 'upcoming' ? 'Belum Dimulai' : 'Telah Berakhir'}
                    </button>
                  `}
                </div>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state">
              <span>🎪</span>
              <p>Tidak ada event dalam kategori ini.</p>
            </div>
          `}
        </div>

        <!-- DETAIL MODAL CONTAINER -->
        <div id="event-detail-modal" class="modal-backdrop ${this.selectedEvent ? 'open' : ''}">
          ${this.selectedEvent ? this.renderDetailModal(this.selectedEvent) : ''}
        </div>
      </div>
    `;
  }

  renderDetailModal(ev) {
    return `
      <div class="modal-box event-modal">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="event-status-tag ${ev.statusClass}">${ev.statusLabel}</span>
            <h3 class="modal-title">${ev.title}</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-event-modal">✕</button>
        </div>

        <div class="modal-body">
          <div class="event-modal-banner" style="background: ${ev.bannerColor};">
            <span class="modal-banner-badge">PERIODE: ${ev.dateRangeStr}</span>
          </div>

          <div class="modal-section">
            <h4>Deskripsi Event</h4>
            <p>${ev.description}</p>
          </div>

          <div class="modal-section">
            <h4>Sasaran & Misi Event</h4>
            <ul class="objectives-list">
              ${(ev.objectives || ['Kunjungi lokasi event di dunia 3D', 'Bicara dengan NPC terkait']).map(obj => `
                <li><span class="check-icon">✓</span> ${obj}</li>
              `).join('')}
            </ul>
          </div>

          <div class="modal-section">
            <h4>Hadiah Penyelesaian</h4>
            <div class="rewards-tags large">
              <span class="tag-gold">⭐ +${ev.rewards?.xp || 500} XP Eksplorasi</span>
              <span class="tag-gold">🪙 +${ev.rewards?.gold || 300} Koin Emas</span>
              ${ev.rewards?.title ? `<span class="tag-title">🏆 Gelar: "${ev.rewards.title}"</span>` : ''}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="btn-modal-dismiss-event">Tutup</button>
          ${ev.computedStatus === 'active' ? `
            <button class="btn-primary" id="btn-modal-action-join" data-id="${ev.id}">
              ${ev.isJoined ? '✓ Anda Sudah Terdaftar' : 'Daftar Ikut Event Sekarang'}
            </button>
          ` : `
            <button class="btn-secondary" disabled>Event Tidak Aktif</button>
          `}
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    // Filter pills
    const pills = container.querySelectorAll('.pill-btn');
    pills.forEach(p => {
      p.addEventListener('click', (e) => {
        this.activeFilter = e.currentTarget.getAttribute('data-filter');
        this.mgr.rerenderCurrentTab();
      });
    });

    // Detail modal button
    const detailBtns = container.querySelectorAll('.btn-event-detail');
    detailBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.selectedEvent = this.data.events.find(x => x.id === id);
        this.mgr.rerenderCurrentTab();
      });
    });

    // Join button
    const joinBtns = container.querySelectorAll('.btn-event-join, #btn-modal-action-join');
    joinBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const res = this.data.joinEvent(id);
        if (res.success) {
          this.mgr.showToast(`Berhasil mendaftar ke "${res.event.title}"!`, 'success');
          this.mgr.rerenderCurrentTab();
        } else {
          this.mgr.showToast(res.error, 'warning');
        }
      });
    });

    // Close modal
    const closeBtn = container.querySelector('#btn-close-event-modal');
    const dismissBtn = container.querySelector('#btn-modal-dismiss-event');
    const modalBackdrop = container.querySelector('#event-detail-modal');

    const closeModal = () => {
      this.selectedEvent = null;
      this.mgr.rerenderCurrentTab();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closeModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }
  }
}
